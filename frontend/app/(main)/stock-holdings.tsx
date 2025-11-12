import React, { useState, useMemo, useRef } from 'react';
import { Image, Text, StyleSheet, View, FlatList, TextInput, Pressable, Keyboard, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STOCKS } from '../../constants/stocks';
import { NAV_HEIGHT } from '@/constants/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export default function StockHoldings() {
  // query holds the current search text from the user 
  const [query, setQuery] = useState('');
  // state holding whether the dropdown is visible
  const [open, setOpen] = useState(false);
  // displayed is the list of stocks the user has added to the page 
  const [displayed, setDisplayed] = useState<typeof STOCKS[number][]>([]);

  // modal controls for the edit popup
  const [modalVisible, setModalVisible] = useState(false);
  // which stock is currently being edited in the modal
  const [selected, setSelected] = useState<typeof STOCKS[number] | null>(null);

  // Use a neutral icon color for the search icon so it stays visible on a white input
  const iconColor = Colors.light.icon;
  
  // compute matches from the stock list excluding already added items
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return STOCKS.filter(s => !displayed.some(d => d.symbol === s.symbol) && (s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)));
  }, [query, displayed]);

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
          <View style={styles.searchIcon} pointerEvents="box-none">
            <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
          </View>
        </View>
        {open && matches.length > 0 && (
          <View style={styles.searchDropdown}>
            <FlatList data={matches} keyExtractor={(i) => i.symbol} renderItem={({ item }) => (
              // tapping a search result will add that stock as a card to the page 
              <Pressable style={styles.dropdownItem} onPress={() => { setDisplayed(prev => [item, ...prev]); setQuery(''); setOpen(false); Keyboard.dismiss(); }}>
                <Text style={styles.ddSymbol}>{item.symbol}</Text>

                <Text style={styles.ddName}>{item.companyName}</Text>
              </Pressable>
            )} />
          </View>
        )}
      </View>
      {/* loops through the list of stocks in the displayed list and adds them as cards to the page */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        style={styles.listWrapper}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.shares}>{item.shares} shares</Text>
              <TouchableOpacity style={styles.editButton} onPress={() => { setSelected(item); setModalVisible(true); }}>
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
            <Text style={styles.modalText}>{selected ? `${selected.symbol} - ${selected.companyName}` : 'Edit'}</Text>
            {/* delete button removes the selected stock from the displayed list */}
            <Pressable
              style={styles.modalDelete}
              onPress={() => {
                if (selected) {
                  setDisplayed(prev => prev.filter(d => d.symbol !== selected.symbol));
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
  modalClose: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#0b3d91' },
  modalCloseText: { color: '#fff', fontWeight: '700' },
  modalDelete: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#ef4444' },
  modalDeleteText: { color: '#fff', fontWeight: '700' },
});
