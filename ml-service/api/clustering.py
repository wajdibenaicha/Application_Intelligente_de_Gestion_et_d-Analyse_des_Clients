"""
Endpoints clustering — 9 features (tous champs Client).
  POST /predict/segment            — Cluster d'un client
  GET  /clusters/visualization     — Scatter plot PCA 2D
  GET  /clusters/profiles          — Cards des segments
"""
from flask import Blueprint, request, jsonify
import joblib
import json
import numpy as np

from config import (
    CLUSTERING_MODEL_PATH, CLUSTERING_SCALER_PATH,
    CLUSTERING_PCA_PATH, CLUSTERING_PROFILES_PATH,
)
from utils.features import build_client_feature_vector

clustering_bp = Blueprint("clustering", __name__)

_model    = None
_scaler   = None
_pca      = None
_profiles = None
_viz_cache = None  # cache visualization result (recomputed on /train)

# 9 features — doit correspondre exactement à train_clustering.py
FEATURE_NAMES = [
    "kpi_score", "seniority_years", "prime_annuelle", "contract_score",
    "age", "situation_score", "profession_score", "region_score", "sentiment_score",
]


def _load_all():
    global _model, _scaler, _pca, _profiles
    if _model is None and CLUSTERING_MODEL_PATH.exists():
        _model  = joblib.load(CLUSTERING_MODEL_PATH)
        _scaler = joblib.load(CLUSTERING_SCALER_PATH)
        _pca    = joblib.load(CLUSTERING_PCA_PATH)
        with open(CLUSTERING_PROFILES_PATH, "r", encoding="utf-8") as f:
            _profiles = json.load(f)
    return _model, _scaler, _pca, _profiles


@clustering_bp.route("/predict/segments/bulk", methods=["POST"])
def predict_segments_bulk():
    """
    Classifie tous les clients en un seul appel (batch numpy).
    Body: [{"client_id": 1, "kpi_score": 72, "annee_inscription": 2015, ...}, ...]
    Returns: [{"client_id": 1, "segment_id": 0, "segment_name": "...", ...}, ...]
    """
    clients = request.get_json() or []
    model, scaler, pca, profiles = _load_all()
    if model is None:
        return jsonify({"error": "Modèle non entraîné"}), 503
    if not clients:
        return jsonify([])

    feat_vecs = []
    valid_clients = []
    for c in clients:
        try:
            feats = build_client_feature_vector(c)
            feat_vecs.append([feats[f] for f in FEATURE_NAMES])
            valid_clients.append(c)
        except Exception:
            continue

    X = np.array(feat_vecs)
    X_scaled = scaler.transform(X)
    cluster_ids = model.predict(X_scaled)

    results = []
    for i, c in enumerate(valid_clients):
        cid = int(cluster_ids[i])
        profile = profiles.get(str(cid), {})
        results.append({
            "client_id":        c.get("client_id"),
            "segment_id":       cid,
            "segment_name":     profile.get("name", f"Segment {cid}"),
            "segment_color":    profile.get("color", "#6b7280"),
            "segment_priority": profile.get("priority", "MAINTAIN"),
        })
    return jsonify(results)


