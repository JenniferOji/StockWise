import { Text, TouchableOpacity, View, StyleSheet, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from "../context";
import { useState, useEffect } from "react";
import { User } from "../types/user";
import * as SecureStore from 'expo-secure-store';
const { width } = Dimensions.get('window');

export default function IntroPage() {
  const isLoadingComplete = useCachedResources();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null); // it will either be user or null but we initialise it to null

  // everytime user opens the we open the securestore and check if there is a user saved
  useEffect(() => {
    async function getUser() {
      try {
        const getItem = (SecureStore as any).getItemAsync;
        if (typeof getItem === 'function') {
          const user = await getItem('user');
          if (user) setUser(JSON.parse(user) as User);
        } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
          const u = (globalThis as any).localStorage.getItem('user');
          if (u) setUser(JSON.parse(u) as User);
        }
      } catch (e) {
      }
    }
    getUser();

  }, []);

  const handleStart = () => {
    router.push('/signup' as any);
  };

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
        <AuthContext.Provider value={{ user, setUser }}>
          <View style={styles.container}>
            <View style={styles.content}>
              <View>
                <Image source={require('../assets/images/app-logo.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Stock Wise</Text>
      
              <Text style={styles.subtitle}>Your portfolio. Simplified</Text>
      
              <TouchableOpacity activeOpacity={0.85} style={styles.button} onPress={handleStart}>
                <Text style={styles.buttonText}>Optimise now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AuthContext.Provider>
      );
    }
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#E3F2FD', 
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 25,
    },
    content: {
      width: '100%',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#0B3D91', 
      marginBottom: 16,
    },
    logoWrap: {
      width: 140,
      height: 140,
      borderRadius: 28,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    logo: {
      width: 200,
      height: 200,
      borderRadius: 16,
    },
    subtitle: {
      fontSize: 18,
      color: '#1967B2', 
      textAlign: 'center',
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    button: {
      backgroundColor: '#0B3D91',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 28,
      minWidth: Math.min(320, width * 0.7),
      alignItems: 'center',
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
  
  
function useCachedResources(): boolean {
  return true;
}

