import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from matplotlib import cm
import skl2onnx
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import pickle

# List of stock tickers grouped by different sectors/ types to ensure diversification in the the dataset 
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
    "NKLA","LCID","RIVN","IONQ","AI", "FRM","BBBYQ","BYND","CLOV","CVNA","ENVX","FUBO",
    "GNS","HIMS","LCID","MULN","NVAX","OPEN","QS",
    "RBLX","SAVA","SEDG","UPST","WISH","ZIM"
]

tickers = list(set(
    sp500_large_cap +
    nasdaq_growth +
    defensive_stocks +
    speculative_stocks
))

# Download stock histories from Yahoo Finance
stocks_histories = yf.download(tickers, period="2y", auto_adjust=True)['Close']
stocks_histories = stocks_histories.dropna(axis=1, how='all')
stocks_histories = stocks_histories.ffill().bfill()

print("Prices shape after cleanup:", stocks_histories.shape)

# Calculate daily returns
daily_returns = stocks_histories.pct_change(fill_method=None).dropna()

# caculating max drawdown fro each stock 
max_drawdowns = {}
for ticker in daily_returns.columns:

    r = daily_returns[ticker].dropna()

    cumulative = (1 + r).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max

    max_drawdowns[ticker] = abs(drawdown.min())

# Calculate annual means and annual variances
annual_means_returns = daily_returns.mean() * 252
annual_return_variances = daily_returns.var() * 252

df2 = pd.DataFrame({
    'Stock Symbols': annual_return_variances.index,
    'Variances': annual_return_variances.values,
    'Returns': annual_means_returns.values,
    'Max_Drawdown': [max_drawdowns.get(t, np.nan) for t in annual_return_variances.index]
})

# log scaling to compress extreme values
df2['Log_Returns'] = np.log1p(np.clip(df2['Returns'], -0.999, None))

# clipping extreme variances so outliers do not dominate clustering
df2['Log_Variances'] = np.log1p(np.clip(df2['Variances'], 0, 2))

# adding features to capture risk adjusted returns 
df2['Volatility'] = np.sqrt(df2['Variances'])
df2['Sharpe'] = df2['Returns'] / df2['Volatility']

# Dropping rows with NaN values before scaling to avoid errors
df2 = df2.dropna()

# features for clustering
# X = df2[['Log_Returns', 'Log_Variances', 'Sharpe']].values
X = df2[['Log_Returns', 'Log_Variances', 'Volatility', 'Max_Drawdown']].values
# Scale the data
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# number of clusters determined by elbow method 
optimal_k = 5  
kmeans = KMeans(n_clusters=optimal_k, n_init=50, random_state=42)

labels = kmeans.fit_predict(Xs)
df2['Cluster_labels'] = labels


# assign the risk levels to each of the clusters
cluster_volatility = {}

# computing the volatility for each cluster
for cluster_idx in range(optimal_k):

    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]

    avg_variance = cluster_data['Variances'].mean()
    volatility = np.sqrt(avg_variance)

    cluster_volatility[cluster_idx] = volatility


# sorting the clusters by volatility
sorted_clusters = sorted(cluster_volatility.items(), key=lambda x: x[1])


# assigning risk labels based on ranking
cluster_risk = {}

risk_labels = [
    "Very Low Risk",
    "Low Risk",
    "Moderate Risk",
    "High Risk",
    "Very High Risk"
]

for i, (cluster_idx, _) in enumerate(sorted_clusters):
    cluster_risk[cluster_idx] = risk_labels[i]


# printing the cluster information for visualisation of groups
for cluster_idx in range(optimal_k):

    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]

    avg_return = cluster_data['Returns'].mean()
    avg_variance = cluster_data['Variances'].mean()
    volatility = np.sqrt(avg_variance)

    risk_level = cluster_risk[cluster_idx]

    print(
        f"Cluster {cluster_idx}: Avg Return={avg_return:.4f}, "
        f"Volatility={volatility:.4f} - {risk_level}"
    )

# save the cluster risk mapping to use in the api microservice 
with open('cluster_risk_mapping.pkl', 'wb') as f:
    pickle.dump(cluster_risk, f)

df2.to_csv('clustered_stocks.csv', index=False)

with open("stock_scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

# https://onnx.ai/sklearn-onnx/introduction.html
initial_type = [('float_input', FloatTensorType([None, 4]))]
onnx_model = convert_sklearn(kmeans, initial_types=initial_type)

with open("kmeans_stock_clustering.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

# Plotting the clusters
colors = cm.rainbow(np.linspace(0, 1, optimal_k))

plt.figure(figsize=(10, 8))

for cluster_idx in range(optimal_k):
    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]

    plt.scatter(
        cluster_data['Log_Returns'],
        cluster_data['Log_Variances'],
        color=colors[cluster_idx],
        label=f"Cluster {cluster_idx} ({len(cluster_data)} stocks)"
    )

plt.title("KMeans Clustering of Stocks")
plt.xlabel("Log Annual Returns (Compressed)")
plt.ylabel("Log Annual Variances (Compressed)")
plt.legend(loc="best")
plt.grid(True)
plt.show()

# Displays stocks associated with each cluster
for cluster_idx in range(optimal_k):
    cluster_group = df2[df2['Cluster_labels'] == cluster_idx]

    print(f"Cluster {cluster_idx} ({len(cluster_group)} stocks):")
    print(cluster_group['Stock Symbols'].tolist())
    print()