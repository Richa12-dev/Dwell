import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
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
import { getDocuments } from "../../Redux/Documents/documentsServicesNode";
import { documentsSelectors } from "../../Redux/Documents/documentsSlice";

/* ─────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────── */
const STATUS_CONFIG = {
  signed: {
    label: "Signed",
    bg: "#E8F5E9",
    text: "#2E7D32",
    border: "#A5D6A7",
  },
  pending: {
    label: "Pending",
    bg: "#FFF8E1",
    text: "#F57F17",
    border: "#FFE082",
  },
  unsigned: {
    label: "Unsigned",
    bg: "#FFEBEE",
    text: "#C62828",
    border: "#EF9A9A",
  },
  expired: {
    label: "Expired",
    bg: "#F3E5F5",
    text: "#6A1B9A",
    border: "#CE93D8",
  },
  cancelled: {
    label: "Cancelled",
    bg: "#ECEFF1",
    text: "#546E7A",
    border: "#B0BEC5",
  },
};

const DOC_TYPE_LABELS = {
  lease_agreement:    "Lease Agreement",
  lease_addendum:     "Lease Addendum",
  notice:             "Notice",
  inspection_report:  "Inspection Report",
  property_image:     "Property Image",
  maintenance_report: "Maintenance Report",
  tenant_document:    "Tenant Document",
  signed_document:    "Signed Document",
  contract:           "Contract",
  other:              "Other",
  // legacy keys from DUMMY_DOCUMENTS
  lease:     "Lease Agreement",
  addendum:  "Addendum",
  inspection:"Inspection Report",
  signed:    "Signed Document",
};

