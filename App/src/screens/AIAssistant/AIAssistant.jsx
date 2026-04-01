import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Colors } from '../../Theme';
import Container from '../../components/Container/Container';

// ─── Main Chatbot Redux ───────────────────────────────────────────────────────
import {
  sendMainChatMessage,
  getMainChatbotSuggestions,
} from '../../Redux/MainChatbot/mainChatbotServices';
import {
  setSessionId,
  clearMessages,
  clearError,
  setShowSuggestions as setShowSuggestionsAction,
  mainChatbotSelectors,
} from '../../Redux/MainChatbot/mainChatbotSlice';

import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { getLandlordProperties } from '../../Redux/Properties/services';
import Hyperlink from 'react-native-hyperlink';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

// ─── CitationList ─────────────────────────────────────────────────────────────
// Renders the source citations returned by the /chat API
const CitationList = React.memo(({ citations }) => {
  if (!citations || citations.length === 0) return null;
  return (
    <View style={styles.citationsContainer}>
      <Text style={styles.citationsLabel}>Sources:</Text>
      {citations.map((c) => (
        <Text key={c.chunk_id || c.citation_id} style={styles.citationItem}>
          {c.citation_id} {c.title || 'Unknown source'}
        </Text>
      ))}
    </View>
  );
});

// ─── MessageItem ──────────────────────────────────────────────────────────────
const MessageItem = React.memo(({ msg }) => {
  const isUser  = msg.type === 'user';
  const isError = msg.isError || false;
  const messageContent = msg.message || msg.text || msg.content || '';

  const handleLinkPress = useCallback((url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    Linking.canOpenURL(cleanUrl)
      .then((supported) => {
        if (supported) return Linking.openURL(cleanUrl);
        Alert.alert('Error', 'Cannot open this link');
      })
      .catch(() => Alert.alert('Error', 'Could not open the link'));
  }, []);

  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessage : styles.botMessage,
      isError && styles.errorMessage,
    ]}>
      {!isUser && msg.source && (
        <Text style={styles.sourceIndicator}>AI Assistant</Text>
      )}

      {msg.hasMedia && msg.mediaUri && (
        <View style={styles.messageImageContainer}>
          <Image source={{ uri: msg.mediaUri }} style={styles.messageImage} resizeMode="cover" />
        </View>
      )}

      <Hyperlink
        linkDefault
        linkStyle={{
          color: isUser ? '#FFE5E5' : Colors.red,
          textDecorationLine: 'underline',
          fontWeight: '500',
        }}
        onPress={handleLinkPress}>
        <Text style={[styles.messageText, { color: isError ? '#d32f2f' : Colors.black }]}>
          {messageContent}
        </Text>
      </Hyperlink>

      {/* ✅ Show citations below bot messages */}
      {!isUser && !isError && <CitationList citations={msg.citations} />}

      <Text style={[styles.timestamp, { color: isError ? '#d32f2f' : Colors.gray }]}>
        {msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Now'}
      </Text>
    </View>
  );
}, (prev, next) => prev.msg.id === next.msg.id);

