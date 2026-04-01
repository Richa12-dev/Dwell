import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Colors } from '../../Theme';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL         = 'https://jc80c1t1oh.execute-api.us-east-1.amazonaws.com/prod';
const HEALTH_URL       = `${BASE_URL}/health`;
const WEBHOOK_URL      = `${BASE_URL}/channels/twilio/sms/webhook`;
const POLL_INTERVAL_MS = 30000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const shortId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const buildFakeTwilioPayload = (fromNumber = '+19175550001') => {
  const params = new URLSearchParams({
    MessageSid:  `SM${shortId()}${shortId()}`,
    AccountSid:  'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    From:        fromNumber,
    To:          '+18889889792',
    Body:        'Test SMS from admin panel — is the webhook live?',
    NumMedia:    '0',
    SmsStatus:   'received',
    ApiVersion:  '2010-04-01',
  });
  return params.toString();
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    healthy:   { bg: '#e6f9f0', text: '#0f6e56', label: 'Healthy' },
    unhealthy: { bg: '#fff0f0', text: '#991f1f', label: 'Unhealthy' },
    checking:  { bg: '#fff8e6', text: '#7a4f00', label: 'Checking…' },
    unknown:   { bg: '#f5f5f5', text: '#555',    label: 'Unknown' },
  };
  const s = map[status] || map.unknown;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: s.text }]} />
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
};

// ─── Log Entry ────────────────────────────────────────────────────────────────
const LogEntry = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = entry.ok;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      style={[styles.logEntry, isSuccess ? styles.logSuccess : styles.logError]}
      activeOpacity={0.8}>
      <View style={styles.logHeader}>
        <View style={styles.logMeta}>
          <Text style={styles.logTime}>{entry.time}</Text>
          <Text style={[styles.logType, { color: isSuccess ? '#0f6e56' : '#991f1f' }]}>
            {entry.label}
          </Text>
        </View>
        <Text style={styles.logStatusCode}>
          {entry.status ? `HTTP ${entry.status}` : entry.error ? 'Error' : '—'}
        </Text>
      </View>

      {expanded && (
        <View style={styles.logDetail}>
          <Text style={styles.logDetailText} selectable>
            {JSON.stringify(entry.data, null, 2)}
          </Text>
        </View>
      )}

      <Text style={styles.logExpand}>{expanded ? '▲ collapse' : '▼ tap to expand'}</Text>
    </TouchableOpacity>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
