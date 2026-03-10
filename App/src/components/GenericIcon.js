import React from 'react'
import {
  Container,
  Header,
  Content,
  Footer,
  FooterTab,
  Button,
  Text,
} from 'native-base'
import { View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'

const GenericIcon = ({
  name,
  style,
  active = false,
  disabled = false,
  onPress,
  show,
}) =>
  show ? (
    <MaterialIcon
      name={`${name}`}
      style={style}
      onPress={onPress}
      active={!disabled}
    />
  ) : (
    <Icon name={`${name}`} style={style} onPress={onPress} active={!disabled} />
  )

export default GenericIcon
