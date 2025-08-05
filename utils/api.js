import AsyncStorage from '@react-native-async-storage/async-storage';

const API_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const API_URL = 'https://runfuncionapp.azurewebsites.net/api';

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
  return fetchWithAuth(`${API_URL}/setEventReady`, {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });
};

export const markUserReady = async (eventId, userId) => {
  return fetchWithAuth(`${API_URL}/markUserReady`, {
    method: 'POST',
    body: JSON.stringify({ eventId, userId }),
  });
};

export const getEventReadyUsers = async (eventId) => {
  return fetchWithAuth(
    `${API_URL}/getEventReadyUsers?eventId=${encodeURIComponent(eventId)}`
  );
};

export const startEvent = async (eventId, userId) => {
  return fetchWithAuth(`${API_URL}/startEvent`, {
    method: 'POST',
    body: JSON.stringify({ eventId, userId }),
  });
};

export const updateRunnerPosition = async (eventId, userId, latitude, longitude, speed, heading, distance, elapsedTime) => {
  return fetchWithAuth(`${API_URL}/updateRunnerPosition`, {
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
  return fetchWithAuth(`${API_URL}/getEventRunnersPositions?eventId=${encodeURIComponent(eventId)}`);
};

export const endEventRun = async (eventId, userId, totalDistance, totalDuration, totalCalories, averagePace, averageSpeed, path) => {
  return fetchWithAuth(`${API_URL}/endEventRun`, {
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
  return fetchWithAuth(`${API_URL}/leaveEvent`, {
    method: 'POST',
    body: JSON.stringify({ 
      eventId, 
      leavingUserId, 
      requestingUserId 
    }),
  });
}; 

export const sendFriendRequest = async (addressee_id) => {
  return fetchWithAuth(`${API_URL}/friend-requests`, {
    method: 'POST',
    body: JSON.stringify({ addressee_id }),
  });
};

export const getFriends = async () => {
  return fetchWithAuth(`${API_URL}/friends`);
};

export const getFriendRequests = async () => {
  return fetchWithAuth(`${API_URL}/friend-requests`);
};

export const respondToFriendRequest = async (request_id, status) => {
  return fetchWithAuth(`${API_URL}/friend-requests/${request_id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const removeFriend = async (friend_user_id) => {
  return fetchWithAuth(`${API_URL}/friends/${friend_user_id}`, {
    method: 'DELETE',
  });
};

export const searchUsers = async (search_query) => {
  return fetchWithAuth(`${API_URL}/users?search=${encodeURIComponent(search_query)}`);
}; 

export const getUser = async (userId) => {
  return fetchWithAuth(`${API_URL}/getUser?userId=${encodeURIComponent(userId)}`);
}; 

export const getFriendshipStatus = async (targetId) => {
  return fetchWithAuth(`${API_URL}/friendship-status?userId=${encodeURIComponent(targetId)}`);
};