import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import Container from "../../components/Container/Container";

const AdminDashboard = ({ navigation }) => {

const navigateTo = (userType) => {
  navigation.navigate('UserList', { userType });
  };
  
  return (
    <Container>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />

        <ScrollView contentContainerStyle={styles.container}>

          {/* Header */}
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Select user type to manage
          </Text>

          {/* Tenant */}
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: '#4CAF50' }]}
            onPress={() => navigateTo('tenant')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <AppIcon name={icons.person} height={22} width={22} />
            </View>

            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Tenants</Text>
              <Text style={styles.cardDesc}>View all tenant accounts</Text>
            </View>

            <AppIcon name={icons.arrowRight} height={20} width={20} />
          </TouchableOpacity>

          {/* Landlord */}
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: '#2196F3' }]}
            onPress={() => navigateTo('landlord')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <AppIcon name={icons.person} height={22} width={22} />
            </View>

            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Landlords</Text>
              <Text style={styles.cardDesc}>View all landlord accounts</Text>
            </View>

            <AppIcon name={icons.arrowRight} height={20} width={20} />
          </TouchableOpacity>

          {/* Contractor */}
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: '#FF9800' }]}
            onPress={() => navigateTo('contractor')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF9800' }]}>
              <AppIcon name={icons.person} height={22} width={22} />
            </View>

            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Contractors</Text>
              <Text style={styles.cardDesc}>View all contractor accounts</Text>
            </View>

            <AppIcon name={icons.arrowRight} height={20} width={20} />
          </TouchableOpacity>

          {/* Stats */}
          <Text style={styles.statsTitle}>Quick Stats</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Active Today</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Container>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
   
  },

  container: {
    padding: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 3,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  cardText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  cardDesc: {
    fontSize: 14,
    color: '#666',
  },

  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});

export default AdminDashboard;
