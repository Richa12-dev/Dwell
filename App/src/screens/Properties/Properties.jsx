import React, { useEffect, useState } from 'react';
import { ScrollView, RefreshControl, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Text, VStack, HStack, Button, Divider, Badge,
  StatusBar as RNStatusBar, Spinner, Alert
} from 'native-base';
import { Colors } from '../../Theme';
import CollectionNavBar from '../../components/CollectionNavBar/CollectionNavBar';
import { getTenantProperties } from '../../Redux/Properties/servicesNode';
import { propertiesSelectors } from '../../Redux/Properties/propertiesSlice';
import { Image } from 'native-base';
import Swiper from 'react-native-swiper';

const Properties = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    tenantProperties,
    loading,
    error,
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits
  } = useSelector(propertiesSelectors.getPropertiesData);

// 🔧 FIX: Get the actual token string, not boolean
const loginData = useSelector(state => state.loginData || state.login || {});
const tenantId = loginData?.userData?.tenantId || 
                 loginData?.userData?.id || 
                 loginData?.user?.tenantId ||
                 loginData?.user?.id;
const userRole = loginData?.userData?.role || loginData?.user?.role;
const token = loginData?.token; // This should be the actual JWT string

console.log('🏠 Properties Component - User Info:', {
  tenantId,
  userRole,
  token: token ? `${token.substring(0, 20)}...` : 'Missing', // Log partial token for security
  tokenType: typeof token,
  loginData: {
    ...loginData,
    token: token ? 'Present' : 'Missing' // Don't log full token
  }
});

useEffect(() => {
  console.log('📄 useEffect triggered with:', { 
    tenantId, 
    userRole, 
    hasToken: !!token,
    tokenType: typeof token 
  });
  
  // 🔧 FIX: Validate token is a string
  if (tenantId && userRole === 'tenant' && token && typeof token === 'string') {
    console.log('✅ Loading tenant properties for:', tenantId);
    dispatch(getTenantProperties({ tenantId, token }));
  } else {
    console.log('❌ Cannot load properties:', {
      hasTenantId: !!tenantId,
      isTenant: userRole === 'tenant',
      hasToken: !!token,
      tokenIsString: typeof token === 'string',
      actualRole: userRole,
      tokenValue: token
    });
  }
}, [dispatch, tenantId, userRole, token]);

