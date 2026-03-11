import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';
import { getStockSentiment, getUserStocks } from '@/services/user';
import { storage } from '@/utils/storage';
import { STOCKS } from '@/constants/stocks';

type SentimentMap = {
  [symbol: string]: {
    label: string;
    score?: number;
  };
};

type HoldingRow = (typeof STOCKS)[number] & {
  dbId?: number;
};

export default function SentimentPage() {

  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [sentiment, setSentiment] = useState<SentimentMap>({});

  const getSentimentColor = (label?: string) => {
    if (label === 'bullish') return '#00c853';
    if (label === 'bearish') return '#ff1744';
    return '#ff9100';
  };

  const loadData = async () => {
    try {
      const userJson = await storage.getItem('user');
      if (!userJson) return;

      const user = JSON.parse(userJson);

      const [stocks, sentimentData] = await Promise.all([
        getUserStocks(user.ID),
        getStockSentiment(user.ID),
      ]);

      setSentiment(sentimentData || {});

      if (stocks && Array.isArray(stocks)) {
        const mapped = stocks
          .map((stock: any) => {
            const found = STOCKS.find((s) => s.symbol === stock.symbol);
            if (!found) return null;

            return {
              ...found,
              shares: stock.quantity,
              purchasePrice: stock.purchasePrice,
              dbId: stock.ID,
            };
          })
          .filter(Boolean) as HoldingRow[];

        setHoldings(mapped);
      }
    } catch (err) {
      console.error('Error loading sentiment page data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(() => holdings, [holdings]);

  const sentimentCounts = useMemo(() => {
    let bullish = 0;
    let neutral = 0;
    let bearish = 0;

    rows.forEach((stock) => {
      const s = sentiment[stock.symbol] || sentiment[stock.companyName];

      if (s?.label === 'bullish') bullish++;
      else if (s?.label === 'bearish') bearish++;
      else neutral++;
    });

    return { bullish, neutral, bearish };
  }, [rows, sentiment]);

  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>Stock Sentiment</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Bullish: {sentimentCounts.bullish}</Text>
        <Text style={styles.summaryText}>Neutral: {sentimentCounts.neutral}</Text>
        <Text style={styles.summaryText}>Bearish: {sentimentCounts.bearish}</Text>
      </View>

      <View style={styles.sentimentLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00c853' }]} />
          <Text style={styles.legendText}>Bullish</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff9100' }]} />
          <Text style={styles.legendText}>Neutral</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff1744' }]} />
          <Text style={styles.legendText}>Bearish</Text>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.dbId?.toString() || item.symbol}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sentimentData = sentiment[item.symbol] || sentiment[item.companyName];

          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.symbolRow}>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  {sentimentData && (
                    <View
                      style={[
                        styles.sentimentDot,
                        { backgroundColor: getSentimentColor(sentimentData.label) },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.name}>{item.companyName}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No stocks found yet. Add stocks in Stock Holdings.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#f3f6fb', paddingTop: NAV_HEIGHT },
title: { fontSize: 22, fontWeight: '800', color: '#0b3d91', paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
summaryText: { fontSize: 13, fontWeight: '600', color: '#444' },
list: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 },
card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
cardLeft: { width: 52, height: 52, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
logo: { width: 44, height: 44, borderRadius: 8 },
cardBody: { flex: 1 },
symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
symbol: { fontSize: 16, fontWeight: '700', color: '#0b3d91' },
name: { fontSize: 13, color: '#6b7280', marginTop: 2 },
sentimentDot: { width: 10, height: 10, borderRadius: 5 },
sentimentLegend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#edeaea', borderRadius: 10, elevation: 1 },
legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
legendDot: { width: 10, height: 10, borderRadius: 5 },
legendText: { fontSize: 12, fontWeight: '600', color: '#444' },
emptyWrap: { paddingVertical: 28, alignItems: 'center' },
emptyText: { color: '#6b7280', fontSize: 14 },
});