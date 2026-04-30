// SignDocumentScreen.jsx — Tenant signs a document
//
// Full sign flow:
//   Step 0: Resolve documentId (create doc record if template)
//   Step 1: Extract sigBase64 from canvas
//   Step 2: Build merged HTML (template content + signature image inline)
//   Step 3: Upload merged HTML to S3 uploads/ → mergedHtmlUrl
//   Step 4: PATCH original document → status: "signed"
//   Step 5: POST signed_document record → { fileUrl: mergedHtmlUrl }
//           Server SAVES this because it is createDocument not PATCH ✅
//           Both tenant + landlord see real signature via getDocuments
//   Step 6: Save mergedHtmlUrl to AsyncStorage (fast path for tenant preview)
//           Save sigBase64 to AsyncStorage (local rebuild fallback)

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
   Image,
} from "react-native";
import { HStack, Text, VStack } from "native-base";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import SignatureCanvas from "react-native-signature-canvas";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { Colors } from "../../Theme";
import {
  createDocument,
  getDocumentUploadUrl,
  getDocuments,
  updateDocument,
  uploadFileToS3,
} from "../../Redux/Documents/documentsServicesNode";
import { documentsSelectors } from "../../Redux/Documents/documentsSlice";
import { tenantsSelectors } from "../../Redux/Tenants/tenantsSlice";
import { getLandlordContact } from "../../Redux/Tenants/services";
import { buildSignedDocHtml } from "../../commonFunction/buildSignedDocHtml";
// ADD this line below the existing AsyncStorage import
import { launchImageLibrary } from "react-native-image-picker";


/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TEMPLATE_TYPE_MAP = {
  lease_agreement:     "lease_agreement",
  lease_renewal:       "lease_renewal",
  lease_addendum:      "lease_addendum",
  move_in_checklist:   "move_in_checklist",
  move_out_checklist:  "move_out_checklist",
  tenant_verification: "tenant_verification",
  rent_receipt:        "rent_receipt",
  notice:              "notice",
  inspection_report:   "inspection_report",
  maintenance_report:  "maintenance_report",
  tenant_document:     "tenant_document",
  signed_document:     "signed_document",
  contract:            "contract",
  other:               "other",
};

const VALID_DOC_TYPES = [
  "lease_agreement", "lease_addendum", "notice", "inspection_report",
  "property_image",  "maintenance_report", "tenant_document",
  "signed_document", "contract", "other",
];

const resolveDocType = (doc) => {
  const raw = doc?.document_type || doc?.template_type || doc?.type || "other";
  return TEMPLATE_TYPE_MAP[raw] || (VALID_DOC_TYPES.includes(raw) ? raw : "other");
};

/* ─────────────────────────────────────────────
   DOC INFO CARD
───────────────────────────────────────────── */
const DocInfoCard = ({ doc }) => (
  <View style={styles.docInfoCard}>
    <HStack alignItems="center" space={3}>
      <View style={styles.docIconBox}>
        <AppIcon name={icons.Document} height={hp(2.6)} width={hp(2.6)} />
      </View>
      <VStack flex={1}>
        <Text style={styles.docInfoName} numberOfLines={2}>
          {doc?.filename || doc?.name || "Document"}
        </Text>
        <Text style={styles.docInfoType}>
          {doc?.document_type || doc?.type || "Document"}
        </Text>
        {doc?.description ? (
          <Text style={styles.docInfoDesc} numberOfLines={2}>{doc.description}</Text>
        ) : null}
      </VStack>
    </HStack>
  </View>
);

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const SignDocumentScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const dispatch   = useDispatch();

  const {
    document:   doc,
    landlordId: routeLandlordId,
    propertyId: routePropertyId,
  } = route.params || {};

  const { actionLoading, uploadLoading } =
    useSelector(documentsSelectors.getDocumentsData);

  const userData = useSelector((state) => {
    const src = state?.auth || state?.login || state?.loginData || state?.user || {};
    return src?.userData || src?.data || src || {};
  });

  const landlordContact   = useSelector(tenantsSelectors.getLandlordContact);
  const isLandlordLoading = useSelector(tenantsSelectors.isLoadingLandlordContact);

  useEffect(() => {
    if (!landlordContact) dispatch(getLandlordContact());
  }, [dispatch, landlordContact]);

  const resolvedLandlordId = landlordContact?.id || routeLandlordId || null;
  const signerName =
    userData?.name || userData?.full_name || userData?.firstName || "Tenant";

  const signatureRef                       = useRef(null);
  const [hasSignature,   setHasSignature]  = useState(false);
  const [signatureUri,   setSignatureUri]  = useState(null);
  const [signing,        setSigning]       = useState(false);
  const [previewVisible, setPreviewVisible]= useState(false);
  const [gallerySignatureUri, setGallerySignatureUri] = useState(null); // display URI