// ─── AIAssistant ──────────────────────────────────────────────────────────────
const AIAssistant = ({ navigation, route }) => {
  const [messageText, setMessageText]     = useState('');
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [localSuggestions, setLocalSuggestions]     = useState([]);

  const scrollViewRef  = useRef(null);
  const lastMessageRef = useRef('');
  const isMountedRef   = useRef(true);

  const dispatch = useDispatch();

  // ─── Selectors ──────────────────────────────────────────────────────────────
  const {
    loading,
    mediaLoading,
    messages,
    error,
    suggestions,
    showSuggestions,
    currentSessionId,
  } = useSelector(mainChatbotSelectors.getChatData);

  const token      = useSelector(loginDataSelectors.getAccessToken);
  const isLogged   = useSelector((state) => state.loginData?.is_logged || false);
  const landlordId = useSelector(loginDataSelectors.getLandlordId);

  const isAnyLoading = loading || mediaLoading;

  const getAvailableToken = useCallback(() => {
    if (!token || token === 'null') return null;
    return token;
  }, [token]);

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsComponentMounted(true);
    isMountedRef.current = true;
    if (!currentSessionId) {
      dispatch(setSessionId(`session-${Date.now()}`));
    }
    dispatch(clearError());
    return () => {
      isMountedRef.current = false;
      setIsComponentMounted(false);
    };
  }, [dispatch, currentSessionId]);

  // ─── Focus: show suggestions on first visit ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const shouldHide = route?.params?.hideSuggestions || false;
      if (messages.length === 0) {
        dispatch(setShowSuggestionsAction(!shouldHide));
        if (!shouldHide) loadSuggestions('getting started');
      }
      return () => {};
    }, [route?.params?.hideSuggestions, messages.length])
  );

  // ─── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && isComponentMounted) {
      setTimeout(() => {
        if (isMountedRef.current && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages.length, isComponentMounted]);

  // ─── Sync redux suggestions → local state ────────────────────────────────────
  useEffect(() => {
    if (suggestions.length > 0) setLocalSuggestions(suggestions.slice(0, 4));
  }, [suggestions]);

  // ─── Load suggestions ────────────────────────────────────────────────────────
  const loadSuggestions = useCallback(async (context) => {
    if (!isMountedRef.current) return;
    try {
      const result = await dispatch(
        getMainChatbotSuggestions({ context, sessionId: currentSessionId })
      ).unwrap();
      if (isMountedRef.current) {
        setLocalSuggestions(result.suggestions?.slice(0, 4) || []);
      }
    } catch {
      if (isMountedRef.current) {
        setLocalSuggestions([
          'What can tenants ask about?',
          'How do I submit a maintenance request?',
          'What is the lease policy?',
          'Tell me about rent payments',
        ]);
      }
    }
  }, [dispatch, currentSessionId]);

  // ─── Image picker ─────────────────────────────────────────────────────────────
  const handleImageResponse = useCallback((response) => {
    if (response.didCancel) return;
    if (response.error) { Alert.alert('Error', 'Failed to pick image'); return; }
    if (response.assets?.[0]) {
      const asset = response.assets[0];
      setSelectedImage({ uri: asset.uri, type: asset.type, fileName: asset.fileName });
    }
  }, []);

  const handleImagePicker = useCallback(() => {
    Alert.alert('Select Image', 'Choose an image source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: () => launchCamera(
          { mediaType: 'photo', quality: 0.5, maxWidth: 800, maxHeight: 800, saveToPhotos: true },
          handleImageResponse
        ),
      },
      {
        text: 'Gallery',
        onPress: () => launchImageLibrary(
          { mediaType: 'photo', quality: 0.5, maxWidth: 800, maxHeight: 800 },
          handleImageResponse
        ),
      },
    ]);
  }, [handleImageResponse]);

  const removeSelectedImage = useCallback(() => setSelectedImage(null), []);

  // ─── Refresh properties if AI updated something ───────────────────────────────
  const refreshPropertiesIfUpdated = useCallback((aiResponse) => {
    if (!aiResponse || !landlordId) return;
    const keywords = ['updated', 'changed', 'modified', 'set to', 'availability',
      'rent', 'monthly_rent', 'price', 'property has been', 'successfully updated'];
    const lower = aiResponse.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      const t = getAvailableToken();
      if (t) dispatch(getLandlordProperties({ landlordId, token: t }));
    }
  }, [dispatch, landlordId, getAvailableToken]);

  // ─── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (messageOverride = null) => {
    const trimmedMessage = (messageOverride || messageText).trim();

    if (!trimmedMessage && !selectedImage) {
      Alert.alert('Empty Message', 'Please enter a message or select an image.');
      return;
    }

    if (trimmedMessage === lastMessageRef.current && !selectedImage) return;

    if (isAnyLoading) return;

    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
      sessionIdToUse = `session-${Date.now()}`;
      dispatch(setSessionId(sessionIdToUse));
    }

    const currentImage = selectedImage;
    if (!messageOverride) setMessageText('');
    setSelectedImage(null);
    lastMessageRef.current = trimmedMessage;
    dispatch(setShowSuggestionsAction(false));

    try {
      // ✅ No token passed — API is open (no Authorization header)
      const params = {
        message:   trimmedMessage,
        sessionId: sessionIdToUse,
        // imageUrl: currentImage?.uri  ← add when backend supports it
      };

      const result = await dispatch(sendMainChatMessage(params)).unwrap();

      if (result?.response && isMountedRef.current) {
        refreshPropertiesIfUpdated(result.response);
      }
      setTimeout(() => { lastMessageRef.current = ''; }, 1000);

    } catch (err) {
      if (!messageOverride) setMessageText(trimmedMessage);
      if (currentImage) setSelectedImage(currentImage);
      lastMessageRef.current = '';

      const errMsg = typeof err === 'string'
        ? err
        : (err?.message || err?.error || 'Failed to send message. Please try again.');
      Alert.alert('Message Failed', errMsg, [{ text: 'OK' }]);
    }
  }, [
    messageText, selectedImage, currentSessionId, isAnyLoading,
    dispatch, navigation, refreshPropertiesIfUpdated,
  ]);

  const handleSuggestionPress = useCallback((s) => handleSendMessage(s), [handleSendMessage]);

  // ─── Clear chat ───────────────────────────────────────────────────────────────
  const handleClearChat = useCallback(() => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => {
          dispatch(clearMessages());
          lastMessageRef.current = '';
          const shouldHide = route?.params?.hideSuggestions || false;
          dispatch(setShowSuggestionsAction(!shouldHide));
          setSelectedImage(null);
          setMessageText('');
          if (!shouldHide) setTimeout(() => loadSuggestions('getting started'), 0);
        },
      },
    ]);
  }, [dispatch, loadSuggestions, route?.params?.hideSuggestions]);

  // ─── Suggestions ─────────────────────────────────────────────────────────────
  const renderSuggestions = useMemo(() => {
    if (!showSuggestions || localSuggestions.length === 0 || messages.length > 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions:</Text>
        {localSuggestions.map((s, i) => (
          <TouchableOpacity
            key={`sug-${i}`}
            style={styles.suggestionButton}
            onPress={() => handleSuggestionPress(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showSuggestions, localSuggestions, messages.length, handleSuggestionPress]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Container>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}>

        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearChat}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity onPress={() => navigation.navigate('WebhookLogMonitor')}>
  <Text>SMS Webhook Monitor</Text>
</TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Welcome */}
          {messages.length === 0 && !isAnyLoading && (
            <View style={styles.welcomeContainer}>
              <View style={styles.aiIconContainer}>
                <View style={styles.aiIcon}>
                  <AppIcon name={icons.ailogo} height={hp(9)} width={hp(18)} />
                </View>
              </View>
              <Text style={styles.welcomeTitle}>Hello! I'm your{'\n'}AI Assistant.</Text>
              <Text style={styles.welcomeDescription}>
                I can assist with text-based questions and provide{'\n'}quick, accurate insights.
              </Text>
            </View>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {isAnyLoading && (
            <View style={[styles.messageContainer, styles.botMessage, styles.typingContainer]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>AI is thinking…</Text>
            </View>
          )}

          {/* Suggestion chips */}
          {renderSuggestions}
        </ScrollView>

        {/* Image preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImageButton} onPress={removeSelectedImage}>
              <AppIcon name={icons.close} size={hp(1.5)} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputSection}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={selectedImage ? 'Describe what you see...' : 'Type your message...'}
              placeholderTextColor="#555"
              multiline
              maxLength={1000}
              editable={!isAnyLoading}
            />
            <TouchableOpacity style={styles.iconButton} onPress={() => {}} disabled={isAnyLoading}>
              <AppIcon name={icons.aiVoice} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleImagePicker} disabled={isAnyLoading}>
              <AppIcon name={icons.aiImage} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (isAnyLoading || (!messageText.trim() && !selectedImage)) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={isAnyLoading || (!messageText.trim() && !selectedImage)}>
            <AppIcon name={icons.send} height={hp(3)} width={hp(3)} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </Container>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1 },
  chatContainer: { flex: 1 },
  chatContent:  { flexGrow: 1, paddingHorizontal: wp(4), paddingVertical: hp(2) },

  clearButton: {
    alignSelf: 'flex-end', marginRight: wp(4), marginTop: hp(0.5),
    paddingHorizontal: wp(3), paddingVertical: hp(0.6),
    backgroundColor: 'rgba(214,69,69,0.1)', borderRadius: wp(4),
  },
  clearButtonText: { fontSize: hp(1.6), color: '#D64545', fontWeight: '600' },

  welcomeContainer: {
    alignItems: 'center', paddingHorizontal: wp(6),
    marginTop: hp(-2), marginBottom: hp(2),
  },
  aiIconContainer: { marginBottom: hp(1) },
  aiIcon: {
    width: hp(15), height: hp(15), borderRadius: hp(7.5),
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  welcomeTitle: {
    fontSize: hp(3), fontWeight: 'bold', color: Colors.black,
    textAlign: 'center', marginBottom: hp(2), lineHeight: hp(3.5),
  },
  welcomeDescription: {
    fontSize: hp(1.5), color: Colors.gray, textAlign: 'center',
    lineHeight: hp(2.5), marginBottom: hp(2),
  },

  messageContainer: {
    maxWidth: '80%', marginVertical: hp(1), padding: wp(3.5),
    borderRadius: wp(4), elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  userMessage: { alignSelf: 'flex-end', backgroundColor: Colors.white },
  botMessage: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  errorMessage: { backgroundColor: '#ffebee', borderColor: '#ffcdd2' },
  sourceIndicator: { fontSize: hp(1.4), color: Colors.gray, marginBottom: hp(0.5), fontWeight: '600' },
  messageText: { fontSize: hp(2), lineHeight: hp(2.6) },
  timestamp:   { fontSize: hp(1.4), marginTop: hp(0.5), opacity: 0.7 },

  // ✅ Citations
  citationsContainer: {
    marginTop: hp(1), paddingTop: hp(0.8),
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)',
  },
  citationsLabel: { fontSize: hp(1.3), color: Colors.gray, fontWeight: '600', marginBottom: hp(0.4) },
  citationItem:   { fontSize: hp(1.3), color: Colors.gray, lineHeight: hp(2) },

  messageImageContainer: { marginBottom: hp(1), borderRadius: wp(2), overflow: 'hidden' },
  messageImage:          { width: wp(50), height: wp(35), borderRadius: wp(2) },

  typingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(2) },
  typingText:      { fontSize: hp(2), color: Colors.gray, fontStyle: 'italic', marginLeft: wp(2) },

  suggestionsContainer: { marginTop: hp(-3), paddingHorizontal: wp(2) },
  suggestionsTitle: { fontSize: hp(1.8), fontWeight: '600', color: Colors.black, marginBottom: hp(1.5) },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: Colors.black,
    borderRadius: wp(6), paddingHorizontal: wp(4), paddingVertical: hp(1.5),
    marginVertical: hp(0.5), elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  suggestionText: { color: Colors.primary, fontSize: hp(1.8), textAlign: 'left' },

  imagePreviewContainer: { margin: wp(4), position: 'relative', alignSelf: 'flex-start' },
  imagePreview:          { width: wp(25), height: wp(25), borderRadius: wp(3), backgroundColor: '#f0f0f0' },
  removeImageButton: {
    position: 'absolute', top: -hp(1), right: -wp(2), backgroundColor: '#ff4444',
    borderRadius: hp(1.5), width: hp(3), height: hp(3),
    justifyContent: 'center', alignItems: 'center', elevation: 3,
  },

  inputSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: wp(4), marginBottom: hp(1.5),
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
    backgroundColor: '#fff', borderRadius: wp(2), borderWidth: 1, borderColor: '#EBAFAF',
    paddingHorizontal: wp(3), paddingVertical: hp(1),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  textInput:          { flex: 1, fontSize: hp(2), color: '#000', paddingRight: wp(2), maxHeight: hp(10) },
  iconButton:         { marginLeft: wp(1), paddingHorizontal: wp(1.5) },
  sendButton: {
    marginLeft: wp(2), width: hp(6), height: hp(6), borderRadius: hp(3),
    backgroundColor: '#D64545', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D64545', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  sendButtonDisabled: { opacity: 0.5 },
});

export default AIAssistant;
