import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SignalR from '@microsoft/signalr';
import CreateEventSheet from './CreateEventSheet';
import CreateEventDisplay from './CreateEventDisplay';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { ConsoleLogger } from '@microsoft/signalr/dist/esm/Utils';

export default function App() {
  const [userType, setUserType] = useState(null);
  const [connection, setConnection] = useState(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isEventDisplayVisible, setIsEventDisplayVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef(null);
  const eventDisplayRef = useRef(null);
  const sheetRef = useRef(null);

  // Handle events:
  var eventList = {
    type: 'eventList',
    events: []
  };

  useEffect(() => {
    const connectToSignalR = async () => {
      try {
        console.log("Starting SignalR connection setup...");
        
        const signalrConnection = new SignalR.HubConnectionBuilder()
          .withUrl('https://runappsigr.service.signalr.net/client/?hub=mysignalrhub', {
            accessTokenFactory: async () => {
              try {
                console.log("Calling negotiate endpoint...");
                const response = await fetch('https://runfuncionapp.azurewebsites.net/api/negotiate');
                console.log("Negotiate response status:", response.status);
                const data = await response.json();
                console.log("Access token requested:", data.accessToken);
                return data.accessToken;
              } catch (error) {
                console.error("Error getting access token:", error);
                throw error;
              }
            },
            transport: SignalR.HttpTransportType.WebSockets,
            skipNegotiation: false
          })
          .withAutomaticReconnect([0, 1000, 2000, 5000, 10000]) // More aggressive reconnection
          .configureLogging(SignalR.LogLevel.Information)
          .withKeepAliveInterval(10000) // Reduced to 10 seconds
          .withServerTimeout(30000) // 30 second server timeout
          .build();

        // Keep track of connection state with enhanced error handling
        let isConnected = false;
        let reconnectAttempt = 0;
        const maxReconnectAttempts = 5;
        let keepAliveInterval;

        signalrConnection.onreconnecting((error) => {
          console.log("SignalR reconnecting...", error);
          isConnected = false;
          reconnectAttempt++;
          clearInterval(keepAliveInterval);
          
          if (reconnectAttempt > maxReconnectAttempts) {
            console.log("Max reconnection attempts reached, will try full restart");
            signalrConnection.stop().then(() => {
              reconnectAttempt = 0;
              setTimeout(() => {
                connectToSignalR(); // Restart connection process
              }, 5000);
            }).catch(err => {
              console.error("Error stopping connection:", err);
              // Try to restart anyway after a delay
              setTimeout(() => {
                connectToSignalR();
              }, 5000);
            });
          }
        });

        signalrConnection.onreconnected((connectionId) => {
          console.log("SignalR reconnected. Connection ID:", connectionId);
          isConnected = true;
          reconnectAttempt = 0;
          startKeepAlive();
          // Refresh data after reconnection
          getAllOpenEvents();
          getAllTracks();
          getUsersEvents();
        });

        signalrConnection.onclose((error) => {
          console.log("SignalR connection closed.", error ? JSON.stringify(error) : "No error details");
          isConnected = false;
          clearInterval(keepAliveInterval);
          
          if (reconnectAttempt <= maxReconnectAttempts) {
            setTimeout(async () => {
              try {
                await signalrConnection.start();
                console.log("SignalR connection restarted successfully");
                isConnected = true;
                startKeepAlive();
              } catch (err) {
                console.error("Failed to restart SignalR connection:", err);
                reconnectAttempt++;
                // Try to reconnect again if we haven't hit the limit
                if (reconnectAttempt <= maxReconnectAttempts) {
                  setTimeout(() => connectToSignalR(), 5000);
                }
              }
            }, 5000);
          }
        });

        // Enhanced keep-alive mechanism with better error handling
        const startKeepAlive = () => {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          keepAliveInterval = setInterval(async () => {
            if (isConnected) {
              try {
                await signalrConnection.invoke("KeepAlive");
                console.log("Keep-alive ping sent successfully");
              } catch (error) {
                console.warn("Keep-alive ping failed:", error);
                // If ping fails and we're supposedly connected, try to reconnect
                if (signalrConnection.state === SignalR.HubConnectionState.Connected) {
                  try {
                    await signalrConnection.stop();
                    await signalrConnection.start();
                    console.log("Connection restarted after failed keep-alive");
                  } catch (err) {
                    console.error("Failed to restart connection after keep-alive failure:", err);
                    // If restart fails, trigger a full reconnection
                    reconnectAttempt = 0;
                    setTimeout(() => connectToSignalR(), 5000);
                  }
                }
              }
            }
          }, 10000);
        };

        // Start the connection with retry logic
        const startConnection = async (retryCount = 0) => {
          try {
            await signalrConnection.start();
            console.log("SignalR connected successfully");
            isConnected = true;
            reconnectAttempt = 0;
            startKeepAlive();
            setConnection(signalrConnection);
          } catch (err) {
            console.error(`Connection attempt ${retryCount + 1} failed:`, err);
            if (retryCount < maxReconnectAttempts) {
              setTimeout(() => startConnection(retryCount + 1), 5000);
            } else {
              console.error("Failed to establish initial connection after max retries");
            }
          }
        };

        await startConnection();

      } catch (error) {
        console.error("SignalR setup failed:", error);
        setTimeout(() => {
          connectToSignalR();
        }, 5000);
      }
    };

    connectToSignalR();

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
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
  }, [mapReady]);


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
        trainerId: 'user123', // Replace with actual user ID
        name: event.name,
        trackId: event.trackId,
        startTime: event.start_time,
        difficulty: event.difficulty,
        type: event.type,
        host: event.trainerId,
        status: event.status,
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
      console.log("deleting event: ", id);
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
      name: event.name,
      trackId: event.trackId,
      startTime: event.start_time,
      difficulty: event.difficulty,
      type: event.type,
      host: event.trainerId,
      status: event.status,
    }));
    console.log('Event list:', eventList);
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
    let myEvents = data.map((event) => ({
      latitude: event.latitude,
      longitude: event.longitude,
      id: event.eventId,
      name: event.name,
      trackId: event.trackId,
      startTime: event.start_time,
      difficulty: event.difficulty,
      type: event.type,
      host: event.trainerId,
      status: event.status,
    }));
    let myEventsList = {type: 'usersEvents', events: myEvents};
    webViewRef.current.postMessage(JSON.stringify(myEventsList));
    
  } catch (error) {
    console.error('Error calling Azure Function:', error);
    console.log('Error occurred');
  }
};

