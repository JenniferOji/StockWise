import React, { useState, useMemo, useEffect, useRef } from 'react';
import {View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
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

type ChartItem = {
	sector: string;
	shares: number;
	value: number; 
	color: string;
};

// displaying the donut chart 
function DonutChart({
	chartData,
	selectedSector,
}: {
	chartData: ChartItem[];
	selectedSector: string | null;
}) {
	const size = 200;
	const strokeWidth = 30;
	const radius = size / 2 - strokeWidth / 2 - 4;
	const circumference = 2 * Math.PI * radius;
	let cumulativePercent = 0;

	// donut chart helper: https://www.geeksforgeeks.org/reactjs/create-a-donut-chart-using-recharts-in-reactjs/
	// returning the svg with the donut chart by mapping through the chart data 
	return (
		<View style={styles.card}>
			<Text style={styles.cardLabel}>By Sector</Text>
			<View style={styles.chartArea}>
				<Svg width={size} height={size}>
					<G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
						{chartData.map((item, i) => {
							const percent = item.value / 100;
							const dash = percent * circumference;
							const gap = circumference;
							const offset = cumulativePercent * circumference;
							cumulativePercent += percent;

							return (
								<Circle
									key={i}
									cx={size / 2}
									cy={size / 2}
									r={radius}
									stroke={item.color}
									strokeWidth={strokeWidth}
									strokeOpacity={selectedSector && selectedSector !== item.sector ? 0.25 : 1}
									fill="none"
									strokeDasharray={`${dash} ${gap}`}
									strokeDashoffset={-offset}
								/>
							);
						})}
					</G>
				</Svg>
			</View>
		</View>
	);
}

// displaying the bar chart 
function BarChart({
	chartData,
	selectedSector,
}: {
	chartData: ChartItem[];
	selectedSector: string | null;
}) {
	const maxShares = Math.max(...chartData.map(d => d.shares), 1);

	// donut chart helper: https://mui.com/x/react-charts/bars/
	// returning the bars by mapping through the chart data
	return (
		<View style={styles.card}>
			<Text style={styles.cardLabel}>Share Count</Text>

			<View style={{ marginTop: 12 }}>
				{chartData.map((item, i) => {
					const isSelected = selectedSector === item.sector;
					const barPct = (item.shares / maxShares) * 100;

					return (
						<View key={i} style={styles.barRow}>
							<View style={styles.barTrack}>
								<View
									style={[
										styles.barFill,
										{
											width: `${barPct}%`,
											backgroundColor: item.color,
											opacity: isSelected ? 1 : selectedSector ? 0.15 : 0.82,
										},
									]}
								/>
							</View>

							<Text style={styles.barValue}>{item.shares.toLocaleString()}</Text>
						</View>
					);
				})}
			</View>
		</View>
	);
}

// the main widget component that combines the charts and the stock list with the filtering
export default function StockAllocationWidget() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	const [selectedSector, setSelectedSector] = useState<string | null>(null);
	const [activePage, setActivePage] = useState(0);
	const { width } = useWindowDimensions();
	const isLargeScreen = width > 900;
	const swipeRef = useRef<ScrollView>(null);

	// load user stocks from backend
	useEffect(() => {
		(async () => {
			const userJson = await storage.getItem('user');
			if (userJson) {
				const user = JSON.parse(userJson);
				const data = await getUserStocks(user.ID);
				setStocks(Array.isArray(data) ? data : []);
			}
		})();
	}, []);

	// calculate the total shares across all the stocks
	const totalShares = useMemo(() => {
		return stocks.reduce((sum, stock) => {
			return sum + (stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0) || 0);
		}, 0);
	}, [stocks]);

	// building the chart data grouped by sector
	const chartData: ChartItem[] = useMemo(() => {
		const map: Record<string, number> = {};
		stocks.forEach(stock => {
			if (!map[stock.sector]) map[stock.sector] = 0;
			const shares = stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0) || 0;
			map[stock.sector] += shares;
		});
		return Object.entries(map).map(([sector, shares]) => ({
			sector,
			shares,
			value: totalShares > 0 ? (shares / totalShares) * 100 : 0,
			color: INSIGHTS.find(i => i.sector === sector)?.color || '#3b82f6',
		}));
	}, [stocks, totalShares]);

	// filter the stocks based on selected sector
	const selectedSectorData = useMemo(() => {
		if (!selectedSector) return null;
		const sectorStocks = stocks.filter(stock => stock.sector === selectedSector);
		const allocation = chartData.find(s => s.sector === selectedSector)?.value || 0;
		return { stocks: sectorStocks, allocation };
	}, [selectedSector, stocks, chartData]);

	const pageWidth = width - 32;

	const handleSwipeScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
		setActivePage(page);
	};

	const goToPage = (page: number) => {
		swipeRef.current?.scrollTo({ x: page * pageWidth, animated: true });
		setActivePage(page);
	};

	return (
		// main scroll view for the entire widget
		<ScrollView>
			<View style={styles.container}>

				<Text style={styles.subtitle}>Select a stock below to view its sector breakdown</Text>
				{/* show side by side charts on large screens and swipeable on small ones */}
				{isLargeScreen ? (
					<View style={styles.sideBySide}>
						<View style={styles.sideItem}>
							<DonutChart chartData={chartData} selectedSector={selectedSector} />
						</View>
						<View style={styles.sideItem}>
							<BarChart chartData={chartData} selectedSector={selectedSector} />
						</View>
					</View>
				) : (
					<View>
						<ScrollView
							ref={swipeRef}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							onMomentumScrollEnd={handleSwipeScroll}
						>
							<View style={{ width: width - 32 }}>
								<DonutChart chartData={chartData} selectedSector={selectedSector} />
							</View>
							<View style={{ width: width - 32 }}>
								<BarChart chartData={chartData} selectedSector={selectedSector} />
							</View>
						</ScrollView>

						<View style={styles.dotsRow}>
							{[0, 1].map(i => (
								<Pressable key={i} onPress={() => goToPage(i)}>
									<View style={[styles.pageDot, activePage === i && styles.pageDotActive]} />
								</Pressable>
							))}
						</View>
					</View>
				)}

				{/* showing the stock list */}
				<View style={styles.detailsCard}>
					{stocks.map(stock => (
						<Pressable
							key={stock.ID}
							onPress={() => setSelectedSector(stock.sector)}
							style={styles.stockRow}
						>
							<View>
								<Text style={styles.stockSymbol}>{stock.symbol}</Text>
								<Text style={styles.stockCompany}>{stock.company_name}</Text>
							</View>
							<Text style={styles.stockShares}>
								{stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0)} shares
							</Text>
						</Pressable>
					))}
				</View>

				{/* show filtered stocks after selecting */}
				{selectedSector && selectedSectorData && (
					<View style={styles.detailsCard}>
						<Text style={styles.detailsTitle}>{selectedSector}</Text>
						<Text style={styles.detailsSubtitle}>
							{selectedSectorData.allocation.toFixed(1)}% of portfolio
						</Text>

						{selectedSectorData.stocks.map(stock => (
							<View key={stock.ID} style={styles.stockRow}>
								<Text>{stock.symbol}</Text>
							</View>
						))}
					</View>
				)}

			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { paddingVertical: 8, paddingHorizontal: 16 },
	subtitle: { fontSize: 12, color: '#64748b', marginBottom: 10 },

	sideBySide: { flexDirection: 'row', gap: 16 },
	sideItem: { flex: 1 },

	card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
	cardLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },

	chartArea: { alignItems: 'center' },

	barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
	barTrack: { flex: 1, height: 28, backgroundColor: '#f1f5f9', borderRadius: 6 },
	barFill: { height: '100%' },
	barValue: { width: 44, fontSize: 11, textAlign: 'right' },

	dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
	pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
	pageDotActive: { width: 18, backgroundColor: '#2563eb' },

	detailsCard: { marginTop: 10, padding: 14, backgroundColor: '#f8fafc' },
	detailsTitle: { fontSize: 15, fontWeight: '700' },
	detailsSubtitle: { fontSize: 12, marginBottom: 10 },

	stockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
	stockSymbol: { fontWeight: '700' },
	stockCompany: { fontSize: 11, color: '#64748b' },
	stockShares: { fontSize: 12 },
});