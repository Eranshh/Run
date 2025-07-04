import AsyncStorage from '@react-native-async-storage/async-storage';

const API_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;

const fetchWithRetry = async (url, options = {}) => {
  let lastError;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') {
        console.log(`Request timeout, attempt ${i + 1} of ${MAX_RETRIES}`);
      } else {
        console.log(`Request failed, attempt ${i + 1} of ${MAX_RETRIES}:`, error);
      }
      if (i < MAX_RETRIES - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
};

export const fetchWithAuth = async (url, options = {}) => {
  const token = await AsyncStorage.getItem('userToken');
  console.log("this is token:", token);
  return fetchWithRetry(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// New API functions for event ready status
export const setEventReady = async (eventId) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/setEventReady', {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });
};

export const markUserReady = async (eventId, userId) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/markUserReady', {
    method: 'POST',
    body: JSON.stringify({ eventId, userId }),
  });
};

export const getEventReadyUsers = async (eventId) => {
  return fetchWithAuth(
    `https://runfuncionapp.azurewebsites.net/api/getEventReadyUsers?eventId=${encodeURIComponent(eventId)}`
  );
};

export const startEvent = async (eventId, userId) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/startEvent', {
    method: 'POST',
    body: JSON.stringify({ eventId, userId }),
  });
};

export const updateRunnerPosition = async (eventId, userId, latitude, longitude, speed, heading, distance, elapsedTime) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/updateRunnerPosition', {
    method: 'POST',
    body: JSON.stringify({ 
      eventId, 
      userId, 
      latitude, 
      longitude, 
      speed, 
      heading, 
      distance, 
      elapsedTime 
    }),
  });
};

export const getEventRunnersPositions = async (eventId) => {
  return fetchWithAuth(`https://runfuncionapp.azurewebsites.net/api/getEventRunnersPositions?eventId=${encodeURIComponent(eventId)}`);
};

export const endEventRun = async (eventId, userId, totalDistance, totalDuration, totalCalories, averagePace, averageSpeed, path) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/endEventRun', {
    method: 'POST',
    body: JSON.stringify({ 
      eventId, 
      userId, 
      totalDistance, 
      totalDuration, 
      totalCalories, 
      averagePace, 
      averageSpeed, 
      path 
    }),
  });
};

export const leaveEvent = async (eventId, leavingUserId, requestingUserId) => {
  return fetchWithAuth('https://runfuncionapp.azurewebsites.net/api/leaveEvent', {
    method: 'POST',
    body: JSON.stringify({ 
      eventId, 
      leavingUserId, 
      requestingUserId 
    }),
  });
}; 