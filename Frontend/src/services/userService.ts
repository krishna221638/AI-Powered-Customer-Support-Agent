import api from './api';
import { User as AuthUser } from './authService'; // Use User type from authService to avoid naming conflicts if needed, or define a shared one

// Re-export User type from authService or define a more specific one if fields differ for general user queries
export type User = AuthUser;

export interface UsersResponse {
  total: number;
  users: User[];
  limit: number;
  offset: number;
}

export interface UserFilters {
  departmentId?: string; // Mapped to department_id in backend query
  companyId?: string;     // Changed from branchId, Mapped to company_id
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
} 

export const getUsers = async (filters: UserFilters): Promise<User[]> => {
  const params = {
    company_id: filters.companyId, // Changed from branch_id and filters.branchId
    department_id: filters.departmentId,
    role: filters.role,
    search: filters.search,
    limit: filters.limit,
    offset: filters.offset,
  };
  // Remove undefined keys so they are not sent as query parameters
  Object.keys(params).forEach(key => {
    const k = key as keyof typeof params;
    if (params[k] === undefined) {
      delete params[k];
    }
  });

  const response = await api.get<UsersResponse>('/users', { params });
  return response.data.users;
};

/**
 * Specifically fetches users for a given department.
 * This is a convenience function wrapper around getUsers.
 */
export const getUsersInDepartment = async (
    filters: { departmentId: string; limit?: number; offset?: number }
): Promise<User[]> => {
  const response = await getUsers({ 
    departmentId: filters.departmentId, 
    limit: filters.limit, 
    offset: filters.offset 
  });
  return response;
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User> => {
  const response = await api.get<User>(`/users/${userId}`);
  return response.data;
};

// Update user payload - mirrors backend PUT /users/{user_id} input
export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: "superAdmin" | "admin" | "employee"; // Employee role might also be relevant here from backend model
  company_id?: string | null; // Changed from branch_id
  department_id?: string | null;
  password?: string;
}

// Update a user
export const updateUser = async (userId: string, payload: UpdateUserPayload): Promise<User> => {
  const response = await api.put<User>(`/users/${userId}`, payload);
  return response.data;
};

export const changeUserPassword = async (payload: ChangePasswordRequest): Promise<User> => {
  const response = await api.post<User>(`/users/change-password`, payload);
  return response.data;
};

// Add other user-related service functions here if needed (e.g., getUserById, updateUser, deleteUser)

// Implemented deleteUser as requested.
export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}`);
}; 