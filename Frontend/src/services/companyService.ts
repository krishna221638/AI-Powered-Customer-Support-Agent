import api from './api';

// Types
export interface Company { // Renamed from Branch
  id: string;
  name:string;
  created_at: string;
  updated_at: string;
  max_tokens?: number; // Added based on backend companies.py CompanyBase
  api_key?: string;    // Added based on backend companies.py CompanyResponse
}

export interface CompaniesResponse { // Renamed from BranchesResponse
  total: number;
  companies: Company[]; // Renamed from branches
  limit: number;
  offset: number;
}

export interface CompanyFilters { // Renamed from BranchFilters
  search?: string;
  limit?: number;
  offset?: number;
}

// Get companies with filters
export const getCompanies = async (filters: CompanyFilters): Promise<CompaniesResponse> => { // Renamed
  const response = await api.get<CompaniesResponse>('/companies', { params: filters }); // Endpoint changed
  return response.data;
};

// Get company by ID
export const getCompanyById = async (id: string): Promise<Company> => { // Renamed
  const response = await api.get<Company>(`/companies/${id}`); // Endpoint changed
  return response.data;
};

// Create a new company
export const createCompany = async (data: { name: string, max_tokens?: number }): Promise<Company> => { // Renamed, updated payload
  const response = await api.post<Company>('/companies', data, { // Endpoint changed
    headers: {
      'Accept': 'application/json',
    }
  });
  return response.data;
};

// Update an existing company
export const updateCompany = async (id: string, data: { name?: string, max_tokens?: number }): Promise<Company> => { // name is now optional
  // Backend PUT /companies/{company_id} expects a JSON body based on companies.py CompanyUpdate
  const response = await api.put<Company>(`/companies/${id}`, data); // Endpoint changed, removed null, params
  return response.data;
};

// Delete a company
export const deleteCompany = async (id: string): Promise<{ message: string }> => { // Renamed
  const response = await api.delete<{ message: string }>(`/companies/${id}`); // Endpoint changed
  return response.data;
};

// Interface for the response from /api/company-settings/details
export interface CompanySettings {
  id: string;
  name: string;
  api_key: string;
  webhook_url?: string | null;
}

// Interface for the payload to update webhook URL
export interface UpdateCompanyWebhookPayload {
  webhook_url?: string | null; // Allow null to clear the webhook, or empty string
}

/**
 * Fetches the current authenticated user's company settings (details).
 * Corresponds to GET /api/company-settings/details
 */
export const getCompanySettings = async (): Promise<CompanySettings> => {
  const response = await api.get<CompanySettings>('/company-settings/details');
  return response.data;
};

/**
 * Updates the webhook URL for the current authenticated user's company.
 * Corresponds to PUT /api/company-settings/webhook
 */
export const updateCompanyWebhook = async (payload: UpdateCompanyWebhookPayload): Promise<CompanySettings> => {
  const response = await api.put<CompanySettings>('/company-settings/webhook', payload);
  return response.data;
};

/**
 * Fetches all companies.
 * For SuperAdmins, this should list all companies in the system.
 * We pass a high limit to try and fetch all companies in one go.
 * Adjust limit/offset handling if pagination is strictly needed for very large numbers of companies.
 */
export const getAllCompanies = async (): Promise<CompaniesResponse> => { // Renamed
  try {
    const response = await api.get<CompaniesResponse>('/companies', { // Endpoint changed
      params: {
        limit: 1000, 
        offset: 0,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch companies:', error); // Renamed
    throw error;
  }
}; 