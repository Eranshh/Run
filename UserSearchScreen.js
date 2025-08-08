import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert } from 'react-native';
import { searchUsers, sendFriendRequest } from './utils/api';

export default function UserSearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);

  const handleSearch = async () => {
    try {
      const data = await searchUsers(query);
      setUsers(data);
      console.log('Got users:', users);
    } catch (error) {
      Alert.alert('Error', 'Failed to search for users.');
    }
  };

  const handleViewProfile = (id) => {
    navigation.navigate('UserProfile', { profileId: id });
  }

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>{item.userId}</Text>
      <Button title="View profile" onPress={() => handleViewProfile(item.userId)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for users..."
        value={query}
        onChangeText={setQuery}
      />
      <Button title="Search" onPress={handleSearch} />
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
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