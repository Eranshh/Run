import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SignalR from '@microsoft/signalr';
import CreateEventSheet from './CreateEventSheet';

export default function App() {
  const [userType, setUserType] = useState(null);
  const [connection, setConnection] = useState(null);
  const sheetRef = useRef(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const webViewRef = useRef(null);

  // Handle events:
  var eventList = {
    type: 'eventList',
    events: []
  };

  useEffect(() => {
    const connectToSignalR = async () => {
      try {
        // STEP 1: Call backend negotiate endpoint to get URL + token
        const res = await fetch("https://runfuncionapp.azurewebsites.net/api/negotiate");
        if (!res.ok) throw new Error("Failed to fetch SignalR info");

        const { url, accessToken } = await res.json();

        // STEP 2: Use the returned info to connect
        const signalrConnection = new SignalR.HubConnectionBuilder()
          .withUrl(url, {
            accessTokenFactory: () => accessToken,
          })
          .withAutomaticReconnect()
          .configureLogging(SignalR.LogLevel.Information)
          .build();

        // STEP 3: Set up listeners
        signalrConnection.on("addEvent", (message) => {
        try {
          console.log("Received message from SignalR:", message);
          const event_data = typeof message === 'string' ? JSON.parse(message) : message;

          // Add event to the local event list
          eventList.events.push({
            latitude: event_data.latitude,
            longitude: event_data.longitude,
            runners: [],
            id: event_data.eventId
          });

          eventList.len = (eventList.len || 0) + 1;

          // Send updated list to WebView
          webViewRef.current.postMessage(JSON.stringify(eventList));
        } catch (err) {
          console.error("Error parsing SignalR event message:", err);
        }
      });


        signalrConnection.onclose(() => {
          console.log("SignalR connection closed.");
        });

        await signalrConnection.start();
        console.log("SignalR connected.");
        setConnection(signalrConnection);
      } catch (error) {
        console.error("SignalR setup failed:", error);
      }
    };

    connectToSignalR();

  }, []);

  useEffect(() => {
    // Request location and track it:
    let watcher;

    const startWatchingLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (location) => {
          // Send updated location to the WebView
          webViewRef.current?.postMessage(
            JSON.stringify({ type: 'userLocation', location })
          );
            // update location in create event form
            if( !isSheetVisible) {
              //setLatitude(location.latitude.toString());
              //setLongitude(location.longitude.toString());
            }
        }
      );
    };

    startWatchingLocation();

    return () => {
      if (watcher) watcher.remove();
    };
  }, []);


  const createEvent = async (event) => {
    try {
      console.log("Creating event with data:", event);
      const response = await fetch('https://runfuncionapp.azurewebsites.net/api/createEvent',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        //name: 'Expo User', // Send any data your function expects
        //TODO: add event name
        timestamp: new Date().toISOString(),
        latitude: event.latitude,
        longitude: event.longitude,
        trainerId: 'user456'
      }),
      });
      const data = await response.json();
      console.log('Event created:', data);
      
      // signalr will handle this
      // eventList.events.push({latitude: data.latitude, longitude: data.longitude, runners: [], id: eventList.len});
      // eventList.len++;
      // webViewRef.current.postMessage(JSON.stringify(eventList));
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
      // const text = await response.text(); // Get raw response
      // console.log('Raw response:', text);
      const data = await response.json();
      console.log('Event deleted successfuly:', data);
      eventList.events = eventList.events.filter(event => event.id !== data.eventId);
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
      latitude: event.latitude,
      longitude: event.longitude,
      id: event.eventId,
    }));
    webViewRef.current.postMessage(JSON.stringify(eventList));
    
  } catch (error) {
    console.error('Error calling Azure Function:', error);
    console.log('Error occurred');
  }
};

 const getUsersEvents = async () => {
  try {
    const userId = "user123"; // Replace with the actual user ID
    const response = await fetch(`https://runfuncionapp.azurewebsites.net/api/getUsersEvents?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    console.log('Got Events:', data);
    // eventList.events = data;
    eventList.events = data.map((event) => ({
      latitude: event.latitude,
      longitude: event.longitude,
      id: event.eventId,
    }));
    webViewRef.current.postMessage(JSON.stringify(eventList));
    
  } catch (error) {
    console.error('Error calling Azure Function:', error);
    console.log('Error occurred');
  }
};

  const handleSelectLocation = () => {
    console.log("Entering location select mode");
    setIsSelectingLocation(true);
    webViewRef.current.postMessage(JSON.stringify({ type: 'startSelectingLocation' }));
  };

  const openEventSheet = () => {
    sheetRef.current?.snapToIndex(1);
    setIsSheetVisible(true); // show sheet
  };
  const handleSubmitEvent = (event) => {
    createEvent(event);
    sheetRef.current?.snapToIndex(-1);
    setIsSheetVisible(false); // hide sheet
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
      }else if (message.data.action === "addEvent") {
          console.log("creating event");
          console.log(message.data.event);
          createEvent(message.data.event);
      }else if (message.data.action === "confirmLocation") {
        console.log("Location confirmed:", message.data.location);
        setSelectedLocation(message.data.location);
        setIsSelectingLocation(false);
        // Reopen sheet
        sheetRef.current?.snapToIndex(1);
      } else if (message.data.action === "log"){
        //console.log("log message");
        console.log(message.data.message);
      }
      
      else {
        console.warn('Unknown action:', message.data.action);
      }
    } catch (e) {
      console.warn('Failed to parse WebView message', e);
    }
  };


  if (userType === null) {
    return (
       <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.text}>Choose user type:</Text>
          <StatusBar style="auto" />

          <View style={styles.buttonContainer}>
            <Button title="Runner" onPress={() => setUserType('runner')}/>
            <Text>       </Text>
            <Button title="Trainer" onPress={() => setUserType('trainer')}/>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  } 
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
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
          {!isSelectingLocation && (
            <TouchableOpacity style={styles.fab} onPress={openEventSheet}>
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          )}
          {isSheetVisible && (
            <CreateEventSheet
              ref={sheetRef}
              onSubmit={handleSubmitEvent}
              onSelectLocation={handleSelectLocation}
              location={selectedLocation}
              onClose={() => setIsSheetVisible(false)}
            />
          )}
        </View>
      </GestureHandlerRootView>
    )
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0078D4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    lineHeight: 32,
  },
});