// CreateEventSheet.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, FlatList, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const CreateEventDisplay = React.forwardRef(({ eventObject, joinEvent, deleteEvent, leaveEvent, userId, onStartEvent, onMarkReady, onStartEventNow }, ref) => {
  const snapPoints = useMemo(() => ['25%', '75%'], []); // Increased height for more content

  const [eventTitle, setTitle] = useState('Some Event');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [host, setHost] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [users, setUsers] = useState([]);
  const [readyUsers, setReadyUsers] = useState([]); // New state for ready users

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
      if (eventObject.readyUsers) setReadyUsers(eventObject.readyUsers);
    }
  }, [eventObject]);

  const handleJoin = () => {
    joinEvent(selectedEventId, userId);
  }

  const handleDelete = () => {
    deleteEvent(selectedEventId);
    ref.current?.close();
  }

  const handleLeaveEvent = () => {
    leaveEvent(selectedEventId, userId, userId);
    ref.current?.close();
  }

  const handleStartEvent = () => {
    onStartEvent(selectedEventId);
  }

  const handleMarkReady = () => {
    onMarkReady(selectedEventId);
  }

  const handleStartEventNow = () => {
    onStartEventNow(selectedEventId);
  }

  const isHost = userId === host;
  const isParticipant = users.some(user => user.userId === userId);
  const isReadyMode = status === 'ready';
  const isUserReady = readyUsers.includes(userId);

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
            renderItem={({item}) => (
              <View style={styles.userRow}>
                <Text style={styles.userItem}>
                  {item.userId}
                </Text>
                {isReadyMode && readyUsers.includes(item.userId) && (
                  <Text style={styles.readyBadge}>Ready</Text>
                )}
              </View>
            )}
            keyExtractor={(item, idx) => item.userId || item.userId || item.RowKey || String(idx)}
          />
        </View>

        <View style={styles.buttonContainer}>
          {!isParticipant && !isHost && (
            <Button
              title="Join"
              onPress={handleJoin}
            />
          )}
          
          {isParticipant && !isHost && (
            <Button
              title="Leave Event"
              onPress={handleLeaveEvent}
              color="#dc3545"
            />
          )}

          {isHost && status === 'open' && (
            <Button
              title="Start Event Preparation"
              onPress={handleStartEvent}
              color="#28a745"
            />
          )}

          {isHost && status === 'ready' && (
            <Button
              title="Start Event Now"
              onPress={handleStartEventNow}
              color="#007bff"
            />
          )}

          {isParticipant && isReadyMode && !isUserReady && (
            <Button
              title="Mark as Ready"
              onPress={handleMarkReady}
              color="#007bff"
            />
          )}

          {isHost && (
            <Button
              title="Delete"
              onPress={handleDelete}
              color="#dc3545"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#fff',
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
    maxHeight: 200,
    marginVertical: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  userItem: {
    fontSize: 15,
    color: '#444',
  },
  readyBadge: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: 'bold',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  buttonContainer: {
    marginTop: 10,
    gap: 8,
  },
});