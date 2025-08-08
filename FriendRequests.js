import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert } from 'react-native';
import { getFriendRequests, respondToFriendRequest, getUser } from './utils/api';

export default function FriendRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const requestsData = await getFriendRequests();

      const requestsWithDetails = await Promise.all(
        requestsData.map(async (request) => {
          const userData = await getUser(request.requester_id);
          return { ...request, ...userData };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch friend requests.');
      console.log('Failed to fetch friend requests:', error);
    }
  };

  const handleResponse = async (requestId, status) => {
    try {
      await respondToFriendRequest(requestId, status);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} friend request.`);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>{item.userId}</Text>
      <View style={styles.buttons}>
        <Button title="Accept" onPress={() => handleResponse(item.request_id, 'accepted')} />
        <Button title="Decline" onPress={() => handleResponse(item.request_id, 'declined')} color="red" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.request_id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttons: {
    flexDirection: 'row',
  },
}); 