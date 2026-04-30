// RentDocuments.jsx
// ✅ Fetches ALL templates (7) via GET /documents/getalldocument (no type param)
// ✅ Fetches stored/signed docs via GET /documents
// ✅ Merges: if a stored doc with same type is "signed" → template card shows Signed
// ✅ Each template card: title · type · Preview · Sign
// ✅ Preview → in-app HTML WebView modal
// ✅ Sign → navigate to SignDocumentScreen (create + sign flow)
// ✅ useFocusEffect refreshes after signing
// ✅ Stats bar: N Total · N Signed · N Pending

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { HStack, Text, VStack } from "native-base";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  getAllDocumentTemplates,
  getDocuments,
    getDocumentDownloadUrl,
} from "../../Redux/Documents/documentsServicesNode";
import { documentsSelectors } from "../../Redux/Documents/documentsSlice";
import { tenantsSelectors } from "../../Redux/Tenants/tenantsSlice";
import { getLandlordContact, getMyProperties } from "../../Redux/Tenants/services";
import RentDocumentCard from "../../components/RentDocumentCard/RentDocumentCard";

/* ──────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────── */
const DOC_TYPE_LABELS = {
  lease_agreement:    "Lease Agreement",
  lease_renewal:      "Lease Renewal",
  lease_addendum:     "Lease Addendum",
  move_in_checklist:  "Move-In Checklist",
  move_out_checklist: "Move-Out Checklist",
  tenant_verification:"Tenant Verification",
  rent_receipt:       "Rent Receipt",
  notice:             "Notice",
  inspection_report:  "Inspection Report",
  maintenance_report: "Maintenance Report",
  tenant_document:    "Tenant Document",
  signed_document:    "Signed Document",
  contract:           "Contract",
  other:              "Other",
};

// Icon emoji per doc type
const TYPE_ICONS = {
  lease_agreement:    "📋",
  lease_renewal:      "🔄",
  lease_addendum:     "📎",
  move_in_checklist:  "🏠",
  move_out_checklist: "🚪",
  tenant_verification:"✅",
  rent_receipt:       "🧾",
};

/* ──────────────────────────────────────────────────────────
   NORMALIZE — thunk output → card-ready object
   After the thunk fix, result is always an array of flat objects:
     [{ type, document_type, html, pdf, pdf_base64, status, ... }]
   We also handle the legacy case where the thunk returns:
     [{ "lease_agreement": { html, pdf }, ... }]   ← old Shape C fallback
────────────────────────────────────────────────────────── */
const buildTemplateList = (raw) => {
  if (!raw || !raw.length) return [];

  const KNOWN_TYPES = Object.keys(DOC_TYPE_LABELS);
  const result = [];

  raw.forEach((item) => {
    // Already flat (after thunk fix) — item has `type` field
    if (item.type && KNOWN_TYPES.includes(item.type)) {
      result.push(item);
      return;
    }

    // Legacy: item is itself a keyed object (old thunk fallback [data])
    const keys = Object.keys(item);
    const isKeyed = keys.some((k) => KNOWN_TYPES.includes(k));
    if (isKeyed) {
      keys.forEach((docType) => {
        const content = item[docType];
        if (content && typeof content === "object") {
          result.push({
            type:          docType,
            document_type: docType,
            html:          content.html        || null,
            pdf:           content.pdf         || null,
            pdf_base64:    content.pdf         || null,
            status:        content.status      || "unsigned",
            id:            content.id          || null,
          });
        }
      });
      return;
    }

    // Unknown shape — include with fallback type
    result.push({ ...item, type: item.type || "other" });
  });

  return result;
};

