"""
Router for analytics endpoints.

Provides API endpoints for retrieving Key Performance Indicators (KPIs),
 ticket breakdowns by status and category, resolution trends, and agent performance.
Access to analytics data is role-based.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, case, text, desc
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import column
from app import models
from app.database import SessionLocal
from routers.auth import get_current_user
from pydantic import BaseModel
import uuid

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

# --- Pydantic Schemas for Analytics Responses ---
class TrendData(BaseModel):
    direction: str
    value: int

class KpiResponse(BaseModel):
    total_tickets: int = 0
    pending_tickets: int = 0
    ai_solved: int = 0
    manually_solved: int = 0
    critical_tickets: int = 0
    avg_resolution_time_hours: Optional[float] = None
    totalTrend: Optional[TrendData] = None
    pendingTrend: Optional[TrendData] = None
    criticalTrend: Optional[TrendData] = None
    aiSolvedTrend: Optional[TrendData] = None
    manualSolvedTrend: Optional[TrendData] = None
    avgResolutionTimeTrend: Optional[TrendData] = None

class StatusCount(BaseModel):
    status: models.TicketStatusEnum
    count: int

class CategoryCount(BaseModel):
    category: Optional[str]
    count: int

# --- Pydantic Schemas for SuperAdmin Analytics ---
class CompanyTokenUsage(BaseModel):
    company_id: uuid.UUID
    company_name: str
    total_tokens_used: int

class CompanyActivity(BaseModel):
    company_id: uuid.UUID
    company_name: str
    tickets_created_count: int
    total_interactions_count: int
# --- End Pydantic Schemas ---

# --- Pydantic Schema for Detailed Company Token Usage ---
class DetailedCompanyTokenUsageResponse(BaseModel):
    company_id: uuid.UUID
    company_name: str
    tokens_today: int
    tokens_this_month: int
    tokens_lifetime: int

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def apply_role_filters(query, current_user: models.User, company_id: Optional[str] = None, department_id: Optional[str] = None):
    """Applies role-based filters to analytics SQLAlchemy queries.

    Args:
        query: The SQLAlchemy query object.
        current_user: The currently authenticated user model.
        company_id: Optional Company ID to filter by (for SuperAdmins).
        department_id: Optional department ID to filter by (for Admins).

    Returns:
        The filtered SQLAlchemy query object.
    """
    if current_user.role == models.UserRoleEnum.superAdmin:
        if company_id:
            query = query.filter(models.Ticket.company_id == company_id)
    elif current_user.role == models.UserRoleEnum.admin:
        query = query.filter(models.Ticket.company_id == current_user.company_id)
        if department_id:
            query = query.filter(models.Ticket.assigned_department_id == department_id)
    else:
        query = query.filter(
            models.Ticket.company_id == current_user.company_id,
            models.Ticket.assigned_department_id == current_user.department_id
        )
    return query

def calculate_trend(current_value: float, previous_value: float) -> Optional[Dict[str, Any]]:
    """Calculates the percentage trend change between two values.

    Args:
        current_value: The current period's value.
        previous_value: The previous period's value.

    Returns:
        A dictionary with 'direction' ('up' or 'down') and 'value' (abs percentage),
        or None if previous_value is zero or None.
    """
    if previous_value is None or previous_value == 0:
        return None
    if current_value is None:
        current_value = 0 # Treat None as 0 for trend calculation if previous exists
        
    change = ((current_value - previous_value) / previous_value) * 100
    return {
        "direction": "up" if change >= 0 else "down",
        "value": abs(round(change))
    }

@router.get("/kpis", response_model=KpiResponse)
async def get_kpis(
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves Key Performance Indicators (KPIs) for tickets.
    
    Calculates total tickets, pending tickets, AI solved, manually solved,
    critical tickets, and average resolution time for a given period and a
    previous period to show trends.
    """
    final_start_date: datetime
    final_end_date: datetime

    # Frontend is expected to always send start_date and end_date.
    # Fallback if not provided (should ideally not be hit with current UI).
    if start_date is None or end_date is None:
        _default_end_dt = datetime.now()
        final_end_date = datetime(_default_end_dt.year, _default_end_dt.month, _default_end_dt.day, 23, 59, 59, 999999)
        # Default to a 30-day period inclusive of today
        final_start_date = datetime(_default_end_dt.year, _default_end_dt.month, _default_end_dt.day, 0, 0, 0) - timedelta(days=29)
    else:
        final_start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
        final_end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)

    if final_end_date < final_start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")

    # Calculate the number of days in the selected period for previous period calculation
    num_days_in_period = (final_end_date.date() - final_start_date.date()).days + 1

    # Define the previous period
    prev_period_end_date = final_start_date - timedelta(microseconds=1)
    prev_period_start_date = final_start_date - timedelta(days=num_days_in_period)

    def get_period_kpis_values(query_start_date: datetime, query_end_date: datetime):
        """Helper to fetch KPI values for a specific period."""
        period_query = db.query(models.Ticket)
        period_query = apply_role_filters(period_query, current_user, company_id, department_id)
        period_query = period_query.filter(models.Ticket.created_at.between(query_start_date, query_end_date))

        kpi_results = period_query.with_entities(
            func.count(models.Ticket.id).label('total_tickets'),
            func.sum(case(
                (models.Ticket.status.in_([
                    models.TicketStatusEnum.new,
                    models.TicketStatusEnum.ai_processing,
                    models.TicketStatusEnum.customer_replied,
                    models.TicketStatusEnum.pending_admin_review,
                    models.TicketStatusEnum.critical_routed
                ]), 1),
                else_=0
            )).label('pending_tickets'),
            func.sum(case(
                (models.Ticket.status == models.TicketStatusEnum.resolved_by_ai, 1),
                else_=0
            )).label('ai_solved'),
            func.sum(case(
                (models.Ticket.status == models.TicketStatusEnum.resolved_manually, 1),
                else_=0
            )).label('manually_solved'),
            func.sum(case(
                (models.Ticket.priority == models.PriorityEnum.Critical, 1),
                else_=0
            )).label('critical_tickets'),
            func.avg(
                case(
                    (models.Ticket.status.in_([models.TicketStatusEnum.resolved_by_ai, models.TicketStatusEnum.resolved_manually]),
                     func.extract('epoch', models.Ticket.updated_at - models.Ticket.created_at) / 3600),
                    else_=None
                )
            ).label('avg_resolution_time_hours')
        ).one_or_none()
        
        return kpi_results if kpi_results else (0,0,0,0,0,None)

    current_kpis_tuple = get_period_kpis_values(final_start_date, final_end_date)
    previous_kpis_tuple = get_period_kpis_values(prev_period_start_date, prev_period_end_date)

    current_kpis = {
        'total_tickets': current_kpis_tuple[0],
        'pending_tickets': current_kpis_tuple[1],
        'ai_solved': current_kpis_tuple[2],
        'manually_solved': current_kpis_tuple[3],
        'critical_tickets': current_kpis_tuple[4],
        'avg_resolution_time_hours': current_kpis_tuple[5]
    }
    previous_kpis = {
        'total_tickets': previous_kpis_tuple[0],
        'pending_tickets': previous_kpis_tuple[1],
        'ai_solved': previous_kpis_tuple[2],
        'manually_solved': previous_kpis_tuple[3],
        'critical_tickets': previous_kpis_tuple[4],
        'avg_resolution_time_hours': previous_kpis_tuple[5]
    }

    avg_res_time_current = current_kpis['avg_resolution_time_hours']
    avg_res_time_previous = previous_kpis['avg_resolution_time_hours']

    return KpiResponse(
        total_tickets=current_kpis.get('total_tickets',0),
        pending_tickets=current_kpis.get('pending_tickets', 0),
        ai_solved=current_kpis.get('ai_solved', 0),
        manually_solved=current_kpis.get('manually_solved', 0),
        critical_tickets=current_kpis.get('critical_tickets', 0),
        avg_resolution_time_hours=round(avg_res_time_current, 2) if avg_res_time_current is not None else None,
        totalTrend=calculate_trend(current_kpis['total_tickets'], previous_kpis['total_tickets']),
        pendingTrend=calculate_trend(current_kpis['pending_tickets'], previous_kpis['pending_tickets']),
        criticalTrend=calculate_trend(current_kpis['critical_tickets'], previous_kpis['critical_tickets']),
        aiSolvedTrend=calculate_trend(current_kpis['ai_solved'], previous_kpis['ai_solved']),
        manualSolvedTrend=calculate_trend(current_kpis['manually_solved'], previous_kpis['manually_solved']),
        avgResolutionTimeTrend=calculate_trend(avg_res_time_current, avg_res_time_previous)
    )

