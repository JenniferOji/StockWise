import os
import pandas as pd
import pickle
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_features():
    response = supabase.table("stock_features").select("*").execute()
    print(f" Response data type: {type(response.data)}")
    print(f" Response data sample: {response.data[:2] if response.data else 'EMPTY'}")
    if response.data and len(response.data) > 0:
        print(f"DEBUG: First row keys: {list(response.data[0].keys()) if isinstance(response.data[0], dict) else 'NOT A DICT'}")
    df = pd.DataFrame(response.data)
    print(f" DataFrame columns before lowercase: {df.columns.tolist()}")
    df.columns = [str(c).lower() for c in df.columns]
    print(f" DataFrame columns after lowercase: {df.columns.tolist()}")
    print(f"DataFrame shape: {df.shape}")
    return df

def load_prices():
    response = supabase.table("stock_prices").select("*").execute()
    df = pd.DataFrame(response.data)
    df["date"] = pd.to_datetime(df["date"])
    df = df.pivot(index="date", columns="symbol", values="close")
    return df

def load_cluster_risk():
    response = supabase.table("stock_features").select("cluster_labels, risk_label").execute()
    df = pd.DataFrame(response.data)
    if len(df) == 0:
        return {}
    mapping = dict(zip(df["cluster_labels"].astype(int), df["risk_label"]))
    return mapping