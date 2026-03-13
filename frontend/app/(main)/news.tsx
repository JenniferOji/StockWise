
import { View, Text, StyleSheet, FlatList, Pressable, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';
import { storage } from '../../utils/storage';
import {getStockNews} from '../../services/user';
import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';

export default function News() {

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>('all');

  const getSentimentColor = (sentiment: string) => {
    const value = (sentiment || '').toLowerCase();
    if (value == 'positive') return '#00c853';
    if (value == 'negative') return '#ff1744';
    return '#ff9100';
  };

  // function to open the article in browser when the card is pressed
  const openArticle = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  // function to load news from the backend  
  const loadStockNews = async () => {
    try {
      setLoading(true);
      const userJson = await storage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const res = await getStockNews(user.ID);
        setNews(res?.articles ?? []);
        // unique stock names from news articles
        const uniqueStocks = Array.from(new Set((res?.articles ?? []).map((a: any) => String(a.name)))) as string[];
        setHoldings(uniqueStocks);
      } else {
        setNews([]);
        setHoldings([]);
      }
    } catch (err) {
      setError('Failed to load news');
      setNews([]);
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockNews();
  }, []);

  // filtering the news by the selected stock
  const filteredNews = selectedStock === 'all' ? news : news.filter((item) => item.name === selectedStock);

  return (
    <SafeAreaView style={styles.container}>
      {/* the filter dropdown */}
      <View style={{ marginHorizontal: 12, marginBottom: 8, marginTop: 4 }}>
        <Picker
          selectedValue={selectedStock}
          onValueChange={(itemValue) => setSelectedStock(itemValue)}
          style={{ backgroundColor: '#fff', borderRadius: 8 }}
        >
          <Picker.Item label="All Holdings" value="all" />
          {holdings.map((stock) => (
            <Picker.Item key={stock} label={stock} value={stock} />
          ))}
        </Picker>
      </View>
      <FlatList
        data={filteredNews}
        keyExtractor={(item) => item.name + item.headline}
        contentContainerStyle={[
          styles.list
        ]}
        // display each news item as a card
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openArticle(item.url)}>
            <View style={styles.cardBody}>
              <View style={styles.headerRow}>
                <View style={styles.publisherRow}>
                  <Text style={styles.source}>{item.name} :</Text>
                  <Text style={styles.stockName}>{item.source}</Text>
                </View>
              </View>
              <Text style={styles.headline}>{item.headline}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.sentiment, { color: getSentimentColor(item.sentiment) }]}>{item.sentiment}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: + NAV_HEIGHT + 5 },
  list: { padding: 12, paddingBottom: 96 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  image: { width: 56, height: 56, borderRadius: 8, marginRight: 12, resizeMode: 'contain' },
  cardBody: { flex: 1, minWidth: 0 },
  headline: { fontSize: 16, color: '#676767', marginTop: 6, fontWeight: '600' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  publisherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  source: { fontSize: 17, color: '#000', fontWeight: '600' },
  stockName: { fontSize: 16, color: '#535353', fontWeight: '500' },
  date: { fontSize: 12, color: '#666' },
  sentiment: { fontSize: 14, fontWeight: '700' },
});
