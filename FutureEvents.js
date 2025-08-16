import React, { useState, useEffect } from 'react';
import {
    Button,
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
  } from 'react-native';
import { fetchWithAuth } from './utils/api';


const EventItem = ({ event, onPress, expanded, participants, loadingParticipants, openEvent }) => {
  // Prepare participants list with host first
  let fullParticipants = [];
  if (expanded) {
    const host = { userId: event.trainerId, isHost: true };
    // Avoid duplicate if host is in participants (shouldn't be, but just in case)
    const filtered = (participants || []).filter(p => p.userId !== event.trainerId);
    fullParticipants = [host, ...filtered];
  }

  return (
    <TouchableOpacity style={styles.runItem} onPress={() => onPress(event)}>
      <View style={styles.runHeader}>
        <Text style={styles.runDate}>{event.name || 'Some Event'}</Text>
        <Text style={styles.runType}>{event.type}</Text>
      </View>
      <View style={styles.runDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Start Time</Text>
          <Text style={styles.detailValue}>{new Date(event.start_time).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{event.status}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Difficulty</Text>
          <Text style={styles.detailValue}>{event.difficulty}</Text>
        </View>
      </View>
      {expanded && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsTitle}>Participants:</Text>
          {loadingParticipants ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : fullParticipants && fullParticipants.length > 0 ? (
            fullParticipants.map((p, idx) => (
              <Text key={p.userId || idx} style={styles.participantName}>
                {p.isHost ? '👑 ' : ''}{p.userId}
              </Text>
            ))
          ) : (
            <Text style={styles.noParticipants}>No participants found.</Text>
          )}
          <Button title={'Go To'} onPress={() => openEvent(event.eventId)}/>
        </View>
      )}
    </TouchableOpacity>
  );
};


export default function FutureEvents({ navigation, profileId }) {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedEventId, setExpandedEventId] = useState(null);
    const [participantsByEvent, setParticipantsByEvent] = useState({});
    const [loadingParticipantsId, setLoadingParticipantsId] = useState(null);

    const handleEventPress = async (event) => {
      if (expandedEventId === event.eventId) {
        setExpandedEventId(null);
        return;
      }
      setExpandedEventId(event.eventId);
      if (!participantsByEvent[event.eventId]) {
        setLoadingParticipantsId(event.eventId);
        try {
          const data = await fetchWithAuth(
            `https://runfuncionapp.azurewebsites.net/api/getEventRegisteredUsers?eventId=${event.eventId}`
          );
          console.log('Got event participants:', data);
          setParticipantsByEvent(prev => ({ ...prev, [event.eventId]: data }));
        } catch (error) {
          setParticipantsByEvent(prev => ({ ...prev, [event.eventId]: [] }));
          Alert.alert('Error', 'Failed to load participants.');
        } finally {
          setLoadingParticipantsId(null);
        }
      }
    }

    function openEvent(id) {
      navigation.navigate('EventScreen', {'eventId': id});
    }

    useEffect(() => {
        const getUserFutureEvents = async (id) => {
            try {
                console.log("Fetching future events for authenticated user");
                const data = await fetchWithAuth(
                    `https://runfuncionapp.azurewebsites.net/api/getUsersFutureEvents?id=${encodeURIComponent(id)}`
                );
                setEvents(data);
                console.log('Got users future events:', data);
            } catch (error) {
                console.error('Error fetching future events:', error);
                Alert.alert(
                    'Error',
                    'Failed to load your future events. Please try again later.'
                );
            } finally {
                setIsLoading(false);
            }
        }
        
        getUserFutureEvents(profileId);
    }, [profileId]);

    if (isLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        );
    }

    return (
        <FlatList
            data={events}
            renderItem={({ item }) => (
              <EventItem
                event={item}
                onPress={handleEventPress}
                expanded={expandedEventId === item.eventId}
                participants={participantsByEvent[item.eventId]}
                loadingParticipants={loadingParticipantsId === item.eventId}
                openEvent={openEvent}
              />
            )}
            keyExtractor={item => item.eventId}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Not registered to upcoming events</Text>
                <Text style={styles.emptySubtext}>Join or create events to see your future events here!</Text>
            </View>
            }
        />
    )
}

const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContainer: {
      padding: 16,
    },
    runItem: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    runHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    runDate: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
    },
    runType: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '500',
    },
    runDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    detailItem: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      color: '#333',
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
    },
    participantsContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: '#F3F8FF',
      borderRadius: 8,
    },
    participantsTitle: {
      fontWeight: '600',
      fontSize: 15,
      marginBottom: 8,
      color: '#007AFF',
    },
    participantName: {
      fontSize: 14,
      color: '#333',
      marginBottom: 4,
    },
    noParticipants: {
      fontSize: 13,
      color: '#999',
      fontStyle: 'italic',
    },
});