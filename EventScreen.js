import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, Text, Button, StyleSheet, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fetchWithAuth, leaveEvent, joinEvent, deleteEvent, setEventReady, markUserReady, startEvent } from './utils/api';
import { WebView } from 'react-native-webview';

export default function EventScreen({ navigation, userId, connection }) {
    const [isLoading, setIsLoading] = useState(true);
    const [listenersUp, setListenersUp] = useState(false);
    const [eventTitle, setTitle] = useState('Some Event');
    const [status, setStatus] = useState(null);
    const [type, setType] = useState(null);
    const [host, setHost] = useState(null);
    const [difficulty, setDifficulty] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [users, setUsers] = useState([]);
    const [readyUsers, setReadyUsers] = useState([]);
    const [track, setTrack] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [latitude, setLatitude] = useState(null);
    const [weather, setWeather] = useState(null);

    const route = useRoute();
    const eventId = route.params.eventId;
    const webViewRef = useRef(null);

    useEffect(() => {
        updateEventDetails(eventId);
    }, [])

    useEffect(() => {
        if (!startTime || !longitude || !latitude) return;
        getWeatherForecast();
    }, [startTime, longitude, latitude])

    useEffect(() => {
        if (listenersUp || !connection) return;

        connection.on('updateEvent', (data) => {
            if (data.eventId !== eventId) return;
            updateEventDetails(eventId);
        });

        connection.on('eventStatusChanged', (data) => {
            if (data.eventId !== eventId) return;
            updateEventDetails(eventId);
        });

        setListenersUp(true);
    }, [connection])

    function setEventDetails(data) {
        data.name ? setTitle(data.name) : setTitle('Some Event');
        data.status ? setStatus(data.status) : setStatus(null);
        data.type ? setType(data.type) : setType(null);
        data.trainerId ? setHost(data.trainerId) : setHost(null);
        data.difficulty ? setDifficulty(data.difficulty) : setDifficulty(null);
        data.start_time ? setStartTime(data.start_time) : setStartTime(null);
        data.longitude ? setLongitude(data.longitude) : setLongitude(null);
        data.latitude ? setLatitude(data.latitude) : setLatitude(null);
    }

    const getWeatherForecast = async () => {
        const subscriptionKey = "BSDCG4i6BIsimtM5jNRtCupaIm4boJb8WM92OhKd3jL6x14l3W6mJQQJ99BEACi5YpzPSPD9AAAgAZMP337x";
        const weather_api = "https://atlas.microsoft.com/weather";

        const now = Date.now();
        const eventTime = Number(startTime);
        const diffMS = eventTime - now; // Time in milliseconds until the event starts (negative = passed)
        const diffHours = diffMS / (1000 * 60 * 60); // Time in hours
        const diffDays = diffMS / (1000 * 60 * 60 * 24); // Time in days

        if (diffHours <= 1) { // If at most an hour or passed, get current weather
            try {
                const response = await fetch(`${weather_api}/currentConditions/json?api-version=1.0&query=${latitude},${longitude}&subscription-key=${subscriptionKey}`);
                const data = await response.json();
                console.log("Got weather report:", data);

                const weatherObj = {
                    type: "current",
                    phrase: data.results[0].phrase,
                    temperature: data.results[0].temperature,
                }
                setWeather(weatherObj);
            }
            catch (err) {
                console.log("Error fetching current weather:", error);
            }
        } else if (diffDays <= 3) { // If at most 3 days, get hourly weather
            try {
                const hourIndex = Math.floor(diffHours) - 1;
                const response = await fetch(`${weather_api}/forecast/hourly/json?api-version=1.1&query=${latitude},${longitude}&subscription-key=${subscriptionKey}&duration=72`);
                const data = await response.json();
                console.log("Got weather report:", data.forecasts[hourIndex]);

                const weatherObj = {
                    type: "hourly",
                    phrase: data.forecasts[hourIndex].iconPhrase,
                    temperature: data.forecasts[hourIndex].temperature,
                }
                setWeather(weatherObj);
            }
            catch (err) {
                console.log("Error fetching hoursly weather:", error);
            }
        } else if (diffDays <= 15) { // If at most 15 days, get daily weather
            try {
                const dayIndex = Math.floor(diffDays);
                const response = await fetch(`${weather_api}/forecast/daily/json?api-version=1.1&query=${latitude},${longitude}&subscription-key=${subscriptionKey}&duration=15`);
                data = await response.json();
                console.log("Got weather report:", data.forecasts[dayIndex]);

                const weatherObj = {
                    type: "daily",
                    phrase: data.forecasts[dayIndex].day.longPhrase,
                    temperature: data.forecasts[dayIndex].temperature,
                }
                setWeather(weatherObj);
            }
            catch (err) {
                console.log("Error fetching daily weather:", error);
            }
        }
    }

    const updateEventDetails = async (id) => {
        try {
            const [usersResponse, readyUsersResponse, eventData] = await Promise.all([
                fetchWithAuth(
                    `https://runfuncionapp.azurewebsites.net/api/getEventRegisteredUsers?eventId=${encodeURIComponent(id)}`
                ),
                fetchWithAuth(
                    `https://runfuncionapp.azurewebsites.net/api/getEventReadyUsers?eventId=${encodeURIComponent(id)}`
                ),
                fetchWithAuth(
                    `https://runfuncionapp.azurewebsites.net/api/getEventById?eventId=${encodeURIComponent(id)}`
                ),
            ]);
            setUsers(usersResponse);
            setReadyUsers(readyUsersResponse.map(user => user.UserId));
            setEventDetails(eventData);
            if (eventData.trackId && eventData.trackId !== 'free run') {
                const t = await fetchWithAuth(
                    `https://runfuncionapp.azurewebsites.net/api/getTrackById?trackId=${encodeURIComponent(eventData.trackId)}`
                );
                setTrack(t);
            }
            setIsLoading(false);
            console.log('Got users:', usersResponse);
            console.log('Got ready users:', readyUsersResponse);
            console.log('Got event data:', eventData);
        } catch (error) {
            console.error('Error fetching event details:', error);
        }
    };

    const handleJoin = () => {
        joinEvent(eventId, userId);
    }

    const handleDelete = () => {
        deleteEvent(eventId);
        navigation.popToTop();
    }
    
    const handleLeaveEvent = async () => {
        leaveEvent(eventId, userId, userId);
    };

    const handleStartEvent = async () => {
        setEventReady(eventId);
    };

    const handleMarkReady = async () => {
        console.log('User marked ready!');
        markUserReady(eventId, userId);
    };

    const handleStartEventNow = async () => {
        startEvent(eventId, userId);
    };

    const handleViewProfile = (profileId) => {
        navigation.navigate('UserProfile', { 'profileId': profileId })
    }

    const isHost = userId === host;
    const isParticipant = users.some(user => user.userId === userId);
    const isUserReady = readyUsers.includes(userId);

    const sendPathToWebView = () => {
        console.log('sendPathToWebView called');
        if (track && track.path && webViewRef.current) {
            console.log('Sending path to WebView:', track.path);
            webViewRef.current.postMessage(JSON.stringify({ path: JSON.parse(track.path) }));
        } else if (longitude && latitude && webViewRef.current) {
            console.log('Sending point to webView');
            webViewRef.current.postMessage(JSON.stringify({longitude: longitude, latitude: latitude}));
        } else {
            console.log('Cannot send path - track:', !!track, 'path:', !!track?.path, 'webViewRef:', !!webViewRef.current);
        }
    };
    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data && data.data && data.data.action === 'log') {
                console.log('[WebView LOG]:', data.data.message);
            } else {
                console.log('[WebView MSG]:', data);
            }
        } catch (err) {
            console.error('Error parsing WebView message:', err, event.nativeEvent.data);
        }
      };

    return (
        <View style={styles.container}>
            {isLoading && <Text>Loading...</Text>}
            {!isLoading && <Text style={styles.title}>{eventTitle || 'Event Summary'}</Text>}
            {!isLoading && <View style={styles.statsCard}>
                <View style={styles.statRow}><Text style={styles.statLabel}>📅 Date:</Text><Text style={styles.statValue}>{startTime ? new Date(Number(startTime)).toLocaleString() : 'N/A'}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>Status:</Text><Text style={styles.statValue}>{status}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>Type:</Text><Text style={styles.statValue}>{type}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>Difficulty:</Text><Text style={styles.statValue}>{difficulty}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>Number of participants:</Text><Text style={styles.statValue}>{users.length + 1}</Text></View>
                <Text style={styles.statLabel}>Participants:</Text>
                <View style={styles.userRow}><Text>👑{host}</Text><Button title='View Profile' onPress={() => handleViewProfile(host)}/></View>
                <FlatList
                    data={users}
                    renderItem={({item}) => (
                        <View style={styles.userRow}>
                            <Text>
                                {item.userId}
                            </Text>
                            {status === 'ready' && readyUsers.includes(item.userId) && (
                                <Text style={styles.readyBadge}>Ready</Text>
                            )}
                            <Button
                                title='View Profile'
                                onPress={() => handleViewProfile(item.userId)}
                            />
                        </View>
                    )}
                    keyExtractor={(item, idx) => item.userId || item.userId || item.RowKey || String(idx)}
                />
            </View>}
            {!isLoading && <View style={styles.buttonContainer}>
                {!isParticipant && !isHost && (
                    <Button
                        title="Join"
                        onPress={handleJoin}
                    />
                )}

                {isParticipant && status === 'ready' && !isUserReady && (
                    <Button
                        title="Mark as Ready"
                        onPress={handleMarkReady}
                        color="#007bff"
                    />
                )}
                
                {isParticipant && !isHost && (
                    <Button
                        title="Leave Event"
                        onPress={handleLeaveEvent}
                        color="#dc3545"
                    />
                )}

                {isHost && status === 'open' && (
                    <Button
                        title="Start Event Preparation"
                        onPress={handleStartEvent}
                        color="#28a745"
                    />
                )}

                {isHost && status === 'ready' && (
                    <Button
                        title="Start Event Now"
                        onPress={handleStartEventNow}
                        color="#007bff"
                    />
                )}

                {isHost && (
                    <Button
                        title="Delete"
                        onPress={handleDelete}
                        color="#dc3545"
                    />
                )}
            </View>}
            {(!isLoading && ((track && track.path) || (longitude && latitude)) &&
                <WebView
                    ref={webViewRef}
                    source={require('./runSummaryMap.html')}
                    style={styles.map}
                    javaScriptEnabled
                    domStorageEnabled
                    onLoad={sendPathToWebView}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error:', nativeEvent);
                    }}
                    onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView HTTP error:', nativeEvent);
                    }}
                    onMessage={handleWebViewMessage}
                />
            )}
            {!isLoading && weather && <View style={styles.weatherCard}>
                <View style={styles.weatherHeader}>
                    <Text style={styles.weatherTitle}>Weather</Text>
                    {weather.type !== "daily" && <Text style={styles.weatherTemp}>{weather.temperature.value}°{weather.temperature.unit || 'C'}</Text>}
                    {weather.type === "daily" && <Text style={styles.weatherTemp}>{weather.temperature.minimum.value} - {weather.temperature.maximum.value}°{weather.temperature.maximum.unit || 'C'}</Text>}
                </View>
                <Text style={styles.weatherConditions}>{weather.phrase}</Text>
            </View>}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
    statsCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 14,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
        marginRight: 8,
    },
    statValue: {
        fontSize: 16,
        color: '#007AFF',
        flexShrink: 1,
        textAlign: 'right',
    },
    buttonContainer: {
        marginTop: 10,
        gap: 8,
    },
    map: {
        width: Dimensions.get('window').width - 32,
        height: 250,
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden'
    },
    readyBadge: {
        fontSize: 12,
        color: '#28a745',
        fontWeight: 'bold',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    userRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    weatherCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#2196f3',
    },
    weatherHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    weatherTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    weatherTemp: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    weatherConditions: {
        fontSize: 14,
        color: '#424242',
        fontStyle: 'italic',
    },
});