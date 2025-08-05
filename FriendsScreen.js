import React from 'react';
import { View, Button } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';

const Tab = createMaterialTopTabNavigator();

export default function FriendsScreen({ navigation, userId, profileId }) {
  return (
    <View style={{ flex: 1 }}>
      {userId === profileId && <Button
        title="Search for Users"
        onPress={() => navigation.navigate('UserSearch')}
      />}
      <Tab.Navigator>
        <Tab.Screen name="Friends" component={FriendsList} navigation={navigation} />
        <Tab.Screen name="Requests" component={FriendRequests} />
      </Tab.Navigator>
    </View>
  );
} 