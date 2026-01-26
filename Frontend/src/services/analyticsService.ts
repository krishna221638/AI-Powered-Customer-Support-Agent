import api from './api';

// General Filter Interface (can be expanded)
export interface AnalyticsFilters {
  companyId?: string;
  departmentId?: string;
  startDate?: string; // ISO string date
  endDate?: string;   // ISO string date
  userId?: string; // For agent performance
  interval?: 'day' | 'week' | 'month'; // For resolution trends
}

// --- KPI Types ---
export interface KpiTrend {
  direction: 'up' | 'down';
  value: number; // percentage
}

export interface KpisResponse {
  total_tickets: number;
  pending_tickets: number;
  ai_solved: number;
  manually_solved: number;
  critical_tickets: number;
  avg_resolution_time_hours: number | null;
  totalTrend?: TrendData;
  pendingTrend?: TrendData;
  criticalTrend?: TrendData;
  aiSolvedTrend?: TrendData;
  manualSolvedTrend?: TrendData;
  avgResolutionTimeTrend?: TrendData;
}

// --- Tickets By Status/Category Types (simple map) ---
export type TicketsByStatusResponse = Record<string, number>;
// export type TicketsByCategoryResponse = Record<string, number>; // Commented out

// --- Resolution Trends Types ---
export interface ResolutionTrendPoint {
  date: string;
  ai_solved_count: number;
  manually_solved_count: number;
  resolved_count: number;
}
export type ResolutionTrendsResponse = ResolutionTrendPoint[];

// --- Agent Performance Types ---
export interface AgentPerformanceData {
  user_id: string;
  username: string;
  email: string;
  department: string;
  tickets_assigned: number;
  tickets_solved: number;
  avg_resolution_time: number | null;
  resolution_rate: number;
}
export type AgentPerformanceResponse = AgentPerformanceData[];

// Helper to prepare query params
const prepareAnalyticsParams = (filters: AnalyticsFilters) => {
  const params: any = {};
  if (filters.companyId) params.company_id = filters.companyId;
  if (filters.departmentId) params.department_id = filters.departmentId;
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (filters.userId) params.user_id = filters.userId;
  if (filters.interval) params.interval = filters.interval;
  return params;
};

// Interface for Tickets by Category to match backend response
export interface CategoryCount {
  category: string | null;
  count: number;
}

// Service Functions
export const getKpis = async (filters: AnalyticsFilters): Promise<KpisResponse> => {
  const response = await api.get<KpisResponse>('/analytics/kpis', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

export const getTicketsByStatus = async (filters: AnalyticsFilters): Promise<TicketsByStatusResponse> => {
  const response = await api.get<TicketsByStatusResponse>('/analytics/tickets-by-status', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

export const getTicketsByCategory = async (filters: AnalyticsFilters): Promise<CategoryCount[]> => {
  const response = await api.get<CategoryCount[]>('/analytics/tickets-by-category', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

export const getResolutionTrends = async (filters: AnalyticsFilters): Promise<ResolutionTrendsResponse> => {
  const response = await api.get<ResolutionTrendsResponse>('/analytics/resolution-trends', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

export const getAgentPerformance = async (filters: AnalyticsFilters): Promise<AgentPerformanceResponse> => {
  const response = await api.get<AgentPerformanceResponse>('/analytics/agent-performance', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

// --- Pydantic Schemas for SuperAdmin Analytics (mirroring backend for clarity) ---
export interface CompanyTokenUsage {
  company_id: string; // Changed from uuid.UUID to string for frontend
  company_name: string;
  total_tokens_used: number;
}

export interface CompanyActivity {
  company_id: string; // Changed from uuid.UUID to string for frontend
  company_name: string;
  tickets_created_count: number;
  total_interactions_count: number;
}

// --- Pydantic Schemas for Analytics Responses ---
export interface TrendData { // Ensure this is exported
  direction: 'up' | 'down' | string; // Loosen to string to avoid potential mismatch if backend sends other values
  value: number;
}

// Functions for SuperAdmin Analytics
export const getSuperAdminTokenUsageByCompany = async (filters: Pick<AnalyticsFilters, 'startDate' | 'endDate'>): Promise<CompanyTokenUsage[]> => {
  const response = await api.get<CompanyTokenUsage[]>('/analytics/superadmin/token-usage-by-company', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

export const getSuperAdminActivityByCompany = async (filters: Pick<AnalyticsFilters, 'startDate' | 'endDate'>): Promise<CompanyActivity[]> => {
  const response = await api.get<CompanyActivity[]>('/analytics/superadmin/activity-by-company', { params: prepareAnalyticsParams(filters) });
  return response.data;
};

// Interface for the new detailed company token usage response
export interface DetailedCompanyTokenUsageResponse {
  company_id: string;
  company_name: string;
  tokens_today: number;
  tokens_this_month: number;
  tokens_lifetime: number;
}

export const getDetailedCompanyTokenUsage = async (companyId: string): Promise<DetailedCompanyTokenUsageResponse> => {
  if (!companyId) {
    throw new Error('Company ID is required to fetch detailed token usage.');
  }
  const response = await api.get<DetailedCompanyTokenUsageResponse>(`/analytics/company-token-usage/${companyId}`);
  return response.data;
};