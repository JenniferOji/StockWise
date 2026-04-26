import pandas as pd
import json
from pathlib import Path

# loading sp500 company list from local csv file
BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR.parent / "ml" / "training_data" / "constituents.csv"
OUTPUT_STOCKS_PATH = BASE_DIR.parent / "data" / "stocks.json"
OUTPUT_STOCK_MAP_PATH = BASE_DIR.parent / "data" / "stock_data.json"

sp500 = pd.read_csv(DATASET_PATH)

# extracting symbols and company names
sp500 = sp500.dropna(subset=["Symbol", "Security"])
sp500["Symbol"] = sp500["Symbol"].astype(str).str.strip()
sp500["Security"] = sp500["Security"].astype(str).str.strip()
sp500["GICS Sector"] = sp500["GICS Sector"].fillna("Unknown").astype(str).str.strip()

symbols = sp500["Symbol"].tolist()
name_map = dict(zip(sp500["Symbol"], sp500["Security"]))
sector_map = dict(zip(sp500["Symbol"], sp500["GICS Sector"]))

data = []
stock_map = {}
existing_symbols = set()

# fetching stock data for the sp500 companies
for symbol in symbols:
    try:
        csv_symbol = symbol

        # use company name from csv mapping only
        name = name_map.get(csv_symbol, "")

        sector = sector_map.get(csv_symbol, "Unknown")

        data.append({
            "symbol": csv_symbol,
            "companyName": name,
            "shares": 0,
            "purchasePrice": 0,
            "sector": sector,
            "imageUrl": f"https://financialmodelingprep.com/image-stock/{csv_symbol}.png"
        })

        stock_map[csv_symbol] = {
            "name": name,
            "sector": sector
        }

        existing_symbols.add(csv_symbol)

    except Exception:
        continue

# saving stock data for frontend and backend usage
df = pd.DataFrame(data)

df.to_json(OUTPUT_STOCKS_PATH, orient="records", indent=2)

with open(OUTPUT_STOCK_MAP_PATH, "w") as f:
    json.dump(stock_map, f, indent=2)