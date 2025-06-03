// CreateEventSheet.js
import React, { useMemo, useState,useEffect } from 'react';
import { View, FlatList, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const CreateEventDisplay = React.forwardRef(({ eventObject, joinEvent, deleteEvent, userId, webRef }, ref) => {
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const [eventTitle, setTitle] = useState('Some Event');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [host, setHost] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [users, setUsers] = useState([]);
  const [trackId, setTrackId] = useState(null);
  const [isTrackVisible, setIsTrackVisible] = useState(false);

  useEffect(() => {
    if (eventObject) {
      if (eventObject.id) setSelectedEventId(eventObject.id);
      if (eventObject.name) setTitle(eventObject.name);
      if (eventObject.status) setStatus(eventObject.status);
      if (eventObject.type) setType(eventObject.type);
      if (eventObject.host) setHost(eventObject.host);
      if (eventObject.difficulty) setDifficulty(eventObject.difficulty);
      if (eventObject.startTime) setStartTime(eventObject.startTime);
      if (eventObject.usersList) setUsers(eventObject.usersList);
      if (eventObject.trackId) setTrackId(eventObject.trackId);
    }
  }, [eventObject]);

  const handleJoin = () => {
    joinEvent(selectedEventId, userId);
  }

  const handleDelete = () => {
    deleteEvent(selectedEventId);
    ref.current?.close();
  }

  const handleShowTrack = () => {
    if (webRef && webRef.current && trackId) {
      // Minimize the bottom sheet
      ref.current?.snapToIndex(0);
      
      // Show the track on the map
      webRef.current.postMessage(JSON.stringify({
        type: 'showEventTrack',
        trackId: trackId
      }));
      setIsTrackVisible(true);
    }
  }

  const handleHideTrack = () => {
    if (webRef && webRef.current) {
      // Hide the track
      webRef.current.postMessage(JSON.stringify({
        type: 'hideEventTrack'
      }));
      // Expand the bottom sheet to show full event details
      ref.current?.snapToIndex(1);
      setIsTrackVisible(false);
    }
  }

  return (
    <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={() => {
          // Reset fields and hide track on close
          setTitle('Some Event');
          setIsTrackVisible(false);
          if (webRef && webRef.current) {
            webRef.current.postMessage(JSON.stringify({
              type: 'hideEventTrack'
            }));
          }
        }}
      >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>{eventTitle}</Text>

        {!isTrackVisible ? (
          <>
            <Text style={styles.label}>Status: <Text style={styles.textValue}>{status}</Text></Text>
            <Text style={styles.label}>Type: <Text style={styles.textValue}>{type}</Text></Text>
            <Text style={styles.label}>Difficulty: <Text style={styles.textValue}>{difficulty}</Text></Text>
            <Text style={styles.label}>Start Time: <Text style={styles.textValue}>{startTime}</Text></Text>
            <Text style={styles.label}>Host: <Text style={styles.textValue}>{host}</Text></Text>

            <View style={styles.userList}>
              <Text style={styles.label}>Registered Users:</Text>
              <FlatList
                data={users}
                renderItem={({item}) => <Text style={styles.userItem}>{item.FirstName} {item.LastName}</Text>}
              />
            </View>
          </>
        ) : (
          <Text style={styles.label}>Track is currently visible on the map</Text>
        )}

        <View style={styles.buttonContainer}>
          {!isTrackVisible && (
            <>
              <Button
                title="Join"
                onPress={handleJoin}
              />
              {trackId && (
                <Button
                  title="Show Track"
                  onPress={handleShowTrack}
                  color="#4CAF50"
                />
              )}
              <Button
                title="Delete"
                onPress={handleDelete}
              />
            </>
          )}
          {isTrackVisible && trackId && (
            <Button
              title="Return to Event Details"
              onPress={handleHideTrack}
              color="#2196F3"
            />
          )}
          <Button
              title="Close"
              onPress={() => ref.current?.close()}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default CreateEventDisplay;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     gap: 10,
//   },
//   title: {
//     fontSize: 20,
//     marginBottom: 10,
//     fontWeight: 'bold',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 10,
//   },
//   picker: {
//     height: 50,
//     width: '100%',
//   },
// });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#fff', // Optional for clarity
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginTop: 6,
  },
  textValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  userList: {
    maxHeight: 150,
    marginVertical: 10,
  },
  userItem: {
    fontSize: 15,
    color: '#444',
    paddingVertical: 2,
  },
  buttonContainer: {
    marginTop: 10,
    gap: 8,
  },
});