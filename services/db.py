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

# loading the features and prices from supabase
def load_features():
    response = supabase.table("stock_features").select("*").execute()
    df = pd.DataFrame(response.data or [])

    if df.empty:
        return df

    new_columns = []

    for col in df.columns:
        new_columns.append(str(col).lower())

    df.columns = new_columns

    return df

# loading the historical price data from supabase
def load_prices():
    all_data = []
    start = 0
    batch_size = 1000

    # fetching the price data in batches 
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

    # adjusting the price data to have dates as the index and symbols as the columns
    df["date"] = pd.to_datetime(df["date"])
    df = df.pivot(index="date", columns="symbol", values="close")

    return df

# loading the cluster risk mapping from supabase
def load_cluster_risk():
    response = supabase.table("stock_features").select("cluster_labels, risk_label").execute()
    df = pd.DataFrame(response.data or [])

    if df.empty:
        return {}
    
    # creating the mapping from cluster labels to risk categories
    mapping = {}
    for i in range(len(df)):
        key = int(df["cluster_labels"][i])
        value = df["risk_label"][i]
        mapping[key] = value
        
    return mapping