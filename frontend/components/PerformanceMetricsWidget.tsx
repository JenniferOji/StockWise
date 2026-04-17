import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getPerformanceMetrics } from '@/services/analytics';
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
      <View style={styles.sectionCard}>
        <ActivityIndicator size="small" />
        <Text>Loading performance metrics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.sectionCard}>
        <Text>No performance metrics available.</Text>
      </View>
    );
  }

  const perf = metrics.metrics;
  const profitLoss = metrics.profit_loss;
  const isProfit = profitLoss >= 0;

  const best = metrics.best_performer;
  const worst = metrics.worst_performer;

  return (
    <View style={styles.container}>
      <View style={styles.topCard}>
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

        <View style={[styles.profitBanner, isProfit ? styles.profitBannerPositive : styles.profitBannerNegative]}>
          <Text style={[styles.profitLabel, isProfit ? styles.profitLabelPositive : styles.profitLabelNegative]}>
            {isProfit ? 'Portfolio Profit' : 'Portfolio Loss'}
          </Text>
          <Text style={[styles.profitValue, isProfit ? styles.profitValuePositive : styles.profitValueNegative]}>
            {isProfit ? '+' : ''}€{profitLoss?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* best and worst stock */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Performance Highlights</Text>
        <Text style={styles.sectionSubtitle}>Based on your holdings performance</Text>

        <View style={styles.highlightRow}>
          <View style={[styles.highlightCard, styles.highlightCardPositive]}>
            <View style={styles.highlightHead}>
              <Text style={[styles.highlightLabel, styles.highlightLabelPositive]}>Best Performer</Text>
              <Text style={[styles.highlightPill, styles.highlightPillPositive]}>
                +{Math.abs(best?.return_pct || 0).toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.highlightValue}>{best?.symbol}</Text>
            <Text style={styles.highlightBestValue}>
              +€{Math.abs(best?.profit || 0).toFixed(2)}
            </Text>
          </View>

          <View style={[styles.highlightCard, styles.highlightCardNegative]}>
            <View style={styles.highlightHead}>
              <Text style={[styles.highlightLabel, styles.highlightLabelNegative]}>Worst Performer</Text>
              <Text style={[styles.highlightPill, styles.highlightPillNegative]}>
                -{Math.abs(worst?.return_pct || 0).toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.highlightValue}>{worst?.symbol}</Text>
            <Text style={styles.highlightWorstValue}>
              -€{Math.abs(worst?.profit || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Holdings breakdown for each stock */}
      {metrics?.metrics?.price_comparison && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Holdings Breakdown</Text>
          {Object.entries(metrics.metrics.price_comparison).map(([ticker, data]: [string, any]) => {
            const isPositive = !data.return_pct.startsWith('-');
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

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#f3f6fb', padding:12 },
  topCard:{ backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:12, elevation:2, shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.05, shadowRadius:6 },
  sectionCard:{ backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:12, elevation:2, shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.05, shadowRadius:6 },
  valueRow:{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  valueLabel:{ fontWeight:'600', color:'#64748b', fontSize:13 },
  valueNum:{ fontWeight:'700', color:'#0b3d91', fontSize:18 },
  metricsGrid:{ flexDirection:'row', justifyContent:'space-between' },
  metricBox:{ width:'48%', backgroundColor:'#f8fafc', borderRadius:12, padding:12 },
  metricLabel:{ fontWeight:'600', color:'#64748b', fontSize:12 },
  metricValue:{ fontWeight:'700', fontSize:15, marginTop:2 },
  desc:{ fontSize:11, color:'#94a3b8', marginTop:2 },
  profitBanner:{ borderRadius:14, paddingHorizontal:14, paddingVertical:12, marginTop:14, borderWidth:1 },
  profitBannerPositive:{ backgroundColor:'#ecfdf3', borderColor:'#bbf7d0' },
  profitBannerNegative:{ backgroundColor:'#fff1f2', borderColor:'#fecdd3' },
  profitLabel:{ fontWeight:'700', fontSize:12, letterSpacing:0.4, textTransform:'uppercase' },
  profitLabelPositive:{ color:'#15803d' },
  profitLabelNegative:{ color:'#b91c1c' },
  profitValue:{ fontWeight:'700', fontSize:21, marginTop:4, lineHeight:25 },
  profitValuePositive:{ color:'#16a34a' },
  profitValueNegative:{ color:'#dc2626' },
  sectionTitle:{ fontSize:15, fontWeight:'700', marginBottom:8, color:'#111' },
  sectionSubtitle:{ fontSize:12, color:'#64748b', marginBottom:10 },
  highlightRow:{ flexDirection:'row', justifyContent:'space-between', gap:10 },
  highlightCard:{ flex:1, borderRadius:14, padding:12, borderWidth:1 },
  highlightCardPositive:{ backgroundColor:'#ecfdf3', borderColor:'#bbf7d0' },
  highlightCardNegative:{ backgroundColor:'#fff1f2', borderColor:'#fecdd3' },
  highlightHead:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  highlightLabel:{ fontWeight:'700', fontSize:12, letterSpacing:0.3, textTransform:'uppercase' },
  highlightLabelPositive:{ color:'#15803d' },
  highlightLabelNegative:{ color:'#b91c1c' },
  highlightPill:{ fontSize:11, fontWeight:'700', paddingHorizontal:8, paddingVertical:3, borderRadius:999, overflow:'hidden' },
  highlightPillPositive:{ color:'#166534', backgroundColor:'#dcfce7' },
  highlightPillNegative:{ color:'#991b1b', backgroundColor:'#ffe4e6' },
  highlightValue:{ fontWeight:'700', fontSize:19, lineHeight:23, color:'#0f172a' },
  highlightWorstValue:{ color:'#dc2626', fontWeight:'700', marginTop:2, fontSize:14 },
  highlightBestValue:{ color:'#16a34a', fontWeight:'700', marginTop:2, fontSize:14 },
  breakdownSection:{ marginTop:4 },
  holdingCard:{ backgroundColor:'#f8fafc', borderRadius:12, padding:12, marginBottom:8 },
  holdingHeader:{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  holdingTicker:{ fontWeight:'700', fontSize:14, color:'#0b3d91' },
  holdingReturn:{ fontWeight:'700', fontSize:13 },
  holdingRow:{ flexDirection:'row', justifyContent:'space-between' },
  holdingCol:{ alignItems:'center', flex:1 },
  holdingSubLabel:{ fontSize:10, color:'#94a3b8', marginBottom:2 },
  holdingSubValue:{ fontWeight:'600', fontSize:12 },
  error:{ color:'red' },
});