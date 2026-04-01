import CheckBox from '@react-native-community/checkbox';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
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
import {useDispatch, useSelector} from 'react-redux';
import CustomButton from '../../components/CustomButton';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

const TermsAndConditions = ({route}) => {
  const userType = route?.params?.userType;
  const readOnly = route?.params?.readOnly === true;
  const [isChecked, setIsChecked] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const {userData, token} = useSelector(loginDataSelectors.getData);

  const handleAccept = () => {
    if (isChecked) {
      navigation.replace('Login');
      // TODO: plug in consent API here when ready
      // dispatch(termsandcondition({ data: { loginConsent: true }, token, userType, userData }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container2}
      behavior={Platform.OS === 'ios' ? 'padding' : ''}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>

          {/* ── Back button (readOnly / view mode only) ───────── */}
          {readOnly && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{top: 16, bottom: 16, left: 16, right: 16}}>
              <Text style={styles.header}>← Terms and Conditions</Text>
            </TouchableOpacity>
          )}

          {/* ── Title ─────────────────────────────────────────── */}
          <Text style={styles.subHeader}>DwellProperties.ai Platform</Text>
          <Text style={styles.metaText}>
            Dwell Properties, LLC{'\n'}
            Effective Date: January 1, 2025 | Last Updated: March 2025
          </Text>
          <Text style={styles.introText}>
            Please read these Terms carefully before using the
            DwellProperties.ai platform. By accessing or registering, you agree
            to be legally bound by these Terms.
          </Text>

          {/* ── 1. Definitions ────────────────────────────────── */}
          <Text style={styles.sectionHeader}>1. Definitions</Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Company:</Text> Dwell Properties,
            LLC — an AI-powered property management software provider.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Platform:</Text> The
            DwellProperties.ai mobile and web app, including all features, AI
            tools, and integrations.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Landlord:</Text> Any individual or
            entity managing rental properties through the Platform.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Tenant:</Text> Any individual
            occupying a property managed through the Platform.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Contractor:</Text> Any service
            professional engaged via the Platform for maintenance or repairs.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Users:</Text> Collectively,
            Landlords, Tenants, and Contractors.
          </Text>

          {/* ── 2. Eligibility ────────────────────────────────── */}
          <Text style={styles.sectionHeader}>2. Eligibility</Text>
          <Text style={styles.text}>
            • You must be at least 18 years old to use the Platform.
          </Text>
          <Text style={styles.text}>
            • Landlords must have legal authority over listed properties.
            Tenants must be current occupants or invited by a registered
            Landlord. Contractors must hold all required licenses and insurance.
          </Text>
          <Text style={styles.text}>
            • All registration information must be accurate and kept up to date.
            The Company may deny or terminate access for eligibility violations.
          </Text>

          {/* ── 3. Platform Access & Usage ────────────────────── */}
          <Text style={styles.sectionHeader}>3. Platform Access & Usage</Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Landlords</Text> may manage
            properties, review maintenance requests, schedule repairs, and
            communicate with Tenants and Contractors.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Tenants</Text> may submit
            maintenance tickets, track request status, and communicate through
            designated channels.
          </Text>
          <Text style={styles.text}>
            • <Text style={styles.boldText}>Contractors</Text> may receive work
            orders, update job progress, upload documentation, and communicate
            with Landlords.
          </Text>
          <Text style={styles.text}>
            • Sharing login credentials with unauthorized individuals is
            strictly prohibited. Report any suspected security breach to
            support@dwellproperties.ai immediately.
          </Text>

          {/* ── 4. AI-Powered Features ────────────────────────── */}
          <Text style={styles.sectionHeader}>4. AI-Powered Features</Text>
          <Text style={styles.text}>
            • AI tools automatically categorize and route maintenance requests.
            These are recommendations only — Landlords retain final authority
            over all actions.
          </Text>
          <Text style={styles.text}>
            • Contractor matching is algorithmic and the Company does not
            guarantee the quality or suitability of any match.
          </Text>
          <Text style={styles.text}>
            • AI-generated content does not constitute professional, legal, or
            technical advice. AI features may be updated or removed at any time.
          </Text>

          {/* ── 5. Maintenance Requests & Work Orders ─────────── */}
          <Text style={styles.sectionHeader}>
            5. Maintenance Requests & Work Orders
          </Text>
          <Text style={styles.text}>
            • Tenants must provide accurate descriptions and supporting media
            when submitting maintenance tickets.
          </Text>
          <Text style={styles.text}>
            • Landlords must review requests in a timely manner per applicable
            laws. The Company acts solely as a technology intermediary and bears
            no responsibility for work quality or outcomes.
          </Text>
          <Text style={styles.text}>
            • Contractors must update work order status upon completion and
            upload required proof of completed work.
          </Text>

          {/* ── 6. Payments & Fees ────────────────────────────── */}
          <Text style={styles.sectionHeader}>6. Payments & Fees</Text>
          <Text style={styles.text}>
            • Subscription fees are charged per the plan selected at
            registration. All fees are non-refundable unless otherwise stated.
          </Text>
          <Text style={styles.text}>
            • The Company does not process payments between Landlords and
            Contractors — those transactions are solely between the parties
            involved.
          </Text>
          <Text style={styles.text}>
            • Pricing may change with at least 30 days' written notice.
            Non-payment may result in suspension or termination of access.
          </Text>

          {/* ── 7. Privacy & Data ─────────────────────────────── */}
          <Text style={styles.sectionHeader}>7. Privacy & Data</Text>
          <Text style={styles.text}>
            • Data collection and use is governed by the Company's Privacy
            Policy, incorporated into these Terms by reference.
          </Text>
          <Text style={styles.text}>
            • By using the Platform you consent to data collection, processing,
            and storage as described. The Company uses industry-standard
            security but cannot guarantee absolute protection.
          </Text>
          <Text style={styles.text}>
            • Tenant data accessible to Landlords may only be used for lawful
            property management and must not be shared with third parties
            without tenant consent.
          </Text>

          {/* ── 8. Intellectual Property ──────────────────────── */}
          <Text style={styles.sectionHeader}>8. Intellectual Property</Text>
          <Text style={styles.text}>
            • The Platform and all its components are the exclusive intellectual
            property of Dwell Properties, LLC. Users receive a limited,
            non-exclusive, non-transferable license to use the Platform for its
            intended purpose only.
          </Text>
          <Text style={styles.text}>
            • Reverse-engineering, copying, modifying, or distributing any part
            of the Platform without written consent is strictly prohibited.
          </Text>

          {/* ── 9. Prohibited Conduct ─────────────────────────── */}
          <Text style={styles.sectionHeader}>9. Prohibited Conduct</Text>
          <Text style={styles.text}>
            Users must not: use the Platform unlawfully; submit false
            maintenance requests; harass or threaten other Users; attempt
            unauthorized access; upload malicious software; scrape Platform
            data; or discriminate against any User based on any protected class.
          </Text>

          {/* ── 10. Disclaimers ───────────────────────────────── */}
          <Text style={styles.sectionHeader}>10. Disclaimers</Text>
          <Text style={styles.text}>
            • The Platform is provided "as-is" and "as-available" with no
            express or implied warranties regarding fitness, reliability, or
            uninterrupted availability.
          </Text>
          <Text style={styles.text}>
            • The Company is not responsible for disputes between Landlords,
            Tenants, and Contractors regarding maintenance quality, timelines,
            payments, or lease obligations.
          </Text>

          {/* ── 11. Limitation of Liability ───────────────────── */}
          <Text style={styles.sectionHeader}>11. Limitation of Liability</Text>
          <Text style={styles.text}>
            • To the maximum extent permitted by law, the Company shall not be
            liable for any indirect, incidental, or consequential damages
            arising from use of the Platform.
          </Text>
          <Text style={styles.text}>
            • Total Company liability to any User shall not exceed the total
            fees paid by that User in the twelve (12) months preceding the
            claim.
          </Text>

          {/* ── 12. Termination ───────────────────────────────── */}
          <Text style={styles.sectionHeader}>12. Termination</Text>
          <Text style={styles.text}>
            • Either party may terminate this agreement with written notice.
            Users may close their account via Platform settings.
          </Text>
          <Text style={styles.text}>
            • The Company may immediately suspend or terminate access for
            breach of Terms, fraudulent activity, non-payment, or conduct
            harmful to other Users. Provisions on intellectual property,
            disclaimers, liability limits, and governing law survive
            termination.
          </Text>

          {/* ── 13. Amendments ────────────────────────────────── */}
          <Text style={styles.sectionHeader}>13. Amendments</Text>
          <Text style={styles.text}>
            • The Company may modify these Terms at any time. Updated Terms
            will be posted with a revised effective date. Continued use
            constitutes acceptance. Material changes will be notified at least
            14 days in advance via email or in-Platform notification.
          </Text>

          {/* ── 14. Governing Law ─────────────────────────────── */}
          <Text style={styles.sectionHeader}>14. Governing Law</Text>
          <Text style={styles.text}>
            • These Terms are governed by applicable state law. Disputes shall
            first go through good-faith negotiation; if unresolved, they shall
            be submitted to binding arbitration under AAA rules. Either party
            may seek injunctive relief in a court of competent jurisdiction.
          </Text>

          {/* ── 15. Contact ───────────────────────────────────── */}
          <Text style={styles.sectionHeader}>15. Contact Us</Text>
          <Text style={styles.text}>
            For questions or concerns about these Terms, contact us at:
          </Text>
          <Text style={styles.text}>
            <Text style={styles.boldText}>Dwell Properties, LLC</Text>{'\n'}
            Email: support@dwellproperties.ai{'\n'}
            Website: www.dwellproperties.ai
          </Text>

          {/* ── Checkbox & Accept — hidden in readOnly mode ───── */}
          {!readOnly && (
            <View>
              <View style={styles.checkboxContainer}>
                <CheckBox
                  value={isChecked}
                  onValueChange={setIsChecked}
                  style={styles.checkbox}
                />
                <Text style={styles.label}>
                  I accept the Terms and Conditions
                </Text>
              </View>

              <CustomButton
                title={'Accept'}
                style={{borderRadius: 50, marginTop: 10}}
                size={18}
                action={handleAccept}
                disabled={!isChecked}
                color={isChecked ? Colors.black : '#dddddd'}
                align={'center'}
              />
            </View>
          )}

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
    marginBottom: 8,
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
  checkboxContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: getFontFamily('regular'),
    color: 'gray',
    flexShrink: 1,
  },
});

export default TermsAndConditions;
