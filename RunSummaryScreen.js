import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

export default function RunSummaryScreen({ route }) {
  const { run, track } = route.params;
  const webViewRef = useRef(null);

  // Add logging to see what data we're getting
  console.log('RunSummaryScreen - Run data:', run);
  console.log('RunSummaryScreen - Track data:', track);
  console.log('RunSummaryScreen - Track path:', track?.path);

  const sendPathToWebView = () => {
    console.log('sendPathToWebView called');
    if (track && track.path && webViewRef.current) {
      console.log('Sending path to WebView:', track.path);
      webViewRef.current.postMessage(JSON.stringify({ path: track.path }));
    } else {
      console.log('Cannot send path - track:', !!track, 'path:', !!track?.path, 'webViewRef:', !!webViewRef.current);
    }
  };

  // Handle messages from the WebView (for debugging)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.data && data.data.action === 'log') {
        console.log('[WebView LOG]:', data.data.message);
      } else {
        console.log('[WebView MSG]:', data);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err, event.nativeEvent.data);
    }
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{run.name || 'Run Summary'}</Text>
      <Text>Date: {new Date(run.date).toLocaleString()}</Text>
      <Text>Distance: {(run.distance / 1000).toFixed(2)} km</Text>
      <Text>Duration: {Math.floor(run.duration / 60)} min</Text>
      <Text>Pace: {run.averagePace?.toFixed(2) || 'N/A'} min/km</Text>
      <Text>Speed: {run.averageSpeed?.toFixed(1) || 'N/A'} km/h</Text>
      <Text>Calories: {run.calories?.toFixed(0) || 'N/A'}</Text>
      <Text>Type: {run.type}</Text>
      <Text>Route: {run.route}</Text>
      <Text>Track ID: {run.trackId}</Text>
      
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
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
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
  }
}); 