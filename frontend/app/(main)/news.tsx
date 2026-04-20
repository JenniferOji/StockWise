import { View, Text, StyleSheet, FlatList, Pressable, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';
import { storage } from '../../utils/storage';
import {getStockNews} from '../../services/news';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RouteProp, useRoute, useFocusEffect} from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';

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
  const [lastFetched, setLastFetched] = useState<number>(0);

  const getSentimentColor = (sentiment: string) => {
    const value = (sentiment || '').toLowerCase();
    if (value == 'positive') return '#16a34a';
    if (value == 'negative') return '#dc2626';
    return '#f59e0b';
  };

  const openArticle = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const loadStockNews = async (force = false) => {
    try {
      const now = Date.now();

      if (!force && now - lastFetched < 30000) {
        return;
      }

      if (force || news.length === 0) {
        setLoading(true);
      }

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

      setLastFetched(now);

    } catch (err) {
      setError('Failed to load news');
      setNews([]);
      setHoldings([]);
    } finally {
      if (force || news.length === 0) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadStockNews(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStockNews(false);
    }, [lastFetched])
  );

  useEffect(() => {
    const routeSymbol = route.params?.selectedStock;

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

  const filteredNews = selectedStock === 'all'
    ? news
    : news.filter((item) => item.symbol === selectedStock);
    

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.pageShell}>

        <View style={styles.header}>
          <Text style={styles.pageSubtitle}>
            Your stock news with machine-learned classified sentiment.
          </Text>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterInline}>
            <View style={styles.iconBox}>
              <Icon name="filter-list" size={20} color="#64748b" />
            </View>

            <View style={styles.pickerOuter}>
              <View style={styles.pickerInner}>
                <Picker
                  selectedValue={selectedStock}
                  onValueChange={(itemValue) => setSelectedStock(itemValue)}
                  style={styles.pickerInline}
                  dropdownIconColor="#0b3d91"
                >
                  <Picker.Item label="All Holdings" value="all" />
                  {holdings.map(([symbol, name]) => (
                    <Picker.Item key={symbol} label={name} value={symbol} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {loading && news.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#0b3d91', fontSize: 16, fontWeight: '600' }}>
              Loading news articles...
            </Text>
          </View>
        ) : filteredNews.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#0b3d91', fontSize: 16, fontWeight: '600' }}>
              No daily news for your stocks available
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNews}
            keyExtractor={(item) => item.name + item.headline}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => openArticle(item.url)}>
                
                <View style={styles.topRow}>
                  <View style={styles.publisherRow}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.source}>{item.source}</Text>
                  </View>

                  <View style={[
                    styles.sentimentBadge,
                    { backgroundColor: `${getSentimentColor(item.linearsvm_model)}20` }
                  ]}>
                    <Text style={{ color: getSentimentColor(item.linearsvm_model), fontWeight: '700', fontSize: 12 }}>
                      {item.linearsvm_model}
                    </Text>
                  </View>
                </View>

                <Text style={styles.headline}>{item.headline}</Text>

              </Pressable>
            )}
          />
        )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: NAV_HEIGHT },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 96 },
  pageShell: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  header: { marginBottom: 14 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  filterLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pickerWrapper: { backgroundColor: '#f1f5f9', borderRadius: 10 },
  picker: { width: '100%', height: 40, color: '#0b3d91' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e7edf5' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  publisherRow: { flexDirection: 'row', alignItems: 'center' },
  stockName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dot: { marginHorizontal: 6, color: '#94a3b8' },
  source: { fontSize: 13, color: '#64748b' },
  headline: { fontSize: 13, fontWeight: '500', color: '#181e2b', marginTop: 8, lineHeight: 20 },
  sentimentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  error: { color: 'red' },
  filterCard: { backgroundColor: '#ffffff', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e7edf5' },
  filterInline: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pickerInlineWrapper: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e7edf5' },
  pickerOuter: { flex: 1 },
  pickerInner: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e7edf5', backgroundColor: '#f8fafc' },
  pickerInline: { width: '100%', height: 40, color: '#0b3d91', paddingLeft: 10, paddingRight: 14 },
});