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
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Voice from '@react-native-voice/voice';
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
} from '../../Redux/Ai/aiSlice';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { getLandlordProperties } from '../../Redux/Properties/services';
import Hyperlink from 'react-native-hyperlink';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

// ─── Workflow badge ───────────────────────────────────────────────────────────
const WORKFLOW_LABELS = {
  maintenance_ticket: { label: '🔧 Maintenance ticket', color: '#e65100' },
  rent_inquiry:       { label: '💰 Rent inquiry',       color: '#1565c0' },
  lease_question:     { label: '📄 Lease question',     color: '#4527a0' },
};
const WorkflowBadge = ({ workflowType, workflowStatus }) => {
  if (!workflowType) return null;
  const meta     = WORKFLOW_LABELS[workflowType] || { label: workflowType, color: '#555' };
  const isDenied = workflowStatus === 'denied';
  return (
    <View style={[badgeStyles.row, { borderColor: meta.color }]}>
      <Text style={[badgeStyles.label, { color: meta.color }]}>{meta.label}</Text>
      {isDenied && <Text style={badgeStyles.denied}>· access denied</Text>}
    </View>
  );
};
const badgeStyles = StyleSheet.create({
  row:    {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: wp(3), paddingHorizontal: wp(2), paddingVertical: hp(0.4),
    marginBottom: hp(0.6), alignSelf: 'flex-start',
  },
  label:  { fontSize: hp(1.4), fontWeight: '600' },
  denied: { fontSize: hp(1.4), color: '#b71c1c', marginLeft: wp(1) },
});

