
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Container from '../../components/Container/Container';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';

const ReferralsRewards = ({ navigation }) => {
  const recentData = [
    { name: "Robert Jonas", email: "robert@example.com", status: "First Job Done" },
    { name: "Peter Johnson", email: "peter@example.com", status: "Accepted" },
    { name: "Andrew Thomas", email: "andrew@example.com", status: "Reward Pending" },
  ];

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header Title */}
        <View style={styles.headerRow}>
                 <TouchableOpacity
                            onPress={() => {
                                console.log('Back button pressed');
                                navigation.goBack();
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                          <AppIcon name={icons.arrowBack} size={24} />

                        </TouchableOpacity>
          <Text style={styles.title}>Referrals & Rewards</Text>
        </View>

        <Text style={styles.subtitle}>Grow your network and earn rewards</Text>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.statLabel}>TOTAL REFERRALS</Text>
              <Text style={styles.statValue}>15</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>SUCCESSFUL</Text>
              <Text style={styles.statValue}>08</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View>
            <Text style={styles.statLabel}>TOTAL REWARDS</Text>
            <Text style={styles.rewardValue}>$1,200</Text>
          </View>
        </View>

        {/* Invite Section */}
        <Text style={styles.subHeading}>Invite Landlords</Text>
        <Text style={styles.inviteText}>
          Share your referral link and earn rewards when they complete their first job.
        </Text>

        <TouchableOpacity style={styles.copyButton}>
          <Text style={styles.copyButtonText}>Copy Referral Link</Text>
        </TouchableOpacity>

        {/* Recent Activity */}
        <Text style={styles.subHeading}>Recent Activity</Text>

        {recentData.map((item, index) => (
          <View key={index} style={styles.activityCard}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(5),
    marginTop: hp(2),
  },
  title: {
    fontSize: hp(2.0),
    fontFamily: 'Nunito-Bold',
    marginLeft: wp(3),
    color: Colors.black,
  },
  subtitle: {
    fontSize: hp(1.6),
    marginLeft: wp(5),
    marginTop: hp(0.5),
    color: '#6B7280',
    fontFamily: 'Nunito-Regular',
  },
  statsCard: {
    margin: wp(5),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: wp(5),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: hp(1.4),
    color: '#6B7280',
    fontFamily: 'Nunito-Regular',
  },
  statValue: {
    fontSize: hp(2),
    fontFamily: 'Nunito-Bold',
    marginTop: hp(0.5),
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: hp(2),
  },
  rewardValue: {
    fontSize: hp(2),
    fontFamily: 'Nunito-Bold',
    color: Colors.red || '#E53935',
  },
  subHeading: {
    marginLeft: wp(5),
    marginTop: hp(2),
    fontSize: hp(2),
    fontFamily: 'Nunito-Bold',
  },
  inviteText: {
    marginLeft: wp(5),
    marginRight: wp(5),
    fontSize: hp(1.4),
    color: '#6B7280',
    marginTop: hp(0.5),
  },
  copyButton: {
    backgroundColor: Colors.red,
    marginHorizontal: wp(5),
    marginTop: hp(2),
    paddingVertical: hp(1.8),
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: 'white',
    fontSize: hp(1.4),
    fontFamily: 'Nunito-Bold',
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: wp(5),
    marginTop: hp(1.5),
    padding: wp(4),
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  name: {
    fontSize: hp(2),
    fontFamily: 'Nunito-Bold',
  },
  email: {
    fontSize: hp(1.7),
    color: '#6B7280',
    marginTop: hp(0.5),
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    marginTop: hp(1.2),
  },
  statusText: {
    fontSize: hp(1.4),
    color: Colors.primary || '#E53935',
    fontFamily: 'Nunito-SemiBold',
  },
});

export default ReferralsRewards;
