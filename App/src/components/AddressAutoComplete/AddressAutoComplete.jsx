import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
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


const getPlaceId = (item) =>
  item?.placePrediction?.placeId ||
  item?.placePrediction?.place?.replace('places/', '') ||
  item?.place_id ||
  null;

const getMainText = (item) =>
  item?.placePrediction?.structuredFormat?.mainText?.text ||
  item?.placePrediction?.text?.text ||
  item?.structured_formatting?.main_text ||
  item?.description ||
  '';

const getSecondaryText = (item) =>
  item?.placePrediction?.structuredFormat?.secondaryText?.text ||
  item?.structured_formatting?.secondary_text ||
  '';


const ROW_HEIGHT   = hp(1.4) + hp(1.4) + hp(1.7) + hp(1.4) + 2 + 1;
const MAX_ROWS     = 5;
const DROPDOWN_H   = ROW_HEIGHT * MAX_ROWS;

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

  const debounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef    = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current    = value;

  const updateField = useCallback((field, text) => {
    onChangeRef.current?.({ ...valueRef.current, [field]: text });
  }, []);

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
        if (results?.length > 0) {
          // ── Cap to MAX_ROWS so FlatList never renders more than 5 ──────
          setSuggestions(results.slice(0, MAX_ROWS));
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

  const handleSelect = useCallback(async (item) => {
    try {
      const placeId  = getPlaceId(item);
      const mainText = getMainText(item);
      if (!placeId) return;

      setShowDropdown(false);
      setSuggestions([]);

      onChangeRef.current?.({ ...valueRef.current, street: mainText });

      const details = await fetchPlaceDetails(placeId);
      if (details) {
        onChangeRef.current?.({
          street:   details.street   || mainText,
          city:     details.city     || '',
          state:    details.state    || '',
          zip_code: details.zip_code || '',
        });
      }
      setAutoSelected(true);
    } catch (error) {
      console.warn('[AddressAutoComplete] handleSelect error:', error);
      setAutoSelected(true);
    }
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <TouchableOpacity
      style={[s.item, index < suggestions.length - 1 && s.itemBorder]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <AppIcon name={icons.location} size={hp(2)} color={Colors.red} />
      <View style={s.textWrap}>
        <Text style={s.mainText} numberOfLines={1}>
          {getMainText(item)}
        </Text>
        {!!getSecondaryText(item) && (
          <Text style={s.subText} numberOfLines={1}>
            {getSecondaryText(item)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [suggestions.length, handleSelect]);

  // ── Exact dropdown height = number of actual items × row height ───────────
  const dropdownHeight = ROW_HEIGHT * suggestions.length;

  return (
    <View style={[s.root, containerStyle]}>

      <Text style={s.subLabel}>Street Address</Text>

      <View style={s.streetWrapper}>
        <TextInput
          mode="outlined"
          placeholder="Enter Street Address"
          value={value.street}
          onChangeText={handleStreetChange}
          style={s.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          error={!!errors.street}
        />

        {fetching && (
          <ActivityIndicator size="small" color={Colors.red} style={s.spinner} />
        )}

        {showDropdown && suggestions.length > 0 && (
          <View style={[s.dropdown, { height: dropdownHeight }]}>
            {/*
              FlatList instead of ScrollView:
              - getItemLayout gives exact row dimensions so FlatList
                never miscalculates its own height
              - No ScrollView wrapper = no nested scroll warnings
              - scrollEnabled={false} since we already cap to 5 items,
                no scrolling needed — list fills exactly its height
            */}
            <FlatList
              data={suggestions}
              keyExtractor={(item, i) => getPlaceId(item) ?? String(i)}
              renderItem={renderItem}
              scrollEnabled={false}
              keyboardShouldPersistTaps="always"
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
            />
          </View>
        )}
      </View>

      {!!errors.street && <Text style={s.errorText}>{errors.street}</Text>}

  

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
  root: {
  
    alignSelf: 'stretch',
    zIndex:    1,
    overflow:  'visible',
  },
  subLabel: {
    fontSize:     hp(1.6),
    fontFamily:   getFontFamily('medium'),
    color:        Colors.darkGray || '#555',
    marginTop:    hp(1),
    marginBottom: hp(0.3),
  },

  // ── Fixed to exact input height — dropdown does NOT stretch this ──────────
  streetWrapper: {
   zIndex:     999,
  elevation:  999,
  overflow:   'visible',
  position:   'relative',
  },

  input:   { backgroundColor: '#fff', fontSize: hp(1.7), height: hp(6) },
  spinner: { position: 'absolute', right: wp(3), top: hp(1.8) },

  errorText: {
    fontSize:   hp(1.4),
    color:      Colors.red,
    marginTop:  hp(0.3),
    fontFamily: getFontFamily('regular'),
  },

  row:  { flexDirection: 'row', gap: wp(3) },
  half: { flex: 1 },

  // ── Dropdown: absolute, height set dynamically = exact item count ─────────
  dropdown: {
    position:        'absolute',
    top:             hp(6.2),
    left:            0,
    right:           0,
    backgroundColor: '#fff',
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     Colors.border || '#E0E0E0',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.12,
    shadowRadius:    6,
    elevation:       20,
    zIndex:          999,
    overflow:        'hidden',
  },

  item: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            ROW_HEIGHT,    // explicit height matches getItemLayout
    paddingHorizontal: wp(3),
    gap:               wp(3),
    backgroundColor:   '#fff',
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  textWrap:   { flex: 1 },
  mainText: {
    fontSize:   hp(1.5),
    fontFamily: getFontFamily('medium'),
    color:      Colors.black,
  },
  subText: {
    fontSize:   hp(1.2),
    fontFamily: getFontFamily('regular'),
    color:      Colors.placeholder,
    marginTop:  2,
  },
});

export default AddressAutoComplete;
