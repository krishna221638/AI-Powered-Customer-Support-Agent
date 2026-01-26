import axios from 'axios';
import toast from 'react-hot-toast';

// Base API URL - would typically come from environment variables
const API_URL = 'http://127.0.0.1:8000'; // Replace with your API URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      // Handle different status codes
      switch (response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          toast.error('Your session has expired. Please login again.');
          break;
        case 403:
          // Forbidden
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          // Not found
          toast.error('The requested resource was not found.');
          break;
        case 422:
          // Validation error
          let validationMessage = 'Invalid input data.'; // Default message
          if (response.data && response.data.detail) {
            if (Array.isArray(response.data.detail)) {
              // FastAPI validation errors often come as an array of objects
              validationMessage = response.data.detail
                .map((err: any) => {
                  if (typeof err === 'string') return err;
                  if (err.msg && typeof err.msg === 'string') return err.msg;
                  return JSON.stringify(err); // Fallback to stringify the whole error object
                })
                .join('; ');
            } else if (typeof response.data.detail === 'string') {
              validationMessage = response.data.detail;
            } else if (response.data.detail.message && typeof response.data.detail.message === 'string') {
              // Sometimes the detail might be an object with a message property
              validationMessage = response.data.detail.message;
            } else if (typeof response.data.detail === 'object') {
                // Fallback for other object structures
                validationMessage = JSON.stringify(response.data.detail);
            }
          }
          // Ensure the final message is a string, even if it's just the default or stringified object
          console.log('[API Interceptor] Validation message before toast:', validationMessage, typeof validationMessage);
          const finalMessage = typeof validationMessage === 'string' ? validationMessage : JSON.stringify(validationMessage);
          toast.error(finalMessage || 'Unprocessable Content');
          break;
        case 500:
          // Server error
          toast.error('An error occurred on the server. Please try again later.');
          break;
        default:
          // Other errors
          const errorMessage = response.data?.message || 'An unexpected error occurred.';
          toast.error(errorMessage);
      }
    } else {
      // Network error
      toast.error('Unable to connect to the server. Please check your internet connection.');
    }
    
    return Promise.reject(error);
  }
);

export default api;