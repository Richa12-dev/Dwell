
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import WebView from 'react-native-webview';
import Toast from 'react-native-simple-toast';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import {
  scrapeViaFetch,
  detectSite,
  extractNextData,
  extractJsonLD,
  parseZillow,     // export these from your parser util
  parseRealtor,
  parseGeneric,
  mapAmenities,
  normalizeType,
} from '../../utils/propertyUrlParser';
import { useWebViewScraper } from '../../hooks/useWebViewScraper';

const PropertyUrlImporter = ({ onImportSuccess }) => {
  const [url,       setUrl]       = useState('');
  const [importing, setImporting] = useState(false);
  const [method,    setMethod]    = useState(''); // 'fetch' | 'webview'

  const {
    webViewRef, scrapeUrl, scraping,
    scrape, onLoadEnd, onMessage: webViewMessage,
  } = useWebViewScraper();

  // ── Process raw WebView data into form-ready object ──────────
  const processWebViewData = useCallback((raw) => {
    const site = detectSite(raw.url || url);
    let result = null;

    // Try __NEXT_DATA__
    if (raw.nextData) {
      try {
        const nextData = JSON.parse(raw.nextData);
        if (site === 'zillow')  result = parseZillow(nextData);
        if (site === 'realtor') result = parseRealtor(nextData);
      } catch {}
    }

    // Try JSON-LD scripts
    if (!result?.name && raw.jsonLdScripts?.length) {
      for (const script of raw.jsonLdScripts) {
        try {
          const json  = JSON.parse(script);
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            const validTypes = ['RealEstateListing','Residence','Apartment','House'];
            if (validTypes.includes(item['@type'])) {
              const addr = item.address || {};
              result = {
                name:          item.name || raw.ogTitle || '',
                description:   item.description || raw.ogDescription || '',
                street:        addr.streetAddress   || '',
                city:          addr.addressLocality || '',
                state:         addr.addressRegion   || '',
                zip_code:      addr.postalCode      || '',
                property_type: normalizeType(item['@type']),
                bedrooms:      String(item.numberOfRooms || ''),
                bathrooms:     '',
                area_sqft:     String(item.floorSize?.value || ''),
                year_built:    '',
                monthly_rent:  String(item.offers?.price || item.price || ''),
                images:        raw.images || (raw.ogImage ? [raw.ogImage] : []),
                amenities:     mapAmenities(
                  (item.amenityFeature || []).map(a => a.name || '')
                ),
              };
              break;
            }
          }
        } catch {}
        if (result?.name) break;
      }
    }

    // Final fallback: og tags
    if (!result?.name) {
      result = {
        name:        raw.ogTitle || raw.title || '',
        description: raw.ogDescription || '',
        street: '', city: '', state: '', zip_code: '',
        property_type: 'Apartment',
        bedrooms: '', bathrooms: '', area_sqft: '',
        year_built: '', monthly_rent: '',
        images:    raw.images || (raw.ogImage ? [raw.ogImage] : []),
        amenities: {},
      };
    }

    return result;
  }, [url]);

  // ── Handle WebView message ────────────────────────────────────
  const handleWebViewMessage = useCallback((event) => {
    webViewMessage(event);
    try {
      const raw    = JSON.parse(event.nativeEvent.data);
      const result = processWebViewData(raw);
      finishImport(result);
    } catch (e) {
      setImporting(false);
      Toast.show('Could not parse property data from this URL');
    }
  }, [processWebViewData, webViewMessage]);

  // ── Finish import — call parent callback ──────────────────────
  const finishImport = useCallback((result) => {
    setImporting(false);
    setMethod('');
    if (!result || !result.name) {
      Toast.show('⚠️ Imported but some fields may be empty. Please verify.');
    } else {
      Toast.show('✅ Property details imported successfully!');
    }
    onImportSuccess(result);
    setUrl('');
  }, [onImportSuccess]);

  // ── Main import handler ───────────────────────────────────────
  const handleImport = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed)                       { Toast.show('Paste a property URL first'); return; }
    if (!trimmed.startsWith('http'))    { Toast.show('URL must start with http'); return; }

    setImporting(true);

    // ── Method 1: Direct fetch (fast) ────────────────────────
    try {
      setMethod('fetch');
      const result = await scrapeViaFetch(trimmed);
      if (result?.name || result?.street) {
        finishImport(result);
        return; // ✅ success
      }
    } catch (e) {
      console.log('Direct fetch failed:', e.message);
    }

    // ── Method 2: Hidden WebView (reliable fallback) ──────────
    setMethod('webview');
    try {
      const raw    = await scrape(trimmed);
      const result = processWebViewData(raw);
      finishImport(result);
    } catch (e) {
      setImporting(false);
      setMethod('');
      Toast.show('Could not import. Try copying more details manually.');
    }
  }, [url, scrape, processWebViewData, finishImport]);

  return (
    <>
      <View style={styles.wrapper}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>🔗 Import from Listing URL</Text>
          {importing && (
            <View style={styles.statusBadge}>
              <ActivityIndicator size={10} color={Colors.red} />
              <Text style={styles.statusText}>
                {method === 'fetch' ? 'Fetching...' : 'Loading page...'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle}>
          Paste a Zillow, Apartments.com or Realtor.com URL to auto-fill
        </Text>

        {/* Input + Button */}
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            placeholder="https://www.zillow.com/..."
            value={url}
            onChangeText={setUrl}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor={Colors.red}
            autoCapitalize="none"
            keyboardType="url"
            editable={!importing}
            right={
              url.length > 0 && !importing
                ? <TextInput.Icon icon="close-circle" onPress={() => setUrl('')} />
                : null
            }
          />
          <TouchableOpacity
            style={[styles.btn, importing && styles.btnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={styles.btnText}>Import</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Supported sites */}
        <View style={styles.tagsRow}>
          {['Zillow', 'Apartments.com', 'Realtor.com', 'Trulia'].map(s => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Hidden WebView (0x0, invisible) ─────────────────────── */}
      {scrapeUrl ? (
        <WebView
          ref={webViewRef}
          source={{ uri: scrapeUrl }}
          style={styles.hiddenWebView}
          onLoadEnd={onLoadEnd}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFF8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(229,57,53,0.2)',
    padding: wp(4),
    marginBottom: hp(2),
  },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:       { fontSize: wp(3.8), fontFamily: getFontFamily('bold'), color: Colors.black },
  subtitle:    { fontSize: wp(3), color: '#666', marginTop: hp(0.5), marginBottom: hp(1.5) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0F0', borderRadius: 20, paddingHorizontal: wp(2), paddingVertical: 3 },
  statusText:  { fontSize: wp(2.8), color: Colors.red },
  row:         { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  input:       { flex: 1, backgroundColor: 'white', fontSize: wp(3), height: hp(6) },
  btn:         { backgroundColor: Colors.red, paddingHorizontal: wp(4), height: hp(6.5), borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: wp(20) },
  btnDisabled: { opacity: 0.65 },
  btnText:     { color: 'white', fontWeight: 'bold', fontSize: wp(3.5) },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: hp(1), gap: 6 },
  tag:         { backgroundColor: '#F0F0F0', borderRadius: 4, paddingHorizontal: wp(2), paddingVertical: 2 },
  tagText:     { fontSize: wp(2.6), color: '#555' },
  hiddenWebView: { width: 0, height: 0, opacity: 0, position: 'absolute' },
});

export default PropertyUrlImporter;
