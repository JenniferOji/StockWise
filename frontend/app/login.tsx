import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { User } from '../types/user';
import { loginUser } from '../services/user';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      console.log('Login result:', user);
      if (user) {
        await storage.setItem('user', JSON.stringify(user));
        setLoading(false);
        console.log('navigate to stock holdings');
        router.replace('/(main)/stock-holdings' as any);
        return;
      }
      console.log('Login failed - no user data returned');
      Alert.alert('Login failed', 'Invalid email or password.');
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Login failed', 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Log in to account</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} autoCapitalize="none" placeholderTextColor="#6B7280" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#6B7280" />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log in'}</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={styles.buttonHome} onPress={handleBackToHome}>
            <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#0B3D91',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonHome: {
    backgroundColor: '#669af5ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
