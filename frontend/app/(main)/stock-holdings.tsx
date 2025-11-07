import React from 'react';
import { Image, Text, StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STOCKS } from '../../constants/stocks';
import { NAV_HEIGHT } from '@/constants/layout';

export default function StockHoldings() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={STOCKS}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        style={styles.listWrapper}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.shares}>{item.shares} shares</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb', paddingTop: NAV_HEIGHT },
  listWrapper: { flex: 1 },
  list: { paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardLeft: { width: 52, height: 52, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 8 },
  cardBody: { flex: 1 },
  symbol: { fontSize: 16, fontWeight: '700', color: '#0b3d91' },
  name: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardRight: { marginLeft: 8, alignItems: 'flex-end' },
  shares: { fontSize: 14, fontWeight: '600', color: '#111' },
});