@router.get("/tickets-by-status", response_model=Dict[str, int])
async def get_tickets_by_status(
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the count of tickets grouped by their current status."""
    final_start_date: Optional[datetime] = None
    final_end_date: Optional[datetime] = None

    if start_date:
        final_start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    if end_date:
        final_end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)

    if final_start_date and final_end_date and final_end_date < final_start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")

    query = db.query(
        models.Ticket.status,
        func.count(models.Ticket.id).label('count')
    )
    
    query = apply_role_filters(query, current_user, company_id, department_id)
    
    if final_start_date:
        query = query.filter(models.Ticket.created_at >= final_start_date)
    if final_end_date:
        query = query.filter(models.Ticket.created_at <= final_end_date)
    
    results = query.group_by(models.Ticket.status).all()
    
    return {
        status.value: count 
        for status, count in results
    }

@router.get("/tickets-by-category", response_model=List[CategoryCount])
async def get_tickets_by_category(
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the count of tickets grouped by their AI-assigned category."""
    final_start_date: Optional[datetime] = None
    final_end_date: Optional[datetime] = None

    if start_date:
        final_start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    if end_date:
        final_end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)

    if final_start_date and final_end_date and final_end_date < final_start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")
        
    query = db.query(
        models.Ticket.category,
        func.count(models.Ticket.id).label('count')
    )
    
    query = apply_role_filters(query, current_user, company_id, department_id)
    
    if final_start_date:
        query = query.filter(models.Ticket.created_at >= final_start_date)
    if final_end_date:
        query = query.filter(models.Ticket.created_at <= final_end_date)
    
    results = query.group_by(models.Ticket.category).all()
    
    return [CategoryCount(category=category, count=count) for category, count in results]

