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

# Set analysis timeframe to be a year
start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
end_date = datetime.now().strftime('%Y-%m-%d')

def get_portfolio_data(portfolio, start_date, end_date):
    """Download the historical price data of the portfolio stocks"""
    tickers = list(portfolio.keys())
    # download all data
    data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)['Close']
    data = data.dropna()
    # ffill - forward fill to handle missing data
    # bfill - backward fill to handle any remaining missing data
    # data = data.fillna(method='ffill').fillna(method='bfill')
    return data

def calculate_portfolio_value(price_data, portfolio):
    """Calculate the total value of the portfolio over time"""
    portfolio_value = pd.DataFrame()
    
    # Calculate value for each stock in the portfolio
    for ticker, holding in portfolio.items():
        shares = holding['shares']
        portfolio_value[ticker] = price_data[ticker] * shares
    
    portfolio_value['Total'] = portfolio_value.sum(axis=1)
    return portfolio_value

def calculate_returns(portfolio_value):
    """Calculate daily and cumulative returns"""
    daily_returns = portfolio_value['Total'].pct_change()
    cumulative_returns = (1 + daily_returns).cumprod() - 1
    
    return daily_returns, cumulative_returns

# THE MAIN RISK METRICS CALCULATION FUNCTIONS
def calculate_volatility(returns):
    returns = returns.dropna()
    # Annualised volatility - standard deviation of returns multiplied by sqrt(252 trading days) - because 252 trading days in a year
    return returns.std() * np.sqrt(252) * 100

# sharpe ratio calculation with default risk free rate of 4% - because government bonds yield around 4% - sharpe ratio = (portfolio return - risk free rate) / portfolio volatility
def calculate_sharpe_ratio(returns, risk_free_rate=0.04):
    # returns = returns.dropna()
    excess_returns = returns.mean() * 252 - risk_free_rate
    return excess_returns / (returns.std() * np.sqrt(252))

# max drawdown calculates the maximum observed loss from a peak to a trough of a portfolio, before a new peak is attained
def calculate_max_drawdown(returns):
    cumulative = (1 + returns).cumprod() 
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    return drawdown.min() * 100

# value at risk calculation at 95% confidence interval means that there is a 5% chance that the portfolio will lose more than the VaR amount over a specified period
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
