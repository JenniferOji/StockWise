import numpy as np
import pandas as pd
import yfinance as yf
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE_DIR, "stock_data.json"), "r") as f:
    STOCK_DATA = json.load(f)

tickers = list(STOCK_DATA.keys())

prices = yf.download(tickers, period="1y", auto_adjust=True)["Close"]
prices = prices.dropna(axis=1, how="all")
prices.ffill(inplace=True)
prices.bfill(inplace=True)

returns = prices.pct_change().dropna()

# features 
max_drawdowns = {}
for t in returns.columns:
    r = returns[t]
    cumulative = (1 + r).cumprod()
    drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
    max_drawdowns[t] = abs(drawdown.min())

annual_returns = returns.mean() * 252
variances = returns.var() * 252

df = pd.DataFrame({
    "ticker": variances.index,
    "returns": annual_returns.values,
    "variance": variances.values,
    "max_drawdown": [max_drawdowns[t] for t in variances.index]
})

df["log_return"] = np.log1p(df["returns"])
df["log_variance"] = np.log1p(df["variance"])
df["volatility"] = np.sqrt(df["variance"])

df.dropna(inplace=True)

# model
X = df[["log_return","log_variance","volatility","max_drawdown"]].values

scaler = StandardScaler()
Xs = scaler.fit_transform(X)

kmeans = KMeans(n_clusters=5, random_state=42, n_init=50)
labels = kmeans.fit_predict(Xs)

df["cluster"] = labels

# saving
df.to_csv(os.path.join(BASE_DIR, "data", "features.csv"), index=False)

with open(os.path.join(BASE_DIR, "models", "scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

with open(os.path.join(BASE_DIR, "models", "kmeans.pkl"), "wb") as f:
    pickle.dump(kmeans, f)
    
print("Assets built")