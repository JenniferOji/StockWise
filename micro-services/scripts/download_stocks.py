import yfinance as yf
import pandas as pd
import requests
from io import StringIO

url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"

headers = {
    "User-Agent": "Mozilla/5.0"
}

response = requests.get(url, headers=headers)

# reading the first table from the wikipedia page which contains the list of S&P 500 companies
html = StringIO(response.text)

tables = pd.read_html(html)

sp500 = tables[0]

symbols = sp500["Symbol"].tolist()

data = []

for symbol in symbols[:200]:  
    try:
        symbol = symbol.replace(".", "-")

        ticker = yf.Ticker(symbol)
        info = ticker.info

        data.append({
            "symbol": symbol,
            "companyName": info.get("longName", ""),
            "shares": 0,
            "purchasePrice": 0,
            "sector": info.get("sector", "Unknown"),
            "imageUrl": f"https://financialmodelingprep.com/image-stock/{symbol}.png"
        })

        print(f"Fetched {symbol}")

    except Exception as e:
        print(f"Error with {symbol}: {e}")

df = pd.DataFrame(data)

df.to_json("stocks.json", orient="records", indent=2)

print("Done")