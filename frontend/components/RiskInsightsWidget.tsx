import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getRiskMetrics, getStockRiskCategories } from '../services/user';
import { storage } from '../utils/storage';

type RiskMetrics = {
  success: boolean;
  metrics: {
    volatility: string;
    sharpe_ratio: string;
    max_drawdown: string;
    var_95: string;
  };
  portfolio_value: number;
};

type StockRiskItem = {
  ticker: string;
  risk_bucket: 'low' | 'moderate' | 'high';
  risk_score: number;
};

type StockRiskCategories = {
  success: boolean;
  categories: {
    low: StockRiskItem[];
    moderate: StockRiskItem[];
    high: StockRiskItem[];
  };
  total: number;
};

export default function RiskInsightsWidget() {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);
  const [stockRiskData, setStockRiskData] = useState<StockRiskCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchRiskMetricsForUser() {
      setLoading(true);
      setError('');
      const userJson = await storage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const [metricsData, categoriesData] = await Promise.all([
          getRiskMetrics(user.ID),
          getStockRiskCategories(user.ID),
        ]);

        if (metricsData && metricsData.success) {
          setRiskData(metricsData);
        } else {
          setError('Failed to load risk metrics');
        }

        if (categoriesData && categoriesData.success) {
          setStockRiskData(categoriesData);
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
      <View style={styles.card}>
        <ActivityIndicator size="small" />
        <Text>Loading risk insights...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!riskData) {
    return (
      <View style={styles.card}>
        <Text>No risk metrics available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
        <Text style={styles.valueNum}>${riskData.portfolio_value.toLocaleString()}</Text>
      </View>
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Volatility</Text>
          <Text style={styles.metricValue}>{riskData.metrics.volatility}</Text>
          <Text style={styles.desc}>How much your portfolio value changes over time.</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Sharpe Ratio</Text>
          <Text style={styles.metricValue}>{riskData.metrics.sharpe_ratio}</Text>
          <Text style={styles.desc}>Return vs. risk. Higher is better.</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Max Drawdown</Text>
          <Text style={styles.metricValue}>{riskData.metrics.max_drawdown}</Text>
          <Text style={styles.desc}>Biggest drop from a peak to a low point.</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>VaR (95%)</Text>
          <Text style={styles.metricValue}>{riskData.metrics.var_95}</Text>
          <Text style={styles.desc}>Max loss with 95% confidence.</Text>
        </View>
      </View>

      <View style={styles.riskCategorySection}>
        <Text style={styles.sectionTitle}>Stock Risk Categories</Text>
        <Text style={styles.sectionSubtitle}>Grouped by historical annualised volatility.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#0b3d91',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e7ef',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b3d91',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: '#e0e7ef',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  valueLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  valueNum: {
    fontSize: 17,
    color: '#0b3d91',
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0b3d91',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e0e7ef',
  },
  metricLabel: {
    fontSize: 14,
    color: '#0b3d91',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  riskCategorySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d91',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
});