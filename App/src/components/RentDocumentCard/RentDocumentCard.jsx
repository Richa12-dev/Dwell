
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { HStack, Text, VStack } from "native-base";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';

const DOC_TYPE_LABELS = {
  lease_agreement: "Lease Agreement",
  lease_renewal: "Lease Renewal",
  lease_addendum: "Lease Addendum",
  move_in_checklist: "Move-In Checklist",
  move_out_checklist: "Move-Out Checklist",
  tenant_verification: "Tenant Verification",
  rent_receipt: "Rent Receipt",
  notice: "Notice",
  inspection_report: "Inspection Report",
  maintenance_report: "Maintenance Report",
  tenant_document: "Tenant Document",
  signed_document: "Signed Document",
  contract: "Contract",
  other: "Other",
};

const RentDocumentCard = ({ item, onPreview, onSign }) => {
  const isSigned = item.status === "signed";
  const typeLabel =
    DOC_TYPE_LABELS[item.document_type] || item.document_type || "";

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const signedDate = fmtDate(item.signed_at);

  return (
    <View style={styles.card}>
      {/* Top Accent */}
      <View
        style={[
          styles.accent,
          isSigned ? styles.accentSigned : styles.accentUnsigned,
        ]}
      />

      <View style={styles.body}>
        <HStack alignItems="flex-start" space={2}>
          {/* Icon */}
          <View style={[styles.iconBox, isSigned && styles.iconBoxSigned]}>
            <Text style={styles.iconEmoji}>{item.icon}</Text>
          </View>

          <VStack flex={1}>
            {/* Title + Badge */}
            <HStack
              alignItems="flex-start"
              justifyContent="space-between"
              space={2}
            >
              <Text style={styles.filename} flex={1} numberOfLines={2}>
                {item.filename}
              </Text>

              <View
                style={[
                  styles.badge,
                  isSigned ? styles.badgeSigned : styles.badgeUnsigned,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isSigned
                      ? styles.badgeTextSigned
                      : styles.badgeTextUnsigned,
                  ]}
                >
                  {isSigned ? "✓ Signed" : "Needs Signature"}
                </Text>
              </View>
            </HStack>

            {/* Type */}
            {typeLabel ? (
              <Text style={styles.typeLabel}>{typeLabel}</Text>
            ) : null}

            {/* Signed Date */}
            {isSigned && signedDate ? (
              <Text style={styles.signedDate}>Signed on {signedDate}</Text>
            ) : null}

            {/* Buttons */}
            <HStack space={2} mt={hp(1.4)}>
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => onPreview(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.previewBtnText}>Preview</Text>
              </TouchableOpacity>

              {isSigned ? (
                <View style={styles.signedTag}>
                  <Text style={styles.signedTagText}>✓ Signed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.signBtn}
                  onPress={() => onSign(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signBtnText}>✍ Sign</Text>
                </TouchableOpacity>
              )}
            </HStack>
          </VStack>
        </HStack>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundColor,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  accent: { height: 4 },
  accentSigned: { backgroundColor: "#2E7D32" },
  accentUnsigned: { backgroundColor: Colors.red },

  body: { padding: hp(1.8) },

  iconBox: {
    width: hp(5.5),
    height: hp(5.5),
    borderRadius: 14,
    backgroundColor: "rgba(229,57,53,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  iconBoxSigned: {
    backgroundColor: "rgba(46,125,50,0.10)",
  },

  iconEmoji: {
    fontSize: hp(2.4),
  },

  filename: {
    fontSize: hp(2),
    fontWeight: "700",
    color: "#1a1a1a",
    lineHeight: hp(2.5),
  },

  typeLabel: {
    fontSize: hp(1.5),
    color: Colors.textGray,
    marginTop: hp(0.3),
  },

  signedDate: {
    fontSize: hp(1.4),
    color: "#2E7D32",
    fontWeight: "500",
    marginTop: hp(0.4),
  },

  badge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.45),
    borderRadius: 20,
    borderWidth: 1,
  },

  badgeSigned: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },

  badgeUnsigned: {
    backgroundColor: "#FFEBEE",
    borderColor: "#EF9A9A",
  },

  badgeText: {
    fontSize: hp(1.25),
    fontWeight: "700",
  },

  badgeTextSigned: {
    color: "#2E7D32",
  },

  badgeTextUnsigned: {
    color: "#C62828",
  },

  previewBtn: {
    flex: 1,
    paddingVertical: hp(1),
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },

  previewBtnText: {
    color: Colors.red,
    fontSize: hp(1.55),
    fontWeight: "700",
  },

  signBtn: {
    flex: 1,
    paddingVertical: hp(1),
    borderRadius: 10,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },

  signBtnText: {
    color: "#fff",
    fontSize: hp(1.55),
    fontWeight: "700",
  },

  signedTag: {
    flex: 1,
    paddingVertical: hp(1),
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    alignItems: "center",
    justifyContent: "center",
  },

  signedTagText: {
    color: "#2E7D32",
    fontSize: hp(1.55),
    fontWeight: "700",
  },
});

export default RentDocumentCard;
