import api from "./api";

// Enhanced ticket management service with comprehensive CRUD operations
// TODO: Add ticket template system for common issues
// TODO: Implement ticket merge and split functionality
// TODO: Add support for ticket attachments and file uploads
// TODO: Implement real-time ticket updates via WebSocket

// Enum-like objects for status, priority, etc. (adjust as per your backend)
export const TicketStatus = {
  NEW: "new",
  AI_PROCESSING: "ai_processing",
  PENDING_ADMIN_REVIEW: "pending_admin_review",
  CUSTOMER_REPLIED: "customer_replied",
  RESOLVED_BY_AI: "resolved_by_ai",
  RESOLVED_MANUALLY: "resolved_manually",
  CRITICAL_ROUTED: "critical_routed",
  CLOSED: "closed",
} as const;
export type TicketStatusType = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;
export type TicketPriorityType =
  (typeof TicketPriority)[keyof typeof TicketPriority];

export const InteractionTypeEnum = {
  CUSTOMER_COMPLAINT: "customer_complaint",
  CUSTOMER_REPLY: "customer_reply",
  AI_REPLY: "ai_reply",
  ADMIN_REPLY: "admin_reply",
  AGENT_REPLY: "agent_reply", // General agent reply
  INTERNAL_NOTE: "internal_note",
  SYSTEM_EVENT_TICKET_CREATED: "system_event_ticket_created",
  SYSTEM_EVENT_AI_CLASSIFIED: "system_event_ai_classified",
  SYSTEM_EVENT_STATUS_CHANGED: "system_event_status_changed",
  SYSTEM_EVENT_PRIORITY_CHANGED: "system_event_priority_changed",
  SYSTEM_EVENT_ASSIGNMENT: "system_event_assignment",
  SYSTEM_EVENT_CRITICAL_ROUTE: "system_event_critical_route", // From example
  ADMIN_REROUTE: "admin_reroute", // From example
  // Add more specific system events as needed by backend
} as const;
export type InteractionType =
  (typeof InteractionTypeEnum)[keyof typeof InteractionTypeEnum];

export interface Interaction {
  id: string;
  ticket_id: string;
  interaction_type: InteractionType;
  content: string;
  author: string; // 'customer', 'ai_agent', 'admin: <username>', 'user: <username>', 'system'
  timestamp: string; // ISO date string
  metadata_json?: string | null;
}

export interface TicketCreateResponse {
  ticket: TicketDetail;
  ai_reply: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatusType;
  priority: TicketPriorityType;
  category: string | null;
  sentiment: string | null; // Or a more specific type if available
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  company_id: string;
  department_id: string | null;
  department_name?: string; // Optional: if backend joins and sends it
  assigned_user_id: string | null;
  assigned_user_name?: string; // Optional: if backend joins and sends it
  customer_name: string | null;
  customer_email: string | null;
  interactions?: Interaction[]; // Added for Ticket Detail Page
  external_id?: string | null;
  ai_solvable_prediction?: boolean | null;
  is_potential_continuation?: boolean;
  last_customer_interaction_at?: string | null;
}

// For detailed view of a single ticket
export interface TicketDetail {
  id: string;
  external_id?: string;
  subject: string;
  customer_email: string;
  status: TicketStatusType;
  ai_category?: string; // Renamed from category to ai_category
  ai_solvable_prediction?: boolean;
  sentiment?: string;
  priority?: TicketPriorityType;
  is_potential_continuation?: boolean; // Added based on backend model
  assigned_department_id?: string;
  department_name?: string;
  assigned_user_id?: string;
  // assigned_user_name is not provided by current backend, removed for now
  company_id: string;
  created_at: string;
  updated_at: string;
  last_customer_interaction_at?: string;
  interactions: Interaction[];
}

export interface GetTicketsParams {
  companyId?: string;
  departmentId?: string;
  priority?: TicketPriorityType;
  status?: TicketStatusType;
  sortBy?: string; // e.g., 'created_at', 'priority'
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  is_critical_only?: boolean; // Added to interface if backend supports it
}

export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number; // This will be populated from backend's 'page'
  limit: number; // This will be populated from backend's 'limit'
  totalPages: number; // This will be populated from backend's 'totalPages'
  // offset?: number; // Backend sends offset, but frontend uses page, so not strictly needed here
}

