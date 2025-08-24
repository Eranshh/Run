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

      // Get AI-powered recommendations for analysis
      const aiRecommendationsResponse = await fetchWithAuth(
        'https://runfuncionapp.azurewebsites.net/api/ai-coaching',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profileId,
            type: 'recommendation',
            activities: activities,
            userProfile: {
              fitnessLevel: analysisResponse?.analysis?.fitnessLevel || 'beginner',
              preferences: {
                maxWeeklyRuns: 4
              }
            }
          })
        }
      );

      // Combine the analysis with AI recommendations
      const enhancedAnalysis = {
        ...analysisResponse,
        aiRecommendations: aiRecommendationsResponse?.coaching || null
      };

      setAnalysis(enhancedAnalysis);

      // Get AI-powered training plan
      try {
        const planResponse = await fetchWithAuth(
          'https://runfuncionapp.azurewebsites.net/api/ai-coaching',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: profileId,
              type: 'training_plan',
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

        console.log('Training plan response received:', planResponse);
        setTrainingPlan(planResponse?.plan || planResponse);
      } catch (planError) {
        console.error('Error fetching training plan:', planError);
        // Set a fallback training plan
        setTrainingPlan({
          plan_overview: "We're having trouble generating your personalized plan right now. Here's a basic training plan to get you started.",
          weekly_plans: [
            {
              week: 1,
              focus: "Getting Started",
              runs: [
                {
                  day: "Monday",
                  type: "Easy Run",
                  distance: "2km",
                  pace: "comfortable",
                  notes: "Start slow and focus on form"
                },
                {
                  day: "Wednesday",
                  type: "Easy Run", 
                  distance: "2km",
                  pace: "comfortable",
                  notes: "Same as Monday"
                },
                {
                  day: "Saturday",
                  type: "Easy Run",
                  distance: "3km", 
                  pace: "comfortable",
                  notes: "Longer run, take breaks if needed"
                }
              ],
              rest_days: ["Tuesday", "Thursday", "Friday", "Sunday"],
              cross_training: "Light walking on rest days"
            }
          ],
          progression_notes: "Gradually increase distance by 0.5km each week",
          safety_tips: ["Listen to your body", "Stay hydrated", "Don't increase distance too quickly"]
        });
      }

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
          <AnalysisView analysis={analysis.analysis} aiRecommendations={analysis.aiRecommendations} />
        )}
        
        {activeTab === 'plan' && trainingPlan && (
          <TrainingPlanView plan={trainingPlan} />
        )}
      </ScrollView>
    </View>
  );
};

