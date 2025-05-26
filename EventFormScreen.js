import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ScrollView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function EventFormScreen({ location, onBack, onSubmit, selectingLocation, setSelectingLocation }) {
  const [startTime, setStartTime] = useState('');
  const [status, setStatus] = useState('open');
  const [difficulty, setDifficulty] = useState('beginner');
  const [track, setTrack] = useState('free');

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <ScrollView style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 20 }}>
          <Text style={{ color: 'blue' }}>← Back to Map</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Create Event</Text>

        <Text style={{ marginTop: 20 }}>Latitude</Text>
        <TextInput
          value={String(location?.latitude || '')}
          editable={false}
          style={{ borderBottomWidth: 1 }}
        />

        <Text style={{ marginTop: 10 }}>Longitude</Text>
        <TextInput
          value={String(location?.longitude || '')}
          editable={false}
          style={{ borderBottomWidth: 1 }}
        />

        <Text style={{ marginTop: 10 }}>Start Time (number)</Text>
        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          keyboardType="numeric"
          placeholder="Enter start time"
          style={{ borderBottomWidth: 1 }}
        />

        <Text style={{ marginTop: 10 }}>Status</Text>
        <Picker selectedValue={status} onValueChange={setStatus}>
          <Picker.Item label="Open" value="open" />
          <Picker.Item label="In Progress" value="in progress" />
          <Picker.Item label="Finished" value="finished" />
        </Picker>

        <Text style={{ marginTop: 10 }}>Difficulty</Text>
        <Picker selectedValue={difficulty} onValueChange={setDifficulty}>
          <Picker.Item label="Beginner" value="beginner" />
          <Picker.Item label="Intermediate" value="intermediate" />
          <Picker.Item label="Advanced" value="advanced" />
        </Picker>

        <Text style={{ marginTop: 10 }}>Track</Text>
        <Picker selectedValue={track} onValueChange={setTrack}>
          <Picker.Item label="Free Run" value="free" />
        </Picker>

        <Button title="Select Location" onPress={() => {
          setSelectingLocation(true);
          onBack(); // Go back to map for location selection
        }} />

        <View style={{ marginTop: 10 }}>
          <Button
            title="Submit Event"
            onPress={() =>
              onSubmit({
                latitude: location.latitude,
                longitude: location.longitude,
                startTime: parseInt(startTime),
                status,
                difficulty,
                track,
              })
            }
            disabled={!startTime}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
