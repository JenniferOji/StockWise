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

# List of stock tickers
tickers = [
    "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "NVDA", "TSLA", "BRK-B", "JPM",
    "V", "UNH", "JNJ", "WMT", "PG", "MA", "HD", "BAC", "PFE", "DIS", "ADBE", "CMCSA",
    "NFLX", "KO", "XOM", "MRK", "PEP", "INTC", "T", "ABBV", "COST", "CRM", "AVGO",
    "NKE", "MCD", "TMO", "TXN", "ORCL", "CSCO", "LLY", "QCOM", "C", "NEE", "PM",
    "BMY", "AMAT", "LOW", "SBUX", "RTX", "AXP", "INTU", "GILD", "MDT", "BLK", "HON",
    "UPS", "GS", "MS", "PLD", "ISRG", "LMT", "BKNG", "ZM", "SNY", "ADP", "DUK",
    "GE", "CVX", "SPGI", "NOW", "AMGN", "CAT", "SYK", "CB", "TGT", "DE",
    "PNC", "USB", "BDX", "ADSK", "MO", "ELV", "CL", "FIS", "TJX", "CI", "SCHW",
    "MDLZ", "MMC", "ETN", "VRTX", "AON", "ICE", "COF", "BSX", "NOC", "KMB",
    "AEP", "EOG", "HUM", "KMI", "CME", "CSX", "SHW", "MCO", "LRCX", "BIIB", "ZTS",
    "WM", "TFC", "EQIX", "APD", "SO", "ECL", "ROP", "DHR", "MU", "LULU", "ILMN", "EA",
    "PNR", "CLX", "KLAC", "MAR", "PAYX", "ADM", "OXY", "STZ", "AIG", "DLR", "SLB",
    "EXC", "BBY", "HCA", "EXPE", "NVR", "ALGN", "MSI", "VZ", "ESS", "PLTR", "SYF",
    "ORLY", "PGR", "AKAM", "KR", "F", "HPE", "EW", "HSY", "TFX", "NEM",
    "CPRT", "CTAS", "FTNT", "DG", "DOW", "APH", "ANET", "FTV", "RMD", "URI", "A",
    "PNW", "VFC", "GLW", "ABT", "AFL", "AEE", "PEG", "DLTR", "NCLH", "MKTX", "CPB",
    "NRG", "KHC", "AES", "CFG", "CNP", "MET", "ETR", "VRSK", "PPL",
    "ARE", "BB", "AMC", "GME", "NIO", "XPEV", "LI", "WKHS", "RIVN", "FUBO", "PLTR",
      "AFRM", "HOOD", "COIN", "DKNG", "CLOV", "PYPL", "ZM", "SNOW",
    "MDB", "CRWD", "NET", "ZS", "OKTA", "ROKU", "TWLO", "UBER", "LYFT", "DASH"
]

# Download stock histories from Yahoo Finance
stocks_histories = yf.download(tickers, period="5y", auto_adjust=True)['Close']
stocks_histories = stocks_histories.dropna(axis=1, how='all')
stocks_histories = stocks_histories.ffill().bfill()

print("Prices shape after cleanup:", stocks_histories.shape)

# Calculate daily returns
daily_returns = stocks_histories.pct_change(fill_method=None).dropna()

# Calculate annual means and annual variances
annual_means_returns = daily_returns.mean() * 252
annual_return_variances = daily_returns.var() * 252

df2 = pd.DataFrame({
    'Stock Symbols': annual_return_variances.index,
    'Variances': annual_return_variances.values,
    'Returns': annual_means_returns.values
})

# Apply log scaling to compress extreme values
df2['Log_Returns'] = np.log1p(df2['Returns'])
df2['Log_Variances'] = np.log1p(df2['Variances'])

# Dropping rows with NaN values before scaling to avoid errors
df2 = df2.dropna()
X = df2[['Log_Returns', 'Log_Variances']].values

# Scale the data
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

optimal_k = 3  # Based on the elbow method
kmeans = KMeans(n_clusters=optimal_k, n_init=50, random_state=42)
labels = kmeans.fit_predict(Xs)
df2['Cluster_labels'] = labels

# assign the risk leveles to each of the clusters 
cluster_risk = {}
for cluster_idx in range(optimal_k):
    cluster_data = df2[df2['Cluster_labels'] == cluster_idx]
    avg_return = cluster_data['Returns'].mean()
    avg_variance = cluster_data['Variances'].mean()
    
    
    if avg_return < 0:
        # Negative returns are at least Moderate Risk
        risk_level = 'Moderate Risk' if avg_variance < 0.30 else 'High Risk'
    else:
        if avg_variance < 0.20:
            risk_level = 'Low Risk'  
        elif avg_variance < 0.70:
            risk_level = 'Moderate Risk'  # Positive + moderate volatility
        else:
            risk_level = 'High Risk'  # Positive + high volatility
    
    cluster_risk[cluster_idx] = risk_level
    print(f"Cluster {cluster_idx}: Avg Return={avg_return:.4f}, Avg Variance={avg_variance:.4f} -> {risk_level}")

# save the cluster risk mapping for use in the api microservice 
with open('cluster_risk_mapping.pkl', 'wb') as f:
    pickle.dump(cluster_risk, f)
df2.to_csv('clustered_stocks.csv', index=False)

# exporting the model to ONNX 
#  Xs.shape[1]]
initial_type = [('float_input', FloatTensorType([None, 2]))]
onnx_model = convert_sklearn(kmeans, initial_types=initial_type)
with open("kmeans_stock_clustering.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
colors = cm.rainbow(np.linspace(0, 1, optimal_k))

# Plotting clusters
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