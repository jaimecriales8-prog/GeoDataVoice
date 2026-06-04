from fastapi import APIRouter
router = APIRouter()

# TODO: implement field endpoints
@router.get("/")
async def list_field():
    return []
