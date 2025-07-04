import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator 
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function TrackPreviewModal({ visible, track, onClose, onSelectTrack }) {
  const webViewRef = useRef(null);

  const sendPathToWebView = () => {
    if (track && track.path && webViewRef.current) {
      console.log('Sending track path to preview WebView:', track.path);
      webViewRef.current.postMessage(JSON.stringify({ path: track.path }));
    }
  };

  // Handle messages from the WebView (for debugging)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.data && data.data.action === 'log') {
        console.log('[TrackPreview LOG]:', data.data.message);
      } else {
        console.log('[TrackPreview MSG]:', data);
      }
    } catch (err) {
      console.error('Error parsing TrackPreview WebView message:', err, event.nativeEvent.data);
    }
  };

  useEffect(() => {
    if (visible && track && track.path) {
      // Small delay to ensure WebView is ready
      setTimeout(() => {
        sendPathToWebView();
      }, 1000);
    }
  }, [visible, track]);

  if (!track) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{track.displayName || track.name || 'Track Preview'}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trackInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distance:</Text>
            <Text style={styles.infoValue}>{(track.distance / 1000).toFixed(1)} km</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Difficulty:</Text>
            <Text style={[styles.infoValue, styles[`difficulty${track.difficulty}`]]}>
              {track.difficulty}
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={require('./runSummaryMap.html')}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            onLoad={sendPathToWebView}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('TrackPreview WebView error:', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('TrackPreview WebView HTTP error:', nativeEvent);
            }}
            onMessage={handleWebViewMessage}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.selectButton} onPress={() => onSelectTrack(track)}>
            <Text style={styles.selectButtonText}>Select This Track</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  trackInfo: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  difficultyBeginner: {
    color: '#155724',
  },
  difficultyIntermediate: {
    color: '#856404',
  },
  difficultyAdvanced: {
    color: '#721c24',
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 