import { View, Text, StyleSheet, FlatList, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';
import { storage } from '../../utils/storage';
import {getStockNews} from '../../services/user';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RouteProp, useRoute, useFocusEffect} from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

type NewsRouteParams = {
  selectedStock?: string;
};

export default function News() {

  type RootStackParamList = {
    news: NewsRouteParams;
  };

  const route = useRoute<RouteProp<RootStackParamList, 'news'>>();

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<[string, string][]>([]);  
  const [selectedStock, setSelectedStock] = useState<string>('all');
  const prevParamRef = useRef<string | undefined>(undefined);
  const hasMountedRef = useRef(false);

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

        const articles = res?.articles ?? [];
        setNews(articles);

        const uniqueStocks: [string, string][] = Array.from(
          new Map<string, string>(
            articles.map((a: any) => [a.symbol, a.name])
          ).entries()
        );

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

  useFocusEffect(
    useCallback(() => {
      loadStockNews();
    }, [])
  );

  useEffect(() => {
    const routeSymbol = route.params?.selectedStock;

    // ignoring the first render to prevent stale parameters
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!routeSymbol || routeSymbol === prevParamRef.current) {
      return;
    }

    prevParamRef.current = routeSymbol;

    setSelectedStock(routeSymbol);
  }, [route.params?.selectedStock]);

  // filtering the news by the selected stock
  const filteredNews = selectedStock === 'all'
    ? news
    : news.filter((item) => item.symbol === selectedStock);
    

  return (
    <SafeAreaView style={styles.container}>
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
            {holdings.map(([symbol, name]) => (
              <Picker.Item key={symbol} label={name} value={symbol} />
            ))}
          </Picker>
        </View>
      </View>
      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text style={{ color: '#0b3d91', fontSize: 16, fontWeight: '600' }}>
            Loading news articles...
          </Text>
        </View>
      ) : filteredNews.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text style={{ color: '#0b3d91', fontSize: 16, fontWeight: '600' }}>
            No news for your stocks available
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.name + item.headline}
          contentContainerStyle={styles.list}
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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text
                    style={[
                      styles.sentiment,
                      { color: getSentimentColor(item.catboost_model) },
                    ]}
                  >
                    CatBoost: {item.catboost_model}
                  </Text>

                  <Text
                    style={[
                      styles.sentiment,
                      { color: getSentimentColor(item.finbert) },
                    ]}
                  >
                    FinBERT: {item.finbert}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
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