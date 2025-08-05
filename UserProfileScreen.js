import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import UserProfileTabs from './UserProfileTabs'
import { getFriendshipStatus, sendFriendRequest, removeFriend } from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';


export default function UserProfileScreen({ navigation, username, userId, onLogout }) {
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const route = useRoute();
  const profileId = route.params.profileId;

  useEffect(() => {
    const fetchFriendshipStatus = async () => {
      try {
        if (userId === profileId) {
          return;
        }
        const fsStatus = await getFriendshipStatus(profileId);
        setFriendshipStatus(fsStatus.status);
      }
      catch (error) {
        console.log('Failed to fetch friendship status:', error);
      }
    }
    fetchFriendshipStatus();
  }, [friendshipStatus, profileId])

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleAddFriend = async (addressee_id) => {
    try {
      await sendFriendRequest(addressee_id);
      Alert.alert('Success', 'Friend request sent.');
      setFriendshipStatus('pending');
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request.');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await removeFriend(friendId);
      setFriendshipStatus(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove friend.');
    }
  };

  const handleFriendshipButton = () => {
    if (friendshipStatus === null) {
      handleAddFriend(profileId);
    }
    else if (friendshipStatus === 'accepted') {
      handleRemoveFriend(profileId);
    }
    else {
      return;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.username}>{profileId}</Text>
        </View>
        {userId === profileId && <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>}
        {userId !== profileId && <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleFriendshipButton}
        >
          <Text style={styles.logoutText}>{!friendshipStatus ? 'Add Friend' : (friendshipStatus === 'accepted' ? 'Remove Friend' : 'Request Pending')}</Text>
        </TouchableOpacity>}
      </View>
      
      <UserProfileTabs
        navigation={navigation}
        userId={userId}
        profileId={profileId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 