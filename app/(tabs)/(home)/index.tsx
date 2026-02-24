
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
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hi! How are you?</Text>
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
          <IconSymbol 
            android_material_icon_name="chat" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card with Gradient */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Money Limit</Text>
            <TouchableOpacity style={styles.downloadButton}>
              <IconSymbol 
                android_material_icon_name="download" 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>${totalBalance.toFixed(0)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Net Worth</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Spending</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <IconSymbol 
                android_material_icon_name="trending-up" 
                size={20} 
                color={colors.success} 
              />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Investment</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>${totalIncome.toFixed(0)}</Text>
            <Text style={[styles.statChange, { color: colors.success }]}>+12%</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <IconSymbol 
                android_material_icon_name="savings" 
                size={20} 
                color="#FF9800" 
              />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Savings</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>${totalSavings.toFixed(0)}</Text>
            <Text style={[styles.statChange, { color: colors.textSecondary }]}>0%</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FCE4EC' }]}>
              <IconSymbol 
                android_material_icon_name="show-chart" 
                size={20} 
                color="#E91E63" 
              />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Emergency</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>${totalInvestments.toFixed(0)}</Text>
            <Text style={[styles.statChange, { color: colors.textSecondary }]}>0%</Text>
          </View>
        </View>

        {/* Budgeting Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budgeting</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAnalytics, { color: colors.textSecondary }]}>View Analytics</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder for circular budget chart */}
          <View style={[styles.budgetChart, { backgroundColor: colors.card }]}>
            <View style={styles.budgetCircle}>
              <Text style={[styles.budgetAmount, { color: colors.text }]}>$10,000</Text>
            </View>
            <View style={styles.budgetLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Shopping</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>$3320</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Food</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>$2400</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Invest</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>$600</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Tax</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>$1920</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Charity</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>$1760</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
            <TouchableOpacity onPress={() => {
              console.log('Opening add transaction modal');
              setShowAddModal(true);
            }}>
              <IconSymbol 
                android_material_icon_name="add-circle" 
                size={28} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <IconSymbol 
                android_material_icon_name="receipt-long" 
                size={48} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add your first transaction to get started
              </Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((transaction) => {
              const typeColor = getTypeColor(transaction.type);
              const typeIcon = getTypeIcon(transaction.type);
              const transactionDate = new Date(transaction.date).toLocaleDateString();
              const amountNum = toNumber(transaction.amount);
              
              return (
                <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.transactionIcon, { backgroundColor: typeColor + '20' }]}>
                    <IconSymbol 
                      android_material_icon_name={typeIcon} 
                      size={24} 
                      color={typeColor} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionCategory, { color: colors.text }]}>
                      {transaction.category}
                    </Text>
                    {!!transaction.description && (
                      <Text style={[styles.transactionDescription, { color: colors.textSecondary }]}>
                        {transaction.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[styles.transactionAmount, { color: colors.text }]}>
                      -${amountNum.toFixed(2)}
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
            })
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
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'investment' && { color: '#FFF' }
                ]}>
                  Investment
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Category (e.g., Salary, Rent)"
              placeholderTextColor={colors.textSecondary}
              value={category}
              onChangeText={setCategory}
            />

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity
              style={[styles.addButton, { opacity: addingTransaction ? 0.7 : 1 }]}
              onPress={handleAddTransaction}
              disabled={addingTransaction}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                {addingTransaction ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.addButtonText}>Add Transaction</Text>
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
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  advisorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 20,
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.85,
    fontWeight: '500',
  },
  balanceItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
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
  viewAnalytics: {
    fontSize: 13,
    fontWeight: '500',
  },
  budgetChart: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  budgetLegend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
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
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    overflow: 'hidden',
    marginTop: 8,
  },
  addButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
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
