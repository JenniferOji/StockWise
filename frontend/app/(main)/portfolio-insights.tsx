import React, { useEffect, useState, useMemo} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { PieChart } from 'react-native-chart-kit'
import { INSIGHTS } from '../../constants/insights'
import {NAV_HEIGHT} from '../../constants/layout'
import { getUserStocks } from '../../services/user';
import * as SecureStore from 'expo-secure-store';
import { STOCKS } from '../../constants/stocks';

type BackendStock = {
	ID: number;
	user_id: number;
	symbol: string;
	company_name: string;
	quantity: number;
	sector: string;
};

// https://www.npmjs.com/package/react-native-pie-chart
export default function PortfolioInsights() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	
	// function to load the users stocks from the backend  
	const loadUserStocks = async () => {
		// get user from secure store 
		try {
		let userJson = null;
		try {
			userJson = await SecureStore.getItemAsync('user');
		} catch (secureStoreError) {
			if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
			userJson = (globalThis as any).localStorage.getItem('user');
			}
		}
		// if we have user data, parse and use it to get the stocks
		if (userJson) {
			const user = JSON.parse(userJson);
			const loadedStocks = await getUserStocks(user.ID);
			// validate loadedStocks is an array before setting state
			if (loadedStocks && Array.isArray(loadedStocks)) {
				setStocks(loadedStocks);
			} else {
				console.error('Invalid stocks data:', loadedStocks);
				setStocks([]);
			}
		}
		} catch (err) {
			console.error('Error loading stocks:', err);
		}
	};

	// when the page loads it will get the users stocks from the backend and display it 
	useEffect(() => {
		loadUserStocks();
	}, []);

	// total is the sum of allocation percentages and is shown in the header
	const totalShares = useMemo(() => {
		const total = stocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
		return total;
	}, [stocks])
	// sectorData groups shares by sector - acc is accumulator, stock is current item
	const sectorData = useMemo(() => {
		const data = stocks.reduce((acc, stock) => {
			if (!acc[stock.sector]) {
				acc[stock.sector] = 0
			}
			acc[stock.sector] += (stock.quantity || 0)
			return acc
		}, {} as Record<string, number>);
		console.log('Sector data:', data);
		return data;
	}, [stocks])
	// sectorAllocations maps sectorData to an array of objects with sector and allocation %
	const sectorAllocations = useMemo(() => {
		const allocations = Object.entries(sectorData).map(([sector, shares]) => ({
			sector,
			allocation: totalShares > 0 ? (shares / totalShares) * 100 : 0
		}));
		console.log('Sector allocations:', allocations);
		return allocations;
	}, [sectorData, totalShares])
	const total = useMemo(() => sectorAllocations.reduce((s, c) => s + c.allocation, 0), [sectorAllocations])
	// measure available width and subtract padding so the chart fits the card
	const screenWidth = Dimensions.get('window').width - 32 
	// maps the model (sorted list of items) to the piechart 
	const chartData = useMemo(() => {
		const data = sectorAllocations.map((item) => {
			const sectorColor = INSIGHTS.find(insight => insight.sector === item.sector)?.color || '#3b82f6'
			return { name: item.sector, population: item.allocation, color: sectorColor, legendFontColor: '#444', legendFontSize: 12 }
		});
		return data;
	}, [sectorAllocations])
	// chartConfig controls gradients and label coloring
	const chartConfig = { backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff', color: (opacity = 1) => `rgba(59,130,246,${opacity})`, labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})` }

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Sector allocations</Text>
				<Text style={styles.subtitle}>{`Total allocation: ${total.toFixed(1)}%`}</Text>
			</View>
			<View style={styles.chartWrap}>
				<View style={[styles.chartCard, { width: screenWidth }] }>
					{stocks.length > 0 && chartData.length > 0 ? (
						<PieChart data={chartData} width={screenWidth - 24} height={220} chartConfig={chartConfig} accessor={'population'} backgroundColor={'transparent'} paddingLeft={'15'} />
					) : (
						<Text style={{ padding: 20, color: '#666' }}>No stock data available</Text>
					)}
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
