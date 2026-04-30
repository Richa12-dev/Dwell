// DocumentPreviewScreen.jsx — Tenant-side standalone preview screen.
//
// FIX SUMMARY (April 2026):
//
// BUG — Signature shows as "?" broken image on tenant preview:
//
//   Root cause: FileReader is a BROWSER-ONLY API. It does not exist in
//   React Native. The original code did:
//
//     const blob = await response.blob();
//     const b64  = await new Promise((res, rej) => {
//       const r = new FileReader();   // ← undefined in React Native
//       r.onload  = () => res(r.result.split(',')[1]);
//       r.onerror = rej;
//       r.readAsDataURL(blob);        // ← never called / silently fails
//     });
//     setMergedHtml(buildSignedDocHtml(rawHtml, b64, ...));
//     //                                         ^^^
//     // b64 = undefined  → img src="data:image/png;base64,undefined"
//     // → browser renders "?" broken image placeholder
//
//   FIX: Skip blob → base64 entirely.
//   Instead, presign the PNG URL and use it directly as img src="" in the
//   merged HTML. WebView fetches the image natively over HTTPS — no base64
//   needed. Presigned S3 URLs are publicly accessible for their TTL (~60 min).
//
//   Local AsyncStorage fallback (sig_<docId>) still uses sigBase64 stored
//   during signing — that path is fine because the base64 was captured from
//   the SignatureCanvas result (a data URI string), NOT from FileReader.
//
// Signed doc priority (unchanged):
//   1. AsyncStorage sig_url_<docId> → presign → use URL directly as img src ✅
//   2. docParam.file_url            → same presign path
//   3. AsyncStorage sig_<docId>     → sigBase64 local rebuild (offline fallback) ✅
//   4. Raw template HTML            → show unsigned with banner (last resort)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'native-base';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Toast from 'react-native-simple-toast';
import { Colors } from '../../Theme';
import Container from '../../components/Container/Container';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { buildSignedDocHtml } from '../../commonFunction/buildSignedDocHtml';
import { fetchDocumentPresignedUrl } from '../../commonFunction/useSignedDocumentUrl';

/* ─────────────────────────────────────────────
   HTML BUILDERS
───────────────────────────────────────────── */
const buildUnsignedHtml = (rawHtml) => `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',serif;font-size:14px;
         line-height:1.7;color:#111;background:#fff;padding:24px}
    h1,h2,h3{margin:14px 0 6px}p{margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    td,th{border:1px solid #ddd;padding:8px;font-size:13px}
  </style>
</head><body>${rawHtml}</body></html>`;

/**
 * FIX: Build signed HTML with presigned URL as img src (no base64 needed).
 *
 * Used when we have a presigned S3 URL for the signature PNG.
 * WebView loads the image natively — no FileReader, no blob, no base64.
 */
