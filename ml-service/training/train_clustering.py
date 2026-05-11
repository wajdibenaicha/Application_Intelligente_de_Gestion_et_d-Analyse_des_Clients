"""
Entraînement K-Means clustering sur 9 features client.

Usage:
    python training/train_clustering.py                        # depuis MySQL
    python training/train_clustering.py --csv data/clients_sample.csv  # depuis CSV
    python training/train_clustering.py --csv data/clients_sample.csv --k 5
    python training/train_clustering.py --csv data/clients_sample.csv --auto
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from config import (
    CLUSTERING_MODEL_PATH, CLUSTERING_SCALER_PATH,
    CLUSTERING_PCA_PATH, CLUSTERING_PROFILES_PATH,
    CLUSTERING_DEFAULT_K, CLUSTERING_MIN_K, CLUSTERING_MAX_K,
    DATA_DIR,
)
from utils.features import build_client_feature_vector

DEFAULT_CSV = DATA_DIR / "clients_sample.csv"


def load_from_csv(csv_path: Path) -> pd.DataFrame:
    """Charge les données depuis un fichier CSV."""
    print(f"   Lecture CSV : {csv_path}")
    df = pd.read_csv(csv_path)

    # Colonnes obligatoires
    required = {"full_name", "annee_inscription", "prime_annuelle",
                "type_contrat", "kpi_score"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV : {missing}")

    # Renommer id → client_id
    if "client_id" not in df.columns:
        if "id" in df.columns:
            df = df.rename(columns={"id": "client_id"})
        else:
            df["client_id"] = df.index + 1

    # Valeurs par défaut si kpi_score ou sentiment absents
    if "kpi_score" not in df.columns:
        df["kpi_score"] = 50.0
    if "sentiment" not in df.columns:
        df["sentiment"] = "NEUTRE"

    print(f"   {len(df)} clients chargés depuis le CSV")
    return df


def load_from_db() -> pd.DataFrame:
    """Charge les données depuis MySQL."""
    from utils.db import fetch_clients_with_kpi
    print("   Connexion MySQL...")
    df = fetch_clients_with_kpi()
    print(f"   {len(df)} clients chargés depuis MySQL")
    return df

# 9 features — tous les champs Client
FEATURE_NAMES = [
    "kpi_score",        # Score KPI 0-100
    "seniority_years",  # Ancienneté en années
    "prime_annuelle",   # Prime annuelle (TND)
    "contract_score",   # Type de contrat encodé (1-4)
    "age",              # Âge du client
    "situation_score",  # Situation familiale (1-2)
    "profession_score", # Niveau professionnel (1-3)
    "region_score",     # Région Tunisie (1-3)
    "sentiment_score",  # Dernier sentiment KPI (0-1)
]

FEATURE_LABELS = {
    "kpi_score":        "Score KPI",
    "seniority_years":  "Ancienneté (ans)",
    "prime_annuelle":   "Prime annuelle (TND)",
    "contract_score":   "Type de contrat",
    "age":              "Âge",
    "situation_score":  "Situation familiale",
    "profession_score": "Niveau professionnel",
    "region_score":     "Région",
    "sentiment_score":  "Sentiment",
}


def auto_name_segment(centroid, all_centroids):
    """
    Nomme chaque segment à partir des 9 features.
    Utilise tous les champs : KPI, ancienneté, prime, contrat, âge,
    situation familiale, profession, région, sentiment.
    """
    means = all_centroids.mean(axis=0)
    stds  = all_centroids.std(axis=0) + 1e-6
    kpi, seniority, prime, contract, age, situation, profession, region, sentiment = centroid

    # ── Indicateurs binaires sur tous les champs ──
    is_high_kpi     = kpi      > means[0] + 5
    is_low_kpi      = kpi      < means[0] - 5
    is_old_client   = seniority > means[1] + 1        # ancienneté élevée
    is_new_client   = seniority < means[1] - 1        # nouveau client
    is_high_prime   = prime    > means[2] + 150
    is_low_prime    = prime    < means[2] - 150
    is_premium      = contract >= 3                   # PREMIUM ou PLATINIUM/VIE
    is_basic        = contract <= 1
    is_young        = age      < means[4] - 5
    is_senior       = age      > means[4] + 10
    is_married      = situation >= 2
    is_professional = profession >= 2                 # cadre moyen ou supérieur
    is_capital      = region   >= 3                   # Grand Tunis
    is_positive     = sentiment > 0.65
    is_negative     = sentiment < 0.35

    # ── Arbre de décision — du plus spécifique au plus général ──

    # Profils VIP/premium
    if is_high_kpi and is_old_client and is_premium:
        return {"name": "Premium fidèle",       "color": "#10b981", "priority": "RETENTION_VIP",
                "description": "Clients haut de gamme, anciens et très satisfaits. Rétention VIP prioritaire."}

    if is_high_prime and is_high_kpi and is_professional:
        return {"name": "Performant rentable",  "color": "#8b5cf6", "priority": "ADVOCACY",
                "description": "Forte prime, satisfaction élevée, profil cadre. Ambassadeurs potentiels."}

    if is_old_client and is_high_prime and is_married:
        return {"name": "Famille aisée",        "color": "#f59e0b", "priority": "RETENTION_VIP",
                "description": "Clients mariés, anciens et avec forte prime. Profil familial stable."}

    # Profils à risque
    if is_low_kpi and is_negative and is_new_client:
        return {"name": "Insatisfait récent",   "color": "#f97316", "priority": "URGENT_CARE",
                "description": "Nouveaux clients avec satisfaction très faible. Intervention immédiate."}

    if is_low_kpi and is_old_client:
        return {"name": "À reconquérir",        "color": "#ef4444", "priority": "WIN_BACK",
                "description": "Anciens clients en décrochage. Risque de churn élevé."}

    if is_negative and not is_high_kpi:
        return {"name": "Client à risque",      "color": "#dc2626", "priority": "URGENT_CARE",
                "description": "Sentiment négatif persistant. Suivi commercial urgent requis."}

    # Profils à fort potentiel
    if is_young and is_capital and is_professional:
        return {"name": "Jeune cadre urbain",   "color": "#0ea5e9", "priority": "UPSELL",
                "description": "Jeune professionnel en zone urbaine. Fort potentiel d'upsell."}

    if is_young and not is_high_prime:
        return {"name": "Jeune émergent",       "color": "#3b82f6", "priority": "UPSELL",
                "description": "Clients jeunes à fort potentiel de croissance. Cibles de fidélisation."}

    if is_capital and is_professional and is_positive:
        return {"name": "Urbain satisfait",     "color": "#06b6d4", "priority": "MAINTAIN",
                "description": "Professionnel en capitale, satisfait. Segment stable à maintenir."}

    # Profils spécifiques par champs
    if is_senior and is_high_prime:
        return {"name": "Senior premium",       "color": "#84cc16", "priority": "RETENTION_VIP",
                "description": "Clients âgés avec forte prime. Relation longue durée à préserver."}

    if is_senior and is_old_client:
        return {"name": "Senior fidèle",        "color": "#65a30d", "priority": "MAINTAIN",
                "description": "Clients d'âge avancé avec longue ancienneté. Relation stable."}

    if is_premium and is_positive:
        return {"name": "Contrat haut gamme",   "color": "#7c3aed", "priority": "MAINTAIN",
                "description": "Contrat PREMIUM/PLATINIUM avec bon sentiment. Segment à soigner."}

    if is_basic and is_low_prime and is_new_client:
        return {"name": "Entrée de gamme",      "color": "#94a3b8", "priority": "UPSELL",
                "description": "Contrat basique, faible prime, récent. Potentiel d'upgrade."}

    if is_high_kpi and is_positive:
        return {"name": "Clients satisfaits",   "color": "#22c55e", "priority": "MAINTAIN",
                "description": "KPI et sentiment positifs. Groupe à maintenir activement."}

    if is_low_prime and is_basic:
        return {"name": "Économique",           "color": "#a3a3a3", "priority": "UPSELL",
                "description": "Faible prime et contrat basique. Cibles de montée en gamme."}

    return {"name": "Standard stable",          "color": "#6b7280", "priority": "MAINTAIN",
            "description": "Clients aux profils équilibrés. Maintien de la relation recommandé."}


def find_optimal_k(X, k_min, k_max):
    """Méthode du coude pour trouver le K optimal."""
    inertias = []
    for k in range(k_min, k_max + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(X)
        inertias.append(km.inertia_)
    diffs  = np.diff(inertias)
    diffs2 = np.diff(diffs)
    optimal_idx = np.argmax(np.abs(diffs2)) + 1
    optimal_k   = k_min + optimal_idx
    print(f"   Inerties : {[round(i, 1) for i in inertias]}")
    print(f"   K optimal : {optimal_k}")
    return optimal_k


def train(k=None, auto_k=False, csv_path: Path = None):
    # ── Chargement des données ────────────────────────────────────────────────
    print("Chargement des données...")
    if csv_path is not None:
        df = load_from_csv(csv_path)
    else:
        try:
            df = load_from_db()
        except Exception as e:
            print(f"   MySQL indisponible ({e})")
            print(f"   Utilisation du CSV par défaut : {DEFAULT_CSV}")
            df = load_from_csv(DEFAULT_CSV)

    print(f"   {len(df)} clients trouvés")

    if len(df) < 10:
        print("Pas assez de clients (min 10). Abandon.")
        return

    print("Construction des vecteurs de features (9 dimensions)...")
    features_matrix = []
    client_ids = []
    for _, row in df.iterrows():
        try:
            feats = build_client_feature_vector(row.to_dict())
            features_matrix.append([feats[f] for f in FEATURE_NAMES])
            client_ids.append(int(row["client_id"]))
        except Exception as e:
            print(f"   Skip client {row.get('client_id')} : {e}")

    X = np.array(features_matrix)
    print(f"   Matrice features : {X.shape}")

    print("Normalisation StandardScaler...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K
    if auto_k:
        print("Recherche K optimal (méthode du coude)...")
        k = find_optimal_k(X_scaled, CLUSTERING_MIN_K, min(CLUSTERING_MAX_K, len(X) // 2))
    elif k is None:
        k = CLUSTERING_DEFAULT_K
    k = max(CLUSTERING_MIN_K, min(k, CLUSTERING_MAX_K))
    print(f"Clustering avec K = {k}")

    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(X_scaled)

    print("Calcul PCA 2D pour la visualisation...")
    pca = PCA(n_components=2, random_state=42)
    pca.fit(X_scaled)
    print(f"   Variance expliquée : {pca.explained_variance_ratio_.sum():.2%}")

    print("Génération automatique des noms de segments...")
    centroids_unscaled = scaler.inverse_transform(model.cluster_centers_)

    profiles = {}
    for cluster_id in range(k):
        centroid     = centroids_unscaled[cluster_id]
        cluster_size = int((labels == cluster_id).sum())
        cluster_kpi  = float(X[labels == cluster_id, 0].mean())

        meta = auto_name_segment(centroid, centroids_unscaled)
        profiles[str(cluster_id)] = {
            **meta,
            "id":   cluster_id,
            "size": cluster_size,
            "avg_kpi": round(cluster_kpi, 1),
            "centroid": {
                FEATURE_NAMES[i]: round(float(centroid[i]), 2)
                for i in range(len(FEATURE_NAMES))
            },
        }

    # Dédupliquer les noms : si deux clusters ont le même nom, ajouter un qualificatif
    name_count: dict = {}
    for cid, prof in profiles.items():
        n = prof["name"]
        name_count[n] = name_count.get(n, 0) + 1

    name_seen: dict = {}
    suffixes = ["A", "B", "C", "D"]
    for cid, prof in profiles.items():
        n = prof["name"]
        if name_count[n] > 1:
            idx = name_seen.get(n, 0)
            prof["name"] = f"{n} ({suffixes[idx]})"
            name_seen[n] = idx + 1

    for cluster_id in range(k):
        prof = profiles[str(cluster_id)]
        print(f"   Cluster {cluster_id} → '{prof['name']}' "
              f"({prof['size']} clients, KPI moy. {prof['avg_kpi']:.1f})")

    joblib.dump(model,  CLUSTERING_MODEL_PATH)
    joblib.dump(scaler, CLUSTERING_SCALER_PATH)
    joblib.dump(pca,    CLUSTERING_PCA_PATH)
    with open(CLUSTERING_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)

    print(f"\nModèle    : {CLUSTERING_MODEL_PATH}")
    print(f"Scaler    : {CLUSTERING_SCALER_PATH}")
    print(f"PCA       : {CLUSTERING_PCA_PATH}")
    print(f"Profils   : {CLUSTERING_PROFILES_PATH}")
    print("Entraînement terminé !")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--k",    type=int, default=None, help="Nombre de clusters (défaut: 4)")
    parser.add_argument("--auto", action="store_true",    help="Détection automatique du K optimal")
    parser.add_argument("--csv",  type=str, default=None, help="Chemin vers un fichier CSV client")
    args = parser.parse_args()

    csv = Path(args.csv) if args.csv else None
    train(k=args.k, auto_k=args.auto, csv_path=csv)
