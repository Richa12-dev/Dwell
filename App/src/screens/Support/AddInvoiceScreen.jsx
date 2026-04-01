
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useDispatch } from 'react-redux';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import Toast from 'react-native-simple-toast';
import {
  createContractorInvoice,
  getContractorInvoice,
  getAllContractorJobs,
} from '../../Redux/ContractorServices/services';
import Container from '../../components/Container/Container';

const AddInvoiceScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();

  // job is passed via navigation params
  const job = route?.params?.job;
  // Optional callback key — ContractorSupport listens via navigation events
  const onInvoiceSubmitted = route?.params?.onInvoiceSubmitted;

  const [lineItems, setLineItems] = useState([
    { description: '', qty: '', unit_price: '' },
  ]);
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate with job data
  useEffect(() => {
    if (job) {
      setLineItems([
        {
          description: job.title || job.description || '',
          qty: '1',
          unit_price: '',
        },
      ]);
      setNotes(
        `Job ID: ${job.ticket_id}\nProperty: ${job.property_name || job.address || ''}`,
      );
      setTax('0');
    }
  }, [job]);

  // ── Line item helpers ────────────────────────────────────────────────────

  const addLineItem = () =>
    setLineItems(prev => [...prev, { description: '', qty: '', unit_price: '' }]);

  const removeLineItem = index =>
    setLineItems(prev => prev.filter((_, i) => i !== index));

  const updateLineItem = (index, field, value) =>
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ── Calculations ─────────────────────────────────────────────────────────

  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);

  const calculateTotal = () => calculateSubtotal() + (parseFloat(tax) || 0);

  // ── Back / discard ───────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (isSubmitting) return;
    Alert.alert(
      'Discard Invoice?',
      'Are you sure you want to go back without submitting the invoice?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [isSubmitting, navigation]);

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // Validation
    const validItems = lineItems.filter(
      item =>
        item.description.trim() &&
        item.qty &&
        parseFloat(item.qty) > 0 &&
        item.unit_price &&
        parseFloat(item.unit_price) > 0,
    );

    if (validItems.length === 0) {
      Alert.alert(
        'Validation Error',
        'Please add at least one complete line item with:\n• Description\n• Quantity (greater than 0)\n• Unit Price (greater than 0)',
      );
      return;
    }

    const hasIncompleteItems = lineItems.some(
      item =>
        (item.description.trim() || item.qty || item.unit_price) &&
        (!item.description.trim() ||
          !item.qty ||
          !item.unit_price ||
          parseFloat(item.qty) <= 0 ||
          parseFloat(item.unit_price) <= 0),
    );

    if (hasIncompleteItems) {
      Alert.alert(
        'Incomplete Items',
        'Please complete all line items or remove empty ones before submitting.',
      );
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      Alert.alert('Invalid Invoice', 'Invoice total must be greater than $0.00');
      return;
    }

    // Resolve IDs
    const property_id =
      job.property_id ||
      job.contractor_job_snapshot?.ids?.property_id ||
      job.contractor_job_snapshot?.property?.property_id;
    const tenant_id =
      job.tenant_id ||
      job.contractor_job_snapshot?.ids?.tenant_id ||
      job.contractor_job_snapshot?.tenant?.tenant_id;
    const landlord_id =
      job.landlord_id ||
      job.contractor_job_snapshot?.ids?.landlord_id ||
      job.contractor_job_snapshot?.property?.landlord_id;

    if (!property_id || !tenant_id || !landlord_id) {
      const missing = [
        !property_id && 'Property ID',
        !tenant_id && 'Tenant ID',
        !landlord_id && 'Landlord ID',
      ].filter(Boolean);
      Alert.alert(
        'Missing Required Information',
        `This job is missing: ${missing.join(', ')}.\n\nJob ID: ${job.ticket_id}\n\nPlease contact support.`,
        [{ text: 'OK' }],
      );
      return;
    }

    const formattedLineItems = validItems.map(item => ({
      description: item.description.trim(),
      qty: parseFloat(item.qty),
      unit_price: parseFloat(item.unit_price),
    }));

    const invoiceData = {
      line_items: formattedLineItems,
      tax: parseFloat(tax) || 0,
      currency: 'USD',
      notes: notes.trim() || '',
      subtotal: calculateSubtotal(),
      total,
      ticket_id: job.ticket_id,
      property_id,
      tenant_id,
      landlord_id,
    };

    try {
      setIsSubmitting(true);
      console.log('📄 Submitting invoice:', invoiceData);

      await dispatch(
        createContractorInvoice({ ticket_id: job.ticket_id, invoiceData }),
      ).unwrap();

      const invoiceResult = await dispatch(
        getContractorInvoice({ ticket_id: job.ticket_id }),
      ).unwrap();

      await dispatch(getAllContractorJobs({ status: null, offered_only: false, unassigned_only: false, limit: 20 }));

      Toast.show('Invoice submitted successfully!');

      // Navigate back and signal success so ContractorSupport can refresh
      navigation.navigate('ContractorSupport', {
        invoiceSubmitted: true,
        ticket_id: job.ticket_id,
        invoice: invoiceResult?.invoice,
      });
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert(
        'Invoice Submission Failed',
        `${error?.message || 'Failed to submit invoice'}\n\nJob ID: ${job.ticket_id}`,
        [{ text: 'OK' }],
      );
    }
  }, [lineItems, tax, notes, job, dispatch, navigation]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No job data provided.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
        <Container scroll={false}>
        
    <View style={styles.headerRow}>
            <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon
              name={icons.arrowBack}
              height={hp(2.5)}
              width={hp(2.5)}
            />
          </TouchableOpacity>

  <Text style={styles.pageTitle}>Create Invoice</Text>
