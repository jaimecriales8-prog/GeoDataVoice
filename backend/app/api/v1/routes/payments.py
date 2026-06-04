from fastapi import APIRouter
router = APIRouter()

# TODO: implement payments endpoints
@router.get("/")
async def list_payments():
    return []