@router.get("/resolution-trends")
async def get_resolution_trends(
    interval: str = "day",
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves ticket resolution trends over a specified interval (day, week, month),
    based on the ticket's resolution date (updated_at when status changed to resolved)."""
    if interval not in ["day", "week", "month"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interval must be 'day', 'week', or 'month'"
        )

    final_start_date: datetime
    final_end_date: datetime

    if end_date is None:
        _default_end_dt = datetime.now()
        final_end_date = datetime(_default_end_dt.year, _default_end_dt.month, _default_end_dt.day, 23, 59, 59, 999999)
    else:
        final_end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)

    if start_date is None:
        # Default start_date based on interval, calculated from final_end_date (which is set by now)
        if interval == "day":
            # Go back 29 days from the start of the final_end_date's day to get a 30-day period
            final_start_date = datetime(final_end_date.year, final_end_date.month, final_end_date.day, 0, 0, 0) - timedelta(days=29)
        elif interval == "week":
            # Go back 12 weeks from final_end_date, then find the Monday of that week.
            # This ensures the period ends on final_end_date and starts on a Monday approx 12 weeks prior.
            approx_start_date = final_end_date - timedelta(weeks=12)
            final_start_date = approx_start_date - timedelta(days=approx_start_date.weekday()) # Monday is 0
            final_start_date = datetime(final_start_date.year, final_start_date.month, final_start_date.day, 0, 0, 0)
        else: # month
            # Go back 12 months (approximated by 365 days), then find the 1st day of that month.
            # This is a rough approximation for a year. For true month arithmetic, dateutil.relativedelta is better.
            approx_start_date = final_end_date - timedelta(days=365)
            final_start_date = datetime(approx_start_date.year, approx_start_date.month, 1, 0, 0, 0)
    else:
        final_start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    
    # Ensure final_start_date is not after final_end_date after all calculations
    if final_end_date < final_start_date:
         # This can happen if provided start_date is after default-calculated end_date, or vice-versa with defaults.
         # Or if default calculations lead to this state (e.g. month calc going too far for a specific end_date near start of year)
        raise HTTPException(status_code=400, detail="Calculated start date is after end date. Please adjust filter range.")

    date_trunc_str = interval 

    query = db.query(
        func.date_trunc(date_trunc_str, models.Ticket.updated_at).label('date'),
        func.count(models.Ticket.id).label('resolved_count'),
        func.sum(case((models.Ticket.status == models.TicketStatusEnum.resolved_by_ai, 1), else_=0)).label('ai_solved_count'),
        func.sum(case((models.Ticket.status == models.TicketStatusEnum.resolved_manually, 1), else_=0)).label('manually_solved_count')
    ).filter(
        models.Ticket.status.in_([
            models.TicketStatusEnum.resolved_by_ai,
            models.TicketStatusEnum.resolved_manually
        ])
    )

    query = apply_role_filters(query, current_user, company_id, department_id)
    query = query.filter(models.Ticket.updated_at.between(final_start_date, final_end_date))
    
    results = query.group_by(text('date')).order_by(text('date')).all()

    return [
        {
            "date": result.date.strftime("%Y-%m-%d"),
            "resolved_count": result.resolved_count or 0,
            "ai_solved_count": result.ai_solved_count or 0,
            "manually_solved_count": result.manually_solved_count or 0
        }
        for result in results
    ]

