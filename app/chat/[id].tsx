
import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authenticatedGet, authenticatedPost, getBearerToken, BACKEND_URL } from "@/utils/api";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user) {
      console.log('User authenticated, initializing chat');
      initializeChat();
    }
  }, [user, authLoading]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const initializeChat = async () => {
    console.log('[API] Initializing chat with id:', id);
    setInitLoading(true);
    
    try {
      if (id && id !== 'advisor') {
        // Load existing conversation messages
        console.log('[API] Loading messages for conversation:', id);
        const msgs = await authenticatedGet<Message[]>(`/api/conversations/${id}/messages`);
        console.log('[API] Messages loaded:', msgs?.length);
        setMessages(msgs || []);
        setConversationId(id as string);
      } else {
        // Create new conversation
        console.log('[API] Creating new conversation');
        const conv = await authenticatedPost<{ conversationId: string; title: string; createdAt: string }>(
          '/api/conversations',
          { title: 'Financial Advisor Chat' }
        );
        console.log('[API] Conversation created:', conv.conversationId);
        setConversationId(conv.conversationId);
        
        // Add welcome message locally (not from server)
        const welcomeMessage: Message = {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: 'Hello! I\'m your AI Financial Advisor powered by Google Gemini. I can help you with:\n\n• Budget planning and expense tracking\n• Investment strategies and portfolio analysis\n• Savings goals and financial planning\n• Tax optimization tips\n• Debt management advice\n\nHow can I assist you today?',
          createdAt: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('[API] Error initializing chat:', error);
      // Still allow chat even if init fails
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'Hello! I\'m your AI Financial Advisor. How can I help you today?',
        createdAt: new Date().toISOString(),
      };
      setMessages([errorMessage]);
    } finally {
      setInitLoading(false);
    }
  };

  const connectWebSocket = useCallback(async (convId: string, message: string) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = await getBearerToken();
    if (!token) {
      console.error('[WS] No bearer token available');
      setLoading(false);
      return;
    }

    // Build WebSocket URL from backend URL
    const wsUrl = BACKEND_URL.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws') + '/api/chat/stream';
    console.log('[WS] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Create a placeholder for the streaming assistant message
    const streamingId = 'streaming-' + Date.now();
    streamingMessageIdRef.current = streamingId;

    ws.onopen = () => {
      console.log('[WS] Connected, sending auth token');
      // First message is the bearer token for authentication
      ws.send(token);
      
      // Then send the chat message
      setTimeout(() => {
        console.log('[WS] Sending message:', { conversationId: convId, message });
        ws.send(JSON.stringify({ conversationId: convId, message }));
      }, 100);

      // Add empty streaming message placeholder
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }]);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      console.log('[WS] Received raw data:', data?.substring(0, 100));
      
      try {
        // Try to parse as JSON first (for control messages)
        const parsed = JSON.parse(data);
        console.log('[WS] Parsed message type:', parsed.type);
        
        // Handle different message types
        if (parsed.type === 'authenticated') {
          console.log('[WS] Authentication confirmed');
          return;
        }
        
        if (parsed.type === 'stream_start') {
          console.log('[WS] Stream started for conversation:', parsed.conversationId);
          return;
        }
        
        if (parsed.type === 'stream_chunk' && parsed.content) {
          // This is an actual content chunk
          const contentChunk = parsed.content;
          console.log('[WS] Content chunk:', contentChunk.substring(0, 50));
          
          setMessages(prev => prev.map(msg => 
            msg.id === streamingId 
              ? { ...msg, content: msg.content + contentChunk }
              : msg
          ));
          return;
        }
        
        if (parsed.type === 'stream_end') {
          console.log('[WS] Stream ended');
          return;
        }
        
        if (parsed.type === 'error') {
          console.error('[WS] Error from server:', parsed.message);
          setMessages(prev => prev.map(msg =>
            msg.id === streamingId
              ? { ...msg, content: msg.content || 'Sorry, I encountered an error. Please try again.' }
              : msg
          ));
          return;
        }
        
        // If we get here, it's an unknown JSON message type
        console.log('[WS] Unknown message type:', parsed.type);
        
      } catch (e) {
        // Not JSON, treat as raw text chunk (fallback for plain text streaming)
        console.log('[WS] Plain text chunk:', data.substring(0, 50));
        setMessages(prev => prev.map(msg => 
          msg.id === streamingId 
            ? { ...msg, content: msg.content + data }
            : msg
        ));
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === streamingId
          ? { ...msg, content: msg.content || 'Sorry, I encountered an error. Please try again.' }
          : msg
      ));
      setLoading(false);
    };

    ws.onclose = (event) => {
      console.log('[WS] Connection closed:', event.code, event.reason);
      streamingMessageIdRef.current = null;
      wsRef.current = null;
      setLoading(false);
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || loading) {
      console.log('[WS] Cannot send: empty message, no conversation, or already loading');
      return;
    }

    const messageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };

    console.log('[WS] Sending message:', messageText);
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      await connectWebSocket(conversationId, messageText);
    } catch (error) {
      console.error('[WS] Error sending message:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  if (authLoading || initLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
          {initLoading ? 'Loading conversation...' : 'Authenticating...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' 
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.assistantBubble, { backgroundColor: colors.card }]
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: message.role === 'user' ? '#FFF' : theme.colors.text }
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: colors.card }]}
            placeholder="Ask me anything about your finances..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: (!inputText.trim() || loading) ? 0.5 : 1 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <IconSymbol 
                android_material_icon_name="send" 
                size={24} 
                color="#FFF" 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
