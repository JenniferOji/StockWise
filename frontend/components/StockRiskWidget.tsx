import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { checkStockRisk, simulateStockImpact } from '@/services/user';

type StockRiskResponse = {
  success: boolean;
  symbol: string;
  company_name: string;
  sector: string;
  cluster: number;
  risk_level: string;
  metrics: {
    log_variances: number;
    volatility: number;
    var_95: number;
  };
  message?: string;
};

export default function StockRiskWidget() {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StockRiskResponse | null>(null);
  const [impact, setImpact] = useState<any>(null);

  const handleCheckRisk = async () => {
    if (!symbol.trim()) {
      setError('Please enter a stock ticker');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setImpact(null);

    const response = await checkStockRisk(symbol.trim().toUpperCase());

    if (response && response.success) {
      setResult(response as StockRiskResponse);
    } else {
      setError(response?.detail || response?.message || 'Failed to analyse stock');
    }

    setLoading(false);
  };

  const handleSimulate = async () => {
    if (!shares) return;

    setSimLoading(true);

    const response = await simulateStockImpact(
      1,
      symbol.trim().toUpperCase(),
      Number(shares)
    );

    if (response?.success) {
      setImpact(response);
    }

    setSimLoading(false);
  };

  const renderMetric = (label: string, data: any) => {
    const increaseIsGood =
      label === "Annual Return" ||
      label === "Sharpe Ratio" ||
      label === "Max Drawdown";

    const isPositive = data.change >= 0;
    const isImprovement = increaseIsGood ? isPositive : !isPositive;

    return (
      <View style={styles.metricRow}>
        <View style={styles.metricLeft}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.metricSub}>
            {data.before}% → {data.after}%
          </Text>
        </View>
        <Text style={[styles.metricChange, isImprovement ? styles.down : styles.up]}>
          {isPositive ? "↑" : "↓"} {data.change}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Stock Risk Checker</Text>
      <Text style={styles.subtitle}>Analyse the risk level of any stock ticker</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter ticker e.g. AAPL"
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={handleCheckRisk}>
          <Text style={styles.buttonText}>Analyse</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#0b3d91" />
          <Text style={styles.loadingText}>Checking stock risk...</Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.stockTitle}>
            {result.symbol} - {result.company_name}
          </Text>
          <Text style={styles.riskLevel}>{result.risk_level}</Text>
          <Text style={styles.meta}>Sector: {result.sector}</Text>
          <Text style={styles.meta}>Annualised Volatility: {result.metrics.volatility}%</Text>
          <Text style={styles.meta}>VaR 95: {result.metrics.var_95}%</Text>
          <Text style={styles.meta}>Cluster: {result.cluster}</Text>

          <View style={styles.simSection}>
            <Text style={styles.simTitle}>Simulate Impact</Text>
            <Text style={styles.simSubtitle}>
              See how adding this stock affects your portfolio
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Number of shares"
                value={shares}
                onChangeText={setShares}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.button} onPress={handleSimulate}>
                <Text style={styles.buttonText}>Simulate</Text>
              </TouchableOpacity>
            </View>

            {simLoading && (
              <ActivityIndicator size="small" color="#0b3d91" />
            )}

            {impact && (
              <View style={styles.impactCard}>
                <Text style={styles.impactTitle}>
                  Adding {impact.quantity} shares of {impact.symbol}
                </Text>

                {renderMetric("Volatility", impact.impact.volatility)}
                {renderMetric("VaR (95%)", impact.impact.var_95)}
                {renderMetric("Max Drawdown", impact.impact.max_drawdown)}
                {renderMetric("Annual Return", impact.impact.annual_return)}
                {renderMetric("Sharpe Ratio", impact.impact.sharpe)}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, marginVertical: 12, borderWidth: 1, borderColor: '#e0e7ef' },
  title: { fontSize: 22, fontWeight: '700', color: '#0b3d91', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#404348', marginBottom: 16, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  button: { backgroundColor: '#0b3d91', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#64748b' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 8 },

  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 14, borderLeftWidth: 4, borderLeftColor: '#0b3d91' },
  stockTitle: { fontSize: 17, fontWeight: '700', color: '#0b3d91', marginBottom: 8 },
  riskLevel: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  meta: { fontSize: 14, color: '#475569', marginBottom: 4 },

  simSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  simTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  simSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 10 },

  impactCard: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginTop: 10 },
  impactTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, color: '#0f172a' },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  metricLeft: {},
  metricLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  metricSub: { fontSize: 12, color: '#64748b' },
  metricChange: { fontSize: 14, fontWeight: '700' },
  up: { color: '#dc2626' },
  down: { color: '#16a34a' },
});