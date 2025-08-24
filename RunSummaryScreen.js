import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';

import { WebView } from 'react-native-webview';
import { LineChart } from 'react-native-chart-kit';
import { fetchWithAuth } from './utils/api';


const { width: screenWidth } = Dimensions.get('window');

// Chart configuration for elevation graph
const elevationChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green color for elevation
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '3',
    strokeWidth: '1',
    stroke: '#4CAF50',
  },
  propsForBackgroundLines: {
    strokeDasharray: '', // Solid lines
    stroke: 'rgba(0, 0, 0, 0.1)',
    strokeWidth: 1,
  },
};

export default function RunSummaryScreen({ route }) {
  const { run, track } = route.params;
  const webViewRef = useRef(null);
  
  // Debug logging
  console.log('RunSummaryScreen - Run data:', run);
  console.log('RunSummaryScreen - Track data:', track);
  console.log('RunSummaryScreen - Track path length:', track?.path?.length || 'No path');
  console.log('RunSummaryScreen - Track path sample:', track?.path?.slice(0, 3) || 'No path');

  // Add state for event details and participants
  const [eventDetails, setEventDetails] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsError, setParticipantsError] = useState(null);
  const [trackData, setTrackData] = useState(track);
  const [loadingTrack, setLoadingTrack] = useState(false);



  const sendPathToWebView = () => {
    console.log('sendPathToWebView called');
    console.log('trackData:', trackData);
    console.log('trackData.path:', trackData?.path);
    console.log('original track:', track);
    console.log('original track.path:', track?.path);
    console.log('webViewRef.current:', webViewRef.current);
    
    // Use trackData if available, otherwise fall back to original track
    const pathToSend = trackData?.path || track?.path;
    
    if (pathToSend && webViewRef.current) {
      console.log('Sending path to WebView, path length:', pathToSend.length);
      webViewRef.current.postMessage(JSON.stringify({ path: pathToSend }));
    } else {
      console.log('Cannot send path to WebView - missing data');
    }
  };

  // Fetch track data if it's missing but we have a trackId
  const fetchTrackData = async (trackId) => {
    if (!trackId) return;
    
    setLoadingTrack(true);
    try {
      console.log('Fetching track data for trackId:', trackId);
      const data = await fetchWithAuth(`https://runfuncionapp.azurewebsites.net/api/getTrackById?trackId=${trackId}`);
      console.log('Track data fetched:', data);
      console.log('Track path length:', data.path ? data.path.length : 'No path');
      console.log('Track path sample:', data.path ? data.path.slice(0, 3) : 'No path');
      
      if (data.path && Array.isArray(data.path)) {
        console.log('Track data is valid, setting trackData');
        setTrackData(data);
      } else {
        console.error('Invalid track data format:', data);
        setTrackData(null);
      }
    } catch (error) {
      console.error('Error fetching track data:', error);
      setTrackData(null);
    } finally {
      setLoadingTrack(false);
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
    // If we don't have track data but have a trackId in the run, fetch it
    if (!trackData && run.trackId) {
      console.log('No track data available, fetching from trackId:', run.trackId);
      fetchTrackData(run.trackId);
    }
  }, [run.trackId, trackData]);

  useEffect(() => {
    // Also try sending the path when the component mounts
    if ((trackData && trackData.path) || (track && track.path)) {
      console.log('useEffect - track data available');
      // Small delay to ensure WebView is ready
      setTimeout(() => {
        sendPathToWebView();
      }, 1000);
    }
  }, [trackData, track]);

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

  // Use trackData if available, otherwise fall back to original track
  const pathForElevation = trackData?.path || track?.path;
  const elevationStats = calculateElevationStats(pathForElevation);

  // Generate elevation chart data
  const generateElevationChartData = (path) => {
    if (!path || path.length < 2) return null;
    
    // Extract elevation data and filter out invalid values
    const elevations = path
      .map(point => Array.isArray(point) ? point[2] : point.altitude)
      .filter(alt => alt !== null && alt !== undefined && alt !== 0 && !isNaN(alt));
    
    if (elevations.length < 2) return null;
    
    // Sample data points for the chart (max 50 points to avoid overcrowding)
    const maxPoints = 50;
    const step = Math.max(1, Math.floor(elevations.length / maxPoints));
    const sampledElevations = [];
    
    for (let i = 0; i < elevations.length; i += step) {
      sampledElevations.push(elevations[i]);
    }
    
    // Add the last point if it's not included
    if (sampledElevations[sampledElevations.length - 1] !== elevations[elevations.length - 1]) {
      sampledElevations.push(elevations[elevations.length - 1]);
    }
    
    // Create labels for the x-axis (distance markers)
    const labels = sampledElevations.map((_, index) => {
      const progress = index / (sampledElevations.length - 1);
      const distance = (progress * (run.distance / 1000)).toFixed(1);
      return `${distance}km`;
    });
    
    return {
      labels: labels,
      datasets: [{
        data: sampledElevations.map(alt => Math.round(alt))
      }]
    };
  };

  const elevationChartData = generateElevationChartData(pathForElevation);

  // Pick the first available date field
  const runDate = run.timestamp || run.date || run.start_time || run.stop_time;

  return (
    <ScrollView 
      style={styles.scrollView} 
      contentContainerStyle={styles.scrollContainer}
    >
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
       
               {loadingTrack ? (
          <View style={styles.noMapContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Loading track data...</Text>
          </View>
        ) : (trackData && trackData.path) || (track && track.path) ? (
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
            <Text>Track: {trackData ? 'Present' : 'Missing'}</Text>
            <Text>Path: {trackData?.path ? 'Present' : 'Missing'}</Text>
            <Text>Original Track: {track ? 'Present' : 'Missing'}</Text>
            <Text>Original Path: {track?.path ? 'Present' : 'Missing'}</Text>
            <Text>TrackId: {run.trackId || 'None'}</Text>
          </View>
        )}
       
       {/* Elevation Chart */}
       {elevationChartData ? (
         <View style={styles.elevationChartContainer}>
           <Text style={styles.elevationChartTitle}>Elevation Profile</Text>
           <LineChart
             data={elevationChartData}
             width={screenWidth - 32}
             height={200}
             chartConfig={elevationChartConfig}
             style={styles.elevationChart}
             bezier={true}
             withDots={false}
             withInnerLines={true}
             withOuterLines={true}
             withVerticalLines={false}
             withHorizontalLines={true}
             withVerticalLabels={true}
             withHorizontalLabels={true}
             fromZero={false}
           />
           <Text style={styles.elevationChartSubtitle}>
             Elevation (meters) vs Distance (km)
           </Text>
         </View>
                       ) : pathForElevation && (
          <View style={styles.elevationChartContainer}>
            <Text style={styles.elevationChartTitle}>Elevation Profile</Text>
            <Text style={styles.noElevationData}>
              No elevation data available for this run
            </Text>
          </View>
        )}
     </ScrollView>
   );
 }

const styles = StyleSheet.create({
  scrollView: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scrollContainer: { 
    padding: 16 
  },
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
   elevationChartContainer: {
     marginBottom: 18,
     padding: 16,
     backgroundColor: '#f8f9fa',
     borderRadius: 14,
     shadowColor: '#000',
     shadowOpacity: 0.08,
     shadowOffset: { width: 0, height: 2 },
     shadowRadius: 6,
     elevation: 2,
   },
   elevationChartTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#333',
     marginBottom: 12,
     textAlign: 'center',
   },
   elevationChart: {
     marginVertical: 8,
     borderRadius: 12,
   },
   elevationChartSubtitle: {
     fontSize: 12,
     color: '#666',
     textAlign: 'center',
     marginTop: 8,
     fontStyle: 'italic',
   },
   noElevationData: {
     fontSize: 14,
     color: '#999',
     textAlign: 'center',
     fontStyle: 'italic',
     paddingVertical: 40,
   },
 }); 