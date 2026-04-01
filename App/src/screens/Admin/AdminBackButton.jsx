import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { exitAdminViewingMode } from '../../Redux/Login/services';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';

/**
 * AdminBackButton Component
 * 
 * This component should be added to the header of screens when admin is viewing a user.
 * It allows the admin to return to the admin dashboard.
 * 
 * Usage:
 * import AdminBackButton from '../../components/AdminBackButton';
 * 
 * // In your screen component:
 * <View style={styles.header}>
 *   <AdminBackButton />
 *   {/* Other header content *\/}
 * </View>
 */
const AdminBackButton = () => {
    const dispatch = useDispatch();
    const { isAdminViewing, userData } = useSelector(loginDataSelectors.getAdminData);

    if (!isAdminViewing) {
        return null; // Don't show if not in admin viewing mode
    }

    const handleBackToAdmin = () => {
        dispatch(exitAdminViewingMode());
    };

    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Icon name="admin-panel-settings" size={16} color="#fff" />
                <Text style={styles.badgeText}>
                    Viewing: {userData?.firstName} {userData?.lastName}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToAdmin}
                activeOpacity={0.7}>
                <Icon name="exit-to-app" size={20} color={Colors.black} />
                <Text style={styles.backText}>Back to Admin</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF3CD',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        borderBottomWidth: 1,
        borderBottomColor: '#FFE69C',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9800',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: hp(1.4),
        fontFamily: getFontFamily('semibold'),
        marginLeft: 4,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    backText: {
        marginLeft: 4,
        fontSize: hp(1.6),
        fontFamily: getFontFamily('medium'),
        color: Colors.black,
    },
});

export default AdminBackButton;
