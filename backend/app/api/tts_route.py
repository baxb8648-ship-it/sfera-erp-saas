import logging
import io
import edge_tts
from gtts import gTTS
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/tts", tags=["TTS"])

# Карта наших голосов на голоса Microsoft Edge (Neural)
VOICE_MAPPING = {
    "female_warm": "ru-RU-SvetlanaNeural",     # Светлана (женский, теплый)
    "female_business": "ru-RU-SvetlanaNeural", # Светлана (с повышенной скоростью)
    "male_negotiator": "ru-RU-DmitryNeural",   # Дмитрий (мужской, харизматичный)
    "male_deep": "ru-RU-DmitryNeural"          # Дмитрий (с пониженной высотой тона)
}

@router.get("/generate")
async def generate_tts(
    text: str = Query(..., description="Текст для озвучивания"),
    voice: str = Query("female_warm", description="Тип голоса")
):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Текст не может быть пустым")

    ms_voice = VOICE_MAPPING.get(voice, "ru-RU-SvetlanaNeural")
    
    # Настройки скорости (rate) и высоты (pitch)
    rate = "+0%"
    pitch = "+0Hz"
    
    if voice == "female_business":
        rate = "+15%"
        pitch = "+1Hz"
    elif voice == "male_negotiator":
        rate = "+8%"
        pitch = "-1Hz"
    elif voice == "male_deep":
        rate = "-5%"
        pitch = "-5Hz"

    # Попытка 1: Использование высококачественного Edge TTS
    try:
        communicate = edge_tts.Communicate(text, ms_voice, rate=rate, pitch=pitch)
        audio_data = io.BytesIO()
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
                
        audio_data.seek(0)
        return Response(content=audio_data.getvalue(), media_type="audio/mpeg")
        
    except Exception as edge_err:
        logger.warning(f"Edge TTS failed ({edge_err}). Falling back to Google gTTS...")
        
        # Попытка 2: Отказоустойчивый gTTS (Google Translate API)
        try:
            # gTTS обращается к Google Translate TTS, который стабильно работает из РФ
            tts = gTTS(text=text, lang='ru', slow=False)
            audio_data = io.BytesIO()
            tts.write_to_fp(audio_data)
            audio_data.seek(0)
            
            return Response(content=audio_data.getvalue(), media_type="audio/mpeg")
            
        except Exception as google_err:
            logger.error(f"Fallback gTTS also failed: {google_err}")
            raise HTTPException(status_code=500, detail=f"Ошибка генерации голоса: {str(google_err)}")