@clustering_bp.route("/predict/segment", methods=["POST"])
def predict_segment():
    """
    Body: {
      "kpi_score": 72, "annee_inscription": 2015,
      "prime_annuelle": 1800, "type_contrat": "PREMIUM",
      "date_naissance": "1985-06-15",
      "situation_familiale": "MARIE",
      "profession": "ingénieur",
      "adresse": "Tunis",
      "sentiment": "POSITIF"
    }
    Returns: {
      "segment_id": 0,
      "segment_name": "Premium fidèle",
      "segment_description": "...",
      "segment_color": "#10b981",
      "distance_to_centroid": 0.45
    }
    """
    data = request.get_json() or {}
    model, scaler, pca, profiles = _load_all()

    if model is None:
        return jsonify({"error": "Modèle non entraîné. Lancez training/train_clustering.py"}), 503

    feats = build_client_feature_vector(data)
    X = np.array([[feats[f] for f in FEATURE_NAMES]])
    X_scaled = scaler.transform(X)

    cluster_id = int(model.predict(X_scaled)[0])
    distances  = model.transform(X_scaled)[0]
    distance   = float(distances[cluster_id])
    profile    = profiles.get(str(cluster_id), {})

    return jsonify({
        "segment_id":          cluster_id,
        "segment_name":        profile.get("name", f"Segment {cluster_id}"),
        "segment_description": profile.get("description", ""),
        "segment_color":       profile.get("color", "#6b7280"),
        "segment_priority":    profile.get("priority", "MAINTAIN"),
        "distance_to_centroid": round(distance, 3),
    })


def _compute_visualization():
    """Calcule les données de visualisation et les met en cache."""
    global _viz_cache
    import pandas as pd
    from config import DATA_DIR

    model, scaler, pca, profiles = _load_all()
    if model is None:
        return None

    df = pd.DataFrame()
    csv_files = sorted(DATA_DIR.glob("*.csv"))
    if csv_files:
        try:
            df = pd.read_csv(csv_files[0])
            if "id" in df.columns and "client_id" not in df.columns:
                df = df.rename(columns={"id": "client_id"})
            if "client_id" not in df.columns:
                df["client_id"] = df.index + 1
            if "kpi_score" not in df.columns:
                df["kpi_score"] = 50.0
            if "sentiment" not in df.columns:
                df["sentiment"] = "NEUTRE"
        except Exception:
            return {"points": [], "clusters": []}
    else:
        return {"points": [], "clusters": []}

    if df.empty:
        return {"points": [], "clusters": []}

    rows_list  = [row.to_dict() for _, row in df.iterrows()]
    feat_vecs  = []
    valid_rows = []
    for row in rows_list:
        try:
            feats = build_client_feature_vector(row)
            feat_vecs.append([feats[f] for f in FEATURE_NAMES])
            valid_rows.append(row)
        except Exception:
            continue

    X        = np.array(feat_vecs)
    X_scaled = scaler.transform(X)
    X_pca    = pca.transform(X_scaled)
    clusters = model.predict(X_scaled)

    points = [
        {
            "client_id": int(row["client_id"]),
            "name":      str(row.get("full_name", "")),
            "x":         round(float(X_pca[i][0]), 3),
            "y":         round(float(X_pca[i][1]), 3),
            "cluster":   int(clusters[i]),
            "kpi_score": float(row.get("kpi_score") or 0),
        }
        for i, row in enumerate(valid_rows)
    ]

    cluster_meta = [
        {
            "id":    cid,
            "name":  profiles.get(str(cid), {}).get("name", f"Segment {cid}"),
            "color": profiles.get(str(cid), {}).get("color", "#6b7280"),
            "size":  int((clusters == cid).sum()),
        }
        for cid in sorted(set(int(c) for c in clusters))
    ]

    _viz_cache = {"points": points, "clusters": cluster_meta}
    return _viz_cache


@clustering_bp.route("/clusters/visualization", methods=["GET"])
def visualization():
    """Scatter plot 2D (PCA) — résultat mis en cache après le premier appel."""
    global _viz_cache
    if _viz_cache is not None:
        return jsonify(_viz_cache)
    result = _compute_visualization()
    if result is None:
        return jsonify({"error": "Modèle non entraîné"}), 503
    return jsonify(result)


@clustering_bp.route("/clusters/profiles", methods=["GET"])
def profiles_endpoint():
    """
    Cards des segments avec KPI moyen, taille, description.
    """
    _, _, _, profile_data = _load_all()
    if profile_data is None:
        return jsonify({"error": "Modèle non entraîné"}), 503
    return jsonify(profile_data)
