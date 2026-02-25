
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
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { authenticatedGet, authenticatedPost, authenticatedDelete } from "@/utils/api";

interface Transaction {
  id: string;
  type: 'income' | 'saving' | 'investment';
  amount: string | number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

interface Summary {
  totalIncome: string | number;
  totalSavings: string | number;
  totalInvestments: string | number;
  byCategory?: { [key: string]: string };
}

interface FeedbackModal {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalSavings: 0, totalInvestments: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'saving' | 'investment'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showFeedback = (title: string, message: string, type: 'error' | 'success' | 'confirm', onConfirm?: () => void) => {
    setFeedbackModal({ visible: true, title, message, type, onConfirm });
  };

  const hideFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user) {
      console.log('User authenticated, loading transactions');
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    console.log('[API] Loading transactions and summary');
    setLoading(true);
    try {
      const [txData, summaryData] = await Promise.all([
        authenticatedGet<Transaction[]>('/api/transactions'),
        authenticatedGet<Summary>('/api/transactions/summary'),
      ]);
      console.log('[API] Transactions loaded:', txData?.length);
      console.log('[API] Summary loaded:', summaryData);
      setTransactions(txData || []);
      setSummary(summaryData || { totalIncome: 0, totalSavings: 0, totalInvestments: 0 });
    } catch (error) {
      console.error('[API] Error loading data:', error);
      showFeedback('Error', 'Failed to load transactions. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    console.log('[API] Adding transaction:', { type: selectedType, amount, category, description });
    
    if (!amount || !category) {
      showFeedback('Validation Error', 'Please fill in all required fields (amount and category).', 'error');
      return;
    }

    setAddingTransaction(true);
    try {
      const created = await authenticatedPost<Transaction>('/api/transactions', {
        type: selectedType,
        amount: amount,
        category,
        description,
        date: new Date().toISOString(),
      });
      console.log('[API] Transaction created:', created);
      
      setTransactions(prev => [created, ...prev]);
      
      // Refresh summary from server
      const summaryData = await authenticatedGet<Summary>('/api/transactions/summary');
      setSummary(summaryData);
      
      setShowAddModal(false);
      setAmount('');
      setCategory('');
      setDescription('');
      showFeedback('Success', 'Transaction added successfully!', 'success');
    } catch (error) {
      console.error('[API] Error adding transaction:', error);
      showFeedback('Error', 'Failed to add transaction. Please try again.', 'error');
    } finally {
      setAddingTransaction(false);
    }
  };

  const confirmDeleteTransaction = (id: string) => {
    showFeedback(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      'confirm',
      () => handleDeleteTransaction(id)
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    console.log('[API] Deleting transaction:', id);
    setDeletingId(id);
    try {
      await authenticatedDelete(`/api/transactions/${id}`);
      console.log('[API] Transaction deleted:', id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      // Refresh summary
      const summaryData = await authenticatedGet<Summary>('/api/transactions/summary');
      setSummary(summaryData);
    } catch (error) {
      console.error('[API] Error deleting transaction:', error);
      showFeedback('Error', 'Failed to delete transaction. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeColor = (type: string) => {
    const typeColorMap: { [key: string]: string } = {
      income: colors.success,
      saving: colors.secondary,
      investment: colors.accent,
    };
    return typeColorMap[type] || colors.text;
  };

  const getTypeIcon = (type: string) => {
    const typeIconMap: { [key: string]: string } = {
      income: 'trending-up',
      saving: 'savings',
      investment: 'show-chart',
    };
    return typeIconMap[type] || 'attach-money';
  };

  const toNumber = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseFloat(val) || 0;
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalIncome = toNumber(summary.totalIncome);
  const totalSavings = toNumber(summary.totalSavings);
  const totalInvestments = toNumber(summary.totalInvestments);
  const totalBalance = totalIncome - totalSavings - totalInvestments;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back</Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'User'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            console.log('Opening AI Financial Advisor');
            router.push('/chat/advisor');
          }}
          style={styles.advisorButton}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.advisorButtonGradient}
          >
            <IconSymbol 
              android_material_icon_name="chat" 
              size={22} 
              color="#FFFFFF" 
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Overview Card */}
        <View style={styles.overviewSection}>
          <Text style={[styles.overviewTitle, { color: colors.text }]}>Financial Overview</Text>
          
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceContent}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
              <Text style={styles.balanceSubtext}>Available funds</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Financial Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
          
          <View style={styles.summaryGrid}>
            {/* Income Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
                  <IconSymbol 
                    android_material_icon_name="trending-up" 
                    size={20} 
                    color={colors.success} 
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                ${totalIncome.toFixed(2)}
              </Text>
            </View>

            {/* Savings Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: '#F3E5F5' }]}>
                  <IconSymbol 
                    android_material_icon_name="savings" 
                    size={20} 
                    color={colors.secondary} 
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Savings</Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                ${totalSavings.toFixed(2)}
              </Text>
            </View>

            {/* Investment Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: '#EDE7F6' }]}>
                  <IconSymbol 
                    android_material_icon_name="show-chart" 
                    size={20} 
                    color={colors.accent} 
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Investments</Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                ${totalInvestments.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity 
              onPress={() => {
                console.log('Opening add transaction modal');
                setShowAddModal(true);
              }}
              style={styles.addButton}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <IconSymbol 
                  android_material_icon_name="add" 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.addButtonText}>Add</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.background }]}>
                <IconSymbol 
                  android_material_icon_name="receipt-long" 
                  size={40} 
                  color={colors.textSecondary} 
                />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start tracking your finances by adding your first transaction
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 10).map((transaction) => {
                const typeColor = getTypeColor(transaction.type);
                const typeIcon = getTypeIcon(transaction.type);
                const transactionDate = new Date(transaction.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const amountNum = toNumber(transaction.amount);
                
                return (
                  <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.transactionIcon, { backgroundColor: typeColor + '15' }]}>
                      <IconSymbol 
                        android_material_icon_name={typeIcon} 
                        size={22} 
                        color={typeColor} 
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionCategory, { color: colors.text }]}>
                        {transaction.category}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <Text style={[styles.transactionType, { color: typeColor }]}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </Text>
                        <Text style={[styles.transactionMetaSeparator, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                          {transactionDate}
                        </Text>
                      </View>
                      {!!transaction.description && (
                        <Text style={[styles.transactionDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                          {transaction.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, { color: colors.text }]}>
                        ${amountNum.toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => confirmDeleteTransaction(transaction.id)}
                        disabled={deletingId === transaction.id}
                        style={styles.deleteButton}
                      >
                        {deletingId === transaction.id ? (
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
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <IconSymbol 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            {/* Type Selection */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: colors.border },
                  selectedType === 'income' && { backgroundColor: colors.success }
                ]}
                onPress={() => setSelectedType('income')}
              >
                <IconSymbol 
                  android_material_icon_name="trending-up" 
                  size={18} 
                  color={selectedType === 'income' ? '#FFF' : colors.text} 
                />
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'income' && { color: '#FFF' }
                ]}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: colors.border },
                  selectedType === 'saving' && { backgroundColor: colors.secondary }
                ]}
                onPress={() => setSelectedType('saving')}
              >
                <IconSymbol 
                  android_material_icon_name="savings" 
                  size={18} 
                  color={selectedType === 'saving' ? '#FFF' : colors.text} 
                />
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'saving' && { color: '#FFF' }
                ]}>
                  Saving
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: colors.border },
                  selectedType === 'investment' && { backgroundColor: colors.accent }
                ]}
                onPress={() => setSelectedType('investment')}
              >
                <IconSymbol 
                  android_material_icon_name="show-chart" 
                  size={18} 
                  color={selectedType === 'investment' ? '#FFF' : colors.text} 
                />
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'investment' && { color: '#FFF' }
                ]}>
                  Investment
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Amount *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="e.g., Salary, Rent, Groceries"
                placeholderTextColor={colors.textSecondary}
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Add notes about this transaction"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { opacity: addingTransaction ? 0.7 : 1 }]}
              onPress={handleAddTransaction}
              disabled={addingTransaction}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {addingTransaction ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Transaction</Text>
                )}
              </LinearGradient>
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
            <Text style={[styles.feedbackTitle, { color: colors.text }]}>
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
                    <Text style={[styles.feedbackButtonText, { color: colors.text }]}>Cancel</Text>
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
                    backgroundColor: feedbackModal.type === 'success' ? colors.success : colors.danger,
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
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  advisorButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  advisorButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceContent: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.85,
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardHeader: {
    marginBottom: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  transactionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  transactionsList: {
    gap: 10,
  },
  emptyState: {
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionMetaSeparator: {
    fontSize: 12,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackContent: {
    borderRadius: 24,
    padding: 28,
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
