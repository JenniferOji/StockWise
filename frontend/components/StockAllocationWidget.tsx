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

// donought chart 

function DonutChart({
	chartData,
	selectedSector,
	onSelectSector,
}: {
	chartData: ChartItem[];
	selectedSector: string | null;
	onSelectSector: (s: string | null) => void;
}) {
	const size = 200;
	const strokeWidth = 30;
	const radius = size / 2 - strokeWidth / 2 - 4;
	const circumference = 2 * Math.PI * radius;
	let cumulativePercent = 0;

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
							const isSelected = selectedSector === item.sector;
							return (
								<Circle
									key={i}
									cx={size / 2}
									cy={size / 2}
									r={radius}
									stroke={item.color}
									strokeWidth={strokeWidth}
									onPress={() => onSelectSector(isSelected ? null : item.sector)}
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

// bar chart 

function BarChart({
	chartData,
	selectedSector,
	onSelectSector,
}: {
	chartData: ChartItem[];
	selectedSector: string | null;
	onSelectSector: (s: string | null) => void;
}) {
	const maxShares = Math.max(...chartData.map(d => d.shares), 1);

	return (
		<View style={styles.card}>
			<Text style={styles.cardLabel}>Share Count</Text>

			<View style={{ marginTop: 12 }}>
				{chartData.map((item, i) => {
					const isSelected = selectedSector === item.sector;
					const barPct = (item.shares / maxShares) * 100;
					return (
						<Pressable
							key={i}
							onPress={() => onSelectSector(isSelected ? null : item.sector)}
							style={({ hovered }: { hovered?: boolean }) => [
								styles.barRow,
								hovered && { opacity: 0.85 },
							]}
						>
							<View style={styles.barTrack}>
								<View
									style={[
										styles.barFill,
										{
											width: `${barPct}%` as any,
											backgroundColor: item.color,
											opacity: isSelected ? 1 : selectedSector ? 0.15 : 0.82,
										},
									]}
								/>
							</View>

							<Text style={styles.barValue}>{item.shares.toLocaleString()}</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}


function SectorLegend({
	chartData,
	selectedSector,
	onSelectSector,
}: {
	chartData: ChartItem[];
	selectedSector: string | null;
	onSelectSector: (s: string | null) => void;
}) {
	return (
		<View style={styles.legendCard}>
			{chartData.map((item, i) => (
				<Pressable
					key={i}
					onPress={() => onSelectSector(selectedSector === item.sector ? null : item.sector)}
					style={({ hovered }: { hovered?: boolean }) => [
						styles.legendItem,
						selectedSector === item.sector && styles.legendItemSelected,
						hovered && { opacity: 0.8 },
					]}
				>
					<View style={[styles.dot, { backgroundColor: item.color }]} />
					<Text style={styles.legendText}>{item.sector}</Text>
					<Text style={styles.legendPercent}>{item.value.toFixed(1)}%</Text>
				</Pressable>
			))}
		</View>
	);
}


export default function StockAllocationWidget() {
	const [stocks, setStocks] = useState<BackendStock[]>([]);
	const [selectedSector, setSelectedSector] = useState<string | null>(null);
	const [activePage, setActivePage] = useState(0);
	const { width } = useWindowDimensions();
	const isLargeScreen = width > 900;
	const swipeRef = useRef<ScrollView>(null);

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

	const selectedSectorData = useMemo(() => {
		if (!selectedSector) return null;
		const sectorStocks = stocks.filter(stock => stock.sector === selectedSector);
		const allocation = chartData.find(s => s.sector === selectedSector)?.value || 0;
		const sectorInfo = INSIGHTS.find(item => item.sector === selectedSector);
		return { stocks: sectorStocks, allocation, description: sectorInfo?.description || '' };
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
		<ScrollView>
			<View style={styles.container}>

				{/* <Text style={styles.title}>Sector Allocation</Text> */}
				<Text style={styles.subtitle}>Explore your portfolio composition - tap a sector to view sector holdings</Text>

				{isLargeScreen ? (
					// side by side display for large paegs 
					<View style={styles.sideBySide}>
						<View style={styles.sideItem}>
							<DonutChart chartData={chartData} selectedSector={selectedSector} onSelectSector={setSelectedSector} />
						</View>
						<View style={styles.sideItem}>
							<BarChart
								chartData={chartData}
								selectedSector={selectedSector}
								onSelectSector={setSelectedSector}
							/>
						</View>
					</View>
				) : (
					// swipabale pages 
					<View>
						<ScrollView
							ref={swipeRef}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							onMomentumScrollEnd={handleSwipeScroll}
							style={{ width: '100%' }}
						>
							<View style={{ width: width - 32 }}>
								<DonutChart chartData={chartData} selectedSector={selectedSector} onSelectSector={setSelectedSector} />
							</View>
							<View style={{ width: width - 32 }}>
								<BarChart
									chartData={chartData}
									selectedSector={selectedSector}
									onSelectSector={setSelectedSector}
								/>
							</View>
						</ScrollView>

						{/* page indicator  */}
						<View style={styles.dotsRow}>
							{[0, 1].map(i => (
								<Pressable key={i} onPress={() => goToPage(i)}>
									<View style={[styles.pageDot, activePage === i && styles.pageDotActive]} />
								</Pressable>
							))}
						</View>
					</View>
				)}

				{/* sector legend */}
				<SectorLegend
					chartData={chartData}
					selectedSector={selectedSector}
					onSelectSector={setSelectedSector}
				/>

				{/* sector details */}
				{selectedSector && selectedSectorData && (
					<View style={styles.detailsCard}>
						<View style={styles.detailsHeader}>
								<View style={styles.detailsTitleWrap}>
									<Text style={styles.detailsTitle}>{selectedSector}</Text>
									{selectedSectorData.description ? (
										<Text style={styles.detailsInlineDescription}>
											{selectedSectorData.description}
										</Text>
									) : null}
								</View>
							<Pressable onPress={() => setSelectedSector(null)}>
								<Text style={styles.closeText}>Close</Text>
							</Pressable>
						</View>

						<Text style={styles.detailsSubtitle}>
							{selectedSectorData.allocation.toFixed(1)}% of portfolio
						</Text>

						{selectedSectorData.stocks.map(stock => (
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
	container: { paddingVertical: 8, paddingHorizontal: 16 },
	title: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
	subtitle: { fontSize: 12, color: '#64748b', marginBottom: 10 },

	sideBySide: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
	sideItem: { flex: 1 },

	card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e7edf5' },
	cardLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 },

	chartArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },

	legendCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e7edf5', marginTop: 10 },
	legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 8 },
	legendItemSelected: { backgroundColor: '#eff6ff' },
	dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8, flexShrink: 0 },
	legendText: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },
	legendPercent: { fontSize: 12, fontWeight: '400', color: '#64748b' },

	barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
	barLabel: { width: 80, fontSize: 12, fontWeight: '500', color: '#475569', marginRight: 6 },
	barLabelSelected: { color: '#0f172a', fontWeight: '700' },
	barTrack: { flex: 1, height: 28, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden' },
	barFill: { height: '100%', borderRadius: 6 },
	barValue: { width: 44, fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'right', marginLeft: 4, flexShrink: 0 },

	dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
	pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
	pageDotActive: { width: 18, backgroundColor: '#2563eb' },

	detailsCard: { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e7edf5' },
	detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 12 },
	detailsTitleWrap: { flex: 1 },
	detailsTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
	detailsInlineDescription: { fontSize: 11, color: '#64748b', lineHeight: 16, marginTop: 2 },
	closeText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
	detailsSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 10 },
	stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
	stockSymbol: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
	stockCompany: { fontSize: 11, color: '#64748b', marginTop: 1 },
	stockShares: { fontSize: 12, fontWeight: '600', color: '#475569' },
});