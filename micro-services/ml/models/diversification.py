import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
import pickle
import warnings
import os
warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

sp500_large_cap = [
    "AAPL","MSFT","AMZN","GOOGL","GOOG","META","NVDA","TSLA","BRK-B","JPM",
    "V","UNH","JNJ","WMT","PG","MA","HD","BAC","PFE","DIS",
    "ADBE","CMCSA","NFLX","KO","XOM","MRK","PEP","INTC","ABBV","COST",
    "CRM","AVGO","NKE","MCD","TMO","TXN","ORCL","CSCO","LLY","QCOM",
    "C","NEE","PM","BMY","AMAT","LOW","SBUX","RTX","INTU","GILD"
]

nasdaq_growth = [
    "NVDA","TSLA","AMD","ADBE","CRM","ORCL","INTC","QCOM","TXN","AVGO",
    "AMZN","GOOGL","META","NFLX","SHOP","PYPL","SNOW","MDB","CRWD",
    "NET","ZS","OKTA","ROKU","TWLO","UBER","LYFT","DASH","PLTR","COIN"
]

defensive_stocks = [
    "KO","PEP","PG","WMT","COST",
    "CL","KMB","MDLZ","HSY","KHC",
    "DUK","SO","NEE","AEP","ED",
    "EXC","XEL","D","WEC","SRE"
]

speculative_stocks = [
    "GME","AMC","CVNA","UPST","SOFI",
    "MARA","RIOT","BITF","HUT","BTBT",
    "SPCE","RKLB","ASTS","ACHR","JOBY",
    "LCID","RIVN","IONQ","AI",
    "BYND","CLOV","ENVX","FUBO",
    "GNS","HIMS","NVAX","OPEN","QS",
    "RBLX","SAVA","SEDG","ZIM",
    "HOOD","DKNG","SKLZ"
]

tickers = list(set(
    sp500_large_cap +
    nasdaq_growth +
    defensive_stocks +
    speculative_stocks
))

# download 2 years of price data for all tickers
stocks_histories = yf.download(tickers, period="1y", auto_adjust=True)['Close']
stocks_histories = stocks_histories.dropna(axis=1, how='all')
stocks_histories = stocks_histories.ffill().bfill()

print("Prices shape after cleanup:", stocks_histories.shape)

daily_returns = stocks_histories.pct_change(fill_method=None).dropna()

# annualised returns and variance
annual_means_returns = daily_returns.mean() * 252
annual_return_variances = daily_returns.var() * 252

# value at risk - worst 5% of daily returns for each stock
var_95 = {}
for ticker in daily_returns.columns:
    r = daily_returns[ticker].dropna()
    var_95[ticker] = abs(np.percentile(r, 5))

df2 = pd.DataFrame({
    'Symbols': annual_return_variances.index,
    'Variances': annual_return_variances.values,
    'Returns': annual_means_returns.values,
    'VaR_95': [var_95.get(t, np.nan) for t in annual_return_variances.index],
})

# log transform variance to reduce skew from outliers like meme stocks
df2['Log_Variances'] = np.log1p(np.clip(df2['Variances'], 0, 2))
df2['Volatility'] = np.sqrt(df2['Variances'])

df2 = df2.dropna()

# these 3 features were selected after testing all combinations - best BIC and silhouette
features = ['Log_Variances', 'Volatility', 'VaR_95']

X = df2[features].values

scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# trying different covariance types and component counts to find the best gmm
print("\nGMM Model Selection (BIC):")
print(f"{'Components':<15} {'Covariance Type':<20} {'BIC':<15} {'Silhouette'}")
print("-" * 65)

best_bic = np.inf
best_gmm = None
best_labels = None

covariance_types = ['full', 'tied', 'diag', 'spherical']