const handleRefresh = () => {
  if (tenantId && userRole === 'tenant' && token && typeof token === 'string') {
    console.log('🔄 Refreshing tenant properties');
    dispatch(getTenantProperties({ tenantId, token }));
  } else {
    console.log('❌ Cannot refresh - missing required data');
  }
};

  const formatPropertyStatus = (property) => {
    // For tenant view, show rental status
    if (property.rental_status === 'active') {
      return { label: 'Currently Rented', color: 'green' };
    } else if (property.rental_status === 'pending') {
      return { label: 'Rental Pending', color: 'orange' };
    } else {
      return { label: 'Rental Ended', color: 'red' };
    }
  };

  const formatPropertyInfo = (property) => {
    const bedrooms = property.bedrooms || 'N/A';
    const bathrooms = property.bathrooms || 'N/A';
    const rent = property.monthly_rent ? `$${property.monthly_rent}/mo` : 'N/A';
    return `${bedrooms}BR/${bathrooms}BA • ${rent}`;
  };

  const formatAddress = (property) => {
    const parts = [];
    if (property.address) parts.push(property.address);
    if (property.city) parts.push(property.city);
    if (property.state) parts.push(property.state);
    if (property.zip_code) parts.push(property.zip_code);
    return parts.join(', ');
  };

  const handleViewDetails = (property) => {
    navigation.navigate('PropertyDetails', { property });
  };

  // 🔧 FIX: Better validation
  if (!tenantId || userRole !== 'tenant') {
    return (
      <>
        <RNStatusBar
          backgroundColor={Colors.black || Colors.red || "#FF0000"}
          barStyle="light-content"
          translucent={false}
        />
        <CollectionNavBar />
        <Box flex={1} bg="#f5f5f5" justifyContent="center" alignItems="center" p={4}>
          <VStack alignItems="center" space={3}>
            <Text fontSize="lg" color="red.500" textAlign="center">
              {!tenantId 
                ? 'Tenant ID not found. Please contact support.'
                : 'Please login as a tenant to view your rented properties'
              }
            </Text>
            {!tenantId && (
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Your profile should have a valid tenant ID to view properties.
              </Text>
            )}
          </VStack>
        </Box>
      </>
    );
  }

  // 🔧 FIX: Check for missing or invalid token
  if (!token || typeof token !== 'string') {
    return (
      <>
        <RNStatusBar
          backgroundColor={Colors.black || Colors.red || "#FF0000"}
          barStyle="light-content"
          translucent={false}
        />
        <CollectionNavBar />
        <Box flex={1} bg="#f5f5f5" justifyContent="center" alignItems="center" p={4}>
          <VStack alignItems="center" space={3}>
            <Text fontSize="lg" color="red.500" textAlign="center">
              Authentication token is missing or invalid
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Please log out and log in again to refresh your session.
            </Text>
            <Button onPress={() => navigation.navigate('Login')}>
              Go to Login
            </Button>
          </VStack>
        </Box>
      </>
    );
  }

  if (loading && (!tenantProperties || tenantProperties.length === 0)) {
    return (
      <>
        <RNStatusBar
          backgroundColor={Colors.black || Colors.red || "#FF0000"}
          barStyle="light-content"
          translucent={false}
        />
        <CollectionNavBar />
        <Box flex={1} bg="#f5f5f5" justifyContent="center" alignItems="center">
          <Spinner size="lg" color="red.500" />
          <Text mt={3} fontSize="md">Loading your properties...</Text>
        </Box>
      </>
    );
  }

  return (
    <>
      <RNStatusBar
        backgroundColor={Colors.black || Colors.red || "#FF0000"}
        barStyle="light-content"
        translucent={false}
      />
      <CollectionNavBar />

      <VStack space={4} p={4}>
        {/* Header */}
        <HStack justifyContent="space-between" alignItems="center">
          <Text fontSize="xl" bold>My Properties</Text>
          {/* <Badge colorScheme="blue" rounded="md">
            {tenantProperties?.length || 0} Properties
          </Badge> */}
        </HStack>

        {/* No properties message */}
        {(!tenantProperties || tenantProperties.length === 0) && !loading && (
          <Box bg="white" p={8} rounded="xl" shadow={2} alignItems="center">
            <Text color="gray.500" fontSize="md">No rented properties found</Text>
            <Text color="gray.400" fontSize="sm" mt={1} textAlign="center">
              You don't have any active rental properties assigned to your tenant ID: {tenantId}
            </Text>
            <Text color="gray.400" fontSize="xs" mt={2} textAlign="center">
              If you believe this is an error, please contact your landlord to verify your tenant assignment.
            </Text>
            <Button 
              mt={3} 
              size="sm" 
              variant="outline" 
              colorScheme="blue"
              onPress={handleRefresh}
            >
              Refresh
            </Button>
          </Box>
        )}

        <FlatList
          data={tenantProperties || []}
          keyExtractor={(item, index) => String(item.id || item.ID || index)}
          renderItem={({ item: property, index }) => {
            const status = formatPropertyStatus(property);
            return (
              <Box
                key={property.id || property.ID || index}
                bg="white"
                p={4}
                rounded="xl"
                shadow={2}
                borderWidth={1}
                borderColor="gray.100"
                mb={4}
              >
                {/* Header with name + status */}
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <Text fontSize="lg" bold numberOfLines={2} flex={1}>
                    {property.name}
                  </Text>
                  <Badge
                    colorScheme={status.color}
                    rounded="md"
                    variant="subtle"
                    px={3}
                    py={1}
                    ml={2}
                  >
                    {status.label}
                  </Badge>
                </HStack>

                <HStack space={3} alignItems="flex-start" mt={3}>
                  <Box w={24} h={24} rounded="md" overflow="hidden">
                    {property.images && property.images.length > 1 ? (
                      <Swiper autoplay loop showsPagination={false} autoplayTimeout={3}>
                        {property.images.map((img, idx) => {
                          let source = null;

                          if (typeof img === "string") {
                            source = {
                              uri: img.startsWith("data:image")
                                ? img
                                : `data:image/jpeg;base64,${img}`,
                            };
                          } else if (img.uri) {
                            source = { uri: img.uri };
                          } else if (img.base64) {
                            source = { uri: `data:image/jpeg;base64,${img.base64}` };
                          }

                          return (
                            <Image
                              key={idx}
                              source={source}
                              alt={`Property-${idx}`}
                              w="100%"
                              h="100%"
                              resizeMode="cover"
                              fallbackSource={require("../../Assets/Image/empty-box.png")}
                            />
                          );
                        })}
                      </Swiper>
                    ) : property.images && property.images.length === 1 ? (
                      <Image
                        source={{
                          uri: property.images[0].startsWith("data:image")
                            ? property.images[0]
                            : `data:image/jpeg;base64,${property.images[0]}`,
                        }}
                        alt="Property"
                        w="100%"
                        h="100%"
                        resizeMode="cover"
                        fallbackSource={require("../../Assets/Image/empty-box.png")}
                      />
                    ) : (
                      <Image
                        source={require("../../Assets/Image/empty-box.png")}
                        alt="Property"
                        w="100%"
                        h="100%"
                        resizeMode="cover"
                      />
                    )}
                  </Box>

                  {/* Right: Property Info */}
                  <VStack flex={1} space={2}>
                    {(property.address || property.city || property.state) && (
                      <Text fontSize="sm" color="gray.600" numberOfLines={2}>
                        📍 {formatAddress(property)}
                      </Text>
                    )}

                    <Text fontSize="sm" color="gray.600">
                      🏠 {formatPropertyInfo(property)}
                    </Text>

                    {property.property_type && (
                      <Text fontSize="sm" color="blue.600" fontWeight="medium">
                        🏢 {property.property_type}
                      </Text>
                    )}

                    {/* Show rental period */}
                    {property.rental_start_date && (
                      <Text fontSize="sm" color="green.600" fontWeight="medium">
                        📅 Rented since: {new Date(property.rental_start_date).toLocaleDateString()}
                      </Text>
                    )}

                    {/* Show tenant ID for verification */}
                    {/* {property.tenant_id && (
                      <Text fontSize="xs" color="gray.500">
                        Tenant ID: {property.tenant_id}
                      </Text>
                    )} */}
                  </VStack>
                </HStack>

                {/* Actions */}
                <Divider mt={3} />
                <HStack space={2} justifyContent="flex-end" mt={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onPress={() => handleViewDetails(property)}
                  >
                    View Details
                  </Button>
                  {/* Add tenant-specific actions */}
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="green"
                    onPress={() => navigation.navigate('PayRent', { property })}
                  >
                    Pay Rent
                  </Button>
                </HStack>
              </Box>
            );
          }}
          contentContainerStyle={{ paddingBottom: 50 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        />
      </VStack>
    </>
  );
};

export default Properties;
