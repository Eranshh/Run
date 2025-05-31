// CreateEventSheet.js
import React, { useMemo, useState,useEffect } from 'react';
import { View, FlatList, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const CreateEventDisplay = React.forwardRef(({ eventObject, joinEvent, deleteEvent, userId }, ref) => {
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const [eventTitle, setTitle] = useState('Some Event');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [host, setHost] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [users, setUsers] = useState([]);

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
    }
  }, [eventObject]);

  const handleJoin = () => {
    joinEvent(selectedEventId, userId);
  }

  const handleDelete = () => {
    deleteEvent(selectedEventId);
    ref.current?.close();
  }

  return (
    <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true} // This enables swipe-down to close
        onClose={() => {
          // Optional: reset fields on close
          setTitle('Some Event');
        }}
      >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>{eventTitle}</Text>

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

        <View style={styles.buttonContainer}>
          <Button
            title="Join"
            onPress={handleJoin}
          />
          <Button
            title="Delete"
            onPress={handleDelete}
          />
          <Button
              title="Close"
              onPress={() =>ref.current?.close()}
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