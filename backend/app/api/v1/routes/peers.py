from fastapi import APIRouter
router = APIRouter()

# TODO: implement peers endpoints
@router.get("/")
async def list_peers():
    return []
