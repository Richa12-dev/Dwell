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
import {
  sendChatMessageNew,
  sendChatMessageWithImage,
  getAISuggestions,
} from '../../Redux/Ai/services';
import {
  setCurrentSessionId,
  clearChatMessages,
  clearChatError,
  chatSelectors,
  resetAIState,
} from '../../Redux/Ai/aiSlice';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { getLandlordProperties } from '../../Redux/Properties/services';
import Hyperlink from 'react-native-hyperlink';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

// ─── MessageItem ──────────────────────────────────────────────────────────────
const MessageItem = React.memo(({ msg }) => {
  const isUser = msg.type === 'user';
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

      {msg.hasImage && msg.imageUri && (
        <View style={styles.messageImageContainer}>
          <Image source={{ uri: msg.imageUri }} style={styles.messageImage} resizeMode="cover" />
        </View>
      )}

      <Hyperlink
        linkDefault
        linkStyle={{ color: isUser ? '#FFE5E5' : Colors.red, textDecorationLine: 'underline', fontWeight: '500' }}
        onPress={handleLinkPress}
        linkText={(url) => {
          if (url.includes('amazon.com')) {
            if (url.includes('/dp/')) return 'Amazon Link';
            if (url.includes('/s?k=')) return 'Search on Amazon';
          }
          return url;
        }}>
        <Text style={[
          styles.messageText,
          { color: isError ? '#d32f2f' : Colors.black },
        ]}>
          {messageContent}
        </Text>
      </Hyperlink>

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
  const [messageText, setMessageText] = useState('');
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollViewRef = useRef(null);
  const lastMessageRef = useRef('');
  const isMountedRef = useRef(true);

  const dispatch = useDispatch();

  // ─── Selectors ──────────────────────────────────────────────
  const { loading, messages, error } = useSelector(chatSelectors.getChatData);

  // currentSessionId lives in state.ai directly — getChatData does not expose it
  const currentSessionId = useSelector((state) => state.ai?.currentSessionId || null);

  const token = useSelector(loginDataSelectors.getAccessToken);

  const isLogged = useSelector((state) => state.loginData?.is_logged || false);


  const landlordId = useSelector(loginDataSelectors.getLandlordId);
  const getAvailableToken = useCallback(() => {
    if (!token || token === 'null') return null;
    return token;
  }, [token]);

  // ─── Init ────────────────────────────────────────────────────
  useEffect(() => {
    setIsComponentMounted(true);
    if (!currentSessionId) {
      dispatch(setCurrentSessionId(`session-${Date.now()}`));
    }
    dispatch(clearChatError());
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setIsComponentMounted(false);
    };
  }, [dispatch, currentSessionId]);

  // ─── Focus Effect ────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const shouldHide = route?.params?.hideSuggestions || false;
      if (messages.length === 0) {
        setShowSuggestions(!shouldHide);
        if (!shouldHide) loadSuggestions('getting started');
      }
      return () => {};
    }, [route?.params?.hideSuggestions, messages.length])
  );

  // ─── Auto Scroll ─────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && isComponentMounted) {
      setTimeout(() => {
        if (isMountedRef.current && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages.length, isComponentMounted]);

  // ─── Load Suggestions ────────────────────────────────────────
  const loadSuggestions = useCallback(async (context) => {
    if (!isMountedRef.current) return;
    try {
      const result = await dispatch(
        getAISuggestions({ context, sessionId: currentSessionId })
      ).unwrap();
      if (isMountedRef.current) {
        setSuggestions(result.suggestions?.slice(0, 4) || []);
      }
    } catch {
      if (isMountedRef.current) {
        setSuggestions([
          "My sink is leaking",
          "Toilet won't flush",
          "There's a crack in the wall",
          "How do I fix a dripping tap?",
        ]);
      }
    }
  }, [dispatch, currentSessionId]);

  // ─── Image Picker ────────────────────────────────────────────
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

  // ─── Refresh Properties After AI Update ──────────────────────
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

  // ─── Send Message ─────────────────────────────────────────────
  const handleSendMessage = useCallback(async (messageOverride = null) => {
    const trimmedMessage = (messageOverride || messageText).trim();

    if (!trimmedMessage && !selectedImage) {
      Alert.alert('Empty Message', 'Please enter a message or select an image.');
      return;
    }

    // Prevent duplicate sends
    if (trimmedMessage === lastMessageRef.current && !selectedImage) return;

    // ✅ Check token FIRST — most reliable gate
    const availableToken = getAvailableToken();
    if (!availableToken) {
      Alert.alert(
        'Login Required',
        'Please login to use the chat feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (loading) return;

    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
      sessionIdToUse = `session-${Date.now()}`;
      dispatch(setCurrentSessionId(sessionIdToUse));
    }

    const currentImage = selectedImage;
    if (!messageOverride) setMessageText('');
    setSelectedImage(null);
    lastMessageRef.current = trimmedMessage;
    setShowSuggestions(false);

    try {
      const params = { message: trimmedMessage, sessionId: sessionIdToUse, token: availableToken };

      let result;
      if (currentImage) {
        result = await dispatch(sendChatMessageWithImage({ ...params, imageUri: currentImage.uri })).unwrap();
      } else {
        result = await dispatch(sendChatMessageNew(params)).unwrap();
      }

      if (result?.response && isMountedRef.current) {
        refreshPropertiesIfUpdated(result.response);
        setTimeout(() => loadSuggestions(result.response.substring(0, 100)), 500);
      }
      setTimeout(() => { lastMessageRef.current = ''; }, 1000);

    } catch (err) {
      // Restore inputs on failure
      if (!messageOverride) setMessageText(trimmedMessage);
      if (currentImage) setSelectedImage(currentImage);
      lastMessageRef.current = '';

      const errMsg = typeof err === 'string'
        ? err
        : (err?.message || err?.error || 'Failed to send message. Please try again.');
      Alert.alert('Message Failed', errMsg, [{ text: 'OK' }]);
    }
  }, [
    messageText, selectedImage, currentSessionId, loading,
    getAvailableToken, dispatch, navigation, loadSuggestions, refreshPropertiesIfUpdated,
  ]);

  const handleSuggestionPress = useCallback((s) => handleSendMessage(s), [handleSendMessage]);

  const handleClearChat = useCallback(() => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => {
          dispatch(clearChatMessages());
          lastMessageRef.current = '';
          const shouldHide = route?.params?.hideSuggestions || false;
          setShowSuggestions(!shouldHide);
          setSelectedImage(null);
          setMessageText('');
          if (!shouldHide) setTimeout(() => loadSuggestions('getting started'), 0);
        },
      },
    ]);
  }, [dispatch, loadSuggestions, route?.params?.hideSuggestions]);

  // ─── Render Suggestions ───────────────────────────────────────
  const renderSuggestions = useMemo(() => {
    if (!showSuggestions || suggestions.length === 0 || messages.length > 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions:</Text>
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={`sug-${i}`}
            style={styles.suggestionButton}
            onPress={() => handleSuggestionPress(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showSuggestions, suggestions, messages.length, handleSuggestionPress]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <Container>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Welcome screen */}
          {messages.length === 0 && !loading && (
            <View style={styles.welcomeContainer}>
              <View style={styles.aiIconContainer}>
                <View style={styles.aiIcon}>
                  <AppIcon name={icons.ailogo} height={hp(9)} width={hp(18)} />
                </View>
              </View>
              <Text style={styles.welcomeTitle}>Hello! I'm your{'\n'}AI Assistant.</Text>
              <Text style={styles.welcomeDescription}>
                I can assist with text-based questions and analyze{'\n'}images to provide quick, accurate insights.
              </Text>
              {!isLogged && (
                <Text style={styles.loginPrompt}>Please login to start chatting.</Text>
              )}
            </View>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={[styles.messageContainer, styles.botMessage, styles.typingContainer]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}

          {/* Suggestions */}
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
              editable={!loading}
            />
            <TouchableOpacity style={styles.iconButton} onPress={() => {}} disabled={loading}>
              <AppIcon name={icons.aiVoice} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleImagePicker} disabled={loading}>
              <AppIcon name={icons.aiImage} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (loading || (!messageText.trim() && !selectedImage)) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={loading || (!messageText.trim() && !selectedImage)}>
            <AppIcon name={icons.send} height={hp(3)} width={hp(3)} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </Container>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  chatContainer: { flex: 1 },
  chatContent: { flexGrow: 1, paddingHorizontal: wp(4), paddingVertical: hp(2) },

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
  loginPrompt: {
    fontSize: hp(1.8), color: '#ff6b6b',
    textAlign: 'center', fontStyle: 'italic', marginTop: hp(2),
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
  sourceIndicator: {
    fontSize: hp(1.4), color: Colors.gray, marginBottom: hp(0.5), fontWeight: '600',
  },
  messageText: { fontSize: hp(2), lineHeight: hp(2.6) },
  timestamp: { fontSize: hp(1.4), marginTop: hp(0.5), opacity: 0.7 },

  messageImageContainer: { marginBottom: hp(1), borderRadius: wp(2), overflow: 'hidden' },
  messageImage: { width: wp(50), height: wp(35), borderRadius: wp(2) },

  typingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(2) },
  typingText: { fontSize: hp(2), color: Colors.gray, fontStyle: 'italic', marginLeft: wp(2) },

  suggestionsContainer: { marginTop: hp(-3), paddingHorizontal: wp(2) },
  suggestionsTitle: {
    fontSize: hp(1.8), fontWeight: '600', color: Colors.black, marginBottom: hp(1.5),
  },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: Colors.black,
    borderRadius: wp(6), paddingHorizontal: wp(4), paddingVertical: hp(1.5),
    marginVertical: hp(0.5), elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  suggestionText: { color: Colors.primary, fontSize: hp(1.8), textAlign: 'left' },

  imagePreviewContainer: { margin: wp(4), position: 'relative', alignSelf: 'flex-start' },
  imagePreview: { width: wp(25), height: wp(25), borderRadius: wp(3), backgroundColor: '#f0f0f0' },
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
  textInput: { flex: 1, fontSize: hp(2), color: '#000', paddingRight: wp(2), maxHeight: hp(10) },
  iconButton: { marginLeft: wp(1), paddingHorizontal: wp(1.5) },
  sendButton: {
    marginLeft: wp(2), width: hp(6), height: hp(6), borderRadius: hp(3),
    backgroundColor: '#D64545', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D64545', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  sendButtonDisabled: { opacity: 0.5 },
});

export default AIAssistant;
