// CreateEventSheet.js
import React, { useMemo, useState,useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateEventSheet = React.forwardRef(({ onSubmit, onSelectLocation, location, webRef, selectedTrack, tracks, setMode, onClose, visible }, ref) => {
  const snapPoints = useMemo(() => ['25%', '75%'], []);
  
  const [formValues, setFormValues] = useState({ track: null });
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [track, setTrack] = useState('free run');
  const preserveOnCloseRef = useRef(false);

  const resetFields = () => {
    setName('');
    setLatitude('');
    setLongitude('');
    setStartDateTime(new Date());
    setDifficulty('beginner');
    setTrack('free run');
  };

  useEffect(() => {
    if (location) {
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
    }
  }, [location]);

  useEffect(() => {
    if (selectedTrack !== null) {
      //setFormValues((prev) => ({ ...prev, track: selectedTrack }));
      setTrack(selectedTrack);
    }
  }, [selectedTrack]);

  const openDateTimePicker = () => {
    setShowDatePicker(true);
  };

  const onChangeDate = (_event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const withDate = new Date(selected);
      // Preserve previously chosen time
      withDate.setHours(startDateTime.getHours(), startDateTime.getMinutes(), 0, 0);
      setStartDateTime(withDate);
    }
    // For Android, show time picker next
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    }
  };

  const onChangeTime = (_event, selected) => {
    setShowTimePicker(false);
    if (selected) {
      const updated = new Date(startDateTime);
      updated.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setStartDateTime(updated);
    }
  };

  const handleSelectTrackFromMap = () => {
    // Close sheet and initiate selection
    preserveOnCloseRef.current = true;
    ref.current?.close(); // Close the sheet
    webRef.current?.postMessage(JSON.stringify(
      { type: 'startTrackSelection' }
    ));
    setMode("selectingTrack");
    onClose?.();
  };
  const handleSubmit = () => {
    if (!latitude || !longitude || !startDateTime) {
      alert('Please fill in all fields');
      return;
    }

    const event = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      start_time: startDateTime.getTime().toString(),
      difficulty,
      trackId: track,
      name
    };

    onSubmit?.(event);
     // Reset fields
    resetFields();

    ref.current?.close();
    onClose?.();
  };

  return (
    <BottomSheet
        ref={ref}
        index={visible ? 1 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose={true} // This enables swipe-down to close
        onClose={() => {
          // Reset fields only if not preserving across map selection
          if (!preserveOnCloseRef.current) {
            resetFields();
          }
          preserveOnCloseRef.current = false;
          onClose?.();
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

        {/* Hidden longitude/latitude fields retained in state via location effect */}

        <TouchableOpacity onPress={openDateTimePicker} style={styles.input}>
          <Text>{startDateTime ? startDateTime.toLocaleString() : 'Select Start Time'}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={startDateTime || new Date()}
            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={startDateTime || new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeTime}
          />
        )}

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
            preserveOnCloseRef.current = true;
            ref.current?.close(); // Close the sheet
            onSelectLocation();   // Notify parent to enter map-pinning mode
            onClose?.();
          }}
        />
        <Button
          title="Select Track From Map"
          onPress={handleSelectTrackFromMap}
        />
        <Button title="Submit" onPress={handleSubmit} />
        <Button title="Close" onPress={() => { preserveOnCloseRef.current = false; ref.current?.close(); onClose?.(); }} />
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
