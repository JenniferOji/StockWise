import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { INSIGHTS } from '../constants/insights';
import { getUserStocks } from '../services/user';
import { storage } from '../utils/storage';

// the structure of a stock when returned from the backend 
type BackendStock = {
	ID: number;
	user_id: number;
	symbol: string;
	company_name: string;
	quantity: number;
	sector: string;
};

// component fro portfolio insigths
export default function PortfolioInsightsWidget() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	const [selectedSector, setSelectedSector] = useState<string | null>(null);
	
	// function to load the users stocks from the backend  
	const loadUserStocks = async () => {
		try {
			const userJson = await storage.getItem('user');
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

	// Load stocks when component mounts
	useEffect(() => {
		loadUserStocks();
	}, []);

	// total is the sum of allocation percentages
	const totalShares = useMemo(() => {
		const total = stocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
		return total;
	}, [stocks]);

	// sectorData groups shares by sector
	const sectorData = useMemo(() => {
		const data = stocks.reduce((acc, stock) => {
			if (!acc[stock.sector]) {
				acc[stock.sector] = 0;
			}
			acc[stock.sector] += (stock.quantity || 0);
			return acc;
		}, {} as Record<string, number>);
		return data;
	}, [stocks]);

	// sectorAllocations maps sectorData to an array of objects with sector and allocation %
	const sectorAllocations = useMemo(() => {
		const allocations = Object.entries(sectorData).map(([sector, shares]) => ({
			sector,
			allocation: totalShares > 0 ? (shares / totalShares) * 100 : 0
		}));
		return allocations;
	}, [sectorData, totalShares]);

	// total allocation percentage
	const total = useMemo(() => sectorAllocations.reduce((s, c) => s + c.allocation, 0), [sectorAllocations]);
	
	// measures the available width with padding subtracted so the chart fits the card
	const screenWidth = Dimensions.get('window').width - 48;
	
	// maps the sorted list of items to the piechart 
	const chartData = useMemo(() => {
		const data = sectorAllocations.map((item) => {
			const sectorColor = INSIGHTS.find(insight => insight.sector === item.sector)?.color || '#3b82f6';
			return { name: item.sector, population: item.allocation, color: sectorColor, legendFontColor: '#444', legendFontSize: 12 };
		});
		return data;
	}, [sectorAllocations]);

	// chartConfig controls gradients and label coloring
	const chartConfig = { 
		backgroundGradientFrom: '#ffffff', 
		backgroundGradientTo: '#ffffff', 
		color: (opacity = 1) => `rgba(59,130,246,${opacity})`, 
		labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})` 
	};

	// when a sector is selected this gets the stocks and allocation for that sector
	const selectedSectorData = useMemo(() => {
		if (!selectedSector) return null;
		const sectorStocks = stocks.filter(stock => stock.sector === selectedSector);
		const allocation = sectorAllocations.find(s => s.sector === selectedSector)?.allocation || 0;
		return { stocks: sectorStocks, allocation };
	}, [selectedSector, stocks, sectorAllocations]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				{/* <Text style={styles.title}>Sector allocations</Text> */}
				<Text style={styles.subtitle}>{`Total allocation: ${total.toFixed(1)}%`}</Text>
			</View>
			<View style={styles.chartWrap}>
				<View style={[styles.chartCard, { width: screenWidth }]}>
					{stocks.length > 0 && chartData.length > 0 ? (
						<>
							<PieChart 
								key={JSON.stringify(chartData)}
								data={chartData} 
								width={screenWidth - 24} 
								height={220} 
								chartConfig={chartConfig} 
								accessor={'population'} 
								backgroundColor={'transparent'} 
								paddingLeft={'15'}
								hasLegend={false}
								style={{ alignSelf: 'center' }}
							/>
							<View style={styles.legendContainer}>
								{chartData.map((item, index) => (
									<TouchableOpacity 
										key={index} 
										style={[styles.legendItem, selectedSector === item.name && styles.legendItemSelected]}
										onPress={() => setSelectedSector(selectedSector === item.name ? null : item.name)}
									>
										<View style={[styles.legendColor, { backgroundColor: item.color }]} />
										<Text style={styles.legendText} numberOfLines={2}>{item.name}</Text>
									</TouchableOpacity>
								))}
							</View>
						</>
					) : (
						<Text style={{ padding: 20, color: '#666' }}>No stock data available</Text>
					)}
				</View>
			</View>
			{selectedSector && selectedSectorData && (
				<View style={styles.detailsContainer}>
					<View style={styles.detailsHeader}>
						<Text style={styles.detailsTitle}>{selectedSector}</Text>
						<TouchableOpacity onPress={() => setSelectedSector(null)}>
							<Text style={styles.closeButton}> X </Text>
						</TouchableOpacity>
					</View>
					<Text style={styles.detailsAllocation}>{selectedSectorData.allocation.toFixed(1)}% of portfolio</Text>
					<ScrollView style={styles.stocksList}>
						{selectedSectorData.stocks.map((stock) => (
							<View key={stock.ID} style={styles.stockItem}>
								<View style={styles.stockInfo}>
									<Text style={styles.stockSymbol}>{stock.symbol}</Text>
									<Text style={styles.stockCompany}>{stock.company_name}</Text>
								</View>
								<Text style={styles.stockQuantity}>{stock.quantity} shares</Text>
							</View>
						))}
					</ScrollView>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { paddingVertical: 12 },
	header: { paddingHorizontal: 16, paddingBottom: 8 },
	title: { fontSize: 18, fontWeight: '700', color: '#333' },
	subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
	chartWrap: { alignItems: 'center', paddingVertical: 12 },
	chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 8, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
	legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, paddingHorizontal: 8, width: '100%' },
	legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 8, maxWidth: '45%', padding: 6, borderRadius: 6 },
	legendItemSelected: { backgroundColor: '#e0f2fe' },
	legendColor: { width: 12, height: 12, borderRadius: 2, marginRight: 6, flexShrink: 0 },
	legendText: { fontSize: 12, color: '#444', flexShrink: 1, flexWrap: 'wrap' },
	detailsContainer: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, maxHeight: 300 },
	detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
	detailsTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
	closeButton: { fontSize: 24, color: '#666', fontWeight: '300' },
	detailsAllocation: { fontSize: 14, color: '#666', marginBottom: 12 },
	stocksList: { maxHeight: 200 },
	stockItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	stockInfo: { flex: 1 },
	stockSymbol: { fontSize: 14, fontWeight: '600', color: '#333' },
	stockCompany: { fontSize: 12, color: '#666', marginTop: 2 },
	stockQuantity: { fontSize: 13, color: '#3b82f6', fontWeight: '500' },
});