import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd

# resource used : https://www.trymito.io/blog/how-to-automate-portfolio-analysis-in-python-a-complete-guide
# sample data 
# portfolio = {
#     'AAPL': {'shares': 50, 'purchase_price': 150},
#     'MSFT': {'shares': 30, 'purchase_price': 280},
#     'GOOGL': {'shares': 20, 'purchase_price': 2800},
#     'VTI': {'shares': 100, 'purchase_price': 200},
#     'BND': {'shares': 200, 'purchase_price': 80}
# }


def get_portfolio_data(portfolio, start_date, end_date):
    tickers = list(portfolio.keys())
    data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)['Close']
    data = data.dropna()
    return data


def calculate_portfolio_value(price_data, portfolio):
    portfolio_value = pd.DataFrame()
    
    # Calculate value for each stock in the portfolio
    for ticker, holding in portfolio.items():
        shares = holding['shares']
        portfolio_value[ticker] = price_data[ticker] * shares
    
    portfolio_value['Total'] = portfolio_value.sum(axis=1)
    return portfolio_value

def calculate_returns(portfolio_value):
    daily_returns = portfolio_value['Total'].pct_change()
    cumulative_returns = (1 + daily_returns).cumprod() - 1
    
    return daily_returns, cumulative_returns

# THE MAIN RISK METRICS CALCULATION FUNCTIONS
def calculate_volatility(returns):
    returns = returns.dropna()
    # Annualised volatility - standard deviation of returns multiplied by sqrt
    return returns.std() * np.sqrt(252) * 100

# sharpe ratio calculation - how much the stock costs rn vs. how much return it has 
def calculate_sharpe_ratio(returns):
    excess_returns = returns.mean() * 252
    return excess_returns / (returns.std() * np.sqrt(252))

# max drawdown calculates the maximum observed loss from a peak to a trough of a portfolio, before a new peak is attained
def calculate_max_drawdown(returns):
    cumulative = (1 + returns).cumprod() 
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    return drawdown.min() * 100

# value at risk calculation at 95% confidence interval means that there is a 5% chance that the portfolio will lose more than the VaR amount over a specified period
# the period selected is 1 day in this case
def calculate_var(returns, confidence=0.05):
    returns = returns.dropna()
    return np.percentile(returns, confidence * 100) * 100

# function to calculate all risk metrics together
def calculate_risk_metrics(daily_returns):
    """Calculate all risk metrics together"""
    return {
        'volatility': f"{calculate_volatility(daily_returns):.2f}%",
        'sharpe_ratio': f"{calculate_sharpe_ratio(daily_returns):.2f}",
        'max_drawdown': f"{calculate_max_drawdown(daily_returns):.2f}%",
        'var_95': f"{calculate_var(daily_returns):.2f}%"
}
