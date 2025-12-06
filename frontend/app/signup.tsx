import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/user';
import { registerUser } from '../services/user';

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const created = await registerUser(username, email, password);
      console.log('Registration result:', created);
      if (created) {
        try {
          const setItem = (SecureStore as any).setItemAsync;
          if (typeof setItem === 'function') {
            await setItem('user', JSON.stringify(created));
          } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
            (globalThis as any).localStorage.setItem('user', JSON.stringify(created));
          }
        } catch (e) {
        }
        setLoading(false);
        console.log('About to navigate to stock holdings...');
        router.replace('/(main)/stock-holdings' as any);
        return;
      }
      console.log('Registration failed - no user data returned');
      Alert.alert('Sign up failed', 'Unable to register.');
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Sign up failed', 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <TextInput placeholder="Name" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign up'}</Text>
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
  },
  button: {
    backgroundColor: '#0B3D91',
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
