import React, { useState, useMemo, useEffect } from 'react';
import { Image, Text, StyleSheet, View, FlatList, TextInput, Pressable, Keyboard, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import STOCKS from '../../constants/stocks.json';
import { NAV_HEIGHT } from '@/constants/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { storage } from '../../utils/storage';
import { getUserStocks } from '../../services/user';
import { addStock, updateStock, deleteStock } from '../../services/holdings';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function StockHoldings() {
  // search text for current holdings
  const [query, setQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  // stocks currently shown on the page
  const [displayed, setDisplayed] = useState<typeof STOCKS[number][]>([]);

  // modal state for add and edit flows
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('edit');
  // stock selected in the modal
  const [selected, setSelected] = useState<typeof STOCKS[number] | null>(null);
  // editable list of buy entries
  const [entries, setEntries] = useState([{ shares: '', price: '' }]);

  // icon colour for search field
  const iconColor = Colors.light.icon;
  const isFormValid = entries.every(e =>
    Number.isFinite(parseFloat(e.shares)) &&
    Number.isFinite(parseFloat(e.price)) &&
    parseFloat(e.shares) > 0 &&
    parseFloat(e.price) > 0
  );
  
  // load user holdings from the api
  const loadUserStocks = async () => {
    try {
      const userJson = await storage.getItem('user');
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

          // calculate the average purchase price across multiple entries for the same stock
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

  // load stocks when page opens
  useEffect(() => {
    loadUserStocks();
  }, []);

  // filter stocks already in portfolio by search text
  const filteredDisplayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayed;
    return displayed.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q)
    );
  }, [query, displayed]);

  // build list of stocks user can still add
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

  // add a stock then refresh the list
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

  // rendering the stock holdings page 
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.pageShell, styles.pageHeader]}>
        <Text style={styles.pageSubtitle}>
          View, search, and manage the stocks currently in your portfolio to enable insights.
        </Text>
      </View>

      {/* search field and add button at the top of the page */}
      <View style={[styles.pageShell, styles.searchContainer]}>
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
            <View style={styles.addButtonContent}>
              <IconSymbol name="plus" size={14} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* showing the list of stocks in the user's portfolio  */}
      <FlatList
        data={filteredDisplayed}
        keyExtractor={(item) => (item as any).dbId?.toString() || item.symbol}
        contentContainerStyle={styles.list}
        style={[styles.pageShell, styles.listWrapper]}
        ListEmptyComponent={
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>
              {displayed.length === 0 ? 'No stocks in your portfolio yet.' : 'No matching stocks found.'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {displayed.length === 0
                ? 'Click the + Add button to get started.'
                : 'Try searching with a different ticker or company name.'}
            </Text>
          </View>
        }
        // render each stock row with the symbol, company name, number of shares and an edit button to update the entries for that stock
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

      {/* the pop up modal for adding a new stock and editing an existing stock */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalText}>Add Stock</Text>
              <Pressable style={styles.modalIconClose} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalIconCloseText}>×</Text>
              </Pressable>
            </View>

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
              showsVerticalScrollIndicator={false}
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
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { setModalVisible(false); setSelected(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalText}>{selected ? `${selected.symbol} - ${selected.companyName}` : 'Edit'}</Text>
              <Pressable
                style={styles.modalIconClose}
                onPress={() => {
                  setModalVisible(false);
                  setSelected(null);
                  setEntries([{ shares: '', price: '' }]);
                }}
              >
                <Text style={styles.modalIconCloseText}>×</Text>
              </Pressable>
            </View>
            
            {/* rendering the list of entries for the selected stock */}
            <View style={styles.modalInputContainer}>
              <Text style={styles.entryHelperText}>
                If you bought this stock in multiple installments, add each purchase using the + button.
                You can also enter your average purchase price with your total shares to date.
              </Text>
              <ScrollView
                style={styles.entriesScrollView}
                contentContainerStyle={styles.entriesScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {entries.map((entry, index) => (
                  <View key={index} style={styles.entryBlock}>
                    {/* remove this entry row */}
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

            {/* add another entry row */}
            <Pressable
              style={styles.addEntryBtn}
              onPress={() => setEntries([...entries, { shares: '', price: '' }])}
            >
              <IconSymbol name="plus" size={18} color="#fff" />
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
                  const userJson = await storage.getItem('user');
                  if (!userJson) return;
                  const user = JSON.parse(userJson);
                  await updateStock(user.ID, (selected as any).dbId, formattedEntries);
                  await loadUserStocks();
                }

                setModalVisible(false);
                setSelected(null);
                setEntries([{ shares: '', price: '' }]);
              }}
            >
              <Text style={styles.modalSaveText}>{formMode === 'add' ? 'Add Stock' : 'Save Changes'}</Text>
            </Pressable>
            
            {/* deletes the stock from the user's portfolio and refreshes the list */}
            {formMode === 'edit' && (
              <Pressable
                style={styles.modalDelete}
                onPress={async () => {
                  if (selected && (selected as any).dbId) {
                    const userJson = await storage.getItem('user');
                    if (!userJson) return;
                    const user = JSON.parse(userJson);
                    await deleteStock(user.ID, (selected as any).dbId);
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
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb', paddingTop: NAV_HEIGHT, paddingBottom: NAV_HEIGHT},
  pageShell: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  pageHeader: { paddingHorizontal: 12, paddingTop: 12, marginBottom: 2 },
  pageSubtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  listWrapper: { flex: 1 },
  list:{ paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius:12, padding:14, marginBottom:6, shadowColor:'#000', shadowOffset:{ width:0, height:6 }, shadowOpacity:0.06, shadowRadius:10, elevation:3 },
  cardLeft: { width: 52, height: 52, marginRight: 12, justifyContent: 'center', alignItems:'center' },
  logo: { width: 44, height: 44, borderRadius: 8 },
  cardBody:{ flex: 1 },
  symbol:{ fontSize: 16, fontWeight: '700', color: '#0b3d91' },
  name: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardRight: { marginLeft: 8, alignItems: 'flex-end' },
  shares: { fontSize: 14, fontWeight: '600', color: '#111' },
  searchContainer: { paddingHorizontal: 12, paddingTop:12, paddingBottom: 5,color:'#111' },
  searchInputContainer: { flex: 1, position: 'relative' },
  searchInput: { width:'100%', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, elevation: 1, color: '#111' },
  searchRow: { position:'relative', flexDirection: 'row', alignItems: 'center' },
  searchInputWithIcon: { paddingRight: 44 },
  searchIcon:{ position:'absolute', right:12, top:0, bottom:0, justifyContent:'center', alignItems:'center', padding:8 },
  addButton:{ marginLeft:10, backgroundColor:'#0b3d91', borderRadius:12, minWidth:112, paddingHorizontal:22, paddingVertical:10, justifyContent:'center', alignItems:'center' },
  addButtonContent:{ flexDirection:'row', alignItems:'center', gap:6 },
  addButtonText:{ color:'#fff', fontWeight:'800', fontSize:15 },
  editButton:{ marginTop:8, backgroundColor:'#eef2ff', paddingHorizontal:8, paddingVertical:6, borderRadius:8 },
  editText:{ color:'#0b3d91', fontWeight:'700', fontSize:12 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(15,23,42,0.45)', justifyContent:'center', alignItems:'center', padding:16 },
  modalCard:{ width:'100%', maxWidth:520, backgroundColor:'#fff', padding:18, borderRadius:18, borderWidth:1, borderColor:'#e7edf5', shadowColor:'#0f172a', shadowOffset:{ width:0, height:14 }, shadowOpacity:0.12, shadowRadius:24, elevation:8 },
  modalHeader:{ width:'100%', flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  modalIconClose:{ width:32, height:32, borderRadius:16, backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center' },
  modalIconCloseText:{ color:'#475569', fontSize:20, fontWeight:'700', lineHeight:24 },
  modalText:{ fontSize:18, fontWeight:'800', color:'#0f172a' },
  modalInputContainer:{ width:'100%', marginBottom:8 },
  entriesScrollView:{ width:'100%', maxHeight:300 },
  entriesScrollContent:{ paddingBottom:8 },
  modalLabel:{ fontSize:13, fontWeight:'700', marginBottom:6, color:'#334155' },
  modalInput:{ width:'100%', borderWidth:1, borderColor:'#dbe4ee', borderRadius:12, paddingHorizontal:12, paddingVertical:10, fontSize:15, color:'#0f172a', marginBottom:8, backgroundColor:'#f8fafc' },
  addList:{ width:'100%', maxHeight:250, marginBottom:10 },
  addListItem:{ paddingHorizontal:12, paddingVertical:11, borderWidth:1, borderColor:'#edf2f7', borderRadius:10, width:'100%', backgroundColor:'#f8fafc', marginBottom:8 },
  ddSymbol:{ fontSize:14, fontWeight:'800', color:'#0f172a' },
  ddName:{ fontSize:12, color:'#64748b', marginTop:2 },
  modalSave:{ width:'100%', marginTop:8, paddingVertical:12, paddingHorizontal:14, borderRadius:12, backgroundColor:'#0b3d91', alignItems:'center' },
  modalSaveDisabled:{ backgroundColor:'#94a3b8' },
  modalSaveText:{ color:'#fff', fontWeight:'800' },
  modalClose:{ width:'100%', marginTop:8, paddingVertical:12, paddingHorizontal:14, borderRadius:12, backgroundColor:'#f1f5f9', borderWidth:1, borderColor:'#dbe4ee', alignItems:'center' },
  modalCloseText:{ color:'#334155', fontWeight:'700' },
  modalDelete:{ width:'100%', marginTop:8, paddingVertical:12, paddingHorizontal:14, borderRadius:12, backgroundColor:'#fff1f2', borderWidth:1, borderColor:'#fecdd3', alignItems:'center' },
  modalDeleteText:{ color:'#be123c', fontWeight:'700' },
  entryHelperText:{ fontSize:12, color:'#64748b', lineHeight:18, marginBottom:10 },
  entryBlock:{ width:'100%', borderTopWidth:1, borderTopColor:'#f0f0f0', paddingTop:10, marginBottom:4 },
  entryHeaderRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  entryLabel:{ fontSize:13, fontWeight:'700', color:'#0b3d91' },
  removeBtn:{ width:26, height:26, borderRadius:13, backgroundColor:'#fee2e2', justifyContent:'center', alignItems:'center' },
  removeBtnText:{ color:'#dc2626', fontSize:18, fontWeight:'700', lineHeight:22 },
  addEntryBtn:{ width:36, height:36, borderRadius:18, backgroundColor:'#0b3d91', justifyContent:'center', alignItems:'center', marginTop:4, marginBottom:8 },
  emptyStateCard:{ backgroundColor:'#ffffff', borderRadius:12, borderWidth:1, borderColor:'#e2e8f0', padding:16, alignItems:'center', marginTop:6 },
  emptyStateTitle:{ fontSize:15, fontWeight:'700', color:'#0f172a', textAlign:'center' },
  emptyStateSubtitle:{ fontSize:13, color:'#64748b', textAlign:'center', marginTop:6, lineHeight:19 },
});