// components/LandlordSupportCard/LandlordSupportCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getFontFamily } from '../../utils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";


const LandlordSupportCard = ({ ticket, onPress }) => {
 
    
    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        
        // ✅ Fixed: Handle all status cases properly
        if (s === 'resolved' || s === 'completed' || s === 'closed') {
          return { bg: '#DBEAFE', color: '#2563EB', text: 'Resolved' };
        }
        if (s === 'in progress' || s === 'in_progress' || s === 'inprogress') {
          return { bg: '#D1FAE5', color: '#059669', text: 'In Progress' };
        }
        if (s === 'pending' || s === 'new' || s === 'open' || s === 'new request') {
          return { bg: '#FEF3C7', color: '#D97706', text: 'New Request' };
        }
        
        // Default fallback
        return { bg: '#F3F4F6', color: '#6B7280', text: status };
      };

      const getPriorityStyle = (priority) => {
        const p = (priority || 'medium').toLowerCase();
        if (p === 'high') return { bg: '#FEE2E2', color: '#DC2626', text: 'High' };
        if (p === 'low') return { bg: '#DBEAFE', color: '#2563EB', text: 'Low' };
        return { bg: '#FEF3C7', color: '#D97706', text: 'Medium' };
      };
    
    const getInitials = (name) => {
      if (!name || name === 'Unknown Tenant') return 'UT';
      
      const words = name.trim().split(' ').filter(word => word.length > 0);
      
      if (words.length === 0) return 'UT';
      if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
      
      // Get first letter of first name and first letter of last name
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };
    
    const getAvatarColor = (name) => {
        const colors = [
          Colors.avatarRed || '#EF4444',
          Colors.avatarAmber || '#F59E0B',
          Colors.avatarEmerald || '#10B981',
          Colors.avatarBlue || '#3B82F6',
          Colors.avatarViolet || '#8B5CF6',
          Colors.avatarPink || '#EC4899',
          Colors.avatarCyan || '#06B6D4',
          Colors.avatarOrange || '#F97316',
        ];
        
        if (!name) return colors[0];
       
       // Generate consistent color based on name
       const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
       return colors[charSum % colors.length];
     };


  // Extract data with fallbacks
  const ticketId = ticket.ticket_id || ticket.id || 'N/A';
  
  const title = ticket.title || ticket.subject || 'Untitled';
  const description = ticket.description || '';
  const category = ticket.category || ticket.queryType || 'General';
  const priority = ticket.priority || 'Medium';
  const status = ticket.displayStatus || ticket.status || 'Pending';
  const createdAt = ticket.created_at || new Date().toISOString();
    const tenant =
      ticket?.contractor_job_snapshot?.tenant || ticket?.tenant;

    const tenantName =
      tenant?.firstName || tenant?.lastName
        ? `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim()
        : ticket?.tenant_name || 'Unknown Tenant';
      
  const responseCount = ticket.response_count || 0;
  const tenantAvatar = ticket.tenant_avatar || null;

  const priorityStyle = getPriorityStyle(priority);
  const statusStyle = getStatusStyle(status);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(ticket)}>
      <View style={styles.cardContainer}>
        {/* Header: Avatar + Tenant Info + Badges */}
        <View style={styles.cardHeader}>
          <View style={styles.leftSection}>
            {/* Avatar */}
          {tenantAvatar ? (
                       <Image source={{ uri: tenantAvatar }} style={styles.avatar} />
                     ) : (
                       <View style={[
                         styles.avatarPlaceholder,
                         { backgroundColor: getAvatarColor(tenantName) }
                       ]}>
                         <Text style={styles.initialsText}>
                           {getInitials(tenantName)}
                         </Text>
                       </View>
                     )}
            
            {/* Tenant Name + ID */}
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{tenantName}</Text>
            </View>
          
          
          
     
          

          {/* Right: Priority + Status Badges */}
          <View style={styles.badgesContainer}>
            <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.badgeText, { color: priorityStyle.color }]}>
                {priorityStyle.text}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                {statusStyle.text}
              </Text>
            </View>
          </View>
        </View>
          
    </View>

        {/* Level + Category */}
        <View style={styles.metaRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Level 1</Text>
          </View>
          <Text style={styles.categoryText}>{category}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {/* Footer: Date + Responses */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
          <AppIcon
            name={icons.calender}
            height={hp(2)}
            width={hp(2)}
            color={Colors.placeholder}
          />
            <Text style={styles.footerText}>{formatDate(createdAt)}</Text>
          </View>
          {responseCount > 0 && (
            <View style={styles.footerItem}>
            <AppIcon
                     name={icons.comment}
                     height={hp(2)}
                     width={hp(2)}
                     color={Colors.placeholder}
                   />
                    
            <Text style={styles.footerText}>{responseCount} Response{responseCount !== 1 ? 's' : ''}</Text>
            
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default LandlordSupportCard;

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.backgroundColor,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1),
    marginHorizontal: wp(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(0.5),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    marginRight: wp(3),
  },
  avatarPlaceholder: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(6),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: hp(1.6),
    fontWeight: '700',
    fontFamily: getFontFamily('bold'),
    color: '#111827',
    marginBottom: hp(0.3),
  },
    initialsText:{
        fontSize: hp(2),
        fontWeight: '600',
        fontFamily: getFontFamily('regular'),
        color: '#FFFFFF',
    },
  cardId: {
    fontSize: hp(1.5),
      fontFamily: getFontFamily('regular'),
      color: '#6B7280',
      marginTop: 2,
      marginBottom: hp(0.8),
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(1.5),
  },
  badgeText: {
    fontSize: hp(1.4),
    fontWeight: '600',
    fontFamily: getFontFamily('semiBold'),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  levelBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
    marginRight: wp(2),
  },
  levelText: {
    fontSize: hp(1.4),
    color: '#4F46E5',
    fontWeight: '600',
    fontFamily: getFontFamily('semiBold'),
  },
  categoryText: {
    fontSize: hp(1.6),
    fontFamily: getFontFamily('regular'),
    color: '#6B7280',
  },
  title: {
    fontSize: hp(1.6),
    fontWeight: '700',
    fontFamily: getFontFamily('bold'),
    color: '#111827',
    marginBottom: hp(0.8),
    lineHeight: hp(2.6),
  },
  description: {
    fontSize: hp(1.4),
    fontFamily: getFontFamily('regular'),
    color: '#6B7280',
    lineHeight: hp(2.2),
    marginBottom: hp(1.2),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(5),
  },
  footerText: {
    fontSize: hp(1.5),
    fontFamily: getFontFamily('regular'),
    color: '#6B7280',
    marginLeft: wp(1.5),
  },
});
