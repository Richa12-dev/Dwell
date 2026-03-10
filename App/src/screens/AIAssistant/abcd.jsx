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
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Colors } from '../../Theme';
import Container from '../../components/Container/Container';
import {
  sendChatMessage,
  sendChatMessageNew,
  sendChatMessageWithImage,
  getAISuggestions,
} from '../../Redux/Ai/services';
import {
  setCurrentSessionId,
  clearChatMessages,
  clearChatError,
  setChatLoading,
  chatSelectors,
  resetAIState ,
} from '../../Redux/Ai/aiSlice';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Hyperlink from 'react-native-hyperlink';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";


// ✅ MessageItem component with proper link handling
const MessageItem = React.memo(({ msg, index }) => {
  const isUser = msg.type === 'user';
  const isError = msg.isError || false;
  const messageContent = msg.message || msg.text || msg.content || 'No message content';

  const handleLinkPress = useCallback((url) => {
    console.log('🔗 Link pressed:', url);

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    Linking.canOpenURL(cleanUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(cleanUrl);
        } else {
          Alert.alert('Error', 'Cannot open this link');
        }
      })
      .catch((err) => {
        console.error('❌ Failed to open URL:', err);
        Alert.alert('Error', 'Could not open the link');
      });
  }, []);

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.botMessage,
        isError ? styles.errorMessage : {},
      ]}>
      
      {!isUser && msg.source && (
        <Text style={styles.sourceIndicator}>
          {msg.source === 'aws-new' ? 'AI Assistant' :
           msg.source === 'aws' ? '🤖 AI Assistant' : '🚀 AI'}
        </Text>
      )}

      {msg.hasImage && msg.imageUri && (
        <View style={styles.messageImageContainer}>
          <Image
            source={{ uri: msg.imageUri }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        </View>
      )}

      <Hyperlink
        linkDefault={true}
        linkStyle={{
          color: isUser ? '#FFE5E5' : Colors.primary,
          textDecorationLine: 'underline',
          fontWeight: '500',
        }}
        onPress={handleLinkPress}
        linkText={(url) => {
          if (url.includes('amazon.com')) {
            if (url.includes('/dp/')) return 'Amazon Link';
            if (url.includes('/s?k=')) return 'Search on Amazon';
          }
          return url;
        }}>
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? Colors.white : (isError ? '#d32f2f' : Colors.black),
            },
          ]}>
          {messageContent}
        </Text>
      </Hyperlink>

      <Text
        style={[
          styles.timestamp,
          {
            color: isUser ? 'rgba(255,255,255,0.8)' : (isError ? '#d32f2f' : Colors.gray),
          },
        ]}>
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id &&
    prevProps.index === nextProps.index;
});

