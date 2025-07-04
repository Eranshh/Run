import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { fetchWithAuth } from './utils/api';
import TrackPreviewModal from './TrackPreviewModal';

export default function SelectTrackScreen({ navigation, route }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [previewTrack, setPreviewTrack] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/getAllTracks');
      
      // Process tracks to calculate distance and add display info
      const processedTracks = data.map(track => {
        const path = typeof track.path === 'string' ? JSON.parse(track.path) : track.path;
        const distance = calculateDistance(path);
        return {
          ...track,
          path: path,
          distance: distance,
          displayName: track.name || 'Unnamed Track',
          difficulty: track.difficulty || 'Beginner'
        };
      });

      setTracks(processedTracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      Alert.alert('Error', 'Failed to load tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (path) => {
    if (!path || path.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      totalDistance += getDistanceFromLatLonInMeters(prev[1], prev[0], curr[1], curr[0]);
    }
    return totalDistance;
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in meters
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const handleTrackSelect = (track) => {
    if (track === 'free') {
      // Navigate to free run
      navigation.navigate('mainMap', { mode: 'freeRun' });
    } else {
      // Show preview for tracks
      setPreviewTrack(track);
      setShowPreview(true);
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewTrack(null);
  };

  const handlePreviewSelect = (track) => {
    setShowPreview(false);
    setPreviewTrack(null);
    // Navigate to guided run with selected track
    navigation.navigate('mainMap', { 
      mode: 'guidedRun', 
      selectedTrack: track 
    });
  };

  const renderTrackItem = ({ item }) => {
    if (item === 'free') {
      return (
        <TouchableOpacity 
          style={[styles.trackCard, styles.freeRunCard]} 
          onPress={() => handleTrackSelect('free')}
        >
          <View style={styles.trackHeader}>
            <Text style={styles.trackName}>🏃 Free Run</Text>
            <Text style={styles.difficulty}>No set route</Text>
          </View>
          <Text style={styles.trackDescription}>
            Run anywhere you want without following a predefined track
          </Text>
          <View style={styles.trackFooter}>
            <Text style={styles.distance}>Flexible distance</Text>
            <TouchableOpacity style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Start Free Run</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.trackCard} 
        onPress={() => handleTrackSelect(item)}
      >
        <View style={styles.trackHeader}>
          <Text style={styles.trackName}>{item.displayName}</Text>
          <Text style={[styles.difficulty, styles[`difficulty${item.difficulty}`]]}>
            {item.difficulty}
          </Text>
        </View>
        <Text style={styles.trackDescription}>
          {item.description || 'A great running track for your workout'}
        </Text>
        <View style={styles.trackFooter}>
          <Text style={styles.distance}>
            {(item.distance / 1000).toFixed(1)} km
          </Text>
          <TouchableOpacity style={styles.selectButton}>
            <Text style={styles.selectButtonText}>Preview Track</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Choose Your Run</Text>
      <Text style={styles.headerSubtitle}>
        Select a recommended track or go for a free run
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tracks...</Text>
      </View>
    );
  }

  // Add free run option at the beginning of the list
  const tracksWithFree = ['free', ...tracks];

  return (
    <View style={styles.container}>
      <FlatList
        data={tracksWithFree}
        renderItem={renderTrackItem}
        keyExtractor={(item, index) => item === 'free' ? 'free' : item.trackId || index.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <TrackPreviewModal
        visible={showPreview}
        track={previewTrack}
        onClose={handlePreviewClose}
        onSelectTrack={handlePreviewSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  trackCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  freeRunCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  difficulty: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  difficultyBeginner: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  difficultyIntermediate: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  difficultyAdvanced: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  trackDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  trackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
}); 