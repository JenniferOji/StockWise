import numpy as np
import pandas as pd  # numpy wrapper
import seaborn as sns
import matplotlib.pyplot as plt
import yfinance as yf
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# all the stocks that make up the snp500 index would be listed in tickers (full tickers are commented).

# stocks that i download from yfinance
tickers = [
    "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "NVDA", "TSLA", "BRK-B", "JPM",
    "V", "UNH", "JNJ", "WMT", "PG", "MA", "HD", "BAC", "PFE", "DIS", "ADBE", "CMCSA",
    "NFLX", "KO", "XOM", "MRK", "PEP", "INTC", "T", "ABBV", "COST", "CRM", "AVGO",
    "NKE", "MCD", "TMO", "TXN", "ORCL", "CSCO", "LLY", "QCOM", "C", "NEE", "PM",
    "BMY", "AMAT", "LOW", "SBUX", "RTX", "AXP", "INTU", "GILD", "MDT", "BLK", "HON",
    "UPS", "GS", "MS", "PLD", "ISRG", "LMT", "BKNG", "ZM", "SNY", "SQ", "ADP", "DUK",
    "GE", "CVX", "SPGI", "NOW", "ANTM", "AMGN", "CAT", "SYK", "CB", "TGT", "DE",
    "PNC", "USB", "BDX", "ADSK", "MO", "ELV", "CL", "FIS", "TJX", "CI", "SCHW",
    "MDLZ", "MMC", "ETN", "VRTX", "AON", "ICE", "COF", "BSX", "NOC", "KMB", "ATVI",
    "AEP", "EOG", "HUM", "KMI", "CME", "CSX", "SHW", "MCO", "LRCX", "BIIB", "ZTS",
    "WM", "TFC", "EQIX", "APD", "SO", "ECL", "ROP", "DHR", "MU", "LULU", "ILMN", "EA",
    "PNR", "CLX", "KLAC", "MAR", "PAYX", "ADM", "OXY", "STZ", "AIG", "DLR", "SLB",
    "EXC", "BBY", "HCA", "EXPE", "NVR", "ALGN", "MSI", "VZ", "ESS", "PLTR", "SYF",
    "ORLY", "PGR", "AKAM", "KR", "F", "HPE", "EW", "WBA", "HSY", "TFX", "NEM",
    "CPRT", "CTAS", "FTNT", "DG", "DOW", "APH", "ANET", "FTV", "RMD", "URI", "A",
    "PNW", "VFC", "GLW", "ABT", "AFL", "AEE", "PEG", "DLTR", "NCLH", "MKTX", "CPB",
    "NRG", "PXD", "KHC", "NLOK", "AES", "CFG", "CNP", "MET", "ETR", "VRSK", "PPL",
    "ARE",
]

# bulk downloading stocks histories
stocks_histories = yf.download(tickers, period="5y", auto_adjust=True)['Close']  # reflect total return adjusted prices
stocks_histories = stocks_histories.dropna(axis=1, how='all')
stocks_histories = stocks_histories.fillna(method='ffill').fillna(method='bfill')

print("prices shape after cleanup:", stocks_histories.shape)

# calculate the daily returns for each stock
daily_returns = stocks_histories.pct_change(fill_method=None).dropna()

# calculate the annual means
annual_means_returns = daily_returns.mean() * 252  # 252 trading days in a year

# calculate annual returns variance
annual_returs_variance = daily_returns.var() * 252

tickers = annual_returs_variance.index.tolist()
df2 = pd.DataFrame({
    'Stock Symbols': tickers,
    'Variances': annual_returs_variance.reindex(tickers).values,
    'Returns': annual_means_returns.reindex(tickers).values
})

# getting and storing the annual returns and annual variances
X = df2[['Returns', 'Variances']].values

scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# using the elbow method to find the optimal number of clusters
inertia = []
for k in range(2, 16):
    kmeans = KMeans(n_clusters=k, n_init=50, random_state=42)
    kmeans.fit(Xs)
    inertia.append(kmeans.inertia_)

plt.plot(range(2, 16), inertia)
plt.title('Elbow Method For Optimal k')
plt.xlabel('Number of clusters k')
plt.ylabel('Inertia of Sum Squared Distances')
plt.show()

# get and show the cluster groups for each stock
kmeans = KMeans(n_clusters=5).fit(Xs)
labels = kmeans.labels_
df2['Cluster_labels'] = labels

plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='rainbow')
plt.title('KMeans Clustering of Stocks')
plt.xlabel('Standardised Annual Returns')  # assets average performance over a year
plt.ylabel('Standardised Annual Variances')  # measures risk / volatility - risk / return trade-off
plt.show()

for cluster, group in df2.groupby('Cluster_labels'):
    print(f"Cluster {cluster} ({len(group)} stocks):")
    print(group['Stock Symbols'].tolist())
    print()