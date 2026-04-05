import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getRandomSuggestions } from '@/services/user';
import { storage } from '@/utils/storage';

type StockSuggestion = {
  symbol: string;
  company_name: string;
  sector: string;
  reason: string;
};

type OptimalResponse = {
  success: boolean;
  suggestions: StockSuggestion[];
  risk_preference: string;
  message?: string;
};

export default function RandomSuggestionsWidget() {
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [risk, setRisk] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchRandomSuggestions = async () => {
    setError('');
    setLoading(true);

    const userJson = await storage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      const response = (await getRandomSuggestions(user.ID)) as OptimalResponse;

      if (response && response.success) {
        setSuggestions(response.suggestions);
        setRisk(response.risk_preference);
      } else {
        setError(response?.message || 'Failed to load suggestions');
      }
    } else {
      setError('User not found');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRandomSuggestions();
  }, []);

  return (
    <View style={styles.card}>

      {/* Header with refresh */}
      <View style={styles.headerRow}>
        <View>
          {/* <Text style={styles.title}>Explore Opportunities</Text> */}
          <Text style={styles.subtitle}>{risk} Preference</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchRandomSuggestions}>
          <Icon name="refresh" size={20} color="#0b3d91" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <>
          <ActivityIndicator size="small" color="#0b3d91" />
          <Text style={styles.loadingText}>Refreshing suggestions...</Text>
        </>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : suggestions.length === 0 ? (
        <Text style={styles.noDataText}>No suggestions available.</Text>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.suggestionItem}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionSymbol}>
                  {item.symbol} - {item.company_name}
                </Text>
                <Text style={styles.suggestionSector}>{item.sector}</Text>
              </View>
              <Text style={styles.suggestionReason}>{item.reason}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, marginVertical: 12, shadowColor: '#0b3d91', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#e0e7ef' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  refreshButton: {
    backgroundColor: '#e0e7ef',
    padding: 8,
    borderRadius: 8,
  },

  title: { fontSize: 22, fontWeight: '700', color: '#0b3d91' },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#2b2c2e', marginTop: 2 },

  loadingText: { marginTop: 10, fontSize: 14, color: '#64748b', textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 14, textAlign: 'center', padding: 10 },
  noDataText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },

  suggestionItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0b3d91' },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  suggestionSymbol: { fontSize: 16, fontWeight: '700', color: '#0b3d91', flex: 1 },
  suggestionSector: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  suggestionReason: { fontSize: 13, color: '#475569' },
});