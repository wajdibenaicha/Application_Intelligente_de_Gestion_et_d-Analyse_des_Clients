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
    python training/train_anomaly.py              # depuis MySQL
    python training/train_anomaly.py --synthetic  # données synthétiques (dev)
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

from config import MODELS_DIR

ANOMALY_MODEL_PATH   = MODELS_DIR / "anomaly_model.pkl"
ANOMALY_SCALER_PATH  = MODELS_DIR / "anomaly_scaler.pkl"
ANOMALY_META_PATH    = MODELS_DIR / "anomaly_meta.json"

FEATURE_NAMES = [
    "scale_variance",
    "scale_extreme_ratio",
    "text_empty_ratio",
    "text_avg_length",
    "nb_questions",
    "kpi_score",
    "unique_ratio",
]


def build_features(responses: list[dict], kpi_score: float) -> dict:
    """
    Construit le vecteur de features pour une soumission.
    responses = [{"question_type": "scale", "value": "4"}, ...]
    """
    scale_vals = []
    text_vals  = []

    for r in responses:
        qtype = (r.get("question_type") or "text").lower()
        val   = str(r.get("value") or "").strip()

        if qtype == "scale":
            try:
                scale_vals.append(float(val))
            except ValueError:
                pass
        elif qtype == "text":
            text_vals.append(val)

    # Scale features
    scale_variance      = float(np.std(scale_vals)) if len(scale_vals) >= 2 else 0.0
    scale_extreme_ratio = 0.0
    if scale_vals:
        max_scale = max(scale_vals) if scale_vals else 5
        extremes  = sum(1 for v in scale_vals if v == 1 or v == max_scale)
        scale_extreme_ratio = extremes / len(scale_vals)

    # Text features
    text_empty_ratio = 0.0
    text_avg_length  = 0.0
    if text_vals:
        text_empty_ratio = sum(1 for t in text_vals if not t) / len(text_vals)
        text_avg_length  = np.mean([len(t) for t in text_vals if t]) if any(text_vals) else 0.0

    # Diversity
    all_vals    = [str(r.get("value") or "") for r in responses]
    unique_ratio = len(set(all_vals)) / len(all_vals) if all_vals else 1.0

    return {
        "scale_variance":      round(scale_variance, 4),
        "scale_extreme_ratio": round(scale_extreme_ratio, 4),
        "text_empty_ratio":    round(text_empty_ratio, 4),
        "text_avg_length":     round(float(text_avg_length), 4),
        "nb_questions":        float(len(responses)),
        "kpi_score":           float(kpi_score),
        "unique_ratio":        round(unique_ratio, 4),
    }


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
    df = pd.read_sql(query, engine)
    return df


def build_dataset_from_db(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (client_id, quest_id), grp in df.groupby(["client_id", "questionnaire_id"]):
        responses  = grp[["question_type", "value"]].to_dict("records")
        kpi_score  = float(grp["kpi_score"].iloc[0])
        feats      = build_features(responses, kpi_score)
        feats["client_id"]        = client_id
        feats["questionnaire_id"] = quest_id
        rows.append(feats)
    return pd.DataFrame(rows)


def generate_synthetic_data(n_normal=800, n_fraud=80) -> pd.DataFrame:
    """Génère des données synthétiques pour le développement."""
    rng = np.random.default_rng(42)
    rows = []

    # Réponses normales
    for _ in range(n_normal):
        rows.append({
            "scale_variance":      rng.uniform(0.5, 2.5),
            "scale_extreme_ratio": rng.uniform(0.0, 0.4),
            "text_empty_ratio":    rng.uniform(0.0, 0.2),
            "text_avg_length":     rng.uniform(10, 150),
            "nb_questions":        rng.integers(3, 15),
            "kpi_score":           rng.uniform(30, 90),
            "unique_ratio":        rng.uniform(0.5, 1.0),
            "label": 0,
        })

    # Fraudes simulées
    fraud_patterns = [
        # Straight-lining (toujours la même réponse)
        {"scale_variance": 0.0, "scale_extreme_ratio": rng.uniform(0.8, 1.0),
         "text_empty_ratio": rng.uniform(0.7, 1.0), "text_avg_length": rng.uniform(0, 5),
         "nb_questions": rng.integers(3, 15), "kpi_score": rng.uniform(85, 100),
         "unique_ratio": rng.uniform(0.05, 0.2), "label": 1},
        # KPI anormalement élevé avec réponses vides
        {"scale_variance": rng.uniform(0.0, 0.3), "scale_extreme_ratio": rng.uniform(0.9, 1.0),
         "text_empty_ratio": rng.uniform(0.8, 1.0), "text_avg_length": 0.0,
         "nb_questions": rng.integers(3, 8), "kpi_score": rng.uniform(95, 100),
         "unique_ratio": rng.uniform(0.05, 0.15), "label": 1},
    ]
    for p in fraud_patterns:
        for _ in range(n_fraud // len(fraud_patterns)):
            row = {k: (float(v()) if callable(v) else float(v)) for k, v in p.items() if k != "label"}
            row["label"] = 1
            rows.append(row)

    return pd.DataFrame(rows)


def train(use_synthetic=False):
    print("=== Entraînement Isolation Forest — Détection de fraude ===\n")

    if use_synthetic:
        print("Génération de données synthétiques...")
        df_full = generate_synthetic_data()
        df = df_full[FEATURE_NAMES]
        print(f"   {len(df)} soumissions générées")
    else:
        print("Chargement depuis MySQL...")
        try:
            raw = load_from_db()
            df_full = build_dataset_from_db(raw)
            df = df_full[FEATURE_NAMES]
            print(f"   {len(df)} soumissions chargées")
        except Exception as e:
            print(f"   MySQL indisponible ({e}), utilisation de données synthétiques")
            df_full = generate_synthetic_data()
            df = df_full[FEATURE_NAMES]

    if len(df) < 20:
        print("Pas assez de données (min 20). Abandon.")
        return

    print(f"\nNormalisation...")
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(df.values)

    print("Entraînement Isolation Forest (contamination=0.08)...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,   # ~8% de soumissions considérées frauduleuses
        max_samples="auto",
        random_state=42,
    )
    model.fit(X_scaled)

    scores  = model.decision_function(X_scaled)
    labels  = model.predict(X_scaled)
    n_fraud = int((labels == -1).sum())
    print(f"   Soumissions détectées comme suspectes : {n_fraud} / {len(df)} ({100*n_fraud/len(df):.1f}%)")
    print(f"   Score moyen normal   : {scores[labels ==  1].mean():.3f}")
    print(f"   Score moyen suspect  : {scores[labels == -1].mean():.3f}")

    # Seuils pour LOW/MEDIUM/HIGH
    threshold_medium = float(np.percentile(scores, 15))
    threshold_high   = float(np.percentile(scores, 8))

    meta = {
        "feature_names":      FEATURE_NAMES,
        "contamination":      0.08,
        "threshold_medium":   round(threshold_medium, 4),
        "threshold_high":     round(threshold_high, 4),
        "n_training_samples": len(df),
    }

    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model,  ANOMALY_MODEL_PATH)
    joblib.dump(scaler, ANOMALY_SCALER_PATH)
    with open(ANOMALY_META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\nModèle  : {ANOMALY_MODEL_PATH}")
    print(f"Scaler  : {ANOMALY_SCALER_PATH}")
    print(f"Meta    : {ANOMALY_META_PATH}")
    print("Entraînement terminé !")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--synthetic", action="store_true", help="Utiliser des données synthétiques")
    args = parser.parse_args()
    train(use_synthetic=args.synthetic)