const normalizeTemplate = (flat, signedStoredDocTypes, signedDocByType = {}, signedDocByName = {}) => {
  const docType      = flat.type || flat.document_type || "other";
  const label        = DOC_TYPE_LABELS[docType] || docType.replace(/_/g, " ");
  const rawId        = flat.id || flat.documentId || flat.document_id || null;
  const templateName = (flat.name || flat.filename || flat.title || label).toLowerCase().trim();


  const isMergedSigned = signedStoredDocTypes.has(docType) || !!signedDocByName[templateName];
  
  const status = isMergedSigned
    ? "signed"
    : (flat.status || "unsigned").toLowerCase();

  // For signed docs: get the actual stored doc's URL for Preview
  const signedDoc      = isMergedSigned
    ? (signedDocByType[docType] || signedDocByName[templateName] || null)
    : null;
  const isRealUrl      = (u) => typeof u === "string" && u.startsWith("http");
const signedFileUrl = isRealUrl(signedDoc?.fileUrl)    ? signedDoc.fileUrl
                    : isRealUrl(signedDoc?.file_url)   ? signedDoc.file_url
                    : isRealUrl(signedDoc?.signedUrl)  ? signedDoc.signedUrl
                    : isRealUrl(signedDoc?.signed_url) ? signedDoc.signed_url
                    : null;

  return {
    _key:          `tpl_${docType}`,
    document_id:   signedDoc?.id || signedDoc?.document_id || rawId,
    template_type: docType,
    document_type: docType,
    filename:      flat.name || flat.filename || flat.title || label,
// ✅ CORRECT — null for signed so preview knows to load from S3
html:       flat.html || flat.htmlContent || null,
pdf_base64: flat.pdf_base64 || flat.pdf || null,
    file_url:      signedFileUrl  || flat.fileUrl    || flat.file_url || null,
    download_url:  signedFileUrl  || flat.signedUrl  || flat.fileUrl  || flat.file_url || null,
    status,
    created_at:    flat.createdAt  || flat.created_at || null,
    signed_at:     signedDoc?.signedAt || signedDoc?.signed_at || flat.signedAt || null,
    description:   flat.description || null,
    is_template:   true,
    can_sign:      status !== "signed",
    icon:          TYPE_ICONS[docType] || "📄",
  };
};

