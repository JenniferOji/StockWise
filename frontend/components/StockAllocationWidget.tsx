import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
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

export default function StockAllocationWidget() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	const [selectedSector, setSelectedSector] = useState<string | null>(null);
	const { width } = useWindowDimensions();
	const isLargeScreen = width > 900;

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

	const totalShares = useMemo(() => {
		return stocks.reduce((sum, stock) => {
			return sum + (stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0) || 0);
		}, 0);
	}, [stocks]);

	const chartData = useMemo(() => {
		const map: Record<string, number> = {};
		stocks.forEach(stock => {
			if (!map[stock.sector]) map[stock.sector] = 0;
			const shares = stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0) || 0;
			map[stock.sector] += shares;
		});

		return Object.entries(map).map(([sector, shares]) => ({
			sector,
			value: totalShares > 0 ? (shares / totalShares) * 100 : 0,
			color: INSIGHTS.find(i => i.sector === sector)?.color || '#3b82f6'
		}));
	}, [stocks, totalShares]);

	const selectedSectorData = useMemo(() => {
		if (!selectedSector) return null;
		const sectorStocks = stocks.filter(stock => stock.sector === selectedSector);
		const allocation = chartData.find(s => s.sector === selectedSector)?.value || 0;
		return { stocks: sectorStocks, allocation };
	}, [selectedSector, stocks, chartData]);

	// Fixed chart size: small and consistent on mobile, capped on large screens
	const size = 200;

	const strokeWidth = 30;
	const radius = size / 2 - strokeWidth / 2 - 4;
	const circumference = 2 * Math.PI * radius;

	let cumulativePercent = 0;

	return (
		<ScrollView>
			<View style={styles.container}>

				<Text style={styles.title}>Sector Allocation</Text>
				<Text style={styles.subtitle}>Explore your portfolio composition</Text>

				<View style={styles.card}>
					<View style={styles.chartRow}>

						{/* Donut Chart */}
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
												fill="none"
												strokeDasharray={`${dash} ${gap}`}
												strokeDashoffset={-offset}
											/>
										);
									})}
								</G>
							</Svg>
						</View>

						{/* Legend */}
						<View style={styles.legend}>
							{chartData.map((item, i) => (
								<Pressable
									key={i}
									onPress={() =>
										setSelectedSector(selectedSector === item.sector ? null : item.sector)
									}
									style={({ hovered }: { hovered?: boolean }) => [
										styles.legendItem,
										selectedSector === item.sector && styles.legendItemSelected,
										hovered && { opacity: 0.8 }
									]}
								>
									<View style={[styles.dot, { backgroundColor: item.color }]} />
									<Text style={styles.legendText}>{item.sector}</Text>
									<Text style={styles.legendPercent}>{item.value.toFixed(1)}%</Text>
								</Pressable>
							))}
						</View>

					</View>
				</View>

				{/* Sector Detail Panel */}
				{selectedSector && selectedSectorData && (
					<View style={styles.detailsCard}>
						<View style={styles.detailsHeader}>
							<Text style={styles.detailsTitle}>{selectedSector}</Text>
							<Pressable onPress={() => setSelectedSector(null)}>
								<Text style={styles.closeText}>Close</Text>
							</Pressable>
						</View>

						<Text style={styles.detailsSubtitle}>
							{selectedSectorData.allocation.toFixed(1)}% of portfolio
						</Text>

						{selectedSectorData.stocks.map((stock) => (
							<View key={stock.ID} style={styles.stockRow}>
								<View>
									<Text style={styles.stockSymbol}>{stock.symbol}</Text>
									<Text style={styles.stockCompany}>{stock.company_name}</Text>
								</View>
								<Text style={styles.stockShares}>
									{stock.entries?.reduce((s, e) => s + (e.quantity || 0), 0)} shares
								</Text>
							</View>
						))}
					</View>
				)}

			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: 8,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 12,
		color: '#64748b',
		marginBottom: 10,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e7edf5',
	},
	chartRow: {
		flexDirection: 'column',
		alignItems: 'center',
		gap: 16,
	},
	chartArea: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	legend: {
		width: '100%',
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 5,
		paddingHorizontal: 6,
		borderRadius: 8,
	},
	legendItemSelected: {
		backgroundColor: '#eff6ff',
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: 8,
		flexShrink: 0,
	},
	legendText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#334155',
		flex: 1,
	},
	legendPercent: {
		fontWeight: '400',
		color: '#64748b',
		textAlign: 'right',
	},
	detailsCard: {
		marginTop: 10,
		backgroundColor: '#f8fafc',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e7edf5',
	},
	detailsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	detailsTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0f172a',
	},
	closeText: {
		color: '#2563eb',
		fontWeight: '600',
		fontSize: 13,
	},
	detailsSubtitle: {
		fontSize: 12,
		color: '#64748b',
		marginBottom: 10,
	},
	stockRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eef2f7',
	},
	stockSymbol: {
		fontWeight: '700',
		color: '#0f172a',
		fontSize: 13,
	},
	stockCompany: {
		fontSize: 11,
		color: '#64748b',
		marginTop: 1,
	},
	stockShares: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
	},
});
