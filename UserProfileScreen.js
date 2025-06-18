import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

// Placeholder data for development
const MOCK_RUNS = [
  {
    id: '1',
    date: '2024-03-15',
    distance: 5.2,
    duration: 32,
    type: 'Free Run',
    route: 'Tel Aviv Beach',
  },
  {
    id: '2',
    date: '2024-03-14',
    distance: 3.8,
    duration: 25,
    type: 'Event',
    route: 'Park Hayarkon',
  },
  {
    id: '3',
    date: '2024-03-12',
    distance: 7.5,
    duration: 45,
    type: 'Free Run',
    route: 'City Center',
  },
];

const RunItem = ({ run }) => (
  <TouchableOpacity style={styles.runItem}>
    <View style={styles.runHeader}>
      <Text style={styles.runDate}>{run.date}</Text>
      <Text style={styles.runType}>{run.type}</Text>
    </View>
    <View style={styles.runDetails}>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Distance</Text>
        <Text style={styles.detailValue}>{run.distance} km</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Duration</Text>
        <Text style={styles.detailValue}>{run.duration} min</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Route</Text>
        <Text style={styles.detailValue}>{run.route}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function UserProfileScreen({ navigation, username }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchUserRuns = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRuns(MOCK_RUNS);
      } catch (error) {
        console.error('Error fetching runs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRuns();
  }, []);

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
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.subtitle}>Run History</Text>
      </View>
      
      <FlatList
        data={runs}
        renderItem={({ item }) => <RunItem run={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
}); 