const AnalysisView = ({ analysis, aiRecommendations }) => {
  return (
  <View style={styles.analysisContainer}>
    {/* Fitness Level Card */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Fitness Level</Text>
      <View style={styles.fitnessLevelContainer}>
        <View style={[styles.levelBadge, { backgroundColor: getFitnessLevelColor(analysis?.fitnessLevel || 'beginner') }]}>
          <Text style={styles.levelText}>{(analysis?.fitnessLevel || 'beginner').toUpperCase()}</Text>
        </View>
        <Text style={styles.levelDescription}>
          {(analysis?.fitnessLevel || 'beginner') === 'beginner' && 'Great start! Focus on building consistency and endurance.'}
          {(analysis?.fitnessLevel || 'beginner') === 'intermediate' && 'You\'re making good progress! Ready for more structured training.'}
          {(analysis?.fitnessLevel || 'beginner') === 'advanced' && 'Excellent! You\'re ready for advanced training techniques.'}
        </Text>
      </View>
    </View>

    {/* Metrics Card */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Stats</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {analysis?.metrics?.totalDistance ? (analysis.metrics.totalDistance / 1000).toFixed(1) : '0.0'}
          </Text>
          <Text style={styles.metricLabel}>Total km</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis?.metrics?.totalRuns || 0}</Text>
          <Text style={styles.metricLabel}>Total runs</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis?.metrics?.averagePace || 'N/A'}</Text>
          <Text style={styles.metricLabel}>Avg pace</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analysis?.metrics?.weeklyAverage || 0}</Text>
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
          <View style={[styles.indicatorBadge, { backgroundColor: getConsistencyColor(analysis?.consistency || 'low') }]}>
            <Text style={styles.indicatorText}>{analysis?.consistency || 'low'}</Text>
          </View>
        </View>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Progress</Text>
          <View style={[styles.indicatorBadge, { backgroundColor: getProgressColor(analysis?.progress || 'stable') }]}>
            <Text style={styles.indicatorText}>{analysis?.progress || 'stable'}</Text>
          </View>
        </View>
      </View>
    </View>

    {/* AI Recommendations */}
    {aiRecommendations ? (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🤖 AI Coach's Analysis</Text>
        
        {/* Motivational Message */}
        <View style={styles.motivationalContainer}>
          <Text style={styles.motivationalText}>{aiRecommendations?.motivational_message || 'Keep up the great work!'}</Text>
        </View>

        {/* Weekly Focus */}
        <View style={styles.focusContainer}>
          <Text style={styles.focusTitle}>This Week's Focus:</Text>
          <Text style={styles.focusText}>{aiRecommendations?.weekly_focus || 'Building consistency and endurance'}</Text>
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Personalized Recommendations:</Text>
          {(aiRecommendations?.recommendations || []).map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationText}>• {recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Next Run Tip */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Next Run Tip:</Text>
          <Text style={styles.tipText}>{aiRecommendations?.next_run_tip || 'Start with a comfortable pace and gradually build up your distance'}</Text>
        </View>
      </View>
    ) : (
      /* Fallback to original recommendations if AI is not available */
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach's Recommendations</Text>
        {(analysis?.recommendations || []).map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>• {recommendation}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
  );
};

const TrainingPlanView = ({ plan }) => {
  // Handle case where plan data might be missing or malformed
  if (!plan) {
    return (
      <View style={styles.planContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Training Plan</Text>
          <Text style={styles.planOverview}>Loading your personalized training plan...</Text>
        </View>
      </View>
    );
  }

  return (
  <View style={styles.planContainer}>
    {/* Plan Overview */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your AI-Generated Training Plan</Text>
      <Text style={styles.planOverview}>{plan.plan_overview || 'Personalized training plan based on your fitness level and goals.'}</Text>
    </View>

    {/* Weekly Plans */}
    {plan.weekly_plans && Array.isArray(plan.weekly_plans) && plan.weekly_plans.length > 0 ? (
      plan.weekly_plans.map((weekPlan, weekIndex) => (
      <View key={weekIndex} style={styles.card}>
        <Text style={styles.cardTitle}>Week {weekPlan.week}: {weekPlan.focus}</Text>
        
        {/* Runs for this week */}
        {weekPlan.runs && Array.isArray(weekPlan.runs) && weekPlan.runs.map((run, runIndex) => (
          <View key={runIndex} style={styles.runPlanItem}>
            <View style={styles.runPlanHeader}>
              <Text style={styles.runDay}>{run.day}</Text>
              <Text style={styles.runType}>{run.type}</Text>
            </View>
            <View style={styles.runPlanDetails}>
              <Text style={styles.runDistance}>{run.distance}</Text>
              <Text style={styles.runPace}>{run.pace}</Text>
            </View>
            <Text style={styles.runNotes}>{run.notes}</Text>
          </View>
        ))}
        
        {/* Rest days */}
        {weekPlan.rest_days && (
          <View style={styles.restDaysContainer}>
            <Text style={styles.restDaysTitle}>Rest Days:</Text>
            <Text style={styles.restDaysText}>{weekPlan.rest_days.join(', ')}</Text>
          </View>
        )}
        
        {/* Cross training */}
        {weekPlan.cross_training && (
          <View style={styles.crossTrainingContainer}>
            <Text style={styles.crossTrainingTitle}>Cross Training:</Text>
            <Text style={styles.crossTrainingText}>{weekPlan.cross_training}</Text>
          </View>
        )}
      </View>
    ))
    ) : (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Training Plan</Text>
        <Text style={styles.planOverview}>Your personalized weekly training plan will be generated based on your fitness level and goals.</Text>
      </View>
    )}

    {/* Progression Notes */}
    {plan.progression_notes && (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plan Progression</Text>
        <Text style={styles.progressionText}>{plan.progression_notes}</Text>
      </View>
    )}

    {/* Safety Tips */}
    {plan.safety_tips && Array.isArray(plan.safety_tips) && (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Safety Tips</Text>
        {plan.safety_tips.map((tip, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>• {tip}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
  );
};

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
  planOverview: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  restDaysContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  restDaysTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  restDaysText: {
    fontSize: 14,
    color: '#666',
  },
  crossTrainingContainer: {
    marginTop: 8,
  },
  crossTrainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  crossTrainingText: {
    fontSize: 14,
    color: '#666',
  },
  progressionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // AI Recommendations Styles
  motivationalContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  motivationalText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  focusContainer: {
    marginBottom: 16,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  focusText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default CoachingDashboard;
