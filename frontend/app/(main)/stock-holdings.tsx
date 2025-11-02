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
        contentContainerStyle={[styles.list]}
        style={styles.listWrapper}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
            <View style={styles.info}>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <Text style={styles.shares}>{item.shares}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: NAV_HEIGHT },
  listWrapper: { flex: 1 },
  list: { paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  logo: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  info: { flex: 1 },
  symbol: { fontSize: 16, fontWeight: '700', color: '#111' },
  name: { fontSize: 13, color: '#666' },
  shares: { fontSize: 14, fontWeight: '600', color: '#111' },
});
