from fastapi import APIRouter
router = APIRouter()

# TODO: implement messages endpoints
@router.get("/")
async def list_messages():
    return []
