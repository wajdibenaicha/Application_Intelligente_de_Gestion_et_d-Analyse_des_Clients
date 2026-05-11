"""
Endpoint POST /train/<model_name>
Permet de re-entraîner un modèle depuis le dashboard admin.
"""
from flask import Blueprint, jsonify
import subprocess, sys

training_bp = Blueprint("training", __name__)

ALLOWED_MODELS = {"clustering", "churn", "anomaly", "sentiment"}


@training_bp.route("/<model_name>", methods=["POST"])
def retrain(model_name):
    if model_name not in ALLOWED_MODELS:
        return jsonify({"error": f"Modèle '{model_name}' inconnu"}), 400
    try:
        script = f"training/train_{model_name}.py"
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            return jsonify({"status": "ok", "model": model_name, "output": result.stdout[-500:]})
        return jsonify({"status": "error", "model": model_name, "error": result.stderr[-500:]}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout — entraînement trop long"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500
