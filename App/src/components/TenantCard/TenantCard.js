import React from 'react';
import { StyleSheet } from 'react-native';
import { Box, HStack, VStack, Text, Badge, Pressable, Image } from 'native-base';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const TenantCard = React.memo(({ tenant, onPress }) => {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return 'green.500';
      case 'pending': return 'orange.500';
      case 'overdue': return 'red.500';
      case 'in progress': return 'blue.500';
      default: return 'gray.500';
    }
  };

  const tenantName = tenant?.name || tenant?.tenant_name || tenant?.firstName + ' ' + tenant?.lastName || 'N/A';
    const tenantAddress = tenant?.property_address || 'No address';
  const tenantStatus = tenant?.status || tenant?.payment_status || 'Pending';
  const tenantAvatar = tenant?.avatar || tenant?.profile_image || tenant?.photo;
    
    const getInitials = (name) => {
       if (!name) return 'T';
       const names = name.trim().split(' ');
       if (names.length >= 2) {
         return `${names[0][0]}${names[1][0]}`.toUpperCase();
       }
       return name[0].toUpperCase();
     };

  return (
    <Pressable mb={4} onPress={onPress}>
      <Box bg="white" rounded="2xl" overflow="hidden" shadow={3} style={styles.cardShadow}>
        <HStack p={4} space={3} alignItems="center">
          <Box
            w={12}
            h={12}
            rounded="full"
            bg="gray.200"
            justifyContent="center"
            alignItems="center"
            overflow="hidden"
          >
            {tenantAvatar ? (
              <Image
                source={{ uri: tenantAvatar }}
                alt={tenantName}
                w="100%"
                h="100%"
                resizeMode="cover"
              />
            ) : (
                 <Text fontSize="lg" fontWeight="bold" color="gray.600">
                                {getInitials(tenantName)}
                              </Text>
                 )}
          </Box>

          <VStack flex={1} space={1}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              {tenantName}
            </Text>
            <Text fontSize="sm" color="gray.500" numberOfLines={1}>
              {tenantAddress}
            </Text>
          </VStack>

          <Badge
            bg={getStatusColor(tenantStatus)}
            rounded="lg"
            px={3}
            py={1}
            _text={{
              fontSize: "xs",
              fontWeight: "600",
              color: "white"
            }}
          >
            {tenantStatus}
          </Badge>
        </HStack>
      </Box>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default TenantCard;

