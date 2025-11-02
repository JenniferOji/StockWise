import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function TopNavBar() {
  const router = useRouter();
  const scheme = useColorScheme();
  const tint = Colors[scheme ?? 'light'].tint;

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme ?? 'medium'].background, borderBottomColor: '#e6e6e6'}]}>
      <Pressable style={styles.tab} onPress={() => router.push('../../(main)/stock-holdings' as any)}>
        <IconSymbol name="menubar.dock.rectangle" size={22} color={tint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 50, // neccessary to be displayed otherwise it will sit under the screen
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    // alignItems: 'center',
    left: 20,
    justifyContent: 'center',
  }
});
