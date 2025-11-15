import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from './icon-symbol';


export default function TopNavBar() {
  const scheme = useColorScheme();
  const tint = Colors[scheme ?? 'light'].tint;
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme ?? 'medium'].background, borderBottomColor: '#e6e6e6'}]}>
      <Pressable style={styles.tab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <IconSymbol name="menubar.dock.rectangle" size={30} color={tint} />
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
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 50, // neccessary to be displayed otherwise it will sit under the screen
    borderBottomWidth: 1,
  },
  tab: {
    alignItems: 'flex-start',
    paddingLeft: 40,
    paddingTop: 25,
    paddingRight: 300,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 65,
    right: 0,
    bottom: 0,
    zIndex: 60,
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: '#fff',
    padding: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  drawerButton: {
    marginTop: 8,
    paddingVertical: 10,
  },
  drawerButtonText: {
    color: '#0B3D91',
    fontWeight: '700',
    fontSize: 15,
  }
});
