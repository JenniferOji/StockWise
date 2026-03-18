import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getPerformanceMetrics } from '@/services/user';
import { storage } from '@/utils/storage';

export default function PerformanceMetricsWidget() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchMetrics() {
      setError('');
      setLoading(true);
      const userJson = await storage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const response = await getPerformanceMetrics(Number(user.ID));
        if (response) {
          setMetrics(response);
        } else {
          setError('Failed to load performance metrics');
        }
      } else {
        setError('User not found');
      }
      setLoading(false);
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator size="small" />
        <Text>Loading performance metrics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={{ padding: 16 }}>
        <Text>No performance metrics available.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text>Overall Return: {metrics.overall_return}</Text>
      <Text>Annualized Return: {metrics.metrics?.annualized_return}</Text>
      <Text>Portfolio Value: {metrics.portfolio_value}</Text>
      <Text>Best Performer: {metrics.best_performer}</Text>
      <Text>Worst Performer: {metrics.worst_performer}</Text>
    </View>
  );
}
