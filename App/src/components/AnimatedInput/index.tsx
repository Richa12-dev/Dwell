import { useTheme } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-element-textinput';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';


interface Props {
  variant?: 'rectangle' | 'line';
  message?: string;
  focusColor?: string;
  [x: string]: any;
}

export const AnimatedInput = ({
  variant = 'line',
  message = '',
  focusColor = 'red',
  ...props
}: Props) => {
  const {colors} = useTheme();
  const _styles = styles(colors, message, focusColor);
  const [textInputHeight, setTextInputHeight] = useState(0);

  return (
    <>
      <TextInput
        label={props.label}  
        multiline={props.multiline || false}
        pointerEvents={props.pointerEvents || 'auto'}
        onChangeText={props.onChangeText}
        style={[
          _styles.input,
          {
            height: textInputHeight < 60 ? 60 : textInputHeight,
            borderWidth: variant === 'line' ? 0 : 0.8,
            borderBottomWidth: variant === 'line' ? 1 : 0.5,
           
          },
        ]}
        inputStyle={[_styles.inputStyle,props.inputStyle]}
        labelStyle={{
          ...(props.renderLeftIcon
            ? _styles.labelStyleIcon
            : _styles.labelStyle),
          ...props.labelStyle,
         
        }}
        maxLength={props.maxLength}
        placeholderStyle={[_styles.placeholderStyle,props.placeholderStyle]}
        textErrorStyle={_styles.textErrorStyle}
        // placeholder=""
        placeholder={props.placeholder || ""}
        renderRightIcon={
          props.renderRightIcon ? props.renderRightIcon : () => null
        }
        focusColor={'red'}
        onContentSizeChange={(e: any) =>
          setTextInputHeight(e.nativeEvent.contentSize.height)
        }
        textError={message}
        {...props}
      />
    </>
  );
};

const styles = (colors: any, message: string, focusColor: string) =>
  StyleSheet.create({
    input: {
      height: 55,
      paddingHorizontal: 12,
      borderRadius: 5,
      borderBottomWidth: 1,
      borderColor: message === '' ? Colors.black : 'red',
      marginTop: '5%',
    },
    labelStyle: {
      fontSize: 13,
      position: 'absolute',
      top: -10,
      paddingBottom: 5,
      backgroundColor: 'transparent',
      paddingHorizontal: 4,
      marginLeft: -4,
      color: message === '' ? Colors.black : 'red',
      fontFamily: getFontFamily('bold'),
    },
    labelStyleIcon: {
      fontSize: 12,
      position: 'absolute',
      top: -10,
      backgroundColor: 'white',
      paddingHorizontal: 4,
      marginLeft: -27,
      color: message === '' ? '#494949' : 'red',
      fontFamily: getFontFamily('bold'),
    },
    inputStyle: {
      fontSize: 14,
      fontFamily: getFontFamily('bold'),
      color: Colors.black,
    },
    placeholderStyle: {
      fontSize: 16,
      fontFamily: getFontFamily('regular'),
      color: '#dddddd',
    },
    textErrorStyle: {
      fontSize: 14,
      fontFamily: getFontFamily('dm-regular'),
      paddingLeft: 10,
    },
    errorMessage: {paddingLeft: 10, paddingVertical: 5},
  });
