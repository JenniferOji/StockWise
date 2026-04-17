import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { checkStockRisk, simulateStockImpact } from '@/services/simulation';
import STOCKS from '../constants/stocks.json';

type StockRiskResponse = {
  success: boolean;
  symbol: string;
  company_name: string;
  sector: string;
  cluster: number;
  risk_level: string;
  metrics: {
    volatility: number;
    max_drawdown: number;
    annual_return: number;
  };
  message?: string;
};

export const CATEGORY_COLORS = {
	'Very Low Risk': '#22c55e',
	'Low Risk': '#84cc16',
	'Moderate Risk': '#eab308',
	'High Risk': '#f97316',
	'Very High Risk': '#ef4444',
}

const getRiskColor = (riskLevel: string) => {
  return CATEGORY_COLORS[riskLevel.trim() as keyof typeof CATEGORY_COLORS];
};

export default function StockRiskWidget() {
  const [symbol, setSymbol] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [shares, setShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StockRiskResponse | null>(null);
  const [impact, setImpact] = useState<any>(null);
  const canSimulate = shares.trim().length > 0;

  const filteredSuggestions = useMemo(() => {
    const q = symbol.trim().toLowerCase();
    if (!q) return [];

    return STOCKS.filter((s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [symbol]);

  const handleCheckRisk = async () => {
    if (!symbol.trim()) {
      setError('Please enter a stock ticker');
      return;
    }

    setShowDropdown(false);

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
      label === "Sharpe Ratio";

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

  const riskColor = result ? getRiskColor(result.risk_level) : '#0b3d91';

  return (
    <View style={styles.card}>
      {/* <Text style={styles.title}>Stock Risk Checker</Text> */}
      <Text style={styles.subtitle}>Analyse the risk level of any stock ticker</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Enter ticker e.g. AAPL"
            value={symbol}
            onChangeText={(text) => {
              setSymbol(text.toUpperCase());
              setShowDropdown(true);
            }}
            autoCapitalize="characters"
            onFocus={() => setShowDropdown(true)}
            onSubmitEditing={handleCheckRisk}
          />

          {showDropdown && filteredSuggestions.length > 0 && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredSuggestions.map((item, index) => (
                <Pressable
                  key={item.symbol}
                  style={[
                    styles.dropdownItem,
                    index === filteredSuggestions.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => {
                    setSymbol(item.symbol);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownSymbol}>{item.symbol}</Text>
                  <Text style={styles.dropdownName}>{item.companyName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

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
        <View style={[styles.resultCard, { borderLeftColor: riskColor }]}>
          <Text style={styles.stockTitle}>
            {result.symbol} - {result.company_name}
          </Text>
          <Text style={[styles.riskLevel, { color: riskColor }]}>{result.risk_level}</Text>
          <Text style={styles.meta}>Sector: {result.sector}</Text>

          <Text style={styles.meta}>Annualised Volatility: {result.metrics.volatility}%</Text>
          <Text style={styles.meta}>Max Drawdown: {result.metrics.max_drawdown}%</Text>
          <Text style={styles.meta}>Annual Returns: {result.metrics.annual_return}%</Text>

          <View style={styles.simSection}>
            <Text style={styles.simTitle}>Simulate Impact</Text>
            <Text style={styles.simSubtitle}>
              See how adding this stock affects your portfolio before you purchase it with your desired shares 
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Number of shares"
                  placeholderTextColor="#94a3b8"
                  value={shares}
                  onChangeText={setShares}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.button, !canSimulate && styles.buttonDisabled]}
                onPress={handleSimulate}
                disabled={!canSimulate}
              >
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
                {/* {renderMetric("Annual Return", impact.impact.annual_return)} */}
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
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  inputWrap: { flex: 1, minWidth: 0, position: 'relative' },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dropdown: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 10, maxHeight: 180 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownSymbol: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dropdownName: { fontSize: 12, color: '#64748b', marginTop: 1 },
  button: { backgroundColor: '#0b3d91', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', height: 44, minWidth: 0, flexShrink: 0 },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
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