const [isGalleryMode,       setIsGalleryMode]       = useState(false);

const pickSignatureFromGallery = useCallback(() => {
  launchImageLibrary(
    {
      mediaType: "photo",
      includeBase64: true,   // needed for S3 upload (same as canvas flow)
      quality: 1,
      selectionLimit: 1,
    },
    (response) => {
      if (response.didCancel || response.errorCode) return;

      const asset = response.assets?.[0];
      if (!asset?.base64) {
        Toast.show("Could not read image. Please try another photo.");
        return;
      }

      const dataUri = `data:image/png;base64,${asset.base64}`;
 setGallerySignatureUri(asset.uri);   // for display in Image component
      setSignatureUri(dataUri);            // ← same state the sign flow already uses ✅
      setHasSignature(true);               // ← enables Submit button ✅
      setIsGalleryMode(true);
    }
  );
}, []);



  const isLoading = signing || actionLoading || uploadLoading || isLandlordLoading;

  // ── Document preview source ──────────────────
  const htmlContent = doc?.html || doc?.htmlContent || null;
  const pdfBase64   = doc?.pdf_base64 || doc?.pdf || null;
  const pdfUrl      = doc?.download_url || doc?.file_url || null;

  const wrappedHtml = htmlContent
    ? `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
        <style>*{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,sans-serif;padding:20px;
             line-height:1.7;color:#1a1a1a;background:#fff}
        h1,h2,h3{margin:14px 0 8px}p{margin-bottom:10px}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        td,th{border:1px solid #ddd;padding:8px;font-size:13px}
        </style></head><body>${htmlContent}</body></html>`
    : null;

  const previewSource = wrappedHtml
    ? { html: wrappedHtml }
    : pdfBase64 && Platform.OS === "android"
      ? { uri: `data:application/pdf;base64,${pdfBase64}` }
    : pdfUrl ? { uri: pdfUrl }
    : null;

  const hasDocPreview = !!previewSource;

  /* ── Canvas callbacks ── */
  const handleSignatureOK = useCallback((sig) => {
    setSignatureUri(sig);
    setHasSignature(!!sig && sig !== "data:,");
  }, []);
  const handleBegin  = useCallback(() => { setHasSignature(false); setSignatureUri(null); }, []);
  const handleClear  = useCallback(() => { signatureRef.current?.clearSignature(); setHasSignature(false);
  setSignatureUri(null);
   setGallerySignatureUri(null);    // ← ADD
  setIsGalleryMode(false);
   }, []);
  const readSignature= useCallback(() => { signatureRef.current?.readSignature(); }, []);

  /* ─────────────────────────────────────────────
     SIGN FLOW
  ───────────────────────────────────────────── */
  const handleConfirmSign = useCallback(async () => {
  if (!hasSignature || !signatureUri) {
    Toast.show("Please draw your signature first");
    return;
  }

  Alert.alert(
    "Confirm Signature",
    "By signing, you agree to the terms of this document. This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign",
        onPress: async () => {
          setSigning(true);
          try {
            const docName  = doc?.filename || doc?.name || "Document";

            // ── Get IDs ───────────────────────────────────────────────────
            const documentId = doc?.document_id || doc?.id || doc?.documentId || null;
            const uploadedBy =
              userData?.tenantId || userData?.id ||
              userData?.userId   || userData?.tenant_id || null;
            const landlordId = resolvedLandlordId;
            const propertyId = routePropertyId || null;

            if (!uploadedBy) { Toast.show("User session error"); setSigning(false); return; }
            if (!landlordId) { Toast.show("Could not fetch landlord info"); setSigning(false); return; }

            // ── Step 1: Extract signature base64 ──────────────────────────
            const sigBase64 = signatureUri?.includes(",")
              ? signatureUri.split(",")[1]
              : signatureUri;

            const signedAt = new Date().toISOString();

            // ── Step 2: Build merged HTML ──────────────────────────────────
            const mergedHtml = buildSignedDocHtml(
              doc?.html || doc?.htmlContent || "",
              sigBase64,
              signerName,
              signedAt,
            );
            console.log("✅ Merged signed HTML built");

            // ── Step 3: Upload signature PNG to S3 ────────────────────────
            let sigPngUrl = null;
            try {
              const pngFileName = `sig_${documentId || Date.now()}_${Date.now()}.png`;

              const pngResult = await dispatch(
                getDocumentUploadUrl({ fileName: pngFileName, fileType: "image/png", folder: "uploads" })
              ).unwrap();

              await dispatch(
                uploadFileToS3({
                  uploadUrl: pngResult.uploadUrl,
                  fileUri:   signatureUri,
                  fileType:  "image/png",
                })
              ).unwrap();

              sigPngUrl = pngResult.fileUrl || pngResult.url || null;
              console.log("✅ Signature PNG uploaded to S3:", sigPngUrl);
            } catch (uploadErr) {
              console.warn("⚠️ PNG upload failed:", uploadErr.message);
            }

            if (!sigPngUrl) {
              Toast.show("Failed to upload signature. Please try again.");
              setSigning(false);
              return;
            }

            // ── Step 4: POST signed_document (only one createDocument call) ──
            await dispatch(
              createDocument({
                documentData: {
                  type:       "signed_document",
                  name:       docName,
                  fileUrl:    sigPngUrl,
                  status:     "signed",
                  uploadedBy,
                  ...(doc?.tenantId ? { tenantId: doc.tenantId } : uploadedBy ? { tenantId: uploadedBy } : {}),
                  ...(landlordId    ? { landlordId }             : {}),
                  ...(propertyId    ? { propertyId }             : {}),
                },
              })
            ).unwrap();
            console.log("✅ signed_document created — fileUrl:", sigPngUrl);

            // ── Step 5: Save to AsyncStorage ──────────────────────────────
            try {
              const storagePayload = JSON.stringify({ sigBase64, signerName, signedAt, sigPngUrl });
              await AsyncStorage.setItem(`sig_${documentId}`, storagePayload);
              await AsyncStorage.setItem(`sig_url_${documentId}`, sigPngUrl);
              console.log("✅ Signature saved to AsyncStorage");
            } catch (storageErr) {
              console.warn("⚠️ AsyncStorage save failed:", storageErr.message);
            }

            setSigning(false);
            Alert.alert(
              "Document Signed ✓",
              "Your signature has been submitted and saved.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    dispatch(getDocuments({}));
                    navigation.goBack();
                  },
                },
              ]
            );

          } catch (err) {
            setSigning(false);
            console.warn("Sign flow error:", err);
          }
        },
      },
    ]
  );
}, [
  hasSignature, signatureUri, doc, dispatch,
  signerName, navigation, resolvedLandlordId, routePropertyId, userData,
]);

  const webStyle = `
    .m-signature-pad { border: none; box-shadow: none; }
    .m-signature-pad--body { border: none; }
    body { margin: 0; padding: 0; background: transparent; }
  `;

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <>
      <Container scroll={false}>
        <View style={styles.headerContainer}>
          <HStack alignItems="center" space={2}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              disabled={isLoading}
            >
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>
            <VStack flex={1}>
              <Text style={styles.title}>Sign Document</Text>
              <Text style={styles.subtitle}>Draw your signature below</Text>
            </VStack>
          </HStack>
        </View>

    
        <View style={styles.mainContent}>
          <DocInfoCard doc={doc} />

          {hasDocPreview && (
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setPreviewVisible(true)}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.previewBtnText}>📄  Preview Document</Text>
            </TouchableOpacity>
          )}


      <View style={styles.signatureWrapper}>
  <Text style={styles.signatureLabelText}>Your Signature</Text>

  {/* Upload from Gallery button */}
  <TouchableOpacity
    style={styles.galleryBtn}
    onPress={pickSignatureFromGallery}
    activeOpacity={0.8}
    disabled={isLoading}
  >
    <Text style={styles.galleryBtnText}>🖼️  Upload Signature from Gallery</Text>
  </TouchableOpacity>

  <View style={styles.signatureBox}>
    {isGalleryMode && gallerySignatureUri ? (
      /* Show picked image when in gallery mode */
      <>
        <Image
          source={{ uri: gallerySignatureUri }}
          style={styles.galleryPreviewImage}
          resizeMode="contain"
        />
        <Text style={styles.galleryHint}>Signature uploaded from gallery</Text>
      </>
    ) : (
      /* Show draw canvas (existing, untouched) */
      <>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleSignatureOK}
          onBegin={handleBegin}
          onEmpty={() => setHasSignature(false)}
          descriptionText="" clearText="" confirmText=""
          webStyle={webStyle}
          backgroundColor="transparent"
          penColor="#1a1a1a"
          style={styles.canvas}
        />
        <View style={styles.signatureLine} />
        <Text style={styles.signatureHint}>Sign above the line</Text>
      </>
    )}
  </View>
