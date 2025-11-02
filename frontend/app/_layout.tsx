import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import BottomNavBar from '@/components/ui/bottom-nav-bar';
import TopNavBar from '@/components/ui/top-nav-bar';

// shared varibales for all classes to use 
export const unstable_settings = {};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
      <TopNavBar/>
        <View style={{ flex: 1, paddingBottom: 56 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </View>
      {/* <StatusBar style="auto" /> */}
      <BottomNavBar></BottomNavBar>
    </ThemeProvider>
  );
}