export const getTickets = async (
  params: GetTicketsParams,
): Promise<TicketsResponse> => {
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    companyId,
    departmentId,
    search,
    status,
    priority,
    is_critical_only,
    // any other known camelCase params from GetTicketsParams should be destructured here
    ...otherFilters // any truly unknown filters would fall here
  } = params;

  let apiPath = "/tickets/";

  const apiParams: any = { ...otherFilters }; // Start with any other filters not explicitly handled

  // Explicitly map known camelCase to snake_case for the API
  if (companyId) apiParams.company_id = companyId;
  if (departmentId) apiParams.department_id = departmentId;
  if (search) apiParams.search = search;
  if (status) apiParams.status = status;
  if (priority) apiParams.priority = priority;
  if (is_critical_only !== undefined)
    apiParams.is_critical_only = is_critical_only;

  if (limit !== undefined) apiParams.limit = limit;
  if (page !== undefined) apiParams.offset = ((page || 1) - 1) * (limit || 15);

  if (sortBy) apiParams.sort_by = sortBy;
  if (sortOrder) apiParams.sort_order = sortOrder;

  const response = await api.get<TicketsResponse>(apiPath, {
    params: apiParams,
  });

  const responseData = response.data;

  return {
    tickets: responseData.tickets,
    total: responseData.total,
    page: page || 1,
    limit: limit || 15,
    totalPages: Math.ceil(responseData.total / (limit || 15)),
  };
};

export interface UpdateTicketDetailsPayload {
  priority?: TicketPriorityType;
  status?: TicketStatusType;
  assigned_department_id?: string | null; // Allow null to unassign
  assigned_user_id?: string | null; // Allow null to unassign
  ai_category?: string | null; // Changed from category to ai_category
  sentiment?: string | null;
  // other editable fields by admin, matching backend TicketUpdateDetails
}

// Corresponds to PUT /tickets/{ticket_id}/details
export const updateTicketDetails = async (
  ticketId: string,
  payload: UpdateTicketDetailsPayload,
): Promise<Ticket> => {
  const response = await api.put<Ticket>(
    `/tickets/${ticketId}/details`,
    payload,
  );
  return response.data;
};

// Corresponds to GET /tickets/{ticket_id}
export const getTicketById = async (
  ticketId: string,
): Promise<TicketDetail> => {
  const response = await api.get<TicketDetail>(`/tickets/${ticketId}`);
  return response.data;
};

// Corresponds to PUT /tickets/{ticket_id}/status
export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatusType,
): Promise<Ticket> => {
  // FastAPI interprets simple non-path params in PUT/POST as query params if not in body model
  const response = await api.put<Ticket>(
    `/tickets/${ticketId}/status?new_status=${status}`,
  );
  return response.data;
};

// Corresponds to PUT /tickets/{ticket_id}/reroute
export const rerouteTicket = async (
  ticketId: string,
  newDepartmentId: string,
): Promise<Ticket> => {
  const response = await api.put<Ticket>(
    `/tickets/${ticketId}/reroute?new_department_id=${newDepartmentId}`,
  );
  return response.data;
};

export interface AddInternalNotePayload {
  content: string;
}
// Corresponds to POST /tickets/{ticket_id}/internal-note
export const addInternalNote = async (
  ticketId: string,
  payload: AddInternalNotePayload,
): Promise<Interaction> => {
  // Backend `add_internal_note(ticket_id: str, content: str, ...)` expects `content` as a query param or form field.
  // Sending as query parameter for POST.
  const response = await api.post<Interaction>(
    `/tickets/${ticketId}/internal-note?content=${encodeURIComponent(payload.content)}`,
  );
  return response.data;
};

export interface GenerateAIReplyPayload {
  tone?: string;
  prompt?: string;
}
export interface AIReplyResponse {
  generated_reply: string;
}
// Corresponds to POST /tickets/{ticket_id}/generate-ai-reply
export const generateAIReply = async (
  ticketId: string,
  payload: GenerateAIReplyPayload = {},
): Promise<AIReplyResponse> => {
  const response = await api.post<AIReplyResponse>(
    `/tickets/${ticketId}/generate-ai-reply`,
    payload,
  );
  return response.data;
};

// Interface for creating a new ticket
export interface TicketCreatePayload {
  customer_email: string;
  subject: string;
  initial_message_content: string;
  api_key: string;
  external_id?: string;
}

// Function to create a new ticket
// Corresponds to POST /tickets/
export const createTicket = async (
  payload: TicketCreatePayload,
): Promise<TicketCreateResponse> => {
  const response = await api.post<TicketCreateResponse>("/tickets", payload);
  return response.data;
};

export interface SendReplyPayload {
  content: string;
  author: "admin_reply" | "agent_reply"; // Or other relevant types
}

// Corresponds to POST /tickets/{ticket_id}/reply
export const sendReplyToWebhook = async (
  ticketId: string,
  payload: SendReplyPayload,
): Promise<Interaction> => {
  const response = await api.post<Interaction>(
    `/tickets/${ticketId}/reply`,
    payload,
  );
  return response.data;
};

// Add more service functions as needed (e.g., getTicketById)
