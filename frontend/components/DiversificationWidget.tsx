import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getRiskMetrics } from '../services/user';

type DiversificationSuggestions = {
    suggestions: string[];
};

export default function RiskInsightsWidget() {
  const [suggestions, setSuggestions] = useState<DiversificationSuggestions | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
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
});