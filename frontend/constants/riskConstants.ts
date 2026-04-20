export const CATEGORY_COLORS = {
  'Very Low Risk': '#22c55e',
  'Low Risk': '#84cc16',
  'Moderate Risk': '#eab308',
  'High Risk': '#f97316',
  'Very High Risk': '#ef4444',
  'Extreme Risk': '#991b1b',
}

export const CATEGORY_ORDER = [
  'Very Low Risk',
  'Low Risk',
  'Moderate Risk',
  'High Risk',
  'Very High Risk',
  'Extreme Risk',
]

const lowVolatilityBands = [{ label: 'Good', color: '#22c55e', range: '0-10%', max: 10 }, { label: 'Moderate', color: '#eab308', range: '10-20%', max: 20 }, { label: 'High', color: '#f97316', range: '20-30%', max: 30 }, { label: 'Severe', color: '#ef4444', range: '30%+', max: Infinity }]
const moderateVolatilityBands = [{ label: 'Good', color: '#22c55e', range: '0-20%', max: 20 }, { label: 'Moderate', color: '#eab308', range: '20-35%', max: 35 }, { label: 'High', color: '#f97316', range: '35-50%', max: 50 }, { label: 'Severe', color: '#ef4444', range: '50%+', max: Infinity }]
const highVolatilityBands = [{ label: 'Expected', color: '#22c55e', range: '0-40%', max: 40 }, { label: 'Elevated', color: '#eab308', range: '40-60%', max: 60 }, { label: 'High', color: '#f97316', range: '60-80%', max: 80 }, { label: 'Extreme', color: '#ef4444', range: '80%+', max: Infinity }]

const lowSharpeBands = [{ label: 'Poor', color: '#ef4444', range: 'Below 0.5', max: 0.5 }, { label: 'Fair', color: '#eab308', range: '0.5-1.0', max: 1.0 }, { label: 'Good', color: '#84cc16', range: '1.0-2.0', max: 2.0 }, { label: 'Excellent', color: '#22c55e', range: '2.0+', max: Infinity }]
const highSharpeBands = [{ label: 'Poor', color: '#ef4444', range: 'Below 0.3', max: 0.3 }, { label: 'Fair', color: '#eab308', range: '0.3-0.8', max: 0.8 }, { label: 'Good', color: '#84cc16', range: '0.8-1.5', max: 1.5 }, { label: 'Excellent', color: '#22c55e', range: '1.5+', max: Infinity }]

const lowDrawdownBands = [{ label: 'Good', color: '#22c55e', range: '0-10%', max: 10 }, { label: 'Moderate', color: '#eab308', range: '10-20%', max: 20 }, { label: 'High', color: '#f97316', range: '20-35%', max: 35 }, { label: 'Severe', color: '#ef4444', range: '35%+', max: Infinity }]
const moderateDrawdownBands = [{ label: 'Good', color: '#22c55e', range: '0-20%', max: 20 }, { label: 'Moderate', color: '#eab308', range: '20-35%', max: 35 }, { label: 'High', color: '#f97316', range: '35-50%', max: 50 }, { label: 'Severe', color: '#ef4444', range: '50%+', max: Infinity }]
const highDrawdownBands = [{ label: 'Expected', color: '#22c55e', range: '0-35%', max: 35 }, { label: 'Elevated', color: '#eab308', range: '35-55%', max: 55 }, { label: 'High', color: '#f97316', range: '55-75%', max: 75 }, { label: 'Extreme', color: '#ef4444', range: '75%+', max: Infinity }]

const lowVarBands = [{ label: 'Good', color: '#22c55e', range: '0-1%', max: 1 }, { label: 'Moderate', color: '#eab308', range: '1-2.5%', max: 2.5 }, { label: 'High', color: '#f97316', range: '2.5-4%', max: 4 }, { label: 'Severe', color: '#ef4444', range: '4%+', max: Infinity }]
const moderateVarBands = [{ label: 'Good', color: '#22c55e', range: '0-2%', max: 2 }, { label: 'Moderate', color: '#eab308', range: '2-4%', max: 4 }, { label: 'High', color: '#f97316', range: '4-6%', max: 6 }, { label: 'Severe', color: '#ef4444', range: '6%+', max: Infinity }]
const highVarBands = [{ label: 'Expected', color: '#22c55e', range: '0-4%', max: 4 }, { label: 'Elevated', color: '#eab308', range: '4-7%', max: 7 }, { label: 'High', color: '#f97316', range: '7-10%', max: 10 }, { label: 'Extreme', color: '#ef4444', range: '10%+', max: Infinity }]

export const METRIC_THRESHOLDS: Record<string, Record<string, { bands: { label: string; color: string; range: string; max: number }[]; unit: string }>> = {
	Volatility: {
		'Very Low Risk': { unit: '%', bands: lowVolatilityBands },
		'Low Risk': { unit: '%', bands: lowVolatilityBands },
		'Moderate Risk': { unit: '%', bands: moderateVolatilityBands },
		'High Risk': { unit: '%', bands: highVolatilityBands },
		'Very High Risk': { unit: '%', bands: highVolatilityBands },
	},
	'Sharpe Ratio': {
		'Very Low Risk': { unit: '', bands: lowSharpeBands },
		'Low Risk': { unit: '', bands: lowSharpeBands },
		'Moderate Risk': { unit: '', bands: lowSharpeBands },
		'High Risk': { unit: '', bands: highSharpeBands },
		'Very High Risk': { unit: '', bands: highSharpeBands },
	},
	'Max Drawdown': {
		'Very Low Risk': { unit: '%', bands: lowDrawdownBands },
		'Low Risk': { unit: '%', bands: lowDrawdownBands },
		'Moderate Risk': { unit: '%', bands: moderateDrawdownBands },
		'High Risk': { unit: '%', bands: highDrawdownBands },
		'Very High Risk': { unit: '%', bands: highDrawdownBands },
	},
	'VaR (95%)': {
		'Very Low Risk': { unit: '%', bands: lowVarBands },
		'Low Risk': { unit: '%', bands: lowVarBands },
		'Moderate Risk': { unit: '%', bands: moderateVarBands },
		'High Risk': { unit: '%', bands: highVarBands },
		'Very High Risk': { unit: '%', bands: highVarBands },
	},
}