const getAllTracks = async () => {
    try {
      const userId = "user123"; // Replace with the actual user ID
      const response = await fetch(`https://runfuncionapp.azurewebsites.net/api/getAllTracks`);
      const data = await response.json();
      console.log('Got Tracks:', data);
      
      // Normalize track data to ensure consistent format
      const normalizedTracks = data.map(track => {
        if (!track.path || !Array.isArray(track.path)) {
          console.warn('Invalid track data:', track);
          return null;
        }
        
        // Normalize path to array of {latitude, longitude} objects
        const normalizedPath = track.path.map(point => {
          if (Array.isArray(point)) {
            return {
              latitude: point[0],
              longitude: point[1]
            };
          } else if (point && typeof point === 'object' && 'latitude' in point && 'longitude' in point) {
            return point;
          } else {
            console.warn('Invalid point format:', point);
            return null;
          }
        }).filter(point => point !== null);

        return {
          trackId: track.trackId, // Ensure trackId is preserved
          path: normalizedPath
        };
      }).filter(track => track !== null && track.path.length > 0);

      console.log('Normalized tracks:', normalizedTracks);
      const trackIds = normalizedTracks.map(track => track.trackId);
      setTracks(trackIds);
      
      // Only send track data to WebView, without drawing them
      webViewRef.current.postMessage(JSON.stringify({
        'type': "storeTracks", // Changed from "tracks" to "storeTracks"
        'tracks': normalizedTracks
      }));
      
    } catch (error) {
      console.error('Error calling Azure Function:', error);
      console.log('Error occurred');
    }
};

  const getEventUsersForDisplay = async (id, eventObject) => {
    try {
      const response = await fetch(`https://runfuncionapp.azurewebsites.net/api/getEventRegisteredUsers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: id,
      }),
      });
      const data = await response.json();
      eventObject["usersList"] = data;
      setSelectedEvent(eventObject);
      
      // Center map on event location
      if (webViewRef && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'centerOnLocation',
          location: {
            latitude: eventObject.latitude,
            longitude: eventObject.longitude
          }
        }));
      }
      
      console.log('Got users:', data);
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

  const openEventDisplay = () => {
    eventDisplayRef.current?.snapToIndex(1);
    setIsEventDisplayVisible(true);
  }

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
      }else if (message.data.action === "confirmLocation") {
        console.log("Location confirmed:", message.data.location);
        setSelectedLocation(message.data.location);
        setIsSelectingLocation(false);
        // Reopen sheet
        sheetRef.current?.snapToIndex(1);
      } else if (message.data.action === 'trackSelected') {
        console.log('Track selected:', message.data.trackId, ' Longitude: ', message.data.location.longitude, ' Latitude: ' , message.data.location.latitude);
        const selectedTrackId = message.data.trackId;
        setSelectedTrack(selectedTrackId);
        setSelectedLocation(message.data.location);
        openEventSheet();
      } else if (message.data.action === 'cancelTrackSelection') {
        console.log('Canceling track selection');
        sheetRef.current?.snapToIndex(0);
        setIsSheetVisible(false); // hide sheet

      } else if (message.data.action === "log"){
        //console.log("log message");
        console.log(message.data.message);
      } else if (message.data.action === "mapReady") {
        console.log("Map is ready");
        setMapReady(true);
        getAllOpenEvents();
        getAllTracks();
        getUsersEvents();
      } else if (message.data.action === "openEventDisplay") {
        getEventUsersForDisplay(message.data.eventObject.id, message.data.eventObject);
        openEventDisplay();
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
              webRef={webViewRef}
              selectedTrack={selectedTrack}
              tracks={tracks}
              onClose={() => setIsSheetVisible(false)}
            />
          )}
          {isEventDisplayVisible && (
            <CreateEventDisplay
              ref={eventDisplayRef}
              joinEvent={joinEvent}
              deleteEvent={deleteEvent}
              eventObject={selectedEvent}
              userId={"user123"}
              webRef={webViewRef}
              onClose={() => setIsEventDisplayVisible(false)}
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