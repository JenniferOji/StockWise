import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';

import { storage } from '@/utils/storage';
import { User } from '@/types/user';
import axios from 'axios';
import { endpoints } from '@/constants/endpoints';
import { NAV_HEIGHT } from '@/constants/layout';
import { MaterialIcons } from '@expo/vector-icons';

const RISK_COLORS: any = {
  'Low Risk': '#22c55e',
  'Moderate Risk': '#eab308',
  'High Risk': '#ef4444',
};

export default function SettingsPage() {
  const [currentRisk, setCurrentRisk] = useState('');
  const [email, setEmail] = useState('');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const riskOptions = ['Low Risk', 'Moderate Risk', 'High Risk'];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await storage.getItem('user');
      if (userStr) {
        const user: User = JSON.parse(userStr);
        setCurrentRisk(user.Risk || 'Moderate');
        setUserId(user.ID);
        setEmail(user.Email || '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRisk = async (newRisk: string) => {
    setLoading(true);
    try {
      await axios.patch(endpoints.updateRisk(parseInt(userId)), {
        risk: newRisk,
      });

      const userStr = await storage.getItem('user');
      if (userStr) {
        const user: User = JSON.parse(userStr);
        user.Risk = newRisk;
        await storage.setItem('user', JSON.stringify(user));
      }

      setCurrentRisk(newRisk);
      setShowRiskModal(false);
      Alert.alert('Success', 'Risk updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update risk');
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView style={styles.container}>
      {/* page header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Manage your preferences and account
        </Text>
      </View>

      {/* risk settings */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Risk Tolerance</Text>
        <Text style={styles.sectionDescription}>
          Set your investment risk level
        </Text>

        <Pressable
          style={({ pressed }: { pressed: boolean }) => [
            styles.riskButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => setShowRiskModal(true)}
        >
          <View>
            <Text style={styles.riskLabel}>Current Risk</Text>
            <Text
              style={[
                styles.riskValue,
                { color: RISK_COLORS[currentRisk] || '#0B3D91' },
              ]}
            >
              {currentRisk || 'Not set'}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
        </Pressable>
      </View>

      {/* account details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.simpleRow}>
          <Text style={styles.rowText}>Email</Text>
          <Text style={styles.readonlyValue}>{email || 'Not available'}</Text>
        </View>
        <Text style={styles.readonlyHint}>Email cannot be changed.</Text>
      </View>

      {/* modal for risk selection */}
      <Modal visible={showRiskModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRiskModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Risk</Text>

            {riskOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  currentRisk === option && styles.optionActive,
                ]}
                onPress={() => handleUpdateRisk(option)}
                disabled={loading}
              >
                <View style={styles.optionLeft}>
                  <MaterialIcons
                    name={
                      option === 'Low Risk'
                        ? 'shield'
                        : option === 'Moderate Risk'
                        ? 'balance'
                        : 'trending-up'
                    }
                    size={20}
                    color="#0b3d91"
                  />
                  <Text style={styles.optionText}>{option}</Text>
                </View>

                {currentRisk === option && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb',
    padding: 16,
    paddingTop: NAV_HEIGHT + 10,
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e7edf5',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },

  sectionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },

  riskButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  riskLabel: {
    fontSize: 13,
    color: '#64748b',
  },

  riskValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  simpleRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  rowText: {
    fontSize: 14,
    color: '#0f172a',
  },

  readonlyValue: {
    fontSize: 13,
    color: '#64748b',
    maxWidth: '65%',
    textAlign: 'right',
  },

  readonlyHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },

  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  logoutText: {
    color: '#ef4444',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },

  optionButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  optionActive: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#0b3d91',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },

  checkmark: {
    fontSize: 18,
    color: '#0b3d91',
    fontWeight: '700',
  },
});