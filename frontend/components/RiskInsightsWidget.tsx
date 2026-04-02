import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native'
import { getRiskMetrics, getStockRiskCategories } from '../services/user'
import { storage } from '../utils/storage'

type RiskMetrics = {
  success: boolean
  metrics: {
    volatility: string
    sharpe: string 
    max_drawdown: string
    var_95: string       
  }
  portfolio_value: number
}

type StockRiskItem = {
  ticker: string
  risk_bucket: string
  volatility: number
  max_drawdown: number
  annual_return: number
}

type StockRiskCategories = {
  success: boolean
  categories: Record<string, StockRiskItem[]>
  total: number
}

const CATEGORY_ORDER = [
  'Very Low Risk',
  'Low Risk',
  'Moderate Risk',
  'High Risk',
  'Very High Risk',
]

const CATEGORY_COLORS = {
  'Very Low Risk': '#22c55e',
  'Low Risk': '#84cc16',
  'Moderate Risk': '#eab308',
  'High Risk': '#f97316',
  'Very High Risk': '#ef4444',
};

export default function RiskInsightsWidget() {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null)
  const [stockRiskData, setStockRiskData] = useState<StockRiskCategories | null>(null)
  const [riskPreference, setRiskPreference] = useState('Moderate')
  const [selectedMetric, setSelectedMetric] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getMetricColor(label: string, rawValue: string) {
    const value = parseFloat(rawValue)
    if (label === 'Sharpe Ratio') { if (value >= 1) return '#22c55e'; if (value >= 0.5) return '#eab308'; return '#ef4444' }
    if (label === 'Volatility') { if (value < 15) return '#22c55e'; if (value < 25) return '#eab308'; return '#ef4444' }
    if (label === 'Max Drawdown') { if (value < 10) return '#22c55e'; if (value < 25) return '#eab308'; return '#ef4444' }
    if (label === 'VaR (95%)') { if (value < 2) return '#22c55e'; if (value < 5) return '#eab308'; return '#ef4444' }
    return '#0b3d91'
  }

  function getMetricInsight(label: string, rawValue: string, riskPreference: string) {
    const value = parseFloat(rawValue)
    if (label === 'Sharpe Ratio') {
      if (value < 0.5) return `Your returns are low relative to risk. ${riskPreference === 'Low' ? 'This is not aligned with a conservative strategy.' : 'Consider improving risk-adjusted performance.'}`
      if (value < 1) return 'Your risk-adjusted returns are moderate but could be improved.'
      return 'Strong risk-adjusted performance.'
    }
    if (label === 'Volatility') {
      if (value > 25) return riskPreference === 'Low' ? 'Your portfolio is more volatile than expected for a low-risk profile.' : 'High volatility means larger swings in value.'
      if (value > 15) return 'Moderate volatility — expect some fluctuations.'
      return 'Low volatility — stable portfolio behavior.'
    }
    if (label === 'Max Drawdown') {
      if (value > 25) return riskPreference === 'Low' ? 'Large potential losses are not ideal for a conservative strategy.' : 'Your portfolio has experienced significant drops.'
      if (value > 10) return 'Moderate downside risk during market declines.'
      return 'Limited downside risk historically.'
    }
    if (label === 'VaR (95%)') {
      if (value > 5) return 'Potential for large short-term losses.'
      if (value > 2) return 'Moderate expected losses in worst-case scenarios.'
      return 'Relatively low expected losses.'
    }
    return ''
  }

  function MetricBox({ label, value, desc, onPress }: any) {
    const color = getMetricColor(label, value)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.metricBox, pressed && { opacity: 0.85 }]}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View style={styles.metricRight}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </Pressable>
    )
  }

  useEffect(() => {
    async function fetchRiskMetricsForUser() {
      setLoading(true)
      setError('')
      const userJson = await storage.getItem('user')
      if (userJson) {
        const user = JSON.parse(userJson)
        const [metricsData, categoriesData] = await Promise.all([getRiskMetrics(user.ID), getStockRiskCategories(user.ID)])
        if (metricsData?.success) setRiskData(metricsData)
        else setError('Failed to load risk metrics')
        if (categoriesData?.success) setStockRiskData(categoriesData)
        setRiskPreference(user.Risk || 'Moderate')
      } else setError('User not found')
      setLoading(false)
    }
    fetchRiskMetricsForUser()
  }, [])

  if (loading) return (<View style={styles.card}><ActivityIndicator size="small" /><Text style={styles.loadingText}>Loading risk insights...</Text></View>)
  if (error) return (<View style={styles.card}><Text style={styles.error}>{error}</Text></View>)
  if (!riskData) return (<View style={styles.card}><Text style={styles.emptyText}>No risk metrics available.</Text></View>)

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}><Text style={styles.valueLabel}>Calculated over a one year period using historical data</Text></View>

      <View style={styles.metricsGrid}>
        <MetricBox label="Volatility" value={riskData.metrics.volatility} desc="How much your portfolio value changes over time." onPress={() => setSelectedMetric({ label: 'Volatility', value: riskData.metrics.volatility })} />
        <MetricBox label="Sharpe Ratio" value={riskData.metrics.sharpe} desc="Return vs risk. Higher is better." onPress={() => setSelectedMetric({ label: 'Sharpe Ratio', value: riskData.metrics.sharpe })} />
        <MetricBox label="Max Drawdown" value={riskData.metrics.max_drawdown} desc="Biggest drop from peak to lowest point." onPress={() => setSelectedMetric({ label: 'Max Drawdown', value: riskData.metrics.max_drawdown })} />
        <MetricBox label="VaR (95%)" value={riskData.metrics.var_95} desc="Maximum loss with 95% confidence." onPress={() => setSelectedMetric({ label: 'VaR (95%)', value: riskData.metrics.var_95 })} />
      </View>

      <Modal visible={!!selectedMetric} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMetric?.label}</Text>
            <Text style={styles.modalValue}>{selectedMetric?.value}</Text>
            <Text style={styles.modalInsight}>{selectedMetric ? getMetricInsight(selectedMetric.label, selectedMetric.value, riskPreference) : ''}</Text>
            <Pressable onPress={() => setSelectedMetric(null)} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.riskCategorySection}>
        <Text style={styles.sectionTitle}>Stock Risk Categories</Text>
        <Text style={styles.sectionSubtitle}>Grouped by machine-learned risk profile.</Text>
        
        {CATEGORY_ORDER.map((category) => {
          const stocks = stockRiskData?.categories?.[category] || []
          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#fff';
          return (
            <View key={category} style={[styles.categoryCard, { borderLeftColor: color }]}>
              <Text style={[styles.categoryTitle, { color }]}>{category}</Text>
              {stocks.length ? (
                stocks.map((stock) => (
                  <View key={`${category}-${stock.ticker}`} style={styles.stockRow}>
                    <Text style={styles.stockTicker}>{stock.ticker}</Text>
                    <View style={styles.stockMetrics}>
                      <Text style={styles.stockMetric}>Vol {stock.volatility.toFixed(1)}%</Text>
                      <Text style={styles.stockMetric}>DD {stock.max_drawdown.toFixed(1)}%</Text>
                      <Text style={styles.stockMetric}>Ret {stock.annual_return.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))
              ) : (<Text style={styles.emptyCategoryText}>No stocks in this category.</Text>)}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginVertical: 6, borderWidth: 1, borderColor: '#e7edf5' },
  loadingText: { marginTop: 8, color: '#64748b', fontSize: 13 },
  emptyText: { color: '#64748b', fontSize: 13 },
  valueRow: { marginBottom: 14 },
  valueLabel: { fontWeight: '600', color: '#64748b', fontSize: 13 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricBox: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 12 },
  metricLabel: { fontWeight: '600', color: '#0f172a', fontSize: 13 },
  metricValue: { fontWeight: '800', fontSize: 18, color: '#0b3d91', marginBottom: 4 },
  desc: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chevron: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  modalValue: { fontSize: 22, fontWeight: '800', marginBottom: 10, color: '#0b3d91' },
  modalInsight: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  closeButton: { alignSelf: 'flex-end' },
  closeText: { color: '#2563eb', fontWeight: '600' },
  riskCategorySection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2, color: '#0f172a' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  categoryCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  categoryTitle: { fontWeight: '700', marginBottom: 6, fontSize: 13 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  stockTicker: { fontWeight: '700', color: '#0f172a' },
  stockMetrics: { flexDirection: 'row', gap: 10 },
  stockMetric: { fontSize: 11, color: '#475569', fontWeight: '600' },
  emptyCategoryText: { fontSize: 12, color: '#94a3b8' },
  error: { color: '#ef4444', fontWeight: '600' },
})