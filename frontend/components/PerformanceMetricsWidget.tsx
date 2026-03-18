import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getPerformanceMetrics } from '@/services/user';
import { storage } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function PerformanceMetricsWidget() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchMetrics = async () => {
    setError('');
    setLoading(true);

    try {
      const userJson = await storage.getItem('user');
      if (!userJson) throw new Error('User not found');

      const user = JSON.parse(userJson);
      const response = await getPerformanceMetrics(Number(user.ID));

      if (response) setMetrics(response);
      else throw new Error('Failed to load performance metrics');
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMetrics();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" />
        <Text>Loading performance metrics...</Text>
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

  if (!metrics) {
    return (
      <View style={styles.card}>
        <Text>No performance metrics available.</Text>
      </View>
    );
  }

  const perf = metrics.metrics;

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
        <Text style={styles.valueNum}>
          ${metrics.portfolio_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricBox
          label="Overall Return"
          value={perf?.overall_return}
          desc="Total return of your portfolio."
        />

        <MetricBox
          label="Annualised Return"
          value={perf?.annualized_return}
          desc="Yearly growth rate."
        />
      </View>

      {/* best and worst stock */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Highlights</Text>

        <View style={styles.highlightRow}>
          <View style={[styles.highlightCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.highlightLabel, { color: '#16a34a' }]}>
              Best Performer
            </Text>
            <Text style={styles.highlightValue}>
              {metrics.best_performer}
            </Text>
          </View>

          <View style={[styles.highlightCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.highlightLabel, { color: '#dc2626' }]}>
              Worst Performer
            </Text>
            <Text style={styles.highlightValue}>
              {metrics.worst_performer}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function MetricBox({ label, value, desc }: any) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  );
}

const styles=StyleSheet.create({
card:{backgroundColor:'#f8fafc',borderRadius:16,padding:20,marginVertical:12},
valueRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:16},
valueLabel:{fontWeight:'600',color:'#475569'},
valueNum:{fontWeight:'700',color:'#0b3d91'},
metricsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
metricBox:{width:'48%',backgroundColor:'#fff',borderRadius:10,padding:12,marginBottom:12},
metricLabel:{fontWeight:'600',color:'#0b3d91'},
metricValue:{fontWeight:'700',fontSize:16},
desc:{fontSize:12,color:'#64748b'},
performanceSection:{marginTop:10},
sectionTitle:{fontSize:16,fontWeight:'700',marginBottom:10},
highlightRow:{flexDirection:'row',justifyContent:'space-between'},
highlightCard:{width:'48%',borderRadius:10,padding:12},
highlightLabel:{fontWeight:'700',marginBottom:4},
highlightValue:{fontWeight:'700',fontSize:16,color:'#111'},
error:{color:'red'}
});