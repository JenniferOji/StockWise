import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEWS } from '@/constants/news';
import { NAV_HEIGHT } from '@/constants/layout';

export default function News() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={NEWS}
        keyExtractor={(item) => item.companyName + item.date}
        // pushing the content below the top nav bar 
        contentContainerStyle={[
          styles.list,
          { paddingTop: + NAV_HEIGHT + 5 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.company}>{item.companyName}</Text>
              <Text style={styles.headline}>{item.headline}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={[styles.sentiment, item.sentiment > 0.2 ? { color: '#2ecc71' } : item.sentiment < 0 ? { color: '#e74c3c' } : { color: '#f39c12' }]}>
                  {(item.sentiment > 0 ? '+' : '') + item.sentiment.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
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
  company: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  headline: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#666' },
  sentiment: { fontSize: 12, fontWeight: '700' },
});
