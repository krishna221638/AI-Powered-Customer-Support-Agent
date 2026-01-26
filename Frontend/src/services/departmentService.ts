import api from './api';

// Types
export interface Department {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentsResponse {
  total: number;
  departments: Department[];
  limit: number;
  offset: number;
}

export interface DepartmentFilters {
  company_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Get departments with filters
export const getDepartments = async (filters: DepartmentFilters): Promise<Department[]> => {
  const response = await api.get<DepartmentsResponse>('/departments', { params: filters });
  return response.data.departments;
};

// Create a new department
export const createDepartment = async (data: { name: string; company_id: string }): Promise<Department> => {
  const response = await api.post<Department>('/departments', data);
  return response.data;
};

// Update an existing department
export const updateDepartment = async (id: string, data: { name: string; company_id: string }): Promise<Department> => {
  // Backend PUT /departments/{department_id} expects DepartmentUpdate (name: Optional[str])
  // The company_id in the payload for update might not be used by the backend if it only updates name,
  // but including it for consistency if the backend schema DepartmentUpdate is extended.
  // If backend strictly only takes name, then data should be: { name: string }
  const response = await api.put<Department>(`/departments/${id}`, data );
  return response.data;
};

// Delete a department
export const deleteDepartment = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/departments/${id}`);
  return response.data;
};