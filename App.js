import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SignalR from '@microsoft/signalr';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateEventSheet from './CreateEventSheet';
import CreateEventDisplay from './CreateEventDisplay';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { ConsoleLogger } from '@microsoft/signalr/dist/esm/Utils';
import UserProfileScreen from './UserProfileScreen';
import { fetchWithAuth } from './utils/api';
import RunSummaryScreen from './RunSummaryScreen';
import SelectTrackScreen from './SelectTrackScreen';

const Stack = createNativeStackNavigator();


function MainScreen({ navigation, username, userId, userToken, route }) {
  const [userType, setUserType] = useState(null);
  const [connection, setConnection] = useState(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isEventDisplayVisible, setIsEventDisplayVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState("mainMap");

  const webViewRef = useRef(null);
  const eventDisplayRef = useRef(null);
  const sheetRef = useRef(null);
  const hasHandledParams = useRef(false);

  // Handle events:
  var eventList = {
    type: 'eventList',
    events: []
  };

  // Handle route parameters for track selection
  useEffect(() => {
    if (route?.params && !hasHandledParams.current && mapReady) {
      const { mode: routeMode, selectedTrack: routeSelectedTrack } = route.params;
      
      if (routeMode === 'freeRun') {
        // Start free run
        console.log('Starting free run from route params');
        webViewRef.current?.postMessage(JSON.stringify({ type: 'startFreeRun' }));
      } else if (routeMode === 'guidedRun' && routeSelectedTrack) {
        // Handle guided run with selected track
        console.log('Starting guided run with track:', routeSelectedTrack);
        setSelectedTrack(routeSelectedTrack);
        // You can add logic here to display the selected track on the map
        // For now, just set the selected track
      }
      
      // Mark as handled to prevent re-triggering
      hasHandledParams.current = true;
    }
  }, [route?.params, mapReady]);

  // Reset the flag when route params change
  useEffect(() => {
    hasHandledParams.current = false;
  }, [route?.params]);

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
            timeout: 30000, // 30 second timeout
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry after 0s, 2s, 5s, 10s, then every 30s
          .configureLogging(SignalR.LogLevel.Information)
          .build();

        // STEP 3: Set up listeners
        signalrConnection.on("addEvent", (message) => {
        try {
          console.log("Received message from SignalR:", message);
          const event_data = typeof message === 'string' ? JSON.parse(message) : message;

          console.log("Parsed event data:", event_data);
          if (!event_data || !event_data.latitude || !event_data.longitude || !event_data.RowKey) {
            console.warn("Invalid event data received:", event_data);
            return;
          }
          // Add event to the local event list
          eventList.events.push({
            latitude: event_data.latitude,
            longitude: event_data.longitude,
            runners: [],
            id: event_data.RowKey,
            name: event_data.name || "Unnamed Event",
            trackId: event_data.trackId || null,
            startTime: event_data.start_time || 0,
            difficulty: event_data.difficulty || "begginer",
            type: event_data.type || "free run",
            host: event_data.trainerId || "unknown",
            status: event_data.status || "open",
          });

          eventList.len = (eventList.len || 0) + 1;

          // Send updated list to WebView
          webViewRef.current.postMessage(JSON.stringify(eventList));
        } catch (err) {
          console.error("Error parsing SignalR event message:", err);
        }
      });

        // Add reconnecting and reconnected handlers
        signalrConnection.onreconnecting((error) => {
          console.log("SignalR reconnecting:", error);
          // Optionally show a reconnecting UI state
        });

        signalrConnection.onreconnected((connectionId) => {
          console.log("SignalR reconnected:", connectionId);
          // Refresh data after reconnection
          getAllOpenEvents();
          getAllTracks();
          //getUsersEvents(user_id);
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
    const startWatchingLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'This app needs location access to function properly. Please enable location services.',
            [{ text: 'OK' }]
          );
          return;
        }

        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 1,
          },
          (location) => {
            if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({ type: 'userLocation', location })
              );
            }
          },
          (error) => {
            console.error('Location tracking error:', error);
            Alert.alert(
              'Location Error',
              'There was an error tracking your location. Please check your location settings.',
              [{ text: 'OK' }]
            );
          }
        );

        return () => {
          if (watcher) {
            watcher.remove();
          }
        };
      } catch (error) {
        console.error('Error setting up location:', error);
        Alert.alert(
          'Error',
          'Failed to set up location tracking. Please restart the app.',
          [{ text: 'OK' }]
        );
      }
    };

    startWatchingLocation();
  }, []);

  useEffect(() => {
    if (mapReady && username) {
      // Send username to WebView
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'userIdentity',
          username: username
        })
      );
    }
  }, [mapReady, username]);

  const createEvent = async (event) => {
    try {
      const response = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/createEvent', {
        method: 'POST',
        body: JSON.stringify({
          ...event,
          trainerId: userId, // Use userId for API calls
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      // Refresh events list
      getAllOpenEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const deleteEvent = async (id) => {
    try {
      console.log("deleting event: ", id);
      const response = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/deleteEvent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: id
        }),
      });
      const data = await response.json();
      console.log('Event deleted successfully:', data);
      eventList.events = eventList.events.filter(event => event.id !== data.eventId);
      webViewRef.current.postMessage(JSON.stringify(eventList));
    } catch (error) {
      console.error('Error deleting event:', error);
      // Handle error appropriately
    }
  };

  const joinEvent = async (event_id) => {
    try {
      const response = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/joinEvent', {
        method: 'POST',
        body: JSON.stringify({
          eventId: event_id,
          userId: userId, // Use userId for API calls
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join event');
      }

      // Refresh user's events
      getUsersEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Error', 'Failed to join event');
    }
  };

  const getAllOpenEvents = async () => {
    try {
      const response = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/getAllOpenEvents');
      const data = await response.json();
      console.log('Got Events:', data);
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
      console.error('Error fetching events:', error);
      // Handle error appropriately
    }
  };

 const getUsersEvents = async () => {
  try {
    const response = await fetchWithAuth(
      `https://runfuncionapp.azurewebsites.net/api/getUsersEvents?userId=${encodeURIComponent(userId)}`
    );
    const data = await response.json();
    console.log('Got Events:', data);
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
    console.error('Error fetching user events:', error);
    // Handle error appropriately
  }
};

const getAllTracks = async () => {
    try {
      const response = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/getAllTracks');
      const data = await response.json();
      console.log('Got Tracks:', data);
      //console.log('first point:', data[0].path[0]);
      const trackIds = data.map(track => track.trackId);
      setTracks(trackIds);
      webViewRef.current.postMessage(JSON.stringify({'type': "tracks", 'tracks': data}));
    } catch (error) {
      console.error('Error fetching tracks:', error);
      // Handle error appropriately
    }
  };

  const getEventUsersForDisplay = async (id, eventObject) => {
    try {
      const data = await fetchWithAuth(
        `https://runfuncionapp.azurewebsites.net/api/getEventUsers?eventId=${encodeURIComponent(id)}`
      );
      
      eventObject["usersList"] = data;
      setSelectedEvent(eventObject);
      console.log('Got users:', data);
    } catch (error) {
      console.error('Error fetching event users:', error);
      // Handle error appropriately
    }
  };

  const createTrack = async (track) => {
    console.log("Creating track:", track);
    try {
      const response = await fetchWithAuth(
        'https://runfuncionapp.azurewebsites.net/api/createTrack',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: track,
            userId: userId,
            timestamp: new Date().toISOString()
          })
        }
      );
      console.log('createTrack response status:', response.status);
      if (!response.ok) {
        let errorMsg = 'Failed to create track';
        try {
          const errorData = await response.json();
          errorMsg += ': ' + (errorData.error || JSON.stringify(errorData));
        } catch (e) {
          // fallback to text
          try {
            const errorText = await response.text();
            errorMsg += ': ' + errorText;
          } catch (e2) {}
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log('Track created successfully');
      return data.trackId;
    } catch (error) {
      console.error('Error creating track:', error);
      return null;
    } 
  };

  const createActivity = async (activity) => {
    console.log("Logging run to database:", activity);
    activity.userId = userId;
    let track_id = await createTrack(activity.path);
    if (!track_id) {
      console.error('Error creating track');
      return;
    }
    activity.trackId = track_id;
    try {
        const response = await fetchWithAuth(
            'https://runfuncionapp.azurewebsites.net/api/createActivity',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activity)
            }
        );
        if (!response.ok) {
            // Try to read the error message from the response
            let errorMsg = `HTTP error! status: ${response.status}`;
            const errorData = response.error;
            errorMsg += ` | Details: ${JSON.stringify(errorData)}`;
            throw new Error(errorMsg);
        }
        console.log('Activity logged successfully');
    } catch (error) {
        console.error('Error logging activity:', error);
    }
  };

  const handleSelectLocation = () => {
    console.log("Entering location select mode");
    setMode("selectingLocation");
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

  function navigateToSelectTrack() {
    navigation.navigate('SelectTrack');
  }

  // Listen for messages from the map:
  const handleWebViewMessage = (event) => {
    try {
        const data = JSON.parse(event.nativeEvent.data);
        console.log('Received message from WebView:', data);

        if (data.data.action === "delete") {
          console.log('Delete event:', data.data.id);
          deleteEvent(data.data.id);
        }
        else if (data.data.action === "join") {
          joinEvent(data.data.id);
        }
        else if (data.data.action === "getEvents") {
          getAllOpenEvents();
          webViewRef.current.postMessage(JSON.stringify(eventList));
        } else if (data.data.action === "getUserLocation") {
          console.log("sending location");
          getUserLocation();
        } else if (data.data.action === "navigateToProfile") {
          navigation.navigate('UserProfile');
        } else if (data.data.action === "confirmLocation") {
          console.log("Location confirmed:", data.data.location);
          setSelectedLocation(data.data.location);
          setMode("mainMap");
          // Reopen sheet
          sheetRef.current?.snapToIndex(1);
        } else if (data.data.action === 'trackSelected') {
          console.log('Track selected:', data.data.trackId, ' Longitude: ', data.data.location.longitude, ' Latitude: ' , data.data.location.latitude);
          const selectedTrackId = data.data.trackId;
          setSelectedTrack(selectedTrackId);
          setSelectedLocation(data.data.location);
          openEventSheet();
          setMode("mainMap");
        } else if (data.data.action === 'cancelTrackSelection') {
          console.log('Canceling track selection');
          sheetRef.current?.snapToIndex(0);
          setIsSheetVisible(false); // hide sheet
          setMode("mainMap");
        } else if (data.data.action === "log"){
          //console.log("log message");
          console.log(data.data.message);
        } else if (data.data.action === "mapReady") {
          console.log("Map is ready");
          setMapReady(true);
          getAllOpenEvents();
          getAllTracks();
          getUsersEvents();
        } else if (data.data.action === "openEventDisplay") {
          getEventUsersForDisplay(data.data.eventObject.id, data.data.eventObject);
          openEventDisplay();
        } else if (data.data.action === "enterFreeRunMode") {
          setMode("freeRun")
        } else if (data.data.action === "leaveFreeRunMode") {
          setMode("mainMap");
        } else if (data.data.action === "logRun") {
          console.log("Logging run to database");
          createActivity(data.data.activity);
        } else {
          console.warn('Unknown action:', data.data.action);
        }
    } catch (error) {
        console.error('Error handling WebView message:', error);
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert(
      'Error',
      'There was an error loading the map. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  };

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
        onError={handleWebViewError}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
        }}
        onMessage={handleWebViewMessage}
        />
        {mode === "mainMap" && (
          <TouchableOpacity id="createEventBtn" style={styles.fab} onPress={openEventSheet}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
        {mode === "mainMap" && (
          <TouchableOpacity id="startFreeRunBtn" style={styles.freeRunBtn} onPress={navigateToSelectTrack}>
            <Text style={styles.fabText}>🏃</Text>
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
            setMode={setMode}
            onClose={() => setIsSheetVisible(false)}
          />
        )}
        {isEventDisplayVisible && (
          <CreateEventDisplay
            ref={eventDisplayRef}
            eventObject={selectedEvent}
            joinEvent={joinEvent}
            deleteEvent={deleteEvent}
            userId={userId}
            username={username}
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
  freeRunBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'username']);
      setUserToken(null);
      setUserId(null);
      setUsername(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleLogin = async (token, userId, username) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('username', username);
      setUserToken(token);
      setUserId(userId);
      setUsername(username);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Check for stored token and validate it
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedUsername = await AsyncStorage.getItem('username');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        if (token && storedUsername && storedUserId) {
          // Verify token is still valid
          console.log("Validating token");
          const response = await fetch('https://runfuncionapp.azurewebsites.net/api/validate-token', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log("Token validation response:", response);
          if (response.ok) {
            setUserToken(token);
            setUsername(storedUsername);
            setUserId(storedUserId);
          } else {
            // Token is invalid or expired, clear storage
            await AsyncStorage.multiRemove(['userToken', 'username', 'userId']);
          }
        }
      } catch (error) {
        console.error('Error checking token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!userToken ? (
          // Auth screens
          <>
            <Stack.Screen 
              name="Login" 
              options={{ headerShown: false }}
            >
              {props => (
                <LoginScreen 
                  {...props}
                  onLogin={handleLogin}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Main app screens
          <>
            <Stack.Screen 
              name="mainMap" 
              options={{ headerShown: false }}
            >
              {props => (
                <MainScreen 
                  {...props}
                  username={username}
                  userId={userId}
                  userToken={userToken}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="UserProfile" 
              options={{ 
                title: 'Profile',
                headerStyle: {
                  backgroundColor: '#007AFF',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {props => (
                <UserProfileScreen 
                  {...props}
                  username={username}
                  userId={userId}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="RunSummary" 
              options={{ 
                title: 'Run Summary',
                headerStyle: {
                  backgroundColor: '#007AFF',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {props => (
                <RunSummaryScreen 
                  {...props}
                  username={username}
                  userId={userId}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="SelectTrack" 
              options={{ 
                title: 'Select Track',
                headerStyle: {
                  backgroundColor: '#007AFF',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {props => (
                <SelectTrackScreen 
                  {...props}
                  username={username}
                  userId={userId}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}