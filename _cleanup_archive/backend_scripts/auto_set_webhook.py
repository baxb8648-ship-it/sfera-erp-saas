import os
import sys
import urllib.request
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Text

# Setup DB
DATABASE_URL = "sqlite:///./sphera_crm.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CompanySetting(Base):
    __tablename__ = "company_settings"
    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)

def set_webhook(token: str, webhook_url: str):
    url = f"https://api.telegram.org/bot{token}/setWebhook"
    data = urllib.parse.urlencode({'url': webhook_url}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print("Webhook Response:", result)
    except Exception as e:
        print("Error setting webhook:", e)

if __name__ == "__main__":
    db = SessionLocal()
    token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
    
    if not token_setting or not token_setting.value:
        print("Error: telegram_bot_token not found in database.")
        sys.exit(1)
        
    token = token_setting.value
    url = "https://api.xn--56-6kctpmeri.xn--p1ai/telegram/webhook"
    
    print(f"Found token in DB: {token[:5]}...{token[-5:]}")
    print(f"Setting webhook for bot to {url} ...")
    set_webhook(token, url)
    db.close()
