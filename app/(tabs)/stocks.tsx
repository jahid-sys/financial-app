
import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { authenticatedGet, authenticatedPost, authenticatedDelete } from "@/utils/api";

interface Stock {
  id: string;
  symbol: string;
  shares: string | number;
  purchasePrice: string | number;
  purchaseDate: string;
  currentPrice: number;
  totalValue: number;
  gain: number;
}

interface FeedbackModal {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
}

export default function StocksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
  });

  const showFeedback = (title: string, message: string, type: 'error' | 'success' | 'confirm', onConfirm?: () => void) => {
    setFeedbackModal({ visible: true, title, message, type, onConfirm });
  };

  const hideFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  const toNumber = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseFloat(val) || 0;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user) {
      console.log('User authenticated, loading stocks');
      loadStocks();
    }
  }, [user, authLoading]);

  const loadStocks = async () => {
    console.log('[API] Loading stocks');
    setLoading(true);
    try {
      const data = await authenticatedGet<Stock[]>('/api/stocks');
      console.log('[API] Stocks loaded:', data?.length);
      setStocks(data || []);
    } catch (error) {
      console.error('[API] Error loading stocks:', error);
      showFeedback('Error', 'Failed to load stocks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    console.log('[API] Adding stock:', { symbol, shares, purchasePrice });
    
    if (!symbol || !shares || !purchasePrice) {
      showFeedback('Validation Error', 'Please fill in all fields (symbol, shares, and purchase price).', 'error');
      return;
    }

    setAddingStock(true);
    try {
      const created = await authenticatedPost<Stock>('/api/stocks', {
        symbol: symbol.toUpperCase(),
        shares: shares,
        purchasePrice: purchasePrice,
        purchaseDate: new Date().toISOString(),
      });
      console.log('[API] Stock created:', created);
      
      // Reload all stocks to get currentPrice, totalValue, gain from server
      await loadStocks();
      setShowAddModal(false);
      setSymbol('');
      setShares('');
      setPurchasePrice('');
      showFeedback('Success', `${symbol.toUpperCase()} added to your portfolio!`, 'success');
    } catch (error) {
      console.error('[API] Error adding stock:', error);
      showFeedback('Error', 'Failed to add stock. Please check the symbol and try again.', 'error');
    } finally {
      setAddingStock(false);
    }
  };

  const confirmDeleteStock = (id: string, stockSymbol: string) => {
    showFeedback(
      'Delete Stock',
      `Are you sure you want to remove ${stockSymbol} from your portfolio?`,
      'confirm',
      () => handleDeleteStock(id)
    );
  };

  const handleDeleteStock = async (id: string) => {
    console.log('[API] Deleting stock:', id);
    setDeletingId(id);
    try {
      await authenticatedDelete(`/api/stocks/${id}`);
      console.log('[API] Stock deleted:', id);
      setStocks(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('[API] Error deleting stock:', error);
      showFeedback('Error', 'Failed to delete stock. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalValue = stocks.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
  const totalGain = stocks.reduce((sum, stock) => sum + (stock.gain || 0), 0);
  const gainPercentage = totalValue > 0 ? ((totalGain / (totalValue - totalGain)) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Stock Portfolio</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Track your investments
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Portfolio Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.accent }]}>
          <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
          <Text style={styles.summaryAmount}>${totalValue.toFixed(2)}</Text>
          <View style={styles.gainRow}>
            <View style={styles.gainItem}>
              <Text style={styles.gainLabel}>Total Gain/Loss</Text>
              <Text style={[styles.gainValue, { color: totalGain >= 0 ? '#4ADE80' : '#F87171' }]}>
                ${totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)}
              </Text>
            </View>
            <View style={styles.gainItem}>
              <Text style={styles.gainLabel}>Percentage</Text>
              <Text style={[styles.gainValue, { color: gainPercentage >= 0 ? '#4ADE80' : '#F87171' }]}>
                {gainPercentage >= 0 ? '+' : ''}{gainPercentage.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Stocks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Stocks</Text>
            <TouchableOpacity onPress={() => {
              console.log('Opening add stock modal');
              setShowAddModal(true);
            }}>
              <IconSymbol 
                android_material_icon_name="add-circle" 
                size={28} 
                color={colors.accent} 
              />
            </TouchableOpacity>
          </View>

          {stocks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <IconSymbol 
                android_material_icon_name="show-chart" 
                size={48} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No stocks yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add your first stock to start tracking
              </Text>
            </View>
          ) : (
            stocks.map((stock) => {
              const gainColor = (stock.gain || 0) >= 0 ? colors.primary : colors.danger;
              const gainSign = (stock.gain || 0) >= 0 ? '+' : '';
              const gainBase = (stock.totalValue || 0) - (stock.gain || 0);
              const gainPercent = gainBase > 0 ? (((stock.gain || 0) / gainBase) * 100).toFixed(2) : '0.00';
              const sharesNum = toNumber(stock.shares);
              const currentPriceNum = stock.currentPrice || 0;
              const totalValueNum = stock.totalValue || 0;
              const gainNum = stock.gain || 0;
              
              return (
                <View key={stock.id} style={[styles.stockCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.stockIcon, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.stockSymbol, { color: colors.accent }]}>
                      {stock.symbol.substring(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.stockInfo}>
                    <Text style={[styles.stockName, { color: theme.colors.text }]}>
                      {stock.symbol}
                    </Text>
                    <Text style={[styles.stockShares, { color: colors.textSecondary }]}>
                      {sharesNum} shares
                    </Text>
                    <Text style={[styles.stockPrice, { color: colors.textSecondary }]}>
                      ${currentPriceNum.toFixed(2)} per share
                    </Text>
                  </View>
                  <View style={styles.stockValues}>
                    <Text style={[styles.stockValue, { color: theme.colors.text }]}>
                      ${totalValueNum.toFixed(2)}
                    </Text>
                    <Text style={[styles.stockGain, { color: gainColor }]}>
                      {gainSign}${gainNum.toFixed(2)} ({gainSign}{gainPercent}%)
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmDeleteStock(stock.id, stock.symbol)}
                      disabled={deletingId === stock.id}
                      style={styles.deleteButton}
                    >
                      {deletingId === stock.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <IconSymbol
                          android_material_icon_name="delete"
                          size={18}
                          color={colors.danger}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Stock Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Stock</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <IconSymbol 
                  android_material_icon_name="close" 
                  size={24} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: colors.border }]}
              placeholder="Stock Symbol (e.g., AAPL)"
              placeholderTextColor={colors.textSecondary}
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
            />

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: colors.border }]}
              placeholder="Number of Shares"
              placeholderTextColor={colors.textSecondary}
              value={shares}
              onChangeText={setShares}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: colors.border }]}
              placeholder="Purchase Price per Share"
              placeholderTextColor={colors.textSecondary}
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.accent, opacity: addingStock ? 0.7 : 1 }]}
              onPress={handleAddStock}
              disabled={addingStock}
            >
              {addingStock ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Stock</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback / Confirm Modal */}
      <Modal
        visible={feedbackModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={hideFeedback}
      >
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.feedbackTitle, { color: theme.colors.text }]}>
              {feedbackModal.title}
            </Text>
            <Text style={[styles.feedbackMessage, { color: colors.textSecondary }]}>
              {feedbackModal.message}
            </Text>
            <View style={styles.feedbackButtons}>
              {feedbackModal.type === 'confirm' ? (
                <>
                  <TouchableOpacity
                    style={[styles.feedbackButton, { backgroundColor: colors.border }]}
                    onPress={hideFeedback}
                  >
                    <Text style={[styles.feedbackButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.feedbackButton, { backgroundColor: colors.danger }]}
                    onPress={() => {
                      hideFeedback();
                      feedbackModal.onConfirm?.();
                    }}
                  >
                    <Text style={[styles.feedbackButtonText, { color: '#FFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.feedbackButton, { 
                    backgroundColor: feedbackModal.type === 'success' ? colors.accent : colors.danger,
                    flex: 1,
                  }]}
                  onPress={hideFeedback}
                >
                  <Text style={[styles.feedbackButtonText, { color: '#FFF' }]}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 20,
  },
  gainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gainItem: {
    flex: 1,
  },
  gainLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
  },
  gainValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
  },
  stockShares: {
    fontSize: 14,
    marginTop: 2,
  },
  stockPrice: {
    fontSize: 12,
    marginTop: 4,
  },
  stockValues: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockGain: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
