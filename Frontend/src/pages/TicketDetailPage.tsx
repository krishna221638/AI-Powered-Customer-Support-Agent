import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Comprehensive ticket detail management interface
// TODO: Add ticket timeline with interaction history visualization
// TODO: Implement inline editing for all ticket properties
// TODO: Add collaboration tools for team communication
// TODO: Implement customer communication portal integration
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTicketById,
  updateTicketStatus,
  generateAIReply,
  addInternalNote,
  sendReplyToWebhook,
  TicketDetail,
  Interaction,
  TicketStatus,
  TicketStatusType,
  InteractionTypeEnum,
  InteractionType,
  TicketPriority,
  TicketPriorityType,
} from "../services/ticketService";
import { useAuthStore } from "../stores/authStore";
import {
  ArrowLeft,
  AlertCircle,
  Send,
  Loader2,
  MessageSquare,
  Edit3,
  Sparkles,
  SendHorizontal,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedStatus, setSelectedStatus] = useState<TicketStatusType | "">(
    "",
  );
  const [replyContent, setReplyContent] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  const {
    data: ticket,
    isLoading,
    error,
    refetch,
  } = useQuery<TicketDetail, Error>({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketById(ticketId!),
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status || "");
    }
  }, [ticket]);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: TicketStatusType) =>
      updateTicketStatus(ticketId!, newStatus),
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["allTickets"] });
      toast.success(
        `Ticket status updated to ${formatTicketStatus(updatedTicket.status)}`,
      );
      if (ticket) setSelectedStatus(updatedTicket.status); // Update local state after successful mutation
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || "Failed to update ticket status",
      );
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: (replyContent: string) => {
      const author = user?.role === "admin" ? "admin_reply" : "agent_reply";
      return sendReplyToWebhook(ticketId!, { content: replyContent, author });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setReplyContent("");
      toast.success("Reply sent successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to send reply");
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (noteContent: string) =>
      addInternalNote(ticketId!, { content: noteContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setReplyContent("");
      toast.success("Reply sent as internal note.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to send reply");
    },
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value as TicketStatusType);
  };

  const handleUpdateStatus = () => {
    if (!selectedStatus || !ticket || selectedStatus === ticket.status) {
      toast("Please select a new status or no change needed.", { icon: "ℹ️" });
      return;
    }
    updateStatusMutation.mutate(selectedStatus);
  };

  const handleGenerateAIReply = async () => {
    if (!ticketId) return;
    setIsGeneratingReply(true);
    try {
      const aiResponse = await generateAIReply(ticketId);
      setReplyContent(aiResponse.generated_reply);
      toast.success("AI reply suggestion generated!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate AI reply.");
      setReplyContent("Could not generate AI suggestion at this time.");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !ticketId) {
      toast.error("Reply content cannot be empty.");
      return;
    }
    sendReplyMutation.mutate(replyContent);
  };

  // Basic permission check for replying (can be expanded)
  const canReply = () => {
    if (!user || !ticket) return false;
    // SuperAdmins can always reply/add notes
    if (user.role === "superAdmin") return true;
    // Admins can reply/add notes to any ticket they can view
    if (user.role === "admin") return true;
    // Employees of the ticket's department can reply/add notes
    if (
      user.role === "employee" &&
      user.department_id === ticket.assigned_department_id &&
      user.company_id === ticket.company_id
    )
      return true;
    return false;
  };

  // --- Helper Functions (adapted from example) ---
  const formatInteractionTimestamp = (timestamp: string): string => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy HH:mm");
    } catch (e) {
      return timestamp;
    }
  };

  const getStatusBadgeClass = (
    status: TicketStatusType | undefined,
  ): string => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case TicketStatus.NEW:
        return "bg-blue-100 text-blue-800";
      case TicketStatus.AI_PROCESSING:
        return "bg-purple-100 text-purple-800";
      case TicketStatus.CUSTOMER_REPLIED:
        return "bg-yellow-100 text-yellow-800";
      case TicketStatus.PENDING_ADMIN_REVIEW:
        return "bg-gray-200 text-gray-700";
      case TicketStatus.CRITICAL_ROUTED:
        return "bg-red-100 text-red-800";
      case TicketStatus.RESOLVED_BY_AI:
      case TicketStatus.RESOLVED_MANUALLY:
        return "bg-green-100 text-green-800";
      case TicketStatus.CLOSED:
        return "bg-gray-300 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityBadgeClass = (
    priority: TicketPriorityType | null | undefined,
  ): string => {
    if (!priority) return "bg-gray-100 text-gray-800";
    switch (priority) {
      case TicketPriority.CRITICAL:
        return "bg-red-100 text-red-800 font-semibold";
      case TicketPriority.HIGH:
        return "bg-orange-100 text-orange-800 font-medium";
      case TicketPriority.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case TicketPriority.LOW:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTicketStatus = (status: TicketStatusType | undefined): string => {
    if (!status) return "N/A";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getInteractionMessageStyle = (type: InteractionType): string => {
    switch (type) {
      case InteractionTypeEnum.CUSTOMER_COMPLAINT:
      case InteractionTypeEnum.CUSTOMER_REPLY:
        return "bg-blue-50 border-blue-300";
      case InteractionTypeEnum.AI_REPLY:
        return "bg-purple-50 border-purple-300";
      case InteractionTypeEnum.ADMIN_REPLY:
      case InteractionTypeEnum.AGENT_REPLY:
        return "bg-green-50 border-green-300";
      case InteractionTypeEnum.SYSTEM_EVENT_CRITICAL_ROUTE:
      case InteractionTypeEnum.ADMIN_REROUTE:
        return "bg-yellow-50 border-yellow-300 text-yellow-800";
      case InteractionTypeEnum.INTERNAL_NOTE:
        return "bg-gray-100 border-gray-300"; // Removed shadow-sm for consistency
      default:
        return "bg-gray-50 border-gray-200"; // For other system events
    }
  };

  const formatInteractionTypeDisplay = (type: InteractionType): string => {
    let formatted = type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    if (type.startsWith("SYSTEM_EVENT_")) {
      formatted = formatted.replace("SYSTEM EVENT ", "");
    }
    return formatted;
  };

  const isSystemTypeInteraction = (type: InteractionType): boolean => {
    return (
      type.startsWith("system_event_") ||
      type === InteractionTypeEnum.ADMIN_REROUTE
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto p-6 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-red-400" />
        <h3 className="mt-4 text-xl font-semibold text-gray-800">
          Error Loading Ticket
        </h3>
        <p className="mt-2 text-gray-600">
          {error?.message ||
            "Could not fetch ticket details or the ticket does not exist."}
        </p>
        <button
          onClick={() => navigate("/all-tickets")}
          className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft size={20} className="mr-2" /> Back to All Tickets
        </button>
      </div>
    );
  }

  const sortedInteractions = ticket.interactions
    ? [...ticket.interactions].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
    : [];

  // --- Render Functions ---
  const renderTicketHeader = () => (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div className="mb-4 md:mb-0 flex-grow pr-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1 break-words">
            {ticket.subject}
          </h1>
          <p className="text-sm lg:text-base text-gray-500">
            Customer: {ticket.customer_email}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end space-y-2 text-xs flex-shrink-0">
          <div
            className={`px-3 py-1.5 rounded-full font-semibold tracking-wide ${getStatusBadgeClass(
              ticket.status,
            )}`}
          >
            {formatTicketStatus(ticket.status)}
          </div>
          <div
            className={`px-3 py-1.5 rounded-full font-semibold tracking-wide ${getPriorityBadgeClass(
              ticket.priority,
            )}`}
          >
            Priority: {ticket.priority || "N/A"}
          </div>
          {ticket.ai_category && (
            <div
              className={`px-3 py-1.5 rounded-full font-medium tracking-wide bg-indigo-100 text-indigo-800`}
            >
              Category: {ticket.ai_category}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderReplyForm = () => (
    <form
      onSubmit={handleSendReply}
      className="bg-gray-50 p-5 border-t border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-700 mb-3">
        Add Your Reply / Note
      </h3>
      <div>
        <textarea
          rows={5}
          name="replyContent"
          id="replyContent"
          className="block w-full sm:text-sm border-gray-300 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          placeholder="Type your response or internal note here..."
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateAIReply}
          disabled={isGeneratingReply || sendReplyMutation.isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
        >
          {isGeneratingReply ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
          )}
          {isGeneratingReply ? "Generating..." : "AI Suggestion"}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={
              !replyContent.trim() ||
              sendReplyMutation.isPending ||
              isGeneratingReply
            }
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
          >
            {sendReplyMutation.isPending ? (
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
            ) : (
              <SendHorizontal className="h-5 w-5 mr-2" />
            )}
            {sendReplyMutation.isPending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </form>
  );

  const renderConversation = () => (
    <div className="bg-white shadow-lg rounded-xl border border-gray-200 flex flex-col">
      <h2 className="text-xl font-semibold p-5 border-b border-gray-200 text-gray-700 flex-shrink-0">
        Conversation History
      </h2>
      <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-grow min-h-[300px]">
        {sortedInteractions.length > 0 ? (
          sortedInteractions.map((interaction) => (
            <div key={interaction.id}>
              {isSystemTypeInteraction(interaction.interaction_type) ? (
                <div className="text-center my-3">
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full shadow-sm ${getInteractionMessageStyle(
                      interaction.interaction_type,
                    )}`}
                  >
                    {interaction.content}{" "}
                    <span className="text-gray-600">
                      ({formatInteractionTimestamp(interaction.timestamp)})
                    </span>
                  </span>
                </div>
              ) : (
                <div
                  className={`border rounded-lg p-3.5 shadow-sm ${getInteractionMessageStyle(
                    interaction.interaction_type,
                  )}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm text-gray-800">
                      {interaction.author}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatInteractionTimestamp(interaction.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">
                    {formatInteractionTypeDisplay(interaction.interaction_type)}
                  </p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {interaction.content}
                  </div>
                  {interaction.metadata_json && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                        View Metadata
                      </summary>
                      <pre className="mt-1 p-2.5 bg-gray-50 rounded-md text-gray-600 overflow-x-auto text-[11px] leading-snug shadow-inner">
                        {interaction.metadata_json}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
            <MessageSquare size={48} className="mb-3 opacity-50" />
            <p className="text-base">No interactions yet.</p>
            <p className="text-sm">
              The conversation will appear here once it begins.
            </p>
          </div>
        )}
      </div>
      {canReply() && renderReplyForm()}
    </div>
  );

  const renderSidebar = () => (
    <div className="bg-white shadow-lg rounded-xl space-y-5 border border-gray-200">
      <div className="p-5">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          Ticket Actions
        </h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="status-update"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Change Status
            </label>
            <select
              id="status-update"
              value={selectedStatus}
              onChange={handleStatusChange}
              className="block w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white hover:border-gray-400 transition-colors"
            >
              {Object.values(TicketStatus).map((s) => (
                <option key={s} value={s}>
                  {formatTicketStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleUpdateStatus}
            disabled={
              updateStatusMutation.isPending ||
              !ticket ||
              selectedStatus === ticket.status
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150"
          >
            {updateStatusMutation.isPending && (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            )}
            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
          </button>
        </div>
      </div>

      <div className="p-5 border-t border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          Ticket Information
        </h3>
        <dl className="space-y-3">
          {[
            { label: "Ticket ID", value: ticket.id, breakAll: true },
            { label: "External ID", value: ticket.external_id },
            {
              label: "Created",
              value: format(new Date(ticket.created_at), "MMM d, yyyy p"),
            },
            {
              label: "Last Updated",
              value: format(new Date(ticket.updated_at), "MMM d, yyyy p"),
            },
            { label: "Department", value: ticket.department_name },
            { label: "Sentiment", value: ticket.sentiment },
            {
              label: "AI Solvable",
              value:
                ticket.ai_solvable_prediction !== undefined
                  ? ticket.ai_solvable_prediction
                    ? "Yes"
                    : "No"
                  : undefined,
            },
            {
              label: "Potential Continuation",
              value:
                ticket.is_potential_continuation !== undefined
                  ? ticket.is_potential_continuation
                    ? "Yes"
                    : "No"
                  : undefined,
            },
          ].map((item) =>
            item.value ? (
              <div key={item.label} className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">
                  {item.label}:
                </dt>
                <dd
                  className={`text-sm text-gray-800 text-right ${
                    item.breakAll ? "break-all" : ""
                  }`}
                >
                  {item.value}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <button
        onClick={() => navigate("/all-tickets")}
        className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 transition-colors duration-150 mb-2 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      >
        <ArrowLeft size={18} className="mr-1.5" /> Back to All Tickets
      </button>
      {renderTicketHeader()}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">{renderConversation()}</div>
        <div className="lg:col-span-1 sticky top-20">
          {" "}
          {/* Made sidebar sticky */}
          {renderSidebar()}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
