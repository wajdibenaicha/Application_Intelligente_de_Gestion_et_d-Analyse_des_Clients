"""
ML Service - Flask API pour AIGAC
Port: 5000
Endpoints:
  GET  /health                   - Health check
  POST /predict/sentiment        - Sentiment d'une réponse texte
  POST /predict/anomaly          - Détection de réponses suspectes
  POST /predict/churn            - Probabilité de churn + SHAP
  POST /predict/segment          - Cluster d'un client
  GET  /clusters/visualization   - Coordonnées 2D PCA pour scatter plot
  GET  /clusters/profiles        - Profils moyens des segments
  POST /train/<model_name>       - Re-entraînement d'un modèle
"""
from flask import Flask, jsonify
from flask_cors import CORS

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, CORS_ORIGINS
from api.clustering import clustering_bp
from api.anomaly import anomaly_bp
from api.training import training_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

    app.register_blueprint(clustering_bp)
    app.register_blueprint(anomaly_bp)
    app.register_blueprint(training_bp, url_prefix="/train")

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "UP",
            "service": "AIGAC ML Service",
            "version": "1.0.0",
            "models": {
                "clustering": "ready",
            }
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print(f"AIGAC ML Service démarré sur http://{FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
