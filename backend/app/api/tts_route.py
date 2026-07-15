import logging
import io
import edge_tts
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

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

    try:
        communicate = edge_tts.Communicate(text, ms_voice, rate=rate, pitch=pitch)
        
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
                
        audio_data.seek(0)
        return StreamingResponse(audio_data, media_type="audio/mpeg")
        
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации голоса: {str(e)}")
