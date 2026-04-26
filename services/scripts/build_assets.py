from supabase import create_client
from dotenv import load_dotenv
import numpy as np
import pandas as pd
import yfinance as yf
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.mixture import GaussianMixture
import json
import os

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# loading stock data and preparing symbol list
with open(os.path.join(BASE_DIR, "data", "stocks.json"), "r") as f:
    STOCK_DATA = json.load(f)

RISK_FREE_RATE = 0.02

# converting symbols to yahoo finance format
symbols = [stock["symbol"].replace(".", "-") for stock in STOCK_DATA]

print("Total symbols requested:", len(symbols))

all_prices = []
batch_size = 50

for i in range(0, len(symbols), batch_size):
    batch = symbols[i:i + batch_size]
    print(f"Downloading batch {i} to {i + len(batch)}")

    try:
        data = yf.download(batch, period="1y", auto_adjust=True)["Close"]

        if isinstance(data, pd.Series):
            data = data.to_frame()

        all_prices.append(data)

    except Exception as e:
        print("Batch failed:", batch, e)

# combine all batches
prices = pd.concat(all_prices, axis=1)

# remove duplicate columns if any
prices = prices.loc[:, ~prices.columns.duplicated()]

print("Total symbols downloaded:", len(prices.columns))

prices = prices.dropna(axis=1, how="all")
prices.ffill(inplace=True)
prices.bfill(inplace=True)

latest_prices = prices.iloc[-1]

returns = prices.pct_change().dropna()

# calculating annualised returns and variance
annual_returns = returns.mean() * 252
variances = returns.var() * 252

# calculating value at risk for downside risk
var_95 = {}
for t in returns.columns:
    r = returns[t].dropna()
    var_95[t] = abs(np.percentile(r, 5)) * np.sqrt(252)

# calculating maximum drawdown for each stock
max_drawdowns = {}
for t in returns.columns:
    r = returns[t]
    cumulative = (1 + r).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    max_drawdowns[t] = abs(drawdown.min())

# computing volatility and sharpe ratio
volatility = np.sqrt(variances)
sharpe_ratios = np.where(
    volatility == 0,
    0,
    (annual_returns - RISK_FREE_RATE) / volatility
)

# building feature dataset used for clustering
df = pd.DataFrame({
    "symbol": variances.index,
    "returns": annual_returns.values,
    "variance": variances.values,
    "var_95": [var_95.get(t, np.nan) for t in variances.index],
    "max_drawdown": [max_drawdowns.get(t, np.nan) for t in variances.index],
    "sharpe": sharpe_ratios,
    "close": [latest_prices.get(t, np.nan) for t in variances.index]
})

# transforming features to reduce skew and create clustering inputs
df["log_variances"] = np.log1p(np.clip(df["variance"], 0, 2))
df["volatility"] = np.sqrt(df["variance"])
df.dropna(inplace=True)

# selecting features used for clustering
features = ["log_variances", "volatility", "var_95"]
X = df[features].values

# scaling features
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# fitting gaussian mixture model
gmm = GaussianMixture(
    n_components=6,
    covariance_type="full",
    n_init=10,
    random_state=42,
    max_iter=500
)
gmm.fit(Xs)
labels = gmm.predict(Xs)

df["cluster_labels"] = labels

# ranking clusters by risk
cluster_risk_scores = {}
for cluster_idx in range(6):
    cluster_data = df[df["cluster_labels"] == cluster_idx]
    if len(cluster_data) == 0:
        cluster_risk_scores[cluster_idx] = 0
        continue
    cluster_risk_scores[cluster_idx] = (
        0.60 * cluster_data["volatility"].mean() +
        0.40 * cluster_data["var_95"].mean()
    )

# assigning human readable risk labels
sorted_clusters = sorted(cluster_risk_scores.items(), key=lambda x: x[1])

risk_labels = [
    "Very Low Risk",
    "Low Risk",
    "Moderate Risk",
    "High Risk",
    "Very High Risk",
    "Extreme Risk"
]

cluster_risk = {}
for i, (cluster_idx, _) in enumerate(sorted_clusters):
    cluster_risk[cluster_idx] = risk_labels[i]

# saving processed data
df["risk_label"] = df["cluster_labels"].map(cluster_risk)

records = df[[
    "symbol", "returns", "variance", "var_95",
    "max_drawdown", "sharpe", "close", "log_variances",
    "volatility", "cluster_labels", "risk_label"
]].to_dict(orient="records")

supabase.table("stock_features").upsert(records).execute()

# save prices to supabase
prices_df = prices.reset_index().melt(
    id_vars="Date",
    var_name="symbol",
    value_name="close"
)

prices_df.columns = ["date", "symbol", "close"]
prices_df["date"] = prices_df["date"].astype(str)

prices_records = prices_df.dropna().to_dict(orient="records")

BATCH_SIZE = 500
table = supabase.table("stock_prices")

for i in range(0, len(prices_records), BATCH_SIZE):
    batch = prices_records[i:i + BATCH_SIZE]
    print(f"Uploading batch {i} to {i + len(batch)}")

    table.upsert(
        batch,
        on_conflict="symbol,date"
    ).execute()

print("Data successfully saved to supabase")