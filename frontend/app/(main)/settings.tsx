import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '@/utils/storage';
import { User } from '@/types/user';
import axios from 'axios';
import { endpoints } from '@/constants/endpoints';
import { NAV_HEIGHT } from '@/constants/layout';

export default function SettingsPage() {
  const router = useRouter();
  // store the users current risk tolerance
  const [currentRisk, setCurrentRisk] = useState('');
  // control whether the modal is visible or not
  const [showRiskModal, setShowRiskModal] = useState(false);
  // track if we're currently updating the risk
  const [loading, setLoading] = useState(false);
  // store the user id so we can update their risk in the database
  const [userId, setUserId] = useState<string>('');

  // the three risk options the user can choose from
  const riskOptions = ['Low Risk', 'Moderate Risk', 'High Risk'];

  // load user data when the page first loads
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await storage.getItem('user');
      if (userStr) {
        const user: User = JSON.parse(userStr);
        console.log('Loaded user data from storage:', user);
        console.log('User Risk field:', user.Risk);
        setCurrentRisk(user.Risk || 'Medium');
        setUserId(user.ID);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // function to handle when the user selects a new risk tolerance
  const handleUpdateRisk = async (newRisk: string) => {
    setLoading(true);
    try {
      // send the new risk value to the backend to update the database
      console.log('Sending update request with:', { user_id: userId, risk: newRisk });
      const response = await axios.put(`${endpoints.updateRisk}`, {
        user_id: parseInt(userId),
        risk: newRisk
      });
      console.log('Update response:', response.data);

      if (response.data) {
        // update the risk in local storage so it persists
        const userStr = await storage.getItem('user');
        if (userStr) {
          const user: User = JSON.parse(userStr);
          user.Risk = newRisk;
          await storage.setItem('user', JSON.stringify(user));
        }
        // update the UI and close the modal
        setCurrentRisk(newRisk);
        setShowRiskModal(false);
        Alert.alert('Success', 'Risk tolerance updated successfully');
      }
    } catch (error) {
      console.error('Error updating risk:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Request config:', error.config?.url);
      }
      Alert.alert('Error', 'Failed to update risk tolerance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* risk tolerance section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Tolerance</Text>
        <Text style={styles.sectionDescription}>
          Set your investment risk tolerance level
        </Text>
        
        {/* button to open the modal */}
        <TouchableOpacity 
          style={styles.riskButton}
          onPress={() => setShowRiskModal(true)}
        >
          <View>
            <Text style={styles.riskLabel}>Current Risk Level</Text>
            <Text style={styles.riskValue}>{currentRisk || 'Not set'}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* modal that appears when user wants to change their risk */}
      <Modal
        visible={showRiskModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRiskModal(false)}
      >
        {/* pressing outside the modal closes it */}
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRiskModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Risk Tolerance</Text>
            <Text style={styles.modalSubtitle}>
              Choose your comfort level with investment risk
            </Text>
            {/* map through each risk option and create a button for it */}
            {riskOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionButton}
                onPress={() => handleUpdateRisk(option)}
                disabled={loading}
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
                {/* show checkmark next to the currently selected option */}
                {currentRisk === option && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: NAV_HEIGHT + 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  riskButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  riskValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0B3D91',
  },
  arrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 20,
    color: '#0B3D91',
    fontWeight: '700',
  },
});
