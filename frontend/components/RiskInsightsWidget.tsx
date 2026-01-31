import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const dummyRiskData = {
  success: true,
  metrics: {
    volatility: 0.18,
    sharpe_ratio: 1.25,
    max_drawdown: -0.12,
    var_95: -0.08
  },
  portfolio_value: 15234.56
};

export default function RiskInsightsWidget() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk Insights</Text>
      <Text style={styles.metric}>Portfolio Value: ${dummyRiskData.portfolio_value.toLocaleString()}</Text>
      <Text style={styles.metric}>Volatility: {dummyRiskData.metrics.volatility}</Text>
      <Text style={styles.metric}>Sharpe Ratio: {dummyRiskData.metrics.sharpe_ratio}</Text>
      <Text style={styles.metric}>Max Drawdown: {dummyRiskData.metrics.max_drawdown}</Text>
      <Text style={styles.metric}>VaR (95%): {dummyRiskData.metrics.var_95}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#fff',
		borderRadius: 8,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	metric: {
		fontSize: 16,
		marginBottom: 4,
	},
	error: {
		color: 'red',
	},
});
