"""
Entraînement Isolation Forest — Détection de fraude dans les réponses clients.

Features extraites par soumission (client + questionnaire) :
  1. scale_variance       — écart-type des réponses scale (0 = straight-lining)
  2. scale_extreme_ratio  — % réponses scale extrêmes (1 ou max)
  3. text_empty_ratio     — % réponses texte vides
  4. text_avg_length      — longueur moyenne des textes
  5. nb_questions         — nombre de questions répondues
  6. kpi_score            — score KPI résultant
  7. unique_ratio         — ratio réponses uniques (1 = toutes différentes)

Usage:
    python training/train_anomaly.py                              # depuis MySQL
    python training/train_anomaly.py --synthetic                  # données synthétiques
    python training/train_anomaly.py --csv data/clients_trainne.csv  # depuis CSV clients
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from config import MODELS_DIR, DATA_DIR

ANOMALY_MODEL_PATH  = MODELS_DIR / "anomaly_model.pkl"
ANOMALY_SCALER_PATH = MODELS_DIR / "anomaly_scaler.pkl"
ANOMALY_META_PATH   = MODELS_DIR / "anomaly_meta.json"

DEFAULT_CSV = DATA_DIR / "clients_trainne.csv"

FEATURE_NAMES = [
    "scale_variance",
    "scale_extreme_ratio",
    "text_empty_ratio",
    "text_avg_length",
    "nb_questions",
    "kpi_score",
    "unique_ratio",
]


def build_features_from_responses(responses: list[dict], kpi_score: float) -> dict:
    """Calcule les 7 features depuis des réponses réelles."""
    scale_vals, text_vals = [], []
    for r in responses:
        qtype = (r.get("question_type") or "text").lower()
        val   = str(r.get("value") or "").strip()
        if qtype == "scale":
            try: scale_vals.append(float(val))
            except ValueError: pass
        elif qtype == "text":
            text_vals.append(val)

    scale_variance      = float(np.std(scale_vals)) if len(scale_vals) >= 2 else 0.0
    scale_extreme_ratio = 0.0
    if scale_vals:
        extremes = sum(1 for v in scale_vals if v == 1 or v == max(scale_vals))
        scale_extreme_ratio = extremes / len(scale_vals)

    text_empty_ratio = 0.0
    text_avg_length  = 0.0
    if text_vals:
        text_empty_ratio = sum(1 for t in text_vals if not t) / len(text_vals)
        text_avg_length  = float(np.mean([len(t) for t in text_vals if t])) if any(text_vals) else 0.0

    all_vals     = [str(r.get("value") or "") for r in responses]
    unique_ratio = len(set(all_vals)) / len(all_vals) if all_vals else 1.0

    return {
        "scale_variance":      round(scale_variance, 4),
        "scale_extreme_ratio": round(scale_extreme_ratio, 4),
        "text_empty_ratio":    round(text_empty_ratio, 4),
        "text_avg_length":     round(text_avg_length, 4),
        "nb_questions":        float(len(responses)),
        "kpi_score":           float(kpi_score),
        "unique_ratio":        round(unique_ratio, 4),
    }


def generate_features_from_client_csv(csv_path: Path) -> pd.DataFrame:
    """
    Génère les 7 features de réponse depuis le CSV clients.

    Principe : chaque ligne client → une soumission simulée.
    Les features sont dérivées du kpi_score et du sentiment du client,
    avec injection de 8% de patterns frauduleux pour l'entraînement.
    """
    print(f"   Lecture CSV : {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"   {len(df)} clients chargés")

    rng = np.random.default_rng(42)
    rows = []

    n_total = len(df)
    n_fraud = max(10, int(n_total * 0.08))   # 8% de fraudes injectées
    fraud_indices = set(rng.choice(n_total, size=n_fraud, replace=False).tolist())

    for i, (_, row) in enumerate(df.iterrows()):
        kpi       = float(row.get("kpi_score") or 50.0)
        sentiment = str(row.get("sentiment") or "NEUTRE").upper().strip()
        is_fraud  = i in fraud_indices

        if is_fraud:
            # Pattern frauduleux : straight-lining ou textes vides
            fraud_type = rng.integers(0, 3)
            if fraud_type == 0:
                # Straight-lining : toujours même réponse
                feat = {
                    "scale_variance":      float(rng.uniform(0.0, 0.15)),
                    "scale_extreme_ratio": float(rng.uniform(0.8, 1.0)),
                    "text_empty_ratio":    float(rng.uniform(0.7, 1.0)),
                    "text_avg_length":     float(rng.uniform(0.0, 5.0)),
                    "nb_questions":        float(rng.integers(3, 12)),
                    "kpi_score":           float(rng.uniform(85, 100)),
                    "unique_ratio":        float(rng.uniform(0.05, 0.15)),
                }
            elif fraud_type == 1:
                # KPI anormalement élevé + textes vides
                feat = {
                    "scale_variance":      float(rng.uniform(0.0, 0.2)),
                    "scale_extreme_ratio": float(rng.uniform(0.9, 1.0)),
                    "text_empty_ratio":    float(rng.uniform(0.85, 1.0)),
                    "text_avg_length":     0.0,
                    "nb_questions":        float(rng.integers(3, 8)),
                    "kpi_score":           float(rng.uniform(95, 100)),
                    "unique_ratio":        float(rng.uniform(0.05, 0.12)),
                }
            else:
                # Réponses toutes identiques (manque de diversité)
                feat = {
                    "scale_variance":      float(rng.uniform(0.0, 0.1)),
                    "scale_extreme_ratio": float(rng.uniform(0.6, 0.9)),
                    "text_empty_ratio":    float(rng.uniform(0.5, 0.8)),
                    "text_avg_length":     float(rng.uniform(1.0, 8.0)),
                    "nb_questions":        float(rng.integers(4, 15)),
                    "kpi_score":           float(rng.uniform(80, 100)),
                    "unique_ratio":        float(rng.uniform(0.05, 0.20)),
                }
        else:
            # Soumission normale — dérivée du profil client réel
            if sentiment == "POSITIF":
                scale_var   = float(rng.uniform(1.2, 2.8))
                extreme_r   = float(rng.uniform(0.0, 0.25))
                empty_r     = float(rng.uniform(0.0, 0.15))
                avg_len     = float(rng.uniform(40.0, 200.0))
                unique_r    = float(rng.uniform(0.65, 1.0))
            elif sentiment == "NEGATIF":
                scale_var   = float(rng.uniform(0.3, 1.5))
                extreme_r   = float(rng.uniform(0.3, 0.7))
                empty_r     = float(rng.uniform(0.2, 0.55))
                avg_len     = float(rng.uniform(5.0, 60.0))
                unique_r    = float(rng.uniform(0.3, 0.7))
            else:  # NEUTRE
                scale_var   = float(rng.uniform(0.8, 2.0))
                extreme_r   = float(rng.uniform(0.1, 0.4))
                empty_r     = float(rng.uniform(0.05, 0.3))
                avg_len     = float(rng.uniform(20.0, 100.0))
                unique_r    = float(rng.uniform(0.5, 0.85))

            # Ajuster avec le kpi_score
            kpi_factor  = kpi / 100.0
            scale_var  *= (0.6 + 0.8 * kpi_factor)
            unique_r    = min(1.0, unique_r * (0.5 + 0.8 * kpi_factor))

            feat = {
                "scale_variance":      round(float(scale_var), 4),
                "scale_extreme_ratio": round(float(extreme_r), 4),
                "text_empty_ratio":    round(float(empty_r), 4),
                "text_avg_length":     round(float(avg_len), 4),
                "nb_questions":        float(rng.integers(5, 15)),
                "kpi_score":           round(kpi, 4),
                "unique_ratio":        round(float(unique_r), 4),
            }

        rows.append(feat)

    result = pd.DataFrame(rows)
    n_fraud_actual = len(fraud_indices)
    print(f"   {n_total - n_fraud_actual} soumissions normales + {n_fraud_actual} frauduleuses générées")
    return result


def load_from_db() -> pd.DataFrame:
    """Charge les features depuis MySQL via SQLAlchemy."""
    from utils.db import get_engine
    engine = get_engine()
    query = """
        SELECT
            r.client_id,
            r.questionnaire_id,
            q.type AS question_type,
            r.reponse AS value,
            COALESCE(k.score, 50) AS kpi_score
        FROM reponse r
        JOIN question q  ON q.id  = r.question_id
        LEFT JOIN client_kpi k
               ON k.client_id        = r.client_id
              AND k.questionnaire_id  = r.questionnaire_id
        ORDER BY r.client_id, r.questionnaire_id
    """
    return pd.read_sql(query, engine)


def build_dataset_from_db(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (client_id, quest_id), grp in df.groupby(["client_id", "questionnaire_id"]):
        responses = grp[["question_type", "value"]].to_dict("records")
        kpi_score = float(grp["kpi_score"].iloc[0])
        feats     = build_features_from_responses(responses, kpi_score)
        feats["client_id"]        = client_id
        feats["questionnaire_id"] = quest_id
        rows.append(feats)
    return pd.DataFrame(rows)


def generate_synthetic_data(n_normal=800, n_fraud=80) -> pd.DataFrame:
    """Données 100% synthétiques (dev rapide sans CSV ni MySQL)."""
    rng = np.random.default_rng(42)
    rows = []
    for _ in range(n_normal):
        rows.append({
            "scale_variance":      float(rng.uniform(0.5, 2.5)),
            "scale_extreme_ratio": float(rng.uniform(0.0, 0.4)),
            "text_empty_ratio":    float(rng.uniform(0.0, 0.2)),
            "text_avg_length":     float(rng.uniform(10, 150)),
            "nb_questions":        float(rng.integers(3, 15)),
            "kpi_score":           float(rng.uniform(30, 90)),
            "unique_ratio":        float(rng.uniform(0.5, 1.0)),
        })
    for _ in range(n_fraud):
        rows.append({
            "scale_variance":      float(rng.uniform(0.0, 0.15)),
            "scale_extreme_ratio": float(rng.uniform(0.8, 1.0)),
            "text_empty_ratio":    float(rng.uniform(0.7, 1.0)),
            "text_avg_length":     float(rng.uniform(0.0, 5.0)),
            "nb_questions":        float(rng.integers(3, 15)),
            "kpi_score":           float(rng.uniform(85, 100)),
            "unique_ratio":        float(rng.uniform(0.05, 0.2)),
        })
    return pd.DataFrame(rows)


def train(csv_path: Path = None, use_synthetic=False):
    print("=== Entraînement Isolation Forest — Détection de fraude ===\n")

    if csv_path is not None:
        print(f"Mode : CSV ({csv_path.name})")
        df = generate_features_from_client_csv(csv_path)
    elif use_synthetic:
        print("Mode : données synthétiques")
        df = generate_synthetic_data()
        print(f"   {len(df)} soumissions générées")
    else:
        print("Mode : MySQL")
        try:
            raw      = load_from_db()
            df       = build_dataset_from_db(raw)
            print(f"   {len(df)} soumissions chargées depuis MySQL")
        except Exception as e:
            print(f"   MySQL indisponible ({e})")
            print(f"   Basculement sur CSV par défaut : {DEFAULT_CSV}")
            df = generate_features_from_client_csv(DEFAULT_CSV)

    df = df[FEATURE_NAMES]

    if len(df) < 20:
        print("Pas assez de données (min 20). Abandon.")
        return

    print(f"\nNormalisation ({len(df)} soumissions)...")
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(df.values)

    print("Entraînement Isolation Forest (contamination=0.08, n_estimators=200)...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,
        max_samples="auto",
        random_state=42,
    )
    model.fit(X_scaled)

    scores  = model.decision_function(X_scaled)
    labels  = model.predict(X_scaled)
    n_fraud = int((labels == -1).sum())
    print(f"   Soumissions suspectes détectées : {n_fraud} / {len(df)} ({100*n_fraud/len(df):.1f}%)")
    print(f"   Score moyen normal   : {scores[labels ==  1].mean():.3f}")
    print(f"   Score moyen suspect  : {scores[labels == -1].mean():.3f}")

    threshold_medium = float(np.percentile(scores, 15))
    threshold_high   = float(np.percentile(scores, 8))

    meta = {
        "feature_names":      FEATURE_NAMES,
        "contamination":      0.08,
        "threshold_medium":   round(threshold_medium, 4),
        "threshold_high":     round(threshold_high, 4),
        "n_training_samples": len(df),
        "source":             str(csv_path) if csv_path else ("synthetic" if use_synthetic else "mysql"),
    }

    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model,  ANOMALY_MODEL_PATH)
    joblib.dump(scaler, ANOMALY_SCALER_PATH)
    with open(ANOMALY_META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\nModèle  : {ANOMALY_MODEL_PATH}")
    print(f"Scaler  : {ANOMALY_SCALER_PATH}")
    print(f"Meta    : {ANOMALY_META_PATH}")
    print(f"Seuil MEDIUM : {threshold_medium:.4f}  |  Seuil HIGH : {threshold_high:.4f}")
    print("Entraînement terminé !")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",       type=str, default=None,  help="Chemin vers le CSV clients (ex: data/clients_trainne.csv)")
    parser.add_argument("--synthetic", action="store_true",     help="Utiliser des données 100% synthétiques")
    args = parser.parse_args()

    csv = Path(args.csv) if args.csv else None

    # Par défaut (sans argument) : essaie le CSV clients_trainne.csv
    if csv is None and not args.synthetic:
        if DEFAULT_CSV.exists():
            print(f"Aucun argument fourni → utilisation du CSV par défaut : {DEFAULT_CSV.name}")
            csv = DEFAULT_CSV

    train(csv_path=csv, use_synthetic=args.synthetic)
