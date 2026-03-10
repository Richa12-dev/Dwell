import React from 'react';
import { StyleSheet } from 'react-native';
import { Box, HStack, VStack, Text, Badge, Pressable, Image } from 'native-base';

const TenantCard = React.memo(({ tenant, onPress }) => {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return 'green.500';
      case 'active': return 'green.500';
      case 'pending': return 'orange.500';
      case 'overdue': return 'red.500';
      case 'in progress': return 'blue.500';
      case 'inactive': return 'gray.500';
      default: return 'gray.500';
    }
  };

  // ✅ FIXED: Better name extraction with fallbacks
  const tenantName =
    tenant?.name ||
    tenant?.tenant_name ||
    (tenant?.firstName && tenant?.lastName ? `${tenant.firstName} ${tenant.lastName}` : null) ||
    tenant?.email?.split('@')[0] ||
    'Unknown Tenant';

  // ✅ FIXED: Better address extraction
  const tenantAddress =
    tenant?.address ||
    tenant?.property_address ||
    tenant?.propertyAddress ||
    (tenant?.street ? `${tenant.street}, ${tenant.city || ''}`.trim() : null) ||
    'No address provided';

  // ✅ FIXED: Better status extraction
  const tenantStatus =
    tenant?.status ||
    tenant?.payment_status ||
    tenant?.paymentStatus ||
    'Pending';

  // ✅ FIXED: Better avatar/photo extraction
  const tenantAvatar =
    tenant?.avatar ||
    tenant?.profile_image ||
    tenant?.profileImage ||
    tenant?.photo ||
    tenant?.image;

  // ✅ ADDED: Extract additional info
  const tenantEmail = tenant?.email || '';
  const tenantPhone = tenant?.phone || tenant?.phoneNumber || '';

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
              <Text fontSize="xl" fontWeight="bold" color="gray.600">
                {tenantName?.charAt(0)?.toUpperCase() || 'T'}
              </Text>
            )}
          </Box>

          <VStack flex={1} space={1}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              {tenantName}
            </Text>
            {tenantEmail && (
              <Text fontSize="xs" color="gray.500" numberOfLines={1}>
                {tenantEmail}
              </Text>
            )}
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
