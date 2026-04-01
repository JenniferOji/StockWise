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
  const profitLoss = metrics.profit_loss;
  const isProfit = profitLoss >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
        <Text style={styles.valueNum}>
          €{metrics.portfolio_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricBox
          label="Overall Return"
          value={perf?.overall_return}
          desc="Total return of your portfolio."
        />
        <MetricBox
          label="Total Invested"
          value={`€${metrics.total_invested?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          desc="Amount you have invested."
        />
      </View>

      <View style={[styles.profitBanner, { backgroundColor: isProfit ? '#dcfce7' : '#fee2e2' }]}>
        <Text style={[styles.profitLabel, { color: isProfit ? '#16a34a' : '#dc2626' }]}>
          {isProfit ? 'Total Profit' : 'Total Loss'}
        </Text>
        <Text style={[styles.profitValue, { color: isProfit ? '#16a34a' : '#dc2626' }]}>
          {isProfit ? '+' : ''}€{profitLoss?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>

      {/* best and worst stock */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Highlights</Text>
        <Text style={styles.sectionSubtitle}>Based on annualised return</Text>

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

      {/* Holdings breakdown for each stock */}
      {metrics?.metrics?.price_comparison && (
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Holdings Breakdown</Text>
          {Object.entries(metrics.metrics.price_comparison).map(([ticker, data]: [string, any]) => {
            const isPositive = !data.return_pct.startsWith('-');
            const shares = metrics.metrics.returns_by_ticker?.[ticker]; // for display
            const profitLoss = (data.current_price - data.purchase_price);

            return (
              <View key={ticker} style={styles.holdingCard}>
                <View style={styles.holdingHeader}>
                  <Text style={styles.holdingTicker}>{ticker}</Text>
                  <Text style={[styles.holdingReturn, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
                    {isPositive ? '+' : ''}{data.return_pct}
                  </Text>
                </View>
                <View style={styles.holdingRow}>
                  <View style={styles.holdingCol}>
                    <Text style={styles.holdingSubLabel}>Avg. Buy Price</Text>
                    <Text style={styles.holdingSubValue}>€{data.purchase_price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.holdingCol}>
                    <Text style={styles.holdingSubLabel}>Current Price</Text>
                    <Text style={styles.holdingSubValue}>€{data.current_price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.holdingCol}>
                    <Text style={styles.holdingSubLabel}>Per Share</Text>
                    <Text style={[styles.holdingSubValue, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
                      {isPositive ? '+' : ''}€{profitLoss.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
  profitBanner:{borderRadius:10,padding:14,marginBottom:12,alignItems:'center'},
  profitLabel:{fontWeight:'600',fontSize:13},
  profitValue:{fontWeight:'700',fontSize:18,marginTop:2},
  performanceSection:{marginTop:10},
  sectionTitle:{fontSize:16,fontWeight:'700',marginBottom:10},
  highlightRow:{flexDirection:'row',justifyContent:'space-between'},
  highlightCard:{width:'48%',borderRadius:10,padding:12},
  highlightLabel:{fontWeight:'700',marginBottom:4},
  highlightValue:{fontWeight:'700',fontSize:16,color:'#111'},
  error:{color:'red'},
  sectionSubtitle:{fontSize:12,color:'#64748b',marginBottom:10},
  breakdownSection: { marginTop: 16 },
  holdingCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  holdingTicker: { fontWeight: '700', fontSize: 15, color: '#0b3d91' },
  holdingReturn: { fontWeight: '700', fontSize: 15 },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  holdingCol: { alignItems: 'center', flex: 1 },
  holdingSubLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  holdingSubValue: { fontWeight: '600', fontSize: 13 },
});