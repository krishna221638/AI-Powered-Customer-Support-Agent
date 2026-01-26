import api from './api';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../stores/authStore';

// Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "superAdmin" | "admin" | "employee";
  company_id: string | null;
  department_id: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterAdminPayload {
  username: string;
  email: string;
  password: string;
  company_name: string;
}

export interface RegisterUserPayload {
  username: string;
  email: string;
  password: string;
  company_id?: string; 
  department_id?: string;
  role?: string;
}

export interface RegisterEmployeePayload {
  username: string;
  email: string;
  password: string;
  department_id: string; 
  company_id: string;
  role?: string;
}

// Login function
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    // Login to get the token
    const loginResponse = await api.post<{ access_token: string; token_type: string; user: User }>('/auth/login', formData, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const { access_token, user } = loginResponse.data;
    
    // Store token
    localStorage.setItem('token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`; // Ensure api instance uses the new token immediately

    // Fetch user details using the token (api instance will have the token now)
    // const userResponse = await api.get<User>('/auth/me');
    // console.log("authService.ts (login): userResponse.data", userResponse.data);
    // Update authStore with user and authentication status
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setIsAuthenticated(true);
    
    return user; // Return the user data from /auth/me
  } catch (error) {
    // Clear token if login fails after setting it, or if /me fails
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    useAuthStore.getState().clearAuth(); // Also clear auth store on error
    throw error;
  }
};

// Logout function
export const logout = (): void => {
  localStorage.removeItem('token'); // More specific than clear()
  delete api.defaults.headers.common['Authorization'];
  useAuthStore.getState().clearAuth(); // Clear the store
  // Navigate using react-router if possible, or fallback to window.location
  // For simplicity, window.location is kept, but a router-based navigation is cleaner.
  window.location.href = '/login'; 
};

// Check if token is valid
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // @ts-ignore - exp may not exist in all JWTs
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Refresh user data from token
export const refreshToken = async (): Promise<User | null> => {
  if (!isTokenValid()) {
    useAuthStore.getState().clearAuth(); // Clear store if token invalid
    return null;
  }
  
  try {
    const response = await api.get<User>('/auth/me');
    // Update authStore if refresh is successful
    useAuthStore.getState().setUser(response.data);
    useAuthStore.getState().setIsAuthenticated(true);
    return response.data;
  } catch (error) {
    useAuthStore.getState().clearAuth(); // Clear store on error
    return null;
  }
};

// Register a new Admin user
export const registerAdmin = async (payload: RegisterAdminPayload): Promise<User> => {
  // Backend /auth/register-user expects username, email, password.
  // Role and company assignment might need to be handled by backend logic
  // specific to this endpoint, or require a subsequent update call.
  try {
    const response = await api.post<User>('/auth/register-user', payload, {
      headers: {
        'Accept': 'application/json',
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Register a new Employee user (by an Admin)
export const registerEmployee = async (payload: RegisterEmployeePayload): Promise<User> => {
  // Backend /auth/register-employee expects username, email, password, department_id.
  try {
    const response = await api.post<User>('/auth/register-employee', payload, {
      headers: {
        'Accept': 'application/json',
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};