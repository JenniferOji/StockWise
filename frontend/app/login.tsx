import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
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

  // authenticates the user with their email and password
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

  // navigates back to intro page
  const handleBackToHome = () => {
    router.push('/');
  };

  // renders the login form with email and password fields
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerIconWrap}>
          <MaterialIcons name="lock" size={28} color="#0b3d91" />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue to your portfolio.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              placeholderTextColor="#94a3b8"
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
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log in'}</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={styles.buttonHome} onPress={handleBackToHome}>
          <Text style={styles.buttonHomeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f3f6fb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#0f172a',
    fontSize: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  eyeButton: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#dbe4ee',
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: '#0b3d91',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0b3d91',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonHome: {
    backgroundColor: '#eef2ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dbe4ee',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonHomeText: {
    color: '#0b3d91',
    fontWeight: '700',
    fontSize: 14,
  },
});
