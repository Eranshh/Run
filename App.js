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
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { ConsoleLogger } from '@microsoft/signalr/dist/esm/Utils';
import UserProfileScreen from './UserProfileScreen';
import { fetchWithAuth, setEventReady, markUserReady, getEventReadyUsers, startEvent, updateRunnerPosition, getEventRunnersPositions, endEventRun, leaveEvent, deleteEvent, joinEvent } from './utils/api';
import RunSummaryScreen from './RunSummaryScreen';
import SelectTrackScreen from './SelectTrackScreen';
import UserSearchScreen from './UserSearchScreen';
import EventScreen from './EventScreen';
import CoachingDashboard from './CoachingDashboard';
import FloatingCoach from './FloatingCoach';

const Stack = createNativeStackNavigator();


function MainScreen({ navigation, username, userId, userToken, route, connection, connectionState, onRetryConnection }) {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState("mainMap"); // mainMap, selectingLocation, selectingTrack, freeRun, eventRun
  const [currentEventRun, setCurrentEventRun] = useState(null); // New state for current event run
  const [eventRunners, setEventRunners] = useState([]); // New state for tracking all runners in event
  const [listenersUp, setListenersUp] = useState(false);
  const [pendingEventData, setPendingEventData] = useState(null); // Store event data when WebView isn't ready

  // Add refs to always have latest state in event handlers
  const modeRef = useRef(mode);
  const currentEventRunRef = useRef(currentEventRun);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { currentEventRunRef.current = currentEventRun; }, [currentEventRun]);

  const webViewRef = useRef(null);
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
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({ type: 'startFreeRun' }));
        }
      } else if (routeMode === 'guidedRun' && routeSelectedTrack) {
        // Handle guided run with selected track
        console.log('Starting guided run with track:', routeSelectedTrack);
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({ type: 'startGuidedRun', trackId: routeSelectedTrack.trackId }))
        }
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
    if (listenersUp || !connection) return;
    // STEP 3: Set up listeners
    connection.on("addEvent", () => {
      getAllOpenEvents();
    });

    connection.on("eventDeleted", (eventId) => {
      console.log("SignalR: Received eventDeleted", eventId);
      getAllOpenEvents();
    });

    connection.on("eventStatusChanged", (eventId) => {
      try {
        console.log("SignalR: Received eventStatusChanged", eventId);
        getAllOpenEvents();
      } catch (err) {
        console.error("Error handling eventStatusChanged message:", err);
      }
    });

    connection.on("eventStarted", (eventData) => {
      try {
        console.log("SignalR: Received eventStarted", eventData);
        handleEventStarted(eventData);
      } catch (err) {
        console.error("Error handling eventStarted message:", err);
      }
    });

    connection.on("runnerPositionUpdate", (positionData) => {
      try {
        console.log("SignalR: Received runnerPositionUpdate", positionData);
        console.log("Current user ID:", userId);
        console.log("Position data user ID:", positionData.userId);
        console.log("Current mode:", modeRef.current);
        console.log("Current event run:", currentEventRunRef.current);
        
        // Check if user is currently participating in an event run
        if (modeRef.current !== "eventRun" || !currentEventRunRef.current) {
          console.log("Ignoring position update - user not in event run mode");
          return;
        }
        
        // Check if the position update is for the current event
        if (positionData.eventId !== currentEventRunRef.current.eventId) {
          console.log("Ignoring position update - not for current event");
          return;
        }
        
        // Ignore position updates for the current user (they have their own green marker)
        if (positionData.userId === userId) {
          console.log("Ignoring position update - it's for the current user");
          return;
        }
        
        // Update local runners state
        setEventRunners(prevRunners => {
          const updatedRunners = prevRunners.filter(runner => runner.userId !== positionData.userId);
          return [...updatedRunners, positionData];
        });
        
        // Send to WebView (only for other runners)
        console.log("Sending position update to WebView for other runner:", positionData);
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'updateRunnerPosition',
            data: positionData
          }));
        } else {
          console.log('WebView not ready, skipping position update');
        }
      } catch (err) {
        console.error("Error handling runnerPositionUpdate message:", err);
      }
    });

    connection.on("runnerRemoved", (removalData) => {
      try {
        console.log("SignalR: Received runnerRemoved", removalData);
        console.log("Current mode:", modeRef.current);
        console.log("Current event run:", currentEventRunRef.current);
        
        // Check if user is currently participating in an event run
        if (modeRef.current !== "eventRun" || !currentEventRunRef.current) {
          console.log("Ignoring runner removal - user not in event run mode");
          return;
        }
        
        // Check if the removal is for the current event
        if (removalData.eventId !== currentEventRunRef.current.eventId) {
          console.log("Ignoring runner removal - not for current event");
          return;
        }
        
        // Ignore removal updates for the current user
        if (removalData.userId === userId) {
          console.log("Ignoring runner removal - it's for the current user");
          return;
        }
        
        // Remove the runner from local state
        setEventRunners(prevRunners => 
          prevRunners.filter(runner => runner.userId !== removalData.userId)
        );
        
        // Send to WebView to remove the runner marker (only for other runners)
        console.log("Removing runner marker from WebView for other runner:", removalData.userId);
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'removeRunner',
            data: { userId: removalData.userId }
          }));
        } else {
          console.log('WebView not ready, skipping runner removal');
        }
      } catch (err) {
        console.error("Error handling runnerRemoved message:", err);
      }
    });

    connection.onreconnected((connectionId) => {
      console.log("SignalR reconnected:", connectionId);
      // Refresh data after reconnection
      getAllOpenEvents();
      getAllTracks();
    });

    setListenersUp(true);
  }, [connection]);


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
            accuracy: Location.Accuracy.BestForNavigation, // Try highest accuracy
            timeInterval: 2000,
            distanceInterval: 1,
            altitude: true, // Enable altitude tracking
            // Additional options that might help with altitude
            mayShowUserSettingsDialog: true,
          },
          (location) => {
            if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({ type: 'userLocation', location })
              );
              
              // If in event run mode, also send position to backend
              if (mode === "eventRun" && currentEventRun) {
                updateEventPosition(location);
              }
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
    if (mapReady && username && webViewRef.current) {
      // Send user ID to WebView for proper filtering
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'userIdentity',
          username: username,
          userId: userId,
        })
      );
    }
  }, [mapReady, username, userId]);

  // Handle pending event data when map becomes ready
  useEffect(() => {
    if (mapReady && pendingEventData && webViewRef.current) {
      console.log('Handling pending event data now that map is ready');
      
      // Set current event run state
      setCurrentEventRun({
        eventId: pendingEventData.eventId,
        trackId: pendingEventData.trackId,
        startedAt: pendingEventData.startedAt
      });
      
      // Enter event run
      setMode("eventRun");
      
      // Notify WebView to start event run
      webViewRef.current.postMessage(JSON.stringify({
        type: 'startEventRun',
        data: pendingEventData
      }));
      
      // Start tracking position updates for this event
      startEventPositionTracking(pendingEventData.eventId);
      
      // Clear pending event data
      setPendingEventData(null);
    }
  }, [mapReady, pendingEventData]);

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

      // Refresh events list
      getAllOpenEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const getAllOpenEvents = async () => {
    try {
      const data = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/getAllOpenEvents');
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
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(eventList));
      }
    } catch (error) {
      console.log('Error fetching events:', error);
      // Handle error appropriately
    }
  };

 const getUsersEvents = async () => {
  try {
    const data = await fetchWithAuth(
      `https://runfuncionapp.azurewebsites.net/api/getUsersEvents?userId=${encodeURIComponent(userId)}`
    );
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
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(myEventsList));
    }
    
  } catch (error) {
    console.log('Error fetching user events:', error);
    // Handle error appropriately
  }
};

