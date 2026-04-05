import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function BottomNavBar() {
  const router = useRouter();
  const scheme = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme ?? 'light'].background, borderTopColor: '#e6e6e6' }]}>
      <Pressable style={styles.tab} onPress={() => router.push('/(main)/stock-holdings' as any)}>
        <IconSymbol name="house.fill" size={24} color="#0b3d91" />
        <Text style={[styles.label, { color: '#0b3d91' }]}>Home</Text>
      </Pressable>

      <Pressable style={styles.tab} onPress={() => router.push('/(main)/insights' as any)}>
        <IconSymbol name="chart.bar.fill" size={22} color="#0b3d91" />
        <Text style={[styles.label, { color: '#0b3d91' }]}>Insights</Text>
      </Pressable>
      
      <Pressable style={styles.tab} onPress={() => router.push('/(main)/news' as any)}>
        <IconSymbol name="newspaper.fill" size={22} color="#0b3d91" />
        <Text style={[styles.label, { color: '#0b3d91' }]}>News</Text>
      </Pressable>

      <Pressable style={styles.tab} onPress={() => router.push('/(main)/sentiment' as any)}>
        <IconSymbol name="face.smiling" size={22} color="#0b3d91" />
        <Text style={[styles.label, { color: '#0b3d91' }]}>Sentiment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});