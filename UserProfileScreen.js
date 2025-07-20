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
import UserProfileTabs from './UserProfileTabs'
import { fetchWithAuth } from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';


export default function UserProfileScreen({ navigation, username, userId, onLogout }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTracks, setUserTracks] = useState([]);

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.subtitle}>Run History</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <UserProfileTabs
        navigation={navigation}
        userId={userId}
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