for cov_type in covariance_types:
    for n in range(3, 8):
        try:
            gmm = GaussianMixture(
                n_components=n,
                covariance_type=cov_type,
                n_init=10,
                random_state=42,
                max_iter=500
            )
            gmm.fit(Xs)
            labels = gmm.predict(Xs)

            # skip if any cluster is too small to be meaningful
            unique, counts = np.unique(labels, return_counts=True)
            if len(unique) < n or any(counts < 3):
                print(f"{n:<15} {cov_type:<20} {'skipped - small cluster':<15}")
                continue

            bic = gmm.bic(Xs)
            sil = silhouette_score(Xs, labels)
            print(f"{n:<15} {cov_type:<20} {bic:<15.2f} {sil:.4f}")

            if bic < best_bic:
                best_bic = bic
                best_gmm = gmm
                best_labels = labels

        except Exception as e:
            print(f"{n:<15} {cov_type:<20} failed: {e}")
            continue

# fallback in case nothing valid was found
if best_gmm is None:
    print("\nWARNING: No valid GMM found. Falling back to full covariance, 5 components.")
    best_gmm = GaussianMixture(
        n_components=5,
        covariance_type='full',
        n_init=10,
        random_state=42,
        max_iter=500
    )
    best_gmm.fit(Xs)
    best_labels = best_gmm.predict(Xs)
else:
    print(f"\nBest GMM: {best_gmm.n_components} components, "
          f"covariance={best_gmm.covariance_type}, BIC={best_bic:.2f}")


df2['Cluster_labels'] = best_labels
n_components = best_gmm.n_components

# rank clusters by risk using volatility and var - higher = more risky
cluster_risk_scores = {}

for cluster_idx in range(n_components):
    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]
    if len(cluster_data) == 0:
        cluster_risk_scores[cluster_idx] = 0
        continue

    composite = (
        0.60 * cluster_data['Volatility'].mean() +
        0.40 * cluster_data['VaR_95'].mean()
    )
    cluster_risk_scores[cluster_idx] = composite

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

# print a summary of each cluster
print("\nCluster Summary:")
print(f"{'Cluster':<10} {'Risk Level':<20} {'Avg Return':<15} {'Avg Volatility':<18} {'Avg VaR_95':<15} {'Stock Count'}")
print("-" * 85)

for cluster_idx in range(n_components):
    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]
    risk_level = cluster_risk.get(cluster_idx, "Unknown")
    print(
        f"{cluster_idx:<10} {risk_level:<20} "
        f"{cluster_data['Returns'].mean():<15.4f} "
        f"{cluster_data['Volatility'].mean():<18.4f} "
        f"{cluster_data['VaR_95'].mean():<15.4f} "
        f"{len(cluster_data)}"
    )

final_sil = silhouette_score(Xs, best_labels)
db_score = davies_bouldin_score(Xs, best_labels)
ch_score = calinski_harabasz_score(Xs, best_labels)

print(f"\nFinal Silhouette Score: {final_sil:.4f}  (higher is better, max 1.0)")
print(f"Davies-Bouldin Score:   {db_score:.4f}  (lower is better, min 0.0)")
print(f"Calinski-Harabasz Score:{ch_score:.4f}  (higher is better)")
print(f"BIC: {best_gmm.bic(Xs):.4f}")

print("\nStocks per Cluster:")
for cluster_idx in range(n_components):
    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]
    risk_level = cluster_risk.get(cluster_idx, "Unknown")
    print(f"\n{risk_level}: {cluster_data['Symbols'].tolist()}")

# saving everything
df2.to_csv(os.path.join(DATA_DIR, "features.csv"), index=False)
print(f"\nfeatures.csv saved to {DATA_DIR}")

with open(os.path.join(MODELS_DIR, "cluster_risk_mapping.pkl"), "wb") as f:
    pickle.dump(cluster_risk, f)

with open(os.path.join(MODELS_DIR, "feature_columns.pkl"), "wb") as f:
    pickle.dump(features, f)

with open(os.path.join(MODELS_DIR, "gmm_model.pkl"), "wb") as f:
    pickle.dump(best_gmm, f)

with open(os.path.join(MODELS_DIR, "stock_scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

print(f"Models saved to {MODELS_DIR}")
print("\nModel training complete.")