import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import BottomNavBar from '@/components/ui/bottom-nav-bar';
import TopNavBar from '@/components/ui/top-nav-bar';
import DrawerContent from '@/components/ui/drawer';
import StockHoldings from './stock-holdings';
import News from './news';
import PortfolioInsights from './portfolio-insights';

// shared varibales for all classes to use 
export const unstable_settings = {};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const Drawer = createDrawerNavigator();

  return (
    <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1}}>
        <Drawer.Navigator drawerContent={(props) => <DrawerContent {...props} />} screenOptions={{ header: () => <TopNavBar />, headerShown: true }}>
          <Drawer.Screen name="stock-holdings" component={StockHoldings} />
          <Drawer.Screen name="news" component={News} />
          <Drawer.Screen name="portfolio-insights" component={PortfolioInsights} />
        </Drawer.Navigator>
        <BottomNavBar />
      </View>
    </ThemeProvider>
  );
}