const buildSignedDocHtmlWithUrl = (
  docHtml    = '',
  sigUrl     = '',
  signerName = 'Tenant',
  signedAt   = null,
) => {
  const dateStr = signedAt
    ? new Date(signedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Times New Roman',serif; font-size:14px; line-height:1.7; color:#111; background:#fff; padding:32px; }
    h1,h2,h3 { margin:14px 0 6px; }
    p { margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; margin-bottom:12px; }
    td,th { border:1px solid #ddd; padding:8px; font-size:13px; }
    .sig-block { margin-top:48px; padding-top:24px; border-top:2px solid #e0e0e0; page-break-inside:avoid; }
    .sig-row { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
    .sig-label { font-size:13px; color:#555; min-width:90px; }
    .sig-value { font-size:13px; color:#111; font-weight:bold; }
    .sig-img { display:block; max-width:280px; max-height:110px; margin:12px 0 8px; border:1px solid #eee; border-radius:6px; background:#fafafa; }
    .sig-footer { font-size:11px; color:#888; margin-top:4px; }
    .sig-stamp { display:inline-block; margin-top:10px; padding:4px 12px; background:#E8F5E9; border:1px solid #A5D6A7; border-radius:20px; font-size:12px; color:#2E7D32; font-weight:bold; }
  </style>
</head><body>
  ${docHtml || '<p>Document content not available.</p>'}
  <div class="sig-block">
    <div class="sig-row"><span class="sig-label">Signed by:</span><span class="sig-value">${signerName}</span></div>
    <div class="sig-row"><span class="sig-label">Date:</span><span class="sig-value">${dateStr}</span></div>
    <img class="sig-img" src="${sigUrl}" alt="Signature of ${signerName}" onerror="this.style.border='2px dashed #f00';this.alt='Signature image failed to load'"/>
    <p class="sig-footer">This document has been electronically signed and is legally binding.</p>
    <span class="sig-stamp">✓ Electronically Signed</span>
  </div>
</body></html>`;
};

const buildSignedBannerHtml = (rawHtml, signedAt) => {
  const dateStr = signedAt
    ? new Date(signedAt).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })
    : '';
  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',serif;font-size:14px;
         line-height:1.7;color:#111;background:#fff;padding-top:52px}
    .banner{position:fixed;top:0;left:0;right:0;z-index:99;
      background:#E8F5E9;border-bottom:2px solid #A5D6A7;
      padding:10px 16px;display:flex;align-items:center;gap:10px}
    .check{font-size:17px}.label{color:#1B5E20;font-weight:bold;font-size:13px;flex:1}
    .date{color:#2E7D32;font-size:11px}
    .body{padding:24px}
    h1,h2,h3{margin:14px 0 6px}p{margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    td,th{border:1px solid #ddd;padding:8px;font-size:13px}
  </style>
</head><body>
  <div class="banner">
    <span class="check">✓</span>
    <span class="label">Electronically Signed</span>
    ${dateStr ? `<span class="date">Signed ${dateStr}</span>` : ''}
  </div>
  <div class="body">${rawHtml}</div>
</body></html>`;
};

/* ─────────────────────────────────────────────
   SCREEN
───────────────────────────────────────────── */
const DocumentPreviewScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();

  const { document: docParam } = route.params || {};

  // ── Auth token ───────────────────────────────
  const token = useSelector((state) =>
    state?.auth?.token      ||
    state?.login?.token     ||
    state?.loginData?.token ||
    state?.user?.token      ||
    null
  );

  // ── Derived values ───────────────────────────
  const rawHtml   = docParam?.html;
  const pdfBase64 = docParam?.pdf_base64;
  const isSigned  = docParam?.status === 'signed';
  const canSign   = docParam?.can_sign;
  const docName   = docParam?.filename || docParam?.name || 'Document';
  const signedAt  = docParam?.signed_at || null;

  const docId = docParam?.document_id || docParam?.id || null;

  // ── Resolve the signature PNG URL ───────────
  const [sigPngUrl,  setSigPngUrl]  = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    if (!isSigned || !docId) return;
    setUrlLoading(true);
    AsyncStorage.getItem(`sig_url_${docId}`)
      .then((stored) => {
        const url = stored || docParam?.file_url || docParam?.fileUrl || docParam?.download_url || null;
        setSigPngUrl(url);
      })
      .catch((e) => console.warn('⚠️ AsyncStorage read failed:', e.message))
      .finally(() => setUrlLoading(false));
  }, [isSigned, docId]);

  // ── Build merged HTML ────────────────────────
  // FIX: No longer uses FileReader (browser-only).
  //
  // Path A — S3 PNG exists (sigPngUrl is set):
  //   presign the URL → use presigned URL directly as img src in HTML.
  //   WebView loads it natively. No blob, no FileReader, no base64.
  //
  // Path B — No S3 URL (offline / upload failed):
  //   Use sigBase64 stored in AsyncStorage during signing.
  //   This base64 came from SignatureCanvas.readSignature() (a data URI string),
  //   so it is always valid — no FileReader involved.
  const [mergedHtml, setMergedHtml] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);

  useEffect(() => {
    if (!isSigned || !rawHtml) return;

    let cancelled = false;
    setSigLoading(true);
    setMergedHtml(null);

    const buildMerged = async () => {
      try {
        // ── Path A: S3 PNG URL → presign → use as img src ────────────
        // FIX: removed blob → FileReader → base64. Use presigned URL directly.
        if (sigPngUrl && token) {
          const presigned = await fetchDocumentPresignedUrl(sigPngUrl, token);
          if (presigned && !cancelled) {
            // Get signerName from AsyncStorage if available
            let signerName = 'Tenant';
            try {
              const json = docId ? await AsyncStorage.getItem(`sig_${docId}`) : null;
              if (json) {
                const parsed = JSON.parse(json);
                signerName = parsed.signerName || signerName;
              }
            } catch (_) {}

            setMergedHtml(buildSignedDocHtmlWithUrl(rawHtml, presigned, signerName, signedAt));
            return;
          }
        }

        // ── Path B: Local sigBase64 from AsyncStorage (offline fallback) ──
        // sigBase64 here is the raw base64 from SignatureCanvas — always valid.
        const json = docId ? await AsyncStorage.getItem(`sig_${docId}`) : null;
        if (json && !cancelled) {
          const { sigBase64, signerName: sName, signedAt: sAt } = JSON.parse(json);
          // buildSignedDocHtml uses inline data:image/png;base64,<sigBase64>
          // This is a local value captured at signing time — FileReader not involved.
          const { buildSignedDocHtml: _buildSignedDocHtml } = require('../../commonFunction/buildSignedDocHtml');
          setMergedHtml(_buildSignedDocHtml(rawHtml, sigBase64, sName, sAt || signedAt));
          return;
        }

        // ── Path C: No signature data at all — show banner only ───────
        if (!cancelled) {
          console.warn('[Preview] No signature data found — showing signed banner without image');
          setMergedHtml(buildSignedBannerHtml(rawHtml, signedAt));
        }
      } catch (err) {
        if (!cancelled) console.warn('⚠️ [Preview] Build merged failed:', err.message);
      } finally {
        if (!cancelled) setSigLoading(false);
      }
    };

    if (!urlLoading) buildMerged();
    return () => { cancelled = true; };
  }, [isSigned, rawHtml, sigPngUrl, token, docId, signedAt, urlLoading]);

  // ── WebView state ────────────────────────────
  const [webLoading, setWebLoading] = useState(true);
  const hasFinishedRef = useRef(false);

  const docKey = `${docParam?._key || docId || 'preview'}-${!!mergedHtml}`;
  const isContentLoading = urlLoading || sigLoading;

  // ── Build final WebView source ───────────────
  const finalSource = (() => {
    if (isSigned && mergedHtml) return { html: mergedHtml };  // ← signed with real signature
    if (rawHtml)                return { html: buildUnsignedHtml(rawHtml) };
    if (pdfBase64 && Platform.OS === 'android') {
      return { uri: `data:application/pdf;base64,${pdfBase64}` };
    }
    if (pdfBase64 && Platform.OS === 'ios') {
      return {
        html: `<html><body style="display:flex;align-items:center;justify-content:center;
               min-height:100vh;font-family:sans-serif;color:#555;text-align:center;padding:24px">
               PDF preview not available on iOS.<br/>
               Tap <strong>Sign This Document</strong> below.</body></html>`,
      };
    }
    return null;
  })();

  const handleLoadEnd = useCallback(() => {
    if (!hasFinishedRef.current) { hasFinishedRef.current = true; setWebLoading(false); }
  }, []);

  const handleWebViewError = useCallback((e) => {
    const { code } = e.nativeEvent;
    console.warn('WebView error:', e.nativeEvent);
    hasFinishedRef.current = true;
    setWebLoading(false);
    if (code !== -1003) Toast.show('Could not display document');
  }, []);

  const handleSign = useCallback(() => {
    navigation.navigate('SignDocumentScreen', { document: docParam });
  }, [navigation, docParam]);

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <Container scroll={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{docName}</Text>
        {isSigned ? (
          <View style={styles.signedBadge}>
            <Text style={styles.signedBadgeText}>✓ Signed</Text>
          </View>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isContentLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.red} />
            <Text style={styles.overlayText}>Loading signed document…</Text>
          </View>
        )}

        {!isContentLoading && !finalSource && (
          <View style={styles.noContent}>
            <Text style={styles.noContentText}>No preview available.</Text>
          </View>
        )}

        {!isContentLoading && finalSource && (
          <>
            {webLoading && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={Colors.red} />
                <Text style={styles.overlayText}>Loading document…</Text>
              </View>
            )}
            <WebView
              key={docKey}
              source={finalSource}
              style={[styles.webview, webLoading && { opacity: 0 }]}
              onLoadEnd={handleLoadEnd}
              onError={handleWebViewError}
              originWhitelist={['*']}
              // FIX: javaScriptEnabled=true required so WebView can load
              // external image URLs (presigned S3 URLs) inside HTML content.
              javaScriptEnabled={true}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              androidLayerType="hardware"
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
            />
          </>
        )}
      </View>

      {/* Sign CTA */}
      {canSign && !isContentLoading && (
        <TouchableOpacity style={styles.signBtn} onPress={handleSign} activeOpacity={0.85}>
          <Text style={styles.signBtnText}>✍  Sign This Document</Text>
        </TouchableOpacity>
      )}
    </Container>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:wp(4), paddingTop:hp(2), paddingBottom:hp(1.5),
    borderBottomWidth:1, borderBottomColor:'#F0F0F0', backgroundColor:'#fff',
  },
  backBtn:          { paddingVertical:hp(0.5) },
  title:            { flex:1, fontSize:hp(1.9), fontWeight:'700', color:'#1a1a1a', textAlign:'center', marginHorizontal:wp(2) },
  signedBadge:      { backgroundColor:'#E8F5E9', borderRadius:20, paddingHorizontal:wp(2.5), paddingVertical:hp(0.4), borderWidth:1, borderColor:'#A5D6A7' },
  signedBadgeText:  { fontSize:hp(1.2), color:'#2E7D32', fontWeight:'700' },
  content:          { flex:1, backgroundColor:'#fff' },
  overlay:          { ...StyleSheet.absoluteFillObject, zIndex:10, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },
  overlayText:      { marginTop:hp(1.5), fontSize:hp(1.6), color:Colors.textGray },
  webview:          { flex:1 },
  noContent:        { flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:wp(6) },
  noContentText:    { fontSize:hp(1.8), color:Colors.textGray, textAlign:'center' },
  signBtn:          { backgroundColor:Colors.red, margin:wp(4), borderRadius:14, paddingVertical:hp(2), alignItems:'center', shadowColor:Colors.red, shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:8, elevation:6 },
  signBtnText:      { color:'#fff', fontSize:hp(2), fontWeight:'700' },
});

export default DocumentPreviewScreen;
