import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { loginUser } from '../services/user';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <View style={styles.passwordRow}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            placeholderTextColor="#6B7280"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color="#0B3D91" />
          </TouchableOpacity>
        </View>
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: '#333',
  },
  eyeButton: {
    backgroundColor: 'transparent',
    padding: 0,
    marginLeft: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
