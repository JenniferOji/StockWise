import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { getDiversificationSuggestions } from '@/services/recommendations';
import { storage } from '@/utils/storage';

type StockSuggestion = {
  symbol: string;
  company_name: string;
  sector: string;
  reason: string;
};

type DiversificationResponse = {
  success: boolean;
  suggestions: StockSuggestion[];
  risk_preference: string;
  comparison?: {
    current_volatility: number | null;
    with_suggestions_volatility: number | null;
  };
  message?: string;
};

export default function DiversificationWidget() {
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [risk, setRisk] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentVolatility, setCurrentVolatility] = useState<number | null>(null);
  const [withSuggestionsVolatility, setWithSuggestionsVolatility] = useState<number | null>(null);

  // returns explanation text based on user's risk preference
  const getSuggestionSummary = (riskPreference: string) => {
    const riskLevel = riskPreference.trim().toLowerCase();

    if (riskLevel.includes('low')) {
      return 'These stocks are selected because they have the lowest volatility in the dataset, helping reduce portfolio volatility for your low risk preference.';
    }

    if (riskLevel.includes('moderate')) {
      return 'These stocks are selected to balance stability and return potential, aligning with your moderate risk preference.';
    }

    if (riskLevel.includes('high')) {
      return 'These stocks are selected for higher return potential, accepting higher volatility in line with your high risk preference.';
    }

    return 'These stocks are selected to best align with your risk preference using the portfolio optimization model.';
  };

  // fetches diversification suggestions on mount
  useEffect(() => {
    async function fetchDiversificationSuggestions() {
      setError('');
      setLoading(true);

      const userJson = await storage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const response = (await getDiversificationSuggestions(user.ID)) as DiversificationResponse;
        if (response && response.success) {
          setSuggestions(response.suggestions);
          setRisk(response.risk_preference);
          setCurrentVolatility(response.comparison?.current_volatility || null);
          setWithSuggestionsVolatility(response.comparison?.with_suggestions_volatility || null);
        } else {
          setError(response?.message || 'Failed to load suggestions');
        }
      } else {
        setError('User not found');
      }
      setLoading(false);
    }
    fetchDiversificationSuggestions();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#0b3d91" />
        <Text style={styles.loadingText}>Loading diversification suggestions...</Text>
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

  if (!suggestions || suggestions.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Diversification Suggestions</Text>
        <Text style={styles.noDataText}>No suggestions available at this time.</Text>
      </View>
    );
  }

  let volatilityDiff: number | null = null;
  let volatilityDifference: string | null = null;

  if (currentVolatility !== null && withSuggestionsVolatility !== null) {
    volatilityDiff = withSuggestionsVolatility - currentVolatility;
    volatilityDifference = `${Math.abs(volatilityDiff).toFixed(1)}%`;
  }

  const volatilityChange = (() => {
    if (volatilityDiff == null || volatilityDifference == null) {
      return { text: '', color: '#64748b' };
    }

    if (volatilityDiff > 0) {
      return {
        text: `Volatility increased by ${volatilityDifference}`,
        color: '#dc2626',
      };
    }

    if (volatilityDiff < 0) {
      return {
        text: `Volatility reduced by ${volatilityDifference}`,
        color: '#16a34a',
      };
    }

    return {
      text: `Volatility unchanged (${volatilityDifference})`,
      color: '#64748b',
    };
  })();

  // renders diversification suggestions with volatility comparison
  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>{risk} Preference</Text>

      {volatilityDifference != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimated Portfolio Volatility Comparison</Text>
          <Text style={styles.metricLabel}>Based on individual stock volatilities</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnHeader}>Current</Text>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Annualised Volatility</Text>
                <Text style={styles.metricValue}>{(currentVolatility)}</Text>
              </View>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnHeader}>With Suggestions</Text>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Annualised Volatility</Text>
                <Text style={styles.metricValue}>{(withSuggestionsVolatility)}</Text>
              </View>
            </View>
          </View>
          {volatilityDifference !== null && (
            <Text style={[styles.changeText, { color: volatilityChange.color }]}>
              {volatilityChange.text}
            </Text>
          )}
        </View>
      )}
      <View style={styles.suggestionSummaryBox}>
        <Text style={styles.suggestionSummaryTitle}>Why these stocks were selected</Text>
        <Text style={styles.suggestionSummaryText}>{getSuggestionSummary(risk)}</Text>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => index.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.suggestionItem}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionSymbol}>{item.symbol} - {item.company_name}</Text>
              <Text style={styles.suggestionSector}>{item.sector}</Text>
            </View>
            <Text style={styles.suggestionReason}>{item.reason}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, marginVertical: 12, shadowColor: '#0b3d91', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#e0e7ef' },
  title: { fontSize: 22, fontWeight: '700', color: '#0b3d91', marginBottom: 5, textAlign: 'center', letterSpacing: 0.2 },
  subtitle: { fontSize: 20, fontWeight: '700', color: '#000000', marginBottom: 24, textAlign: 'center', letterSpacing: 0.2 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748b', textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 14, textAlign: 'center', padding: 10 },
  noDataText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: '#0b3d91', marginBottom: 3},
  comparisonRow: { flexDirection: 'row', gap: 10 },
  comparisonColumn: { flex: 1 },
  columnHeader: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8, textAlign: 'center' },
  metricBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#0b3d91', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#e0e7ef' },
  metricLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  explanationLabel: { fontSize: 13, color: '#33373c', fontWeight: '600', marginBottom: 12 },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#111' },
  changeText: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  improvementItem: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 6, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  improvementBullet: { fontSize: 16, fontWeight: '700', color: '#0ea5e9', marginRight: 8 },
  improvementText: { fontSize: 13, color: '#334155', flex: 1, fontWeight: '500' },
  suggestionSummaryBox: { backgroundColor: '#eef4ff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#dbeafe' },
  suggestionSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#0b3d91', marginBottom: 6 },
  suggestionSummaryText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  suggestionItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0b3d91', shadowColor: '#0b3d91', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  suggestionSymbol: { fontSize: 16, fontWeight: '700', color: '#0b3d91', flex: 1 },
  suggestionSector: { fontSize: 12, fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  suggestionReason: { fontSize: 13, color: '#475569', lineHeight: 18 },
});