// ─── Waveform (ChatGPT style animated bars) ───────────────────────────────────
const BAR_COUNT = 30;
const VoiceWaveform = () => {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const delay    = (i * 60) % 500;
      const duration = 250 + (i % 5) * 80;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 0.2 + (i % 3) * 0.3, duration, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0.15,                 duration, useNativeDriver: false }),
        ])
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={waveStyles.wrapper}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              height: anim.interpolate({
                inputRange:  [0, 1],
                outputRange: [hp(0.5), hp(3.2)],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};
const waveStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  bar: {
    width: wp(0.7),
    borderRadius: wp(0.35),
    backgroundColor: '#D64545',
    marginHorizontal: wp(0.25),
  },
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
      .then((ok) => { if (ok) Linking.openURL(cleanUrl); else Alert.alert('Error', 'Cannot open this link'); })
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
      {isUser && msg.isVoice && (
        <Text style={styles.voiceBadge}>🎤 Voice message</Text>
      )}
      {!isUser && (msg.workflowType || msg.executionType === 'hybrid') && (
        <WorkflowBadge workflowType={msg.workflowType} workflowStatus={msg.workflowStatus} />
      )}
      <Hyperlink
        linkDefault
        linkStyle={{ color: isUser ? '#FFE5E5' : Colors.red, textDecorationLine: 'underline', fontWeight: '500' }}
        onPress={handleLinkPress}>
        <Text style={[styles.messageText, { color: isError ? '#d32f2f' : Colors.black }]}>
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
  const [messageText, setMessageText]               = useState('');
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [selectedImage, setSelectedImage]           = useState(null);
  const [showSuggestions, setShowSuggestions]       = useState(true);
  const [localSuggestions, setLocalSuggestions]     = useState([]);

  // ── Voice ────────────────────────────────────────────────────────────────────
  // isRecording  — true while the mic is active (waveform UI shown)
  // voiceReady   — true after ✓: transcript is in TextInput, ready to review/send
  const [isRecording, setIsRecording] = useState(false);
  const [voiceReady, setVoiceReady]   = useState(false);

  // Refs so Voice callbacks always see the latest values without stale closures
  const isRecordingRef     = useRef(false);
  const accumulatedTextRef = useRef('');   // text built across auto-restart windows
  const isVoiceMessageRef  = useRef(false);

  const scrollViewRef  = useRef(null);
  const lastMessageRef = useRef('');
  const isMountedRef   = useRef(true);

  const dispatch = useDispatch();

  const { loading, messages, error, suggestions, isTyping } =
    useSelector(chatSelectors.getChatData);
  const token            = useSelector(loginDataSelectors.getAccessToken);
  const landlordId       = useSelector(loginDataSelectors.getLandlordId);
  const currentSessionId = useSelector((state) => state.ai?.currentSessionId || null);
  const isAnyLoading     = loading || isTyping;

  const getAvailableToken = useCallback(() => {
    if (!token || token === 'null') return null;
    return token;
  }, [token]);

  // ─── Helpers: stop Voice cleanly ─────────────────────────────────────────────
  const stopVoice = useCallback(async () => {
    isRecordingRef.current = false;
    try { await Voice.stop(); } catch { /* ignore */ }
  }, []);

  const cancelVoice = useCallback(async () => {
    isRecordingRef.current = false;
    try { await Voice.cancel(); } catch { /* ignore */ }
  }, []);

  // ─── Voice listeners ─────────────────────────────────────────────────────────
  //
  // iOS STT closes after ~60 s of silence.  We auto-restart every time the
  // engine closes so the user never has to tap again mid-sentence.
  // Text from every window is appended so nothing is lost.
  //
  useEffect(() => {
    // Show accumulated + current partial while speaking
    Voice.onSpeechPartialResults = (e) => {
      if (!isMountedRef.current) return;
      const partial  = e.value?.[0] || '';
      const combined = (accumulatedTextRef.current + ' ' + partial).trim();
      setMessageText(combined);
    };

    // Window closed with a final result → append and restart if still recording
    Voice.onSpeechResults = (e) => {
      if (!isMountedRef.current) return;
      const finalText = e.value?.[0] || '';
      if (finalText) {
        accumulatedTextRef.current = (accumulatedTextRef.current + ' ' + finalText).trim();
        setMessageText(accumulatedTextRef.current);
        isVoiceMessageRef.current  = true;
      }
      if (isRecordingRef.current) {
        Voice.start('en-US').catch(() => {
          isRecordingRef.current = false;
          setIsRecording(false);
        });
      }
    };

    // Engine timed out on silence → restart if still recording
    Voice.onSpeechEnd = () => {
      if (!isMountedRef.current || !isRecordingRef.current) return;
      Voice.start('en-US').catch(() => {
        isRecordingRef.current = false;
        setIsRecording(false);
      });
    };

    // Suppress "no speech" / "cancelled" errors; only surface real ones
    Voice.onSpeechError = (e) => {
      if (!isMountedRef.current) return;
      const code        = String(e.error?.code || '');
      const silentCodes = ['5', '7', '203', '1110'];
      if (isRecordingRef.current && !silentCodes.includes(code)) {
        isRecordingRef.current = false;
        setIsRecording(false);
        Alert.alert('Voice Error', e.error?.message || 'Voice recognition failed');
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  // ─── Tap mic: start recording ─────────────────────────────────────────────
  const handleVoiceStart = useCallback(async () => {
    if (isAnyLoading) return;

    // Reset accumulated buffer for a fresh recording session
    accumulatedTextRef.current = '';
    isVoiceMessageRef.current  = false;
    setMessageText('');
    setVoiceReady(false);

    try {
      await Voice.start('en-US');
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (e) {
      Alert.alert('Voice Error', e.message || 'Could not start voice recognition');
    }
  }, [isAnyLoading]);

  // ─── Tap ✓ (confirm): stop mic, put transcript in TextInput ──────────────
  const handleVoiceConfirm = useCallback(async () => {
    await stopVoice();
    setIsRecording(false);

    const transcript = accumulatedTextRef.current.trim();
    if (transcript) {
      setMessageText(transcript);
      isVoiceMessageRef.current = true;
      setVoiceReady(true);        // show normal input bar so user can review & send
    } else {
      setVoiceReady(false);       // nothing captured — go back to normal silently
    }
  }, [stopVoice]);

  // ─── Tap ✕ (cancel): discard everything ──────────────────────────────────
  const handleVoiceCancel = useCallback(async () => {
    await cancelVoice();
    accumulatedTextRef.current = '';
    isVoiceMessageRef.current  = false;
    setIsRecording(false);
    setVoiceReady(false);
    setMessageText('');           // clear input — nothing shows in the text field
  }, [cancelVoice]);

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsComponentMounted(true);
    isMountedRef.current = true;
    if (!currentSessionId) dispatch(setCurrentSessionId(`session-${Date.now()}`));
    dispatch(clearChatError());
    return () => {
      isMountedRef.current = false;
      setIsComponentMounted(false);
      Voice.destroy().catch(() => {});
    };
  }, [dispatch, currentSessionId]);

  // ─── Focus ────────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const shouldHide = route?.params?.hideSuggestions || false;
      if (messages.length === 0) {
        setShowSuggestions(!shouldHide);
        if (!shouldHide) loadSuggestions('getting started');
      }
      return () => {
        if (isRecordingRef.current) stopVoice();
      };
    }, [route?.params?.hideSuggestions, messages.length])
  );

  // ─── Auto scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && isComponentMounted) {
      setTimeout(() => {
        if (isMountedRef.current && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages.length, isComponentMounted]);

  useEffect(() => {
    if (suggestions.length > 0) setLocalSuggestions(suggestions.slice(0, 4));
  }, [suggestions]);

  const loadSuggestions = useCallback(async (context) => {
    if (!isMountedRef.current) return;
    try {
      const result = await dispatch(
        getAISuggestions({ context, sessionId: currentSessionId })
      ).unwrap();
      if (isMountedRef.current) setLocalSuggestions(result.suggestions?.slice(0, 4) || []);
    } catch {
      if (isMountedRef.current) {
        setLocalSuggestions([
          "My sink is leaking",
          "Toilet won't flush",
          "There's a crack in the wall",
          "How do I fix a dripping tap?",
        ]);
      }
    }
  }, [dispatch, currentSessionId]);

  // ─── Image picker ─────────────────────────────────────────────────────────
  const handleImageResponse = useCallback((response) => {
    if (response.didCancel) return;
    if (response.errorCode) { Alert.alert('Image Error', response.errorMessage || 'Failed'); return; }
    const asset = response.assets?.[0];
    if (!asset) return;
    setSelectedImage({
      uri:      asset.uri,
      base64:   asset.base64   || null,
      type:     asset.type     || 'image/jpeg',
      fileName: asset.fileName || `photo-${Date.now()}.jpg`,
    });
  }, []);

  const IMAGE_PICKER_OPTIONS = {
    mediaType: 'photo', quality: 0.5, maxWidth: 800, maxHeight: 800, includeBase64: true,
  };

  const handleImagePicker = useCallback(() => {
    Alert.alert('Select Image', 'Choose an image source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera',  onPress: () => launchCamera({ ...IMAGE_PICKER_OPTIONS, saveToPhotos: true }, handleImageResponse) },
      { text: 'Gallery', onPress: () => launchImageLibrary(IMAGE_PICKER_OPTIONS, handleImageResponse) },
    ]);
  }, [handleImageResponse]);

  // ─── Refresh properties if AI updated something ───────────────────────────
  const refreshPropertiesIfUpdated = useCallback((aiResponse) => {
    if (!aiResponse || !landlordId) return;
    const keywords = ['updated', 'changed', 'modified', 'set to', 'availability',
      'rent', 'monthly_rent', 'price', 'property has been', 'successfully updated'];
    if (keywords.some((kw) => aiResponse.toLowerCase().includes(kw))) {
      const t = getAvailableToken();
      if (t) dispatch(getLandlordProperties({ landlordId, token: t }));
    }
  }, [dispatch, landlordId, getAvailableToken]);

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (messageOverride = null) => {
    const trimmedMessage = (messageOverride || messageText).trim();
    if (!trimmedMessage && !selectedImage) {
      Alert.alert('Empty Message', 'Please enter a message or select an image.');
      return;
    }
    if (trimmedMessage === lastMessageRef.current && !selectedImage) return;
    if (isAnyLoading) return;
    if (!getAvailableToken()) {
      Alert.alert('Not Logged In', 'Please log in to use the AI Assistant.');
      return;
    }

    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
      sessionIdToUse = `session-${Date.now()}`;
      dispatch(setCurrentSessionId(sessionIdToUse));
    }

    const currentImage = selectedImage;
    const wasVoice     = isVoiceMessageRef.current && !messageOverride;

    if (!messageOverride) setMessageText('');
    setSelectedImage(null);
    setVoiceReady(false);
    isVoiceMessageRef.current = false;
    accumulatedTextRef.current = '';
    lastMessageRef.current     = trimmedMessage;
    setShowSuggestions(false);

    try {
      let result;
      if (currentImage?.uri) {
        result = await dispatch(
          sendChatMessageWithImage({
            message:     trimmedMessage || undefined,
            imageUri:    currentImage.uri,
            imageBase64: currentImage.base64 || undefined,
            sessionId:   sessionIdToUse,
            ocrHint:     trimmedMessage || undefined,
            captionHint: trimmedMessage || undefined,
          })
        ).unwrap();
      } else {
        result = await dispatch(
          sendChatMessageNew({
            message:   trimmedMessage,
            sessionId: sessionIdToUse,
            isVoice:   wasVoice,
          })
        ).unwrap();
      }
      if (result?.response && isMountedRef.current) refreshPropertiesIfUpdated(result.response);
      setTimeout(() => { lastMessageRef.current = ''; }, 1000);
    } catch (err) {
      if (!messageOverride) setMessageText(trimmedMessage);
      if (currentImage)     setSelectedImage(currentImage);
      lastMessageRef.current    = '';
      isVoiceMessageRef.current = false;
      const errMsg = typeof err === 'string' ? err : err?.message || err?.error || 'Failed to send.';
      Alert.alert('Message Failed', errMsg, [{ text: 'OK' }]);
    }
  }, [
    messageText, selectedImage, currentSessionId, isAnyLoading,
    dispatch, getAvailableToken, refreshPropertiesIfUpdated,
  ]);

  const handleSuggestionPress = useCallback((s) => handleSendMessage(s), [handleSendMessage]);

  // ─── Clear chat ───────────────────────────────────────────────────────────
  const handleClearChat = useCallback(() => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => {
          dispatch(clearChatMessages());
          lastMessageRef.current     = '';
          accumulatedTextRef.current = '';
          isVoiceMessageRef.current  = false;
          setVoiceReady(false);
          setShowSuggestions(!(route?.params?.hideSuggestions || false));
          setSelectedImage(null);
          setMessageText('');
          if (!(route?.params?.hideSuggestions)) setTimeout(() => loadSuggestions('getting started'), 0);
        },
      },
    ]);
  }, [dispatch, loadSuggestions, route?.params?.hideSuggestions]);

  // ─── Suggestions ─────────────────────────────────────────────────────────
  const renderSuggestions = useMemo(() => {
    if (!showSuggestions || localSuggestions.length === 0 || messages.length > 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions:</Text>
        {localSuggestions.map((s, i) => (
          <TouchableOpacity key={`sug-${i}`} style={styles.suggestionButton} onPress={() => handleSuggestionPress(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showSuggestions, localSuggestions, messages.length, handleSuggestionPress]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Container scroll={false} noPaddingBottom>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AppIcon name={icons.arrowBack} size={22} />
          </TouchableOpacity>
          {messages.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearChat}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chat area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {messages.length === 0 && !isAnyLoading && (
            <View style={styles.welcomeContainer}>
              <View style={styles.aiIconContainer}>
                <View style={styles.aiIcon}>
                  <AppIcon name={icons.ailogo} height={hp(9)} width={hp(18)} />
                </View>
              </View>
              <Text style={styles.welcomeTitle}>Hello! I'm your{'\n'}AI Assistant.</Text>
              <Text style={styles.welcomeDescription}>
                Ask me anything — type, speak, or send a photo{'\n'}and I'll analyse it for you.
              </Text>
            </View>
          )}

          {messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)}

          {isAnyLoading && (
            <View style={[styles.messageContainer, styles.botMessage, styles.typingContainer]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>AI is thinking…</Text>
            </View>
          )}

          {renderSuggestions}
        </ScrollView>

        {/* Image preview */}
        {selectedImage && !isRecording && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="cover" />
          </View>
        )}

        {/* ── RECORDING BAR — replaces the input bar while mic is active ── */}
        {isRecording ? (
          <View style={styles.recordingSection}>
            {/* ✕ Cancel */}
            <TouchableOpacity style={styles.voiceActionBtn} onPress={handleVoiceCancel}>
              <Text style={styles.voiceCancelIcon}>✕</Text>
            </TouchableOpacity>

            {/* Waveform */}
            <View style={styles.waveformBox}>
              <VoiceWaveform />
            </View>

            {/* ✓ Confirm */}
            <TouchableOpacity style={[styles.voiceActionBtn, styles.voiceConfirmBtn]} onPress={handleVoiceConfirm}>
              <Text style={styles.voiceConfirmIcon}>✓</Text>
            </TouchableOpacity>
          </View>

        ) : (
          /* ── NORMAL INPUT BAR ── */
          <View style={styles.inputSection}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={messageText}
                onChangeText={(t) => {
                  setMessageText(t);
                  // User edited manually — no longer a pure voice message
                  if (voiceReady) {
                    isVoiceMessageRef.current = false;
                    setVoiceReady(false);
                  }
                }}
                placeholder={
                  selectedImage ? 'Describe the issue (or leave blank)…' : 'Type your message…'
                }
                placeholderTextColor="#555"
                multiline
                maxLength={1000}
                editable={!isAnyLoading}
              />

              {/* Mic button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleVoiceStart}
                disabled={isAnyLoading}>
                <AppIcon name={icons.aiVoice} height={hp(3)} width={hp(3)} />
              </TouchableOpacity>

              {/* Image picker button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleImagePicker}
                disabled={isAnyLoading}>
                <AppIcon name={icons.aiImage} height={hp(3)} width={hp(3)} />
              </TouchableOpacity>
            </View>

            {/* Send */}
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
        )}

      </KeyboardAvoidingView>
    </Container>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1 },
  chatContainer: { flex: 1 },
  chatContent:   { flexGrow: 1, paddingHorizontal: wp(4), paddingVertical: hp(2) },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingVertical: hp(1),
  },
  clearButton:     { paddingHorizontal: wp(3), paddingVertical: hp(0.6), backgroundColor: 'rgba(214,69,69,0.1)', borderRadius: wp(4) },
  clearButtonText: { fontSize: hp(1.6), color: Colors.black, fontWeight: '600' },

  welcomeContainer:   { alignItems: 'center', paddingHorizontal: wp(6), marginTop: hp(-2), marginBottom: hp(2) },
  aiIconContainer:    { marginBottom: hp(1) },
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
  userMessage:     { alignSelf: 'flex-end', backgroundColor: Colors.white },
  botMessage:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  errorMessage:    { backgroundColor: '#ffebee', borderColor: '#ffcdd2' },
  sourceIndicator: { fontSize: hp(1.4), color: Colors.gray, marginBottom: hp(0.5), fontWeight: '600' },
  messageText:     { fontSize: hp(2), lineHeight: hp(2.6) },
  timestamp:       { fontSize: hp(1.4), marginTop: hp(0.5), opacity: 0.7 },
  voiceBadge:      { fontSize: hp(1.4), color: Colors.gray, marginBottom: hp(0.4) },

  messageImageContainer: { marginBottom: hp(1), borderRadius: wp(2), overflow: 'hidden' },
  messageImage:          { width: wp(50), height: wp(35), borderRadius: wp(2) },

  typingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(2) },
  typingText:      { fontSize: hp(2), color: Colors.gray, fontStyle: 'italic', marginLeft: wp(2) },

  suggestionsContainer: { marginTop: hp(-3), paddingHorizontal: wp(2) },
  suggestionsTitle:     { fontSize: hp(1.8), fontWeight: '600', color: Colors.black, marginBottom: hp(1.5) },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: Colors.black,
    borderRadius: wp(6), paddingHorizontal: wp(4), paddingVertical: hp(1.5),
    marginVertical: hp(0.5), elevation: 1,
  },
  suggestionText: { color: Colors.primary, fontSize: hp(1.8), textAlign: 'left' },

  imagePreviewContainer: { margin: wp(4), position: 'relative', alignSelf: 'flex-start' },
  imagePreview:          { width: wp(25), height: wp(25), borderRadius: wp(3), backgroundColor: '#f0f0f0' },

  // ── Recording bar ──────────────────────────────────────────────────────────
  recordingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    height: hp(7),
    backgroundColor: '#fff',
    borderRadius: wp(8),
    borderWidth: 1,
    borderColor: '#EBAFAF',
    paddingHorizontal: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  waveformBox: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  voiceActionBtn: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceConfirmBtn: {
    backgroundColor: '#D64545',
  },
  voiceCancelIcon: {
    fontSize: hp(2),
    color: '#555',
    fontWeight: '700',
  },
  voiceConfirmIcon: {
    fontSize: hp(2.2),
    color: '#fff',
    fontWeight: '700',
  },

  // ── Normal input bar ───────────────────────────────────────────────────────
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
  textInput:  { flex: 1, fontSize: hp(2), color: '#000', paddingRight: wp(2), maxHeight: hp(10) },
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
