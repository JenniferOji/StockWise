import numpy as np
import pandas as pd
import yfinance as yf
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.mixture import GaussianMixture
import json
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# load the stock data from the json file to get the tickers
with open(os.path.join(BASE_DIR, "data", "stocks.json"), "r") as f:
    STOCK_DATA = json.load(f)

RISK_FREE_RATE = 0.02

# symbols = list(STOCK_DATA.keys())
# yahoo finance uses - instead of . for symbols 
symbols = [stock["symbol"].replace(".", "-") for stock in STOCK_DATA]

# download 1 year of price data for all symbols
prices = yf.download(symbols, period="1y", auto_adjust=True)["Close"]
prices = prices.dropna(axis=1, how="all")
prices.ffill(inplace=True)
prices.bfill(inplace=True)
latest_prices = prices.iloc[-1]

returns = prices.pct_change().dropna()

# annualised returns and variance
annual_returns = returns.mean() * 252
variances = returns.var() * 252


# value at risk: looking at the worst 5% of daily returns for each stock
var_95 = {}
for t in returns.columns:
    r = returns[t].dropna()
    var_95[t] = abs(np.percentile(r, 5))

# max drawdown: how far did the stock drop from its peak at its worst point
max_drawdowns = {}
for t in returns.columns:
    r = returns[t]
    cumulative = (1 + r).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    max_drawdowns[t] = abs(drawdown.min())

volatility = np.sqrt(variances)
sharpe_ratios = np.where(
    # assignign sharpe ratio of 0 to avoid stocks with 0 volatility 
    volatility == 0,
    0,
    (annual_returns - RISK_FREE_RATE) / volatility
)

df = pd.DataFrame({
    "symbol": variances.index,
    "returns": annual_returns.values,
    "variance": variances.values,
    "var_95": [var_95.get(t, np.nan) for t in variances.index],
    "max_drawdown": [max_drawdowns.get(t, np.nan) for t in variances.index],
    "sharpe": sharpe_ratios,
    "close": [latest_prices.get(t, np.nan) for t in variances.index]
})


# log transform variance to reduce the skew caused by extreme outliers like meme stocks
df["log_variances"] = np.log1p(np.clip(df["variance"], 0, 2))
df["volatility"] = np.sqrt(df["variance"])


df.dropna(inplace=True)

# these 3 features were chosen after testing all possible combinations - these gave best BIC and silhouette
features = ["log_variances", "volatility", "var_95"]

X = df[features].values

scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# fitting the gmm model with 6 components 
gmm = GaussianMixture(n_components=6, covariance_type="full", n_init=10, random_state=42, max_iter=500)
gmm.fit(Xs)
labels = gmm.predict(Xs)

df["cluster_labels"] = labels

# ranking each cluster by risk the higher volatility and var means higher risk
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

# sorting the clusters from the lowest to highest risk score and assign risk labels
sorted_clusters = sorted(cluster_risk_scores.items(), key=lambda x: x[1])

risk_labels = ["Very Low Risk",
                "Low Risk", 
                "Moderate Risk", 
                "High Risk", 
                "Very High Risk", 
                "Extreme Risk"]

cluster_risk = {}
for i, (cluster_idx, _) in enumerate(sorted_clusters):
    cluster_risk[cluster_idx] = risk_labels[i]

# saving the files for API to use
prices.to_csv(os.path.join(BASE_DIR, "data", "prices.csv"))
df.to_csv(os.path.join(BASE_DIR, "data", "features.csv"), index=False)

with open(os.path.join(BASE_DIR, "models", "stock_scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

with open(os.path.join(BASE_DIR, "models", "gmm_model.pkl"), "wb") as f:
    pickle.dump(gmm, f)

with open(os.path.join(BASE_DIR, "models", "cluster_risk_mapping.pkl"), "wb") as f:
    pickle.dump(cluster_risk, f)

with open(os.path.join(BASE_DIR, "models", "feature_columns.pkl"), "wb") as f:
    pickle.dump(features, f)

print("Assets built")