// FIX 1: Accept `navigation` prop — was missing, causing navigation.goBack() to crash
const WebhookLogMonitor = ({ navigation }) => {

  const handleBack = () => {
    // Handles both stack navigator and modal presentation
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.dismiss?.();
    }
  };
  const [healthStatus, setHealthStatus]     = useState('unknown');
  const [subsystems, setSubsystems]         = useState({});
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastHealthTime, setLastHealthTime] = useState(null);
  const [pinging, setPinging]               = useState(false);
  const [logs, setLogs]                     = useState([]);

  const pollRef = useRef(null);

  // FIX 2: addLog wrapped in useCallback — stable reference, safe to call inside other callbacks
  const addLog = useCallback((entry) => {
    setLogs(prev => [{ id: Date.now(), time: getTimestamp(), ...entry }, ...prev].slice(0, 50));
  }, []);

  // ── Health check ──────────────────────────────────────────────────────────
  const checkHealth = useCallback(async (silent = false) => {
    if (!silent) setHealthChecking(true);
    try {
      const res  = await fetch(HEALTH_URL, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      const ok   = data?.ok === true && data?.data?.status === 'ok';

      setHealthStatus(ok ? 'healthy' : 'unhealthy');
      setSubsystems(data?.data?.subsystems || {});
      setLastHealthTime(getTimestamp());

      if (!silent) {
        addLog({ label: 'Health check', ok, status: res.status, data: data?.data || data });
      }
    } catch (err) {
      setHealthStatus('unhealthy');
      if (!silent) {
        addLog({ label: 'Health check', ok: false, error: err.message, data: { error: err.message } });
      }
    } finally {
      if (!silent) setHealthChecking(false);
    }
  }, [addLog]);

  // ── Webhook ping ──────────────────────────────────────────────────────────
  const pingWebhook = useCallback(async () => {
    setPinging(true);
    const payload = buildFakeTwilioPayload();

    try {
      const res         = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept:         'application/json, text/xml, */*',
        },
        body: payload,
      });

      const contentType = res.headers.get('content-type') || '';
      const raw         = await res.text();

      let data;
      if (contentType.includes('json')) {
        try { data = JSON.parse(raw); } catch { data = { raw }; }
      } else {
        data = { raw, note: 'Response is TwiML/XML — webhook received the request!' };
      }

      const ok = res.ok || res.status < 400;
      addLog({ label: 'Webhook ping', ok, status: res.status, data });

      if (ok) {
        Alert.alert(
          '✅ Webhook hit confirmed',
          `HTTP ${res.status} — your backend received the fake SMS.\nCheck your server logs for the full processing trace.`,
          [{ text: 'Got it' }]
        );
      } else {
        Alert.alert('⚠️ Webhook responded with error', `HTTP ${res.status}\n\n${raw.slice(0, 300)}`);
      }
    } catch (err) {
      addLog({ label: 'Webhook ping', ok: false, error: err.message, data: { error: err.message } });
      Alert.alert('❌ Webhook unreachable', err.message);
    } finally {
      setPinging(false);
    }
  }, [addLog]);

  const clearLogs = () => {
    Alert.alert('Clear logs', 'Remove all log entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setLogs([]) },
    ]);
  };

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    checkHealth(true);
    pollRef.current = setInterval(() => checkHealth(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [checkHealth]);

  const subsystemEntries = Object.entries(subsystems);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* FIX 3: Proper header row — back button and title side by side, not floating loose */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.backButton}>
          <AppIcon name={icons.arrowBack} size={hp(2.5)} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>SMS Webhook Monitor</Text>
      </View>

      <Text style={styles.subtitle}>
        Confirms hits to:{'\n'}
        <Text style={styles.url}>/channels/twilio/sms/webhook</Text>
      </Text>

      {/* Health card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Backend health</Text>
          {healthChecking
            ? <ActivityIndicator size="small" color="#1D9E75" />
            : <Badge status={healthStatus} />}
        </View>

        {lastHealthTime && (
          <Text style={styles.lastChecked}>Last checked: {lastHealthTime}</Text>
        )}

        {subsystemEntries.length > 0 && (
          <View style={styles.subsystemGrid}>
            {subsystemEntries.map(([key, val]) => {
              const ok = val === true || val?.status === 'ok' || val?.healthy === true || val === 'ok';
              return (
                <View key={key} style={styles.subsystemItem}>
                  <Text style={[styles.subsystemDot, { color: ok ? '#0f6e56' : '#991f1f' }]}>
                    {ok ? '●' : '○'}
                  </Text>
                  <Text style={styles.subsystemName}>{key}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => checkHealth(false)}
          disabled={healthChecking}>
          <Text style={styles.secondaryButtonText}>
            {healthChecking ? 'Checking…' : 'Run health check'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Twilio status notice */}
      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>⚠  Twilio verification in progress</Text>
        <Text style={styles.noticeText}>
          Submitted 2026-03-25. Inbound SMS hits the webhook but outbound reply
          SMS to the tenant is held until toll-free verification completes
          (typically 1–3 weeks). Use the ping below to verify the webhook
          endpoint is reachable while waiting.
        </Text>
      </View>

      {/* Webhook ping */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Webhook connectivity test</Text>
        <Text style={styles.cardSubtitle}>
          Sends a fake Twilio SMS payload to your webhook. When Rashaun texts
          the number for real, your server will receive the same shape.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, pinging && styles.buttonDisabled]}
          onPress={pingWebhook}
          disabled={pinging}>
          {pinging
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.primaryButtonText}>Ping webhook endpoint</Text>}
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.logsHeader}>
        <Text style={styles.cardTitle}>Activity log</Text>
        {logs.length > 0 && (
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyLogs}>
          <Text style={styles.emptyText}>
            No activity yet. Run a health check or ping the webhook.
          </Text>
        </View>
      ) : (
        logs.map(entry => <LogEntry key={entry.id} entry={entry} />)
      )}

    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
