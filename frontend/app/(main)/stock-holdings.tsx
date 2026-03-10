import React, { useState, useMemo, useEffect } from 'react';
import { Image, Text, StyleSheet, View, FlatList, TextInput, Pressable, Keyboard, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STOCKS } from '../../constants/stocks';
import { NAV_HEIGHT } from '@/constants/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { storage } from '../../utils/storage';
import { addStock, getUserStocks, updateStock, deleteStock, getStockSentiment } from '../../services/user';

export default function StockHoldings() {
  // query holds the current search text from the user 
  const [query, setQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  // displayed is the list of stocks the user has added to the page 
  const [displayed, setDisplayed] = useState<typeof STOCKS[number][]>([]);
  // aggregated sentiment for each stock   
  const [sentiment, setSentiment] = useState<any>({});


  // modal controls for the edit popup
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('edit');
  // which stock is currently being edited in the modal
  const [selected, setSelected] = useState<typeof STOCKS[number] | null>(null);
  // editing shares value
  const [editShares, setEditShares] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');

  // colour for the search bar icon 
  const iconColor = Colors.light.icon;
  const isFormValid = Number.isFinite(parseFloat(editShares)) && Number.isFinite(parseFloat(editPurchasePrice)) && parseFloat(editShares) > 0 && parseFloat(editPurchasePrice) > 0;

  // function to load the users stocks from the backend  
  const loadUserStocks = async () => {
    try {
      const userJson = await storage.getItem('user');
      // if we have user data, parse and use it to get the stocks
      if (userJson) {
        const user = JSON.parse(userJson);
        const stocks = await getUserStocks(user.ID);
        const sentimentData = await getStockSentiment(user.ID);

        setSentiment(sentimentData || {});

        if (stocks && Array.isArray(stocks)) {
          const displayedStocks = stocks.map((stock: any) => {
            const foundStock = STOCKS.find(s => s.symbol === stock.symbol);
            const shares = Number(stock.quantity ?? stock.shares ?? 0);
            const purchasePrice = Number(stock.purchasePrice ?? stock.purchase_price ?? 0);

            return foundStock ? { 
              ...foundStock, 
              shares: stock.quantity,
              purchasePrice: stock.purchasePrice,
              // shares: Number.isFinite(shares) ? shares : 0,
              // purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
              dbId: stock.ID } : null;
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
  
  // colour label for sentiment 
  const getSentimentColor = (label?: string) => {
    if (label === 'bullish') return '#00c853';
    if (label === 'bearish') return '#ff1744';
    return '#ff9100';
  };

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
  const saveStock = async (item: typeof STOCKS[number], shares: number, purchasePrice: number) => {
    try {
      const userJson = await storage.getItem('user');
      if (!userJson) return;

      const user = JSON.parse(userJson);
      const result = await addStock(
        user.ID,
        item.symbol,
        item.companyName,
        shares,
        purchasePrice,
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
      {/* sentiment legend bar to eplain indicators  */}
      <View style={styles.sentimentLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00c853' }]} />
          <Text style={styles.legendText}>Bullish</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff9100' }]} />
          <Text style={styles.legendText}>Neutral</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff1744' }]} />
          <Text style={styles.legendText}>Bearish</Text>
        </View>
      </View>
      {/* loops through the list of stocks in the displayed list and adds them as cards to the page */}
      <FlatList
        data={filteredDisplayed}
        keyExtractor={(item) => (item as any).dbId?.toString() || item.symbol}
        contentContainerStyle={styles.list}
        style={styles.listWrapper}
        renderItem={({ item }) => {
          // find sentiment for this stock using the symbol key
          const sentimentData = sentiment[item.symbol] || sentiment[item.companyName];

          return (
          <View style={styles.card}>
              <View style={styles.cardLeft}>
              <Image source={{ uri: item.imageUrl }} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.cardBody}>
              {/* symbol and sentiment indicator shown in the card body */}
              <View style={styles.symbolRow}>
                <Text style={styles.symbol}>{item.symbol}</Text>

                {/* display sentiment indicator if its available */}
                {sentimentData && (
                  <View
                    style={[
                      styles.sentimentDot,
                      { backgroundColor: getSentimentColor(sentimentData.label) }
                    ]}
                  />
                )}
              </View>

              {/* company name */}
              <Text style={styles.name}>{item.companyName}</Text>
            </View>
            <View style={styles.cardRight}>
              {/* shares and edit button on the right side of the card */}
              <Text style={styles.shares}>{item.shares} shares</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setFormMode('edit');
                  setSelected(item);
                  setEditShares(String(item.shares ?? ''));
                  setEditPurchasePrice(String(item.purchasePrice ?? ''));
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

      {/* pop up for adding stocks user does not currently hold */}
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
                    setEditShares('');
                    setEditPurchasePrice('');
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
              <Text style={styles.modalLabel}>Purchased price:</Text>
              <TextInput
                style={styles.modalInput}
                value={editPurchasePrice}
                onChangeText={setEditPurchasePrice}
                keyboardType="numeric"
                placeholder="Enter price"
              />
            </View>

            <Pressable
              style={[styles.modalSave, !isFormValid && styles.modalSaveDisabled]}
              disabled={!isFormValid}
              onPress={async () => {
                const shares = parseFloat(editShares);
                const purchasePrice = parseFloat(editPurchasePrice);

                if (!selected || !Number.isFinite(shares) || !Number.isFinite(purchasePrice) || shares <= 0 || purchasePrice <= 0) {
                  return;
                }

                if (formMode === 'add') {
                  await saveStock(selected, shares, purchasePrice);
                } else if ((selected as any).dbId) {
                  await updateStock((selected as any).dbId, shares, purchasePrice);
                  await loadUserStocks();
                }

                setModalVisible(false);
                setSelected(null);
                setEditShares('');
                setEditPurchasePrice('');
              }}
            >
              <Text style={styles.modalSaveText}>{formMode === 'add' ? 'Add Stock' : 'Save Changes'}</Text>
            </Pressable>

            {/* delete button removes the selected stock from the displayed list */}
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
                  setEditShares('');
                  setEditPurchasePrice('');
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
                setEditShares('');
                setEditPurchasePrice('');
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
  modalInputContainer: { width: '100%', marginBottom: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, color: '#333' },
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
  sentiment: {fontSize: 12,fontWeight: '700', marginTop: 4, textTransform: 'capitalize'},
  symbolRow: {flexDirection: 'row',alignItems: 'center',gap: 6},
  sentimentDot: {width: 10,height: 10,borderRadius: 5},
  sentimentLegend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#edeaea', borderRadius: 10, elevation: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: '#444' },
});