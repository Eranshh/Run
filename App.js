import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const [userType, setUserType] = useState(null);
  
  const webViewRef = useRef(null);

  // Handle events:
  var eventList = {
    type: 'eventList',
    len: 0,
    events: []
  };

  const addEvent = () => {
    eventList.events.push({latitude: 32.1 + eventList.len*0.001, longitude: 34.8 - eventList.len*0.001, runners: [], id: eventList.len});
    eventList.len++;
  };

  const sendCoords = () => {
    webViewRef.current.postMessage(JSON.stringify(eventList));
  };

  // Listen for messages from the map:
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { id, user } = data;
      
      eventList.events[id].runners.push(user);
    } catch (e) {
      console.warn('Failed to parse WebView message', e);
    }
  };


  if (userType === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Choose user type:</Text>
        <StatusBar style="auto" />

        <View style={styles.buttonContainer}>
          <Button title="Runner" onPress={() => setUserType('runner')}/>
          <Text>       </Text>
          <Button title="Trainer" onPress={() => setUserType('trainer')}/>
        </View>
      </View>
    );
  } else if (userType === 'runner') {
    return (
      <View style={{flex: 1}}>
        <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={require('./runnerMap.html')}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={{ flex: 1 }}
        onMessage={handleWebViewMessage}
        />
        <Button title="Show Events" onPress={sendCoords}/>
      </View>
    )
  } else if (userType === 'trainer') {
    return (
      <View style={{flex: 1}}>
        <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={require('./trainerMap.html')}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={{ flex: 1 }}
        onMessage={handleWebViewMessage}
        />
        <Button title="Add Event" onPress={addEvent}/>
        <Button title="Show Events" onPress={sendCoords}/>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(180,180,190)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  text: {
    fontSize: 30,
  },
});
