from flask import Blueprint, request, jsonify
import joblib
from config import SENTIMENT_MODEL_PATH, SENTIMENT_VECTORIZER_PATH, SENTIMENT_POSITIF_THRESHOLD, SENTIMENT_NEUTRE_THRESHOLD

sentiment_bp = Blueprint("sentiment", __name__)
_model = None
_vectorizer = None


def _load():
    global _model, _vectorizer
    if _model is None and SENTIMENT_MODEL_PATH.exists():
        _model = joblib.load(SENTIMENT_MODEL_PATH)
        _vectorizer = joblib.load(SENTIMENT_VECTORIZER_PATH)
    return _model, _vectorizer


@sentiment_bp.route("/sentiment", methods=["POST"])
def predict_sentiment():
    data  = request.get_json() or {}
    text  = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    model, vectorizer = _load()
    if model is None:
        return jsonify({"score": 50, "sentiment": "NEUTRE", "confidence": 0.0, "fallback": True})

    X     = vectorizer.transform([text])
    proba = model.predict_proba(X)[0]
    score = int(proba[1] * 100)
    sentiment = "POSITIF" if score >= SENTIMENT_POSITIF_THRESHOLD else ("NEUTRE" if score >= SENTIMENT_NEUTRE_THRESHOLD else "NEGATIF")
    return jsonify({"score": score, "sentiment": sentiment, "confidence": float(max(proba))})
