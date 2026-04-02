import React, { useState, useMemo, useEffect } from 'react';
import { Image, Text, StyleSheet, View, FlatList, TextInput, Pressable, Keyboard, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import STOCKS from '../../constants/stocks.json';
import { NAV_HEIGHT } from '@/constants/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { storage } from '../../utils/storage';
import { addStock, getUserStocks, updateStock, deleteStock } from '../../services/user';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function StockHoldings() {
  // query holds the current search text from the user 
  const [query, setQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  // displayed is the list of stocks the user has added to the page 
  const [displayed, setDisplayed] = useState<typeof STOCKS[number][]>([]);

  // modal controls for the edit popup
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('edit');
  // which stock is currently being edited in the modal
  const [selected, setSelected] = useState<typeof STOCKS[number] | null>(null);
  // editing shares value
  const [entries, setEntries] = useState([{ shares: '', price: '' }]);

  // colour for the search bar icon 
  const iconColor = Colors.light.icon;
  const isFormValid = entries.every(e =>
    Number.isFinite(parseFloat(e.shares)) &&
    Number.isFinite(parseFloat(e.price)) &&
    parseFloat(e.shares) > 0 &&
    parseFloat(e.price) > 0
  );
  
  // function to load the users stocks from the backend  
  const loadUserStocks = async () => {
    try {
      const userJson = await storage.getItem('user');
      // if we have user data, parse and use it to get the stocks
      if (userJson) {
        const user = JSON.parse(userJson);
        const stocks = await getUserStocks(user.ID);

        if (stocks && Array.isArray(stocks)) {
          const displayedStocks = stocks.map((stock: any) => {
          const symbol = stock.symbol || stock.ticker;
          const foundStock = STOCKS.find(s => s.symbol === symbol);
          if (!foundStock) return null;

          const entries = stock.entries || [];

          const totalShares = entries.reduce(
            (sum: number, e: any) => sum + (e.quantity || 0),
            0
          );

          const avgPrice =
            totalShares > 0
              ? entries.reduce(
                  (sum: number, e: any) =>
                    sum + (e.quantity || 0) * (e.purchase_price || 0),
                  0
                ) / totalShares
              : 0;

          return {
            ...foundStock,
            shares: totalShares,
            purchasePrice: avgPrice,
            entries: entries,
            dbId: stock.ID
          };
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

  // Filter only stocks the user currently holds.
  const filteredDisplayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayed;
    return displayed.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q)
    );
  }, [query, displayed]);

  // Search list for stocks user does not currently hold.
  const stocksToAdd = useMemo(() => {
    const heldSymbols = new Set(displayed.map((s) => s.symbol));
    const q = addQuery.trim().toLowerCase();

    return STOCKS.filter((s) => {
      if (heldSymbols.has(s.symbol)) return false;
      if (!q) return true;
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q)
      );
    });
  }, [displayed, addQuery]);

  // Save a new stock to backend and refresh displayed holdings.
  const saveStock = async (item: typeof STOCKS[number], entriesData: any[]) => {
    try {
      const userJson = await storage.getItem('user');
      if (!userJson) return;

      const user = JSON.parse(userJson);
      const result = await addStock(
        user.ID,
        item.symbol,
        item.companyName,
        entriesData,
        item.sector
      );

      if (result) {
        await loadUserStocks();
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
          <View style={styles.searchInputContainer}>
            <TextInput
              placeholder="Search"
              placeholderTextColor="#6B7280"
              selectionColor="#0b3d91"
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, styles.searchInputWithIcon]}
            />
            {/* search icon is positioned absolutely inside only the input field */}
            <View style={styles.searchIcon} pointerEvents="none">
              <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
            </View>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => {
              setAddQuery('');
              setAddModalVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredDisplayed}
        keyExtractor={(item) => (item as any).dbId?.toString() || item.symbol}
        contentContainerStyle={styles.list}
        style={styles.listWrapper}
        renderItem={({ item }) => {
          return (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Image
                source={{
                  uri: item.imageUrl,
                  cache: 'reload'
                }}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardBody}>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
              </View>
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.shares}>{item.shares} shares</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setFormMode('edit');
                  setSelected(item);
                  const mapped = (item as any).entries?.map((e: any) => ({
                    shares: String(e.quantity),
                    price: String(e.purchase_price)
                  })) || [{ shares: '', price: '' }];
                  setEntries(mapped);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.editText}>edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        }}
      />

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Add Stock</Text>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                value={addQuery}
                onChangeText={setAddQuery}
                placeholder="Search stocks to add"
              />
            </View>

            <FlatList
              data={stocksToAdd}
              keyExtractor={(item) => item.symbol}
              style={styles.addList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.addListItem}
                  onPress={() => {
                    setFormMode('add');
                    setSelected(item);
                    setEntries([{ shares: '', price: '' }]);
                    Keyboard.dismiss();
                    setAddModalVisible(false);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.ddSymbol}>{item.symbol}</Text>
                  <Text style={styles.ddName}>{item.companyName}</Text>
                </Pressable>
              )}
            />

            <Pressable style={styles.modalClose} onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCloseText}>close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); setSelected(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>{selected ? `${selected.symbol} - ${selected.companyName}` : 'Edit'}</Text>
            
            <View style={styles.modalInputContainer}>
              <ScrollView
                style={styles.entriesScrollView}
                contentContainerStyle={styles.entriesScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {entries.map((entry, index) => (
                  <View key={index} style={styles.entryBlock}>
                    {/* remove button */}
                    <View style={styles.entryHeaderRow}>
                      <Text style={styles.entryLabel}>{ordinal(index + 1)} Investment</Text>
                      {entries.length > 1 && (
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => {
                            const updated = entries.filter((_, i) => i !== index);
                            setEntries(updated);
                          }}
                        >
                          <Text style={styles.removeBtnText}>−</Text>
                        </Pressable>
                      )}
                    </View>

                    <Text style={styles.modalLabel}>Number of Shares:</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={entry.shares}
                      onChangeText={(text) => {
                        const updated = [...entries];
                        updated[index].shares = text;
                        setEntries(updated);
                      }}
                      keyboardType="numeric"
                      placeholder="Enter shares"
                    />
                    <Text style={styles.modalLabel}>Purchased price:</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={entry.price}
                      onChangeText={(text) => {
                        const updated = [...entries];
                        updated[index].price = text;
                        setEntries(updated);
                      }}
                      keyboardType="numeric"
                      placeholder="Enter price"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* entry button */}
            <Pressable
              style={styles.addEntryBtn}
              onPress={() => setEntries([...entries, { shares: '', price: '' }])}
            >
              <Text style={styles.addEntryBtnText}>+</Text>
            </Pressable>

            <Pressable
              style={[styles.modalSave, !isFormValid && styles.modalSaveDisabled]}
              disabled={!isFormValid}
              onPress={async () => {
                const formattedEntries = entries.map(e => ({
                  quantity: parseFloat(e.shares),
                  purchase_price: parseFloat(e.price)
                }));

                if (!selected) return;

                if (formMode === 'add') {
                  await saveStock(selected, formattedEntries);
                } else if ((selected as any).dbId) {
                  await updateStock((selected as any).dbId, formattedEntries);
                  await loadUserStocks();
                }

                setModalVisible(false);
                setSelected(null);
                setEntries([{ shares: '', price: '' }]);
              }}
            >
              <Text style={styles.modalSaveText}>{formMode === 'add' ? 'Add Stock' : 'Save Changes'}</Text>
            </Pressable>

            {formMode === 'edit' && (
              <Pressable
                style={styles.modalDelete}
                onPress={async () => {
                  if (selected && (selected as any).dbId) {
                    await deleteStock((selected as any).dbId);
                    await loadUserStocks();
                  }
                  setModalVisible(false);
                  setSelected(null);
                  setEntries([{ shares: '', price: '' }]);
                }}
              >
                <Text style={styles.modalDeleteText}>Delete stock</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setModalVisible(false);
                setSelected(null);
                setEntries([{ shares: '', price: '' }]);
              }}
            >
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
  searchInputContainer: { flex: 1, position: 'relative' },
  searchInput: { width: '100%', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, elevation: 1, color: '#111' },
  searchRow: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  searchInputWithIcon: { paddingRight: 44 },
  searchIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', padding: 8 },
  addButton: { marginLeft: 8, backgroundColor: '#0b3d91', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editButton: { marginTop: 8, backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#0b3d91', fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center' },
  modalText: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInputContainer: { width: '100%', marginBottom: 4 },
  entriesScrollView: { width: '100%', maxHeight: 280 },
  entriesScrollContent: { paddingBottom: 8 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, color: '#333', marginBottom: 8 },
  addList: { width: '100%', maxHeight: 240, marginBottom: 8 },
  addListItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', width: '100%' },
  ddSymbol: { fontSize: 14, fontWeight: '700' },
  ddName: { fontSize: 12, color: '#6b7280' },
  modalSave: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' },
  modalSaveDisabled: { backgroundColor: '#9ca3af' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  modalClose: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#0b3d91', alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: '700' },
  modalDelete: { width: '100%', marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center' },
  modalDeleteText: { color: '#fff', fontWeight: '700' },
  entryBlock: { width: '100%', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginBottom: 4 },
  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryLabel: { fontSize: 13, fontWeight: '700', color: '#0b3d91' },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#dc2626', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  addEntryBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0b3d91', justifyContent: 'center', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  addEntryBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
});