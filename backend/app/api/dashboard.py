from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy import func
from ..database import get_db
from ..models import Client, Object, FinanceTransaction, ClientStatusEnum, SegmentEnum, User
from .auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(cash_register: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. New leads count (status = "Новый")
    new_leads = db.query(Client).filter(Client.status == ClientStatusEnum.new).count()
    
    # 2. Active projects count (objects with status = "В работе")
    active_projects = db.query(Object).filter(Object.status == "В работе").count()
    
    # 3. Monthly revenue (sum of income transactions in the current calendar month)
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    monthly_revenue_filters = [
        FinanceTransaction.transaction_type == "income",
        FinanceTransaction.date >= start_of_month
    ]
    if cash_register:
        monthly_revenue_filters.append(FinanceTransaction.cash_register == cash_register)
        
    monthly_revenue_query = db.query(func.sum(FinanceTransaction.amount)).filter(*monthly_revenue_filters).scalar()
    monthly_revenue = monthly_revenue_query if monthly_revenue_query is not None else 0.0
    
    # 4. Conversion rate: completed clients vs total clients
    total_clients = db.query(Client).count()
    completed_clients = db.query(Client).filter(Client.status == ClientStatusEnum.completed).count()
    conversion = round((completed_clients / total_clients) * 100, 1) if total_clients > 0 else 0.0
    
    # 5. Monthly finance chart data (last 6 months)
    months_ru = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    chart_data = []
    
    # Generate list of past 6 months
    for i in range(5, -1, -1):
        temp_date = now - timedelta(days=30 * i)
        m_start = datetime(temp_date.year, temp_date.month, 1)
        if temp_date.month == 12:
            m_end = datetime(temp_date.year + 1, 1, 1)
        else:
            m_end = datetime(temp_date.year, temp_date.month + 1, 1)
            
        income_filters = [
            FinanceTransaction.transaction_type == "income",
            FinanceTransaction.date >= m_start,
            FinanceTransaction.date < m_end
        ]
        expense_filters = [
            FinanceTransaction.transaction_type == "expense",
            FinanceTransaction.date >= m_start,
            FinanceTransaction.date < m_end
        ]
        if cash_register:
            income_filters.append(FinanceTransaction.cash_register == cash_register)
            expense_filters.append(FinanceTransaction.cash_register == cash_register)
            
        income_sum = db.query(func.sum(FinanceTransaction.amount)).filter(*income_filters).scalar()
        expense_sum = db.query(func.sum(FinanceTransaction.amount)).filter(*expense_filters).scalar()
        
        month_label = f"{months_ru[temp_date.month - 1]} {temp_date.year}"
        
        chart_data.append({
            "month": month_label,
            "income": income_sum if income_sum is not None else 0.0,
            "expense": expense_sum if expense_sum is not None else 0.0
        })

    # Segment distribution
    segment_data = []
    for segment in SegmentEnum:
        count = db.query(Client).filter(Client.segment == segment).count()
        revenue = db.query(func.sum(FinanceTransaction.amount))\
                    .join(Client, Client.id == FinanceTransaction.client_id)\
                    .filter(FinanceTransaction.transaction_type == "income", Client.segment == segment)\
                    .scalar() or 0.0
        segment_data.append({
            "name": segment.value,
            "value": count,
            "revenue": revenue
        })

    # Status distribution (funnel)
    status_data = []
    for status in ClientStatusEnum:
        count = db.query(Client).filter(Client.status == status).count()
        status_data.append({
            "name": status.value,
            "value": count
        })
        
    return {
        "new_leads": new_leads,
        "active_projects": active_projects,
        "monthly_revenue": monthly_revenue,
        "conversion": conversion,
        "chart_data": chart_data,
        "segment_data": segment_data,
        "status_data": status_data
    }

