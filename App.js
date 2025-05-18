import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function App() {
  const [userType, setUserType] = useState(null);
  
  const webViewRef = useRef(null);

  // Handle events:
  var eventList = {
    type: 'eventList',
    events: []
  };

  useEffect(() => {
    // This is where you can set up any initial data or state
  }, []);


  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const userLocation = {type: 'userLocation', location: loc};
      console.log(userLocation);
      webViewRef.current.postMessage(JSON.stringify(userLocation));
  }

  const createEvent = async () => {
    try {
      const response = await fetch('https://runfuncionapp.azurewebsites.net/api/createEvent',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        //name: 'Expo User', // Send any data your function expects
        timestamp: new Date().toISOString(),
        trainerId: 'user456'
      }),
      });
      const data = await response.json();
      console.log('Event created:', data);
      eventList.events.push({latitude: 32.1 + eventList.len*0.001, longitude: 34.8 - eventList.len*0.001, runners: [], id: eventList.len});
      eventList.len++;
      webViewRef.current.postMessage(JSON.stringify(eventList));
      // eventList.events.push({latitude: data.latitude, longitude: data.longitude, runners: [], id: eventList.len});
    } catch (error) {
      console.error('Error calling Azure Function:', error);
      console.log('Error occurred');
    }
  };

  const deleteEvent = async (id) => {
    try {
      const response = await fetch('https://runfuncionapp.azurewebsites.net/api/deleteEvent',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        //name: 'Expo User', // Send any data your function expects
        eventId: id
      }),
      });
      const text = await response.text(); // Get raw response
      console.log('Raw response:', text);
      // const data = await response.json();
      //console.log('Event deleted successfuly:', data);
      eventList.events = eventList.events.filter(event => event.id !== message.data.eventId);
      webViewRef.current.postMessage(JSON.stringify(eventList));

    } catch (error) {
      console.error('Error calling Azure Function:', error);
      console.log('Error occurred');
    }
  };

  const joinEvent = async (event_id, user_id) => {
    try {
      const response = await fetch('https://runfuncionapp.azurewebsites.net/api/joinEvent',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({

        eventId: event_id,
        userId: user_id
      }),
      });
      const text = await response.text(); // Get raw response
      console.log('Raw response:', text);
      // const data = await response.json();
      // console.log('User joined event:', data);
      // eventList.events = eventList.events.filter(event => event.id !== message.data.eventId);
      // webViewRef.current.postMessage(JSON.stringify(eventList));
      
    } catch (error) {
      console.error('Error calling Azure Function:', error);
      console.log('Error occurred');
    }
  };

  const getAllOpenEvents = async () => {
  try {
    const response = await fetch('https://runfuncionapp.azurewebsites.net/api/getAllOpenEvents');
    const data = await response.json();
    console.log('Got Events:', data);
    // eventList.events = data;
    eventList.events = data.map((event) => ({
      latitude: 32.1,
      longitude: 34.8,
      id: event.eventId,
    }));
    webViewRef.current.postMessage(JSON.stringify(eventList));
    
  } catch (error) {
    console.error('Error calling Azure Function:', error);
    console.log('Error occurred');
  }
};

  // Listen for messages from the map:
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', message);
      if (message.data.action === "delete") {
        console.log('Delete event:', message.data.id);
        deleteEvent(message.data.id);
      }
      else if (message.data.action === "join") {
        // const eventId = message.data.eventId;
        joinEvent(message.data.id, "user123");


      }else if (message.data.action === "getEvents") {
        getAllOpenEvents();
        webViewRef.current.postMessage(JSON.stringify(eventList));
      } else if (message.data.action === "getUserLocation") {
        console.log("sending location");
        getUserLocation();
      }
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
        <Button title="Show Events" onPress={getAllOpenEvents}/>
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
        <Button title="Add Event" onPress={createEvent}/>
        <Button title="Show Events" onPress={getAllOpenEvents}/>
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