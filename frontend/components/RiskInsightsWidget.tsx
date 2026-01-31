import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getRiskMetrics } from '../services/user';

type RiskMetrics = {
  success: boolean;
  metrics: {
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    var_95: number;
  };
  portfolio_value: number;
};

export default function RiskInsightsWidget() {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchRiskMetricsForUser() {
      setLoading(true);
      setError('');
      let userJson = null;
      try {
        userJson = await SecureStore.getItemAsync('user');
      } catch (secureStoreError) {
        if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
          userJson = (globalThis as any).localStorage.getItem('user');
        }
      }
      if (userJson) {
        const user = JSON.parse(userJson);
        const data = await getRiskMetrics(user.ID);
        if (data && data.success) {
          setRiskData(data);
        } else {
          setError('Failed to load risk metrics');
        }
      } else {
        setError('User not found');
      }
      setLoading(false);
    }
    fetchRiskMetricsForUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
        <Text>Loading risk insights...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!riskData) {
    return (
      <View style={styles.container}>
        <Text>No risk metrics available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.metric}>Portfolio Value: ${riskData.portfolio_value.toLocaleString()}</Text>
      <Text style={styles.metric}>Volatility: {riskData.metrics.volatility}</Text>
      <Text style={styles.metric}>Sharpe Ratio: {riskData.metrics.sharpe_ratio}</Text>
      <Text style={styles.metric}>Max Drawdown: {riskData.metrics.max_drawdown}</Text>
      <Text style={styles.metric}>VaR (95%): {riskData.metrics.var_95}</Text>
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