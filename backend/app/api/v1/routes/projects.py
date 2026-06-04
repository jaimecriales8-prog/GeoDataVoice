from fastapi import APIRouter
router = APIRouter()

# TODO: implement projects endpoints
@router.get("/")
async def list_projects():
    return []
