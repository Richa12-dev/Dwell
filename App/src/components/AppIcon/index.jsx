
import React from 'react';
import { SvgXml } from 'react-native-svg';

export const AppIcon = ({ name, size = 24, ...props }) => {
  if (!name) {
    console.warn("⚠️ AppIcon received NULL or undefined SVG XML");
    return null; // or return a fallback icon
  }

  return (
    <SvgXml
      xml={name}
      width={size}
      height={size}
      {...props}
    />
  );
};
