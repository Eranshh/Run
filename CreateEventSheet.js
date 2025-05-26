// CreateEventSheet.js
import React, { useMemo, useState,useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';

const CreateEventSheet = React.forwardRef(({ onSubmit, onSelectLocation, location }, ref) => {
  const snapPoints = useMemo(() => ['25%', '75%'], []);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [startTime, setStartTime] = useState('');
  const [status, setStatus] = useState('open');
  const [difficulty, setDifficulty] = useState('beginner');
  const [track, setTrack] = useState('free run');


  useEffect(() => {
    if (location) {
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
    }
  }, [location]);

  const handleSubmit = () => {
    if (!latitude || !longitude || !startTime) {
      alert('Please fill in all fields');
      return;
    }

    const event = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      startTime: Number(startTime),
      status,
      difficulty,
      track,
    };

    onSubmit?.(event);
     // Reset fields
    setLatitude('');
    setLongitude('');
    setStartTime('');
    setStatus('open');
    setDifficulty('beginner');
    setTrack('free run');

    ref.current?.close();
  };

  return (
    <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true} // This enables swipe-down to close
        onClose={() => {
          // Optional: reset fields on close
          setLatitude('');
          setLongitude('');
          setStartTime('');
          setStatus('open');
          setDifficulty('beginner');
          setTrack('free run');
        }}
      >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>Create Event</Text>

        <TextInput
          placeholder="Latitude"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          placeholder="Longitude"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          placeholder="Start Time"
          value={startTime}
          onChangeText={setStartTime}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text>Status</Text>
        <Picker
          selectedValue={status}
          onValueChange={(itemValue) => setStatus(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Open" value="open" />
          <Picker.Item label="In Progress" value="in progress" />
          <Picker.Item label="Finished" value="finished" />
        </Picker>

        <Text>Difficulty</Text>
        <Picker
          selectedValue={difficulty}
          onValueChange={(itemValue) => setDifficulty(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Beginner" value="beginner" />
          <Picker.Item label="Intermediate" value="intermediate" />
          <Picker.Item label="Advanced" value="advanced" />
        </Picker>

        <Text>Track</Text>
        <Picker
          selectedValue={track}
          onValueChange={(itemValue) => setTrack(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Free Run" value="free run" />
          {/* You can add more tracks in the future here */}
        </Picker>

        <Button
          title="Select Location"
          onPress={() => {
            ref.current?.close(); // Close the sheet
            onSelectLocation();   // Notify parent to enter map-pinning mode
          }}
        />
        <Button title="Submit" onPress={handleSubmit} />
        <Button title="Close" onPress={() => ref.current?.close()} />
      </BottomSheetView>
    </BottomSheet>
  );
});

export default CreateEventSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  picker: {
    height: 50,
    width: '100%',
  },
});
