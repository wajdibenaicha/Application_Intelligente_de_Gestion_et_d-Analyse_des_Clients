"""
Connexion MySQL — lecture seule pour les scripts d'entraînement.
"""
import pandas as pd
from sqlalchemy import create_engine, text
from config import DB_URL


def get_engine():
    return create_engine(DB_URL, pool_pre_ping=True)


def fetch_clients_with_kpi():
    """
    Récupère tous les clients avec leur dernier KPI calculé.
    Inclut tous les champs nécessaires aux 9 features.
    """
    query = """
        SELECT
            c.id            AS client_id,
            c.full_name,
            c.date_naissance,
            c.annee_inscription,
            c.prime_annuelle,
            c.type_contrat,
            c.situation_familiale,
            c.profession,
            c.adresse,
            k.score         AS kpi_score,
            k.sentiment,
            k.calculated_at
        FROM clients c
        LEFT JOIN (
            SELECT client_id, score, sentiment, calculated_at,
                   ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY calculated_at DESC) AS rn
            FROM client_kpi
        ) k ON c.id = k.client_id AND k.rn = 1
    """
    return pd.read_sql(text(query), get_engine())


def fetch_kpi_history(client_id=None):
    base = "SELECT client_id, score, sentiment, calculated_at FROM client_kpi"
    if client_id is not None:
        base += " WHERE client_id = :client_id"
        return pd.read_sql(text(base), get_engine(), params={"client_id": client_id})
    base += " ORDER BY client_id, calculated_at"
    return pd.read_sql(text(base), get_engine())


def fetch_offres():
    return pd.read_sql(text("SELECT * FROM offre WHERE active = TRUE"), get_engine())