</View>

          <View style={styles.signerInfo}>
            <Text style={styles.signerInfoText}>
              Signing as: <Text style={styles.signerName}>{signerName}</Text>
            </Text>
            <Text style={styles.signerDate}>
              Date: {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>

          <HStack space={3} style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7} disabled={isLoading}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.readBtn} onPress={readSignature} activeOpacity={0.7} disabled={isLoading}>
              <Text style={styles.readBtnText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, (!hasSignature || isLoading) && styles.confirmBtnDisabled]}
              onPress={handleConfirmSign}
              activeOpacity={0.8}
              disabled={!hasSignature || isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.confirmBtnText}>Submit Signature</Text>
              }
            </TouchableOpacity>
          </HStack>
</View>
        
      
      </Container>

      {hasDocPreview && (
        <Modal visible={previewVisible} transparent={false} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <View style={styles.previewModalHeader}>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} style={{ paddingVertical: 6 }}>
                <Text style={styles.previewModalClose}>✕  Close</Text>
              </TouchableOpacity>
              <Text style={styles.previewModalTitle} numberOfLines={1}>{doc?.filename || "Document Preview"}</Text>
              <View style={{ width: 60 }} />
            </View>
            <WebView source={previewSource} originWhitelist={["*"]} javaScriptEnabled={false} scrollEnabled style={{ flex: 1 }} />
          </View>
        </Modal>
      )}
    </>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  headerContainer:    { paddingTop: hp(2), paddingBottom: hp(1.5), paddingHorizontal: wp(5) },
  title:              { fontSize: hp(2.5), fontWeight: "bold", color: "#000" },
  subtitle:           { fontSize: hp(1.5), color: Colors.textGray, marginTop: hp(0.2) },