@router.get("/agent-performance")
async def get_agent_performance(
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None, # Specific agent ID
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Retrieves performance metrics for support agents (users).
    
    Metrics include tickets assigned, resolved, and average resolution time.
    Can be filtered by a specific agent (user_id).
    """
    query = db.query(
        models.User.id.label("user_id"),
        models.User.username.label("agent_name"),
        models.User.email.label("agent_email"),
        models.Department.name.label("department_name"),
        func.count(models.Ticket.id).label("total_assigned_tickets"),
        func.sum(case((models.Ticket.status.in_([
            models.TicketStatusEnum.resolved_by_ai, 
            models.TicketStatusEnum.resolved_manually
            ]), 1), else_=0)).label("total_resolved_tickets"),
        func.avg(case((
            models.Ticket.status.in_([
                models.TicketStatusEnum.resolved_by_ai, 
                models.TicketStatusEnum.resolved_manually
            ]), 
            func.extract('epoch', models.Ticket.updated_at - models.Ticket.created_at) / 3600
        ), else_=None)).label("avg_resolution_time_hours")
    ).join(models.Ticket, models.User.id == models.Ticket.assigned_user_id, isouter=True)\
    .join(models.Department, models.User.department_id == models.Department.id, isouter=True)

    if current_user.role == models.UserRoleEnum.superAdmin:
        if company_id:
            query = query.filter(models.User.company_id == company_id)
    elif current_user.role == models.UserRoleEnum.admin:
        query = query.filter(models.User.company_id == current_user.company_id)
        if department_id:
            query = query.filter(models.User.department_id == department_id)
    elif current_user.role == models.UserRoleEnum.employee: 
        query = query.filter(models.User.department_id == current_user.department_id)
    
    if user_id:
        query = query.filter(models.User.id == user_id)

    final_start_date: Optional[datetime] = None
    final_end_date: Optional[datetime] = None

    if start_date:
        final_start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    if end_date:
        final_end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999)

    if final_start_date and final_end_date and final_end_date < final_start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")

    if final_start_date:
        query = query.filter(models.Ticket.created_at >= final_start_date)
    if final_end_date:
        query = query.filter(models.Ticket.created_at <= final_end_date)

    results = query.group_by(models.User.id, models.User.username, models.User.email, models.Department.name).order_by(desc("total_resolved_tickets")).all()

    return [
        {
            "user_id": str(r.user_id),
            "username": r.agent_name,
            "email": r.agent_email,
            "department": r.department_name or "N/A",
            "tickets_assigned": r.total_assigned_tickets or 0,
            "tickets_solved": r.total_resolved_tickets or 0,
            "avg_resolution_time": r.avg_resolution_time_hours,
            "resolution_rate": ((r.total_resolved_tickets or 0) / (r.total_assigned_tickets or 1)) * 100 if (r.total_assigned_tickets or 0) > 0 else 0
        }
        for r in results
    ]

# --- SuperAdmin Analytics Endpoints ---

@router.get("/superadmin/token-usage-by-company", response_model=List[CompanyTokenUsage])
async def get_token_usage_by_company(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves total token usage for each company. SuperAdmin access only.
    Allows filtering by date range (inclusive).
    """
    if current_user.role != models.UserRoleEnum.superAdmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    query = db.query(
        models.Company.id.label("company_id"),
        models.Company.name.label("company_name"),
        func.sum(models.TokenUsage.tokens_used).label("total_tokens_used")
    ).join(models.TokenUsage, models.Company.id == models.TokenUsage.company_id)

    if start_date:
        query = query.filter(models.TokenUsage.date >= start_date.date())
    if end_date:
        query = query.filter(models.TokenUsage.date <= end_date.date())

    results = query.group_by(models.Company.id, models.Company.name).order_by(desc("total_tokens_used")).all()
    
    return results


@router.get("/superadmin/activity-by-company", response_model=List[CompanyActivity])
async def get_activity_by_company(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves ticket creation counts and total interaction counts for each company.
    SuperAdmin access only. Allows filtering by date range (inclusive) based on ticket creation.
    """
    if current_user.role != models.UserRoleEnum.superAdmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Subquery to count interactions per ticket
    interactions_subquery = db.query(
        models.TicketInteraction.ticket_id,
        func.count(models.TicketInteraction.id).label("interactions_count")
    ).group_by(models.TicketInteraction.ticket_id).subquery()

    query = db.query(
        models.Company.id.label("company_id"),
        models.Company.name.label("company_name"),
        func.count(models.Ticket.id).label("tickets_created_count"),
        func.sum(func.coalesce(interactions_subquery.c.interactions_count, 0)).label("total_interactions_count")
    ).outerjoin(models.Ticket, models.Company.id == models.Ticket.company_id)\
     .outerjoin(interactions_subquery, models.Ticket.id == interactions_subquery.c.ticket_id)
    
    # Date filtering on ticket creation date
    if start_date:
        query = query.filter(models.Ticket.created_at >= start_date)
    if end_date:
        # Ensure end_date covers the whole day if only date is provided
        _end_date = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999) if end_date else None
        if _end_date:
            query = query.filter(models.Ticket.created_at <= _end_date)

    results = query.group_by(
        models.Company.id, 
        models.Company.name
    ).order_by(models.Company.name).all()
    
    # This will include companies with no tickets (ticket_count = 0, interaction_count = 0)
    # due to the outer join.
    return results

@router.get("/company-token-usage/{company_id}", response_model=DetailedCompanyTokenUsageResponse)
async def get_detailed_company_token_usage(
    company_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves detailed token usage (today, this_month, lifetime) for a specific company.
    Accessible by SuperAdmins, or Admins for their own company.
    """
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Permission check
    if current_user.role == models.UserRoleEnum.admin and current_user.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin can only access their own company\'s token usage.")
    elif current_user.role not in [models.UserRoleEnum.superAdmin, models.UserRoleEnum.admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access token usage for this company.")

    today_date = datetime.now().date()
    start_of_month = today_date.replace(day=1)

    # Tokens Today
    tokens_today_result = db.query(func.sum(models.TokenUsage.tokens_used)).filter(
        models.TokenUsage.company_id == company_id,
        models.TokenUsage.date == today_date # Assuming TokenUsage has a \'date\' field of type date
    ).scalar()
    tokens_today = tokens_today_result or 0

    # Tokens This Month
    tokens_this_month_result = db.query(func.sum(models.TokenUsage.tokens_used)).filter(
        models.TokenUsage.company_id == company_id,
        models.TokenUsage.date >= start_of_month,
        models.TokenUsage.date <= today_date
    ).scalar()
    tokens_this_month = tokens_this_month_result or 0
    
    # Tokens Lifetime
    tokens_lifetime_result = db.query(func.sum(models.TokenUsage.tokens_used)).filter(
        models.TokenUsage.company_id == company_id
    ).scalar()
    tokens_lifetime = tokens_lifetime_result or 0
    
    return DetailedCompanyTokenUsageResponse(
        company_id=company.id,
        company_name=company.name,
        tokens_today=tokens_today,
        tokens_this_month=tokens_this_month,
        tokens_lifetime=tokens_lifetime
    )
