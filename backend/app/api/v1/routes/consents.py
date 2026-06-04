from fastapi import APIRouter
router = APIRouter()

# TODO: implement consents endpoints
@router.get("/")
async def list_consents():
    return []
