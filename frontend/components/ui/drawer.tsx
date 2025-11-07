import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { IconSymbol } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const scheme = useColorScheme();
  const tint = Colors[scheme ?? 'light'].tint;
  const router = useRouter();

  const handleLogout = () => {
    navigation.closeDrawer();
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme ?? 'light'].background }]}>
      <Pressable style={styles.item} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
        <IconSymbol name="arrow.right.square" size={20} color={tint} />
        <Text style={[styles.label, { color: tint }]}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
  },
});