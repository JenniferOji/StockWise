import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { INSIGHTS } from '../constants/insights';
import { getUserStocks } from '../services/user';
import { storage } from '../utils/storage';

type BackendStock = {
	ID: number;
	user_id: number;
	symbol: string;
	company_name: string;
	entries: { quantity: number; purchase_price: number }[];
	sector: string;
};

export default function StockAllocationWidget() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	const [selectedSector, setSelectedSector] = useState<string | null>(null);

	const loadUserStocks = async () => {
		try {
			const userJson = await storage.getItem('user');
			if (userJson) {
				const user = JSON.parse(userJson);
				const loadedStocks = await getUserStocks(user.ID);
				if (loadedStocks && Array.isArray(loadedStocks)) {
					setStocks(loadedStocks);
				} else {
					setStocks([]);
				}
			}
		} catch (err) {
			setStocks([]);
		}
	};

	useEffect(() => {
		loadUserStocks();
	}, []);

	const totalShares = useMemo(() => {
		return stocks.reduce((sum, stock) => {
			const totalStockShares = stock.entries?.reduce(
				(s: number, e: any) => s + (e.quantity || 0),
				0
			) || 0;
			return sum + totalStockShares;
		}, 0);
	}, [stocks]);

	const sectorData = useMemo(() => {
		return stocks.reduce((acc, stock) => {
			if (!acc[stock.sector]) acc[stock.sector] = 0;

			const totalStockShares = stock.entries?.reduce(
				(s: number, e: any) => s + (e.quantity || 0),
				0
			) || 0;

			acc[stock.sector] += totalStockShares;
			return acc;
		}, {} as Record<string, number>);
	}, [stocks]);

	const sectorAllocations = useMemo(() => {
		return Object.entries(sectorData).map(([sector, shares]) => ({
			sector,
			allocation: totalShares > 0 ? (shares / totalShares) * 100 : 0
		}));
	}, [sectorData, totalShares]);

	const total = useMemo(
		() => sectorAllocations.reduce((s, c) => s + c.allocation, 0),
		[sectorAllocations]
	);

	const screenWidth = Dimensions.get('window').width;
	const isLargeScreen = screenWidth > 600;

	const chartWidth = isLargeScreen ? 300 : screenWidth - 80;

	const chartData = useMemo(() => {
		return sectorAllocations.map((item) => {
			const sectorColor =
				INSIGHTS.find(insight => insight.sector === item.sector)?.color || '#3b82f6';

			return {
				name: item.sector,
				population: item.allocation,
				color: sectorColor,
				legendFontColor: '#444',
				legendFontSize: 12
			};
		});
	}, [sectorAllocations]);

	const chartConfig = {
		backgroundGradientFrom: '#ffffff',
		backgroundGradientTo: '#ffffff',
		color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
		labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`
	};

	const selectedSectorData = useMemo(() => {
		if (!selectedSector) return null;

		const sectorStocks = stocks.filter(stock => stock.sector === selectedSector);
		const allocation =
			sectorAllocations.find(s => s.sector === selectedSector)?.allocation || 0;

		return { stocks: sectorStocks, allocation };
	}, [selectedSector, stocks, sectorAllocations]);

	return (
		<ScrollView>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.subtitle}>
						{`Total allocation: ${total.toFixed(1)}%`}
					</Text>
				</View>

				<View style={styles.chartWrap}>
					<View
						style={[
							styles.chartCard,
							isLargeScreen && styles.chartCardLarge
						]}
					>
						{stocks.length > 0 && chartData.length > 0 ? (
							<View
								style={[
									styles.chartContent,
									isLargeScreen && styles.chartContentLarge
								]}
							>
								<PieChart
									data={chartData}
									width={chartWidth}
									height={250}
									chartConfig={chartConfig}
									accessor={'population'}
									backgroundColor={'transparent'}
									paddingLeft={'10'}
									hasLegend={false}
								/>

								<View
									style={[
										styles.legendContainer,
										isLargeScreen && styles.legendContainerLarge
									]}
								>
									{chartData.map((item, index) => (
										<TouchableOpacity
											key={index}
											style={[
												styles.legendItem,
												selectedSector === item.name && styles.legendItemSelected
											]}
											onPress={() =>
												setSelectedSector(
													selectedSector === item.name ? null : item.name
												)
											}
										>
											<View
												style={[
													styles.legendColor,
													{ backgroundColor: item.color }
												]}
											/>
											<Text style={styles.legendText}>
												{item.name} ({item.population.toFixed(1)}%)
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						) : (
							<Text style={{ padding: 20, color: '#666' }}>
								No stock data available
							</Text>
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

						<Text style={styles.detailsAllocation}>
							{selectedSectorData.allocation.toFixed(1)}% of portfolio
						</Text>

						<ScrollView style={styles.stocksList}>
							{selectedSectorData.stocks.map((stock) => (
								<View key={stock.ID} style={styles.stockItem}>
									<View style={styles.stockInfo}>
										<Text style={styles.stockSymbol}>{stock.symbol}</Text>
										<Text style={styles.stockCompany}>
											{stock.company_name}
										</Text>
									</View>
									<Text style={styles.stockQuantity}>
										{stock.entries?.reduce(
											(s, e) => s + (e.quantity || 0),
											0
										)} shares
									</Text>
								</View>
							))}
						</ScrollView>
					</View>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { paddingVertical: 12 },
	header: { paddingHorizontal: 16, paddingBottom: 8 },
	subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
	chartWrap: { alignItems: 'center', paddingVertical: 12 },
	chartCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		width: '90%',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 8
	},
	chartCardLarge: {
		width: 600
	},
	chartContent: {
		alignItems: 'center'
	},
	chartContentLarge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	legendContainer: {
		marginTop: 16,
		width: '100%'
	},
	legendContainerLarge: {
		marginTop: 0,
		marginLeft: 20,
		flex: 1
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10
	},
	legendItemSelected: {
		backgroundColor: '#e0f2fe',
		borderRadius: 6,
		padding: 6
	},
	legendColor: {
		width: 12,
		height: 12,
		borderRadius: 3,
		marginRight: 8
	},
	legendText: {
		fontSize: 13,
		color: '#444'
	},
	detailsContainer: {
		marginHorizontal: 16,
		marginTop: 12,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16
	},
	detailsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	detailsTitle: { fontSize: 18, fontWeight: '700' },
	closeButton: { fontSize: 20 },
	detailsAllocation: { marginBottom: 10 },
	stocksList: { maxHeight: 200 },
	stockItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 10
	},
	stockInfo: { flex: 1 },
	stockSymbol: { fontWeight: '600' },
	stockCompany: { fontSize: 12, color: '#666' },
	stockQuantity: { fontSize: 13 }
});