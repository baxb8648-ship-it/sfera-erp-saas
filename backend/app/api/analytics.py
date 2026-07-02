from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import func, case
from typing import Optional
from ..database import get_db
from ..models import Client, Object, FinanceTransaction, Tender, SegmentEnum, ClientStatusEnum, User
from .auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/stats")
def get_analytics_stats(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    cash_register: Optional[str] = Query(None, description="works, materials or all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Parse dates if provided
    s_date = None
    e_date = None
    if start_date:
        try:
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            pass
    if end_date:
        try:
            # Add 23:59:59 to include the whole end day
            e_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            pass

    # --- 1. Cohort Analysis (LTV / CAC) ---
    dialect_name = db.get_bind().dialect.name
    if dialect_name == 'sqlite':
        month_expr = func.strftime('%Y-%m', Client.created_at)
    else:
        month_expr = func.to_char(Client.created_at, 'YYYY-MM')

    cohort_query = db.query(
        month_expr.label('cohort_month'),
        func.count(Client.id).label('cohort_size'),
        func.sum(Client.acquisition_cost).label('total_cac')
    ).filter(Client.tenant_id == current_user.tenant_id)
    
    if s_date:
        cohort_query = cohort_query.filter(Client.created_at >= s_date)
    if e_date:
        cohort_query = cohort_query.filter(Client.created_at <= e_date)
        
    cohorts_raw = cohort_query.group_by('cohort_month').order_by('cohort_month').all()
    
    months_ru = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    cohort_data = []
    
    for r in cohorts_raw:
        cohort_month = r.cohort_month or "Unknown"
        cohort_size = r.cohort_size or 0
        total_cac = r.total_cac or 0.0
        
        # Parse year and month
        try:
            year, month = map(int, cohort_month.split('-'))
            month_label = f"{months_ru[month - 1]} {year}"
        except ValueError:
            month_label = cohort_month
            
        # Get client IDs in this cohort
        client_ids = [c.id for c in db.query(Client.id).filter(
            Client.tenant_id == current_user.tenant_id,
            month_expr == cohort_month
        ).all()]
        
        # Sum income transactions for these clients
        finance_filter = [
            FinanceTransaction.tenant_id == current_user.tenant_id,
            FinanceTransaction.client_id.in_(client_ids),
            FinanceTransaction.transaction_type == "income"
        ]
        if cash_register and cash_register != "all":
            finance_filter.append(FinanceTransaction.cash_register == cash_register)
            
        total_revenue = db.query(func.sum(FinanceTransaction.amount)).filter(*finance_filter).scalar() or 0.0
        
        avg_ltv = round(total_revenue / cohort_size, 2) if cohort_size > 0 else 0.0
        avg_cac = round(total_cac / cohort_size, 2) if cohort_size > 0 else 0.0
        roi = round((avg_ltv / avg_cac) * 100, 1) if avg_cac > 0 else (100.0 if avg_ltv > 0 else 0.0)
        
        cohort_data.append({
            "cohort": month_label,
            "cohort_size": cohort_size,
            "total_revenue": round(total_revenue, 2),
            "total_cac": round(total_cac, 2),
            "avg_ltv": avg_ltv,
            "avg_cac": avg_cac,
            "roi": roi
        })

    # --- 2. Tender Conversion Funnel ---
    tender_filter = [Tender.tenant_id == current_user.tenant_id]
    if s_date:
        tender_filter.append(Tender.created_at >= s_date)
    if e_date:
        tender_filter.append(Tender.created_at <= e_date)
        
    tenders_count = db.query(
        Tender.status,
        func.count(Tender.id).label('count'),
        func.sum(Tender.price).label('total_price')
    ).filter(*tender_filter).group_by(Tender.status).all()
    
    tenders_by_status = {t[0]: {"count": t[1], "value": t[2] or 0.0} for t in tenders_count}
    
    # We want a funnel: Анализ (Analysis) -> Участие (Participation) -> Заявка подана (Applied) -> Выигран (Won)
    stages = ["Анализ", "Участие", "Заявка подана", "Выигран"]
    funnel_data = []
    
    cumulative_count = 0
    # In a real funnel, a won tender went through applied, participation, analysis.
    # So we accumulate counts from right to left, or just show the active status distribution.
    # Let's show active distribution but also build a cohort funnel representation:
    # A tender in "Won" is counted in Won, Applied, Participation, Analysis.
    # A tender in "Проигран" is counted in Applied, Participation, Analysis.
    # A tender in "Отклонен" is counted in Applied, Participation, Analysis.
    # A tender in "Заявка подана" is counted in Applied, Participation, Analysis.
    # A tender in "Участие" is counted in Participation, Analysis.
    # A tender in "Анализ" is counted in Analysis.
    
    # Let's count them according to this progression:
    won_tenders = tenders_by_status.get("Выигран", {"count": 0, "value": 0.0})
    lost_tenders = tenders_by_status.get("Проигран", {"count": 0, "value": 0.0})
    rejected_tenders = tenders_by_status.get("Отклонен", {"count": 0, "value": 0.0})
    applied_tenders = tenders_by_status.get("Заявка подана", {"count": 0, "value": 0.0})
    participation_tenders = tenders_by_status.get("Участие", {"count": 0, "value": 0.0})
    analysis_tenders = tenders_by_status.get("Анализ", {"count": 0, "value": 0.0})
    
    # Funnel counts:
    # 1. Анализ (All tenders entered the analysis stage)
    count_analysis = (
        analysis_tenders["count"] + 
        participation_tenders["count"] + 
        applied_tenders["count"] + 
        won_tenders["count"] + 
        lost_tenders["count"] + 
        rejected_tenders["count"]
    )
    # 2. Участие (Decided to participate)
    count_participation = (
        participation_tenders["count"] + 
        applied_tenders["count"] + 
        won_tenders["count"] + 
        lost_tenders["count"] + 
        rejected_tenders["count"]
    )
    # 3. Заявка подана (Bids submitted)
    count_applied = (
        applied_tenders["count"] + 
        won_tenders["count"] + 
        lost_tenders["count"] + 
        rejected_tenders["count"]
    )
    # 4. Выигран (Bids won)
    count_won = won_tenders["count"]
    
    funnel_counts = [count_analysis, count_participation, count_applied, count_won]
    funnel_names = ["1. Анализ", "2. Участие", "3. Заявка подана", "4. Выигран"]
    
    for i, name in enumerate(funnel_names):
        count = funnel_counts[i]
        # Conversion rate compared to stage 1
        conv_base = round((count / funnel_counts[0]) * 100, 1) if funnel_counts[0] > 0 else 0.0
        # Conversion rate compared to previous stage
        conv_prev = round((count / funnel_counts[i-1]) * 100, 1) if i > 0 and funnel_counts[i-1] > 0 else 100.0
        
        funnel_data.append({
            "stage": name,
            "count": count,
            "conv_base": conv_base,
            "conv_prev": conv_prev
        })

    # --- 3. Financial Expense Breakdown & Segment Distribution ---
    # Expense categories
    expense_filter = [
        FinanceTransaction.tenant_id == current_user.tenant_id,
        FinanceTransaction.transaction_type == "expense"
    ]
    if s_date:
        expense_filter.append(FinanceTransaction.date >= s_date)
    if e_date:
        expense_filter.append(FinanceTransaction.date <= e_date)
    if cash_register and cash_register != "all":
        expense_filter.append(FinanceTransaction.cash_register == cash_register)
        
    expense_categories = db.query(
        FinanceTransaction.category,
        func.sum(FinanceTransaction.amount).label('total_amount')
    ).filter(*expense_filter).group_by(FinanceTransaction.category).all()
    
    category_data = []
    total_expenses = sum(ec.total_amount for ec in expense_categories) if expense_categories else 0.0
    
    for ec in expense_categories:
        cat_name = ec.category or "Другое"
        amount = ec.total_amount or 0.0
        pct = round((amount / total_expenses) * 100, 1) if total_expenses > 0 else 0.0
        category_data.append({
            "category": cat_name,
            "amount": round(amount, 2),
            "percentage": pct
        })
        
    # Segment revenue & profit breakdown
    # Revenue by segment
    segment_revenue_filter = [
        FinanceTransaction.tenant_id == current_user.tenant_id,
        Client.tenant_id == current_user.tenant_id,
        FinanceTransaction.transaction_type == "income"
    ]
    if s_date:
        segment_revenue_filter.append(FinanceTransaction.date >= s_date)
    if e_date:
        segment_revenue_filter.append(FinanceTransaction.date <= e_date)
    if cash_register and cash_register != "all":
        segment_revenue_filter.append(FinanceTransaction.cash_register == cash_register)
        
    segment_revenue = db.query(
        Client.segment,
        func.sum(FinanceTransaction.amount).label('total_revenue')
    ).join(Client, Client.id == FinanceTransaction.client_id)\
     .filter(*segment_revenue_filter).group_by(Client.segment).all()
     
    segment_rev_dict = {sr.segment: sr.total_revenue or 0.0 for sr in segment_revenue}
    
    # Expense by segment
    segment_expense_filter = [
        FinanceTransaction.tenant_id == current_user.tenant_id,
        Client.tenant_id == current_user.tenant_id,
        FinanceTransaction.transaction_type == "expense"
    ]
    if s_date:
        segment_expense_filter.append(FinanceTransaction.date >= s_date)
    if e_date:
        segment_expense_filter.append(FinanceTransaction.date <= e_date)
    if cash_register and cash_register != "all":
        segment_expense_filter.append(FinanceTransaction.cash_register == cash_register)
        
    segment_expense = db.query(
        Client.segment,
        func.sum(FinanceTransaction.amount).label('total_expense')
    ).join(Client, Client.id == FinanceTransaction.client_id)\
     .filter(*segment_expense_filter).group_by(Client.segment).all()
     
    segment_exp_dict = {se.segment: se.total_expense or 0.0 for se in segment_expense}
    
    segment_data = []
    for segment in SegmentEnum:
        rev = segment_rev_dict.get(segment, 0.0)
        exp = segment_exp_dict.get(segment, 0.0)
        profit = rev - exp
        
        segment_data.append({
            "segment_key": segment.name,
            "segment_name": segment.value,
            "revenue": round(rev, 2),
            "expense": round(exp, 2),
            "profit": round(profit, 2)
        })

    # Summary metrics
    revenue_filter = [
        FinanceTransaction.tenant_id == current_user.tenant_id,
        FinanceTransaction.transaction_type == "income"
    ]
    if s_date:
        revenue_filter.append(FinanceTransaction.date >= s_date)
    if e_date:
        revenue_filter.append(FinanceTransaction.date <= e_date)
    if cash_register and cash_register != "all":
        revenue_filter.append(FinanceTransaction.cash_register == cash_register)
        
    total_rev = db.query(func.sum(FinanceTransaction.amount)).filter(*revenue_filter).scalar() or 0.0
    
    total_exp = total_expenses # already calculated with appropriate filters
    total_profit = total_rev - total_exp
    
    # Calculate average win rate for tenders in date range
    won_count = won_tenders["count"]
    total_tender_count = count_analysis # total tenders that entered analysis
    win_rate = round((won_count / total_tender_count) * 100, 1) if total_tender_count > 0 else 0.0
    
    summary = {
        "total_revenue": round(total_rev, 2),
        "total_expense": round(total_exp, 2),
        "total_profit": round(total_profit, 2),
        "win_rate": win_rate,
        "tenders_won_count": won_count,
        "tenders_total_value": round(won_tenders["value"], 2)
    }

    return {
        "summary": summary,
        "cohort_data": cohort_data,
        "funnel_data": funnel_data,
        "category_data": category_data,
        "segment_data": segment_data
    }
