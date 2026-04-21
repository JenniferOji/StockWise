// color used for each risk category badge and border
export const CATEGORY_COLORS = {
  'Low Risk': '#84cc16',
  'Moderate Risk': '#eab308',
  'High Risk': '#f97316',
}

// display order for stock risk category cards
export const CATEGORY_ORDER = [
  'Low Risk',
  'Moderate Risk',
  'High Risk',
]

// volatility bands — fixed market-standard thresholds, same for all risk preferences
// S&P 500 avg ~15-20%, large-cap stocks ~12-15%, low-risk portfolios typically 5-12%
const volatilityBands = [
  { label: 'Low',      color: '#22c55e', range: '0-10%',  max: 10       },
  { label: 'Moderate', color: '#eab308', range: '10-20%', max: 20       },
  { label: 'High',     color: '#f97316', range: '20-35%', max: 35       },
  { label: 'Extreme',  color: '#ef4444', range: '35%+',   max: Infinity },
]

// sharpe ratio bands — fixed, widely accepted industry benchmarks
const sharpeBands = [
  { label: 'Poor',      color: '#ef4444', range: 'Below 0.5', max: 0.5      },
  { label: 'Fair',      color: '#eab308', range: '0.5-1.0',   max: 1.0      },
  { label: 'Good',      color: '#84cc16', range: '1.0-2.0',   max: 2.0      },
  { label: 'Excellent', color: '#22c55e', range: '2.0+',      max: Infinity },
]

// max drawdown bands — fixed, based on standard portfolio risk benchmarks
// 20% = typical moderate threshold, 35% = aggressive territory
const drawdownBands = [
  { label: 'Low',      color: '#22c55e', range: '0-10%',  max: 10       },
  { label: 'Moderate', color: '#eab308', range: '10-20%', max: 20       },
  { label: 'High',     color: '#f97316', range: '20-35%', max: 35       },
  { label: 'Extreme',  color: '#ef4444', range: '35%+',   max: Infinity },
]

// var (95%) daily bands — fixed, typical diversified portfolio daily VaR is 1-2%
const varBands = [
  { label: 'Low',      color: '#22c55e', range: '0-1.5%', max: 1.5      },
  { label: 'Moderate', color: '#eab308', range: '1.5-3%', max: 3        },
  { label: 'High',     color: '#f97316', range: '3-5%',   max: 5        },
  { label: 'Extreme',  color: '#ef4444', range: '5%+',    max: Infinity },
]

// all risk preferences share the same objective thresholds
// personalised interpretation is handled by the insight text in metricInsights.ts
export const METRIC_THRESHOLDS: Record<string, Record<string, { bands: { label: string; color: string; range: string; max: number }[]; unit: string }>> = {
  Volatility: {
    'Low Risk':      { unit: '%', bands: volatilityBands },
    'Moderate Risk': { unit: '%', bands: volatilityBands },
    'High Risk':     { unit: '%', bands: volatilityBands },
  },
  'Sharpe Ratio': {
    'Low Risk':      { unit: '', bands: sharpeBands },
    'Moderate Risk': { unit: '', bands: sharpeBands },
    'High Risk':     { unit: '', bands: sharpeBands },
  },
  'Max Drawdown': {
    'Low Risk':      { unit: '%', bands: drawdownBands },
    'Moderate Risk': { unit: '%', bands: drawdownBands },
    'High Risk':     { unit: '%', bands: drawdownBands },
  },
  'VaR (95%)': {
    'Low Risk':      { unit: '%', bands: varBands },
    'Moderate Risk': { unit: '%', bands: varBands },
    'High Risk':     { unit: '%', bands: varBands },
  },
}