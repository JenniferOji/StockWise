import os
import pandas as pd
import pickle
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_features():
    response = supabase.table("stock_features").select("*").execute()
    df = pd.DataFrame(response.data)
    df.columns = [str(c).lower() for c in df.columns] 
    return df

def load_prices():
    response = supabase.table("stock_prices").select("*").execute()
    df = pd.DataFrame(response.data)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df = df.pivot(index="date", columns="symbol", values="close")
    return df

def load_cluster_risk():
    response = supabase.table("stock_features").select("cluster_labels, risk_label").execute()
    df = pd.DataFrame(response.data)
    if df.empty:
        return {}
    mapping = dict(zip(df["cluster_labels"].astype(int), df["risk_label"]))
    return mapping