</View>


    <View style={styles.screen}>
    

      {/* ── Body ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Job Info Card */}
          <View style={styles.jobInfoCard}>
            <View style={styles.jobInfoRow}>
              <AppIcon name={icons.location} size={wp(4)} color={Colors.red} />
              <Text style={styles.jobInfoAddress} numberOfLines={2}>
                {job.address}
              </Text>
            </View>
            <Text style={styles.jobInfoTitle}>{job.title || job.description}</Text>
            <View style={styles.jobInfoMeta}>
              <Text style={styles.jobMetaText}>Job ID: {job.ticket_id}</Text>
              {job.date ? <Text style={styles.jobMetaText}>{job.date}</Text> : null}
            </View>
          </View>

          {/* ── Line Items ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items *</Text>
              <TouchableOpacity
                onPress={addLineItem}
                style={styles.addItemBtn}
                disabled={isSubmitting}
              >
                <Text style={styles.addItemBtnText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.map((item, index) => (
              <View key={index} style={styles.lineItemCard}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemNumber}>Item {index + 1}</Text>
                  {lineItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLineItem(index)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description + Qty + Price in one row */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLarge}>
                    <Text style={styles.fieldLabel}>Description *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Replace kitchen faucet"
                      value={item.description}
                      onChangeText={v => updateLineItem(index, 'description', v)}
                      editable={!isSubmitting}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputSmall}>
                    <Text style={styles.fieldLabel}>Qty *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1"
                      value={item.qty}
                      onChangeText={v =>
                        updateLineItem(index, 'qty', v.replace(/[^0-9.]/g, ''))
                      }
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputSmall}>
                    <Text style={styles.fieldLabel}>Price ($) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={item.unit_price}
                      onChangeText={v =>
                        updateLineItem(index, 'unit_price', v.replace(/[^0-9.]/g, ''))
                      }
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Line total */}
                {item.qty &&
                  item.unit_price &&
                  parseFloat(item.qty) > 0 &&
                  parseFloat(item.unit_price) > 0 && (
                    <View style={styles.lineItemTotalRow}>
                      <Text style={styles.lineItemTotalLabel}>Line Total:</Text>
                      <Text style={styles.lineItemTotal}>
                        ${(parseFloat(item.qty) * parseFloat(item.unit_price)).toFixed(2)}
                      </Text>
                    </View>
                  )}
              </View>
            ))}
          </View>

          {/* ── Consulting / Tax ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consulting Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={tax}
              onChangeText={v => setTax(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Optional: Add any applicable taxes</Text>
          </View>

         

          {/* ── Summary ── */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Invoice Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consulting / Tax:</Text>
              <Text style={styles.summaryValue}>
                ${(parseFloat(tax) || 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || total <= 0) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || total <= 0}
          >
            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit Invoice</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
        </Container>
  );
};

