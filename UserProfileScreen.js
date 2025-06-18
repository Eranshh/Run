import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { fetchWithAuth } from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

const RunItem = ({ run }) => (
  <TouchableOpacity style={styles.runItem}>
    <View style={styles.runHeader}>
      <Text style={styles.runDate}>{new Date(run.date).toLocaleDateString()}</Text>
      <Text style={styles.runType}>{run.type}</Text>
    </View>
    <View style={styles.runDetails}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Distance</Text>
        <Text style={styles.detailValue}>{(run.distance / 1000).toFixed(2)} km</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Duration</Text>
        <Text style={styles.detailValue}>{Math.floor(run.duration / 60)} min</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Pace</Text>
        <Text style={styles.detailValue}>{run.averagePace?.toFixed(2) || 'N/A'} min/km</Text>
      </View>
    </View>
    <View style={styles.runDetails}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Speed</Text>
        <Text style={styles.detailValue}>{run.averageSpeed?.toFixed(1) || 'N/A'} km/h</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Calories</Text>
        <Text style={styles.detailValue}>{run.calories?.toFixed(0) || 'N/A'}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Route</Text>
        <Text style={styles.detailValue}>{run.route}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function UserProfileScreen({ navigation, username, userId, onLogout }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  useEffect(() => {
    const getUserRuns = async () => {
      try {
        console.log("Fetching runs for user:", userId);
        const data = await fetchWithAuth(
          `https://runfuncionapp.azurewebsites.net/api/getUsersActivities?userId=${encodeURIComponent(userId)}`
        );
        setRuns(data);
      } catch (error) {
        console.error('Error fetching runs:', error);
        Alert.alert(
          'Error',
          'Failed to load your run history. Please try again later.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    getUserRuns();
  }, [userId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.subtitle}>Run History</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={runs}
        renderItem={({ item }) => <RunItem run={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No runs recorded yet</Text>
            <Text style={styles.emptySubtext}>Start running to see your history here!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  runItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  runDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  runType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  runDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 