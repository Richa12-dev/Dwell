import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
    TextInput as RNTextInput,
    ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import { fetchUsersByType, setAdminViewingUser } from '../../Redux/Login/services';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import Container from "../../components/Container/Container";

const AdminUserList = ({ navigation, route }) => {
    const { userType } = route.params;
    const dispatch = useDispatch();

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    

const [adminUsers, setAdminUsers] = useState([]);
const [adminLoading, setAdminLoading] = useState(false);
const accessToken = useSelector((state) => state.loginData.accessToken);

// Remove the useSelector lines for adminUsers and adminLoading
// Replace the fetch useEffect with this:
useEffect(() => {
  setAdminLoading(true);
  setTimeout(() => {
    const mockUsers = {
      tenant: [
        { userId: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phoneNumber: '1234567890' },
        { userId: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phoneNumber: '0987654321' },
      ],
      landlord: [
        { userId: '3', firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', phoneNumber: '1112223333' },
        { userId: '4', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', phoneNumber: '4445556666' },
      ],
      contractor: [
        { userId: '5', firstName: 'Charlie', lastName: 'Davis', email: 'charlie@example.com', phoneNumber: '7778889999' },
        { userId: '6', firstName: 'Diana', lastName: 'Moore', email: 'diana@example.com', phoneNumber: '1231231234' },
      ],
    };
    setAdminUsers(mockUsers[userType] || []);
    setAdminLoading(false);
  }, 800); // simulate network delay
}, [userType]);

    useEffect(() => {
        // Filter users based on search query
        if (adminUsers && adminUsers.length > 0) {
            if (searchQuery.trim() === '') {
                setFilteredUsers(adminUsers);
            } else {
                const filtered = adminUsers.filter(user => {
                    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                    const email = user.email?.toLowerCase() || '';
                    const query = searchQuery.toLowerCase();
                    return fullName.includes(query) || email.includes(query);
                });
                setFilteredUsers(filtered);
            }
        }
    }, [searchQuery, adminUsers]);

    const getUserTypeColor = (type) => {
        switch (type) {
            case 'tenant':
                return '#4CAF50';
            case 'landlord':
                return '#2196F3';
            case 'contractor':
                return '#FF9800';
            default:
                return '#666';
        }
    };

    const getUserTypeIcon = (type) => {
        switch (type) {
            case 'tenant':
                return 'people';
            case 'landlord':
                return 'business';
            case 'contractor':
                return 'construction';
            default:
                return 'person';
        }
    };

  const handleUserPress = (user) => {
  // Temporary: just navigate directly without API call
  if (userType === 'tenant') {
    navigation.navigate('BottomFotter');
  } else if (userType === 'landlord') {
    navigation.navigate('ProfileFooter');
  } else if (userType === 'contractor') {
    navigation.navigate('ContractorHome');
  }
};
    const renderUserCard = ({ item }) => (
        <TouchableOpacity
            style={[styles.userCard, { borderLeftColor: getUserTypeColor(userType) }]}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}>
            <View style={[styles.userIconContainer, { backgroundColor: getUserTypeColor(userType) }]}>
                <Icon name={getUserTypeIcon(userType)} size={28} color="#fff" />
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                {item.phoneNumber && (
                    <Text style={styles.userPhone}>{item.phoneNumber}</Text>
                )}
            </View>
            <AppIcon name={icons.arrowRight} height={hp(3)} width={hp(3)} />
        </TouchableOpacity>
    );

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Icon name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
                {searchQuery ? 'No users found matching your search' : `No ${userType}s found`}
            </Text>
        </View>
    );

    return (
    <Container  scroll={false}>
    
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            activeOpacity={0.7}>
                            <AppIcon name={icons.arrowBack} size={24} />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>
                                {userType.charAt(0).toUpperCase() + userType.slice(1)}s
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                            </Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                            <AppIcon name={icons.search} height={hp(3)} width={hp(3)} />
                        <RNTextInput
                            style={styles.searchInput}
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <AppIcon name={icons.person} height={hp(3)} width={hp(3)} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* User List */}
                    {adminLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={getUserTypeColor(userType)} />
                            <Text style={styles.loadingText}>Loading {userType}s...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            renderItem={renderUserCard}
                            keyExtractor={(item) => item.email || item.userId}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={renderEmptyList}
                        />
                    )}
            
          </Container>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    imageStyle: {
        width: '100%',
        height: 931,
        top: -400,
        left: 0,
        opacity: 0.3,
    },
    gradientOverlay: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(5),
        paddingTop: hp(2),
        paddingBottom: hp(2),
    },
    backButton: {
        padding: 8,
        marginRight: wp(3),
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: hp(2.5),
        fontWeight: 'bold',
        color: Colors.black,
        fontFamily: getFontFamily('bold'),
    },
    headerSubtitle: {
        fontSize: hp(1.6),
        color: '#666',
        fontFamily: getFontFamily('regular'),
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: wp(5),
        marginBottom: hp(2),
        paddingHorizontal: wp(3),
        paddingVertical: hp(1),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: hp(1.8),
        fontFamily: getFontFamily('regular'),
        color: Colors.black,
        padding: 0,
    },
    listContent: {
        paddingHorizontal: wp(5),
        paddingBottom: hp(2),
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: wp(4),
        marginBottom: hp(2),
        borderLeftWidth: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    userIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: wp(3),
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: hp(2),
        fontWeight: 'bold',
        color: Colors.black,
        fontFamily: getFontFamily('bold'),
        marginBottom: 4,
    },
    userEmail: {
        fontSize: hp(1.6),
        color: '#666',
        fontFamily: getFontFamily('regular'),
        marginBottom: 2,
    },
    userPhone: {
        fontSize: hp(1.5),
        color: '#999',
        fontFamily: getFontFamily('regular'),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: hp(2),
        fontSize: hp(1.8),
        color: '#666',
        fontFamily: getFontFamily('regular'),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: hp(10),
    },
    emptyText: {
        marginTop: hp(2),
        fontSize: hp(1.8),
        color: '#999',
        fontFamily: getFontFamily('regular'),
        textAlign: 'center',
    },
});

export default AdminUserList;
