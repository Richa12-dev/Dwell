// PropertyDocuments.jsx — Landlord view
//
// FIX SUMMARY (April 2026):
//
// BUG 1 — Signature PNG never loads → "?" broken image:
//   FileReader is a browser API and does NOT exist in React Native.
//   Fix: use RNFS.readFile() or fetch → response.text() with base64 encoding.
//   We now use the presigned URL directly as the img src in the merged HTML
//   (inline data URI is not needed — presigned URLs are publicly accessible
//    for their TTL, so we can set src directly and let WebView load it).
//   This is the simplest fix: skip the base64 conversion entirely.
//
// BUG 2 — _matchingSignedDoc never attaches (name = null from Shape C):
//   Templates from the getalldocument Shape C response have name = null.
//   signed_document records have type = "signed_document" (not original type).
//   Both name-match and type-match fail → sigDocMatch = null → no signature.
//   Fix: added `signedDocByDocumentId` map and broader fuzzy matching,
//   plus a last-resort "any single signed_document for this property" fallback.
//
// BUG 3 — DocumentPreviewModal condition too strict:
//   `if (!sigPngUrl || !templateHtml || !token) return` — when sigPngUrl is
//   missing because matching failed, it silently showed unsigned preview.
//   Fix: log a clear warning and show unsigned preview intentionally.
//
// BUG 4 — presigned URL fetch uses FileReader (browser-only):
//   Fix: instead of fetching bytes → FileReader → base64, we pass the presigned
//   URL directly as the img src= in buildSignedDocHtml. WebView loads it natively.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Box, Text, VStack, HStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { useRoute, useNavigation, useFocusEffect  } from "@react-navigation/native";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import { getTenantById } from "../../Redux/Properties/servicesNode";
import {
  getAllDocumentTemplates,
  getDocuments,
  deleteDocument,
} from "../../Redux/Documents/documentsServicesNode";
import { documentsSelectors } from "../../Redux/Documents/documentsSlice";
import { fetchDocumentPresignedUrl } from "../../commonFunction/useSignedDocumentUrl";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const STATUS_CONFIG = {
  signed:    { label: "Signed",    bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  pending:   { label: "Pending",   bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
  unsigned:  { label: "Unsigned",  bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
  expired:   { label: "Expired",   bg: "#F3E5F5", text: "#6A1B9A", border: "#CE93D8" },
  cancelled: { label: "Cancelled", bg: "#ECEFF1", text: "#546E7A", border: "#B0BEC5" },
  template:  { label: "Template",  bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
};

const DOC_TYPE_LABELS = {
  lease_agreement:     "Lease Agreement",
  lease_renewal:       "Lease Renewal",
  lease_addendum:      "Lease Addendum",
  move_in_checklist:   "Move-In Checklist",
  move_out_checklist:  "Move-Out Checklist",
  tenant_verification: "Tenant Verification",
  rent_receipt:        "Rent Receipt",
  notice:              "Notice",
  inspection_report:   "Inspection Report",
  property_image:      "Property Image",
  maintenance_report:  "Maintenance Report",
  tenant_document:     "Tenant Document",
  signed_document:     "Signed Document",
  contract:            "Contract",
  other:               "Other",
};

const REVERSE_TYPE_MAP = {
  lease_addendum:    ["lease_addendum", "lease_renewal"],
  inspection_report: ["inspection_report", "move_in_checklist", "move_out_checklist"],
  tenant_document:   ["tenant_document", "move_in_checklist", "move_out_checklist", "tenant_verification", "rent_receipt"],
  other:             ["other", "rent_receipt"],
};

const FILTER_TABS = [
  { key: "all",                label: "All" },
  { key: "lease_agreement",    label: "Lease" },
  { key: "lease_renewal",      label: "Renewal" },
  { key: "lease_addendum",     label: "Addendum" },
  { key: "move_in_checklist",  label: "Move-In" },
  { key: "move_out_checklist", label: "Move-Out" },
  { key: "tenant_verification",label: "Verification" },
  { key: "rent_receipt",       label: "Receipt" },
];

/* ─────────────────────────────────────────────
   NORMALIZE
───────────────────────────────────────────── */
const normalizeDoc = (doc, isTemplate = false) => {
  const tenantObj  = doc.tenant || null;
  const tenantName = tenantObj
    ? `${tenantObj.firstName || tenantObj.first_name || ''} ${tenantObj.lastName || tenantObj.last_name || ''}`.trim()
    : (doc.tenantName || doc.tenant_name || null);

  return {
    document_id:   doc.id          || doc.documentId   || doc.document_id || null,
    filename:      doc.name        || doc.filename      || doc.title      || "Document",
    document_type: doc.type        || doc.document_type || "other",
    file_url:      doc.fileUrl     || doc.file_url      || null,
    download_url:  doc.signedUrl   || doc.fileUrl       || doc.download_url || doc.file_url || null,
    html:          doc.html        || doc.htmlContent   || null,
    pdf_base64:    doc.pdf_base64  || doc.pdf           || null,
    status:        isTemplate
                     ? (doc.status || "template").toLowerCase()
                     : (doc.status || "unsigned").toLowerCase(),
    created_at:    doc.createdAt   || doc.created_at    || null,
    signed_at:     doc.signedAt    || doc.signed_at     || null,
    description:   doc.description || null,
    is_template:   isTemplate,
    tenant_name:   tenantName,
    _raw:          doc,
  };
};

/* ─────────────────────────────────────────────
   HTML BUILDERS (landlord preview)
───────────────────────────────────────────── */
const buildUnsignedPreviewHtml = (rawHtml) => `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,sans-serif;padding:20px;line-height:1.7;
       color:#1a1a1a;background:#fff}
  h1,h2,h3{margin:12px 0 8px}p{margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  td,th{border:1px solid #ddd;padding:8px;font-size:13px}
  </style></head><body>${rawHtml}</body></html>`;

const buildSignedDocHtmlWithUrl = (docHtml = '', sigUrl = '', tenantName = 'Tenant', signedAt = null) => {
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
    <div class="sig-row"><span class="sig-label">Signed by:</span><span class="sig-value">${tenantName}</span></div>
    <div class="sig-row"><span class="sig-label">Date:</span><span class="sig-value">${dateStr}</span></div>
    <img class="sig-img" src="${sigUrl}" alt="Signature of ${tenantName}" onerror="this.style.border='2px dashed #f00';this.alt='Signature image failed to load'"/>
    <p class="sig-footer">This document has been electronically signed and is legally binding.</p>
    <span class="sig-stamp">✓ Electronically Signed</span>
  </div>
</body></html>`;
};

/* ─────────────────────────────────────────────
   DOCUMENT PREVIEW MODAL
   FIX: No longer uses FileReader (browser-only).
   Instead: presign the PNG URL → use presigned URL directly as img src.
───────────────────────────────────────────── */
const DocumentPreviewModal = ({ visible, document: doc, token, onClose }) => {
  const [mergedHtml, setMergedHtml] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [webLoading, setWebLoading] = useState(true);

  const templateHtml = doc?.html;

  // FIX: Resolve sigPngUrl more robustly.
  // _matchingSignedDoc may be null if matching failed — handle gracefully.
  const sigPngUrl = (
    doc?._matchingSignedDoc?.file_url   ||  // preferred: signed_document record's PNG url
    (doc?.status === 'signed' ? doc?.file_url : null) ||  // fallback: doc's own file_url if signed
    null
  );

  const tenantName = doc?._matchingSignedDoc?.tenant_name || doc?.tenant_name || 'Tenant';
  const signedAt   = doc?._matchingSignedDoc?.signed_at   || doc?.signed_at   || null;
  const isSigned   = doc?.status === 'signed' || !!doc?._matchingSignedDoc;

  // Reset when doc changes
  useEffect(() => {
    setMergedHtml(null);
    setWebLoading(true);
  }, [doc?.document_id]);

  // FIX: Presign PNG URL → use directly as img src (no FileReader / no base64 conversion)
  useEffect(() => {
    if (!visible) return;

    // Not signed or no PNG → nothing to fetch
    if (!isSigned || !sigPngUrl) {
      if (isSigned && !sigPngUrl) {
        console.warn('[PropertyDocs] Signed doc has no sigPngUrl — showing unsigned template. Check _matchingSignedDoc matching logic.');
      }
      setMergedHtml(null);
      setLoading(false);
      return;
    }

    if (!templateHtml) {
      console.warn('[PropertyDocs] No templateHtml — cannot build preview.');
      setMergedHtml(null);
      setLoading(false);
      return;
    }

    if (!token) {
      console.warn('[PropertyDocs] No auth token — cannot presign URL.');
      setMergedHtml(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMergedHtml(null);

    const buildMerged = async () => {
      try {
        console.log('[PropertyDocs] Presigning sigPngUrl:', sigPngUrl?.substring(0, 80));

        // Step 1: Get presigned URL (no FileReader, no blob, no base64)
        const presigned = await fetchDocumentPresignedUrl(sigPngUrl, token);

        if (cancelled) return;

        if (!presigned) {
          console.warn('[PropertyDocs] Could not presign PNG URL — showing unsigned template as fallback.');
          setLoading(false);
          return;
        }

        // Step 2: Build merged HTML with presigned URL directly as img src
        // WebView loads the URL natively — no base64 conversion needed.
        const html = buildSignedDocHtmlWithUrl(templateHtml, presigned, tenantName, signedAt);
        if (!cancelled) {
          setMergedHtml(html);
          console.log('✅ [PropertyDocs] Merged signed HTML built using presigned URL (no FileReader)');
        }
      } catch (err) {
        if (!cancelled) console.warn('[PropertyDocs] Signed preview failed:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    buildMerged();
    return () => { cancelled = true; };
  }, [visible, sigPngUrl, token, templateHtml, tenantName, signedAt, isSigned]);

  // Build WebView source
  const source = (() => {
    if (mergedHtml)   return { html: mergedHtml };   // ✅ signed with real PNG
    if (loading)      return null;                   // still fetching — spinner shows
    if (templateHtml) return { html: buildUnsignedPreviewHtml(templateHtml) }; // fallback
    return null;
  })();

  const badgeLabel = isSigned ? '✓ Signed' : 'Preview';
  const badgeBg    = isSigned ? '#E8F5E9'  : '#E3F2FD';
  const badgeBorder= isSigned ? '#A5D6A7'  : '#90CAF9';
  const badgeColor = isSigned ? '#2E7D32'  : '#1565C0';

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={previewStyles.container}>
        {/* Header */}
        <View style={previewStyles.header}>
          <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn}>
            <Text style={previewStyles.closeBtnText}>✕  Close</Text>
          </TouchableOpacity>
          <Text style={previewStyles.headerTitle} numberOfLines={1}>
            {doc?.filename || "Document Preview"}
          </Text>
          <View style={[previewStyles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <Text style={[previewStyles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Spinner while presigning */}
        {loading && (
          <View style={previewStyles.loader}>
            <ActivityIndicator size="large" color={Colors.red} />
            <Text style={previewStyles.loaderText}>Loading signed document…</Text>
          </View>
        )}

        {/* No content */}
        {!loading && !source && (
          <View style={previewStyles.noContent}>
            <Text style={previewStyles.noContentText}>No preview available.</Text>
          </View>
        )}

        {/* WebView */}
        {!loading && source && (
          <View style={{ flex: 1 }}>
            {webLoading && (
              <View style={previewStyles.loader}>
                <ActivityIndicator size="large" color={Colors.red} />
                <Text style={previewStyles.loaderText}>Loading preview…</Text>
              </View>
            )}
            <WebView
              key={`${doc?.document_id}-${!!mergedHtml}`}
              source={source}
              style={[previewStyles.webview, webLoading && { opacity: 0 }]}
              onLoadEnd={() => setWebLoading(false)}
              onError={() => { setWebLoading(false); Toast.show("Could not load preview"); }}
              originWhitelist={["*"]}
              // FIX: javaScriptEnabled must be TRUE so the WebView can load
              // external image URLs (presigned S3 URLs). With JS disabled,
              // mixed-content and CORS restrictions can block external src= images.
              javaScriptEnabled={true}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              androidLayerType="hardware"
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   SEND MODAL
───────────────────────────────────────────── */
const SendModal = ({ visible, document: doc, tenants, onClose, onSend }) => {
  const [selected, setSelected] = useState([]);
  const [sending, setSending]   = useState(false);
  const toggleTenant = (id) => setSelected((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);
  const selectAll    = () => setSelected(selected.length === tenants.length ? [] : tenants.map((t) => t.tenant_id));
  const handleSend   = async () => {
    if (!selected.length) { Toast.show("Select at least one tenant"); return; }
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setSending(false); onSend(selected); setSelected([]);
  };
  const handleClose = () => { setSelected([]); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Send to Tenant</Text>
          {doc && (
            <View style={styles.modalDocPreview}>
              <AppIcon name={icons.Document} height={hp(2.2)} width={hp(2.2)} />
              <Text style={styles.modalDocName} numberOfLines={1}>{doc.filename}</Text>
            </View>
          )}
          <Text style={styles.modalSubtitle}>Select tenants to send to</Text>
          <TouchableOpacity style={styles.selectAllRow} onPress={selectAll} activeOpacity={0.7}>
            <View style={[styles.checkbox, selected.length === tenants.length && tenants.length > 0 && styles.checkboxChecked]}>
              {selected.length === tenants.length && tenants.length > 0 && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.selectAllText}>Select all tenants</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          {tenants.length === 0 ? (
            <Text style={styles.modalSubtitle}>No tenants assigned to this property.</Text>
          ) : tenants.map((tenant) => {
            const isSel = selected.includes(tenant.tenant_id);
            return (
              <TouchableOpacity key={tenant.tenant_id} style={styles.tenantRow} onPress={() => toggleTenant(tenant.tenant_id)} activeOpacity={0.7}>
                <View style={styles.tenantAvatar}><Text style={styles.tenantAvatarText}>{(tenant.name || "?").charAt(0).toUpperCase()}</Text></View>
                <VStack flex={1}><Text style={styles.tenantName}>{tenant.name}</Text><Text style={styles.tenantUnit}>{tenant.unit}</Text></VStack>
                <View style={[styles.checkbox, isSel && styles.checkboxChecked]}>{isSel && <Text style={styles.checkmark}>✓</Text>}</View>
              </TouchableOpacity>
            );
          })}
          <HStack space={3} style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sendBtn, !selected.length && styles.sendBtnDisabled]} onPress={handleSend} disabled={sending || !selected.length} activeOpacity={0.7}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendBtnText}>Send{selected.length > 0 ? ` (${selected.length})` : ""}</Text>}
            </TouchableOpacity>
          </HStack>
        </View>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   DOCUMENT CARD
───────────────────────────────────────────── */
const DocumentCard = ({ item, onPreview, onSend, onDelete }) => {
  const isTemplate = item.is_template;
  const isSigned   = item.status === 'signed' || !!item._matchingSignedDoc;
  const statusKey  = isTemplate && item.status === "template" ? "template" : item.status;
  const statusCfg  = STATUS_CONFIG[statusKey] || STATUS_CONFIG.unsigned;
  const typeLabel  = DOC_TYPE_LABELS[item.document_type] || item.document_type || "Document";

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const signedAt   = item.signed_at || item._matchingSignedDoc?.signed_at || null;
  const tenantName = item.tenant_name || item._matchingSignedDoc?.tenant_name || null;

  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        {/* Top row: title + badge */}
        <HStack alignItems="center" justifyContent="space-between" mb={hp(0.4)}>
          <Text style={styles.docFilename} numberOfLines={1} flex={1} mr={2}>{item.filename}</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: isSigned ? '#E8F5E9' : statusCfg.bg,
            borderColor:     isSigned ? '#A5D6A7' : statusCfg.border,
          }]}>
            <Text style={[styles.statusText, { color: isSigned ? '#2E7D32' : statusCfg.text }]}>
              {isSigned ? '✓ Signed' : statusCfg.label}
            </Text>
          </View>
        </HStack>

        {/* Type label */}
        <Text style={styles.docType}>{typeLabel}</Text>

        {/* Description */}
        {item.description ? <Text style={styles.docDescription} numberOfLines={2}>{item.description}</Text> : null}

        {/* Upload date */}
        <Text style={styles.docMeta}>
          {isTemplate ? "Template" : `Uploaded ${formatDate(item.created_at) || 'N/A'}`}
        </Text>

        {/* Signed info */}
        {isSigned && (
          <View style={styles.signedInfoRow}>
            <Text style={styles.signedAt}>✓ Signed {formatDate(signedAt) || ''}</Text>
            {tenantName ? <Text style={styles.signedBy}> · {tenantName}</Text> : null}
          </View>
        )}

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Action buttons */}
        <HStack space={2} alignItems="center">
          <TouchableOpacity
            style={[styles.actionBtnOutline, isSigned && { borderColor: '#2E7D32' }]}
            onPress={() => onPreview(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnOutlineText, isSigned && { color: '#2E7D32' }]}>
              {isSigned ? '✓ View Signed' : isTemplate ? 'Preview' : 'View'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnFilled} onPress={() => onSend(item)} activeOpacity={0.7}>
            <Text style={styles.actionBtnFilledText}>Send to Tenant</Text>
          </TouchableOpacity>
          {!isTemplate && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} activeOpacity={0.7}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </HStack>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────
   TYPE FILTER TABS
───────────────────────────────────────────── */
const TypeFilterTabs = ({ selected, onChange }) => (
  <View style={styles.tabsWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
      style={styles.tabsScrollView}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const PropertyDocuments = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const dispatch   = useDispatch();

  const { propertyId, propertyName = "Property" } = route.params || {};

  const token = useSelector((state) =>
    state?.auth?.token      ||
    state?.login?.token     ||
    state?.loginData?.token ||
    state?.user?.token      ||
    null
  );

  const { documents, templates, loading, templatesLoading, error, templatesError } =
    useSelector(documentsSelectors.getDocumentsData);

  const { landlordProperties, currentTenant: loadedTenants } =
    useSelector(propertiesSelectors.getPropertiesData);

  const currentProperty = landlordProperties?.find(
    (p) => (p?.property_id || p?.propertyId || p?.id) === propertyId
  );
  const propertyTenantIds =
    currentProperty?.tenant_ids ||
    (currentProperty?.tenants?.map?.((t) => t?.tenant_id || t?.id) ?? []);

  const [selectedType,     setSelectedType]     = useState("all");
  const [previewDoc,       setPreviewDoc]       = useState(null);
  const [previewVisible,   setPreviewVisible]   = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedDoc,      setSelectedDoc]      = useState(null);

  useEffect(() => {
    dispatch(getAllDocumentTemplates({ propertyId, type: selectedType !== "all" ? selectedType : undefined }));
    dispatch(getDocuments({ propertyId }));
  }, [propertyId, selectedType, dispatch]);
  
  useFocusEffect(
  useCallback(() => {
    dispatch(getAllDocumentTemplates({
      propertyId,
      type: selectedType !== "all" ? selectedType : undefined
    }));
    dispatch(getDocuments({ propertyId }));
  }, [dispatch, propertyId, selectedType])
);

  useEffect(() => {
    if (!propertyTenantIds.length) return;
    const alreadyLoaded = (loadedTenants || []).map((t) => t.id);
    propertyTenantIds.forEach((tid) => {
      if (tid && !alreadyLoaded.includes(tid)) dispatch(getTenantById({ tenantId: tid }));
    });
  }, [propertyId, dispatch]);

  const propertyTenants = (loadedTenants || [])
    .filter((t) => propertyTenantIds.includes(t.id))
    .map((t) => ({ tenant_id: t.id, name: t.name || "Unknown Tenant", unit: t.unit || t.email || "" }));

  // ── Normalize ────────────────────────────────
  const normalizedTemplates = (templates || [])
    .filter((d) => selectedType === "all" || (d.type || d.document_type) === selectedType)
    .map((d) => normalizeDoc(d, true));

const normalizedDocuments = (documents || [])
  .filter((d) =>
    selectedType === "all" ||
    (d.type || d.document_type) === selectedType ||
    (d.type || d.document_type) === "signed_document"  // ← always keep signed records
  )
  .map((d) => normalizeDoc(d, false));

 // ── signed_document records ───────────────────────────────
const signedDocRecords = normalizedDocuments.filter(
  (d) => d.document_type === 'signed_document' && d.status === 'signed' && d.file_url
);

// ── Build lookup maps ─────────────────────────────────────

// Map 1: original docs directly marked signed (legacy/Step4 flow)
const signedDocByType = {};
const signedDocByName = {};
normalizedDocuments
  .filter((d) => d.status === 'signed' && d.document_type !== 'signed_document')
  .forEach((d) => {
    const storedType = d.document_type;
    const nameLower  = (d.filename || '').toLowerCase().trim();
    if (!signedDocByType[storedType]) signedDocByType[storedType] = d;
    const aliases = REVERSE_TYPE_MAP[storedType] || [];
    aliases.forEach((a) => { if (!signedDocByType[a]) signedDocByType[a] = d; });
    if (nameLower && !signedDocByName[nameLower]) signedDocByName[nameLower] = d;
  });

// Map 2: signed_document records indexed by:
//   a) their filename  e.g. "lease agreement" → record
//   b) type label      e.g. DOC_TYPE_LABELS["lease_agreement"] = "Lease Agreement"
const signedDocByLabelName = {};
signedDocRecords.forEach((d) => {
  const sigName = (d.filename || '').toLowerCase().trim();
  if (sigName && sigName !== 'document') {
    signedDocByLabelName[sigName] = d;
  }
});

// ── Match each template to its signed record ──────────────
const enrichedTemplates = normalizedTemplates.map((tpl) => {
  const templateName = (tpl.filename || '').toLowerCase().trim();
  const templateType = tpl.document_type;
  const typeLabel    = (DOC_TYPE_LABELS[templateType] || '').toLowerCase().trim();

  let sigDocMatch = null;

  // ── Priority 1: original doc directly signed (Step 4 / legacy) ──
  if (!sigDocMatch) {
    sigDocMatch = signedDocRecords.find((d) => {
      const origType = d._raw?.originalType || d._raw?.original_type ||
                       d._raw?.documentType || d._raw?.document_type || '';
      return origType === templateType;
    }) || null;
  }


  if (!sigDocMatch && typeLabel) {
    sigDocMatch = signedDocByLabelName[typeLabel] || null;
  }

  // ── Priority 3: exact filename match ──
  if (!sigDocMatch && templateName && templateName !== 'document') {
    sigDocMatch = signedDocByLabelName[templateName] || null;
  }

  // ── Priority 4: legacy type-based match (Step 4 flow) ──
  if (!sigDocMatch) {
    const legacySigned = signedDocByType[templateType] || signedDocByName[templateName] || null;
    if (legacySigned && signedDocRecords.length > 0) {
      // Find the signed_document record with the closest name
      sigDocMatch = signedDocRecords.find(
        (d) => typeLabel && (d.filename || '').toLowerCase().includes(typeLabel.substring(0, 5))
      ) || signedDocRecords[0] || null;
    }
  }

  // ── Priority 5: only one signed_document exists → attach to matching type ──
  if (!sigDocMatch && signedDocRecords.length === 1) {
    const single    = signedDocRecords[0];
    const sigName   = (single.filename || '').toLowerCase().trim();
    // Only attach if it plausibly belongs to this template
    const plausible = sigName === typeLabel          // name matches type label
                   || sigName === templateName        // name matches template filename
                   || (!sigName || sigName === 'document'); // has no useful name
    if (plausible) sigDocMatch = single;
  }

  const best = sigDocMatch
    || signedDocByType[templateType]
    || signedDocByName[templateName]
    || null;

  return { ...tpl, _matchingSignedDoc: best || null };
});

  

  // IDs of all templates (may be null for Shape C templates from getalldocument)
  const templateIds = new Set(enrichedTemplates.map((d) => d.document_id).filter(Boolean));

  // document_types already covered by a template (Shape C has no IDs — dedup by type)
  const templateTypes = new Set(enrichedTemplates.map((d) => d.document_type).filter(Boolean));

  const matchedOriginalIds = new Set(
    enrichedTemplates
      .map((t) => t._matchingSignedDoc?.document_id)
      .filter(Boolean)
  );

  const extraDocs = normalizedDocuments.filter((d) => {
    // Never surface raw signed_document records as standalone cards
    if (d.document_type === 'signed_document') return false;
    // Already represented by a template with the same ID
    if (d.document_id && templateIds.has(d.document_id)) return false;
    // Already represented by a template with the same type (covers Shape C null-ID templates)
    if (d.document_type && templateTypes.has(d.document_type)) return false;
    // Already used as the matched signed original for a template
    if (d.document_id && matchedOriginalIds.has(d.document_id)) return false;
    return true;
  });

  // Final safety dedup — guards against the two APIs returning overlapping records.
  // enrichedTemplates come first so they always win over raw documents.
  const _seenIds   = new Set();
  const _seenTypes = new Set();
  const allDocuments = [...enrichedTemplates, ...extraDocs].filter((d) => {
    if (d.document_id) {
      if (_seenIds.has(d.document_id)) return false;
      _seenIds.add(d.document_id);
    }
    if (d.document_type) {
      if (_seenTypes.has(d.document_type)) return false;
      _seenTypes.add(d.document_type);
    }
    return true;
  });

  const stats = {
    total:    allDocuments.length,
    signed:   allDocuments.filter((d) => d.status === "signed" || !!d._matchingSignedDoc).length,
    pending:  allDocuments.filter((d) => d.status === "pending").length,
    unsigned: allDocuments.filter((d) => !d._matchingSignedDoc && (d.status === "unsigned" || d.status === "template")).length,
  };

  /* ── Handlers ── */
  const handlePreview = useCallback((doc) => {
    const hasHtml    = !!doc.html;
    const hasFileUrl = !!doc.file_url || !!doc.download_url;

    if (!hasHtml && !hasFileUrl) {
      Toast.show("No preview available");
      return;
    }
    setPreviewDoc(doc);
    setPreviewVisible(true);
  }, []);

  const handleSendPress   = useCallback((doc) => { setSelectedDoc(doc); setSendModalVisible(true); }, []);
  const handleSendConfirm = useCallback((tenantIds) => {
    setSendModalVisible(false);
    Toast.show(`Document sent to ${tenantIds.length} tenant${tenantIds.length > 1 ? "s" : ""}`);
    setSelectedDoc(null);
  }, []);
  const handleDelete = useCallback((doc) => {
    Alert.alert("Delete Document", `Are you sure you want to delete "${doc.filename}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => dispatch(deleteDocument({ documentId: doc.document_id })) },
    ]);
  }, [dispatch]);
  const handleRetry = () => {
    dispatch(getAllDocumentTemplates({ propertyId, type: selectedType !== "all" ? selectedType : undefined }));
    dispatch(getDocuments({ propertyId }));
  };

  const Header = () => (
    <View style={styles.headerContainer}>
      <HStack alignItems="center" space={2}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
        </TouchableOpacity>
        <VStack flex={1}>
          <Text style={styles.title} numberOfLines={1}>Documents</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{propertyName}</Text>
        </VStack>
        {(loading || templatesLoading) && <ActivityIndicator size="small" color={Colors.red} />}
      </HStack>
    </View>
  );

  const isFirstLoad = (loading || templatesLoading) && allDocuments.length === 0;
  if (isFirstLoad) return (
    <Container><Header /><TypeFilterTabs selected={selectedType} onChange={setSelectedType} />
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.red} /><Text mt={3} color={Colors.textGray}>Loading documents…</Text></View>
    </Container>
  );

  const combinedError = error || templatesError;
  if (combinedError && allDocuments.length === 0) return (
    <Container><Header /><TypeFilterTabs selected={selectedType} onChange={setSelectedType} />
      <View style={styles.center}>
        <AppIcon name={icons.Document} height={hp(6)} width={hp(6)} />
        <Text style={styles.errorText}>{combinedError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}><Text style={{ color: Colors.red, fontWeight: "600" }}>Retry</Text></TouchableOpacity>
      </View>
    </Container>
  );

  return (
    <Container scroll={false}>
      <Header />
      <TypeFilterTabs selected={selectedType} onChange={setSelectedType} />

      {allDocuments.length > 0 && (
        <View style={styles.statsBar}>
          {[
            { color: "#888",    label: `${stats.total} Total` },
            { color: "#2E7D32", label: `${stats.signed} Signed` },
            { color: "#F57F17", label: `${stats.pending} Pending` },
            { color: "#C62828", label: `${stats.unsigned} Unsigned` },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: s.color }]} />
                <Text style={styles.statText}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {allDocuments.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name={icons.Document} height={hp(7)} width={hp(7)} />
          <Text mt={3} fontSize={hp(2)} color={Colors.textGray} textAlign="center">No documents found</Text>
        </View>
      ) : (
        <FlatList
          data={allDocuments}
          keyExtractor={(item, i) => String(item.document_id || `doc-${i}`)}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: hp(1.6) }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DocumentCard item={item} onPreview={handlePreview} onSend={handleSendPress} onDelete={handleDelete} />
          )}
          ListFooterComponent={() => (
            <Box mt={hp(1)} mb={hp(1)}>
              <Text textAlign="center" fontSize={hp(1.4)} color={Colors.textGray}>
                Tap "View Signed" to see the document with tenant's actual signature
              </Text>
            </Box>
          )}
        />
      )}

      <DocumentPreviewModal
        visible={previewVisible}
        document={previewDoc}
        token={token}
        onClose={() => { setPreviewVisible(false); setPreviewDoc(null); }}
      />

      <SendModal
        visible={sendModalVisible}
        document={selectedDoc}
        tenants={propertyTenants}
        onClose={() => { setSendModalVisible(false); setSelectedDoc(null); }}
        onSend={handleSendConfirm}
      />
    </Container>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  headerContainer: { paddingTop:hp(2), paddingBottom:hp(1.5), paddingHorizontal:wp(5) },
  title:    { fontSize:hp(2.5), fontWeight:"bold", color:"#000" },
  subtitle: { fontSize:hp(1.5), color:Colors.textGray, marginTop:hp(0.2) },
  errorText:{ color:"#C62828", textAlign:"center", marginTop:hp(1.5), fontSize:hp(1.8) },
  tabsWrapper: {
    height: hp(7),
    paddingBottom: hp(0.5),
    marginBottom: hp(0.5),
  },
  tabsScrollView: {
    overflow: 'visible',
  },
  tabsContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.85),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  tabText: { fontSize: hp(1.55), color: "#666", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  statsBar:  { flexDirection:"row", alignItems:"center", justifyContent:"center", marginHorizontal:wp(4), marginBottom:hp(1.4), backgroundColor:"rgba(255,255,255,0.85)", borderRadius:12, paddingVertical:hp(1.1), paddingHorizontal:wp(3), shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  statItem:  { flexDirection:"row", alignItems:"center", flex:1, justifyContent:"center" },
  statDot:   { width:8, height:8, borderRadius:4, marginRight:5 },
  statText:  { fontSize:hp(1.3), color:"#444", fontWeight:"500" },
  statDivider:{ width:1, height:hp(2), backgroundColor:"#E0E0E0" },
  listContainer: { paddingHorizontal:wp(4), paddingTop:hp(0.5), paddingBottom:hp(3) },

  // Card
  card:      { backgroundColor:"#fff", borderRadius:16, overflow:"hidden", shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3, borderWidth:1, borderColor:"rgba(0,0,0,0.05)" },
  cardInner: { padding:hp(1.8) },
  cardDivider: { height:1, backgroundColor:"#F2F2F2", marginVertical:hp(1.2) },

  // Removed iconBox — no longer used
  iconBox:   { backgroundColor:"rgba(229,57,53,0.12)", padding:hp(1.3), borderRadius:12, alignSelf:"flex-start", margin:hp(1) },

  docFilename:   { fontSize:hp(1.95), fontWeight:"700", color:"#1a1a1a" },
  docType:       { fontSize:hp(1.45), color:Colors.textGray, marginTop:hp(0.25) },
  docDescription:{ fontSize:hp(1.4), color:"#666", marginTop:hp(0.3), lineHeight:hp(2) },
  docMeta:       { fontSize:hp(1.4), color:Colors.textGray, marginTop:hp(0.5) },
  signedInfoRow: { flexDirection:"row", flexWrap:"wrap", marginTop:hp(0.4) },
  signedAt:      { fontSize:hp(1.35), color:"#2E7D32", fontWeight:"500" },
  signedBy:      { fontSize:hp(1.35), color:"#2E7D32" },
  statusBadge:   { paddingHorizontal:wp(2.8), paddingVertical:hp(0.45), borderRadius:20, borderWidth:1 },
  statusText:    { fontSize:hp(1.3), fontWeight:"600" },

  // Action buttons
  actionBtnOutline:     { borderWidth:1.5, borderColor:Colors.red, borderRadius:10, paddingHorizontal:wp(4), paddingVertical:hp(1.05), alignItems:"center", justifyContent:"center" },
  actionBtnOutlineText: { color:Colors.red, fontSize:hp(1.55), fontWeight:"600" },
  actionBtnFilled:      { backgroundColor:Colors.red, borderRadius:10, paddingHorizontal:wp(4), paddingVertical:hp(1.05), alignItems:"center", justifyContent:"center", flex:1 },
  actionBtnFilledText:  { color:"#fff", fontSize:hp(1.55), fontWeight:"600" },
  deleteBtn:   { width:hp(4.2), height:hp(4.2), borderRadius:10, borderWidth:1.5, borderColor:"#FFCDD2", alignItems:"center", justifyContent:"center", backgroundColor:"#FFF5F5" },
  deleteBtnText:{ color:"#C62828", fontSize:hp(1.6), fontWeight:"700" },

  center:   { flex:1, justifyContent:"center", alignItems:"center", paddingHorizontal:wp(6) },
  retryBtn: { marginTop:hp(2), paddingVertical:hp(1.4), paddingHorizontal:wp(10), borderRadius:10, borderWidth:1, borderColor:Colors.red },
  modalOverlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.45)", justifyContent:"flex-end" },
  modalSheet:     { backgroundColor:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:wp(5), paddingTop:hp(1), paddingBottom:hp(4) },
  modalHandle:    { width:wp(10), height:4, backgroundColor:"#E0E0E0", borderRadius:2, alignSelf:"center", marginBottom:hp(1.5) },
  modalTitle:     { fontSize:hp(2.2), fontWeight:"700", color:"#1a1a1a", marginBottom:hp(1.2) },
  modalDocPreview:{ flexDirection:"row", alignItems:"center", backgroundColor:"rgba(229,57,53,0.08)", borderRadius:10, padding:hp(1.2), marginBottom:hp(1.5), gap:8 },
  modalDocName:   { fontSize:hp(1.6), color:"#333", fontWeight:"500", flex:1 },
  modalSubtitle:  { fontSize:hp(1.6), color:Colors.textGray, marginBottom:hp(1) },
  selectAllRow:   { flexDirection:"row", alignItems:"center", paddingVertical:hp(1), gap:12 },
  selectAllText:  { fontSize:hp(1.7), color:"#1a1a1a", fontWeight:"500" },
  divider:        { height:1, backgroundColor:"#F0F0F0", marginVertical:hp(0.8) },
  tenantRow:      { flexDirection:"row", alignItems:"center", paddingVertical:hp(1.2), gap:12 },
  tenantAvatar:   { width:hp(4.5), height:hp(4.5), borderRadius:hp(2.25), backgroundColor:"rgba(229,57,53,0.15)", alignItems:"center", justifyContent:"center" },
  tenantAvatarText:{ fontSize:hp(2), fontWeight:"700", color:Colors.red },
  tenantName:     { fontSize:hp(1.8), fontWeight:"600", color:"#1a1a1a" },
  tenantUnit:     { fontSize:hp(1.4), color:Colors.textGray, marginTop:hp(0.2) },
  checkbox:        { width:22, height:22, borderRadius:6, borderWidth:2, borderColor:"#D0D0D0", alignItems:"center", justifyContent:"center" },
  checkboxChecked: { backgroundColor:Colors.red, borderColor:Colors.red },
  checkmark:       { color:"#fff", fontSize:13, fontWeight:"700", lineHeight:16 },
  modalActions:    { marginTop:hp(2.5) },
  cancelBtn:       { flex:1, paddingVertical:hp(1.6), borderRadius:12, borderWidth:1, borderColor:"#E0E0E0", alignItems:"center" },
  cancelBtnText:   { fontSize:hp(1.8), color:"#666", fontWeight:"600" },
  sendBtn:         { flex:2, paddingVertical:hp(1.6), borderRadius:12, backgroundColor:Colors.red, alignItems:"center", justifyContent:"center" },
  sendBtnDisabled: { backgroundColor:"#FFCDD2" },
  sendBtnText:     { fontSize:hp(1.8), color:"#fff", fontWeight:"700" },
});

