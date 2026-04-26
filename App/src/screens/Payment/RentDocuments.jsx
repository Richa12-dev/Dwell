import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  FlatList,
  Modal,
} from "react-native";
// Install with: npm install react-native-webview
import { WebView } from "react-native-webview";
import { Box, Text, VStack, HStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { useNavigation } from "@react-navigation/native";
// ✅ FIXED: was importing non-existent getRentDocuments from Rent/services
//           and rentSelectors from rentSlice — RentDocuments uses the Documents slice
import { getDocuments } from "../../Redux/Documents/documentsServicesNode";
import { documentsSelectors } from "../../Redux/Documents/documentsSlice";
// Install with: npm install react-native-signature-canvas
import SignatureCanvas from "react-native-signature-canvas";

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
    label: "Pending Signature",
    bg: "#FFF8E1",
    text: "#F57F17",
    border: "#FFE082",
  },
  unsigned: {
    label: "Needs Signature",
    bg: "#FFEBEE",
    text: "#C62828",
    border: "#EF9A9A",
  },
};

/* ─────────────────────────────────────────────
   SIGN MODAL
   Full-screen signature pad. On confirm:
   1. Captures base64 PNG of signature
   2. TODO: merge with PDF then upload to S3
   3. Updates doc status to "signed" locally
───────────────────────────────────────────── */
const SignModal = ({ visible, document, onClose, onSigned }) => {
  const sigRef = useRef(null);
  const [signing, setSigning] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    sigRef.current?.clearSignature();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature) {
      Toast.show("Please draw your signature first");
      return;
    }
    sigRef.current?.readSignature();
  };

  // Called by SignatureCanvas after readSignature()
  const handleSignatureOK = async (signatureBase64) => {
    try {
      setSigning(true);

      // ── TODO: when your API is ready ──────────────────────────────
      // 1. Download the PDF from document.download_url or file_url
      // 2. Overlay the signature PNG onto the PDF
      //    (use react-native-pdf-lib or send both to your backend)
      // 3. Upload signed PDF to S3
      // 4. PATCH /documents/{document_id} with:
      //    { status: "signed", signed_at: new Date().toISOString(),
      //      file_url: <new S3 url> }
      // ─────────────────────────────────────────────────────────────

      // Simulate 1.5s upload for now
      await new Promise((r) => setTimeout(r, 1500));

      const docId = document?.document_id || document?.key;
      onSigned(docId, signatureBase64);
      Toast.show("Document signed successfully!");
    } catch {
      Toast.show("Failed to save signature. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  const handleSignatureEmpty = () => {
    Toast.show("Signature is empty — please draw first");
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={signStyles.container}>
        {/* Header */}
        <View style={signStyles.header}>
          <TouchableOpacity onPress={onClose} style={signStyles.closeBtn} disabled={signing}>
            <Text style={signStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={signStyles.headerTitle}>Sign Document</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Doc name preview */}
        {document && (
          <View style={signStyles.docPreview}>
            <AppIcon name={icons.Document} height={hp(2.2)} width={hp(2.2)} />
            <Text style={signStyles.docName} numberOfLines={1}>
              {document.filename}
            </Text>
          </View>
        )}

        <Text style={signStyles.instruction}>
          Draw your signature in the box below
        </Text>

        {/* Signature pad */}
        <View style={signStyles.sigBox}>
          <SignatureCanvas
            ref={sigRef}
            onOK={handleSignatureOK}
            onEmpty={handleSignatureEmpty}
            onBegin={() => setHasSignature(true)}
            descriptionText=""
            clearText="Clear"
            confirmText="Confirm"
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; margin: 0px; }
              body, html { margin: 0; padding: 0; background: transparent; }
            `}
            style={signStyles.sigCanvas}
          />
        </View>

        {/* Action buttons */}
        <HStack space={3} style={signStyles.actions}>
          <TouchableOpacity
            style={signStyles.clearBtn}
            onPress={handleClear}
            disabled={signing}
            activeOpacity={0.7}
          >
            <Text style={signStyles.clearBtnText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              signStyles.confirmBtn,
              (!hasSignature || signing) && signStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!hasSignature || signing}
            activeOpacity={0.8}
          >
            {signing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={signStyles.confirmBtnText}>Confirm & Sign</Text>
            )}
          </TouchableOpacity>
        </HStack>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   SIGNED DOC VIEW MODAL
   Shows the PDF in a WebView with the tenant's
   signature overlaid at the bottom-right corner.
   When the backend is ready, swap the WebView
   source for the signed S3 URL directly.
───────────────────────────────────────────── */
const SignedDocViewModal = ({ visible, document, signatureBase64, onClose }) => {
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const url = document?.download_url || document?.file_url;

  // Fetch the PDF as base64 from React Native (no CORS restrictions here).
  // We then pass the raw bytes directly to PDF.js inside the WebView so
  // it never needs to make a cross-origin request itself.
  useEffect(() => {
    if (!visible || !url) return;
    setPdfBase64(null);
    setFetchError(false);
    setPdfLoading(true);

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          // reader.result is "data:application/pdf;base64,XXXX..."
          // PDF.js needs just the raw base64 string
          const base64 = reader.result.split(",")[1];
          setPdfBase64(base64);
        };
        reader.onerror = () => setFetchError(true);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("PDF fetch error:", e);
        setFetchError(true);
        setPdfLoading(false);
      }
    })();
  }, [visible, url]);

  // Keywords that mark a signature line in any of our document types.
  // Add more as new document templates are introduced.
  const SIG_KEYWORDS = [
    "authorized signatory",
    "tenant signature",
    "tenant's signature",
    "signature of tenant",
    "signed by tenant",
    "tenant sign",
    "signature",
    "signed by",
    "authorised signatory",
  ];

  // Renders the PDF with PDF.js (loaded from CDN), scans every text item
  // on every page for a signature-line keyword, then absolutely positions
  // the signature image right on top of that line — no manual offsets needed.
  const buildHtml = (pdfBase64Data, sigBase64, sigDate) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%; background: #888;
            font-family: -apple-system, sans-serif;
            overflow-x: hidden;
          }
          #scroll-container {
            width: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .page-wrapper {
            position: relative;
            margin: 12px auto;
            box-shadow: 0 2px 12px rgba(0,0,0,0.35);
            background: #fff;
            display: block;
          }
          canvas { display: block; width: 100% !important; }

          /* Signature overlay — injected by JS after scan */
          .sig-overlay {
            position: absolute;
            pointer-events: none;
            z-index: 50;
          }
          .sig-inner {
            border-bottom: 1.8px solid #1a1a1a;
            padding-bottom: 3px;
            margin-bottom: 3px;
          }
          .sig-img {
            display: block;
            object-fit: contain;
          }
          .sig-meta {
            font-size: 8px;
            color: #444;
            line-height: 1.5;
          }
          .sig-meta b {
            display: block;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #2E7D32;
          }
          #loading {
            color: #fff;
            text-align: center;
            padding: 40px 20px;
            font-size: 14px;
          }
          #error-msg {
            display: none;
            color: #fff;
            text-align: center;
            padding: 40px 20px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div id="loading">Loading document…</div>
        <div id="error-msg">Could not load document.</div>
        <div id="scroll-container"></div>

        <script>
          const PDF_B64     = ${JSON.stringify(pdfBase64Data || "")};
          const SIG_BASE64 = ${JSON.stringify(sigBase64 || "")};
          const SIG_DATE   = ${JSON.stringify(sigDate || "")};
          const KEYWORDS   = ${JSON.stringify(SIG_KEYWORDS)};

          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          // ── helpers ───────────────────────────────────────────────────
          function matchesKeyword(str) {
            const lower = str.toLowerCase().trim();
            return KEYWORDS.some(k => lower.includes(k));
          }

          // Place the signature image on a canvas page at (x, y) in PDF coords.
          // scaleX/scaleY convert PDF units → CSS pixels on screen.
          function placeSignature(wrapper, canvasEl, x, y, scaleX, scaleY, canvasHeight) {
            // y in PDF is bottom-up; canvas is top-down
            const cssTop  = canvasEl.offsetHeight - (y * scaleY) - 4;
            const cssLeft = x * scaleX;

            const sigW = Math.min(180, wrapper.offsetWidth * 0.50);
            const sigH = 48;

            const div = document.createElement("div");
            div.className = "sig-overlay";
            div.style.top    = cssTop + "px";
            div.style.left   = cssLeft + "px";
            div.style.width  = sigW + "px";

            div.innerHTML = \`
              <div class="sig-inner">
                <img class="sig-img" src="\${SIG_BASE64}"
                     style="width:\${sigW}px;height:\${sigH}px;" />
              </div>
              <div class="sig-meta">
                <b>Tenant Signature</b>
                \${SIG_DATE}
              </div>
            \`;
            wrapper.appendChild(div);
          }

          // ── main render ───────────────────────────────────────────────
          async function renderPDF() {
            try {
              // Decode base64 → Uint8Array so PDF.js never makes a network request
              const binary = atob(PDF_B64);
              const bytes  = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

              const loadingTask = pdfjsLib.getDocument({ data: bytes });
              const pdf = await loadingTask.promise;

              document.getElementById("loading").style.display = "none";
              const container = document.getElementById("scroll-container");

              const viewportWidth = window.innerWidth;

              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page     = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1 });
                const scale    = viewportWidth / viewport.width;
                const scaled   = page.getViewport({ scale });

                // Wrapper div (position:relative so overlay is anchored to it)
                const wrapper = document.createElement("div");
                wrapper.className = "page-wrapper";
                wrapper.style.width  = viewportWidth + "px";
                wrapper.style.height = scaled.height + "px";

                const canvas  = document.createElement("canvas");
                canvas.width  = scaled.width;
                canvas.height = scaled.height;
                canvas.style.width  = viewportWidth + "px";
                canvas.style.height = scaled.height + "px";

                wrapper.appendChild(canvas);
                container.appendChild(wrapper);

                await page.render({
                  canvasContext: canvas.getContext("2d"),
                  viewport: scaled,
                }).promise;

                // ── scan text for signature keyword ───────────────────
                if (SIG_BASE64) {
                  const textContent = await page.getTextContent();
                  const scaleX = scaled.width  / viewport.width;
                  const scaleY = scaled.height / viewport.height;

                  let placed = false;
                  for (const item of textContent.items) {
                    if (placed) break;
                    if (matchesKeyword(item.str)) {
                      // item.transform = [sx, 0, 0, sy, tx, ty]
                      // tx, ty are in PDF user units (origin bottom-left)
                      const tx = item.transform[4];
                      const ty = item.transform[5];
                      placeSignature(wrapper, canvas, tx, ty, scaleX, scaleY, scaled.height);
                      placed = true;
                    }
                  }
                }
              }
            } catch (e) {
              console.error("PDF render error:", e);
              document.getElementById("loading").style.display = "none";
              document.getElementById("error-msg").style.display = "block";
            }
          }

          renderPDF();
        </script>
      </body>
    </html>
  `;

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={viewStyles.container}>
        {/* Header */}
        <View style={viewStyles.header}>
          <TouchableOpacity onPress={onClose} style={viewStyles.closeBtn}>
            <Text style={viewStyles.closeBtnText}>✕  Close</Text>
          </TouchableOpacity>
          <Text style={viewStyles.headerTitle} numberOfLines={1}>
            {document?.filename || "Document"}
          </Text>
          {/* Signed badge */}
          <View style={viewStyles.signedBadge}>
            <Text style={viewStyles.signedBadgeText}>✓ Signed</Text>
          </View>
        </View>


        {/* PDF viewer */}
        {fetchError ? (
          <View style={viewStyles.noUrl}>
            <Text style={viewStyles.noUrlText}>Could not load document.{"\n"}Please check your connection.</Text>
          </View>
        ) : !url ? (
          <View style={viewStyles.noUrl}>
            <Text style={viewStyles.noUrlText}>Document URL not available</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Show spinner while fetching PDF bytes OR while WebView is rendering */}
            {(!pdfBase64 || pdfLoading) && (
              <View style={viewStyles.pdfLoader}>
                <ActivityIndicator size="large" color={Colors.red} />
                <Text style={viewStyles.pdfLoaderText}>
                  {!pdfBase64 ? "Fetching document…" : "Rendering pages…"}
                </Text>
              </View>
            )}
            {/* Only mount WebView once we have the base64 bytes */}
            {pdfBase64 && (
              <WebView
                source={{ html: buildHtml(pdfBase64, signatureBase64, formatDate(document?.signed_at)) }}
                style={[viewStyles.webview, pdfLoading && { opacity: 0 }]}
                onLoadEnd={() => setPdfLoading(false)}
                onError={() => {
                  setPdfLoading(false);
                  Toast.show("Could not render document");
                }}
                originWhitelist={["*"]}
                allowFileAccess
                allowUniversalAccessFromFileURLs
                startInLoadingState={false}
                javaScriptEnabled
                scrollEnabled
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};


const DocumentCard = ({ item, onView, onSign, downloading }) => {
  const rawStatus = (item?.status || "unsigned").toLowerCase();
  const statusCfg = STATUS_CONFIG[rawStatus] || STATUS_CONFIG.unsigned;
  const canSign = rawStatus === "pending" || rawStatus === "unsigned";
  const isSigned = rawStatus === "signed";
  const docKey = item?.document_id || item?.key;

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
          {/* Filename + status badge */}
          <HStack alignItems="center" justifyContent="space-between" mb={0.5}>
            <Text style={styles.docFilename} numberOfLines={1} flex={1} mr={2}>
              {item.filename}
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

          {/* Meta */}
          <Text style={styles.docMeta}>
            {formatFileSize(item.size)} · {formatDate(item.last_modified || item.created_at)}
          </Text>

          {/* Signed timestamp */}
          {isSigned && item.signed_at && (
            <Text style={styles.signedAt}>
              ✓ Signed {formatDate(item.signed_at)}
            </Text>
          )}

          {/* Actions */}
          <HStack space={2} mt={2}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => onView(item)}
              disabled={downloading === docKey}
              activeOpacity={0.7}
            >
              {downloading === docKey ? (
                <ActivityIndicator size="small" color={Colors.red} />
              ) : (
                <HStack alignItems="center" space={1}>
                  <AppIcon name={icons.Download} height={hp(1.8)} width={hp(1.8)} />
                  <Text style={styles.viewBtnText}>View</Text>
                </HStack>
              )}
            </TouchableOpacity>

            {/* Sign — only if not signed yet */}
            {canSign && (
              <TouchableOpacity
                style={styles.signBtn}
                onPress={() => onSign(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.signBtnText}>✍  Sign</Text>
              </TouchableOpacity>
            )}

            {/* Signed indicator */}
            {isSigned && (
              <View style={styles.signedTag}>
                <Text style={styles.signedTagText}>✓  Signed</Text>
              </View>
            )}
          </HStack>
        </VStack>
      </HStack>
    </View>
  );
};

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const RentDocuments = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // ── Auth — same pattern as Dashboard.jsx ──
  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.accessToken;
  const tenantId = loginData?.userData?.tenantId;

  const [downloading, setDownloading] = useState(null);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Optimistic signed docs: map of { [docId]: { signatureBase64, signed_at } }
  const [localSignedDocs, setLocalSignedDocs] = useState({});

  // Signed doc view modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  // ✅ FIXED: rentSelectors.getRentData doesn't exist → was passing undefined to useSelector → CRASH
  //           Now correctly reads from the documents slice using documentsSelectors
  const { documents = [], loading, error } = useSelector(
    documentsSelectors.getDocumentsData
  );

  /* ── Fetch docs on mount
     getDocuments uses authFetch internally — no need to pass token manually.
     Pass no args for all docs, or { propertyId } to filter by property.
  ── */
  useEffect(() => {
    dispatch(getDocuments());
  }, [dispatch]);

  /* ── Merge backend docs with local signed overrides ── */
  const mergedDocuments = documents.map((doc) => {
    const id = doc?.document_id || doc?.key;
    const local = localSignedDocs[id];
    if (local) {
      return { ...doc, status: "signed", signed_at: local.signed_at };
    }
    return doc;
  });

  const stats = {
    total: mergedDocuments.length,
    pending: mergedDocuments.filter((d) =>
      ["pending", "unsigned"].includes((d.status || "unsigned").toLowerCase())
    ).length,
    signed: mergedDocuments.filter(
      (d) => (d.status || "").toLowerCase() === "signed"
    ).length,
  };

  /* ── Handlers ── */
  const handleView = async (doc) => {
    const id = doc?.document_id || doc?.key;
    const isSigned = (doc?.status || "").toLowerCase() === "signed";
    const localEntry = localSignedDocs[id];

    // If signed locally, show in-app viewer with signature overlay
    if (isSigned && localEntry?.signatureBase64) {
      setViewingDoc({ ...doc, signed_at: localEntry.signed_at });
      setViewModalVisible(true);
      return;
    }

    // Otherwise open the original PDF URL externally
    const url = doc?.download_url || doc?.file_url;
    if (!url) {
      Toast.show("Document not available yet");
      return;
    }
    try {
      setDownloading(id);
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Toast.show("Unable to open this document");
    } catch {
      Toast.show("Failed to open document");
    } finally {
      setDownloading(null);
    }
  };

  const handleSignPress = (doc) => {
    setSelectedDoc(doc);
    setSignModalVisible(true);
  };

  const handleSigned = (docId, signatureBase64) => {
    const signedAt = new Date().toISOString();
    setSignModalVisible(false);
    setSelectedDoc(null);
    setLocalSignedDocs((prev) => ({
      ...prev,
      [docId]: { signatureBase64, signed_at: signedAt },
    }));
    // TODO: dispatch(updateDocumentStatus({ documentId: docId, status: "signed", token }))
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <Container>
        <View style={styles.headerContainer}>
          <HStack alignItems="center" space={2}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>
            <Text style={styles.title}>Rent Documents</Text>
          </HStack>
        </View>
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
        <View style={styles.headerContainer}>
          <HStack alignItems="center" space={2}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>
            <Text style={styles.title}>Rent Documents</Text>
          </HStack>
        </View>
        <View style={styles.center}>
          <Text color="red.500" textAlign="center">{error}</Text>
          <TouchableOpacity style={styles.retryBtn}
            onPress={() => dispatch(getDocuments())}>
            <Text color={Colors.red}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  /* ── Empty ── */
  if (!mergedDocuments.length) {
    return (
      <Container>
        <View style={styles.headerContainer}>
          <HStack alignItems="center" space={2}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>
            <Text style={styles.title}>Rent Documents</Text>
          </HStack>
        </View>
        <View style={styles.center}>
          <AppIcon name={icons.Document} height={hp(6)} width={hp(6)} />
          <Text mt={3} fontSize={hp(2)} color={Colors.textGray} textAlign="center">
            No documents yet
          </Text>
          <Text fontSize={hp(1.5)} color={Colors.textGray} textAlign="center">
            Documents sent by your landlord will appear here
          </Text>
        </View>
      </Container>
    );
  }

  /* ── Main UI ── */
  return (
    <Container scroll={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center" space={2} flex={1}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>
            <Text style={styles.title}>Rent Documents</Text>
          </HStack>

          {/* Alert badge when docs need signing */}
          {stats.pending > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                {stats.pending} need{stats.pending === 1 ? "s" : ""} signature
              </Text>
            </View>
          )}
        </HStack>
      </View>

      {/* Stats bar */}
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
          <View style={[styles.statDot, { backgroundColor: "#888" }]} />
          <Text style={styles.statText}>{stats.total} Total</Text>
        </View>
      </View>

      {/* Document list */}
      <FlatList
        data={mergedDocuments}
        keyExtractor={(item, index) =>
          item?.document_id || item?.key || String(index)
        }
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={{ height: hp(1.4) }} />}
        renderItem={({ item }) => (
          <DocumentCard
            item={item}
            onView={handleView}
            onSign={handleSignPress}
            downloading={downloading}
          />
        )}
        ListFooterComponent={() => (
          <Box mt={hp(1)} mb={hp(1)}>
            <Text textAlign="center" fontSize={hp(1.4)} color={Colors.textGray}>
              Tap "Sign" to sign · Tap "View" to open
            </Text>
          </Box>
        )}
      />

      {/* Sign modal */}
      <SignModal
        visible={signModalVisible}
        document={selectedDoc}
        onClose={() => {
          setSignModalVisible(false);
          setSelectedDoc(null);
        }}
        onSigned={handleSigned}
      />

      {/* Signed doc viewer modal */}
      <SignedDocViewModal
        visible={viewModalVisible}
        document={viewingDoc}
        signatureBase64={
          viewingDoc
            ? localSignedDocs[viewingDoc?.document_id || viewingDoc?.key]?.signatureBase64
            : null
        }
        onClose={() => {
          setViewModalVisible(false);
          setViewingDoc(null);
        }}
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
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    paddingVertical: hp(1.2),
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
  pendingBadge: {
    backgroundColor: "#FFF8E1",
    borderRadius: 20,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  pendingBadgeText: {
    fontSize: hp(1.3),
    color: "#F57F17",
    fontWeight: "600",
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
  docMeta: {
    fontSize: hp(1.4),
    color: Colors.textGray,
    marginTop: hp(0.3),
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
    fontSize: hp(1.2),
    fontWeight: "600",
  },
  viewBtn: {
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    alignItems: "center",
    justifyContent: "center",
    minWidth: wp(16),
  },
  viewBtnText: {
    color: Colors.red,
    fontSize: hp(1.5),
    fontWeight: "600",
  },
  signBtn: {
    backgroundColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  signBtnText: {
    color: "#fff",
    fontSize: hp(1.5),
    fontWeight: "700",
  },
  signedTag: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  signedTagText: {
    color: "#2E7D32",
    fontSize: hp(1.5),
    fontWeight: "600",
  },
});

const signStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeBtn: { width: 60 },
  closeBtnText: {
    fontSize: hp(1.8),
    color: Colors.textGray,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "700",
    color: "#1a1a1a",
  },
  docPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.07)",
    borderRadius: 10,
    margin: wp(5),
    padding: hp(1.5),
    gap: 8,
  },
  docName: {
    fontSize: hp(1.7),
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  instruction: {
    textAlign: "center",
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginBottom: hp(1),
    paddingHorizontal: wp(5),
  },
  sigBox: {
    flex: 1,
    marginHorizontal: wp(5),
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  sigCanvas: { flex: 1 },
  actions: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
  },
  clearBtn: {
    flex: 1,
    paddingVertical: hp(1.8),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: hp(1.8),
    color: "#666",
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: hp(1.8),
    borderRadius: 12,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#FFCDD2",
  },
  confirmBtnText: {
    fontSize: hp(1.8),
    color: "#fff",
    fontWeight: "700",
  },
});

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  closeBtn: {
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(2),
  },
  closeBtnText: {
    fontSize: hp(1.7),
    color: Colors.textGray,
    fontWeight: "500",
  },
  headerTitle: {
    flex: 1,
    fontSize: hp(1.9),
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
  },
  signedBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  signedBadgeText: {
    fontSize: hp(1.2),
    color: "#2E7D32",
    fontWeight: "700",
  },
  webview: {
    flex: 1,
  },
  pdfLoader: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  pdfLoaderText: {
    marginTop: hp(1.5),
    fontSize: hp(1.6),
    color: Colors.textGray,
  },
  noUrl: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noUrlText: {
    fontSize: hp(1.8),
    color: Colors.textGray,
  },
});

export default RentDocuments;
