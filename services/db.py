import os
import pandas as pd
import pickle
from supabase import create_client
from dotenv import load_dotenv
import requests

# Load env vars (do NOT override Render vars)
load_dotenv(override=False)

# Get env vars safely
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY exists:", bool(SUPABASE_KEY))

# Validate early
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY")

# Test raw connectivity
try:
    r = requests.get(SUPABASE_URL)
    print("Supabase URL status:", r.status_code)
except Exception as e:
    print("Supabase connection test failed:", e)

# Create client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_features():
    try:
        response = supabase.table("stock_features").select("*").execute()
        print("Response data type:", type(response.data))
        print("Response data sample:", response.data[:2] if response.data else "EMPTY")

        df = pd.DataFrame(response.data)

        if df.empty:
            print("stock_features is EMPTY")
            return df

        print("Columns before lowercase:", df.columns.tolist())

        df.columns = [str(c).lower() for c in df.columns]

        print("Columns after lowercase:", df.columns.tolist())
        print("DataFrame shape:", df.shape)

        return df

    except Exception as e:
        print("Error in load_features:", e)
        raise


def load_prices():
    try:
        response = supabase.table("stock_prices").select("*").execute()
        df = pd.DataFrame(response.data)

        if df.empty:
            print("stock_prices is EMPTY")
            return df

        df["date"] = pd.to_datetime(df["date"])
        df = df.pivot(index="date", columns="symbol", values="close")

        print("Prices shape:", df.shape)
        return df

    except Exception as e:
        print("Error in load_prices:", e)
        raise


def load_cluster_risk():
    try:
        response = supabase.table("stock_features").select("cluster_labels, risk_label").execute()
        df = pd.DataFrame(response.data)

        if df.empty:
            print("cluster_risk mapping EMPTY")
            return {}

        mapping = dict(zip(df["cluster_labels"].astype(int), df["risk_label"]))
        print("Cluster risk mapping size:", len(mapping))

        return mapping

    except Exception as e:
        print("Error in load_cluster_risk:", e)
        raise