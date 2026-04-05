import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { registerUser } from '../services/user';
import { MaterialIcons } from '@expo/vector-icons';

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [risk, setRisk] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);

  const riskOptions = ['Low Risk', 'Moderate Risk', 'High Risk'];

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const created = await registerUser(username, email, password, risk);
      if (created) {
        await storage.setItem('user', JSON.stringify(created));
        router.replace('/(main)/stock-holdings' as any);
        return;
      }
      Alert.alert('Sign up failed', 'Unable to register.');
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Sign up failed', 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerIconWrap}>
          <MaterialIcons name="person-add" size={28} color="#0b3d91" />
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Set up your profile and choose your risk level.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            placeholder="Your name"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
        </View>

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
              placeholder="Create a password"
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

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Risk tolerance</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowRiskDropdown(true)}>
            <Text style={risk ? styles.dropdownText : styles.dropdownPlaceholder}>{risk || 'Select a risk level'}</Text>
            <MaterialIcons name="expand-more" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={styles.buttonHome} onPress={handleBackToHome}>
          <Text style={styles.buttonHomeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showRiskDropdown} transparent animationType="fade" onRequestClose={() => setShowRiskDropdown(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRiskDropdown(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Risk Tolerance</Text>
            {riskOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionButton}
                onPress={() => {
                  setRisk(option);
                  setShowRiskDropdown(false);
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionDot, option === risk && styles.optionDotActive]} />
                  <View>
                    <Text style={styles.optionText}>{option}</Text>
                    <Text style={styles.optionDescription}>
                      {option === 'Low Risk' && 'Conservative - Minimal risk, stable returns'}
                      {option === 'Moderate Risk' && 'Balanced - Moderate risk and returns'}
                      {option === 'High Risk' && 'Aggressive - Higher risk, higher potential returns'}
                    </Text>
                  </View>
                </View>
                {risk === option && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  dropdown: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
    color: '#0f172a',
  },
  optionButton: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
  },
  optionDotActive: {
    backgroundColor: '#0b3d91',
  },
  optionText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#0B3D91',
    fontWeight: '700',
  },
});
