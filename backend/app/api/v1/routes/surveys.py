from fastapi import APIRouter
router = APIRouter()

# TODO: implement surveys endpoints
@router.get("/")
async def list_surveys():
    return []
