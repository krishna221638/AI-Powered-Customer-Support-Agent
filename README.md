# 🤖 AI-Powered Customer Support System

A sophisticated multi-tenant SaaS platform that revolutionizes customer support with intelligent AI assistance, automated ticket classification, and seamless team collaboration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.12+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [User Roles](#-user-roles)
- [AI Capabilities](#-ai-capabilities)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Functionality

- **Multi-tenant SaaS Architecture**: Complete company isolation and data security
- **AI-Powered Support**: Intelligent ticket classification and automated responses
- **Smart Escalation**: Automatic detection of critical/sensitive issues
- **Real-time Analytics**: Comprehensive performance metrics and insights
- **Team Management**: Hierarchical role-based access control
- **Email Integration**: Seamless customer communication workflow

### 🤖 AI Capabilities

- **Flexible LLM Support**: Originally built with DeepSeek local model, now supports Google Gemini API
- **RAG Implementation**: Retrieval-Augmented Generation with vector database for accurate responses
- **Automatic Classification**: Smart categorization of tickets by priority and department
- **Context-Aware Responses**: Vector database integration for relevant knowledge retrieval
- **Sentiment Analysis**: Emotional intelligence for appropriate response tone
- **Smart Escalation**: Identifies legal threats, data breaches, and sensitive issues

### 📊 Analytics & Reporting

- **Performance Dashboards**: Real-time metrics for admins and employees
- **Ticket Analytics**: Volume trends, resolution times, and satisfaction metrics
- **Agent Performance**: Individual and team productivity insights
- **AI Effectiveness**: Track AI suggestion accuracy and usage rates

## 🛠 Tech Stack

### Backend

- **Framework**: FastAPI 0.100+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI Engine**: DeepSeek local model (original) / Google Gemini API via LangChain
- **RAG System**: Retrieval-Augmented Generation with pgvector for semantic search
- **Vector DB**: pgvector for knowledge base and context retrieval
- **Authentication**: JWT with bcrypt password hashing
- **API Docs**: Automatic OpenAPI/Swagger documentation

### Frontend

- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: Zustand for global state
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **UI Components**: Custom responsive design system

### DevOps & Infrastructure

- **Development**: Hot reload with Uvicorn and Vite
- **Database**: PostgreSQL with migration support
- **Environment**: Python virtual environments
- **API Testing**: Built-in Swagger UI

## 🏗 Architecture

```mermaid
graph TB
    A[Customer] -->|Creates Ticket| B[FastAPI Backend]
    B -->|RAG Query| E[Vector Database]
    E -->|Relevant Context| C[AI Model - DeepSeek/Gemini]
    B -->|AI Classification| C
    B -->|Store Data| D[PostgreSQL]

    F[Admin Dashboard] -->|Manages| B
    G[Employee Dashboard] -->|Handles Tickets| B
    H[SuperAdmin Panel] -->|Platform Control| B

    B -->|Auto Reply| A
    B -->|Email Notifications| I[Email Service]

    C -->|Smart Responses| B
    E -->|Knowledge Base| J[RAG System]
```

## 🚀 Installation

### Prerequisites

- **Python**: 3.12 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: 13 or higher
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd "AI powered customer Support Agent System"
   ```

2. **Set up Python environment**

   ```bash
   cd Server
   python -m venv venv

   # Windows
   .\venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Database setup**

   ```bash
   # Create PostgreSQL database
   createdb ai_support_system

   # Run migrations (if available)
   alembic upgrade head
   ```

5. **Environment configuration**

   ```bash
   # Create .env file
   cp .env.example .env

   # Edit .env with your configuration
   DATABASE_URL=postgresql://username:password@localhost/ai_support_system
   GOOGLE_API_KEY=your_gemini_api_key_here
   SECRET_KEY=your_jwt_secret_key
   ```

6. **Start the backend server**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   Server will run on `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to Frontend directory**

   ```bash
   cd ../Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the Server directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/ai_support_system

# AI Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-flash-latest  # or deepseek-local for local inference
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
VECTOR_DIMENSION=1536

# Authentication
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Development
DEBUG=true
LOG_LEVEL=info
```

### Database Schema

The system automatically creates the necessary tables:

- **users**: User accounts with role-based access
- **companies**: Multi-tenant company data
- **departments**: Organizational structure
- **tickets**: Customer support requests
- **ticket_interactions**: Conversation history
- **knowledge_base**: AI training data

## 📖 Usage

### Initial Setup

1. **Create SuperAdmin Account**

   ```bash
   # POST /auth/register-superadmin
   {
     "username": "admin",
     "email": "admin@yourplatform.com",
     "password": "secure_password"
   }
   ```

2. **Create Company Account**

   ```bash
   # POST /auth/register-user
   {
     "username": "company_admin",
     "email": "admin@company.com",
     "password": "company_password",
     "company_name": "Acme Corp",
   }
   ```

3. **Access the Platform**
   - SuperAdmin: `http://localhost:5173/admin/select-company`
   - Company Admin: `http://localhost:5173/admin/analytics-dashboard`
   - Employee: `http://localhost:5173/employee/dashboard`

### Creating Tickets

**Via API:**

```bash
curl -X POST "http://127.0.0.1:8000/tickets" \
  -H "X-API-Key: your-company-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_email": "customer@example.com",
    "subject": "Password Reset Issue",
    "initial_message_content": "I cannot reset my password using the forgot password link."
  }'
```

**Via Admin Panel:**
Navigate to `/admin/dummy-create-ticket` for testing purposes.

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/register-user` - Company admin registration
- `POST /auth/register-employee` - Employee registration
- `POST /auth/register-superadmin` - Platform admin registration
- `GET /auth/me` - Current user info

### Ticket Management

- `GET /tickets` - List tickets (filtered by role)
- `POST /tickets` - Create new ticket
- `GET /tickets/{ticket_id}` - Get ticket details
- `POST /tickets/{ticket_id}/generate-ai-reply` - Generate AI response
- `POST /tickets/{ticket_id}/reply` - Send reply to customer

### Analytics

- `GET /analytics/kpis` - Key performance indicators
- `GET /analytics/tickets-by-status` - Ticket status distribution
- `GET /analytics/agent-performance` - Team performance metrics

**Full API documentation available at:** `http://127.0.0.1:8000/docs`

## 👥 User Roles

### 🔴 SuperAdmin (Platform Owner)

**Capabilities:**

- ✅ Global system control across all companies
- ✅ Company management and billing oversight
- ✅ Platform-wide analytics and monitoring
- ✅ Cross-company user management

**Access:** Company selection dashboard, system-wide controls

### 🟠 Admin (Company Owner)

**Capabilities:**

- ✅ Company dashboard and analytics
- ✅ Employee and department management
- ✅ All company tickets access
- ✅ AI configuration and settings
- ✅ Critical issue escalation handling

**Access:** Company-specific admin panels, team management

### 🟡 Employee (Support Agent)

**Capabilities:**

- ✅ Assigned ticket handling
- ✅ AI-assisted response generation
- ✅ Customer communication
- ✅ Ticket status management
- ✅ Department collaboration

**Access:** Employee dashboard, assigned tickets only

### 🟢 Customer (End User)

**Capabilities:**

- ✅ Ticket creation and submission
- ✅ Own ticket history viewing
- ✅ Response to support messages
- ✅ Ticket status tracking

**Access:** Customer portal, own tickets only

## 🤖 AI Capabilities

### Smart Classification

- **Priority Detection**: Automatically assigns Critical, High, Medium, Low priorities
- **Category Assignment**: Routes tickets to appropriate departments
- **Sentiment Analysis**: Detects frustrated or satisfied customers
- **Language Detection**: Supports multiple languages

### Intelligent Responses & RAG

- **RAG Architecture**: Retrieval-Augmented Generation for fact-based responses
- **Vector Search**: Semantic similarity search through knowledge base using pgvector
- **Context Awareness**: Uses conversation history for relevant replies
- **Knowledge Base Integration**: Searches vector database for accurate information
- **Tone Matching**: Adapts response style to customer sentiment
- **Template Generation**: Creates consistent, professional responses

### Escalation Logic

```python
# Critical triggers that bypass AI auto-reply:
CRITICAL_KEYWORDS = [
    "lawsuit", "legal action", "data breach",
    "security vulnerability", "harassment",
    "fraud", "stolen data", "privacy violation"
]
```

### AI Model Configuration

```python
# Flexible AI setup - supports multiple models
MODEL = "gemini-flash-latest"  # Current: Gemini API
# MODEL = "deepseek-local"     # Original: DeepSeek local model

TEMPERATURE = 0.7  # Balance creativity and accuracy
MAX_TOKENS = 1000  # Response length limit
TOP_P = 0.8       # Token selection diversity

# RAG Configuration
RAG_TOP_K = 5      # Number of relevant documents to retrieve
RAG_THRESHOLD = 0.7 # Similarity threshold for context relevance
```

## 🧪 Testing

### Backend Testing

```bash
cd Server
python -m pytest tests/
```

### Frontend Testing

```bash
cd Frontend
npm run test
```

### API Testing

Use the built-in Swagger UI at `http://127.0.0.1:8000/docs` for interactive testing.

## 🔧 Development

### Code Structure

```
Server/
├── app/
│   ├── main.py          # FastAPI application entry
│   ├── models.py        # Database models
│   ├── schemas.py       # Pydantic schemas
│   └── database.py      # Database connection
├── routers/             # API endpoints
├── agent/               # AI integration
└── scripts/             # Utility scripts

Frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route components
│   ├── services/        # API clients
│   └── stores/          # State management
└── public/              # Static assets
```

### Adding New Features

1. **Backend**: Add endpoints in `routers/`, update models in `app/models.py`
2. **Frontend**: Create components in `components/`, add routes in `App.tsx`
3. **AI**: Extend prompts and logic in `agent/generate.py`
4. **Database**: Create migrations for schema changes

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript for all React components
- Write tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:

- **Documentation**: Check this README and API docs
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions

## 🚀 Roadmap

- [ ] **Email Integration**: SMTP/SendGrid integration for customer notifications
- [ ] **File Uploads**: Support for customer attachments
- [ ] **Multi-language Support**: Internationalization for global deployment
- [ ] **Mobile App**: React Native customer app
- [ ] **Advanced Analytics**: Machine learning insights and predictions
- [ ] **Integration APIs**: Slack, Teams, and webhook integrations
- [ ] **White-label Solution**: Customizable branding for resellers

---

**Built with ❤️ for exceptional customer support experiences**
