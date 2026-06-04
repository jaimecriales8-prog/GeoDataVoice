from fastapi import APIRouter
router = APIRouter()

# TODO: implement audio endpoints
@router.get("/")
async def list_audio():
    return []