/* ──────────────────────────────────────────────────────────
   PREVIEW MODAL — renders document HTML in a WebView
   
   FIX: The old code used onShow={() => setLoading(true)} which fires
   AFTER the modal slide animation completes — by that time the WebView
   had already loaded the inline HTML and called onLoadEnd, so the spinner
   reappeared and stayed forever.

   Fix: useEffect keyed on doc._key so loading resets only when the
   document actually changes, not on animation events. WebView also
   gets a matching key so it fully remounts per document.
────────────────────────────────────────────────────────── */
const PreviewModal = ({ visible, document: doc, onClose, onSign }) => {
 
  const [loading, setLoading] = useState(false);
  const hasFinishedRef = useRef(false);

  const docKey = doc?._key || doc?.document_type || "preview";

  // Reset ONLY when the selected document actually changes
  useEffect(() => {
    if (visible && doc) {
      hasFinishedRef.current = false;   // mark as not-yet-loaded
      setLoading(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  // Also reset when modal becomes visible with the same doc
  useEffect(() => {
    if (visible && doc && !hasFinishedRef.current) {
      setLoading(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const html      = doc?.html;
  const pdfBase64 = doc?.pdf_base64;
  const pdfUrl    = doc?.download_url || doc?.file_url;
  const isSigned  = doc?.status === "signed";
  const canSign   = doc?.can_sign;

  // Wrap raw HTML with viewport + base styles so it renders correctly
  const pageHtml = html
    ? `<!DOCTYPE html><html><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', serif; font-size: 14px;
                 line-height: 1.6; color: #111; background: #fff; }
          .page { padding: 24px; }
          h3 { margin-top: 14px; margin-bottom: 6px; }
          p  { margin-bottom: 8px; }
        </style></head>
        <body>${html}</body></html>`
    : null;

const source = pageHtml
  ? { html: pageHtml }
  : (pdfBase64 && Platform.OS === 'android')
    ? { uri: `data:application/pdf;base64,${pdfBase64}` }
  : pdfUrl
    ? { uri: pdfUrl }
  : null;
  
  const iosPdfHtml = (!source && pdfBase64 && Platform.OS === 'ios')
  ? `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <style>* { margin:0; padding:0; } body { background:#f5f5f5; }
      .msg { display:flex; align-items:center; justify-content:center;
             height:100vh; font-family:sans-serif; color:#555; font-size:16px; text-align:center; padding:24px; }
      </style></head>
      <body><div class="msg">PDF preview is not available on iOS.<br/>Tap <strong>Sign This Document</strong> below to proceed.</div>
      </body></html>`
  : null;

const finalSource = source || (iosPdfHtml ? { html: iosPdfHtml } : null);

  // Called by WebView when the main document finishes loading.
  // We guard with hasFinishedRef so repeated onLoadEnd calls (from
  // redirects or injected scripts) don't flicker the spinner.
  const handleLoadEnd = useCallback(() => {
    if (!hasFinishedRef.current) {
      hasFinishedRef.current = true;
      setLoading(false);
    }
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      // ❌ NO onShow — that fires after animation and re-shows the spinner
    >
      <View style={previewSt.container}>
        {/* Header */}
        <View style={previewSt.header}>
          <TouchableOpacity
            onPress={onClose}
            style={previewSt.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={previewSt.closeText}>✕  Close</Text>
          </TouchableOpacity>
          <Text style={previewSt.title} numberOfLines={1}>
            {doc?.filename || "Document"}
          </Text>
          {isSigned ? (
            <View style={previewSt.signedBadge}>
              <Text style={previewSt.signedBadgeText}>✓ Signed</Text>
            </View>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        {/* Content */}
        {!source ? (
          <View style={previewSt.noContent}>
            <Text style={previewSt.noContentText}>No preview available.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Overlay spinner — disappears permanently once onLoadEnd fires */}
            {loading && (
              <View style={previewSt.loader}>
                <ActivityIndicator size="large" color={Colors.red} />
                <Text style={previewSt.loaderText}>Loading document…</Text>
              </View>
            )}

          
{!finalSource ? (
  <View style={previewSt.noContent}>
    <Text style={previewSt.noContentText}>No preview available.</Text>
  </View>
) : (
  <View style={{ flex: 1 }}>
    {loading && (
      <View style={previewSt.loader}>
        <ActivityIndicator size="large" color={Colors.red} />
        <Text style={previewSt.loaderText}>Loading document…</Text>
      </View>
    )}
    <WebView
      key={docKey}
      source={finalSource}
      style={{ flex: 1, opacity: loading ? 0 : 1 }}
      onLoadEnd={handleLoadEnd}
      onError={(e) => {
        const { code } = e.nativeEvent;
        console.warn("WebView error:", e.nativeEvent);
        hasFinishedRef.current = true;
        setLoading(false);
        // -1003 on iOS = resource/scheme issue, not a real navigation failure
        // Don't block the UI — the fallback HTML already handles this
        if (code !== -1003) {
          Toast.show("Could not load document preview");
        }
      }}
      originWhitelist={["*"]}
      javaScriptEnabled={false}
      scrollEnabled
      showsVerticalScrollIndicator={false}
      androidLayerType="hardware"
      allowFileAccessFromFileURLs={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
    />
  </View>
)}
          </View>
        )}

        {/* Sign footer */}
        {canSign && (
          <TouchableOpacity
            style={previewSt.signBtn}
            onPress={() => { onClose(); onSign(doc); }}
            activeOpacity={0.85}
          >
            <Text style={previewSt.signBtnText}>✍  Sign This Document</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};


/* ──────────────────────────────────────────────────────────
   MAIN SCREEN
────────────────────────────────────────────────────────── */
const RentDocuments = () => {
  const dispatch   = useDispatch();
  const navigation = useNavigation();

  // Auth
  const loginData = useSelector((s) => s.loginData || {});
  const userData  = loginData?.userData || {};
  const tenantId  = userData?.id || userData?.tenant_id || userData?.userId || null;
  const landlordContact = useSelector(tenantsSelectors.getLandlordContact);
const landlordId      = landlordContact?.id || null;

// My properties → propertyId
const myProperties = useSelector(tenantsSelectors.getMyProperties);
const propertyId   = myProperties?.[0]?.propertyId
                  || myProperties?.[0]?.property?.id
                  || null;
console.log("🏠 propertyId from myProperties:", propertyId, "| count:", myProperties?.length);

  // Redux: stored docs (to check signed status)
  const { documents = [], loading: docsLoading, error: docsError } =
    useSelector(documentsSelectors.getDocumentsData);

  // Local state for templates (bypasses Redux templates complexity)
  const [rawTemplates, setRawTemplates] = useState([]);
  const [tplLoading,   setTplLoading]   = useState(false);
  const [tplError,     setTplError]     = useState(null);

  
  
  useEffect(() => {
  if (!landlordContact) dispatch(getLandlordContact());
  if (!myProperties?.length) dispatch(getMyProperties());
}, [dispatch]); // intentionally run once on mount


  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    // Stored docs (to check if any type is already signed)
    dispatch(getDocuments({}));

    // All 7 templates at once (no type param)
    setTplLoading(true);
    setTplError(null);
    try {
      const result = await dispatch(
        getAllDocumentTemplates({ tenantId: tenantId || undefined })
      ).unwrap();
      setRawTemplates(Array.isArray(result) ? result : []);
    } catch (e) {
      setTplError(e?.message || "Failed to load documents");
      setRawTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }, [dispatch, tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [fetchAll])
  );

 /* ── Build card data ── */
// Build map: docType → signed stored doc (for preview URL lookup)
// AFTER (fixed):
// Reverse map: stored type → all template types that collapse to it
const REVERSE_TYPE_MAP = {
  lease_addendum:  ["lease_addendum", "lease_renewal"],   // lease_renewal → lease_addendum
  tenant_document: ["tenant_document", "move_in_checklist", "move_out_checklist", "tenant_verification"],
  other:           ["other", "rent_receipt"],
};

const signedDocByType = {};
const signedDocByName = {};
(documents || [])
  .filter((d) => (d.status || "").toLowerCase() === "signed")
  .forEach((d) => {
    const storedType = d.type || d.document_type || d.documentType;
    const docName    = (d.name || d.filename || "").toLowerCase().trim();

    if (!storedType) return;

    if (storedType === "signed_document") {
      // signed_document records: index by name to match against templates
      if (docName && !signedDocByName[docName]) signedDocByName[docName] = d;
    } else {
      // all other types: existing logic unchanged
      if (!signedDocByType[storedType]) signedDocByType[storedType] = d;
      const aliases = REVERSE_TYPE_MAP[storedType] || [];
      aliases.forEach((alias) => {
        if (!signedDocByType[alias]) signedDocByType[alias] = d;
      });
    }
  });
const signedStoredDocTypes = new Set(Object.keys(signedDocByType));

const flatTemplates = buildTemplateList(rawTemplates);
const cards = flatTemplates.map((f) => normalizeTemplate(f, signedStoredDocTypes, signedDocByType, signedDocByName));

  // Stats
  const total   = cards.length;
  const signed  = cards.filter((c) => c.status === "signed").length;
  const pending = cards.filter((c) => c.status !== "signed").length;

  /* ── Handlers ── */
// AFTER:
// REPLACE handlePreview with this:
const handlePreview = useCallback((item) => {
  navigation.navigate('DocumentPreviewScreen', { document: item });
}, [navigation]);

  const handleSign = useCallback((doc) => {
    navigation.navigate("SignDocumentScreen", { document: doc, landlordId,  propertyId,});
  }, [navigation, landlordId, propertyId]);

  /* ── Header ── */
  const Header = () => (
    <View style={scrSt.headerRow}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        activeOpacity={0.7}
      >
        <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
      </TouchableOpacity>
      <VStack flex={1} ml={3}>
        <Text style={scrSt.title}>My Documents</Text>
        {total > 0 && (
          <Text style={scrSt.subtitle}>{total} agreement{total !== 1 ? "s" : ""} available</Text>
        )}
      </VStack>
      {(docsLoading || tplLoading) && cards.length > 0 && (
        <ActivityIndicator size="small" color={Colors.red} />
      )}
    </View>
  );

  /* ── Loading ── */
  const isFirstLoad = (tplLoading || docsLoading) && cards.length === 0;
  if (isFirstLoad) {
    return (
      <Container>
        <Header />
        <View style={scrSt.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text mt={3} color={Colors.textGray}>Loading your documents…</Text>
        </View>
      </Container>
    );
  }

  /* ── Error ── */
  const combinedErr = tplError || docsError;
  if (combinedErr && cards.length === 0) {
    return (
      <Container>
        <Header />
        <View style={scrSt.center}>
          <Text style={scrSt.emptyIcon}>⚠️</Text>
          <Text style={scrSt.errorText}>{combinedErr}</Text>
          <TouchableOpacity style={scrSt.retryBtn} onPress={fetchAll}>
            <Text style={{ color: Colors.red, fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  /* ── Empty ── */
  if (cards.length === 0) {
    return (
      <Container>
        <Header />
        <View style={scrSt.center}>
          <Text style={scrSt.emptyIcon}>📂</Text>
          <Text style={scrSt.emptyTitle}>No documents yet</Text>
          <Text style={scrSt.emptySubtitle}>
            Documents from your landlord will appear here
          </Text>
        </View>
      </Container>
    );
  }

  /* ── Main ── */
  return (
    <Container scroll={false}>
      <Header />

      {/* ─── Stats bar ─── */}
      <View style={scrSt.statsBar}>
        <View style={scrSt.statItem}>
          <Text style={scrSt.statNumber}>{total}</Text>
          <Text style={scrSt.statLabel}>Total</Text>
        </View>
        <View style={scrSt.statDivider} />
        <View style={scrSt.statItem}>
          <Text style={[scrSt.statNumber, { color: "#2E7D32" }]}>{signed}</Text>
          <Text style={scrSt.statLabel}>Signed</Text>
        </View>
        <View style={scrSt.statDivider} />
        <View style={scrSt.statItem}>
          <Text style={[scrSt.statNumber, { color: Colors.red }]}>{pending}</Text>
          <Text style={scrSt.statLabel}>Pending</Text>
        </View>
      </View>

      {/* ─── Document cards list ─── */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item._key}
        contentContainerStyle={scrSt.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: hp(1.4) }} />}
        renderItem={({ item }) => (
          <RentDocumentCard
            item={item}
            onPreview={handlePreview}
            onSign={handleSign}
          />
        )}
        ListFooterComponent={() => (
          <Text style={scrSt.footer}>
            Tap "Preview" to read a document · "Sign" to sign it
          </Text>
        )}
      />

     
    </Container>
  );
};

/* ──────────────────────────────────────────────────────────
   STYLES
────────────────────────────────────────────────────────── */
const scrSt = StyleSheet.create({
  headerRow: {
    flexDirection: "row", alignItems: "center",
    paddingTop: hp(2), paddingBottom: hp(1.5), paddingHorizontal: wp(5),
  },
  title:    { fontSize: hp(2.5), fontWeight: "bold", color: "#000" },
  subtitle: { fontSize: hp(1.5), color: Colors.textGray, marginTop: hp(0.2) },
  center:   { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: wp(6) },
  emptyIcon:{ fontSize: hp(6), textAlign: "center", marginBottom: hp(1.5) },
  emptyTitle:   { fontSize: hp(2.2), fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  emptySubtitle:{ fontSize: hp(1.6), color: Colors.textGray, textAlign: "center", marginTop: hp(0.8) },
  errorText:{ color: "#C62828", fontSize: hp(1.8), textAlign: "center", marginVertical: hp(1) },
  retryBtn: {
    marginTop: hp(1.5), paddingVertical: hp(1.4), paddingHorizontal: wp(10),
    borderRadius: 10, borderWidth: 1, borderColor: Colors.red,
  },
  statsBar: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: wp(3), marginBottom: hp(1.6),
    backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: hp(1.2),
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNumber:  { fontSize: hp(2.2), fontWeight: "800", color: "#1a1a1a" },
  statLabel:   { fontSize: hp(1.3), color: Colors.textGray, fontWeight: "500", marginTop: hp(0.2) },
  statDivider: { width: 1, height: hp(4), backgroundColor: "#F0F0F0" },
  listContent: { paddingHorizontal: wp(4), paddingBottom: hp(3) },
  footer: {
    textAlign: "center", fontSize: hp(1.4),
    color: Colors.textGray, marginTop: hp(1.5), marginBottom: hp(1),
  },
});


const previewSt = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(1.5),
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  closeBtn:    { paddingVertical: hp(0.5) },
  closeText:   { fontSize: hp(1.7), color: Colors.textGray, fontWeight: "500" },
  title: {
    flex: 1, fontSize: hp(1.9), fontWeight: "700",
    color: "#1a1a1a", textAlign: "center", marginHorizontal: wp(2),
  },
  signedBadge: {
    backgroundColor: "#E8F5E9", borderRadius: 20,
    paddingHorizontal: wp(2.5), paddingVertical: hp(0.4),
    borderWidth: 1, borderColor: "#A5D6A7",
  },
  signedBadgeText: { fontSize: hp(1.2), color: "#2E7D32", fontWeight: "700" },
  loader: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10, justifyContent: "center", alignItems: "center", backgroundColor: "#fff",
  },
  loaderText: { marginTop: hp(1.5), fontSize: hp(1.6), color: Colors.textGray },
  noContent:  { flex: 1, justifyContent: "center", alignItems: "center" },
  noContentText: { fontSize: hp(1.8), color: Colors.textGray, textAlign: "center" },
  signBtn: {
    backgroundColor: Colors.red, margin: wp(4), borderRadius: 14,
    paddingVertical: hp(2), alignItems: "center",
    shadowColor: Colors.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  signBtnText: { color: "#fff", fontSize: hp(2), fontWeight: "700" },
});

export default RentDocuments;
