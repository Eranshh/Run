import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { fetchWithAuth } from './utils/api';

export default function RunSummaryScreen({ route }) {
  const { run, track } = route.params;
  const webViewRef = useRef(null);

  // Add state for event details and participants
  const [eventDetails, setEventDetails] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsError, setParticipantsError] = useState(null);



  const sendPathToWebView = () => {
    if (track && track.path && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ path: track.path }));
    }
  };

  // Handle messages from the WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // Handle any WebView messages if needed
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  // Fetch event details if eventId exists
  useEffect(() => {
    if (run.eventId) {
      setLoadingEvent(true);
      setEventError(null);
      fetchWithAuth(`https://runfuncionapp.azurewebsites.net/api/getEventById?eventId=${run.eventId}`)
        .then(data => {
          setEventDetails(data);
        })
        .catch(err => {
          setEventDetails(null);
          setEventError('Failed to load event details.');
          console.log('Error fetching event details:', err);
        })
        .finally(() => setLoadingEvent(false));
    }
  }, [run.eventId]);

  // Fetch participants if eventId exists
  useEffect(() => {
    if (run.eventId) {
      setLoadingParticipants(true);
      setParticipantsError(null);
      fetchWithAuth(`https://runfuncionapp.azurewebsites.net/api/getEventRegisteredUsers?eventId=${run.eventId}`)
        .then(data => {
          setParticipants(data || []);
        })
        .catch(err => {
          setParticipants([]);
          setParticipantsError('Failed to load participants.');
          console.log('Error fetching event participants:', err);
        })
        .finally(() => setLoadingParticipants(false));
    }
  }, [run.eventId]);

  // Compose full participants list with host first (from eventDetails.trainerId)
  let fullParticipants = [];
  if (eventDetails && eventDetails.trainerId) {
    const host = { userId: eventDetails.trainerId, isHost: true };
    const filtered = (participants || []).filter(p => p.userId !== eventDetails.trainerId);
    fullParticipants = [host, ...filtered];
  } else {
    fullParticipants = participants || [];
  }

  useEffect(() => {
    // Also try sending the path when the component mounts
    if (track && track.path) {
      console.log('useEffect - track and path available');
      // Small delay to ensure WebView is ready
      setTimeout(() => {
        sendPathToWebView();
      }, 1000);
    }
  }, [track]);

  // Calculate elevation statistics from track path
  const calculateElevationStats = (path) => {
    if (!path || path.length < 2) {
      return null;
    }
    
    const elevations = path
      .map(point => Array.isArray(point) ? point[2] : point.altitude)
      .filter(alt => alt !== null && alt !== undefined && alt !== 0 && !isNaN(alt));
    
    if (elevations.length === 0) {
      return null;
    }
    
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const totalElevationGain = path.reduce((total, point, index) => {
      if (index === 0) return 0;
      const prevAlt = Array.isArray(path[index - 1]) ? path[index - 1][2] : path[index - 1].altitude;
      const currAlt = Array.isArray(point) ? point[2] : point.altitude;
      if (prevAlt !== null && currAlt !== null && prevAlt !== 0 && currAlt !== 0 && !isNaN(prevAlt) && !isNaN(currAlt) && currAlt > prevAlt) {
        return total + (currAlt - prevAlt);
      }
      return total;
    }, 0);
    
    return {
      min: minElevation,
      max: maxElevation,
      gain: totalElevationGain,
      avg: elevations.reduce((sum, alt) => sum + alt, 0) / elevations.length
    };
  };

  const elevationStats = calculateElevationStats(track?.path);

  // Pick the first available date field
  const runDate = run.timestamp || run.date || run.start_time || run.stop_time;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{run.name || 'Run Summary'}</Text>
      <View style={styles.statsCard}>
        <View style={styles.statRow}><Text style={styles.statLabel}>📅 Date:</Text><Text style={styles.statValue}>{runDate ? new Date(runDate).toLocaleString() : 'N/A'}</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>📏 Distance:</Text><Text style={styles.statValue}>{(run.distance / 1000).toFixed(2)} km</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>⏱️ Duration:</Text><Text style={styles.statValue}>{Math.floor(run.duration / 60)} min</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>🏃 Pace:</Text><Text style={styles.statValue}>{run.averagePace?.toFixed(2) || 'N/A'} min/km</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>🚀 Speed:</Text><Text style={styles.statValue}>{run.averageSpeed?.toFixed(1) || 'N/A'} km/h</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>🔥 Calories:</Text><Text style={styles.statValue}>{run.calories?.toFixed(0) || 'N/A'}</Text></View>
        {elevationStats && (
          <>
            <View style={styles.statRow}><Text style={styles.statLabel}>⛰️ Elevation Gain:</Text><Text style={styles.statValue}>{elevationStats.gain.toFixed(0)} m</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>📈 Max Elevation:</Text><Text style={styles.statValue}>{elevationStats.max.toFixed(0)} m</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>📉 Min Elevation:</Text><Text style={styles.statValue}>{elevationStats.min.toFixed(0)} m</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>📊 Avg Elevation:</Text><Text style={styles.statValue}>{elevationStats.avg.toFixed(0)} m</Text></View>
          </>
        )}
        <View style={styles.statRow}><Text style={styles.statLabel}>🏷️ Type:</Text><Text style={styles.statValue}>{run.type}</Text></View>
        <View style={styles.statRow}><Text style={styles.statLabel}>🗺️ Route:</Text><Text style={styles.statValue}>{run.route}</Text></View>
      </View>
      {/* Participant List */}
      {run.eventId && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsTitle}>Participants:</Text>
          {loadingEvent ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : eventError ? (
            <Text style={styles.noParticipants}>{eventError}</Text>
          ) : loadingParticipants ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : participantsError ? (
            <Text style={styles.noParticipants}>{participantsError}</Text>
          ) : fullParticipants && fullParticipants.length > 0 ? (
            fullParticipants.map((p, idx) => (
              <Text key={p.userId || idx} style={styles.participantName}>
                {p.isHost ? '👑 ' : ''}{p.userId}
              </Text>
            ))
          ) : (
            <Text style={styles.noParticipants}>No participants found.</Text>
          )}
        </View>
      )}
      {track && track.path ? (
        <WebView
          ref={webViewRef}
          source={require('./runSummaryMap.html')}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onLoad={sendPathToWebView}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
          }}
          onMessage={handleWebViewMessage}
        />
      ) : (
        <View style={styles.noMapContainer}>
          <Text>No map data available</Text>
          <Text>Track: {track ? 'Present' : 'Missing'}</Text>
          <Text>Path: {track?.path ? 'Present' : 'Missing'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
  statsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  statValue: {
    fontSize: 16,
    color: '#007AFF',
    flexShrink: 1,
    textAlign: 'right',
  },
  map: {
    width: Dimensions.get('window').width - 32,
    height: 250,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden'
  },
  noMapContainer: {
    width: Dimensions.get('window').width - 32,
    height: 250,
    marginTop: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  participantsContainer: {
    marginBottom: 18,
    padding: 12,
    backgroundColor: '#F3F8FF',
    borderRadius: 8,
  },
  participantsTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 8,
    color: '#007AFF',
  },
  participantName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  noParticipants: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
}); 