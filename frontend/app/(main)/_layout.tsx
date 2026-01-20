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
import Insights from './insights';
import Settings from './settings';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// shared varibales for all classes to use 
export const unstable_settings = {};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const Drawer = createDrawerNavigator();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1}}>
          <Drawer.Navigator drawerContent={(props) => <DrawerContent {...props} />} screenOptions={{ header: ({ navigation }: { navigation?: any }) => React.createElement(TopNavBar as any, { navigation }), headerShown: true }}>
            <Drawer.Screen name="stock-holdings" component={StockHoldings} />
            <Drawer.Screen name="news" component={News} />
            {/* <Drawer.Screen name="portfolio-insights" component={PortfolioInsights} /> */}
            <Drawer.Screen name="insights" component={Insights} />
            <Drawer.Screen name="settings" component={Settings} />
          </Drawer.Navigator>
          <BottomNavBar />
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
