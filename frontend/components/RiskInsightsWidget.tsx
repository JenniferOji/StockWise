import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { getRiskMetrics, getStockRiskCategories } from '../services/user'
import { storage } from '../utils/storage'

type RiskMetrics = {
  success: boolean
  metrics: {
    volatility: string
    sharpe_ratio: string
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
  'Very Low Risk': '#4ade80',
  'Low Risk': '#a3e635',
  'Moderate Risk': '#facc15',
  'High Risk': '#f87171',
  'Very High Risk': '#ef4444',
};


export default function RiskInsightsWidget() {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null)
  const [stockRiskData, setStockRiskData] = useState<StockRiskCategories | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchRiskMetricsForUser() {
      setLoading(true)
      setError('')

      const userJson = await storage.getItem('user')

      if (userJson) {
        const user = JSON.parse(userJson)

        const [metricsData, categoriesData] = await Promise.all([
          getRiskMetrics(user.ID),
          getStockRiskCategories(user.ID),
        ])

        
        if (metricsData?.success) setRiskData(metricsData)
        else setError('Failed to load risk metrics')

        if (categoriesData?.success) {
          console.log('Stock Risk Categories Response:', categoriesData);
          setStockRiskData(categoriesData)
          console.log("API categories keys:", Object.keys(stockRiskData?.categories || {}));

        }
      } else {
        setError('User not found')
      }

      setLoading(false)
    }

    fetchRiskMetricsForUser()
  }, [])

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" />
        <Text>Loading risk insights...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>{error}</Text>
      </View>
    )
  }

  if (!riskData) {
    return (
      <View style={styles.card}>
        <Text>No risk metrics available.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      {/* <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
        <Text style={styles.valueNum}>
          ${riskData.portfolio_value.toLocaleString()}
        </Text>
      </View> */}

      <View style={styles.metricsGrid}>
        <MetricBox
          label="Volatility"
          value={riskData.metrics.volatility}
          desc="How much your portfolio value changes over time."
        />

        <MetricBox
          label="Sharpe Ratio"
          value={riskData.metrics.sharpe_ratio}
          desc="Return vs risk. Higher is better."
        />

        <MetricBox
          label="Max Drawdown"
          value={riskData.metrics.max_drawdown}
          desc="Biggest drop from peak to lowest point."
        />

        <MetricBox
          label="VaR (95%)"
          value={riskData.metrics.var_95}
          desc="Maximum loss with 95% confidence."
        />
      </View>

      <View style={styles.riskCategorySection}>
        <Text style={styles.sectionTitle}>Stock Risk Categories</Text>
        <Text style={styles.sectionSubtitle}>
          Grouped by machine-learned risk profile.
        </Text>
        
        {CATEGORY_ORDER.map((category) => {
          const stocks = stockRiskData?.categories?.[category] || []
          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#fff';

          console.log('Rendering category:', category, 'Stocks:', stocks);

          return (
            <View
              key={category}
              style={[styles.categoryCard, { backgroundColor: color + '20' }]}
            >
              <Text style={[styles.categoryTitle, { color }]}>{category}</Text>

              {stocks.length ? (
                stocks.map((stock) => (
                  <View key={`${category}-${stock.ticker}`} style={styles.stockRow}>
                    <Text style={styles.stockTicker}>{stock.ticker}</Text>
                    <View style={styles.stockMetrics}>
                      <Text style={styles.stockMetric}>
                        Volatility {stock.volatility.toFixed(1)}%
                      </Text>
                      <Text style={styles.stockMetric}>
                        Max Drawdown {stock.max_drawdown.toFixed(1)}%
                      </Text>
                      <Text style={styles.stockMetric}>
                        Return {stock.annual_return.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyCategoryText}>
                  No stocks in this category.
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function MetricBox({ label, value, desc }: any) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
  },

  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  valueLabel: { fontWeight: '600', color: '#475569' },
  valueNum: { fontWeight: '700', color: '#0b3d91' },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  metricBox: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  metricLabel: { fontWeight: '600', color: '#0b3d91' },
  metricValue: { fontWeight: '700', fontSize: 16 },
  desc: { fontSize: 12, color: '#64748b' },

  riskCategorySection: { marginTop: 10 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },

  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  categoryTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },

  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  stockTicker: {
    fontWeight: '600',
  },

  stockMetrics: {
    flexDirection: 'row',
    gap: 10,
  },

  stockMetric: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },

  emptyCategoryText: {
    fontSize: 12,
    color: '#64748b',
  },

  error: {
    color: 'red',
  },
})