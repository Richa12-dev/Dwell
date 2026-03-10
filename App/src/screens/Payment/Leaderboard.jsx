
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Container from '../../components/Container/Container';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

const Leaderboard = ({ navigation }) => {
  const data = [
    { rank: "#1", name: "Robert J.", referrals: 45, badge: "Gold" },
    { rank: "#2", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#3", name: "Robert J.", referrals: 45, badge: "Bronze" },
    { rank: "#4", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#5", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#6", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#7", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#8", name: "Robert J.", referrals: 45, badge: "Silver" },
    { rank: "#9", name: "Robert J.", referrals: 45, badge: "Silver" },
  ];

  const badgeColors = {
    Gold: '#FBBF24',
    Silver: '#D1D5DB',
    Bronze: '#F59E0B',
  };

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
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
          <Text style={styles.title}>Top 10 Pros of the Month</Text>
        </View>

        <Text style={styles.subtitle}>Top contractors ranked by successful referrals</Text>

        {/* Leaderboard Card */}
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Rank</Text>
            <Text style={styles.headerText}>Contractor Name</Text>
            <Text style={styles.headerText}>Referrals</Text>
            <Text style={styles.headerText}>Badge</Text>
          </View>

          {data.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.rowText}>{item.rank}</Text>
              <Text style={styles.rowText}>{item.name}</Text>
              <Text style={styles.rowText}>{item.referrals}</Text>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: badgeColors[item.badge] || '#E5E7EB' },
                ]}
              >
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            </View>
          ))}
        </View>

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
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    margin: wp(5),
    borderRadius: 16,
    padding: wp(4),
    elevation: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: hp(1.5),
  },
  headerText: {
    fontSize: hp(1.4),
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
    width: wp(20),
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
  },
  rowText: {
    width: wp(20),
    textAlign: 'center',
    fontSize: hp(1.6),
    fontFamily: 'Nunito-Bold',
    color: Colors.black,
  },
  badge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    color: Colors.black,
    fontFamily: 'Nunito-Bold',
  },
});

export default Leaderboard;
