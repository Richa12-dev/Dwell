// InvoiceModal.jsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Modal from 'react-native-modal';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import Toast from 'react-native-simple-toast';

const InvoiceModal = ({
  visible,
  onClose,
  onSubmit,
  job,
  isSubmitting = false,
}) => {
  const [lineItems, setLineItems] = useState([
    { description: '', qty: '', unit_price: '' }
  ]);
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');

  // Pre-populate with job data when modal opens
  useEffect(() => {
    if (job && visible) {
      setLineItems([
        {
          description: job.title || job.description || '',
          qty: '1',
          unit_price: ''
        }
      ]);
      
      setNotes(`Job ID: ${job.ticket_id}\nProperty: ${job.property_name || job.address || ''}`);
      setTax('0');
    }
  }, [job, visible]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', qty: '', unit_price: '' }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newItems);
    }
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = parseFloat(tax) || 0;
    return subtotal + taxAmount;
  };

  const handleSubmit = () => {
    const validItems = lineItems.filter(item =>
      item.description.trim() &&
      item.qty &&
      parseFloat(item.qty) > 0 &&
      item.unit_price &&
      parseFloat(item.unit_price) > 0
    );

    if (validItems.length === 0) {
      Alert.alert(
        'Validation Error',
        'Please add at least one complete line item with:\n• Description\n• Quantity (greater than 0)\n• Unit Price (greater than 0)'
      );
      return;
    }

    const hasIncompleteItems = lineItems.some(item =>
      (item.description.trim() || item.qty || item.unit_price) &&
      (!item.description.trim() || !item.qty || !item.unit_price ||
       parseFloat(item.qty) <= 0 || parseFloat(item.unit_price) <= 0)
    );

    if (hasIncompleteItems) {
      Alert.alert(
        'Incomplete Items',
        'Please complete all line items or remove empty ones before submitting.'
      );
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      Alert.alert(
        'Invalid Invoice',
        'Invoice total must be greater than $0.00'
      );
      return;
    }

    const formattedLineItems = validItems.map(item => ({
      description: item.description.trim(),
      qty: parseFloat(item.qty),
      unit_price: parseFloat(item.unit_price)
    }));

    const invoiceData = {
      line_items: formattedLineItems,
      tax: parseFloat(tax) || 0,
      currency: 'USD',
      notes: notes.trim() || '',
      subtotal: calculateSubtotal(),
      total: calculateTotal()
    };

    console.log('📄 Submitting invoice:', invoiceData);
    onSubmit(invoiceData);
  };

  const resetForm = () => {
    setLineItems([{ description: '', qty: '', unit_price: '' }]);
    setTax('0');
    setNotes('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      Alert.alert(
        'Discard Invoice?',
        'Are you sure you want to close without submitting the invoice?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]
      );
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection={!isSubmitting ? ['down'] : []}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      propagateSwipe={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Invoice</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Job Info */}
            {job && (
              <View style={styles.jobInfoSection}>
                <Text style={styles.sectionTitle}>Job Details</Text>
                <View style={styles.jobInfoRow}>
                  <AppIcon name={icons.location} size={wp(4)} color={Colors.red} />
                  <Text style={styles.jobInfoText} numberOfLines={2}>
                    {job.address}
                  </Text>
                </View>
                <Text style={styles.jobDescription}>{job.title || job.description}</Text>
              </View>
            )}

            {/* Line Items */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Line Items *</Text>
                <TouchableOpacity
                  onPress={addLineItem}
                  style={styles.addButton}
                  disabled={isSubmitting}
                >
                  <Text style={styles.addButtonText}>+ Add Item</Text>
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

                  {/* Description - Full Width */}
                  <View style={styles.inputRow}>
                 
                   <View style={styles.inputLarge}>
                    <Text style={styles.inputRow}>Description *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Replace kitchen faucet"
                    value={item.description}
                    onChangeText={(value) => updateLineItem(index, 'description', value)}
                    editable={!isSubmitting}
                    placeholderTextColor="#999"
                  />
                   </View>
                   
                  {/* Quantity and Unit Price in One Row */}
               
                    <View style={styles.inputSmall}>
                      <Text style={styles.fieldLabel}>Qty *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="1"
                        value={item.qty}
                        onChangeText={(value) => {
                          const numericValue = value.replace(/[^0-9.]/g, '');
                          updateLineItem(index, 'qty', numericValue);
                        }}
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
                        onChangeText={(value) => {
                          const numericValue = value.replace(/[^0-9.]/g, '');
                          updateLineItem(index, 'unit_price', numericValue);
                        }}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  {/* Line Item Total */}
                  {item.qty && item.unit_price && parseFloat(item.qty) > 0 && parseFloat(item.unit_price) > 0 && (
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

            {/* Tax */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consulting Amount ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={tax}
                onChangeText={(value) => {
                  const numericValue = value.replace(/[^0-9.]/g, '');
                  setTax(numericValue);
                }}
                keyboardType="decimal-pad"
                editable={!isSubmitting}
                placeholderTextColor="#999"
              />
              <Text style={styles.helperText}>Optional: Add any applicable taxes</Text>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes or comments for the client"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={1}
                textAlignVertical="top"
                editable={!isSubmitting}
                placeholderTextColor="#999"
              />
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax:</Text>
                <Text style={styles.summaryValue}>${(parseFloat(tax) || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || calculateTotal() <= 0) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || calculateTotal() <= 0}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.submitButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Create Invoice & Accept Job</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: hp(2),
    paddingHorizontal: wp(4),
    maxHeight: hp(95),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  headerTitle: {
    fontSize: wp(5),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  closeButton: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: wp(5),
    color: '#666',
    marginTop: -2,
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  jobInfoSection: {
    backgroundColor: '#F5F5F5',
    padding: wp(3),
    borderRadius: 10,
    marginBottom: hp(1.5),
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  jobInfoText: {
    fontSize: wp(3.2),
    color: '#666',
    flex: 1,
    fontFamily: getFontFamily('medium'),
  },
  jobDescription: {
    fontSize: wp(3.5),
    color: Colors.black,
    fontFamily: getFontFamily('semibold'),
  },
  section: {
    marginBottom: hp(1.5),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  addButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    backgroundColor: Colors.red,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: wp(3.2),
    fontFamily: getFontFamily('semibold'),
  },
  lineItemCard: {
    backgroundColor: '#F9F9F9',
    padding: wp(3),
    borderRadius: 10,
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
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
  fieldLabel: {
    fontSize: wp(3),
    color: '#333',
    fontFamily: getFontFamily('semibold'),
    marginBottom: hp(0.3),
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: wp(2.5),
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
    marginBottom: hp(0.8),
    color: Colors.black,
  },
  inputRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  inputHalf: {
    flex: 1,
  },
  inputLarge: {
  flex: 2.5,
},

inputSmall: {
  flex: 1,
},

  textArea: {
    minHeight: hp(8),
    textAlignVertical: 'top',
  },
  lineItemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.3),
    paddingTop: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
  helperText: {
    fontSize: wp(2.8),
    color: '#999',
    fontFamily: getFontFamily('regular'),
    marginTop: -hp(0.5),
  },
  summaryCard: {
    backgroundColor: '#F5F5F5',
    padding: wp(3.5),
    borderRadius: 10,
    marginBottom: hp(1.5),
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
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
    borderTopColor: '#BDBDBD',
    paddingTop: hp(1),
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
  submitButton: {
    backgroundColor: Colors.red,
    padding: hp(1.8),
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: hp(1),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
  },
  submitButtonSubtext: {
    color: '#fff',
    fontSize: wp(2.8),
    fontFamily: getFontFamily('regular'),
    marginTop: hp(0.3),
    opacity: 0.9,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default InvoiceModal;
