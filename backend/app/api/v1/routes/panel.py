from fastapi import APIRouter
router = APIRouter()

# TODO: implement panel endpoints
@router.get("/")
async def list_panel():
    return []
