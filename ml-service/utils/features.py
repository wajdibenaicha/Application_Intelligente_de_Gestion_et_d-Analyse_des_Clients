"""
Feature engineering — 9 features extraites depuis tous les champs Client.
"""
from datetime import datetime
import numpy as np
import pandas as pd

CURRENT_YEAR = datetime.now().year

# ── Encodings ──────────────────────────────────────────────────────────────────

CONTRACT_SCORE_MAP = {
    "BASIQUE": 1, "GENERAL": 1, "VOYAGE": 1, "RC": 1,
    "STANDARD": 2, "AUTO": 2, "HABITATION": 2, "SANTE": 2,
    "PREMIUM": 3,
    "PLATINIUM": 4, "VIE": 4,
}

SITUATION_SCORE_MAP = {
    "MARIE": 2, "MARIÉ": 2, "MARIEE": 2, "MARIÉE": 2,
    "CELIBATAIRE": 1, "CÉLIBATAIRE": 1,
    "DIVORCE": 1, "DIVORCÉ": 1, "DIVORCEE": 1, "DIVORCÉE": 1,
    "VEUF": 1, "VEUVE": 1,
}

# Professions regroupées par niveau de revenus estimé (1=bas, 2=moyen, 3=élevé)
PROFESSION_SCORE_MAP = {
    # Niveau 3 — cadres supérieurs
    "médecin": 3, "medecin": 3, "docteur": 3, "ingénieur": 3, "ingenieur": 3,
    "avocat": 3, "architecte": 3, "pharmacien": 3, "chirurgien": 3,
    "directeur": 3, "pdg": 3, "chef d'entreprise": 3, "entrepreneur": 3,
    # Niveau 2 — cadres moyens
    "enseignant": 2, "professeur": 2, "comptable": 2, "technicien": 2,
    "infirmier": 2, "infirmière": 2, "agent": 2, "gestionnaire": 2,
    "commercial": 2, "informaticien": 2, "développeur": 2, "developpeur": 2,
    # Niveau 1 — autres
    "agriculteur": 1, "artisan": 1, "ouvrier": 1, "commerçant": 1,
    "commercant": 1, "retraité": 1, "retraite": 1, "étudiant": 1, "etudiant": 1,
    "sans emploi": 1, "chomeur": 1, "employe": 1, "chauffeur": 1, "autre": 1,
}

# Régions de Tunisie encodées par niveau économique (1=autre, 2=moyen, 3=grand centre)
REGION_KEYWORDS = {
    3: ["tunis", "ariana", "ben arous", "manouba", "la marsa", "carthage", "ennasr"],
    2: ["sfax", "sousse", "monastir", "nabeul", "hammamet", "bizerte", "gabès", "gabes"],
    1: ["kairouan", "gafsa", "médenine", "medenine", "kasserine", "sidi bouzid",
        "siliana", "zaghouan", "beja", "béja", "jendouba", "tozeur", "kébili", "kebili"],
}


# ── Fonctions de calcul ────────────────────────────────────────────────────────

def calculate_age(date_naissance):
    if date_naissance is None or (isinstance(date_naissance, float) and np.isnan(date_naissance)):
        return 40
    if isinstance(date_naissance, str):
        try:
            date_naissance = pd.to_datetime(date_naissance)
        except Exception:
            return 40
    today = datetime.now()
    return today.year - date_naissance.year - (
        (today.month, today.day) < (date_naissance.month, date_naissance.day)
    )


def calculate_seniority(annee_inscription):
    if annee_inscription is None or (isinstance(annee_inscription, float) and np.isnan(annee_inscription)):
        return 0
    return CURRENT_YEAR - int(annee_inscription)


def encode_contract(type_contrat):
    if not type_contrat:
        return 1
    return CONTRACT_SCORE_MAP.get(str(type_contrat).upper().strip(), 1)


def encode_situation(situation_familiale):
    if not situation_familiale:
        return 1
    return SITUATION_SCORE_MAP.get(str(situation_familiale).upper().strip(), 1)


def encode_profession(profession):
    if not profession:
        return 1
    p = str(profession).lower().strip()
    for key, score in PROFESSION_SCORE_MAP.items():
        if key in p:
            return score
    return 1


def encode_region(adresse):
    if not adresse:
        return 1
    addr = str(adresse).lower()
    for score in [3, 2, 1]:
        for keyword in REGION_KEYWORDS[score]:
            if keyword in addr:
                return score
    return 1


def encode_sentiment(sentiment_str):
    if not sentiment_str:
        return 0.5
    s = str(sentiment_str).upper().strip()
    return {"POSITIF": 1.0, "NEUTRE": 0.5, "NEGATIF": 0.0}.get(s, 0.5)


# ── Vecteur principal ──────────────────────────────────────────────────────────

def build_client_feature_vector(client_row, kpi_history=None):
    """
    Construit le vecteur de 9 features depuis tous les champs Client + KPI.

    Features :
      1. kpi_score          — score satisfaction 0-100
      2. seniority_years    — ancienneté client
      3. prime_annuelle     — valeur financière
      4. contract_score     — type de contrat (1-4)
      5. age                — âge du client
      6. situation_score    — situation familiale (1-2)
      7. profession_score   — niveau professionnel (1-3)
      8. region_score       — localisation géographique (1-3)
      9. sentiment_score    — dernier sentiment KPI (0-1)
    """
    features = {
        "kpi_score":       float(client_row.get("kpi_score") or 50.0),
        "seniority_years": calculate_seniority(client_row.get("annee_inscription")),
        "prime_annuelle":  float(client_row.get("prime_annuelle") or 0.0),
        "contract_score":  encode_contract(client_row.get("type_contrat")),
        "age":             calculate_age(client_row.get("date_naissance")),
        "situation_score": encode_situation(client_row.get("situation_familiale")),
        "profession_score":encode_profession(client_row.get("profession")),
        "region_score":    encode_region(client_row.get("adresse")),
        "sentiment_score": encode_sentiment(client_row.get("sentiment")),
    }

    # kpi_trend si historique disponible
    if kpi_history is not None and not kpi_history.empty:
        features["kpi_trend"] = calculate_kpi_trend(kpi_history)
        features["questionnaires_count"] = len(kpi_history)
        last = kpi_history.sort_values("calculated_at").iloc[-1]
        features["last_sentiment_score"] = encode_sentiment(last.get("sentiment"))

    return features


def calculate_kpi_trend(kpi_history_df):
    if kpi_history_df.empty or len(kpi_history_df) < 2:
        return 0.0
    df = kpi_history_df.sort_values("calculated_at").reset_index(drop=True)
    x = np.arange(len(df))
    y = df["score"].values
    slope = np.polyfit(x, y, 1)[0]
    return float(slope)
