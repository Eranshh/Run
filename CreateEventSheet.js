// CreateEventSheet.js
import React, { useMemo, useState,useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';

const CreateEventSheet = React.forwardRef(({ onSubmit, onSelectLocation, location, webRef, selectedTrack, tracks }, ref) => {
  const snapPoints = useMemo(() => ['25%', '75%'], []);
  
  const [formValues, setFormValues] = useState({ track: null });
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [startTime, setStartTime] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('open');
  const [difficulty, setDifficulty] = useState('beginner');
  const [track, setTrack] = useState('free run');


  useEffect(() => {
    if (location) {
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
    }
  }, [location]);

  useEffect(() => {
    if (selectedTrack !== null) {
      //setFormValues((prev) => ({ ...prev, track: selectedTrack }));
      setTrack(selectedTrack.trackId);
    }
  }, [selectedTrack]);

  const handleSelectTrackFromMap = () => {
    // Close sheet and initiate selection
    ref.current?.close(); // Close the sheet
    webRef.current?.postMessage(JSON.stringify(
      { type: 'startTrackSelection' }
    ));
  };
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
      name
    };

    onSubmit?.(event);
     // Reset fields
    setName('');
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
          placeholder="Name"
          value={name}
          onChangeText={setName}
          keyboardType="text"
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
          placeholder="Latitude"
          value={latitude}
          onChangeText={setLatitude}
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
        >
          <Picker.Item label="Free Run" value={null} />
          {tracks.map((id, index) => (
          <Picker.Item key={id} label={`Track ${index + 1}`} value={id} />
          ))}
        </Picker>

        <Button
          title="Select Location"
          onPress={() => {
            ref.current?.close(); // Close the sheet
            onSelectLocation();   // Notify parent to enter map-pinning mode
          }}
        />
        <Button
          title="Select Track From Map"
          onPress={handleSelectTrackFromMap}
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