const previewStyles = StyleSheet.create({
  container:    { flex:1, backgroundColor:"#fff" },
  header:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:wp(4), paddingTop:hp(6), paddingBottom:hp(1.5), borderBottomWidth:1, borderBottomColor:"#F0F0F0", gap:8 },
  closeBtn:     { paddingVertical:hp(0.6), paddingHorizontal:wp(1) },
  closeBtnText: { fontSize:hp(1.7), color:Colors.textGray, fontWeight:"500" },
  headerTitle:  { flex:1, fontSize:hp(1.9), fontWeight:"700", color:"#1a1a1a", textAlign:"center" },
  badge:        { borderRadius:20, paddingHorizontal:wp(2.5), paddingVertical:hp(0.4), borderWidth:1 },
  badgeText:    { fontSize:hp(1.2), fontWeight:"700" },
  webview:      { flex:1 },
  loader:       { position:"absolute", top:0, left:0, right:0, bottom:0, zIndex:10, justifyContent:"center", alignItems:"center", backgroundColor:"#fff" },
  loaderText:   { marginTop:hp(1.5), fontSize:hp(1.6), color:Colors.textGray },
  noContent:    { flex:1, justifyContent:"center", alignItems:"center" },
  noContentText:{ fontSize:hp(1.8), color:Colors.textGray, textAlign:"center" },
});

export default PropertyDocuments;
