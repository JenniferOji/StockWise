import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';

type DiversificationSuggestions = string[];

export default function DiversificationWidget() {
  const suggestions: DiversificationSuggestions = [
    'AAPL',
    'GOOGL',
    'AMZN',
    'MSFT',
    'TSLA',
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Diversification Suggestions</Text>
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => index.toString()}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <View style={styles.suggestionItem}>
            <Text style={styles.suggestionNumber}>{index + 1}.</Text>
            <Text style={styles.suggestionText}>{item}</Text>
          </View>
        )}
      />
      <Text style={styles.countText}>Total suggestions: {suggestions.length}</Text>
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
  suggestionItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0b3d91',
  },
  suggestionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d91',
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});