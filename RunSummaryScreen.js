import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

export default function RunSummaryScreen({ route }) {
  const { run, track } = route.params;
  const webViewRef = useRef(null);

  useEffect(() => {
    if (track && track.path && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ path: track.path }));
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
      {track && track.path && (
        <WebView
          ref={webViewRef}
          source={require('./runSummaryMap.html')}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
        />
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
  }
}); 