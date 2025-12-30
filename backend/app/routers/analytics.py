from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from uuid import UUID
from app.database import get_db
from app import schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/profit-summary/{org_id}", response_model=List[schemas.ProductProfitSummary])
def get_profit_summary(org_id: UUID, db: Session = Depends(get_db)):
    """Get profit summary for all products in an organization"""
    result = db.execute(
        text("SELECT * FROM product_profit_summary WHERE org_id = :org_id"),
        {"org_id": str(org_id)}
    )
    rows = result.fetchall()
    
    # Convert rows to dict format
    columns = result.keys()
    return [dict(zip(columns, row)) for row in rows]

