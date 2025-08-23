import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { fetchWithAuth } from './utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FloatingCoach = ({ userId, profileId, navigation, style }) => {
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const bubbleOpacity = new Animated.Value(0);
  const bubbleScale = new Animated.Value(0.8);

  useEffect(() => {
    loadRecommendation();
  }, [profileId]);

  const loadRecommendation = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user activities
      const activities = await fetchWithAuth(
        `https://runfuncionapp.azurewebsites.net/api/getUsersActivities?userId=${encodeURIComponent(profileId)}`
      );

      // Get analysis for recommendation
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

             if (analysisResponse?.analysis?.recommendations?.length > 0) {
         // Get a random recommendation
         const randomIndex = Math.floor(Math.random() * analysisResponse.analysis.recommendations.length);
         const selectedRecommendation = analysisResponse.analysis.recommendations[randomIndex];
         console.log('Setting recommendation:', selectedRecommendation);
         setRecommendation(selectedRecommendation);
         setIsVisible(true);
         animateBubble();
       } else {
         console.log('No recommendations found, using default');
         setRecommendation('Ready for your next run? Tap to see your personalized training plan!');
         setIsVisible(true);
         animateBubble();
       }

         } catch (error) {
       console.error('Error loading coach recommendation:', error);
       // Set a default recommendation if API fails
       setRecommendation('Ready for your next run? Tap to see your personalized training plan!');
       setIsVisible(true);
       animateBubble();
     } finally {
       setIsLoading(false);
       // Ensure bubble is visible even if loading fails
       if (!isVisible) {
         setIsVisible(true);
         animateBubble();
       }
     }
  };

  const animateBubble = () => {
    Animated.parallel([
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(bubbleScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    navigation.navigate('CoachingDashboard', { userId, profileId });
  };

  if (!isVisible || isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Recommendation Bubble */}
      <Animated.View 
        style={[
          styles.bubble,
          {
            opacity: bubbleOpacity,
            transform: [{ scale: bubbleScale }],
          }
        ]}
      >
        <Text style={styles.bubbleText} numberOfLines={3}>
          {recommendation}
        </Text>
        <View style={styles.bubbleArrow} />
      </Animated.View>

      {/* Coach Icon */}
                    <TouchableOpacity style={styles.coachButton} onPress={handlePress}>
                <View style={styles.coachIcon}>
                  <Text style={styles.coachEmoji}>📣</Text>
                </View>
              </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  bubble: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    maxWidth: screenWidth * 0.6,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bubbleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#007AFF',
  },
  coachButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coachIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachEmoji: {
    fontSize: 24,
  },
});

export default FloatingCoach;
