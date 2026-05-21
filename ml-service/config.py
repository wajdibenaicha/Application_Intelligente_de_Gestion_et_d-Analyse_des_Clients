import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

MODELS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

SENTIMENT_MODEL_PATH     = MODELS_DIR / "sentiment_model.pkl"
SENTIMENT_VECTORIZER_PATH= MODELS_DIR / "sentiment_vectorizer.pkl"

RECOMMENDATION_MODEL_PATH = MODELS_DIR / "recommendation_model.pkl"
RECOMMENDATION_SCALER_PATH= MODELS_DIR / "recommendation_scaler.pkl"


ANOMALY_MODEL_PATH  = MODELS_DIR / "anomaly_model.pkl"
ANOMALY_SCALER_PATH = MODELS_DIR / "anomaly_scaler.pkl"

XGBOOST_MODEL_PATH  = MODELS_DIR / "xgboost_fraud_model.pkl"
XGBOOST_SCALER_PATH = MODELS_DIR / "xgboost_fraud_scaler.pkl"
XGBOOST_META_PATH   = MODELS_DIR / "xgboost_fraud_meta.json"

CLUSTERING_MODEL_PATH    = MODELS_DIR / "clustering_model.pkl"
CLUSTERING_SCALER_PATH   = MODELS_DIR / "clustering_scaler.pkl"
CLUSTERING_PCA_PATH      = MODELS_DIR / "clustering_pca.pkl"
CLUSTERING_PROFILES_PATH = MODELS_DIR / "clustering_profiles.json"

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "3306"))
DB_NAME     = os.getenv("DB_NAME", "database1")
DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

SENTIMENT_POSITIF_THRESHOLD = 70
SENTIMENT_NEUTRE_THRESHOLD  = 40


ANOMALY_CONTAMINATION        = 0.10
ANOMALY_MIN_DURATION_SECONDS = 10
ANOMALY_MAX_DURATION_SECONDS = 3600

CLUSTERING_DEFAULT_K = 4
CLUSTERING_MIN_K     = 2
CLUSTERING_MAX_K     = 8

FLASK_HOST  = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT  = int(os.getenv("FLASK_PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"

CORS_ORIGINS = ["http://localhost:8081", "http://localhost:4200"]
