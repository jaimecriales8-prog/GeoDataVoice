from fastapi import APIRouter
router = APIRouter()

# TODO: implement territories endpoints
@router.get("/")
async def list_territories():
    return []
