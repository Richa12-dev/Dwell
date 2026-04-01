/**
 * WebhookLogMonitor.jsx
 *
 * Admin component to confirm that Twilio SMS webhook hits are reaching
 * your backend at:
 *   POST https://jc80c1t1oh.execute-api.us-east-1.amazonaws.com/prod/channels/twilio/sms/webhook
 *
 * Usage: Mount this in your admin/debug screen.
 * It polls your /health endpoint and lets you manually trigger a test ping
 * to the webhook endpoint to verify connectivity.
 *
 * When Rashaun texts (888) 988-9792:
 *   Twilio → POST /channels/twilio/sms/webhook → your AI → Twilio reply
 *
 * This screen shows you:
 *   1. Backend health status (subsystems live/down)
 *   2. A manual webhook ping button (simulate a fake inbound SMS)
 *   3. An in-app log of all test pings with timestamps and response shapes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://jc80c1t1oh.execute-api.us-east-1.amazonaws.com/prod';
const HEALTH_URL   = `${BASE_URL}/health`;
const WEBHOOK_URL  = `${BASE_URL}/channels/twilio/sms/webhook`;
const POLL_INTERVAL_MS = 30000; // poll health every 30s

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const shortId   = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Builds a fake Twilio-style SMS webhook payload
const buildFakeTwilioPayload = (fromNumber = '+19175550001') => {
  const params = new URLSearchParams({
    MessageSid:     `SM${shortId()}${shortId()}`,
    AccountSid:     'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    From:           fromNumber,
    To:             '+18889889792',
    Body:           'Test SMS from admin panel — is the webhook live?',
    NumMedia:       '0',
    SmsStatus:      'received',
    ApiVersion:     '2010-04-01',
  });
  return params.toString();
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    healthy:     { bg: '#e6f9f0', text: '#0f6e56', label: 'Healthy' },
    unhealthy:   { bg: '#fff0f0', text: '#991f1f', label: 'Unhealthy' },
    checking:    { bg: '#fff8e6', text: '#7a4f00', label: 'Checking…' },
    unknown:     { bg: '#f5f5f5', text: '#555',    label: 'Unknown' },
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
const WebhookLogMonitor = () => {
  const [healthStatus, setHealthStatus]     = useState('unknown');
  const [subsystems, setSubsystems]         = useState({});
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastHealthTime, setLastHealthTime] = useState(null);

  const [pinging, setPinging]     = useState(false);
  const [logs, setLogs]           = useState([]);

  const pollRef = useRef(null);

  // ── Health check ─────────────────────────────────────────────────────────
  const checkHealth = useCallback(async (silent = false) => {
    if (!silent) setHealthChecking(true);
    try {
      const res  = await fetch(HEALTH_URL, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      const ok   = data?.ok === true && data?.data?.status === 'ok';

      setHealthStatus(ok ? 'healthy' : 'unhealthy');
      setSubsystems(data?.data?.subsystems || {});
      setLastHealthTime(timestamp());

      if (!silent) {
        addLog({
          label:  'Health check',
          ok,
          status: res.status,
          data:   data?.data || data,
        });
      }
    } catch (err) {
      setHealthStatus('unhealthy');
      if (!silent) {
        addLog({ label: 'Health check', ok: false, error: err.message, data: { error: err.message } });
      }
    } finally {
      if (!silent) setHealthChecking(false);
    }
  }, []);

  // ── Webhook ping ──────────────────────────────────────────────────────────
  const pingWebhook = useCallback(async () => {
    setPinging(true);
    const payload = buildFakeTwilioPayload();

    try {
      const res  = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/xml, */*',
        },
        body: payload,
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();

      if (contentType.includes('json')) {
        try { data = JSON.parse(raw); } catch { data = { raw }; }
      } else {
        // Twilio webhooks often return TwiML XML — just show the raw text
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
  }, []);

  const addLog = (entry) => {
    setLogs(prev => [{ id: Date.now(), time: timestamp(), ...entry }, ...prev].slice(0, 50));
  };

  const clearLogs = () => {
    Alert.alert('Clear logs', 'Remove all log entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setLogs([]) },
    ]);
  };

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    checkHealth(true); // silent initial check
    pollRef.current = setInterval(() => checkHealth(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [checkHealth]);

  // ── Render ────────────────────────────────────────────────────────────────
  const subsystemEntries = Object.entries(subsystems);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <Text style={styles.title}>SMS Webhook Monitor</Text>
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
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f6' },
  content:   { padding: 16, paddingBottom: 40 },

  title:    { fontSize: 20, fontWeight: '700', color: '#1a1a18', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  url:      { fontFamily: 'monospace', color: '#533AB7', fontSize: 11 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  cardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle:    { fontSize: 15, fontWeight: '600', color: '#1a1a18' },
  cardSubtitle: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 12, lineHeight: 18 },
  lastChecked:  { fontSize: 12, color: '#999', marginBottom: 10 },

  subsystemGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  subsystemItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 4 },
  subsystemDot:  { fontSize: 10, marginRight: 6 },
  subsystemName: { fontSize: 12, color: '#555', textTransform: 'capitalize' },

  badge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeDot:  { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  primaryButton: {
    backgroundColor: '#D64545',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  buttonDisabled:    { opacity: 0.5 },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { color: '#444', fontWeight: '500', fontSize: 14 },

  noticeCard: {
    backgroundColor: '#FAEEDA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EF9F27',
  },
  noticeTitle: { fontSize: 13, fontWeight: '600', color: '#633806', marginBottom: 6 },
  noticeText:  { fontSize: 12, color: '#7a4f00', lineHeight: 18 },

  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  clearText: { fontSize: 13, color: '#D64545', fontWeight: '500' },

  emptyLogs: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },

  logEntry: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  logSuccess: { backgroundColor: '#f0faf5', borderColor: '#9FE1CB' },
  logError:   { backgroundColor: '#fff5f5', borderColor: '#F7C1C1' },

  logHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logMeta:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logTime:       { fontSize: 11, color: '#999', fontFamily: 'monospace' },
  logType:       { fontSize: 12, fontWeight: '600' },
  logStatusCode: { fontSize: 11, color: '#888', fontFamily: 'monospace' },
  logExpand:     { fontSize: 11, color: '#aaa', marginTop: 4 },

  logDetail:     { backgroundColor: '#1a1a18', borderRadius: 8, padding: 10, marginTop: 8 },
  logDetailText: { fontSize: 11, color: '#c2e8d1', fontFamily: 'monospace', lineHeight: 16 },
});

export default WebhookLogMonitor;
