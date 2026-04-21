import yfinance as yf
import pandas as pd
import requests
from io import StringIO
import json

url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"

headers = {
    "User-Agent": "Mozilla/5.0"
}

# fetching sp500 company list from wikipedia
response = requests.get(url, headers=headers)
html = StringIO(response.text)
tables = pd.read_html(html)
sp500 = tables[0]

symbols = sp500["Symbol"].tolist()

data = []
stock_map = {}
existing_symbols = set()

# fetching stock metadata for sp500 companies
for symbol in symbols[:200]:  
    try:
        symbol = symbol.replace(".", "-")

        ticker = yf.Ticker(symbol)
        info = ticker.info

        name = info.get("longName", "") or info.get("shortName", "")
        sector = info.get("sector", "Unknown")

        data.append({
            "symbol": symbol,
            "companyName": name,
            "shares": 0,
            "purchasePrice": 0,
            "sector": sector,
            "imageUrl": f"https://financialmodelingprep.com/image-stock/{symbol}.png"
        })

        stock_map[symbol] = {
            "name": name,
            "sector": sector
        }

        existing_symbols.add(symbol)

    except Exception:
        continue

# fetching additional stocks from nasdaq 100
response = requests.get(nasdaq_url, headers=headers)
html = StringIO(response.text)
tables = pd.read_html(html)
nasdaq = tables[4]

nasdaq_symbols = nasdaq["Ticker"].tolist()
added = 0

# adding additional unique stocks to diversify dataset
for symbol in nasdaq_symbols:
    if added >= 50:
        break

    try:
        symbol = symbol.replace(".", "-")

        if symbol in existing_symbols:
            continue

        ticker = yf.Ticker(symbol)
        info = ticker.info

        name = info.get("longName", "") or info.get("shortName", "")
        sector = info.get("sector", "Unknown")

        data.append({
            "symbol": symbol,
            "companyName": name,
            "shares": 0,
            "purchasePrice": 0,
            "sector": sector,
            "imageUrl": f"https://financialmodelingprep.com/image-stock/{symbol}.png"
        })

        stock_map[symbol] = {
            "name": name,
            "sector": sector
        }

        existing_symbols.add(symbol)
        added += 1

    except Exception:
        continue

# saving stock data for frontend and backend usage
df = pd.DataFrame(data)

df.to_json("stocks.json", orient="records", indent=2)

with open("stock_data.json", "w") as f:
    json.dump(stock_map, f, indent=2)