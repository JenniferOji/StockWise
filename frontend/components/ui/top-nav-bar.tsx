import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DrawerActions, useNavigation, useNavigationState } from '@react-navigation/native';
import { Text } from 'react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from './icon-symbol';


export default function TopNavBar() {
  const scheme = useColorScheme();
  const tint = Colors[scheme ?? 'light'].tint;
  const navigation = useNavigation();
  const state = useNavigationState(state => state);

  // Getting the current route name
  let pageName = '';
  if (state && state.routes && state.index !== undefined) {
    const route = state.routes[state.index];
    pageName = route?.name || '';
  }

  // mapping the route names to different titles to be displayed 
  const pageTitles: { [key: string]: string } = {
    'stock-holdings': 'Stock Holdings',
    'news': 'Market News',
    'sentiment': 'Stock Sentiment',
    'insights': 'Portfolio Insights',
    'settings': 'Settings',
  };
  const displayTitle = pageTitles[pageName] || pageName;

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme ?? 'medium'].background, borderBottomColor: '#e6e6e6'}]}>
      <Pressable style={styles.tab} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <IconSymbol name="menubar.rectangle" size={30} color={tint} />
      </Pressable>
      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>{displayTitle}</Text>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 50, // neccessary to be displayed otherwise it will sit under the screen
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 25,
  },
  title: {
    marginTop: 25,
    flex: 1,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    paddingLeft: 6,
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