const getAllTracks = async () => {
    try {
      const data = await fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/getAllTracks');
      console.log('Got Tracks:', data);
      //console.log('first point:', data[0].path[0]);
      const trackIds = data.map(track => track.trackId);
      setTracks(trackIds);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({'type': "tracks", 'tracks': data}));
      }
    } catch (error) {
      console.log('Error fetching tracks:', error);
      // Handle error appropriately
    }
  };

  const createTrack = async (track) => {
    console.log("Creating track:", track);
    
    // Validate track data before making API call
    if (!track || !Array.isArray(track) || track.length === 0) {
      console.error('Cannot create track: Invalid or empty track data');
      return null;
    }
    
    try {
      const data = await fetchWithAuth(
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
      console.log('Track created successfully');
      return data.trackId;
    } catch (error) {
      console.error('Error creating track:', error);
      return null;
    } 
  };

  const createActivity = async (activity) => {
    console.log("Logging run to database:", activity);
    
    // Validate that the activity has a valid path
    if (!activity.path || !Array.isArray(activity.path) || activity.path.length === 0) {
      console.error('Cannot create activity: Invalid or empty path');
      return;
    }
    
    activity.userId = userId;
    let track_id = await createTrack(activity.path);
    if (!track_id) {
      console.error('Error creating track');
      return;
    }
    activity.trackId = track_id;
    try {
        const data = await fetchWithAuth(
            'https://runfuncionapp.azurewebsites.net/api/createActivity',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activity)
            }
        );
        console.log('Activity logged successfully');
    } catch (error) {
        console.error('Error logging activity:', error);
    }
  };

  const handleSelectLocation = () => {
    console.log("Entering location select mode");
    setMode("selectingLocation");
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'startSelectingLocation' }));
    }
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

  function navigateToSelectTrack() {
    navigation.navigate('SelectTrack');
  }

  // New event running handlers
  const handleEventStarted = async (eventData) => {
    try {
      console.log('Event started:', eventData);
      console.log('Current userId:', userId);
      console.log('Ready users:', eventData.readyUsers);
      console.log('Removed users:', eventData.removedUsers);
      
      // Check if current user was removed for not being ready
      if (eventData.removedUsers && eventData.removedUsers.includes(userId)) {
        console.log('User was removed from event for not being ready');
        Alert.alert(
          'Removed from Event',
          'You were removed from the event because you were not marked as ready when the host started the event.',
          [{ text: 'OK' }]
        );
        
        // Refresh events to update the UI
        getAllOpenEvents();
        getUsersEvents();
        return;
      }
      
      // Check if current user is a participant in this event
      // This includes both ready users and the host
      const isParticipant = eventData.readyUsers.includes(userId);
      console.log('Is participant:', isParticipant);
      
      if (isParticipant) {
        console.log('Starting event run for participant');
        // Set current event run state
        setCurrentEventRun({
          eventId: eventData.eventId,
          trackId: eventData.trackId,
          startedAt: eventData.startedAt
        });
        
        // Enter event run
        setMode("eventRun");
        // Navigate to main map to ensure we're on the correct screen
        navigation.navigate("mainMap");
        
        // Notify WebView to start event run (only if WebView is ready)
        if (webViewRef.current && mapReady) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'startEventRun',
            data: eventData
          }));
          
          // Start tracking position updates for this event
          startEventPositionTracking(eventData.eventId);
        } else {
          console.log('WebView not ready yet, will start event run when map is ready');
          // Store the event data to start when map becomes ready
          setPendingEventData(eventData);
        }
      } else {
        console.log('User is not a participant in this event');
      }
    } catch (error) {
      console.error('Error handling event started:', error);
    }
  };

  const startEventPositionTracking = async (eventId) => {
    try {
      console.log('Starting event position tracking for event:', eventId);
      
      // Get initial positions of all runners
      const runners = await getEventRunnersPositions(eventId);
      console.log('Initial runners positions:', runners);
      
      setEventRunners(runners);
      
      // Filter out the current user from the runners data sent to WebView
      const otherRunners = runners.filter(runner => {
        return runner.userId !== userId;
      });
      console.log('Filtered runners (excluding current user):', otherRunners);
      
      // Send filtered runners data to WebView (even if empty)
      console.log('Sending filtered runners data to WebView:', otherRunners);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'updateEventRunners',
          data: otherRunners
        }));
      } else {
        console.log('WebView not ready, skipping runners data update');
      }
    } catch (error) {
      console.error('Error getting event runners positions:', error);
    }
  };

  const updateEventPosition = async (location) => {
    if (!currentEventRun) return;
    
    try {
      console.log('Sending position update to backend:', {
        eventId: currentEventRun.eventId,
        userId: userId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || null,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0
      });
      
      await updateRunnerPosition(
        currentEventRun.eventId,
        userId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.altitude || null,
        location.coords.speed || 0,
        location.coords.heading || 0,
        0, // distance - will be calculated by the WebView
        0  // elapsedTime - will be calculated by the WebView
      );
      
      console.log('Position update sent successfully');
    } catch (error) {
      console.error('Error updating event position:', error);
    }
  };

  const handleEndEventRun = async () => {
    if (!currentEventRun) return;
    
    try {
      await endEventRun(
        currentEventRun.eventId,
        userId,
      );

      // Exit event run mode
      setCurrentEventRun(null);
      setEventRunners([]);
      setMode("mainMap");
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({type: 'eventRunEnded'}));
      }
      getAllOpenEvents();
      
    } catch (error) {
      console.error('Error ending event run:', error);
      Alert.alert('Error', 'Failed to end event run');
    }
  };

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
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify(eventList));
          }
        } else if (data.data.action === "getUserLocation") {
          //console.log("sending location");
          // getUserLocation function is not implemented yet
          console.log("getUserLocation requested but not implemented");
        } else if (data.data.action === "navigateToProfile") {
          navigation.navigate('UserProfile', { profileId: userId });
        } else if (data.data.action === "confirmLocation") {
          console.log("Location confirmed:", data.data.location);
          setSelectedLocation(data.data.location);
          setMode("mainMap");
          // Reopen sheet properly
          openEventSheet();
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
          navigation.navigate('EventScreen', { 'eventId': data.data.eventObject.id });
        } else if (data.data.action === "enterFreeRunMode") {
          setMode("freeRun")
        } else if (data.data.action === "enterEventRunMode") {
          setMode("eventRun");
        } else if (data.data.action === "leaveRunMode") {
          setMode("mainMap");
        } else if (data.data.action === "updateEventPosition") {
          // Handle position updates during event run
          updateEventPosition(data.data.location);
        } else if (data.data.action === "endEventRun") {
          // Handle ending event run
          handleEndEventRun();
        } else if (data.data.action === "logRun") {
          console.log("Logging run to database, navigating to RunSummary");
          createActivity(data.data.activity);
          navigation.navigate('RunSummary', {
            run: data.data.activity,
            track: data.data.track
          });
        }else {
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
        {/* Connection Status Indicator */}
        {connectionState !== 'connected' && (
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionIndicator, 
              { backgroundColor: connectionState === 'connected' ? '#4CAF50' : 
                                connectionState === 'connecting' || connectionState === 'reconnecting' ? '#FF9800' : 
                                connectionState === 'failed' ? '#F44336' : '#9E9E9E' }
            ]} />
            <Text style={styles.connectionText}>
              {connectionState === 'connected' ? 'Connected' :
               connectionState === 'connecting' ? 'Connecting...' :
               connectionState === 'reconnecting' ? 'Reconnecting...' :
               connectionState === 'failed' ? 'Connection Failed' : 'Disconnected'}
            </Text>
            {(connectionState === 'failed' || connectionState === 'disconnected') && onRetryConnection && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetryConnection}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {mode === "mainMap" && !isSheetVisible && (
          <TouchableOpacity id="createEventBtn" style={styles.fab} onPress={openEventSheet}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
        {mode === "mainMap" && !isSheetVisible && (
          <TouchableOpacity id="startFreeRunBtn" style={styles.freeRunBtn} onPress={navigateToSelectTrack}>
            <Text style={styles.fabText}>🏃</Text>
          </TouchableOpacity>
        )}
        {mode === "mainMap" && !isSheetVisible && (
          <FloatingCoach
            userId={userId}
            profileId={userId}
            navigation={navigation}
          />
        )}
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
          visible={isSheetVisible}
        />
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
  connectionStatus: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1001,
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [connection, setConnection] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, reconnecting
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const maxRetries = 5;

  const handleLogout = async () => {
    try {
      // Clean up SignalR connection
      if (connection) {
        await connection.stop();
        setConnection(null);
      }
      setConnectionState('disconnected');
      setConnectionRetryCount(0);
      
      await AsyncStorage.multiRemove(['userToken', 'userId', 'username']);
      setUserToken(null);
      setUserId(null);
      setUsername(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const retrySignalRConnection = () => {
    console.log("Manual SignalR connection retry requested");
    setConnectionRetryCount(0);
    setConnectionState('disconnected');
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

  useEffect(() => {
    const connectToSignalR = async () => {
      if (connectionRetryCount >= maxRetries) {
        console.error("Max SignalR connection retries reached");
        setConnectionState('failed');
        return;
      }

      try {
        setConnectionState('connecting');
        console.log(`Attempting SignalR connection (attempt ${connectionRetryCount + 1}/${maxRetries})`);
        
                 // STEP 1: Call backend negotiate endpoint to get URL + token
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
         
         let url, accessToken;
         try {
           const res = await fetch("https://runfuncionapp.azurewebsites.net/api/negotiate", {
             method: 'GET',
             headers: {
               'Content-Type': 'application/json',
             },
             signal: controller.signal,
           });
           
           clearTimeout(timeoutId);
         
           if (!res.ok) {
             throw new Error(`Failed to fetch SignalR info: ${res.status} ${res.statusText}`);
           }

           const responseData = await res.json();
           url = responseData.url;
           accessToken = responseData.accessToken;
           console.log("SignalR negotiate response received");
           
           if (!url || !accessToken) {
             throw new Error("Invalid SignalR negotiate response - missing URL or access token");
           }
         } catch (fetchError) {
           clearTimeout(timeoutId);
           if (fetchError.name === 'AbortError') {
             throw new Error("SignalR negotiate request timed out");
           }
           throw fetchError;
         }

        // STEP 2: Use the returned info to connect
        const signalrConnection = new SignalR.HubConnectionBuilder()
          .withUrl(url, {
            accessTokenFactory: () => accessToken,
            skipNegotiation: false,
            transport: SignalR.HttpTransportType.WebSockets
          })
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
              // Custom retry logic
              if (retryContext.previousRetryCount === 0) {
                return 0; // Immediate retry
              }
              if (retryContext.previousRetryCount < 3) {
                return 2000; // 2 seconds
              }
              if (retryContext.previousRetryCount < 5) {
                return 5000; // 5 seconds
              }
              return 10000; // 10 seconds
            }
          })
          .configureLogging(SignalR.LogLevel.Warning) // Reduce log noise
          .build();
        
        signalrConnection.serverTimeoutInMilliseconds = 120000;
        signalrConnection.keepAliveIntervalInMilliseconds = 14500;
        
        // Add connection state handlers
        signalrConnection.onreconnecting((error) => {
          console.log("SignalR reconnecting:", error);
          setConnectionState('reconnecting');
        });

        signalrConnection.onreconnected((connectionId) => {
          console.log("SignalR reconnected:", connectionId);
          setConnectionState('connected');
          setConnectionRetryCount(0); // Reset retry count on successful connection
        });

        signalrConnection.onclose((error) => {
          console.log("SignalR connection closed:", error);
          setConnectionState('disconnected');
          
          // Attempt to reconnect if not at max retries
          if (connectionRetryCount < maxRetries) {
            setTimeout(() => {
              setConnectionRetryCount(prev => prev + 1);
            }, 2000);
          }
        });

        // Note: Connection health monitoring could be added here if the server supports ping/pong

        // Start the connection
        await signalrConnection.start();
        console.log("SignalR connected successfully");
        setConnection(signalrConnection);
        setConnectionState('connected');
        setConnectionRetryCount(0);
        
              } catch (error) {
          console.error("SignalR setup failed:", error);
          
          // Provide more specific error messages
          let errorMessage = "SignalR connection failed";
          if (error.message.includes("timeout")) {
            errorMessage = "Connection timeout - please check your internet connection";
          } else if (error.message.includes("Failed to fetch")) {
            errorMessage = "Network error - please check your internet connection";
          } else if (error.message.includes("WebSocket failed to connect")) {
            errorMessage = "WebSocket connection failed - server may be unavailable";
          }
          
          console.log("Error details:", errorMessage);
          setConnectionState('disconnected');
        
        // Retry logic
        if (connectionRetryCount < maxRetries) {
          const retryDelay = Math.min(2000 * Math.pow(2, connectionRetryCount), 10000); // Exponential backoff, max 10s
          console.log(`Retrying SignalR connection in ${retryDelay}ms`);
          
          setTimeout(() => {
            setConnectionRetryCount(prev => prev + 1);
          }, retryDelay);
        } else {
          console.error("Max SignalR connection retries reached");
          setConnectionState('failed');
        }
      }
    };

    // Only attempt connection if we have a user token
    if (userToken && connectionState === 'disconnected') {
      connectToSignalR();
    }
  }, [userToken, connectionRetryCount, connectionState]);

  // Cleanup effect to dispose of connection when component unmounts or user logs out
  useEffect(() => {
    return () => {
      if (connection) {
        console.log("Cleaning up SignalR connection");
        connection.stop();
      }
    };
  }, [connection]);

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
                  connection={connection}
                  connectionState={connectionState}
                  onRetryConnection={retrySignalRConnection}
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
            <Stack.Screen
              name="UserSearch"
              options={{
                title: 'Search for Users',
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
                <UserSearchScreen
                  {...props}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="EventScreen"
              options={{
                title: 'Event Details',
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
                <EventScreen
                  {...props}
                  userId={userId}
                  connection={connection}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="CoachingDashboard"
              options={{
                title: 'Your Coach',
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
                <CoachingDashboard
                  {...props}
                  userId={userId}
                  profileId={userId}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}