// FIX 4: `fontFamily: 'monospace'` is not valid in React Native — use Platform.select
const monoFont = Platform.select({ ios: 'Courier New', android: 'monospace' });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f6' },
  content:   { padding: wp(4), paddingTop: hp(10), paddingBottom: hp(5) },

  // FIX 3: header row so back button and title are aligned
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  hp(1.5),
    marginTop:     0,
  },
  backButton: { marginRight: wp(3) },

  title:    { fontSize: hp(2.4), fontWeight: '700', color: '#1a1a18' },
  subtitle: { fontSize: hp(1.6), color: '#666', marginBottom: hp(2) },
  url:      { fontFamily: monoFont, color: '#533AB7', fontSize: hp(1.4) },

  card: {
    backgroundColor: '#fff',
    borderRadius:    12,
    padding:         wp(4),
    marginBottom:    hp(1.5),
    borderWidth:     1,
    borderColor:     '#ebebeb',
  },
  cardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(1) },
  cardTitle:    { fontSize: hp(1.9), fontWeight: '600', color: '#1a1a18' },
  cardSubtitle: { fontSize: hp(1.6), color: '#777', marginTop: hp(0.5), marginBottom: hp(1.5), lineHeight: hp(2.3) },
  lastChecked:  { fontSize: hp(1.5), color: '#999', marginBottom: hp(1.2) },

  subsystemGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: hp(1.5) },
  subsystemItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: hp(0.5) },
  subsystemDot:  { fontSize: hp(1.3), marginRight: wp(1.5) },
  subsystemName: { fontSize: hp(1.5), color: '#555', textTransform: 'capitalize' },

  badge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(2.5), paddingVertical: hp(0.5), borderRadius: 20 },
  badgeDot:  { width: 7, height: 7, borderRadius: 4, marginRight: wp(1.5) },
  badgeText: { fontSize: hp(1.5), fontWeight: '600' },

  primaryButton: {
    backgroundColor: Colors.red || '#D64545',
    borderRadius:    10,
    paddingVertical: hp(1.6),
    alignItems:      'center',
    marginTop:       hp(0.5),
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: hp(1.8) },
  buttonDisabled:    { opacity: 0.5 },

  secondaryButton: {
    borderWidth:     1,
    borderColor:     '#ddd',
    borderRadius:    10,
    paddingVertical: hp(1.2),
    alignItems:      'center',
    marginTop:       hp(1),
  },
  secondaryButtonText: { color: '#444', fontWeight: '500', fontSize: hp(1.8) },

  noticeCard: {
    backgroundColor: '#FAEEDA',
    borderRadius:    12,
    padding:         wp(3.5),
    marginBottom:    hp(1.5),
    borderWidth:     1,
    borderColor:     '#EF9F27',
  },
  noticeTitle: { fontSize: hp(1.6), fontWeight: '600', color: '#633806', marginBottom: hp(0.7) },
  noticeText:  { fontSize: hp(1.5), color: '#7a4f00', lineHeight: hp(2.2) },

  logsHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   hp(1),
    marginTop:      hp(0.5),
  },
  clearText: { fontSize: hp(1.6), color: Colors.red || '#D64545', fontWeight: '500' },

  emptyLogs: {
    padding:         hp(3),
    alignItems:      'center',
    backgroundColor: '#fff',
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     '#ebebeb',
  },
  emptyText: { fontSize: hp(1.6), color: '#999', textAlign: 'center' },

  logEntry: {
    borderRadius: 10,
    padding:      wp(3),
    marginBottom: hp(1),
    borderWidth:  1,
  },
  logSuccess: { backgroundColor: '#f0faf5', borderColor: '#9FE1CB' },
  logError:   { backgroundColor: '#fff5f5', borderColor: '#F7C1C1' },

  logHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(0.5) },
  logMeta:       { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  logTime:       { fontSize: hp(1.4), color: '#999', fontFamily: monoFont },
  logType:       { fontSize: hp(1.5), fontWeight: '600' },
  logStatusCode: { fontSize: hp(1.4), color: '#888', fontFamily: monoFont },
  logExpand:     { fontSize: hp(1.4), color: '#aaa', marginTop: hp(0.5) },

  logDetail:     { backgroundColor: '#1a1a18', borderRadius: 8, padding: wp(2.5), marginTop: hp(1) },
  logDetailText: { fontSize: hp(1.4), color: '#c2e8d1', fontFamily: monoFont, lineHeight: hp(2) },
});

export default WebhookLogMonitor;
