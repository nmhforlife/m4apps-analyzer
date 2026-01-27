import axios from 'axios';

// Dynamically determine the API base URL based on the current host
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production or when served from a different host, use the same host with port 5000
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000/api`;
  }
  
  // Fallback for server-side rendering or development
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const message = error.response.data?.error || error.response.data?.message || 'Server error';
      throw new Error(message);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(error.message || 'Request failed');
    }
  }
);

// API functions
export const uploadCatalogFile = async (file) => {
  const formData = new FormData();
  formData.append('catalogFile', file);
  
  const response = await api.post('/catalog/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const compareCatalogs = async (catalogs) => {
  const response = await api.post('/catalog/compare', {
    catalogs,
  });
  
  return response.data;
};

export const getRecommendations = async (catalogData) => {
  const response = await api.post('/catalog/recommendations', {
    catalogData,
  });
  
  return response.data;
};

export const getVersionMatrix = async () => {
  const response = await api.get('/version-matrix');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const refreshCatalogAnalysis = async (catalogId) => {
  const response = await api.post('/catalog/refresh-analysis', {
    catalogId,
  });
  return response.data;
};

export const getCatalogById = async (catalogId) => {
  const response = await api.get(`/catalog/${catalogId}`);
  return response.data;
};

export default api;