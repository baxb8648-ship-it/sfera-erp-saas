import os
from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.begin() as conn:
        try:
            # Add column
            conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;"))
            print("Column 'is_onboarded' added to 'tenants' table.")
            
            # Update existing tenants (1 and 2) to bypass wizard
            conn.execute(text("UPDATE tenants SET is_onboarded = TRUE WHERE id IN (1, 2);"))
            print("Existing tenants updated (is_onboarded = TRUE).")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
