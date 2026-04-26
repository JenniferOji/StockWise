import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from "react-native-safe-area-context";
import { NAV_HEIGHT } from "@/constants/layout";
import { getUserStocks } from "@/services/user";
import { getStockSentiment } from "@/services/news";
import { storage } from "@/utils/storage";
import STOCKS from '../../constants/stocks.json';


type SentimentMap = Record<string, { label: string; score?: number }>;

type RootStackParamList = {
  news: { selectedStock: string };
};

export default function SentimentPage() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<SentimentMap>({});
  const [loading, setLoading] = useState(true);
  const [userHasStocks, setUserHasStocks] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const getSentimentColor = (label?: string) => {
    if (label === "positive") return "#00c853";
    if (label === "negative") return "#ff1744";
    return "#ff9100";
  };

  // loading the user's stocks and their sentiment data from the backend
  const loadData = async (force = false) => {
    try {
      const now = Date.now();

      if (!force && now - lastFetched < 30000) {
        return;
      }

      setLoading(true);

      const userJson = await storage.getItem("user");
      if (!userJson) {
        setUserHasStocks(false);
        return;
      }

      const user = JSON.parse(userJson);

      const stocks = await getUserStocks(user.ID);
      const sentimentData = await getStockSentiment(user.ID);

      setSentiment(sentimentData || {});

      if (!stocks || stocks.length === 0) {
        setUserHasStocks(false);
        setHoldings([]);
        return;
      }

      setUserHasStocks(true);

      const mappedStocks = stocks
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
        .filter(Boolean);

      setHoldings(mappedStocks);
      setLastFetched(now);

    } catch (error) {
      console.error("Failed to load sentiment data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // reload the data when thescreen is focused to get the newest sentiment updates
  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [lastFetched])
  );

  const groupedStocks = useMemo(() => {
    const groups: any = {
      positive: [],
      neutral: [],
      negative: [],
    };

    holdings.forEach((stock) => {
      const data = sentiment[stock.symbol];

      const label = data?.label || "neutral";
      groups[label].push(stock);
    });

    return groups;
  }, [holdings, sentiment]);

  // meaning of each sentiment category for the user to understand the implications of the data
  const sections = [
    {
      key: "positive",
      title: "Positive",
      subtitle: "Positive momentum signals",
      detail:
        "This suggests the stock is leaning toward a bullish market mood, where recent coverage and commentary are generally optimistic.",
      color: "#00c853",
      data: groupedStocks.positive,
    },
    {
      key: "neutral",
      title: "Neutral",
      subtitle: "Mixed sentiment",
      detail:
        "This means market opinion is balanced or uncertain, with no strong bullish or bearish conviction in recent sentiment.",
      color: "#ff9100",
      data: groupedStocks.neutral,
    },
    {
      key: "negative",
      title: "Negative",
      subtitle: "Negative sentiment",
      detail:
        "This indicates a bearish tone, where recent sentiment and news flow lean cautious or unfavorable for the stock.",
      color: "#ff1744",
      data: groupedStocks.negative,
    },
  ];

  const totalStocks = holdings.length;

  // rendering the sentiment page with the summary of entiment breakdown 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageShell}>

        <Text style={styles.pageSubtitle}>
          See the overall market mood for your holdings, classified by machine learning model: positive, neutral, or negative.
        </Text>

        {/* sentiment gradient scale for quick reading */}
        <View style={styles.heatmapBox}>
          <LinearGradient
            colors={["#ff1744", "#ff9100", "#00c853"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heatmapBar}
          />
          <View style={styles.heatmapScaleRow}>
            <Text style={styles.heatmapScaleText}>-1</Text>
            <Text style={styles.heatmapScaleText}>0</Text>
            <Text style={styles.heatmapScaleText}>1</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tracked Stocks</Text>
            <Text style={styles.summaryValue}>{totalStocks}</Text>
          </View>

          <View style={styles.summaryBreakdown}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: "#ff1744" }]} />
              <Text style={styles.breakdownText}>{groupedStocks.negative.length} Negative</Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: "#ff9100" }]} />
              <Text style={styles.breakdownText}>{groupedStocks.neutral.length} Neutral</Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: "#00c853" }]} />
              <Text style={styles.breakdownText}>{groupedStocks.positive.length} Positive</Text>
            </View>
          </View>
        </View>

        {loading || (userHasStocks && totalStocks === 0) ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Loading stock sentiment...</Text>
          </View>
        ) : totalStocks === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No stocks found yet. Add stocks in Stock Holdings.</Text>
          </View>
        ) : (
          // rendering each stock grouped by sentiment category with a link to the news page for that stock when pressed
          sections.map((section) => {
            if (section.data.length === 0) return null;
            return (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionMarker, { backgroundColor: section.color }]} />
                  <View style={styles.sectionTextWrap}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                  </View>
                  <Text style={styles.sectionCount}>{section.data.length}</Text>
                </View>
                <Text style={styles.sectionDetail}>{section.detail}</Text>
                
                {section.data.map((item: any) => {
                  const sentimentData = sentiment[item.symbol];
                  return (
                    <Pressable
                      key={item.dbId?.toString() || item.symbol}
                      style={styles.card}
                      onPress={() => {
                        navigation.navigate('news', { selectedStock: item.symbol });
                      }}
                    >
                      <View style={styles.cardLeft}>
                        <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.symbolRow}>
                          <Text style={styles.symbol}>{item.symbol}</Text>
                          <View style={[styles.sentimentDot, { backgroundColor: getSentimentColor(sentimentData?.label) }]} />
                        </View>
                        <Text style={styles.name}>{item.companyName}</Text>
                        {sentimentData?.score !== undefined && (
                          <Text style={styles.scoreText}>Sentiment Score: {sentimentData.score.toFixed(2)}</Text>
                        )}
                        <View style={styles.sentimentBar}>
                          <LinearGradient
                            colors={["#ff1744", "#ff9100", "#00c853"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sentimentGradient}
                          />
                          <View
                            style={[
                              styles.sentimentMarker,
                              { left: `${((sentimentData?.score ?? 0) + 1) / 2 * 100}%` }
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa", paddingTop: NAV_HEIGHT },
  scrollContent: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 96 },
  pageShell: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  pageSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 12 },
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
    fontSize: 12,
    color: '#374151',
    lineHeight: 20,
  },
  heatmapBox: {
    marginBottom: 16,
    alignItems: 'center',
  },
  heatmapBar: {
    width: '100%',
    maxWidth: 320,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#eee',
  },
  heatmapScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
  },
  heatmapScaleText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0b3d91" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 12 },
  summaryCard: { backgroundColor: "#ffffff", borderRadius: 10, padding: 12, marginBottom: 12, elevation: 3 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, color: "#4b5563", fontWeight: "600" },
  summaryValue: { fontSize: 20, color: "#0b3d91", fontWeight: "800" },
  summaryBreakdown: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  breakdownItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownDot: { width: 9, height: 9, borderRadius: 5 },
  breakdownText: { fontSize: 12, color: "#4b5563", fontWeight: "600" },
  section: { marginBottom: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#eaf0ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  sectionMarker: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTextWrap: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  sectionSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  sectionDetail: { fontSize: 12, color: "#4b5563", marginBottom: 8, lineHeight: 18 },
  sectionCount: { fontSize: 13, fontWeight: "700", color: "#374151", backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, elevation: 2 },
  cardLeft: { width: 52, height: 52, marginRight: 12, justifyContent: "center", alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 8 },
  cardBody: { flex: 1 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  symbol: { fontSize: 16, fontWeight: "700", color: "#0b3d91" },
  name: { fontSize: 13, color: "#6b7280", marginTop: 2, fontWeight: "500" },
  sentimentDot: { width: 10, height: 10, borderRadius: 5 },
  scoreText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
    fontWeight: '600',
  },
  emptyWrap: { backgroundColor: "#ffffff", borderRadius: 10, paddingVertical: 28, paddingHorizontal: 12, alignItems: "center", elevation: 2 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  sentimentBar: {
  width: '100%',
  height: 6,
  borderRadius: 3,
  overflow: 'hidden',
  marginTop: 6,
  marginBottom: 4,
  position: 'relative',
  backgroundColor: '#e5e7eb',
  },

  sentimentGradient: {
    width: '100%',
    height: '100%',
  },

  sentimentMarker: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ translateX: -6 }],
    elevation: 2,
  }
});