// CreateEventSheet.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateEventSheet = React.forwardRef(({ onSubmit, onSelectLocation, location, webRef, selectedTrack, tracks, setMode, onClose }, ref) => {
  const snapPoints = useMemo(() => ['25%', '75%'], []);
  
  const [formValues, setFormValues] = useState({ track: null });
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date()); // Holds date part before picking time on Android
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
      setTrack(selectedTrack);
    }
  }, [selectedTrack]);

  const handleSelectTrackFromMap = () => {
    // Close sheet and initiate selection
    ref.current?.close(); // Close the sheet
    webRef.current?.postMessage(JSON.stringify(
      { type: 'startTrackSelection' }
    ));
    setMode("selectingTrack");
  };
  const handleSubmit = () => {
    if (!latitude || !longitude || !startDate) {
      alert('Please fill in all fields');
      return;
    }

    const event = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      startTime: startDate.getTime(),
      status,
      difficulty,
      trackId: track,
      name
    };

    onSubmit?.(event);
     // Reset fields
    setName('');
    setLatitude('');
    setLongitude('');
    setStartDate(new Date());
    setStatus('open');
    setDifficulty('beginner');
    setTrack('free run');

    ref.current?.close();
    setMode("mainMap");
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
          setStartDate(new Date());
          setStatus('open');
          setDifficulty('beginner');
          setTrack('free run');
          setMode("mainMap");
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
        <Button title="Close" onPress={() => { ref.current?.close(); setMode("mainMap"); onClose?.(); }} />

        {/* Start Date & Time Picker */}
        <TouchableOpacity onPress={() => {
          if (Platform.OS === 'android') {
            // On Android we show date first then time
            setShowDatePicker(true);
          } else {
            setShowDatePicker(true);
          }
        }} style={styles.dateInput}>
          <Text>{startDate ? startDate.toLocaleString() : 'Select Start Time'}</Text>
        </TouchableOpacity>
        {/* Date picker */}
        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (event.type === 'dismissed') {
                setShowDatePicker(false);
                return;
              }
              if (selectedDate) {
                if (Platform.OS === 'android') {
                  // Save date part and open time picker
                  setTempDate(selectedDate);
                  setShowDatePicker(false);
                  setShowTimePicker(true);
                } else {
                  // iOS returns full datetime
                  setStartDate(selectedDate);
                  setShowDatePicker(false);
                }
              }
            }}
          />
        )}
        {/* Time picker only for Android */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              if (event.type === 'dismissed') {
                setShowTimePicker(false);
                return;
              }
              if (selectedTime) {
                // Combine selected date and time
                const newDate = new Date(tempDate);
                newDate.setHours(selectedTime.getHours());
                newDate.setMinutes(selectedTime.getMinutes());
                newDate.setSeconds(0);
                setStartDate(newDate);
              }
              setShowTimePicker(false);
            }}
          />
        )}
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center'
  },
});
