from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..websocket_manager import manager
import logging

logger = logging.getLogger("uvicorn.error")
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We keep the connection alive by waiting for client messages
            # In our case, the client won't send much, but this keeps the connection open
            data = await websocket.receive_text()
            logger.info(f"Received message from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        manager.disconnect(websocket)
