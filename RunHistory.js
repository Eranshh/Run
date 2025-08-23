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
  ScrollView,
  Dimensions,
} from 'react-native';
import { fetchWithAuth } from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

// Chart configuration
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007AFF',
  },
};

const barChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
  propsForLabels: {
    fontSize: 10,
  },
};

const RunItem = ({ run, onPress }) => {
  // Helper function to safely format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    
    let date;
    
    // Check if it's a Unix timestamp (numeric string)
    if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
      // Convert Unix timestamp (milliseconds) to Date object
      date = new Date(parseInt(dateString));
    } else {
      // Try parsing as regular date string
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity style={styles.runItem} onPress={() => onPress(run)}>
      <View style={styles.runHeader}>
        <Text style={styles.runDate}>{formatDate(run.date)}</Text>
        <Text style={styles.runType}>{run.type}</Text>
      </View>
          <View style={styles.runDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Distance</Text>
          <Text style={styles.detailValue}>{(run.distance / 1000).toFixed(2)} km</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{Math.floor(run.duration / 60)} min</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pace</Text>
          <Text style={styles.detailValue}>{run.averagePace?.toFixed(2) || 'N/A'} min/km</Text>
        </View>
      </View>
      <View style={styles.runDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Speed</Text>
          <Text style={styles.detailValue}>{run.averageSpeed?.toFixed(1) || 'N/A'} km/h</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Calories</Text>
          <Text style={styles.detailValue}>{run.calories?.toFixed(0) || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Route</Text>
          <Text style={styles.detailValue}>{run.route}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Helper function to group runs by week
const groupRunsByWeek = (runs) => {
  const weeklyData = {};
  
  runs.forEach(run => {
    let date;
    if (typeof run.date === 'string' && /^\d+$/.test(run.date)) {
      date = new Date(parseInt(run.date));
    } else {
      date = new Date(run.date);
    }
    
    if (isNaN(date.getTime())) return;
    
    // Get the start of the week (Monday)
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekKey = startOfWeek.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekStart: weekKey,
        totalDistance: 0,
        totalDuration: 0,
        averagePace: 0,
        runCount: 0,
        paces: []
      };
    }
    
    weeklyData[weekKey].totalDistance += run.distance;
    weeklyData[weekKey].totalDuration += run.duration;
    weeklyData[weekKey].runCount += 1;
    if (run.averagePace) {
      weeklyData[weekKey].paces.push(run.averagePace);
    }
  });
  
  // Calculate average pace for each week
  Object.values(weeklyData).forEach(week => {
    if (week.paces.length > 0) {
      week.averagePace = week.paces.reduce((a, b) => a + b, 0) / week.paces.length;
    }
  });
  
  return Object.values(weeklyData).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
};

// Helper function to group runs by day
const groupRunsByDay = (runs) => {
  const dailyData = {};
  
  runs.forEach(run => {
    let date;
    if (typeof run.date === 'string' && /^\d+$/.test(run.date)) {
      date = new Date(parseInt(run.date));
    } else {
      date = new Date(run.date);
    }
    
    if (isNaN(date.getTime())) return;
    
    const dayKey = date.toISOString().split('T')[0];
    
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        totalDistance: 0,
        totalDuration: 0,
        averagePace: 0,
        runCount: 0,
        paces: []
      };
    }
    
    dailyData[dayKey].totalDistance += run.distance;
    dailyData[dayKey].totalDuration += run.duration;
    dailyData[dayKey].runCount += 1;
    if (run.averagePace) {
      dailyData[dayKey].paces.push(run.averagePace);
    }
  });
  
  // Calculate average pace for each day
  Object.values(dailyData).forEach(day => {
    if (day.paces.length > 0) {
      day.averagePace = day.paces.reduce((a, b) => a + b, 0) / day.paces.length;
    }
  });
  
  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Chart components
const WeeklyDistanceChart = ({ weeklyData }) => {
  if (!weeklyData || weeklyData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Distance Progress</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: weeklyData.slice(-7).map(week => {
      const date = new Date(week.weekStart);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      data: weeklyData.slice(-7).map(week => Number((week.totalDistance / 1000).toFixed(2)))
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Weekly Distance Progress (km)</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={barChartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        fromZero={true}
      />
    </View>
  );
};

const DailyDistanceChart = ({ dailyData }) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Distance Progress</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: dailyData.slice(-7).map(day => {
      const date = new Date(day.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      data: dailyData.slice(-7).map(day => Number((day.totalDistance / 1000).toFixed(2)))
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Daily Distance Progress (km)</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={barChartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        fromZero={true}
      />
    </View>
  );
};

const PaceProgressChart = ({ runs }) => {
  if (!runs || runs.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Pace Progress</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const runsWithPace = runs.filter(run => run.averagePace && run.averagePace > 0);
  
  if (runsWithPace.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Pace Progress</Text>
        <Text style={styles.noDataText}>No pace data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: runsWithPace.slice(-10).map((_, index) => `Run ${index + 1}`),
    datasets: [{
      data: runsWithPace.slice(-10).map(run => Number(run.averagePace.toFixed(2)))
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Pace Progress (min/km)</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        bezier={true}
      />
    </View>
  );
};

const ProgressSummary = ({ runs, weeklyData, dailyData }) => {
  if (!runs || runs.length === 0) return null;

  const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
  const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);
  const runsWithPace = runs.filter(run => run.averagePace && run.averagePace > 0);
  const averagePace = runsWithPace.length > 0 
    ? runsWithPace.reduce((sum, run) => sum + run.averagePace, 0) / runsWithPace.length 
    : 0;

  const thisWeekDistance = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].totalDistance : 0;
  const thisWeekRuns = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].runCount : 0;

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Progress Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{(totalDistance / 1000).toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Total km</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</Text>
          <Text style={styles.summaryLabel}>Total time</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{runs.length}</Text>
          <Text style={styles.summaryLabel}>Total runs</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{averagePace.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Avg pace</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{(thisWeekDistance / 1000).toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>This week</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{thisWeekRuns}</Text>
          <Text style={styles.summaryLabel}>This week runs</Text>
        </View>
      </View>
    </View>
  );
};

export default function RunHistory({ navigation, userId, profileId }) {
    const [runs, setRuns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userTracks, setUserTracks] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
    const [activeTab, setActiveTab] = useState('charts'); // 'charts' or 'list'

    const handleRunPress = (run) => {
        console.log('handleRunPress called with run:', run);
        console.log('userTracks:', userTracks);
        console.log('Looking for trackId:', run.trackId);
        
        const track = userTracks.find(t => t.trackId === run.trackId);
        console.log('Found track:', track);
        
        navigation.navigate('RunSummary', { run, track });
    };

    const handleSortToggle = () => {
        setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
    };

    const getSortedRuns = () => {
        if (!runs || runs.length === 0) return [];
        
        return [...runs].sort((a, b) => {
            let dateA, dateB;
            
            // Handle Unix timestamps for date A
            if (typeof a.date === 'string' && /^\d+$/.test(a.date)) {
                dateA = new Date(parseInt(a.date));
            } else {
                dateA = new Date(a.date);
            }
            
            // Handle Unix timestamps for date B
            if (typeof b.date === 'string' && /^\d+$/.test(b.date)) {
                dateB = new Date(parseInt(b.date));
            } else {
                dateB = new Date(b.date);
            }
            
            // Handle invalid dates by treating them as very old dates
            const isValidDateA = !isNaN(dateA.getTime());
            const isValidDateB = !isNaN(dateB.getTime());
            
            // If both dates are invalid, maintain original order
            if (!isValidDateA && !isValidDateB) return 0;
            
            // If only one date is invalid, put invalid dates at the end
            if (!isValidDateA) return 1;
            if (!isValidDateB) return -1;
            
            if (sortOrder === 'newest') {
                return dateB - dateA; // Newest first
            } else {
                return dateA - dateB; // Oldest first
            }
        });
    };

    useEffect(() => {
        const getUserRuns = async () => {
          try {
            console.log("Fetching runs for user:", profileId);
            const data = await fetchWithAuth(
              `https://runfuncionapp.azurewebsites.net/api/getUsersActivities?userId=${encodeURIComponent(profileId)}`
            );
            

            
            setRuns(data);
          } catch (error) {
            console.error('Error fetching runs:', error);
            Alert.alert(
              'Error',
              'Failed to load your run history. Please try again later.'
            );
          } finally {
            setIsLoading(false);
          }
        };
    
        getUserRuns();
    }, [profileId]);
    
    useEffect(() => {
        const getUserTracks = async () => {
          try {
            const data = await fetchWithAuth(
              `https://runfuncionapp.azurewebsites.net/api/getUsersTracks?userId=${encodeURIComponent(profileId)}`
            );
            
            console.log('getUsersTracks raw data:', data);
            console.log('Number of tracks received:', data.length);
            
            // Log each track to see the structure
            data.forEach((track, index) => {
              console.log(`Track ${index}:`, track);
            });
            
            const tracks = data.map(track => ({
              ...track,
              path: typeof track.path === 'string' ? JSON.parse(track.path) : track.path,
            }));
            
            setUserTracks(tracks);
          } catch (error) {
            console.error('Error fetching tracks:', error);
          }
        };
        getUserTracks();
    }, [profileId]);
    
    if (isLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        );
    }

    const sortedRuns = getSortedRuns();
    const weeklyData = groupRunsByWeek(sortedRuns);
    const dailyData = groupRunsByDay(sortedRuns);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Run History</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'charts' && styles.activeTabButton]} 
                        onPress={() => setActiveTab('charts')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'charts' && styles.activeTabButtonText]}>
                            Charts
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'list' && styles.activeTabButton]} 
                        onPress={() => setActiveTab('list')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'list' && styles.activeTabButtonText]}>
                            List
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'charts' ? (
                <ScrollView style={styles.chartsContainer} showsVerticalScrollIndicator={false}>
                    <ProgressSummary 
                        runs={sortedRuns} 
                        weeklyData={weeklyData} 
                        dailyData={dailyData} 
                    />
                    
                    <WeeklyDistanceChart weeklyData={weeklyData} />
                    
                    <DailyDistanceChart dailyData={dailyData} />
                    
                    <PaceProgressChart runs={sortedRuns} />
                    
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Recent Runs</Text>
                        {sortedRuns.slice(0, 3).map((run, index) => (
                            <RunItem key={run.id} run={run} onPress={handleRunPress} />
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <TouchableOpacity style={styles.sortButton} onPress={handleSortToggle}>
                            <Text style={styles.sortButtonText}>
                                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={sortedRuns}
                        renderItem={({ item }) => <RunItem run={item} onPress={handleRunPress} />}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.flatListContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No runs recorded yet</Text>
                            {userId === profileId && <Text style={styles.emptySubtext}>Start running to see your history here!</Text>}
                        </View>
                        }
                    />
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    headerButtons: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 2,
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    activeTabButton: {
        backgroundColor: '#007AFF',
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    activeTabButtonText: {
        color: 'white',
    },
    chartsContainer: {
        flex: 1,
        padding: 16,
    },
    listContainer: {
        flex: 1,
    },
    listHeader: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    sortButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'flex-end',
    },
    sortButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    flatListContainer: {
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
    // Chart styles
    chartContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    noDataText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
        padding: 20,
    },
    // Summary styles
    summaryContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    summaryItem: {
        width: '48%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#007AFF',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
});