import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { fetchWithAuth } from './utils/api';

const { width: screenWidth } = Dimensions.get('window');

// Helper functions for colors
const getFitnessLevelColor = (level) => {
  switch (level) {
    case 'beginner': return '#FF6B6B';
    case 'intermediate': return '#4ECDC4';
    case 'advanced': return '#45B7D1';
    default: return '#95A5A6';
  }
};

const getConsistencyColor = (level) => {
  switch (level) {
    case 'high': return '#27AE60';
    case 'medium': return '#F39C12';
    case 'low': return '#E74C3C';
    default: return '#95A5A6';
  }
};

const getProgressColor = (trend) => {
  switch (trend) {
    case 'improving': return '#27AE60';
    case 'stable': return '#F39C12';
    case 'declining': return '#E74C3C';
    default: return '#95A5A6';
  }
};

const CoachingDashboard = ({ userId, profileId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'plan'

  useEffect(() => {
    loadCoachingData();
  }, [profileId]);

  const loadCoachingData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user activities for analysis
      const activities = await fetchWithAuth(
        `https://runfuncionapp.azurewebsites.net/api/getUsersActivities?userId=${encodeURIComponent(profileId)}`
      );

             // Get user analysis
       const analysisResponse = await fetchWithAuth(
         'https://runfuncionapp.azurewebsites.net/api/analyze-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profileId,
            activities: activities
          })
        }
      );

      setAnalysis(analysisResponse);

      // Get training plan
      const planResponse = await fetchWithAuth(
        'https://runfuncionapp.azurewebsites.net/api/generate-plan',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profileId,
            activities: activities,
            userProfile: {
              fitnessLevel: analysisResponse?.analysis?.fitnessLevel || 'beginner',
              preferences: {
                maxWeeklyRuns: 4
              }
            },
            goals: {
              targetDistance: 5000 // 5k default
            }
          })
        }
      );

      setTrainingPlan(planResponse);

    } catch (error) {
      console.error('Error loading coaching data:', error);
      Alert.alert('Error', 'Failed to load coaching data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing your data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Coach</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'analysis' && styles.activeTab]} 
            onPress={() => setActiveTab('analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
              Analysis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'plan' && styles.activeTab]} 
            onPress={() => setActiveTab('plan')}
          >
            <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
              Training Plan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'analysis' && analysis && (
          <AnalysisView analysis={analysis.analysis} />
        )}
        
        {activeTab === 'plan' && trainingPlan && (
          <TrainingPlanView plan={trainingPlan} />
        )}
      </ScrollView>
    </View>
  );
};

const AnalysisView = ({ analysis }) => (
  <View style={styles.analysisContainer}>
    {/* Fitness Level Card */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Fitness Level</Text>
      <View style={styles.fitnessLevelContainer}>
        <View style={[styles.levelBadge, { backgroundColor: getFitnessLevelColor(analysis.fitnessLevel) }]}>
          <Text style={styles.levelText}>{analysis.fitnessLevel.toUpperCase()}</Text>
        </View>
        <Text style={styles.levelDescription}>
          {analysis.fitnessLevel === 'beginner' && 'Great start! Focus on building consistency and endurance.'}
          {analysis.fitnessLevel === 'intermediate' && 'You\'re making good progress! Ready for more structured training.'}
          {analysis.fitnessLevel === 'advanced' && 'Excellent! You\'re ready for advanced training techniques.'}
        </Text>
      </View>
    </View>

    {/* Metrics Card */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Stats</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{(analysis.metrics.totalDistance / 1000).toFixed(1)}</Text>
          <Text style={styles.metricLabel}>Total km</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis.metrics.totalRuns}</Text>
          <Text style={styles.metricLabel}>Total runs</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis.metrics.averagePace || 'N/A'}</Text>
          <Text style={styles.metricLabel}>Avg pace</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis.metrics.weeklyAverage}</Text>
          <Text style={styles.metricLabel}>Runs/week</Text>
        </View>
      </View>
    </View>

    {/* Progress Indicators */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Progress Indicators</Text>
      <View style={styles.indicatorContainer}>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Consistency</Text>
          <View style={[styles.indicatorBadge, { backgroundColor: getConsistencyColor(analysis.consistency) }]}>
            <Text style={styles.indicatorText}>{analysis.consistency}</Text>
          </View>
        </View>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Progress</Text>
          <View style={[styles.indicatorBadge, { backgroundColor: getProgressColor(analysis.progress) }]}>
            <Text style={styles.indicatorText}>{analysis.progress}</Text>
          </View>
        </View>
      </View>
    </View>

    {/* Recommendations */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Coach's Recommendations</Text>
      {analysis.recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>• {recommendation}</Text>
        </View>
      ))}
    </View>
  </View>
);

const TrainingPlanView = ({ plan }) => (
  <View style={styles.planContainer}>
    {/* Current Capabilities */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Current Capabilities</Text>
      <View style={styles.capabilitiesGrid}>
        <View style={styles.capabilityItem}>
          <Text style={styles.capabilityValue}>{(plan.currentCapabilities.maxDistance / 1000).toFixed(1)} km</Text>
          <Text style={styles.capabilityLabel}>Max Distance</Text>
        </View>
        <View style={styles.capabilityItem}>
          <Text style={styles.capabilityValue}>{plan.currentCapabilities.comfortablePace}</Text>
          <Text style={styles.capabilityLabel}>Comfortable Pace</Text>
        </View>
        <View style={styles.capabilityItem}>
          <Text style={styles.capabilityValue}>{(plan.currentCapabilities.weeklyVolume / 1000).toFixed(1)} km</Text>
          <Text style={styles.capabilityLabel}>Weekly Volume</Text>
        </View>
        <View style={styles.capabilityItem}>
          <Text style={styles.capabilityValue}>{plan.currentCapabilities.recoveryTime} days</Text>
          <Text style={styles.capabilityLabel}>Recovery Time</Text>
        </View>
      </View>
    </View>

    {/* Weekly Plan */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>This Week's Plan</Text>
      <Text style={styles.planSummary}>
        {plan.weeklyPlan.numberOfRuns} runs • {(plan.weeklyPlan.metrics.totalDistance / 1000).toFixed(1)} km • {Math.round(plan.weeklyPlan.metrics.totalTime)} min
      </Text>
      {plan.weeklyPlan.runs.map((run, index) => (
        <View key={index} style={styles.runPlanItem}>
          <View style={styles.runPlanHeader}>
            <Text style={styles.runDay}>{run.day}</Text>
            <Text style={styles.runType}>{run.type.replace('_', ' ')}</Text>
          </View>
          <View style={styles.runPlanDetails}>
            <Text style={styles.runDistance}>{(run.targetDistance / 1000).toFixed(1)} km</Text>
            <Text style={styles.runPace}>{run.targetPace} min/km</Text>
          </View>
          <Text style={styles.runNotes}>{run.notes}</Text>
        </View>
      ))}
    </View>

    {/* Plan Recommendations */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Plan Tips</Text>
      {plan.recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>• {recommendation}</Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  analysisContainer: {
    flex: 1,
  },
  planContainer: {
    flex: 1,
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fitnessLevelContainer: {
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  levelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  indicator: {
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  indicatorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  indicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  capabilityItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  capabilityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 4,
  },
  capabilityLabel: {
    fontSize: 12,
    color: '#666',
  },
  planSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  runPlanItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  runPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  runDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  runType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  runPlanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  runDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  runPace: {
    fontSize: 14,
    color: '#666',
  },
  runNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default CoachingDashboard;
