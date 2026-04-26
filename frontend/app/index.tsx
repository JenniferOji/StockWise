import { Text, TouchableOpacity, View, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from "../context";
import { useState, useEffect } from "react";
import { User } from "../types/user";
import { storage } from "../utils/storage";

// intro page with sign up and login navigation
export default function IntroPage() {
  const isLoadingComplete = useCachedResources();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // checks if user exists in storage and redirects if logged in
  useEffect(() => {
    async function getUser() {
      const user = await storage.getItem('user');
      if (user) {
        setUser(JSON.parse(user) as User);
      }
    }
    getUser();

  }, []);

  // navigates to signup page
  const handleSignUp = () => {
    router.push('/signup' as any);
  };

  // navigates to login page
  const handleLogin = () => {
    router.push('/login' as any);
  };

  if (!isLoadingComplete) {
    return null;
  }

  // renders thw welcome screen 
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.logoWrap}>
              <Image source={require('../assets/images/app-logo.png')} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.title}>Stock Wise</Text>
            <Text style={styles.subtitle}>Your portfolio. Simplified.</Text>

            <Text style={styles.bodyText}>
              Track holdings, compare performance, and understand risk with a clean view of your investments.
            </Text>

            <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={handleSignUp}>
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.secondaryButton} onPress={handleLogin}>
              <Text style={styles.secondaryButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </AuthContext.Provider>
  );
}
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: '#f3f6fb',
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
    content: {
      width: '100%',
      alignItems: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      backgroundColor: '#fff',
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 22,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.08,
      shadowRadius: 28,
      elevation: 8,
    },
    logoWrap: {
      width: 92,
      height: 92,
      borderRadius: 26,
      alignSelf: 'center',
      backgroundColor: '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: 8,
      textAlign: 'center',
    },
    logo: {
      width: 62,
      height: 62,
    },
    subtitle: {
      fontSize: 15,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: 12,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 21,
      color: '#475569',
      textAlign: 'center',
      marginBottom: 22,
    },
    button1: {
      backgroundColor: '#669af5ff',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      width: '100%',
      alignItems: 'center',
      marginTop: 8,
    },
    button2: {
      backgroundColor: '#0B3D91',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      width: '100%',
      alignItems: 'center',
      marginTop: 10,

    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
    },
    primaryButton: {
      backgroundColor: '#0b3d91',
      borderRadius: 14,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
      shadowColor: '#0b3d91',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 4,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    secondaryButton: {
      backgroundColor: '#eef2ff',
      borderRadius: 14,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#dbe4ee',
    },
    secondaryButtonText: {
      color: '#0b3d91',
      fontSize: 16,
      fontWeight: '700',
    },
  });
  
  
function useCachedResources(): boolean {
  return true;
}

