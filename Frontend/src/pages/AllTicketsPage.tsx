import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
// Enhanced ticket listing and management interface
// TODO: Add advanced filtering by date range, department, and agent
// TODO: Implement drag-and-drop ticket assignment
// TODO: Add bulk operations for ticket status updates
// TODO: Implement ticket analytics and reporting dashboard
import {
  getTickets,
  Ticket,
  GetTicketsParams,
  TicketsResponse,
  TicketStatus,
  TicketPriority,
  TicketStatusType,
  TicketPriorityType,
  updateTicketDetails as updateTicketDetailsService,
  UpdateTicketDetailsPayload,
  addInternalNote as addInternalNoteService,
} from "../services/ticketService";
import {
  Department,
  getDepartments as getDepartmentsService,
} from "../services/departmentService";
import {
  AlertTriangle,
  ListFilter,
  Loader2,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  FilterX,
  MessageSquare,
  Edit3,
  Check,
  X,
  Settings2,
} from "lucide-react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";

// Define a type for the selected ticket for action modals
interface SelectedTicketInfo {
  id: string;
  currentStatus?: TicketStatusType;
  currentPriority?: TicketPriorityType;
  currentDepartmentId?: string | null;
  currentSentiment?: string | null;
  // add other relevant fields if needed for modals
}

const AllTicketsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initialFilters: GetTicketsParams = {
    page: 1,
    limit: 15,
    search: "",
    sortBy: "created_at",
    sortOrder: "desc",
    status: undefined,
    priority: undefined,
    departmentId: undefined,
  };

  const [filters, setFilters] = useState<GetTicketsParams>(initialFilters);

  const queryParams: GetTicketsParams = useMemo(
    () => ({
      ...filters,
      companyId:
        user?.role === "admin" || user?.role === "superAdmin"
          ? user.company_id || undefined
          : undefined,
      departmentId:
        user?.role === "employee"
          ? user.department_id || undefined
          : filters.departmentId,
    }),
    [user, filters],
  );

  const {
    data: ticketsData,
    isLoading,
    error,
    isFetching,
  } = useQuery<TicketsResponse, Error>({
    queryKey: ["allTickets", queryParams],
    queryFn: () => getTickets(queryParams),
    enabled:
      !!user &&
      (user.role === "superAdmin" ||
        !!user.company_id ||
        user.role === "employee"),
    placeholderData: (previousData: TicketsResponse | undefined) =>
      previousData,
  });

  // --- MODAL STATES ---
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedTicketForNote, setSelectedTicketForNote] = useState<Pick<
    Ticket,
    "id"
  > | null>(null);
  const [noteContent, setNoteContent] = useState("");

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [ticketToManage, setTicketToManage] = useState<Ticket | null>(null);
  const [manageFormData, setManageFormData] =
    useState<UpdateTicketDetailsPayload>({});

  // --- MUTATIONS ---
  const addNoteMutation = useMutation({
    mutationFn: ({
      ticketId,
      content,
    }: {
      ticketId: string;
      content: string;
    }) => addInternalNoteService(ticketId, { content }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allTickets"] });
      toast.success(`Note added to ticket ${data.ticket_id}`);
      setIsNoteModalOpen(false);
      setNoteContent("");
      setSelectedTicketForNote(null);
    },
    onError: (error: any, variables) => {
      toast.error(
        `Failed to add note to ticket ${variables.ticketId}: ${
          error.response?.data?.detail || error.message
        }`,
      );
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: UpdateTicketDetailsPayload;
    }) => updateTicketDetailsService(ticketId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allTickets"] });
      toast.success(`Ticket ${data.id} details updated.`);
      setIsManageModalOpen(false);
      setTicketToManage(null);
    },
    onError: (error: any, variables) => {
      toast.error(
        `Failed to update ticket ${variables.ticketId}: ${
          error.response?.data?.detail || error.message
        }`,
      );
    },
  });

  // --- DATA FETCHING for Departments (for Admin) ---
  const { data: departments, isLoading: isLoadingDepartments } = useQuery<
    Department[],
    Error
  >({
    queryKey: ["departmentsForCompany", user?.company_id],
    queryFn: () =>
      user?.company_id
        ? getDepartmentsService({ company_id: user.company_id })
        : Promise.resolve([]),
    enabled:
      !!user &&
      (user.role === "admin" || user.role === "superAdmin") &&
      !!user.company_id,
  });

  // --- ACTION HANDLERS ---
  const handleOpenNoteModal = (ticket: Ticket) => {
    setSelectedTicketForNote({ id: ticket.id });
    setIsNoteModalOpen(true);
  };

  const handleAddNote = () => {
    if (!selectedTicketForNote || !noteContent.trim()) {
      toast.error("No ticket selected or note content is empty.");
      return;
    }
    addNoteMutation.mutate({
      ticketId: selectedTicketForNote.id,
      content: noteContent,
    });
  };

  const handleOpenManageModal = (ticket: Ticket) => {
    setTicketToManage(ticket);
    setManageFormData({
      status: ticket.status,
      priority: ticket.priority,
      assigned_department_id: ticket.department_id,
      sentiment: ticket.sentiment || undefined, // sentiment can be null
      ai_category: ticket.category || undefined, // ai_category can be null
    });
    setIsManageModalOpen(true);
  };

  const handleManageFormChange = (
    e: React.ChangeEvent<
      HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setManageFormData((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : value,
    }));
  };

  const handleSaveChanges = () => {
    if (!ticketToManage) return;
    // Filter out any fields that weren't changed from original or are empty if not allowed
    const payload: UpdateTicketDetailsPayload = {};
    if (manageFormData.status !== ticketToManage.status)
      payload.status = manageFormData.status;
    if (manageFormData.priority !== ticketToManage.priority)
      payload.priority = manageFormData.priority;
    if (manageFormData.assigned_department_id !== ticketToManage.department_id)
      payload.assigned_department_id =
        manageFormData.assigned_department_id || null;
    if (manageFormData.sentiment !== (ticketToManage.sentiment || undefined))
      payload.sentiment = manageFormData.sentiment || null;
    // Add other fields like ai_category if included in form
    // if (manageFormData.ai_category !== (ticketToManage.category || undefined)) payload.ai_category = manageFormData.ai_category || null;

    if (Object.keys(payload).length === 0) {
      toast("No changes made.");
      setIsManageModalOpen(false);
      return;
    }
    updateDetailsMutation.mutate({ ticketId: ticketToManage.id, payload });
  };

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => ({
        ...prev,
        [name]: value || undefined,
        page: 1,
      }));
    },
    [],
  );

  const handleSort = useCallback((sortKey: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sortKey,
      sortOrder:
        prev.sortBy === sortKey && prev.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "admin" && !user.company_id) {
    toast.error("Admin account not associated with a company.");
    return <Navigate to="/admin/analytics-dashboard" replace />;
  }
  if (user.role === "employee" && !user.department_id) {
    toast.error("Employee account not associated with a department.");
    return <Navigate to="/login" replace />;
  }

  const tickets = ticketsData?.tickets || [];
  const totalPages = ticketsData?.totalPages || 0;
  const currentPage = ticketsData?.page || 1;

  const SortIndicator: React.FC<{ columnKey: string }> = ({ columnKey }) => {
    if (filters.sortBy === columnKey) {
      return filters.sortOrder === "asc" ? (
        <ChevronUp size={14} className="ml-1" />
      ) : (
        <ChevronDown size={14} className="ml-1" />
      );
    }
    return null;
  };

  const renderTable = () => {
    if (isLoading)
      return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />{" "}
          <span className="ml-2">Loading tickets...</span>
        </div>
      );
    if (error)
      return (
        <div className="p-10 text-center text-red-500">
          <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
          Failed to load tickets: {error.message}
        </div>
      );
    if (tickets.length === 0 && !isFetching)
      return (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
          No tickets found matching your criteria.
        </div>
      );
    return (
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("subject")}
                >
                  Subject <SortIndicator columnKey="subject" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIndicator columnKey="status" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("priority")}
                >
                  Priority <SortIndicator columnKey="priority" />
                </th>
                {user?.role !== "employee" && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort("department_name")}
                  >
                    Department <SortIndicator columnKey="department_name" />
                  </th>
                )}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort("created_at")}
                >
                  Created At <SortIndicator columnKey="created_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket: Ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                    title={ticket.subject}
                  >
                    {ticket.subject.length > 40
                      ? `${ticket.subject.substring(0, 40)}...`
                      : ticket.subject}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {ticket.status}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {ticket.priority}
                  </td>
                  {user?.role !== "employee" && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ticket.department_name ||
                        ticket.department_id?.substring(0, 8) ||
                        "N/A"}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(ticket.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2 flex items-center">
                    <Link
                      to={`/ticket/${ticket.id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      title="View Ticket"
                    >
                      <Eye size={18} />
                    </Link>
                    {(user?.role === "admin" || user?.role === "employee") && (
                      <button
                        onClick={() => handleOpenNoteModal(ticket)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        title="Add Internal Note"
                        disabled={
                          addNoteMutation.isPending &&
                          addNoteMutation.variables?.ticketId === ticket.id
                        }
                      >
                        <MessageSquare size={18} />
                      </button>
                    )}
                    {(user?.role === "admin" || user?.role === "employee") && (
                      <button
                        onClick={() => handleOpenManageModal(ticket)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Manage Ticket"
                        disabled={
                          updateDetailsMutation.isPending &&
                          updateDetailsMutation.variables?.ticketId ===
                            ticket.id
                        }
                      >
                        <Settings2 size={18} />
                      </button>
                    )}{" "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="p-4 md:p-6 space-y-6">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            All Tickets
          </h1>
        </header>{" "}
        <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
            <div className="sm:col-span-2 lg:col-span-2">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Search Subject
              </label>
              <input
                type="text"
                name="search"
                id="search"
                value={filters.search || ""}
                onChange={handleFilterChange}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter subject keyword..."
              />
            </div>
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Status
              </label>
              <select
                name="status"
                id="status"
                value={filters.status || ""}
                onChange={handleFilterChange}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Statuses</option>
                {Object.values(TicketStatus).map((statusVal) => (
                  <option key={statusVal} value={statusVal}>
                    {statusVal
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Priority
              </label>
              <select
                name="priority"
                id="priority"
                value={filters.priority || ""}
                onChange={handleFilterChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Priorities</option>
                {Object.values(TicketPriority).map((priorityVal) => (
                  <option key={priorityVal} value={priorityVal}>
                    {priorityVal}
                  </option>
                ))}
              </select>
            </div>
            {user?.role === "admin" &&
              departments &&
              departments.length > 0 && (
                <div>
                  <label
                    htmlFor="departmentId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Department
                  </label>
                  <select
                    name="departmentId"
                    id="departmentId"
                    value={filters.departmentId || ""}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isLoadingDepartments}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FilterX size={16} className="mr-2" /> Clear Filters
            </button>
          </div>
        </div>
        {renderTable()}
        {/* Note Modal */}
        {isNoteModalOpen && selectedTicketForNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Add Internal Note to Ticket{" "}
                {selectedTicketForNote.id.substring(0, 8)}...
              </h3>
              <textarea
                rows={4}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type your internal note here..."
              />
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsNoteModalOpen(false);
                    setNoteContent("");
                    setSelectedTicketForNote(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add Note"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Manage Ticket Modal */}
        {isManageModalOpen && ticketToManage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Manage Ticket: {ticketToManage.subject.substring(0, 30)}...
              </h3>

              {/* Status Dropdown */}
              <div>
                <label
                  htmlFor="status-manage"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Status
                </label>
                <select
                  id="status-manage"
                  name="status"
                  value={manageFormData.status || ""}
                  onChange={handleManageFormChange}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {Object.values(TicketStatus).map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Dropdown */}
              <div>
                <label
                  htmlFor="priority-manage"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Priority
                </label>
                <select
                  id="priority-manage"
                  name="priority"
                  value={manageFormData.priority || ""}
                  onChange={handleManageFormChange}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {Object.values(TicketPriority).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Dropdown (Admin only) */}
              {user?.role === "admin" && departments && (
                <div>
                  <label
                    htmlFor="assigned_department_id-manage"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Department
                  </label>
                  <select
                    id="assigned_department_id-manage"
                    name="assigned_department_id"
                    value={manageFormData.assigned_department_id || ""}
                    onChange={handleManageFormChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isLoadingDepartments}
                  >
                    <option value="">Unassign</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sentiment Input (Example - can be dropdown if predefined values) */}
              <div>
                <label
                  htmlFor="sentiment-manage"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Sentiment
                </label>
                <input
                  type="text"
                  id="sentiment-manage"
                  name="sentiment"
                  value={manageFormData.sentiment || ""}
                  onChange={handleManageFormChange}
                  placeholder="e.g., Positive, Negative, Neutral"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={updateDetailsMutation.isPending}
                >
                  {updateDetailsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {totalPages > 0 && (
          <div className="mt-6 flex justify-center items-center space-x-2">
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max((prev.page || 1) - 1, 1),
                }))
              }
              disabled={currentPage === 1 || isLoading || isFetching}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min((prev.page || 1) + 1, totalPages),
                }))
              }
              disabled={currentPage === totalPages || isLoading || isFetching}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllTicketsPage;
