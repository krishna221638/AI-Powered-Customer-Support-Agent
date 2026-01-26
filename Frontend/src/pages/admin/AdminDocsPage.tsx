import React from "react";
import {
  ShieldCheck,
  KeyRound,
  FileText,
  Link,
  Settings,
  Server,
  ChevronRight,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

// Helper component for code blocks
interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "json",
  title,
}) => (
  <div className="my-6 rounded-lg shadow-md bg-gray-800 overflow-hidden">
    {title && (
      <div className="bg-gray-700 text-gray-200 text-sm py-2 px-4 rounded-t-lg">
        {title}
      </div>
    )}
    <pre
      className={`text-white p-4 rounded-b-lg overflow-x-auto language-${language} text-sm`}
    >
      <code className="break-words whitespace-pre-wrap">{code.trim()}</code>
    </pre>
  </div>
);

// Helper component for sections
interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  id: string;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, id }) => (
  <section
    id={id}
    className="mb-12 p-6 md:p-8 bg-white dark:bg-gray-800 shadow-xl rounded-lg transition-colors duration-300 overflow-hidden"
  >
    <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-6 pb-3 border-b border-gray-300 dark:border-gray-600 flex items-center break-words">
      {icon && <span className="mr-3 text-blue-600 flex-shrink-0">{icon}</span>}
      <span className="break-words">{title}</span>
    </h2>
    <div className="text-gray-700 dark:text-gray-300 space-y-4 text-base leading-relaxed overflow-auto">
      {children}
    </div>
  </section>
);

