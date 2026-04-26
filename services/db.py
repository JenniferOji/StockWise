import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_features():
    response = supabase.table("stock_features").select("*").execute()
    df = pd.DataFrame(response.data or [])

    if df.empty:
        return df

    df.columns = [str(c).lower() for c in df.columns]
    return df


def load_prices():
    all_data = []
    start = 0
    batch_size = 1000

    while True:
        response = (
            supabase
            .table("stock_prices")
            .select("*")
            .range(start, start + batch_size - 1)
            .execute()
        )

        if not response.data:
            break

        all_data.extend(response.data)

        if len(response.data) < batch_size:
            break

        start += batch_size

    df = pd.DataFrame(all_data)

    if df.empty:
        return df

    df["date"] = pd.to_datetime(df["date"])
    df = df.pivot(index="date", columns="symbol", values="close")

    return df


def load_cluster_risk():
    response = supabase.table("stock_features").select("cluster_labels, risk_label").execute()
    df = pd.DataFrame(response.data or [])

    if df.empty:
        return {}

    mapping = dict(zip(df["cluster_labels"].astype(int), df["risk_label"]))
    return mapping