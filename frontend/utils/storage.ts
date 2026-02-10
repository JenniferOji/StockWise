import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

let isSecureStoreAvailable = false;
let isLocalStorageAvailable = false;

const initialiseStorage = () => {
  if (Platform.OS !== 'web') {
    // on mobile, use secure store
    isSecureStoreAvailable = true;
  }
    // on web, use local storage 
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    isLocalStorageAvailable = true;
  }
};

initialiseStorage();

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        // use SecureStore on mobile
        await SecureStore.setItemAsync(key, value);
      } else if (isLocalStorageAvailable) {
        // use localStorage on web
        globalThis.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error saving to storage [${key}]:`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (isSecureStoreAvailable) {
        // use SecureStore on mobile
        return await SecureStore.getItemAsync(key);
      } else if (isLocalStorageAvailable) {
        // use localStorage on web
        return globalThis.localStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Error reading from storage [${key}]:`, error);
    }
    return null;
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        // use SecureStore on mobile
        await SecureStore.deleteItemAsync(key);
      } else if (isLocalStorageAvailable) {
        // use localStorage on web
        globalThis.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing from storage [${key}]:`, error);
    }
  },
};
