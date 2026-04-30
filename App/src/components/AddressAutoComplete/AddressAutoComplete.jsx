import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, FlatList,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from '../AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import {
  fetchAddressSuggestions,
  fetchPlaceDetails,
} from '../../Redux/Properties/servicesNode';

const AddressAutoComplete = ({
  value = { street: '', city: '', state: '', zip_code: '' },
  onChange,
  errors = {},
  containerStyle,
}) => {
  const [suggestions,  setSuggestions]  = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching,     setFetching]     = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  // ── For Modal positioning ─────────────────────────────────
  const [dropdownTop,   setDropdownTop]   = useState(0);
  const [dropdownLeft,  setDropdownLeft]  = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Measure input position to anchor the Modal dropdown ──
  const measureInput = () => {
    inputRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownTop(y + height);
      setDropdownLeft(x);
      setDropdownWidth(width);
    });
  };

  const updateField = useCallback((field, text) => {
    onChange?.({ ...value, [field]: text });
  }, [value, onChange]);

  const handleStreetChange = useCallback((text) => {
    updateField('street', text);
    setAutoSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text || text.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const results = await fetchAddressSuggestions(text);
        console.log('[AddressAutoComplete] suggestions:', results?.length);
        if (results.length > 0) {
          measureInput(); // measure position before showing
          setSuggestions(results);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (e) {
        console.warn('[AddressAutoComplete] fetch error:', e);
      } finally {
        setFetching(false);
      }
    }, 400);
  }, [updateField]);

  const handleSelect = useCallback(async (prediction) => {
    console.log('[AddressAutoComplete] selected:', prediction.place_id);
    setShowDropdown(false);
    setSuggestions([]);

    const mainText =
      prediction.structured_formatting?.main_text || prediction.description;

    onChange?.({ ...value, street: mainText });

    try {
      const details = await fetchPlaceDetails(prediction.place_id);
      console.log('[AddressAutoComplete] details:', JSON.stringify(details));
      if (details) {
        onChange?.({
          street:   details.street   || mainText,
          city:     details.city     || '',
          state:    details.state    || '',
          zip_code: details.zip_code || '',
        });
        setAutoSelected(true);
      } else {
        // No details but street is already set
        setAutoSelected(true);
      }
    } catch (e) {
      console.warn('[AddressAutoComplete] place details error:', e);
      setAutoSelected(true);
    }
  }, [value, onChange]);

  return (
    <View style={[s.root, containerStyle]}>

      {/* ── Street Address ─────────────────────────────────── */}
      <Text style={s.subLabel}>Street Address</Text>
      <View ref={inputRef} collapsable={false}>
        <TextInput
          mode="outlined"
          placeholder="Enter Street Address"
          value={value.street}
          onChangeText={handleStreetChange}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          style={s.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          error={!!errors.street}
        />
        {fetching && (
          <ActivityIndicator size="small" color={Colors.red} style={s.spinner} />
        )}
      </View>
      {!!errors.street && <Text style={s.errorText}>{errors.street}</Text>}

      {/* ── Modal Dropdown — renders OUTSIDE ScrollView ──── */}
      <Modal
        visible={showDropdown && suggestions.length > 0}
        transparent
        animationType="none"
        onRequestClose={() => setShowDropdown(false)}
      >
        {/* Tap outside to dismiss */}
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View
            style={[
              s.dropdown,
              {
                top:   dropdownTop,
                left:  dropdownLeft,
                width: dropdownWidth,
              },
            ]}
          >
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="always"
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    s.item,
                    index < suggestions.length - 1 && s.itemBorder,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <AppIcon name={icons.location} size={hp(2)} color={Colors.red} />
                  <View style={s.textWrap}>
                    <Text style={s.mainText} numberOfLines={1}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    {!!item.structured_formatting?.secondary_text && (
                      <Text style={s.subText} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Auto-filled badge ─────────────────────────────── */}
      {autoSelected && (
        <View style={s.autoBadge}>
          <AppIcon name={icons.ok} size={hp(1.8)} color="green" />
          <Text style={s.autoBadgeText}>
            Address auto-filled — you can still edit the fields below
          </Text>
        </View>
      )}

      {/* ── City + State ──────────────────────────────────── */}
      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.subLabel}>City</Text>
          <TextInput
            mode="outlined"
            placeholder="City"
            value={value.city}
            onChangeText={(t) => updateField('city', t)}
            style={s.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
            error={!!errors.city}
          />
          {!!errors.city && <Text style={s.errorText}>{errors.city}</Text>}
        </View>
        <View style={s.half}>
          <Text style={s.subLabel}>State</Text>
          <TextInput
            mode="outlined"
            placeholder="State"
            value={value.state}
            onChangeText={(t) => updateField('state', t)}
            style={s.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
            error={!!errors.state}
          />
          {!!errors.state && <Text style={s.errorText}>{errors.state}</Text>}
        </View>
      </View>

      {/* ── Zip Code ─────────────────────────────────────── */}
      <Text style={s.subLabel}>Zip Code</Text>
      <TextInput
        mode="outlined"
        placeholder="12345"
        keyboardType="numeric"
        value={value.zip_code}
        onChangeText={(t) => updateField('zip_code', t)}
        style={s.input}
        outlineColor={Colors.border}
        activeOutlineColor={Colors.red}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:    { zIndex: 1 },
  subLabel: {
    fontSize:     hp(1.6),
    fontFamily:   getFontFamily('medium'),
    color:        Colors.darkGray || '#555',
    marginTop:    hp(1),
    marginBottom: hp(0.3),
  },
  input:   { backgroundColor: '#fff', fontSize: hp(1.7), height: hp(6) },
  spinner: { position: 'absolute', right: wp(3), top: hp(1.8) },
  errorText: {
    fontSize:   hp(1.4),
    color:      Colors.red,
    marginTop:  hp(0.3),
    fontFamily: getFontFamily('regular'),
  },
  autoBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             wp(2),
    backgroundColor: '#EFF9EF',
    borderRadius:    8,
    padding:         wp(3),
    marginTop:       hp(0.8),
    marginBottom:    hp(0.5),
  },
  autoBadgeText: {
    flex:       1,
    fontSize:   hp(1.5),
    color:      'green',
    fontFamily: getFontFamily('regular'),
  },
  row:  { flexDirection: 'row', gap: wp(3) },
  half: { flex: 1 },

  // ── Modal dropdown styles ─────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position:        'absolute',
    backgroundColor: '#fff',
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     Colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.15,
    shadowRadius:    8,
    elevation:       20,
    maxHeight:       hp(50),
  },
  item: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   hp(1.4),
    paddingHorizontal: wp(3),
    gap:               wp(3),
    backgroundColor:   '#fff',
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  textWrap:   { flex: 1 },
  mainText: {
    fontSize:   hp(1.7),
    fontFamily: getFontFamily('medium'),
    color:      Colors.black,
  },
  subText: {
    fontSize:   hp(1.4),
    fontFamily: getFontFamily('regular'),
    color:      Colors.placeholder,
    marginTop:  2,
  },
});

export default AddressAutoComplete;