mainContent: {
  flex: 1,
  paddingHorizontal: wp(4),
  paddingBottom: hp(2),
  justifyContent: "flex-start",
},
  docInfoCard:        { backgroundColor: "#fff", borderRadius: 14, padding: hp(2), marginBottom: hp(1.5), shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  docIconBox:         { backgroundColor: "rgba(229,57,53,0.12)", padding: hp(1.4), borderRadius: 12, alignSelf: "center" },
  docInfoName:        { fontSize: hp(1.9), fontWeight: "700", color: "#1a1a1a" },
  docInfoType:        { fontSize: hp(1.5), color: Colors.textGray, marginTop: hp(0.2) },
  docInfoDesc:        { fontSize: hp(1.4), color: "#666", marginTop: hp(0.4), lineHeight: hp(2) },
  instructionBox:     { backgroundColor: "#E3F2FD", borderRadius: 10, padding: hp(1.4), marginBottom: hp(2), borderWidth: 1, borderColor: "#90CAF9" },
  instructionText:    { fontSize: hp(1.5), color: "#1565C0", lineHeight: hp(2.2) },
  signatureWrapper:   { marginBottom: hp(1.5) },
  signatureLabelText: { fontSize: hp(1.5), color: "#555", fontWeight: "600", marginBottom: hp(0.6) },
  signatureBox:       { height: hp(28), backgroundColor: "#FAFAFA", borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E0E0", overflow: "hidden", position: "relative" },
  canvas:             { flex: 1, width: "100%", height: "100%" },
  signatureLine:      { position: "absolute", bottom: hp(4.5), left: wp(6), right: wp(6), height: 1, backgroundColor: "#BDBDBD" },
  signatureHint:      { position: "absolute", bottom: hp(2), left: 0, right: 0, textAlign: "center", fontSize: hp(1.3), color: "#BDBDBD" },
  signerInfo:         { backgroundColor: "#F5F5F5", borderRadius: 10, padding: hp(1.4), marginBottom: hp(2) },
  signerInfoText:     { fontSize: hp(1.5), color: "#555" },
  signerName:         { fontWeight: "700", color: "#1a1a1a" },
  signerDate:         { fontSize: hp(1.4), color: Colors.textGray, marginTop: hp(0.4) },
  actions:            { marginBottom: hp(2) },
  clearBtn:           { paddingVertical: hp(1.6), paddingHorizontal: wp(4), borderRadius: 12, borderWidth: 1, borderColor: "#E0E0E0", alignItems: "center", justifyContent: "center" },
  clearBtnText:       { fontSize: hp(1.7), color: "#666", fontWeight: "600" },
  readBtn:            { paddingVertical: hp(1.6), paddingHorizontal: wp(4), borderRadius: 12, borderWidth: 1, borderColor: Colors.red, alignItems: "center", justifyContent: "center" },
  readBtnText:        { fontSize: hp(1.7), color: Colors.red, fontWeight: "600" },
  confirmBtn:         { flex: 1, paddingVertical: hp(1.6), borderRadius: 12, backgroundColor: Colors.red, alignItems: "center", justifyContent: "center" },
  confirmBtnDisabled: { backgroundColor: "#FFCDD2" },
  confirmBtnText:     { fontSize: hp(1.7), color: "#fff", fontWeight: "700" },
  previewBtn:         { backgroundColor: "#E3F2FD", borderRadius: 10, paddingVertical: hp(1.4), alignItems: "center", marginBottom: hp(1.5), borderWidth: 1, borderColor: "#90CAF9" },
  previewBtnText:     { fontSize: hp(1.7), color: "#1565C0", fontWeight: "600" },
  previewModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(1.5), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  previewModalClose:  { fontSize: hp(1.7), color: "#666", fontWeight: "500" },
  previewModalTitle:  { flex: 1, textAlign: "center", fontSize: hp(1.9), fontWeight: "700", color: "#1a1a1a" },
  disclaimer:         { fontSize: hp(1.3), color: Colors.textGray, textAlign: "center", lineHeight: hp(1.9), marginTop: hp(0.5) },
  // ADD inside StyleSheet.create({...}) before the closing })
galleryBtn: {
  backgroundColor: "#F3F0FF",
  borderRadius: 10,
  paddingVertical: hp(1.3),
  alignItems: "center",
  marginBottom: hp(1),
  borderWidth: 1,
  borderColor: "#C5B4F5",
},
galleryBtnText: {
  fontSize: hp(1.6),
  color: "#5C35CC",
  fontWeight: "600",
},
galleryPreviewImage: {
  flex: 1,
  width: "100%",
  height: "85%",
},
galleryHint: {
  position: "absolute",
  bottom: hp(2),
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: hp(1.3),
  color: "#5C35CC",
},
});

export default SignDocumentScreen;
