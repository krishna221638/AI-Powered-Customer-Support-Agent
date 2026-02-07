import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, ForeignKey,
    DateTime, Enum, UniqueConstraint, Integer, Date
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base
import enum, string, secrets

# --- Enums ---

class UserRoleEnum(str, enum.Enum):
    superAdmin = "superAdmin"
    admin = "admin"
    employee = "employee"

class TicketStatusEnum(str, enum.Enum):
    new = "new"
    ai_processing = "ai_processing"
    ai_replied = "ai_replied"
    customer_replied = "customer_replied"
    pending_admin_review = "pending_admin_review"
    critical_routed = "critical_routed"
    resolved_by_ai = "resolved_by_ai"
    resolved_manually = "resolved_manually"
    closed = "closed"
    # TODO: Add status for escalated tickets
    # TODO: Implement status for tickets requiring external validation
    # TODO: Add status tracking for ticket reassignment

class PriorityEnum(str, enum.Enum):
    Critical = "Critical"
    High = "High"
    Medium = "Medium"
    Low = "Low"

class InteractionTypeEnum(str, enum.Enum):
    customer_complaint = "customer_complaint"
    ai_reply = "ai_reply"
    customer_reply = "customer_reply"
    admin_reply = "admin_reply"
    system_event_critical_route = "system_event_critical_route"
    admin_reroute = "admin_reroute"
    internal_note = "internal_note"
    system_event_ticket_created = "system_event_ticket_created"
    system_event_ai_classified = "system_event_ai_classified"

# --- Core Tables ---

class Company(Base):
    __tablename__ = 'companies'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    api_key = Column(String, unique=True, nullable=False)
    max_tokens = Column(Integer, nullable=False, default=1000000) 
    webhook_url = Column(String, nullable=True)

    departments = relationship("Department", back_populates="company", cascade="all, delete-orphan")
    users = relationship("User", back_populates="company_obj", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="company_obj", cascade="all, delete-orphan")
    token_usages = relationship("TokenUsage", back_populates="company", cascade="all, delete-orphan")


    @staticmethod
    def generate_api_key(length: int = 40) -> str:
        """Generates a secure random API key."""
        characters = string.ascii_letters + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))



class Department(Base):
    __tablename__ = 'departments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint('name', 'company_id', name='_name_company_uc'),)

    company = relationship("Company", back_populates="departments")
    users = relationship("User", back_populates="department_obj") 
    tickets = relationship("Ticket", back_populates="assigned_department")



class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(Enum(UserRoleEnum, name='user_role_enum'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True)  # fixed here
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    company_obj = relationship("Company", back_populates="users", foreign_keys=[company_id])
    department_obj = relationship("Department", back_populates="users", foreign_keys=[department_id])
    assigned_tickets = relationship("Ticket", back_populates="assignee")


class Ticket(Base):
    __tablename__ = 'tickets'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String, nullable=True)
    subject = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    customer_email = Column(String, nullable=False)
    status = Column(Enum(TicketStatusEnum, name='ticket_status_enum'), default=TicketStatusEnum.new, nullable=False)
    category = Column(String, nullable=True)
    ai_solvable_prediction = Column(Boolean, nullable=True)
    sentiment = Column(String, nullable=True)
    priority = Column(Enum(PriorityEnum, name='priority_enum'), nullable=True)
    is_potential_continuation = Column(Boolean, default=False, nullable=False)

    assigned_department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'), nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    last_customer_interaction_at = Column(DateTime, nullable=True)
    last_agent_interaction_at = Column(DateTime, nullable=True)

    company_obj = relationship("Company", back_populates="tickets", foreign_keys=[company_id])
    assigned_department = relationship("Department", back_populates="tickets", foreign_keys=[assigned_department_id])
    assignee = relationship("User", back_populates="assigned_tickets", foreign_keys=[assigned_user_id])
    interactions = relationship("TicketInteraction", back_populates="ticket", cascade="all, delete-orphan")


class TicketInteraction(Base):
    __tablename__ = 'ticket_interactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False)
    interaction_type = Column(Enum(InteractionTypeEnum, name='interaction_type_enum', create_type=False), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    metadata_json = Column(Text, nullable=True)

    ticket = relationship("Ticket", back_populates="interactions")

class TokenUsage(Base):
    __tablename__ = 'token_usage'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    date = Column(Date, default=func.current_date(), nullable=False)
    tokens_used = Column(Integer, nullable=False, default=0)

    company = relationship("Company", back_populates="token_usages")

    __table_args__ = (
        UniqueConstraint('company_id', 'date', name='unique_company_date'),
    )

    @staticmethod
    def add_token_usage(session, company_id: uuid.UUID, tokens: int):
        """Adds or updates token usage for the current day.
        The session is not committed here; caller should handle commit.
        """
        today = func.current_date()

        usage = session.query(TokenUsage).filter_by(company_id=company_id, date=today).first()
        if usage:
            usage.tokens_used += tokens
        else:
            usage = TokenUsage(
                company_id=company_id,
                tokens_used=tokens,
                date=today
            )
            session.add(usage)

        # session.commit() # Caller should handle the commit
        return usage

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    User_complaint = Column(Text, nullable=False)
    Reply = Column(Text, nullable=False)
    Category = Column(String(50), nullable=True)
    Tags = Column(ARRAY(String), nullable=True)
    Sector = Column(String(50), nullable=True)
    vector_embedding = Column(Vector(768), nullable=False)
