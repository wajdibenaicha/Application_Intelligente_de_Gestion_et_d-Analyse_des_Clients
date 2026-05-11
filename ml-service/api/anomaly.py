"""
Endpoint détection de fraude — Isolation Forest.
  POST /predict/anomaly   — Analyse une soumission de questionnaire
"""
from flask import Blueprint, request, jsonify
import joblib
import json
import numpy as np

from config import ANOMALY_MODEL_PATH, ANOMALY_SCALER_PATH, MODELS_DIR

ANOMALY_META_PATH = MODELS_DIR / "anomaly_meta.json"

anomaly_bp = Blueprint("anomaly", __name__)

_model  = None
_scaler = None
_meta   = None

FEATURE_NAMES = [
    "scale_variance",
    "scale_extreme_ratio",
    "text_empty_ratio",
    "text_avg_length",
    "nb_questions",
    "kpi_score",
    "unique_ratio",
]


def _load_all():
    global _model, _scaler, _meta
    if _model is None and ANOMALY_MODEL_PATH.exists():
        _model  = joblib.load(ANOMALY_MODEL_PATH)
        _scaler = joblib.load(ANOMALY_SCALER_PATH)
        if ANOMALY_META_PATH.exists():
            with open(ANOMALY_META_PATH, "r", encoding="utf-8") as f:
                _meta = json.load(f)
        else:
            _meta = {"threshold_medium": -0.05, "threshold_high": -0.15}
    return _model, _scaler, _meta


def build_features(responses: list, kpi_score: float) -> dict:
    """Extrait les features depuis les réponses — adapté à tous les types de questions."""
    scale_vals    = []
    text_vals     = []
    discrete_vals = []  # radio, select, checkbox

    for r in responses:
        qtype = (r.get("question_type") or r.get("type") or "text").lower()
        val   = str(r.get("value") or "").strip()

        if qtype == "scale":
            try:
                scale_vals.append(float(val))
            except ValueError:
                pass
        elif qtype == "text":
            text_vals.append(val)
        elif qtype in ("radio", "select", "checkbox"):
            discrete_vals.append(val)

    # ── Features scale (si présentes) ────────────────────────────────────────
    if len(scale_vals) >= 2:
        scale_variance      = float(np.std(scale_vals))
        extremes            = sum(1 for v in scale_vals if v <= 1 or v >= 5)
        scale_extreme_ratio = extremes / len(scale_vals)
    else:
        # Pas de questions scale → neutre (ni suspect ni normal)
        scale_variance      = 1.0
        scale_extreme_ratio = 0.3

    # ── Features texte ────────────────────────────────────────────────────────
    if text_vals:
        text_empty_ratio = sum(1 for t in text_vals if not t) / len(text_vals)
        non_empty        = [len(t) for t in text_vals if t]
        text_avg_length  = float(np.mean(non_empty)) if non_empty else 0.0
    else:
        # Pas de questions texte → neutre
        text_empty_ratio = 0.0
        text_avg_length  = 30.0

    # ── Diversité globale (toutes les réponses) ───────────────────────────────
    all_vals = [str(r.get("value") or "") for r in responses if r.get("value")]
    if len(all_vals) >= 2:
        unique_ratio = len(set(all_vals)) / len(all_vals)
    else:
        unique_ratio = 1.0

    # ── Diversité réponses discrètes (radio/select) ───────────────────────────
    if len(discrete_vals) >= 3:
        # Si toutes identiques → straight-lining sur radio
        discrete_unique = len(set(discrete_vals)) / len(discrete_vals)
        # Fusionner avec unique_ratio
        unique_ratio = min(unique_ratio, discrete_unique * 1.2)

    return {
        "scale_variance":      round(scale_variance, 4),
        "scale_extreme_ratio": round(scale_extreme_ratio, 4),
        "text_empty_ratio":    round(text_empty_ratio, 4),
        "text_avg_length":     round(text_avg_length, 4),
        "nb_questions":        float(len(responses)),
        "kpi_score":           float(kpi_score),
        "unique_ratio":        round(unique_ratio, 4),
    }


@anomaly_bp.route("/predict/anomaly", methods=["POST"])
def predict_anomaly():
    """
    Body: {
      "client_id": 1,
      "questionnaire_id": 2,
      "kpi_score": 45.0,
      "responses": [
        {"question_type": "scale", "value": "5"},
        {"question_type": "text",  "value": ""},
        {"question_type": "radio", "value": "Oui"}
      ]
    }
    Returns: {
      "is_anomaly": true,
      "anomaly_score": -0.15,
      "risk_level": "HIGH",
      "reasons": ["straight_lining", "textes_vides"],
      "features": { ... }
    }
    """
    data       = request.get_json() or {}
    responses  = data.get("responses", [])
    kpi_score  = float(data.get("kpi_score", 50))

    feats = build_features(responses, kpi_score)

    # Règles heuristiques — seulement si les types de questions sont présents
    reasons = []
    has_scale = any((r.get("question_type") or r.get("type") or "").lower() == "scale"
                    for r in responses)
    has_text  = any((r.get("question_type") or r.get("type") or "").lower() == "text"
                    for r in responses)

    if has_scale and feats["scale_variance"] < 0.2 and feats["nb_questions"] >= 3:
        reasons.append("straight_lining")
    if has_scale and feats["scale_extreme_ratio"] > 0.85:
        reasons.append("reponses_extremes")
    if has_text and feats["text_empty_ratio"] > 0.7:
        reasons.append("textes_vides")
    if feats["unique_ratio"] < 0.15 and feats["nb_questions"] >= 4:
        reasons.append("manque_diversite")
    if kpi_score >= 98:
        reasons.append("kpi_suspect")
    if has_text and feats["text_avg_length"] < 3 and feats["text_empty_ratio"] < 0.5:
        reasons.append("textes_trop_courts")

    model, scaler, meta = _load_all()

    if model is None:
        # Fallback heuristique si modèle non entraîné
        rule_anomaly = len(reasons) >= 2
        return jsonify({
            "is_anomaly":    rule_anomaly,
            "anomaly_score": -0.5 if rule_anomaly else 0.1,
            "risk_level":    "HIGH" if rule_anomaly else "NONE",
            "reasons":       reasons,
            "features":      feats,
            "fallback":      True,
        })

    X        = np.array([[feats[f] for f in FEATURE_NAMES]])
    X_scaled = scaler.transform(X)
    score    = float(model.decision_function(X_scaled)[0])
    pred     = int(model.predict(X_scaled)[0])
    is_anomaly = pred == -1

    t_medium = meta.get("threshold_medium", -0.05)
    t_high   = meta.get("threshold_high",   -0.15)

    if is_anomaly:
        risk_level = "HIGH" if score <= t_high else "MEDIUM"
    elif score <= t_medium:
        risk_level = "MEDIUM"
        is_anomaly = True
    else:
        risk_level = "NONE"

    if is_anomaly and not reasons:
        reasons.append("pattern_atypique")

    return jsonify({
        "is_anomaly":    is_anomaly,
        "anomaly_score": round(score, 4),
        "risk_level":    risk_level,
        "reasons":       reasons,
        "features":      feats,
    })
