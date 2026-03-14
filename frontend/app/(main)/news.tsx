
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
      {/* Purpose Box */}
      <View style={styles.purposeBox}>
        <Text style={styles.purposeTitle}>Stock Sentiment Overview</Text>
        <Text style={styles.purposeText}>
          News headlines can quickly move stock prices - staying informed helps you react to market changes. Here, you'll find the latest news affecting your holdings, each with a sentiment label so you can instantly gauge the tone of an article without reading it. Use this page to spot opportunities and risks as they emerge and keep your portfolio decisions up to date with current events.
        </Text>
      </View>
      {/* Enhanced filter box */}
      <View style={styles.filterBox}>
        <Text style={styles.filterLabel}>Filter by Stock:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedStock}
            onValueChange={(itemValue) => setSelectedStock(itemValue)}
            style={styles.picker}
            dropdownIconColor="#0b3d91"
          >
            <Picker.Item label="All Holdings" value="all" />
            {holdings.map((stock) => (
              <Picker.Item key={stock} label={stock} value={stock} />
            ))}
          </Picker>
        </View>
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
  purposeBox: {
    backgroundColor: '#eaf0ff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  purposeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b3d91',
    marginBottom: 6,
  },
  purposeText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  filterBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  filterLabel: {
    fontSize: 15,
    color: '#0b3d91',
    fontWeight: '700',
    marginRight: 8,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#eaf0ff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#0b3d91',
    fontWeight: '600',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
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
