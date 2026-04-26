from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import load_features

# setting up api router and loading dataset
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

df_features = load_features()
feature_map = df_features.set_index("symbol").to_dict(orient="index")

# request models for portfolio input
class Stock(BaseModel):
	symbol: str
	shares: float
	purchase_price: float

class PortfolioRequest(BaseModel):
	stocks: List[Stock]
	days: int = 365

# response model for performance output
class PerformanceMetricsResponse(BaseModel):
	success: bool
	metrics: dict
	portfolio_value: float
	total_invested: float
	profit_loss: float
	best_performer: dict
	worst_performer: dict

@router.get("/")
def root():
	return {"message": "Performance metrics API"}

# calculating portfolio performance metrics including returns and profit
@router.post("/api/performance-metrics")
def calculate_performance_metrics(portfolio_request: PortfolioRequest):

	# converting request into usable portfolio dictionary
	portfolio = {}
	for stock in portfolio_request.stocks:
		portfolio[stock.symbol] = {
			'shares': stock.shares,
			'purchase_price': stock.purchase_price
		}

	portfolio_value = {}
	total_value = 0
	returns = {}
	price_returns = {}
	profit_map = {}

	# calculating returns and profit for each stock
	for symbol, holding in portfolio.items():
		features = feature_map.get(symbol)
		if not features:
			continue

		shares = holding['shares']
		purchase_price = holding['purchase_price']
		current_price = features.get("close", purchase_price)

		invested_value = purchase_price * shares
		current_value = current_price * shares

		total_value += current_value

		pct_return = (
			(current_value - invested_value) / invested_value
			if invested_value else 0
		)

		profit = current_value - invested_value

		returns[symbol] = pct_return
		profit_map[symbol] = profit

		price_returns[symbol] = {
			"purchase_price": purchase_price,
			"current_price": current_price,
			"return_pct": pct_return
		}

		portfolio_value[symbol] = current_value

	if not returns:
		raise HTTPException(status_code=404, detail="No valid symbols in data")

	# identifying best and worst performing stocks
	best_performer_symbol = max(profit_map, key=profit_map.get)
	worst_performer_symbol = min(profit_map, key=profit_map.get)

	best_performer = {
		"symbol": best_performer_symbol,
		"profit": round(profit_map[best_performer_symbol], 2),
		"return_pct": round(returns[best_performer_symbol] * 100, 2)
	}

	worst_performer = {
		"symbol": worst_performer_symbol,
		"profit": round(profit_map[worst_performer_symbol], 2),
		"return_pct": round(returns[worst_performer_symbol] * 100, 2)
	}

	# calculating total portfolio return and profit
	total_invested = sum(holding['shares'] * holding['purchase_price'] for holding in portfolio.values())
	overall_return = (total_value - total_invested) / total_invested if total_invested else 0
	profit_loss = total_value - total_invested

	# calculating annualised return using cagr formula
	n_years = portfolio_request.days / 365

	if total_invested and n_years > 0:
		growth_factor = total_value / total_invested
		annual_growth_rate = 1 / n_years
		cagr = (growth_factor ** annual_growth_rate) - 1
	else:
		cagr = 0

	# formatting final metrics output
	metrics = {
		"overall_return": f"{overall_return * 100:.2f}%",
		"returns_by_symbol": {k: f"{v * 100:.2f}%" for k, v in returns.items()},
		"price_comparison": {
			k: {
				"purchase_price": v["purchase_price"],
				"current_price": v["current_price"],
				"return_pct": f"{v['return_pct'] * 100:.2f}%"
			}
			for k, v in price_returns.items()
		}
	}

	return PerformanceMetricsResponse(
		success=True,
		metrics=metrics,
		portfolio_value=round(total_value, 2),
		total_invested=round(total_invested, 2),
		profit_loss=round(profit_loss, 2),
		best_performer=best_performer,
		worst_performer=worst_performer
	)