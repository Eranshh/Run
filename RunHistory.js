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

const RunItem = ({ run, onPress }) => {
  // Helper function to safely format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    
    let date;
    
    // Check if it's a Unix timestamp (numeric string)
    if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
      // Convert Unix timestamp (milliseconds) to Date object
      date = new Date(parseInt(dateString));
    } else {
      // Try parsing as regular date string
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity style={styles.runItem} onPress={() => onPress(run)}>
      <View style={styles.runHeader}>
        <Text style={styles.runDate}>{formatDate(run.date)}</Text>
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
};

export default function RunHistory({ navigation, userId, profileId }) {
    const [runs, setRuns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userTracks, setUserTracks] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

    const handleRunPress = (run) => {
        console.log('handleRunPress called with run:', run);
        console.log('userTracks:', userTracks);
        console.log('Looking for trackId:', run.trackId);
        
        const track = userTracks.find(t => t.trackId === run.trackId);
        console.log('Found track:', track);
        
        navigation.navigate('RunSummary', { run, track });
    };

    const handleSortToggle = () => {
        setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
    };

    const getSortedRuns = () => {
        if (!runs || runs.length === 0) return [];
        
        return [...runs].sort((a, b) => {
            let dateA, dateB;
            
            // Handle Unix timestamps for date A
            if (typeof a.date === 'string' && /^\d+$/.test(a.date)) {
                dateA = new Date(parseInt(a.date));
            } else {
                dateA = new Date(a.date);
            }
            
            // Handle Unix timestamps for date B
            if (typeof b.date === 'string' && /^\d+$/.test(b.date)) {
                dateB = new Date(parseInt(b.date));
            } else {
                dateB = new Date(b.date);
            }
            
            // Handle invalid dates by treating them as very old dates
            const isValidDateA = !isNaN(dateA.getTime());
            const isValidDateB = !isNaN(dateB.getTime());
            
            // If both dates are invalid, maintain original order
            if (!isValidDateA && !isValidDateB) return 0;
            
            // If only one date is invalid, put invalid dates at the end
            if (!isValidDateA) return 1;
            if (!isValidDateB) return -1;
            
            if (sortOrder === 'newest') {
                return dateB - dateA; // Newest first
            } else {
                return dateA - dateB; // Oldest first
            }
        });
    };

    useEffect(() => {
        const getUserRuns = async () => {
          try {
            console.log("Fetching runs for user:", profileId);
            const data = await fetchWithAuth(
              `https://runfuncionapp.azurewebsites.net/api/getUsersActivities?userId=${encodeURIComponent(profileId)}`
            );
            
            // Debug: Log the date fields to see what we're getting
            console.log("Raw runs data:", data);
            data.forEach((run, index) => {
              console.log(`Run ${index} date field:`, run.date, 'Type:', typeof run.date);
            });
            
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
    }, [profileId]);
    
    useEffect(() => {
        const getUserTracks = async () => {
          try {
            const data = await fetchWithAuth(
              `https://runfuncionapp.azurewebsites.net/api/getUsersTracks?userId=${encodeURIComponent(profileId)}`
            );
            
            console.log('getUsersTracks raw data:', data);
            console.log('Number of tracks received:', data.length);
            
            // Log each track to see the structure
            data.forEach((track, index) => {
              console.log(`Track ${index}:`, track);
            });
            
            const tracks = data.map(track => ({
              ...track,
              path: typeof track.path === 'string' ? JSON.parse(track.path) : track.path,
            }));
            
            setUserTracks(tracks);
          } catch (error) {
            console.error('Error fetching tracks:', error);
          }
        };
        getUserTracks();
    }, [profileId]);
    
    if (isLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Run History</Text>
                <TouchableOpacity style={styles.sortButton} onPress={handleSortToggle}>
                    <Text style={styles.sortButtonText}>
                        {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={getSortedRuns()}
                renderItem={({ item }) => <RunItem run={item} onPress={handleRunPress} />}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No runs recorded yet</Text>
                    {userId === profileId && <Text style={styles.emptySubtext}>Start running to see your history here!</Text>}
                </View>
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    sortButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    sortButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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