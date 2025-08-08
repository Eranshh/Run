import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert } from 'react-native';
import { getFriends, removeFriend, getUser } from './utils/api';

export default function FriendsList({ navigation, userId, profileId }) {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const friendsData = await getFriends(profileId);
      
      const friendsWithDetails = await Promise.all(
        friendsData.map(async (friend) => {
          const userData = await getUser(friend.friend_id);
          return { ...friend, ...userData };
        })
      );

      setFriends(friendsWithDetails);
      console.log('Got friends for the list:', friends);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch friends.', error);
      console.log('Failed to fetch friends:', error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await removeFriend(friendId);
      fetchFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove friend.');
    }
  };

  const handleViewProfile = (friendId) => {
    navigation.navigate('UserProfile', { profileId: friendId });
  }

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>{item.userId}</Text>
      <Button title="View Profile" onPress={() => handleViewProfile(item.friend_id)} />
      {userId === profileId && <Button title="Remove" onPress={() => handleRemoveFriend(item.friend_id)} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        renderItem={renderItem}
        keyExtractor={(item) => item.friend_id}
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
}); 