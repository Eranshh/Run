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