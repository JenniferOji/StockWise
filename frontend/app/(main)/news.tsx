import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEWS } from '@/constants/news';
import { NAV_HEIGHT } from '@/constants/layout';

export default function News() {
  // function to convert a sentiment value into a label and colour
  const getSentiment = (score: number) => {
    if (score > 0.55) return { label: 'Positive', color: '#2ecc71' };
    if (score < 0) return { label: 'Negative', color: '#e74c3c' };
    else return { label: 'Neutral', color: '#f39c12' };
  };

  return (
    // SafeAreaView keeps content out of status bar areas on devices 
    <SafeAreaView style={styles.container}>
      <FlatList
        data={NEWS}
        keyExtractor={(item) => item.companyName + item.date}
        // pushing the content below the top nav bar 
        contentContainerStyle={[
          styles.list,
          { paddingTop: + NAV_HEIGHT + 5 },
        ]}
        // render each news item as a card
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* the company logo image */}
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            {/* the main card body contains the company name + headline + date + sentiment */}
            <View style={styles.cardBody}>
              <Text style={styles.company}>{item.companyName}</Text>
              <Text style={styles.headline}>{item.headline}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.date}>{item.date}</Text>
                {/* sentiment label and corresponding colour based on score */}
                {(() => {
                  // get the sentiment label and colour
                  const { label, color } = getSentiment(item.sentiment);
                  return <Text style={[styles.sentiment, { color }]}>{label}</Text>;
                })()}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa'},
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