/* ─────────────────────────────────────────────
   SEND MODAL
───────────────────────────────────────────── */
const SendModal = ({ visible, document, tenants, onClose, onSend }) => {
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const toggleTenant = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const selectAll = () => {
    if (selected.length === tenants.length) {
      setSelected([]);
    } else {
      setSelected(tenants.map((t) => t.tenant_id));
    }
  };

  const handleSend = async () => {
    if (!selected.length) {
      Toast.show("Please select at least one tenant");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    onSend(selected);
    setSelected([]);
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Send Document</Text>

          {document && (
            <View style={styles.modalDocPreview}>
              <AppIcon name={icons.Document} height={hp(2.2)} width={hp(2.2)} />
              <Text style={styles.modalDocName} numberOfLines={1}>
                {document.filename}
              </Text>
            </View>
          )}

          <Text style={styles.modalSubtitle}>Select tenants to send to</Text>

          {/* Select All */}
          <TouchableOpacity
            style={styles.selectAllRow}
            onPress={selectAll}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                selected.length === tenants.length &&
                  tenants.length > 0 &&
                  styles.checkboxChecked,
              ]}
            >
              {selected.length === tenants.length && tenants.length > 0 && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.selectAllText}>Select all tenants</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Tenant list */}
          {tenants.length === 0 ? (
            <Text style={styles.modalSubtitle}>No tenants assigned to this property.</Text>
          ) : (
            tenants.map((tenant) => {
              const isSelected = selected.includes(tenant.tenant_id);
              return (
                <TouchableOpacity
                  key={tenant.tenant_id}
                  style={styles.tenantRow}
                  onPress={() => toggleTenant(tenant.tenant_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tenantAvatar}>
                    <Text style={styles.tenantAvatarText}>
                      {(tenant.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <VStack flex={1}>
                    <Text style={styles.tenantName}>{tenant.name}</Text>
                    <Text style={styles.tenantUnit}>{tenant.unit}</Text>
                  </VStack>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <HStack space={3} style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, !selected.length && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending || !selected.length}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>
                  Send{selected.length > 0 ? ` (${selected.length})` : ""}
                </Text>
              )}
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
const DocumentCard = ({ item, onDownload, onSend, downloading }) => {
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.unsigned;
  const typeLabel = DOC_TYPE_LABELS[item.document_type] || item.document_type || "Document";

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View style={styles.card}>
      <HStack alignItems="flex-start" space={3}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <AppIcon name={icons.Document} height={hp(2.4)} width={hp(2.4)} />
        </View>

        {/* Content */}
        <VStack flex={1}>
          {/* Filename + badge */}
          <HStack alignItems="center" justifyContent="space-between" mb={0.5}>
            <Text style={styles.docFilename} numberOfLines={1} flex={1} mr={2}>
              {item.filename || "Untitled Document"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
              ]}
            >
              <Text style={[styles.statusText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>
          </HStack>

          <Text style={styles.docType}>{typeLabel}</Text>

          <Text style={styles.docMeta}>
            {formatFileSize(item.size)} · Uploaded {formatDate(item.created_at)}
          </Text>

          {item.signed_at && (
            <Text style={styles.signedAt}>✓ Signed {formatDate(item.signed_at)}</Text>
          )}

          {/* Actions */}
          <HStack space={2} mt={2}>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => onDownload(item)}
              disabled={downloading === item.document_id}
              activeOpacity={0.7}
            >
              {downloading === item.document_id ? (
                <ActivityIndicator size="small" color={Colors.red} />
              ) : (
                <HStack alignItems="center" space={1}>
                  <AppIcon name={icons.Download} height={hp(1.8)} width={hp(1.8)} />
                  <Text style={styles.actionBtnOutlineText}>View</Text>
                </HStack>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnFilled}
              onPress={() => onSend(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnFilledText}>Send to Tenant</Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </HStack>
    </View>
  );
};

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const PropertyDocuments = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // ── Route params
  const { propertyId, propertyName = "Property" } = route.params || {};

  // ── Auth — resolve token across all common Redux store shapes
  const authToken = useSelector((state) => {
    const src =
      state?.auth ||
      state?.login ||
      state?.loginData ||
      state?.user ||
      {};
    return (
      src?.accessToken  ||
      src?.token        ||
      src?.access_token ||
      src?.data?.accessToken ||
      src?.data?.token  ||
      null
    );
  });

  // ── Documents from Redux
  const { documents, loading, error } = useSelector(documentsSelectors.getDocumentsData);

  // ── Properties + tenants from Redux
  const { landlordProperties, currentTenant: loadedTenants } = useSelector(
    propertiesSelectors.getPropertiesData
  );

  const currentProperty = landlordProperties.find(
    (p) => (p?.property_id || p?.propertyId || p?.id) === propertyId
  );

  const propertyTenantIds =
    currentProperty?.tenant_ids ||
    (currentProperty?.tenants?.map?.((t) => t?.tenant_id || t?.id) ?? []);

  // ── Local UI state
  const [downloading, setDownloading] = useState(null);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // ── Fetch documents
  useEffect(() => {
    if (!authToken) return;
    dispatch(getDocuments({ token: authToken, propertyId }));
  }, [propertyId, authToken]);

  // ── Fetch tenants not yet loaded
  useEffect(() => {
    if (!authToken || !propertyTenantIds.length) return;
    const alreadyLoaded = (loadedTenants || []).map((t) => t.id);
    propertyTenantIds.forEach((tid) => {
      if (tid && !alreadyLoaded.includes(tid)) {
        dispatch(getTenantById({ tenantId: tid, token: authToken }));
      }
    });
  }, [propertyId, authToken]);

  // ── Shape tenants for SendModal
  const propertyTenants = (loadedTenants || [])
    .filter((t) => propertyTenantIds.includes(t.id))
    .map((t) => ({
      tenant_id: t.id,
      name: t.name || "Unknown Tenant",
      unit: t.unit || t.email || "",
    }));

  // ── Normalize API field names → DocumentCard shape
  const normalizedDocuments = (documents || []).map((doc) => ({
    document_id:   doc.id          || doc.document_id  || doc.documentId,
    document_type: doc.type        || doc.document_type,
    filename:      doc.name        || doc.filename,
    file_url:      doc.fileUrl     || doc.file_url,
    download_url:  doc.signedUrl   || doc.fileUrl      || doc.download_url || doc.file_url,
    status:        doc.status      || "unsigned",
    size:          doc.size        || null,
    created_at:    doc.createdAt   || doc.created_at,
    signed_at:     doc.signedAt    || doc.signed_at    || null,
  }));

  // ── Stats
  const stats = {
    signed:   normalizedDocuments.filter((d) => d.status === "signed").length,
    pending:  normalizedDocuments.filter((d) => d.status === "pending").length,
    unsigned: normalizedDocuments.filter((d) => d.status === "unsigned").length,
  };

  /* ── Handlers ── */
  const handleDownload = async (doc) => {
    const url = doc?.download_url || doc?.file_url;
    if (!url) {
      Toast.show("No download link available yet");
      return;
    }
    try {
      setDownloading(doc.document_id);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Toast.show("Unable to open this document");
      }
    } catch {
      Toast.show("Failed to open document");
    } finally {
      setDownloading(null);
    }
  };

  const handleSendPress = (doc) => {
    setSelectedDoc(doc);
    setSendModalVisible(true);
  };

  const handleSendConfirm = (tenantIds) => {
    setSendModalVisible(false);
    Toast.show(
      `Document sent to ${tenantIds.length} tenant${tenantIds.length > 1 ? "s" : ""}`
    );
    setSelectedDoc(null);
  };

  const handleUpload = () => {
    Alert.alert(
      "Upload Document",
      "Document upload will be available once the API is connected.",
      [{ text: "OK" }]
    );
  };

  const handleRetry = () => {
    if (authToken) dispatch(getDocuments({ token: authToken, propertyId }));
  };

  /* ── Shared header ── */
  const Header = () => (
    <View style={styles.headerContainer}>
      <HStack alignItems="center" justifyContent="space-between">
        <HStack alignItems="center" space={2} flex={1}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
          </TouchableOpacity>
          <VStack flex={1}>
            <Text style={styles.title} numberOfLines={1}>Documents</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{propertyName}</Text>
          </VStack>
        </HStack>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} activeOpacity={0.8}>
          <Text style={styles.uploadBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </HStack>
    </View>
  );

  /* ── Loading ── */
  if (loading) {
    return (
      <Container>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text mt={3} color={Colors.textGray}>Loading documents...</Text>
        </View>
      </Container>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <Container>
        <Header />
        <View style={styles.center}>
          <AppIcon name={icons.Document} height={hp(6)} width={hp(6)} />
          <Text
            style={{ color: "#C62828", textAlign: "center", marginTop: hp(1.5), fontSize: hp(1.8) }}
          >
            {error}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={{ color: Colors.red, fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  /* ── Main UI ── */
  return (
    <Container scroll={false}>
      <Header />

      {/* Stats bar */}
      {normalizedDocuments.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#2E7D32" }]} />
            <Text style={styles.statText}>{stats.signed} Signed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#F57F17" }]} />
            <Text style={styles.statText}>{stats.pending} Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#C62828" }]} />
            <Text style={styles.statText}>{stats.unsigned} Unsigned</Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {normalizedDocuments.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name={icons.Document} height={hp(7)} width={hp(7)} />
          <Text mt={3} fontSize={hp(2)} color={Colors.textGray} textAlign="center">
            No documents yet
          </Text>
          <Text fontSize={hp(1.5)} color={Colors.textGray} textAlign="center" mt={1}>
            Tap "+ Upload" to add the first document for this property
          </Text>
          <TouchableOpacity
            style={styles.emptyUploadBtn}
            onPress={handleUpload}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyUploadBtnText}>Upload Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={normalizedDocuments}
          keyExtractor={(item) => String(item.document_id)}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: hp(1.4) }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DocumentCard
              item={item}
              onDownload={handleDownload}
              onSend={handleSendPress}
              downloading={downloading}
            />
          )}
          ListFooterComponent={() => (
            <Box mt={hp(1)} mb={hp(1)}>
              <Text textAlign="center" fontSize={hp(1.4)} color={Colors.textGray}>
                Tap "Send to Tenant" to share a document for signing
              </Text>
            </Box>
          )}
        />
      )}

      {/* Send modal */}
      <SendModal
        visible={sendModalVisible}
        document={selectedDoc}
        tenants={propertyTenants}
        onClose={() => {
          setSendModalVisible(false);
          setSelectedDoc(null);
        }}
        onSend={handleSendConfirm}
      />
    </Container>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: hp(2),
    paddingBottom: hp(1.5),
    paddingHorizontal: wp(5),
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: hp(1.5),
    color: Colors.textGray,
    marginTop: hp(0.2),
  },
  uploadBtn: {
    backgroundColor: Colors.red,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.9),
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: hp(1.7),
    fontWeight: "600",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: hp(1.5),
    color: "#444",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: hp(2),
    backgroundColor: "#E0E0E0",
  },
  listContainer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.5),
    paddingBottom: hp(3),
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: hp(2),
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconBox: {
    backgroundColor: "rgba(229,57,53,0.12)",
    padding: hp(1.3),
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: hp(0.3),
  },
  docFilename: {
    fontSize: hp(1.9),
    fontWeight: "600",
    color: "#1a1a1a",
  },
  docType: {
    fontSize: hp(1.4),
    color: Colors.textGray,
    marginTop: hp(0.2),
  },
  docMeta: {
    fontSize: hp(1.4),
    color: Colors.textGray,
    marginTop: hp(0.4),
  },
  signedAt: {
    fontSize: hp(1.3),
    color: "#2E7D32",
    marginTop: hp(0.3),
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: hp(1.3),
    fontWeight: "600",
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnOutlineText: {
    color: Colors.red,
    fontSize: hp(1.5),
    fontWeight: "600",
  },
  actionBtnFilled: {
    backgroundColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  actionBtnFilledText: {
    color: "#fff",
    fontSize: hp(1.5),
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(6),
  },
  retryBtn: {
    marginTop: hp(2),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(10),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  emptyUploadBtn: {
    marginTop: hp(3),
    backgroundColor: Colors.red,
    paddingHorizontal: wp(10),
    paddingVertical: hp(1.4),
    borderRadius: 12,
  },
  emptyUploadBtnText: {
    color: "#fff",
    fontSize: hp(1.8),
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    paddingTop: hp(1),
  },
  modalHandle: {
    width: wp(10),
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: hp(1.5),
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: hp(1.2),
  },
  modalDocPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.08)",
    borderRadius: 10,
    padding: hp(1.2),
    marginBottom: hp(1.5),
    gap: 8,
  },
  modalDocName: {
    fontSize: hp(1.6),
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  modalSubtitle: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginBottom: hp(1),
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1),
    gap: 12,
  },
  selectAllText: {
    fontSize: hp(1.7),
    color: "#1a1a1a",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: hp(0.8),
  },
  tenantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1.2),
    gap: 12,
  },
  tenantAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: "rgba(229,57,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tenantAvatarText: {
    fontSize: hp(2),
    fontWeight: "700",
    color: Colors.red,
  },
  tenantName: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: "#1a1a1a",
  },
  tenantUnit: {
    fontSize: hp(1.4),
    color: Colors.textGray,
    marginTop: hp(0.2),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  modalActions: {
    marginTop: hp(2.5),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: hp(1.6),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: hp(1.8),
    color: "#666",
    fontWeight: "600",
  },
  sendBtn: {
    flex: 2,
    paddingVertical: hp(1.6),
    borderRadius: 12,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#FFCDD2",
  },
  sendBtnText: {
    fontSize: hp(1.8),
    color: "#fff",
    fontWeight: "700",
  },
});

export default PropertyDocuments;
