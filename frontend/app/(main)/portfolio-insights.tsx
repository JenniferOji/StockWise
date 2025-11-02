import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { PieChart } from 'react-native-chart-kit'
import { INSIGHTS } from '../../constants/insights'
import {NAV_HEIGHT} from '../../constants/layout'

// https://www.npmjs.com/package/react-native-pie-chart
export default function PortfolioInsights() {
	const total = INSIGHTS.reduce((s, c) => s + c.allocation, 0)
		const items = INSIGHTS.slice().sort((a, b) => b.allocation - a.allocation)
		const screenWidth = Dimensions.get('window').width - 32
		const chartData = items.map((it) => ({ name: it.sector, population: it.allocation, color: it.color || '#3b82f6', legendFontColor: '#444', legendFontSize: 12 }))
		const chartConfig = { backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff', color: (opacity = 1) => `rgba(59,130,246,${opacity})`, labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})` }

		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Sector allocations</Text>
					<Text style={styles.subtitle}>{`Total allocation: ${total}%`}</Text>
				</View>
				<View style={styles.chartWrap}>
					<View style={[styles.chartCard, { width: screenWidth }] }>
						<PieChart data={chartData} width={screenWidth - 24} height={220} chartConfig={chartConfig} accessor={'population'} backgroundColor={'transparent'} paddingLeft={'15'} absolute />
					</View>
				</View>
			</SafeAreaView>
		)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: NAV_HEIGHT },
	header: { padding: 16 },
	title: { fontSize: 20, fontWeight: '700' },
	subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
	list: { padding: 12, paddingBottom: 96 },
		chartWrap: { alignItems: 'center', paddingVertical: 12 },
	card: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	chartCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 12,
		marginVertical: 8,
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
	},
	cardLeft: { flex: 1, minWidth: 0 },
	symbol: { fontSize: 16, fontWeight: '700' },
	company: { fontSize: 12, color: '#666', marginTop: 4 },
	cardRight: { width: 160, alignItems: 'flex-end' },
	barBackground: { width: '100%', height: 10, backgroundColor: '#eef2f6', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
	barFill: { height: 10, backgroundColor: '#3b82f6' },
	pct: { fontSize: 12, color: '#333' },
})
