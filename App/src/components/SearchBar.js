import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {Colors} from '../Theme';
import {getFontFamily} from '../utils';
import GenericIcon from './GenericIcon';

const SearchBar = ({
  sortBtn,
  icon,
  onPress,
  onChangeText,
  value,
  handleDonePress,
  ...props
}) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
    }}>
    <View style={[style.searchInputContainer, props.style]}>
      {sortBtn ? (
        []
      ) : (
        <GenericIcon
          name={'search'}
          style={{
            color: props.iconColor ? props.iconColor : 'grey',
            fontSize: 25,
          }}
        />
      )}
      <TextInput
        placeholder={props.placeholder}
        onChangeText={onChangeText}
        value={value}
        onSubmitEditing={handleDonePress}
        keyboardType={props.keyboardType}
        placeholderTextColor={
          props.placeholderTextColor
            ? props.placeholderTextColor
            : Colors.placeHolder
        }
        style={[
          {
            flex: 1,
            color: Colors.primary,
            backgroundColor: 'transparent',
            fontFamily: getFontFamily('regular'),
            fontSize: 16,
          },
          props.inputStyle,
        ]}
      />
    </View>

    {/* <View style={sortBtn ? style.sortBtn1 : style.sortBtn}>
      <TouchableOpacity onPress={onPress}>
        <GenericIcon
          name={sortBtn ? icon : 'barcode-scan'}
          style={{
            color: sortBtn ? 'black' : 'white',
            fontSize: 25,
          }}
          show={sortBtn ? false : true}
        />
      </TouchableOpacity>
    </View> */}
  </View>
);

export default SearchBar;
const style = StyleSheet.create({
  searchInputContainer: {
    height: 50,
    backgroundColor: 'white',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 1,
  },
  searchInputContainer1: {
    height: 50,
    backgroundColor: 'white',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  sortBtn: {
    backgroundColor: 'black',
    height: 50,
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sortBtn1: {
    backgroundColor: 'white',
    height: 50,
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
