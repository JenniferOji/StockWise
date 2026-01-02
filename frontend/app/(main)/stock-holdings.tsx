import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Image, Text, StyleSheet, View, FlatList, TextInput, Pressable, Keyboard, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STOCKS } from '../../constants/stocks';
import { NAV_HEIGHT } from '@/constants/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import * as SecureStore from 'expo-secure-store';
import { addStock, getUserStocks, updateStock, deleteStock } from '../../services/user';

export default function StockHoldings() {
  // query holds the current search text from the user 
  const [query, setQuery] = useState('');
  // state holding whether the dropdown is visible
  const [open, setOpen] = useState(false);
  // displayed is the list of stocks the user has added to the page 
  const [displayed, setDisplayed] = useState<typeof STOCKS[number][]>([]);
  // this lives in component state only; consider persisting to AsyncStorage or backend later

  // modal controls for the edit popup
  const [modalVisible, setModalVisible] = useState(false);
  // which stock is currently being edited in the modal
  const [selected, setSelected] = useState<typeof STOCKS[number] | null>(null);
  // editing shares value
  const [editShares, setEditShares] = useState('');

  // colour for the search bar icon 
  const iconColor = Colors.light.icon;

  // function to load the users stocks from the backend  
  const loadUserStocks = async () => {
    // get user from secure store 
    try {
      let userJson = null;
      try {
        userJson = await SecureStore.getItemAsync('user');
      } catch (secureStoreError) {
        if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
          userJson = (globalThis as any).localStorage.getItem('user');
        }
      }
      // if we have user data, parse and use it to get the stocks
      if (userJson) {
        const user = JSON.parse(userJson);
        const stocks = await getUserStocks(user.ID);
        if (stocks && Array.isArray(stocks)) {
          const displayedStocks = stocks.map((stock: any) => {
            const foundStock = STOCKS.find(s => s.symbol === stock.symbol);
            return foundStock ? { ...foundStock, shares: stock.quantity, dbId: stock.ID } : null;
          }).filter(Boolean);
          setDisplayed(displayedStocks as typeof STOCKS[number][]);
        }
      }
    } catch (err) {
      console.error('Error loading stocks:', err);
    }
  };

  // when the pasge loads it will get the users stocks from the backend and display it 
  useEffect(() => {
    loadUserStocks();
  }, []);
  
  // compute matches from the stock list excluding already added items
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // filter stocks by query and exclude ones already in the displayed list - if it type 'r' it will display stock containing r
    return STOCKS.filter(s => !displayed.some(d => d.symbol === s.symbol) && (s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)));
  }, [query, displayed]);
  // useMemo avoids recomputing the filtered list on every render unless query/displayed change

  // saving a users stock to the backend
  const saveStock = async (item: typeof STOCKS[number]) => {
      try {
        let userJson = null;
        // first try SecureStore
        try {
          userJson = await SecureStore.getItemAsync('user');
        } catch (secureStoreError) {
          if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
            userJson = (globalThis as any).localStorage.getItem('user');
          }
        }
        // if we have user data, parse and use it to save the stock
        if (userJson) {
          const user = JSON.parse(userJson);
          const result = await addStock(user.ID, item.symbol, item.companyName, item.shares);
          if (result) {
            await loadUserStocks();
          }
        }
      } catch (err) {
        console.error('Error saving stock:', err);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* search input - typing shows matches below */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search"
            placeholderTextColor="#6B7280"
            selectionColor="#0b3d91"
            value={query}
            onChangeText={(t) => { setQuery(t); setOpen(true); }} 
            onFocus={() => setOpen(true)}
            style={[styles.searchInput, styles.searchInputWithIcon]}
          />          
          {/* search icon is positioned absolutely inside the input field */}
          <View 
          style={styles.searchIcon} pointerEvents="box-none">
            <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
          </View>
        </View>
        {/* when the user starts typing it opens the dropdown menu to display stocks */}
        {open && matches.length > 0 && (
          <View style={styles.searchDropdown}>
            <FlatList data={matches} keyExtractor={(i) => i.symbol} renderItem={({ item }) => (
              // tapping a search result will add that stock as a card to the page - stores it in the displayed list
              <Pressable style={styles.dropdownItem} onPress={async () => { 
                setQuery(''); setOpen(false); await saveStock(item); Keyboard.dismiss();
              }}>
           <Text style={styles.ddSymbol}>{item.symbol}</Text>

              {/* show the company name under the symbol in the dropdown */}
           <Text style={styles.ddName}>{item.companyName}</Text>
              </Pressable>
            )} />
          </View>
        )}
      </View>
      {/* loops through the list of stocks in the displayed list and adds them as cards to the page */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => (item as any).dbId?.toString() || item.symbol}
        contentContainerStyle={styles.list}
        style={styles.listWrapper}
        renderItem={({ item }) => (
          <View style={styles.card}>
              <View style={styles.cardLeft}>
              <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.cardBody}>
              {/* symbol and company name shown in the card body */}
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <View style={styles.cardRight}>
              {/* shares and edit button on the right side of the card */}
              <Text style={styles.shares}>{item.shares} shares</Text>
              <TouchableOpacity style={styles.editButton} onPress={() => { setSelected(item); setEditShares(item.shares.toString()); setModalVisible(true); }}>
                <Text style={styles.editText}>edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* the pop up that displays when the edit button is clicked */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); setSelected(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* when exiting out of the pop up it goes from displaying the company name to edit */}
            {/* modal header shows which stock is being edited */}
            <Text style={styles.modalText}>{selected ? `${selected.symbol} - ${selected.companyName}` : 'Edit'}</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Number of Shares:</Text>
              <TextInput
                style={styles.modalInput}
                value={editShares}
                onChangeText={setEditShares}
                keyboardType="numeric"
                placeholder="Enter shares"
              />
            </View>

            <Pressable
              style={styles.modalSave}
              onPress={async () => {
                if (selected && (selected as any).dbId) {
                  const shares = parseFloat(editShares) || 0;
                  await updateStock((selected as any).dbId, shares);
                  await loadUserStocks();
                }
                setModalVisible(false);
                setSelected(null);
              }}
            >
              <Text style={styles.modalSaveText}>Save Changes</Text>
            </Pressable>

            {/* delete button removes the selected stock from the displayed list */}
            <Pressable
              style={styles.modalDelete}
              onPress={async () => {
                if (selected && (selected as any).dbId) {
                  await deleteStock((selected as any).dbId);
                  await loadUserStocks();
                }
                setModalVisible(false);
                setSelected(null);
              }}
            >
              <Text style={styles.modalDeleteText}>Delete stock</Text>
            </Pressable>

            <Pressable style={styles.modalClose} onPress={() => { setModalVisible(false); setSelected(null); }}>
              <Text style={styles.modalCloseText}>close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb', paddingTop: NAV_HEIGHT },
  listWrapper: { flex: 1 },
  list: { paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardLeft: { width: 52, height: 52, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 8 },
  cardBody: { flex: 1 },
  symbol: { fontSize: 16, fontWeight: '700', color: '#0b3d91' },
  name: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardRight: { marginLeft: 8, alignItems: 'flex-end' },
  shares: { fontSize: 14, fontWeight: '600', color: '#111' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12 , color: '#111' },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, elevation: 1, color: '#111' },
  searchRow: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  searchInputWithIcon: { paddingRight: 44 },
  searchIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', padding: 8 },
  searchIconText: { fontSize: 18, color: '#6B7280' },
  searchDropdown: { backgroundColor: '#fff', marginTop: 8, borderRadius: 8, maxHeight: 220, elevation: 4, paddingVertical: 4 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  ddSymbol: { fontSize: 14, fontWeight: '700' },
  ddName: { fontSize: 12, color: '#6b7280' },
  editButton: { marginTop: 8, backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#0b3d91', fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center' },
  modalText: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInputContainer: { width: '100%', marginBottom: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, color: '#333' },
  modalSave: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  modalClose: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#0b3d91', alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: '700' },
  modalDelete: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center' },
  modalDeleteText: { color: '#fff', fontWeight: '700' },
});
