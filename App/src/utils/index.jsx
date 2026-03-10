import {Colors} from '../Theme';

export const getFontFamily = type => {
  switch (type) {
    case 'regular':
      return 'FilsonPro-Regular';
    case 'bold':
      return 'FilsonPro-Bold';
    case 'medium':
      return 'FilsonPro-Medium';
    case 'thin':
      return 'FilsonPro-Thin';
    case 'boldItalic':
      return 'FilsonPro-BoldItalic';
    case 'pro':
      return 'FilsonPro-Book';
    case 'heavy':
      return 'FilsonPro-Heavy';
    case 'heavyItalic':
      return 'FilsonPro-HeavyItalic';
    case 'light':
      return 'FilsonPro-Light';
    case 'lightItaclic':
      return 'FilsonPro-LightItalic';

    case 'mediumItalic':
      return 'FilsonProMediumItalic';
    case 'regularItalic':
      return 'FilsonProRegularItalic';
    case 'thinItalic':
      return 'FilsonPro-ThinItalic';

    case 'p':
      return 'Poppins-Black';

    default:
      return 'FilsonPro-Black';
  }
};