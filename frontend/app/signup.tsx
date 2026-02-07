import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/user';
import { registerUser } from '../services/user';

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [risk, setRisk] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);

  const riskOptions = ['Low Risk', 'Moderate Risk', 'High Risk'];

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const created = await registerUser(username, email, password, risk);
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

  
  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <TextInput placeholder="Name" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#6B7280" />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} autoCapitalize="none" placeholderTextColor="#6B7280" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#6B7280" />
      
      {/* sisplays the box to select risk tolerance */}
      <TouchableOpacity 
        // when clicked it opens the modal which shows the options
        style={styles.dropdown} 
        onPress={() => setShowRiskDropdown(true)}
      >
        <Text style={risk ? styles.dropdownText : styles.dropdownPlaceholder}>
          {risk || 'Select Risk Tolerance'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {/* the modal which shows the risk options */}
      <Modal
        visible={showRiskDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRiskDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRiskDropdown(false)}
        >
          {/* displaying the dropdown thats shown when clicked */}
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
                <View>
                  <Text style={styles.optionText}>{option}</Text>
                  {/* showing a description for each risk level */}
                  <Text style={styles.optionDescription}>
                    {option === 'Low Risk' && 'Conservative - Minimal risk, stable returns'}
                    {option === 'Moderate Risk' && 'Balanced - Moderate risk and returns'}
                    {option === 'High Risk' && 'Aggressive - Higher risk, higher potential returns'}
                  </Text>
                </View>                
                {risk === option && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign up'}</Text>
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
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownText: {
    color: '#333',
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: '#6B7280',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#6B7280',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  optionButton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
    optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 18,
    color: '#0B3D91',
    fontWeight: '700',
  },
});
