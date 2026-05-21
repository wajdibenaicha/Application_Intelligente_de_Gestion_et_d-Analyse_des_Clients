"""
Entraînement XGBoost — Détection de fraude supervisée.

Dataset indépendant : fraud_xgboost_train.csv
  Colonnes : scale_variance, scale_extreme_ratio, text_empty_ratio,
             text_avg_length, nb_questions, kpi_score, unique_ratio, label
  label : 0 = soumission normale  |  1 = soumission frauduleuse

Usage:
    python training/train_xgboost.py                          # charge fraud_xgboost_train.csv
    python training/train_xgboost.py --generate               # génère le CSV puis entraîne
    python training/train_xgboost.py --csv data/mon_fichier.csv
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import json
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (classification_report, roc_auc_score,
                             confusion_matrix, precision_recall_fscore_support)

from config import MODELS_DIR, DATA_DIR

XGBOOST_MODEL_PATH  = MODELS_DIR / "xgboost_fraud_model.pkl"
XGBOOST_SCALER_PATH = MODELS_DIR / "xgboost_fraud_scaler.pkl"
XGBOOST_META_PATH   = MODELS_DIR / "xgboost_fraud_meta.json"

DEFAULT_CSV = DATA_DIR / "fraud_xgboost_train.csv"

FEATURE_NAMES = [
    "scale_variance",
    "scale_extreme_ratio",
    "text_empty_ratio",
    "text_avg_length",
    "nb_questions",
    "kpi_score",
    "unique_ratio",
]


def generate_labeled_dataset(n_normal: int = 1850, n_fraud: int = 150,
                              save_path: Path = DEFAULT_CSV) -> pd.DataFrame:
    """
    Génère un dataset labelisé indépendant avec patterns réalistes.

    Patterns normaux  — 4 profils de répondants sérieux.
    Patterns fraude   — 4 types de fraude questionnaire documentés.
    label : 0 = normal, 1 = fraude
    """
    rng = np.random.default_rng(42)
    rows = []

    # ── Profils normaux ────────────────────────────────────────────────────────
    n_per_profile = n_normal // 4

    for _ in range(n_per_profile):
        # Répondant engagé — textes longs, réponses variées
        rows.append({
            "scale_variance":      float(rng.uniform(1.5, 3.0)),
            "scale_extreme_ratio": float(rng.uniform(0.0, 0.2)),
            "text_empty_ratio":    float(rng.uniform(0.0, 0.1)),
            "text_avg_length":     float(rng.uniform(80.0, 250.0)),
            "nb_questions":        float(rng.integers(8, 15)),
            "kpi_score":           float(rng.uniform(55.0, 90.0)),
            "unique_ratio":        float(rng.uniform(0.75, 1.0)),
            "label": 0,
        })

    for _ in range(n_per_profile):
        # Répondant moyen — comportement neutre
        rows.append({
            "scale_variance":      float(rng.uniform(0.8, 2.0)),
            "scale_extreme_ratio": float(rng.uniform(0.1, 0.35)),
            "text_empty_ratio":    float(rng.uniform(0.05, 0.30)),
            "text_avg_length":     float(rng.uniform(25.0, 100.0)),
            "nb_questions":        float(rng.integers(5, 12)),
            "kpi_score":           float(rng.uniform(35.0, 75.0)),
            "unique_ratio":        float(rng.uniform(0.55, 0.85)),
            "label": 0,
        })

    for _ in range(n_per_profile):
        # Répondant négatif — textes courts, critique mais authentique
        rows.append({
            "scale_variance":      float(rng.uniform(0.5, 1.5)),
            "scale_extreme_ratio": float(rng.uniform(0.3, 0.6)),
            "text_empty_ratio":    float(rng.uniform(0.1, 0.45)),
            "text_avg_length":     float(rng.uniform(8.0, 50.0)),
            "nb_questions":        float(rng.integers(4, 10)),
            "kpi_score":           float(rng.uniform(15.0, 50.0)),
            "unique_ratio":        float(rng.uniform(0.4, 0.70)),
            "label": 0,
        })

    remaining_normal = n_normal - 3 * n_per_profile
    for _ in range(remaining_normal):
        # Répondant rapide — pressé mais honnête
        rows.append({
            "scale_variance":      float(rng.uniform(0.6, 1.8)),
            "scale_extreme_ratio": float(rng.uniform(0.15, 0.50)),
            "text_empty_ratio":    float(rng.uniform(0.2, 0.55)),
            "text_avg_length":     float(rng.uniform(5.0, 35.0)),
            "nb_questions":        float(rng.integers(3, 8)),
            "kpi_score":           float(rng.uniform(30.0, 80.0)),
            "unique_ratio":        float(rng.uniform(0.45, 0.75)),
            "label": 0,
        })

    # ── Patterns de fraude ─────────────────────────────────────────────────────
    n_per_fraud = n_fraud // 4

    for _ in range(n_per_fraud):
        # Fraude type 1 — Straight-lining (même réponse partout)
        rows.append({
            "scale_variance":      float(rng.uniform(0.0, 0.12)),
            "scale_extreme_ratio": float(rng.uniform(0.85, 1.0)),
            "text_empty_ratio":    float(rng.uniform(0.7, 1.0)),
            "text_avg_length":     float(rng.uniform(0.0, 4.0)),
            "nb_questions":        float(rng.integers(4, 12)),
            "kpi_score":           float(rng.uniform(88.0, 100.0)),
            "unique_ratio":        float(rng.uniform(0.03, 0.12)),
            "label": 1,
        })

    for _ in range(n_per_fraud):
        # Fraude type 2 — Inflation KPI (KPI max + textes vides)
        rows.append({
            "scale_variance":      float(rng.uniform(0.0, 0.18)),
            "scale_extreme_ratio": float(rng.uniform(0.92, 1.0)),
            "text_empty_ratio":    float(rng.uniform(0.88, 1.0)),
            "text_avg_length":     0.0,
            "nb_questions":        float(rng.integers(3, 8)),
            "kpi_score":           float(rng.uniform(96.0, 100.0)),
            "unique_ratio":        float(rng.uniform(0.04, 0.10)),
            "label": 1,
        })

    for _ in range(n_per_fraud):
        # Fraude type 3 — Réponses identiques (diversité quasi nulle)
        rows.append({
            "scale_variance":      float(rng.uniform(0.0, 0.08)),
            "scale_extreme_ratio": float(rng.uniform(0.6, 0.95)),
            "text_empty_ratio":    float(rng.uniform(0.5, 0.85)),
            "text_avg_length":     float(rng.uniform(1.0, 6.0)),
            "nb_questions":        float(rng.integers(5, 15)),
            "kpi_score":           float(rng.uniform(82.0, 100.0)),
            "unique_ratio":        float(rng.uniform(0.04, 0.18)),
            "label": 1,
        })

    remaining_fraud = n_fraud - 3 * n_per_fraud
    for _ in range(remaining_fraud):
        # Fraude type 4 — Mixte subtil (plus difficile à détecter)
        rows.append({
            "scale_variance":      float(rng.uniform(0.1, 0.4)),
            "scale_extreme_ratio": float(rng.uniform(0.7, 0.9)),
            "text_empty_ratio":    float(rng.uniform(0.6, 0.9)),
            "text_avg_length":     float(rng.uniform(0.0, 8.0)),
            "nb_questions":        float(rng.integers(4, 14)),
            "kpi_score":           float(rng.uniform(78.0, 99.0)),
            "unique_ratio":        float(rng.uniform(0.08, 0.22)),
            "label": 1,
        })

    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    DATA_DIR.mkdir(exist_ok=True)
    df.to_csv(save_path, index=False)
    n_f = int(df["label"].sum())
    print(f"   Dataset généré : {len(df) - n_f} normaux + {n_f} frauduleux → {save_path.name}")
    return df


def train(csv_path: Path = DEFAULT_CSV, generate: bool = False):
    print("=== Entraînement XGBoost — Détection de fraude supervisée ===\n")

    # ── Chargement / génération du dataset ────────────────────────────────────
    if generate or not csv_path.exists():
        if not generate:
            print(f"   {csv_path.name} introuvable → génération automatique")
        else:
            print("Mode : génération du dataset labelisé")
        df = generate_labeled_dataset(save_path=csv_path)
    else:
        print(f"Mode : chargement CSV ({csv_path.name})")
        df = pd.read_csv(csv_path)
        print(f"   {len(df)} soumissions chargées")

    required = set(FEATURE_NAMES) | {"label"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV : {missing}")

    n_fraud  = int(df["label"].sum())
    n_normal = len(df) - n_fraud
    print(f"   Distribution : {n_normal} normaux ({100*n_normal/len(df):.1f}%) "
          f"| {n_fraud} fraudes ({100*n_fraud/len(df):.1f}%)")

    if n_fraud < 10:
        print("Pas assez de fraudes pour entraîner (min 10). Abandon.")
        return

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    # ── Normalisation ──────────────────────────────────────────────────────────
    print("\nNormalisation StandardScaler...")
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Split train/test ───────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"   Train : {len(X_train)} | Test : {len(X_test)}")

    # ── XGBoost ───────────────────────────────────────────────────────────────
    scale_pos_weight = n_normal / max(n_fraud, 1)  # équilibrage automatique
    print(f"\nEntraînement XGBoost (scale_pos_weight={scale_pos_weight:.1f})...")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )
    model.fit(X_train, y_train)

    # ── Évaluation ─────────────────────────────────────────────────────────────
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_proba)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, pos_label=1, average="binary"
    )

    print(f"\n── Métriques sur le jeu de test ──────────────────────────")
    print(f"   AUC-ROC   : {auc:.4f}")
    print(f"   Précision : {precision:.4f}")
    print(f"   Rappel    : {recall:.4f}")
    print(f"   F1-score  : {f1:.4f}")
    print(f"\n── Matrice de confusion ───────────────────────────────────")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   VN={cm[0][0]}  FP={cm[0][1]}")
    print(f"   FN={cm[1][0]}  VP={cm[1][1]}")

    # ── Validation croisée ─────────────────────────────────────────────────────
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_scaled, y, cv=cv, scoring="roc_auc")
    print(f"\n── Validation croisée (5-fold AUC) ───────────────────────")
    print(f"   {cv_scores.round(4)} → moyenne {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── Feature importance ────────────────────────────────────────────────────
    importances = model.feature_importances_
    feat_importance = {
        FEATURE_NAMES[i]: round(float(importances[i]), 4)
        for i in range(len(FEATURE_NAMES))
    }
    feat_sorted = sorted(feat_importance.items(), key=lambda x: x[1], reverse=True)

    print(f"\n── Importance des features ───────────────────────────────")
    bar_max = 30
    for fname, fimport in feat_sorted:
        bar = "█" * int(fimport * bar_max)
        print(f"   {fname:<22} {bar:<30} {fimport:.4f}")

    # ── Seuils de décision ────────────────────────────────────────────────────
    all_proba   = model.predict_proba(X_scaled)[:, 1]
    t_medium    = float(np.percentile(all_proba[y == 0], 90))  # 90e pct des normaux
    t_high      = float(np.percentile(all_proba[y == 0], 97))  # 97e pct des normaux
    t_medium    = round(min(t_medium, 0.50), 4)
    t_high      = round(min(t_high,   0.75), 4)

    print(f"\n── Seuils de risque ──────────────────────────────────────")
    print(f"   MEDIUM : proba ≥ {t_medium}")
    print(f"   HIGH   : proba ≥ {t_high}")

    # ── Sauvegarde ────────────────────────────────────────────────────────────
    meta = {
        "feature_names":      FEATURE_NAMES,
        "threshold_medium":   t_medium,
        "threshold_high":     t_high,
        "n_training_samples": len(df),
        "n_fraud_samples":    n_fraud,
        "fraud_ratio":        round(n_fraud / len(df), 4),
        "metrics": {
            "auc_roc":   round(auc, 4),
            "precision": round(float(precision), 4),
            "recall":    round(float(recall), 4),
            "f1":        round(float(f1), 4),
            "cv_auc_mean": round(float(cv_scores.mean()), 4),
        },
        "feature_importance": feat_importance,
        "source": str(csv_path),
    }

    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model,  XGBOOST_MODEL_PATH)
    joblib.dump(scaler, XGBOOST_SCALER_PATH)
    with open(XGBOOST_META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    print(f"\nModèle  : {XGBOOST_MODEL_PATH}")
    print(f"Scaler  : {XGBOOST_SCALER_PATH}")
    print(f"Meta    : {XGBOOST_META_PATH}")
    print("Entraînement terminé !")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",      type=str,          default=None,
                        help="Chemin vers le CSV labelisé (colonnes features + label)")
    parser.add_argument("--generate", action="store_true",
                        help="Génère fraud_xgboost_train.csv puis entraîne")
    args = parser.parse_args()

    csv_path = Path(args.csv) if args.csv else DEFAULT_CSV
    train(csv_path=csv_path, generate=args.generate)