const styles = StyleSheet.create({
 

 
    container:{
    paddingHorizontal: wp(4),
    paddingVertical: hp(2)
    },
   headerContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 20,
      fontFamily: getFontFamily('Poppins', '600'),
    color:  Colors.black,
  },

  // ── Scroll content ───────────────────────────────────────────────────────
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(6),
  },

  // ── Job Info Card ────────────────────────────────────────────────────────
  jobInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.15)',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  jobInfoAddress: {
    flex: 1,
    fontSize: wp(3.2),
    color: '#666',
    fontFamily: getFontFamily('medium'),
  },
  jobInfoTitle: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(0.5),
  },
  jobInfoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  jobMetaText: {
    fontSize: wp(2.8),
    color: '#999',
    fontFamily: getFontFamily('regular'),
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  sectionTitle: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(0.8),
  },
  addItemBtn: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.6),
    backgroundColor: Colors.red,
    borderRadius: 8,
  },
  addItemBtnText: {
    color: '#fff',
    fontSize: wp(3.2),
    fontFamily: getFontFamily('semibold'),
  },

  // ── Line item card ───────────────────────────────────────────────────────
  lineItemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: wp(3),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.8),
  },
  lineItemNumber: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  removeText: {
    fontSize: wp(3.2),
    color: Colors.red,
    fontFamily: getFontFamily('semibold'),
  },

  // ── Inputs ───────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'flex-start',
  },
  inputLarge: { flex: 2.5 },
  inputSmall: { flex: 1 },
  fieldLabel: {
    fontSize: wp(3),
    color: '#333',
    fontFamily: getFontFamily('semibold'),
    marginBottom: hp(0.4),
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
    color: Colors.black,
    marginBottom: hp(0.5),
  },
  textArea: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: wp(2.8),
    color: '#999',
    fontFamily: getFontFamily('regular'),
    marginTop: hp(0.3),
  },

  // ── Line total ───────────────────────────────────────────────────────────
  lineItemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    marginTop: hp(0.3),
  },
  lineItemTotalLabel: {
    fontSize: wp(3.2),
    fontFamily: getFontFamily('semibold'),
    color: '#666',
  },
  lineItemTotal: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
    color: '#388E3C',
  },

  // ── Summary card ─────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1.5,
    borderColor: 'rgba(229,57,53,0.2)',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(1.2),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(0.8),
  },
  summaryLabel: {
    fontSize: wp(3.5),
    color: '#666',
    fontFamily: getFontFamily('medium'),
  },
  summaryValue: {
    fontSize: wp(3.5),
    color: Colors.black,
    fontFamily: getFontFamily('semibold'),
  },
  totalRow: {
    borderTopWidth: 1.5,
    borderTopColor: '#E0E0E0',
    paddingTop: hp(1.2),
    marginTop: hp(0.3),
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: wp(4.5),
    color: Colors.black,
    fontFamily: getFontFamily('bold'),
  },
  totalValue: {
    fontSize: wp(5),
    color: '#388E3C',
    fontFamily: getFontFamily('bold'),
  },

  // ── Submit button ────────────────────────────────────────────────────────
  submitButton: {
    backgroundColor: Colors.red,
    paddingVertical: hp(2),
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: hp(2),
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: wp(4.2),
    fontFamily: getFontFamily('bold'),
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  buttonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── Error state ──────────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(8),
  },
  errorText: {
    fontSize: wp(4),
    color: '#666',
    fontFamily: getFontFamily('medium'),
    textAlign: 'center',
    marginBottom: hp(2),
  },
  backButton: {
    backgroundColor: Colors.red,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
  },
});

export default AddInvoiceScreen;
