import React, { useState, useEffect } from "react";
import {
  createTicket,
  TicketCreatePayload,
  TicketCreateResponse,
} from "../../services/ticketService";
import { useAuthStore } from "../../stores/authStore";
import api from "../../services/api"; // Import the configured api instance
import toast from "react-hot-toast";

const DummyCreateTicketPage: React.FC = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<TicketCreatePayload>({
    customer_email: "",
    subject: "",
    initial_message_content: "",
    api_key: "",
    external_id: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] =
    useState<TicketCreateResponse | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);

  // Automatically fetch API Key on component mount
  useEffect(() => {
    const fetchApiKey = async () => {
      if (user?.role === "admin" || user?.role === "superAdmin") {
        try {
          const response = await api.get("/company-settings/details");
          if (response.data && response.data.api_key) {
            setFormData((prev) => ({
              ...prev,
              api_key: response.data.api_key,
            }));
          }
        } catch (err) {
          console.error("Failed to fetch Company API Key:", err);
          // Don't toast error here to avoid noise, just let user enter manually if needed
        }
      }
    };
    fetchApiKey();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.api_key) {
      toast.error("API Key is required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCreatedTicket(null);
    setAiReply(null);

    try {
      const result = await createTicket(formData);
      setCreatedTicket(result);
      toast.success(`Ticket ${result.ticket.id} created successfully!`);
      if (result.ai_reply) {
        setAiReply(result.ai_reply);
      } else {
        setAiReply("No interactions found in the initial response.");
      }
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      setError(
        err.message || "An unknown error occurred while creating the ticket.",
      );
      toast.error(err.message || "Failed to create ticket.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto p-4 md:p-6 lg:p-12 page-transition">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100 animate-slide-down">
            Create Support Ticket
          </h1>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300"
          >
            {/* Hidden API Key Input or Read-Only if needed for debugging */}
            {/* <div>
              <label
                htmlFor="api_key"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                API Key *
              </label>
              <input
                type="text"
                name="api_key"
                id="api_key"
                value={formData.api_key}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div> */}
            <div>
              <label
                htmlFor="customer_email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Customer Email *
              </label>
              <input
                type="email"
                name="customer_email"
                id="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                id="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="initial_message_content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Initial Message *
              </label>
              <textarea
                name="initial_message_content"
                id="initial_message_content"
                rows={4}
                value={formData.initial_message_content}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="external_id"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                External ID (Optional)
              </label>
              <input
                type="text"
                name="external_id"
                id="external_id"
                value={formData.external_id}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {isLoading ? "Creating Ticket..." : "Create Ticket"}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {createdTicket && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Ticket Created Successfully!
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>ID:</strong> {createdTicket.ticket.id}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Subject:</strong> {createdTicket.ticket.subject}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Customer Email:</strong>{" "}
                {createdTicket.ticket.customer_email}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Status:</strong> {createdTicket.ticket.status}
              </p>
              {createdTicket.ticket.ai_category && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>AI Category:</strong>{" "}
                  {createdTicket.ticket.ai_category}
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
                  AI Reply:
                </h3>
                {aiReply ? (
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {aiReply}
                  </p>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    Checking for AI reply...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DummyCreateTicketPage;
