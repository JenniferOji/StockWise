import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native'
import { getRiskMetrics, getStockRiskCategories } from '../services/analytics'
import { storage } from '../utils/storage'
import { CATEGORY_COLORS, CATEGORY_ORDER, METRIC_THRESHOLDS } from '../constants/riskConstants'
import { getActiveBand, getMetricInsight } from '../utils/riskUtils'
import type { StockRiskCategoriesLike, StockRiskLike } from '../utils/riskUtils'

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

type StockRiskCategories = StockRiskCategoriesLike & {
  success: boolean
  total: number
  portfolio_risk: string
}

export default function RiskInsightsWidget() {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null)
  const [stockRiskData, setStockRiskData] = useState<StockRiskCategories | null>(null)
  const [riskPreference, setRiskPreference] = useState('Moderate Risk')
  const [portfolioRisk, setPortfolioRisk] = useState<string>('')
  const [selectedMetric, setSelectedMetric] = useState<any>(null)
  const [sortMetric, setSortMetric] = useState<'Volatility' | 'Drawdown' | 'Return' | null>(null)
  const [sortDirection, setSortDirection] = useState<'High to Low' | 'Low to High'>('High to Low')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // returns the color for metric based on its risk band
  function getMetricColor(label: string, rawValue: string) {
    const band = getActiveBand(label, rawValue, riskPreference)
    return band.color
  }

  // renders the threshold scale showing metric bands and highlights the active one
  function ThresholdScale({ label, riskPreference, rawValue }: { label: string; riskPreference: string; rawValue: string }) {
    const profile = METRIC_THRESHOLDS[label]?.[riskPreference]
    const activeBand = getActiveBand(label, rawValue, riskPreference)
    if (!profile) return null

    return (
      <View style={styles.scaleContainer}>
        {profile.bands.map((band) => {
          const isActive = activeBand.label === band.label
          return (
            <View key={band.label} style={[styles.scaleBand, isActive && styles.scaleBandActive, { borderColor: band.color }]}>
              <View style={[styles.scaleDot, { backgroundColor: band.color }]} />
              <View>
                <Text style={[styles.scaleLabel, { color: band.color }]}>{band.label}</Text>
                <Text style={styles.scaleRange}>{band.range}</Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  // renders the single metric card with its color, value, and its description
  function MetricBox({ label, value, desc, onPress }: any) {
    const color = getMetricColor(label, value)
    return (
      <Pressable onPress={onPress} style={({ pressed, hovered }) => [styles.metricBox, hovered && styles.metricBoxHover, pressed && { opacity: 0.85 }]}>
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

  // fetches the risk metrics and stock categories on mount
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
        if (categoriesData?.success) {
          setStockRiskData(categoriesData)
          setPortfolioRisk(categoriesData.portfolio_risk)
        }
        setRiskPreference(user.Risk)
      } else setError('User not found')
      setLoading(false)
    }
    fetchRiskMetricsForUser()
  }, [])

  if (loading) return (<View style={styles.card}><ActivityIndicator size="small" /><Text style={styles.loadingText}>Loading risk insights...</Text></View>)
  if (error) return (<View style={styles.card}><Text style={styles.error}>{error}</Text></View>)
  if (!riskData) return (<View style={styles.card}><Text style={styles.emptyText}>No risk metrics available.</Text></View>)

  const sortSummary = sortMetric === null
    ? 'Showing default order - sorting applies within each risk category.'
    : `Sorted by ${sortMetric} (${sortDirection}).`
  const hasMetricSelected = sortMetric !== null
  const portfolioRiskColor = CATEGORY_COLORS[portfolioRisk as keyof typeof CATEGORY_COLORS] || '#0b3d91'

  // sorts stocks by selected metric and direction
  function getSortedStocks(stocks: StockRiskLike[]) {
    const sortedStocks = [...stocks]
    if (sortMetric === null) return sortedStocks

    const isHighToLow = sortDirection === 'High to Low'

    if (sortMetric === 'Volatility') {
      sortedStocks.sort((a, b) => isHighToLow ? b.volatility - a.volatility : a.volatility - b.volatility)
    } else if (sortMetric === 'Drawdown') {
      sortedStocks.sort((a, b) => isHighToLow ? b.max_drawdown - a.max_drawdown : a.max_drawdown - b.max_drawdown)
    } else {
      sortedStocks.sort((a, b) => isHighToLow ? b.annual_return - a.annual_return : a.annual_return - b.annual_return)
    }

    return sortedStocks
  }

  // renders the complete risk insights widget with metrics and categorised stocks
  return (
    <View style={styles.card}>
      <View style={styles.valueRow}><Text style={styles.valueLabel}>Calculated over a one year period using historical data</Text></View>
      {portfolioRisk && (
        <View
          style={[
            styles.portfolioRiskCard,
            {
              borderLeftColor: portfolioRiskColor,
              shadowColor: portfolioRiskColor,
            },
          ]}
        >
          <View style={styles.portfolioRiskTop}>
            <Text style={styles.portfolioRiskLabel}>Overall Portfolio Risk</Text>
          </View>
          <View
            style={[
              styles.portfolioRiskBadge,
              {
                backgroundColor: `${portfolioRiskColor}1A`,
                borderColor: `${portfolioRiskColor}55`,
              },
            ]}
          >
            <Text style={[styles.portfolioRiskValue, { color: portfolioRiskColor }]}>{portfolioRisk}</Text>
          </View>
        </View>
      )}

      {/* metric cards with insights modal on press */}
      <View style={styles.metricsGrid}>
        <MetricBox label="Volatility" value={riskData.metrics.volatility} desc="How much your portfolio value changes over time." onPress={() => setSelectedMetric({ label: 'Volatility', value: riskData.metrics.volatility })} />
        <MetricBox label="Sharpe Ratio" value={riskData.metrics.sharpe} desc="Return vs risk. Higher is better." onPress={() => setSelectedMetric({ label: 'Sharpe Ratio', value: riskData.metrics.sharpe })} />
        <MetricBox label="Max Drawdown" value={riskData.metrics.max_drawdown} desc="Biggest drop from peak to lowest point." onPress={() => setSelectedMetric({ label: 'Max Drawdown', value: riskData.metrics.max_drawdown })} />
        <MetricBox label="VaR (95%)" value={riskData.metrics.var_95} desc="Maximum loss with 95% confidence." onPress={() => setSelectedMetric({ label: 'VaR (95%)', value: riskData.metrics.var_95 })} />
      </View>

      {/* modal showing the insights for the selected metric */}
      <Modal visible={!!selectedMetric} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedMetric?.label}</Text>
              <Text style={styles.modalValue}>{selectedMetric?.value}</Text>
              {(() => {
                if (!selectedMetric) return null
                const insight = getMetricInsight(selectedMetric.label, selectedMetric.value, riskPreference)
                return (
                  <>
                    <Text style={styles.modalWhat}>{insight.what}</Text>
                    <ThresholdScale label={selectedMetric.label} riskPreference={riskPreference} rawValue={selectedMetric.value} />
                    <Text style={styles.modalInsight}>{insight.score}</Text>
                    {insight.tip !== '' && <Text style={styles.modalTip}>{insight.tip}</Text>}
                  </>
                )
              })()}
              <Pressable onPress={() => setSelectedMetric(null)} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* stock categories with sorting options */}
      <View style={styles.riskCategorySection}>
        <Text style={styles.sectionTitle}>Stock Risk Categories</Text>
        <Text style={styles.sectionSubtitle}>Grouped by machine-learned risk profile</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          <Pressable
            onPress={() => setSortMetric('Volatility')}
            style={({ hovered, pressed }) => [
              styles.sortChip,
              hovered && styles.sortChipHover,
              pressed && { opacity: 0.9 },
              sortMetric === 'Volatility' && styles.sortChipActive,
            ]}
          >
            <Text style={[styles.sortChipText, sortMetric === 'Volatility' && styles.sortChipTextActive]}>
              {sortMetric === 'Volatility' ? `Volatility ${sortDirection === 'High to Low' ? '↓' : '↑'}` : 'Volatility'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortMetric('Drawdown')}
            style={({ hovered, pressed }) => [
              styles.sortChip,
              hovered && styles.sortChipHover,
              pressed && { opacity: 0.9 },
              sortMetric === 'Drawdown' && styles.sortChipActive,
            ]}
          >
            <Text style={[styles.sortChipText, sortMetric === 'Drawdown' && styles.sortChipTextActive]}>
              {sortMetric === 'Drawdown' ? `Drawdown ${sortDirection === 'High to Low' ? '↓' : '↑'}` : 'Drawdown'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortMetric('Return')}
            style={({ hovered, pressed }) => [
              styles.sortChip,
              hovered && styles.sortChipHover,
              pressed && { opacity: 0.9 },
              sortMetric === 'Return' && styles.sortChipActive,
            ]}
          >
            <Text style={[styles.sortChipText, sortMetric === 'Return' && styles.sortChipTextActive]}>
              {sortMetric === 'Return' ? `Return ${sortDirection === 'High to Low' ? '↓' : '↑'}` : 'Return'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortDirection('High to Low')}
            style={({ hovered, pressed }) => [
              styles.directionChip,
              hovered && styles.directionChipHover,
              pressed && { opacity: 0.9 },
              !hasMetricSelected && styles.directionChipIdle,
              hasMetricSelected && sortDirection === 'High to Low' && styles.directionChipActive,
            ]}
          >
            <Text
              style={[
                styles.directionChipText,
                !hasMetricSelected && styles.directionChipTextIdle,
                hasMetricSelected && sortDirection === 'High to Low' && styles.directionChipTextActive,
              ]}
            >
              High to Low
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortDirection('Low to High')}
            style={({ hovered, pressed }) => [
              styles.directionChip,
              hovered && styles.directionChipHover,
              pressed && { opacity: 0.9 },
              !hasMetricSelected && styles.directionChipIdle,
              hasMetricSelected && sortDirection === 'Low to High' && styles.directionChipActive,
            ]}
          >
            <Text
              style={[
                styles.directionChipText,
                !hasMetricSelected && styles.directionChipTextIdle,
                hasMetricSelected && sortDirection === 'Low to High' && styles.directionChipTextActive,
              ]}
            >
              Low to High
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSortMetric(null)
              setSortDirection('High to Low')
            }}
            style={({ hovered, pressed }) => [
              styles.resetChip,
              hovered && styles.resetChipHover,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.resetChipText}>Reset</Text>
          </Pressable>
        </ScrollView>

        <Text style={styles.sortMicrocopy}>{sortSummary}</Text>
        <Text style={styles.metricLegend}>Vol = Volatility • DD = Max Drawdown • Ret = Annual Return</Text>
        
        {/* renders each stock category with its stocks sorted by the selected metric and colored by risk band */}
        {CATEGORY_ORDER.map((category) => {
          const categoryStocks = stockRiskData?.categories?.[category] || []
          const stocks = getSortedStocks(categoryStocks)

          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#fff'

          return (
            <View key={category} style={[styles.categoryCard, { borderLeftColor: color }]}>
              <Text style={[styles.categoryTitle, { color }]}>{category}</Text>
              {stocks.length ? (
                stocks.map((stock: StockRiskLike) => {
                  const stockLabel = stock.symbol || stock.ticker || 'Unknown'

                  return (
                    <View key={`${category}-${stockLabel}`} style={styles.stockRow}>
                      <Text style={styles.stockTicker}>{stockLabel}</Text>
                      <View style={styles.stockMetrics}>
                        <Text style={styles.stockMetric}>Vol {stock.volatility.toFixed(1)}%</Text>
                        <Text style={styles.stockMetric}>DD {stock.max_drawdown.toFixed(1)}%</Text>
                        <Text style={styles.stockMetric}>Ret {stock.annual_return.toFixed(1)}%</Text>
                      </View>
                    </View>
                  )
                })
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
  metricBoxHover: { transform: [{ translateY: -4 }, { scale: 1.01 }], shadowColor: '#0f172a', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 6 },
  metricLabel: { fontWeight: '600', color: '#0f172a', fontSize: 13 },
  metricValue: { fontWeight: '800', fontSize: 18, color: '#0b3d91', marginBottom: 4 },
  desc: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chevron: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#0f172a' },
  modalValue: { fontSize: 22, fontWeight: '800', marginBottom: 10, color: '#0b3d91' },
  modalWhat: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 14 },
  modalInsight: { fontSize: 13, color: '#0f172a', lineHeight: 20, marginBottom: 10, fontWeight: '500' },
  modalTip: { fontSize: 12, color: '#2563eb', lineHeight: 18, marginBottom: 10, fontStyle: 'italic' },
  scaleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  scaleBand: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  scaleBandActive: { backgroundColor: '#f0f9ff', borderWidth: 1.5 },
  scaleDot: { width: 7, height: 7, borderRadius: 4 },
  scaleLabel: { fontSize: 11, fontWeight: '700' },
  scaleRange: { fontSize: 10, color: '#94a3b8' },
  closeButton: { alignSelf: 'flex-end', marginTop: 16 },
  closeText: { color: '#2563eb', fontWeight: '600' },
  riskCategorySection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2, color: '#0f172a' },
  sectionSubtitle: { fontSize: 11, color: '#64748b', marginBottom: 10, fontWeight: '400' },
  sortRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  sortChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: '#f1f5f9' },
  sortChipHover: { backgroundColor: '#e6eef9' },
  sortChipActive: { backgroundColor: '#dbeafe' },
  sortChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  sortChipTextActive: { color: '#0b3d91' },
  directionChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  directionChipHover: { backgroundColor: '#eef2ff', borderColor: '#a5b4fc' },
  directionChipActive: { backgroundColor: '#e0e7ff', borderColor: '#818cf8' },
  directionChipIdle: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  directionChipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  directionChipTextActive: { color: '#3730a3' },
  directionChipTextIdle: { color: '#94a3b8' },
  resetChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  resetChipHover: { backgroundColor: '#ffe4e6' },
  resetChipText: { fontSize: 12, color: '#be123c', fontWeight: '700' },
  sortMicrocopy: { fontSize: 11, color: '#64748b', marginBottom: 8, marginTop: 4 },
  metricLegend: { fontSize: 11, color: '#475569', marginBottom: 10, marginTop: -2, fontWeight: '600' },
  categoryCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  categoryTitle: { fontWeight: '700', marginBottom: 6, fontSize: 13 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  stockTicker: { fontWeight: '700', color: '#0f172a' },
  stockMetrics: { flexDirection: 'row', gap: 10 },
  stockMetric: { fontSize: 11, color: '#475569', fontWeight: '600' },
  emptyCategoryText: { fontSize: 12, color: '#94a3b8' },
  error: { color: '#ef4444', fontWeight: '600' },
  portfolioRiskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0b3d91',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },

  portfolioRiskTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },

  portfolioRiskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  portfolioRiskLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  portfolioRiskBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  portfolioRiskValue: {
    fontSize: 18,
    fontWeight: '800',
  },

})