const AdminDocsPage: React.FC = () => {
  const ticketCreateRequestExample = `{
  "customer_email": "user@example.com",
  "subject": "Need help with my order #12345",
  "initial_message_content": "Hello, I placed an order yesterday and I haven't received a confirmation email. Can you please check the status? My order number is 12345.",
  "external_id": "optional-external-ref-789",
  "api_key": "YOUR_COMPANY_API_KEY"
}`;

  const ticketCreateResponseExample = `{
  "ticket": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "external_id": "optional-external-ref-789",
    "subject": "Need help with my order #12345",
    "customer_email": "user@example.com",
    "status": "ai_processing",
    "ai_category": "Order Inquiry",
    "ai_solvable_prediction": true,
    "sentiment": "Neutral",
    "priority": "Medium",
    "is_potential_continuation": false,
    "assigned_department_id": "d1e2f3a4-b5c6-7890-1234-abcdef123456",
    "department_name": "Support Level 1",
    "assigned_user_id": null,
    "company_id": "c1d2e3f4-a5b6-7890-1234-567890fedcba",
    "created_at": "2024-05-30T10:00:00.000Z",
    "updated_at": "2024-05-30T10:00:05.000Z",
    "last_customer_interaction_at": "2024-05-30T10:00:00.000Z",
    "interactions": [
      {
        "id": "i1j2k3l4-m5n6-7890-1234-abcdefghijkl",
        "ticket_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "interaction_type": "customer_complaint",
        "content": "Hello, I placed an order yesterday and I haven't received a confirmation email. Can you please check the status? My order number is 12345.",
        "author": "customer",
        "timestamp": "2024-05-30T10:00:00.000Z"
      }
    ]
  },
  "ai_reply": "Dear user@example.com,\\n\\nThank you for reaching out. We're looking into your order #12345 and will get back to you shortly with an update.\\n\\nBest regards,\\n[Your Company Name]"
}`;

  const curlExample = `curl -X POST "http://127.0.0.1:8000/api/tickets" \\
-H "Content-Type: application/json" \\
-H "Accept: application/json" \\
-d '{ 
  "customer_email": "user@example.com",
  "subject": "Need help with my order #12345",
  "initial_message_content": "Hello, I placed an order yesterday and I haven\'t received a confirmation email. Can you please check the status? My order number is 12345.",
  "external_id": "optional-external-ref-789",
  "api_key": "YOUR_COMPANY_API_KEY"
}'`;
  const pythonExample = `import requests
import json

api_url = "http://127.0.0.1:8000/api/tickets"
api_key = "YOUR_COMPANY_API_KEY" # Replace with your actual API key

payload = {
    "customer_email": "user@example.com",
    "subject": "Inquiry about product X",
    "initial_message_content": "I have a question regarding product X. Can you provide more details on its features?",
    "external_id": "ext-ref-001",
    "api_key": api_key
}

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    response = requests.post(api_url, headers=headers, data=json.dumps(payload))
    response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
    
    response_data = response.json()
    print("Ticket created successfully:")
    print(json.dumps(response_data, indent=2))
    
    ticket_id = response_data.get("ticket", {}).get("id")
    ai_reply = response_data.get("ai_reply")
    
    if ticket_id:
        print(f"\\nTicket ID: {ticket_id}")
    if ai_reply:
        print(f"AI Reply:\\n{ai_reply}")
        
except requests.exceptions.HTTPError as errh:
    print(f"Http Error: {errh}")
    print(f"Response content: {errh.response.text}")
except requests.exceptions.ConnectionError as errc:
    print(f"Error Connecting: {errc}")
except requests.exceptions.Timeout as errt:
    print(f"Timeout Error: {errt}")
except requests.exceptions.RequestException as err:
    print(f"Oops: Something Else: {err}")`;
  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300">
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-8 shadow-lg">
        <div className="container mx-auto px-6 text-center">
          <FileText size={48} className="mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-extrabold">
            API Documentation
          </h1>
          <p className="mt-3 text-base md:text-lg text-blue-200 max-w-3xl mx-auto">
            Welcome, Admin! This guide provides the necessary information to
            integrate with our Customer Support Triage API.
          </p>
        </div>
      </header>

      <main className="max-w-full px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-1/4 xl:w-1/5 shrink-0">
            <div className="sticky top-20 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg transition-colors duration-300 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                Navigation
              </h3>
              <nav>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#account-setup"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center py-2 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                    >
                      <ChevronRight size={18} className="mr-2 flex-shrink-0" />
                      Account Setup
                    </a>
                  </li>
                  <li>
                    <a
                      href="#creating-tickets"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center py-2 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                    >
                      <ChevronRight size={18} className="mr-2 flex-shrink-0" />
                      Creating Tickets
                    </a>
                  </li>
                  <li>
                    <a
                      href="#webhook-integration"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center py-2 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                    >
                      <ChevronRight size={18} className="mr-2 flex-shrink-0" />
                      Webhook Integration
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          <div className="lg:w-3/4 xl:w-4/5 min-w-0 overflow-hidden space-y-8">
            <Section
              id="account-setup"
              title="Account Setup"
              icon={<ShieldCheck size={28} />}
            >
              <p>
                To begin using the API, you first need an admin account and your
                company's API key.
              </p>
              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                1. Signing Up
              </h4>
              <p>
                If you don't have an account yet, please sign up through the
                main application portal. Ensure you are registered as an 'admin'
                for your company.
              </p>
              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                2. Obtaining Your API Key
              </h4>
              <p>
                Once logged in as an admin, you can find your company's API key
                on your Profile Page. Navigate to{" "}
                <RouterLink
                  to="/profile"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  My Profile
                </RouterLink>{" "}
                from the navbar (usually under your user icon).
              </p>
              <p className="mt-2">
                The API key is essential for authenticating your requests when
                creating tickets. Keep it secure and do not share it publicly.
              </p>
              <div className="mt-5 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-r-md">
                <p>
                  <strong className="font-semibold">Important:</strong> The API
                  key is tied to your company. All tickets created using this
                  key will be associated with your company.
                </p>
              </div>
            </Section>

            <Section
              id="creating-tickets"
              title="Creating Tickets via API"
              icon={<KeyRound size={28} />}
            >
              <p>
                You can create new customer support tickets programmatically by
                sending a POST request to our API endpoint.
              </p>
              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                Endpoint
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold bg-gray-200 px-3 py-1 rounded-md text-sm text-gray-700">
                  POST
                </span>
                <code className="bg-gray-100 text-red-600 px-3 py-1 rounded-md text-sm">
                  /api/tickets
                </code>
              </div>

              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                Request Payload (
                <code className="text-sm font-normal">application/json</code>)
              </h4>
              <p>
                The request body must be a JSON object with the following
                fields:
              </p>
              <ul className="list-disc list-inside my-4 space-y-3 pl-5">
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    customer_email
                  </code>{" "}
                  (string, <strong className="text-red-600">required</strong>):
                  The email address of the customer.
                </li>
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    subject
                  </code>{" "}
                  (string, <strong className="text-red-600">required</strong>):
                  The subject line of the ticket.
                </li>
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    initial_message_content
                  </code>{" "}
                  (string, <strong className="text-red-600">required</strong>):
                  The initial message from the customer.
                </li>
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    api_key
                  </code>{" "}
                  (string, <strong className="text-red-600">required</strong>):
                  Your company's API key.
                </li>
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    external_id
                  </code>{" "}
                  (string, optional): An optional external identifier for the
                  ticket.
                </li>
              </ul>
              <CodeBlock
                code={ticketCreateRequestExample}
                language="json"
                title="Example Request Body"
              />

              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                Response Payload (
                <code className="text-sm font-normal">application/json</code>)
              </h4>
              <p>
                Upon successful ticket creation (HTTP status{" "}
                <code className="font-mono bg-green-100 text-green-700 p-1 rounded text-sm">
                  201 Created
                </code>
                ), the API will return:
              </p>
              <ul className="list-disc list-inside my-4 space-y-3 pl-5">
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    ticket
                  </code>{" "}
                  (object): Detailed information about the created ticket.
                </li>
                <li>
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    ai_reply
                  </code>{" "}
                  (string, optional): The initial AI-generated reply, if
                  applicable. Can be{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    null
                  </code>
                  .
                </li>
              </ul>
              <CodeBlock
                code={ticketCreateResponseExample}
                language="json"
                title="Example Successful Response"
              />
              <p className="mt-3">
                The{" "}
                <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                  ticket.status
                </code>{" "}
                field indicates the initial state. The{" "}
                <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                  ticket.interactions
                </code>{" "}
                array will contain the initial customer complaint.
              </p>

              <h4 className="text-xl font-medium mt-8 mb-3 text-gray-700">
                Example API Requests
              </h4>
              <h5 className="text-lg font-medium mt-5 mb-2 text-gray-600">
                Using cURL
              </h5>
              <CodeBlock
                code={curlExample}
                language="bash"
                title="cURL Example"
              />
              <h5 className="text-lg font-medium mt-5 mb-2 text-gray-600">
                Using Python (
                <code className="text-sm font-normal">requests</code> library)
              </h5>
              <CodeBlock
                code={pythonExample}
                language="python"
                title="Python Example"
              />
            </Section>

            <Section
              id="webhook-integration"
              title="Webhook Integration"
              icon={<Link size={28} />}
            >
              <p>
                Configure a webhook URL to receive real-time notifications for
                ticket events, enabling your system to stay updated
                automatically.
              </p>

              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                1. Creating Your Webhook Endpoint
              </h4>
              <p>
                On your server, you need to create an HTTP POST endpoint that
                can receive JSON payloads. When a relevant event occurs in our
                system, we will send a POST request to your configured webhook
                URL.
              </p>
              <p className="mt-3">Your endpoint should be prepared to:</p>
              <ul className="list-disc list-inside my-4 space-y-3 pl-5">
                <li>
                  Accept{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    POST
                  </code>{" "}
                  requests with a{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    Content-Type
                  </code>{" "}
                  of{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    application/json
                  </code>
                  .
                </li>
                <li>
                  Parse the JSON payload. (Payload structures for specific
                  events will be documented soon.)
                </li>
                <li>
                  Respond with a{" "}
                  <code className="font-mono bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 p-1 rounded text-sm">
                    2XX
                  </code>{" "}
                  status code (e.g.,{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    200 OK
                  </code>
                  ) to acknowledge receipt. Non-2XX responses may trigger
                  retries.
                </li>
                <li>
                  Secure your endpoint (e.g., verify a shared secret if
                  implemented, or whitelist source IPs if applicable).
                </li>
              </ul>
              <div className="mt-5 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-r-md">
                <p>
                  <strong className="font-semibold">Note:</strong> Specific
                  events triggering webhooks and their detailed payload
                  structures are under active development and will be published
                  here shortly.
                </p>
              </div>

              <h4 className="text-xl font-medium mt-6 mb-3 text-gray-700">
                2. Updating Your Webhook URL in the Application
              </h4>
              <p>
                Once your webhook endpoint is ready, provide its URL to our
                system via your Profile Page:
              </p>
              <ol className="list-decimal list-inside my-4 space-y-3 pl-5">
                <li>
                  Navigate to{" "}
                  <RouterLink
                    to="/profile"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    My Profile
                  </RouterLink>
                  .
                </li>
                <li>Find the "API & Webhook Configuration" section.</li>
                <li>Locate the "Webhook URL" input field.</li>
                <li>
                  Enter the complete URL of your webhook endpoint (e.g.,{" "}
                  <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-sm">
                    https://your-server.com/webhook-receiver
                  </code>
                  ).
                </li>
                <li>Click the "Save Webhook" button.</li>
                <li>
                  To disable webhooks, clear the input field and save. The URL
                  will be removed from your company's settings.
                </li>
              </ol>
              <p className="mt-3">
                Our system will then use this URL for notifications related to
                your company's tickets.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 dark:bg-gray-900 text-gray-300 dark:text-gray-400 text-center py-8 mt-16 transition-colors duration-300">
        <p>
          &copy; {new Date().getFullYear()} AI Support Agent. All rights
          reserved.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Documentation last updated: {new Date().toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
};

export default AdminDocsPage;
