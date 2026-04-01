
import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

const PrivacyPolicy = () => {
  const navigation = useNavigation();

  return (
    <KeyboardAvoidingView
      style={styles.container2}
      behavior={Platform.OS === 'ios' ? 'padding' : ''}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>

          {/* ── Back button ───────────────────────────────────── */}

          
                     <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{top: 16, bottom: 16, left: 16, right: 16}}>
              <Text style={styles.header}>← Privacy Policy</Text>
            </TouchableOpacity>

          {/* ── Title ─────────────────────────────────────────── */}
       
          <Text style={styles.subHeader}>DwellProperties.ai Platform</Text>
          <Text style={styles.metaText}>
            Dwell Properties, LLC{'\n'}
            Effective Date: January 1, 2026 | Last Updated: March 2027
          </Text>
          <Text style={styles.introText}>
            At Dwell Properties, LLC, we are committed to protecting your
            privacy. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your personal information when you use
            the DwellProperties.ai platform. By using the Platform, you
            consent to the practices described here. If you do not agree,
            please discontinue use immediately.
          </Text>

          {/* ── 1. Information We Collect ─────────────────────── */}
          <Text style={styles.sectionHeader}>1. Information We Collect</Text>

          <Text style={styles.subSectionHeader}>a) Information You Provide</Text>
          <Text style={styles.text}>
            • Account details: name, email, phone number, and password.{'\n'}
            • Property info: addresses, unit details, lease dates, and rental amounts.{'\n'}
            • Maintenance content: issue descriptions, photos, videos, and location details.{'\n'}
            • Contractor profiles: business name, service categories, licenses, and insurance.{'\n'}
            • Payment and billing info (processed via third-party processors — we do not store card details).{'\n'}
            • Messages, support requests, and feedback submitted through the Platform.
          </Text>

          <Text style={styles.subSectionHeader}>b) Information Collected Automatically</Text>
          <Text style={styles.text}>
            • Device info: device type, OS, browser type, and unique device identifiers.{'\n'}
            • Usage data: pages visited, features used, time spent, and search queries.{'\n'}
            • Log data: IP address, access timestamps, and error logs.{'\n'}
            • Location data: approximate location via IP (precise location only if you grant permission).{'\n'}
            • Cookies and similar tracking technologies (see Section 8).
          </Text>

          <Text style={styles.subSectionHeader}>c) Information from Third Parties</Text>
          <Text style={styles.text}>
            • Identity verification, payment processors, analytics providers, and background check
            services (where applicable and with your consent).
          </Text>

          {/* ── 2. How We Use Your Information ───────────────── */}
          <Text style={styles.sectionHeader}>2. How We Use Your Information</Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Account Management:</Text> Create and manage your account and authenticate your identity.{'\n'}
            • <Text style={styles.boldText}>Maintenance Operations:</Text> Process, categorize, route, and track maintenance requests.{'\n'}
            • <Text style={styles.boldText}>Contractor Matching:</Text> Match Landlords with Contractors based on service type, location, and availability.{'\n'}
            • <Text style={styles.boldText}>Communication:</Text> Facilitate real-time messaging between Landlords, Tenants, and Contractors.{'\n'}
            • <Text style={styles.boldText}>Notifications:</Text> Send transactional updates, appointment confirmations, and announcements.{'\n'}
            • <Text style={styles.boldText}>Billing:</Text> Process subscription payments and manage billing records.{'\n'}
            • <Text style={styles.boldText}>Platform Improvement:</Text> Monitor usage, identify bugs, and improve features.{'\n'}
            • <Text style={styles.boldText}>AI Development:</Text> Train and improve AI models using anonymized, aggregated data.{'\n'}
            • <Text style={styles.boldText}>Legal & Security:</Text> Comply with laws and prevent fraud, abuse, and security incidents.
          </Text>

          {/* ── 3. How We Share Your Information ─────────────── */}
          <Text style={styles.sectionHeader}>3. How We Share Your Information</Text>
          <Text style={styles.text}>
            We do not sell your personal information. We may share it only in these circumstances:
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Between Users:</Text> Landlords can view Tenant contact info for managed properties. Contractors see job-relevant property and contact details.{'\n'}
            • <Text style={styles.boldText}>Service Providers:</Text> Cloud hosting, analytics, payments, email/SMS, and identity verification — all contractually bound to use your data only as we direct.{'\n'}
            • <Text style={styles.boldText}>Legal Requirements:</Text> When required by law, court order, or to protect safety and rights.{'\n'}
            • <Text style={styles.boldText}>Business Transfers:</Text> In the event of a merger or acquisition. You will be notified before your data is transferred.{'\n'}
            • <Text style={styles.boldText}>Aggregated Data:</Text> Anonymized, non-identifying data shared for research or analysis.
          </Text>

          {/* ── 4. Data Retention ────────────────────────────── */}
          <Text style={styles.sectionHeader}>4. Data Retention</Text>
          <Text style={styles.text}>
            • Your data is retained while your account is active or as needed for legal obligations.{'\n'}
            • Maintenance records and work order histories are kept for a minimum of 5 years.{'\n'}
            • Upon account deletion, personal data is deleted or anonymized within 90 days (except where law requires retention).{'\n'}
            • Encrypted backup copies may persist for up to 180 days following deletion.
          </Text>

          {/* ── 5. Data Security ─────────────────────────────── */}
          <Text style={styles.sectionHeader}>5. Data Security</Text>
          <Text style={styles.text}>
            We use industry-standard security measures including TLS encryption in transit,
            AES-256 encryption at rest, role-based access controls, regular security audits,
            multi-factor authentication (MFA), and incident response procedures.
          </Text>
          <Text style={styles.text}>
            No method of electronic storage is 100% secure. In the event of a data breach
            posing risk to your rights, we will notify affected users and authorities within
            72 hours as required by applicable law.
          </Text>

          {/* ── 6. Your Privacy Rights ───────────────────────── */}
          <Text style={styles.sectionHeader}>6. Your Privacy Rights</Text>
          <Text style={styles.text}>
            Depending on your location, you may have the right to:{'\n'}
            • <Text style={styles.boldText}>Access</Text> — request a copy of your personal data.{'\n'}
            • <Text style={styles.boldText}>Correction</Text> — request correction of inaccurate data.{'\n'}
            • <Text style={styles.boldText}>Deletion</Text> — request deletion of your data (subject to legal retention).{'\n'}
            • <Text style={styles.boldText}>Restriction</Text> — request we restrict processing in certain cases.{'\n'}
            • <Text style={styles.boldText}>Withdraw Consent</Text> — withdraw consent at any time without affecting prior processing.{'\n'}
            • <Text style={styles.boldText}>Data Portability</Text> — request data transfer in a machine-readable format.{'\n'}
            • <Text style={styles.boldText}>Object</Text> — object to processing for certain purposes including direct marketing.
          </Text>
          <Text style={styles.text}>
            To exercise any right, contact privacy@dwellproperties.ai. We respond within 30 days.
            California residents have additional rights under CCPA. We do not sell personal information.
          </Text>

          {/* ── 7. Children's Privacy ────────────────────────── */}
          <Text style={styles.sectionHeader}>7. Children's Privacy</Text>
          <Text style={styles.text}>
            The Platform is not directed to children under 13. We do not knowingly collect data
            from children under 13. If you believe your child has provided us information, contact
            privacy@dwellproperties.ai and we will delete it promptly.
          </Text>

          {/* ── 8. Cookies & Tracking ────────────────────────── */}
          <Text style={styles.sectionHeader}>8. Cookies & Tracking Technologies</Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Strictly Necessary:</Text> Essential for Platform function — keeping you logged in and remembering preferences.{'\n'}
            • <Text style={styles.boldText}>Analytics:</Text> Help us understand usage patterns and feature engagement.{'\n'}
            • <Text style={styles.boldText}>Functional:</Text> Personalize content based on your usage patterns.
          </Text>
          <Text style={styles.text}>
            Manage cookies through your browser settings or, for the mobile app, via your device's
            privacy settings. Disabling certain cookies may affect Platform functionality.
          </Text>

          {/* ── 9. Third-Party Links ─────────────────────────── */}
          <Text style={styles.sectionHeader}>9. Third-Party Links & Integrations</Text>
          <Text style={styles.text}>
            The Platform may link to third-party services (e.g., contractor review platforms,
            payment services). This Privacy Policy does not apply to those services. We encourage
            you to review their privacy policies. We are not responsible for their practices.
          </Text>

          {/* ── 10. AI & Automated Processing ───────────────── */}
          <Text style={styles.sectionHeader}>10. AI & Automated Processing</Text>
          <Text style={styles.text}>
            Our AI automatically categorizes maintenance requests, suggests contractor matches,
            and generates work order summaries based on your data and usage history.
          </Text>
          <Text style={styles.text}>
            You may request human review of any automated decision that significantly affects your
            use of the Platform — contact support@dwellproperties.ai. Anonymized, aggregated data
            may be used to improve our AI models and cannot identify individual users.
          </Text>

          {/* ── 11. International Data Transfers ─────────────── */}
          <Text style={styles.sectionHeader}>11. International Data Transfers</Text>
          <Text style={styles.text}>
            Dwell Properties, LLC operates in the United States. If you access the Platform from
            outside the US, your data may be transferred to and processed in the US, where data
            protection laws may differ. By using the Platform, you consent to such transfers.
            We take steps to ensure compliance with applicable legal requirements.
          </Text>

          {/* ── 12. Changes to This Policy ───────────────────── */}
          <Text style={styles.sectionHeader}>12. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this Privacy Policy periodically. Material changes will be communicated
            at least 14 days in advance via email or in-Platform notification. Continued use after
            changes are posted constitutes acceptance of the updated policy.
          </Text>

          {/* ── 13. Contact Us ───────────────────────────────── */}
          <Text style={styles.sectionHeader}>13. Contact Us</Text>
          <Text style={styles.text}>
            For questions, concerns, or complaints about this Privacy Policy:
          </Text>
          <Text style={styles.text}>
            <Text style={styles.boldText}>Dwell Properties, LLC</Text>{'\n'}
            Privacy Inquiries: privacy@dwellproperties.ai{'\n'}
            General Support: support@dwellproperties.ai{'\n'}
            Website: www.dwellproperties.ai
          </Text>
          <Text style={styles.text}>
            We respond to all verified inquiries within 30 days.
          </Text>

          <View style={{height: hp(20)}} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  container2: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 0 : StatusBar.currentHeight,
    ...Platform.select({
      ios: {
        paddingTop: hp(2),
      },
    }),
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingTop: hp(7),
    backgroundColor: 'white',
  },
    header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: wp(5), paddingTop: hp(6), paddingBottom: hp(1),
  },
  headerTitle: {
    fontSize: hp(2.2), fontWeight: 'bold', color: '#1F2D3D',
    marginLeft: 10, fontFamily: getFontFamily('bold'),
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: getFontFamily('medium'),
    color: '#174035',
  },
  header: {
    fontSize: 22,
    fontFamily: getFontFamily('bold'),
    marginBottom: 4,
    textDecorationLine: 'underline',
    color: '#174035',
  },
  subHeader: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#174035',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: getFontFamily('regular'),
    color: '#888',
    marginBottom: 10,
    lineHeight: 20,
  },
  introText: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    color: 'gray',
    marginBottom: 14,
    textAlign: 'justify',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionHeader: {
    fontSize: 17,
    fontFamily: getFontFamily('bold'),
    marginTop: 18,
    marginBottom: 6,
    color: '#174035',
  },
  subSectionHeader: {
    fontSize: 14,
    fontFamily: getFontFamily('bold'),
    marginTop: 8,
    marginBottom: 4,
    color: '#174035',
  },
  text: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: getFontFamily('regular'),
    textAlign: 'justify',
    color: 'gray',
    lineHeight: 21,
  },
  boldText: {
    fontFamily: getFontFamily('bold'),
    color: '#174035',
  },
});

export default PrivacyPolicy;
