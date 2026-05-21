"""
Endpoint détection de fraude — XGBoost supervisé.
  POST /predict/fraud   — Analyse une soumission avec probabilité 0.0–1.0
"""
from flask import Blueprint, request, jsonify
import joblib
import json
import numpy as np

from config import MODELS_DIR
from api.anomaly import build_features   # réutilise l'extracteur de features

XGBOOST_MODEL_PATH  = MODELS_DIR / "xgboost_fraud_model.pkl"
XGBOOST_SCALER_PATH = MODELS_DIR / "xgboost_fraud_scaler.pkl"
XGBOOST_META_PATH   = MODELS_DIR / "xgboost_fraud_meta.json"

xgboost_fraud_bp = Blueprint("xgboost_fraud", __name__)

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
    if _model is None and XGBOOST_MODEL_PATH.exists():
        _model  = joblib.load(XGBOOST_MODEL_PATH)
        _scaler = joblib.load(XGBOOST_SCALER_PATH)
        if XGBOOST_META_PATH.exists():
            with open(XGBOOST_META_PATH, "r", encoding="utf-8") as f:
                _meta = json.load(f)
        else:
            _meta = {"threshold_medium": 0.35, "threshold_high": 0.65}
    return _model, _scaler, _meta


@xgboost_fraud_bp.route("/predict/fraud", methods=["POST"])
def predict_fraud():
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
      "is_fraud": true,
      "fraud_probability": 0.87,
      "risk_level": "HIGH",
      "reasons": ["straight_lining", "textes_vides"],
      "features": { ... },
      "feature_importance": { ... }
    }
    """
    data      = request.get_json() or {}
    responses = data.get("responses", [])
    kpi_score = float(data.get("kpi_score", 50))

    feats = build_features(responses, kpi_score)

    # ── Règles heuristiques (même logique que anomaly.py) ─────────────────────
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
        rule_fraud = len(reasons) >= 2
        return jsonify({
            "is_fraud":          rule_fraud,
            "fraud_probability": 0.85 if rule_fraud else 0.05,
            "risk_level":        "HIGH" if rule_fraud else "NONE",
            "reasons":           reasons,
            "features":          feats,
            "feature_importance": {},
            "fallback":          True,
        })

    X        = np.array([[feats[f] for f in FEATURE_NAMES]])
    X_scaled = scaler.transform(X)

    fraud_proba = float(model.predict_proba(X_scaled)[0][1])

    t_medium = meta.get("threshold_medium", 0.35)
    t_high   = meta.get("threshold_high",   0.65)

    if fraud_proba >= t_high:
        risk_level = "HIGH"
        is_fraud   = True
    elif fraud_proba >= t_medium:
        risk_level = "MEDIUM"
        is_fraud   = True
    else:
        risk_level = "NONE"
        is_fraud   = False

    if is_fraud and not reasons:
        reasons.append("pattern_atypique")

    feat_importance = meta.get("feature_importance", {})

    return jsonify({
        "is_fraud":          is_fraud,
        "fraud_probability": round(fraud_proba, 4),
        "risk_level":        risk_level,
        "reasons":           reasons,
        "features":          feats,
        "feature_importance": feat_importance,
    })


@xgboost_fraud_bp.route("/predict/fraud/combined", methods=["POST"])
def predict_fraud_combined():
    """
    Combine Isolation Forest (anomaly_score) + XGBoost (fraud_probability).
    Vote ensembliste : HIGH si les deux détectent, MEDIUM si l'un détecte.

    Body : identique à /predict/fraud
    Returns: {
      "is_fraud": true,
      "risk_level": "HIGH",
      "xgboost_probability": 0.87,
      "isolation_forest_score": -0.18,
      "consensus": true,
      "reasons": [...]
    }
    """
    from api.anomaly import _load_all as _load_if, ANOMALY_META_PATH
    import json as _json

    data      = request.get_json() or {}
    responses = data.get("responses", [])
    kpi_score = float(data.get("kpi_score", 50))

    feats = build_features(responses, kpi_score)
    X     = np.array([[feats[f] for f in FEATURE_NAMES]])

    # ── XGBoost ───────────────────────────────────────────────────────────────
    xgb_model, xgb_scaler, xgb_meta = _load_all()
    xgb_proba  = None
    xgb_fraud  = False
    if xgb_model is not None:
        X_xgb     = xgb_scaler.transform(X)
        xgb_proba = float(xgb_model.predict_proba(X_xgb)[0][1])
        xgb_fraud = xgb_proba >= xgb_meta.get("threshold_medium", 0.35)

    # ── Isolation Forest ──────────────────────────────────────────────────────
    from config import ANOMALY_MODEL_PATH, ANOMALY_SCALER_PATH
    if_model, if_scaler, if_meta = _load_if()
    if_score = None
    if_fraud = False
    if if_model is not None:
        X_if     = if_scaler.transform(X)
        if_score = float(if_model.decision_function(X_if)[0])
        t_med    = if_meta.get("threshold_medium", -0.05) if if_meta else -0.05
        if_fraud = if_score <= t_med

    # ── Vote ensembliste ──────────────────────────────────────────────────────
    both_detected = xgb_fraud and if_fraud
    any_detected  = xgb_fraud or  if_fraud

    if both_detected:
        risk_level = "HIGH"
        is_fraud   = True
    elif any_detected:
        risk_level = "MEDIUM"
        is_fraud   = True
    else:
        risk_level = "NONE"
        is_fraud   = False

    return jsonify({
        "is_fraud":                is_fraud,
        "risk_level":              risk_level,
        "consensus":               both_detected,
        "xgboost_probability":     round(xgb_proba, 4) if xgb_proba is not None else None,
        "isolation_forest_score":  round(if_score,  4) if if_score  is not None else None,
        "features":                feats,
    })