const AIAssistant = ({ navigation }) => {
  const [messageText, setMessageText] = useState('');
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollViewRef = useRef();
  const lastMessageRef = useRef('');
  const isMountedRef = useRef(true);

  const dispatch = useDispatch();

  // ✅ Optimized selectors
  const chatData = useSelector(chatSelectors.getChatData);
  const { loading, messages, currentSessionId, error } = chatData;

  const loginData = useSelector(loginDataSelectors.getLoginStatus);
  const { isLogged, token } = loginData;

  const rawLoginState = useSelector((state) => state.loginData);

  // ✅ Get available token
  const getAvailableToken = useCallback(() => {
    return token ||
      rawLoginState?.token ||
      rawLoginState?.accessToken ||
      rawLoginState?.userData?.token ||
      rawLoginState?.userData?.accessToken;
  }, [token, rawLoginState]);

  // ✅ Initialize component
  useEffect(() => {
    if (!currentSessionId) {
      const newSessionId = `session-${Date.now()}`;
      dispatch(setCurrentSessionId(newSessionId));
    }
    dispatch(clearChatError());
    loadSuggestions('getting started');

    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, [dispatch, currentSessionId]);

  // ✅ Auto scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && isComponentMounted) {
      setTimeout(() => {
        if (isMountedRef.current && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages.length, isComponentMounted]);

  // ✅ Load suggestions
  const loadSuggestions = useCallback(async (context) => {
    if (!isMountedRef.current) return;

    try {
      const result = await dispatch(getAISuggestions({
        context,
        sessionId: currentSessionId
      })).unwrap();

      if (isMountedRef.current) {
        setSuggestions(result.suggestions?.slice(0, 4) || []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setSuggestions([
          "My sink is leaking",
          "Toilet won't flush",
          "There's a crack in the wall",
          "How do I fix a dripping tap?"
        ]);
      }
    }
  }, [dispatch, currentSessionId]);

  // ✅ Handle image picker
  const handleImagePicker = useCallback(() => {
    Alert.alert(
      'Select Image',
      'Choose an image source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: () => launchCamera(
            {
              mediaType: 'photo',
              quality: 0.5,
              maxWidth: 800,
              maxHeight: 800,
              saveToPhotos: true,
            },
            handleImageResponse
          )
        },
        {
          text: 'Gallery',
          onPress: () => launchImageLibrary(
            {
              mediaType: 'photo',
              quality: 0.5,
              maxWidth: 800,
              maxHeight: 800,
            },
            handleImageResponse
          )
        },
      ]
    );
  }, []);

  const handleImageResponse = useCallback((response) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.error) {
      console.error('ImagePicker Error:', response.error);
      Alert.alert('Error', 'Failed to pick image');
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      console.log('✅ Image selected:', asset.uri);
      setSelectedImage({
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName,
      });
    }
  }, []);

  const removeSelectedImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // ✅ CORRECTED handleSendMessage - removed duplicate code
  const handleSendMessage = useCallback(async (messageOverride = null) => {
    const trimmedMessage = (messageOverride || messageText).trim();

    if (!trimmedMessage && !selectedImage) {
      Alert.alert('Empty Message', 'Please enter a message or select an image.');
      return;
    }

    if (trimmedMessage === lastMessageRef.current && !selectedImage) {
      console.log('⚠️ Duplicate message prevented');
      return;
    }

    if (!isLogged) {
      Alert.alert('Login Required', 'Please login to use the chat feature.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    const availableToken = getAvailableToken();
    if (!availableToken) {
      Alert.alert('Authentication Error', 'Please logout and login again.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    // ✅ Ensure a session ID exists before sending
    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
      sessionIdToUse = `session-${Date.now()}`;
      dispatch(setCurrentSessionId(sessionIdToUse));
    }

    if (loading) {
      console.log('⚠️ Already loading, skipping...');
      return;
    }

    const currentImage = selectedImage;

    // Clear inputs immediately
    if (!messageOverride) {
      setMessageText('');
    }
    setSelectedImage(null);
    lastMessageRef.current = trimmedMessage;
    setShowSuggestions(false);

    try {
      const messageParams = {
        message: trimmedMessage,
        sessionId: sessionIdToUse,
        token: availableToken, // ✅ JWT Token
      };

      let result;
      if (currentImage) {
        console.log('📤 Sending message with image...');
        messageParams.imageUri = currentImage.uri;
        result = await dispatch(sendChatMessageWithImage(messageParams)).unwrap();
      } else {
        // ✅ USE NEW API for text messages
        console.log('📤 Sending text message to NEW API...');
        result = await dispatch(sendChatMessageNew(messageParams)).unwrap();
      }

      console.log('✅ Message sent successfully:', result);

      if (result.response && isMountedRef.current) {
        setTimeout(() => {
          loadSuggestions(result.response.substring(0, 100));
        }, 500);
      }

      setTimeout(() => {
        lastMessageRef.current = '';
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Restore inputs on error
      if (!messageOverride) {
        setMessageText(trimmedMessage);
      }
      if (currentImage) {
        setSelectedImage(currentImage);
      }
      lastMessageRef.current = '';

      Alert.alert(
        'Message Failed',
        typeof error === 'string' ? error : 'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [messageText, selectedImage, isLogged, currentSessionId, loading, getAvailableToken, dispatch, navigation, loadSuggestions]);

  const handleSuggestionPress = useCallback((suggestion) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            dispatch(clearChatMessages());
            lastMessageRef.current = '';
            setShowSuggestions(true);
            setSelectedImage(null);
            setMessageText('');
            setTimeout(() => loadSuggestions('getting started'), 0);
          }
        }
      ]
    );
  }, [dispatch, loadSuggestions]);

  // ✅ Render functions
  const renderMessage = useCallback((msg, index) => (
    <MessageItem key={msg.id || `msg-${index}`} msg={msg} index={index} />
  ), []);

  const renderSuggestions = useMemo(() => {
    if (!showSuggestions || suggestions.length === 0 || messages.length > 0) {
      return null;
    }

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions:</Text>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`suggestion-${index}`}
            style={styles.suggestionButton}
            onPress={() => handleSuggestionPress(suggestion)}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showSuggestions, suggestions, messages.length, handleSuggestionPress]);

  return (
    <Container>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}>

        {/* Chat Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Welcome Screen */}
          {messages.length === 0 && !loading && (
            <View style={styles.welcomeContainer}>
              <View style={styles.aiIconContainer}>
                <View style={styles.aiIcon}>
                  <AppIcon name={icons.ailogo} height={hp(9)} width={hp(18)} />
                </View>
              </View>

              <Text style={styles.welcomeTitle}>
                Hello! I'm your{'\n'}enhanced AI Assistant.
              </Text>

              <Text style={styles.welcomeDescription}>
                I can assist with text-based questions and analyze{'\n'}
                images to provide quick, accurate insights.
              </Text>

              {!isLogged && (
                <Text style={styles.loginPrompt}>
                  Please login to start chatting.
                </Text>
              )}
            </View>
          )}

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Loading Indicator */}
          {loading && (
            <View style={[styles.messageContainer, styles.botMessage, styles.typingContainer]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}

          {/* Suggestions */}
          {renderSuggestions}

        </ScrollView>

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeSelectedImage}>
              <AppIcon name={icons.close} size={hp(1.5)} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Container */}
        <View style={styles.inputSection}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={
                selectedImage
                  ? "Describe what you see..."
                  : "Type your message..."
              }
              placeholderTextColor="#555"
              multiline
              maxLength={1000}
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {}}
              disabled={loading}>
              <AppIcon name={icons.aiVoice} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleImagePicker}
              disabled={loading}>
              <AppIcon name={icons.aiImage} height={hp(3)} width={hp(3)} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage()}
            disabled={loading || (!messageText.trim() && !selectedImage)}>
            <AppIcon name={icons.send} height={hp(3)} width={hp(3)} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glassActionBar: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
  },
  actionBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  glassInputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    padding: wp(3),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: wp(1),
    color: Colors.primary,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  statusText: {
    fontSize: hp(1.6),
    color: Colors.gray,
    fontStyle: 'italic',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    flexGrow: 1,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(6),
    marginTop: hp(-2),
    marginBottom: hp(2),
  },
  aiIconContainer: {
    marginBottom: hp(1),
  },
  aiIcon: {
    width: hp(15),
    height: hp(15),
    borderRadius: hp(7.5),
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  welcomeTitle: {
    fontSize: hp(3),
    fontWeight: 'bold',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: hp(2),
    lineHeight: hp(3.5),
  },
  welcomeDescription: {
    fontSize: hp(1.5),
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: hp(2.5),
    marginBottom: hp(2),
  },
  loginPrompt: {
    fontSize: hp(1.8),
    color: '#ff6b6b',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: hp(2),
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: hp(1),
    padding: wp(3.5),
    borderRadius: wp(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  sourceIndicator: {
    fontSize: hp(1.4),
    color: Colors.gray,
    marginBottom: hp(0.5),
    fontWeight: '600',
  },
  messageText: {
    fontSize: hp(2),
    lineHeight: hp(2.6),
  },
  timestamp: {
    fontSize: hp(1.4),
    marginTop: hp(0.5),
    opacity: 0.7,
  },
  messageImageContainer: {
    marginBottom: hp(1),
    borderRadius: wp(2),
    overflow: 'hidden',
  },
  messageImage: {
    width: wp(50),
    height: wp(35),
    borderRadius: wp(2),
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  typingText: {
    fontSize: hp(2),
    color: Colors.gray,
    fontStyle: 'italic',
    marginLeft: wp(2),
  },
  suggestionsContainer: {
    marginTop: hp(-3),
    paddingHorizontal: wp(2),
  },
  suggestionsTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: Colors.black,
    marginBottom: hp(1.5),
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: wp(6),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginVertical: hp(0.5),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionText: {
    color: Colors.primary,
    fontSize: hp(1.8),
    textAlign: 'left',
  },
  imagePreviewContainer: {
    margin: wp(4),
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: wp(25),
    height: wp(25),
    borderRadius: wp(3),
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -hp(1),
    right: -wp(2),
    backgroundColor: '#ff4444',
    borderRadius: hp(1.5),
    width: hp(3),
    height: hp(3),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  inputContainer: {
    padding: wp(4),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: "#EBAFAF",
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: hp(2),
    color: "#000",
    paddingRight: wp(2),
    maxHeight: hp(10),
  },
  iconButton: {
    marginLeft: wp(1),
    paddingHorizontal: wp(1.5),
  },
  sendButton: {
    marginLeft: wp(2),
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    backgroundColor: "#D64545",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D64545",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default AIAssistant;
