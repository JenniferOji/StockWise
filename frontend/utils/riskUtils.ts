import { METRIC_THRESHOLDS } from '../constants/riskConstants'

// shared shape for one threshold band
type MetricBand = {
	label: string
	color: string
	range: string
	max: number
}

// stock fields used by risk widgets
export type StockRiskLike = {
	symbol?: string
	ticker?: string
	volatility: number
	max_drawdown: number
	annual_return: number
}

// grouped risk categories from backend
export type StockRiskCategoriesLike = {
	categories: Record<string, StockRiskLike[]>
}

// finds the matching band for a metric value
export function getActiveBand(label: string, rawValue: string, riskPref: string): MetricBand {
	const value = parseFloat(rawValue)
	const profile = METRIC_THRESHOLDS[label][riskPref]

	const match = profile.bands.find((band) => value < band.max)
	return match || profile.bands[profile.bands.length - 1]
}

// builds explanation text for each metric card
export function getMetricInsight(label: string, rawValue: string, riskPref: string): { what: string; score: string; } {
	const value = parseFloat(rawValue)
	const band = getActiveBand(label, rawValue, riskPref)

	// handles volatility explanations and tips
	if (label === 'Volatility') {
		const what = 'Portfolio volatility measures how much your portfolio value fluctuates over time. The higher the number, the more your balance swings up and down.'

		// messages based on risk preference and band
		const scoreMap: Record<string, Record<string, string>> = {
		'Low Risk': {
			Low: `Your score of ${value}% is low. Your portfolio is very stable, which is ideal for a low-risk strategy.`,
			Moderate: `Your score of ${value}% shows some movement. This is manageable but slightly above ideal for a low-risk investor.`,
			High: `Your score of ${value}% is high for a low-risk portfolio. Your investments are more volatile than expected.`,
			Extreme: `Your score of ${value}% is extremely high for a low-risk investor and likely outside your comfort zone.`,
		},
		'Moderate Risk': {
			Low: `Your score of ${value}% is low. Your portfolio is stable, though you may be sacrificing some growth.`,
			Moderate: `Your score of ${value}% is within a normal range for your profile.`,
			High: `Your score of ${value}% is on the higher side. Your portfolio is more volatile than ideal.`,
			Extreme: `Your score of ${value}% is very high and may expose you to large swings in value.`,
		},
		'High Risk': {
			Low: `Your score of ${value}% is lower than expected for a high-risk strategy.`,
			Moderate: `Your score of ${value}% is acceptable for a high-risk portfolio.`,
			High: `Your score of ${value}% is high, which aligns with aggressive investing.`,
			Extreme: `Your score of ${value}% is extremely high, even for a high-risk strategy.`,
		},
		}

		const score = scoreMap[riskPref][band.label]

		return { what, score }
	}

	// handles sharpe ratio explanations and tips
	if (label === 'Sharpe Ratio') {
		const what = 'The Sharpe Ratio measures how much return you are getting for the amount of risk you are taking. A higher number means you are being better rewarded for the risk in your portfolio.'

		// messages based on risk preference and band
		const scoreMap: Record<string, Record<string, string>> = {
			'Low Risk': {
				Poor: `Your score of ${value} is poor for a low-risk investor. You are taking on risk without being adequately rewarded. Consider shifting toward steadier, income-focused holdings.`,
				Fair: `Your score of ${value} is fair. You are getting some return for your risk, but there is room to improve. Low-risk portfolios should aim for consistency above 1.0.`,
				Good: `Your score of ${value} is good. You are earning solid returns relative to the modest risk you are taking, which is the goal for a conservative strategy.`,
				Excellent: `Your score of ${value} is excellent. You are generating strong returns while keeping risk low. This is ideal for your profile.`,
			},
			'Moderate Risk': {
				Poor: `Your score of ${value} is poor. The risk in your portfolio is not generating enough return. Consider reviewing your higher-risk holdings.`,
				Fair: `Your score of ${value} is average. You are being partially rewarded for your risk, but there is more to unlock. Aim for above 1.0.`,
				Good: `Your score of ${value} is good. A solid balance of risk and reward for a moderate-risk investor.`,
				Excellent: `Your score of ${value} is excellent. Strong returns for the level of risk you are carrying. Well done.`,
			},
			'High Risk': {
				Poor: `Your score of ${value} is poor, even accounting for the higher risk you are taking on. Your aggressive positions are not paying off enough yet.`,
				Fair: `Your score of ${value} is fair. High-risk strategies can take time to pay off, but aim to get this above 0.8 as returns accumulate.`,
				Good: `Your score of ${value} is good. Your higher-risk approach is being rewarded with meaningful returns.`,
				Excellent: `Your score of ${value} is excellent. Your high-risk strategy is generating strong risk-adjusted returns.`,
			},
		}

		const score = scoreMap[riskPref][band.label]

		return { what, score }
	}

	// handles max drawdown explanations and tips
	if (label === 'Max Drawdown') {
		const what = 'Max Drawdown shows the largest drop your portfolio has experienced from its highest point to its lowest. Think of it as the worst-case loss you have seen during a bad stretch in the market.'

		// messages based on risk preference and band
		const scoreMap: Record<string, Record<string, string>> = {
			'Low Risk': {
				Good: `Your score of ${value}% is low. Your portfolio has weathered market dips well, which is exactly what a low-risk strategy should do.`,
				Moderate: `Your score of ${value}% means you have had some notable dips. For a low-risk investor, this is starting to push the boundaries of what is comfortable.`,
				High: `Your score of ${value}% is high for a low-risk portfolio. You have experienced significant losses at some point, which may not align with your risk comfort.`,
				Severe: `Your score of ${value}% is severe. A low-risk investor should not be experiencing drops of this magnitude. This warrants a review of your holdings.`,
			},
			'Moderate Risk': {
				Good: `Your score of ${value}% is healthy. Your portfolio has avoided major crashes, which is a good sign for a balanced strategy.`,
				Moderate: `Your score of ${value}% is acceptable for a moderate-risk investor. Meaningful drops have occurred but within a manageable range.`,
				High: `Your score of ${value}% is on the high side. You have seen substantial losses at some point that may be worth addressing.`,
				Severe: `Your score of ${value}% is severe. Even for a moderate-risk portfolio, this level of loss from peak is significant.`,
			},
			'High Risk': {
				Expected: `Your score of ${value}% is within the expected range for a high-risk investor. Larger drawdowns are a natural part of aggressive investing.`,
				Elevated: `Your score of ${value}% is elevated but not unusual for high-risk strategies during volatile periods. Ensure you are comfortable holding through large dips.`,
				High: `Your score of ${value}% is high even for an aggressive portfolio. Consider whether concentration in a few volatile positions is increasing your downside exposure.`,
				Extreme: `Your score of ${value}% is extreme. Even for a high-risk investor, this level of drawdown suggests significant concentration risk or heavy exposure to very volatile assets.`,
			},
		}

		const score = scoreMap[riskPref][band.label]
		
		return { what, score }
	}

	// handles var explanations and tips
	if (label === 'VaR (95%)') {
		const what = 'Value at Risk (VaR) estimates the maximum amount you could expect to lose on a bad day. In simple terms: on 95% of days your losses should stay below this number.'

		// messages based on risk preference and band
		const scoreMap: Record<string, Record<string, string>> = {
			'Low Risk': {
				Good: `Your score of ${value}% is low. On a bad day, your losses are well-contained. This is great for a low-risk portfolio.`,
				Moderate: `Your score of ${value}% is moderate. On rough market days, you could see losses around this level, which is slightly above ideal for a conservative investor.`,
				High: `Your score of ${value}% is high for a low-risk investor. Your daily downside exposure is greater than it should be for your profile.`,
				Severe: `Your score of ${value}% is severe. A low-risk portfolio should not have this level of potential daily loss. Consider reviewing your most volatile holdings.`,
			},
			'Moderate Risk': {
				Good: `Your score of ${value}% is low. Your portfolio is well-protected against short-term market shocks.`,
				Moderate: `Your score of ${value}% is moderate. On a difficult day, you could see losses around this level, which is normal for a balanced portfolio.`,
				High: `Your score of ${value}% is high. Your portfolio has meaningful exposure to short-term market swings.`,
				Severe: `Your score of ${value}% is severe. You are carrying significant daily risk that may be worth reducing.`,
			},
			'High Risk': {
				Expected: `Your score of ${value}% is within the expected range for a high-risk investor. Higher daily risk is a trade-off that comes with pursuing stronger long-term returns.`,
				Elevated: `Your score of ${value}% is elevated, even for a high-risk strategy. Ensure this level of potential daily loss is something you can stomach.`,
				High: `Your score of ${value}% is high even by aggressive standards. Your portfolio is significantly exposed to short-term swings.`,
				Extreme: `Your score of ${value}% is extreme. Even high-risk portfolios rarely reach this level. This may indicate heavy concentration in a few very volatile positions.`,
			},
		}

		const score = scoreMap[riskPref][band.label]
		return { what, score }
	}

	// default empty response for unsupported labels
	return { what: '', score: '' }
}
