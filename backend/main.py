from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User
from database import SessionLocal
from passlib.context import CryptContext

from routers import auth, customers, assets, rental, inventory, calibration, as_dispatch

app = FastAPI(title="Tellustech ERP API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(assets.router)
app.include_router(rental.router)
app.include_router(inventory.router)
app.include_router(calibration.router)
app.include_router(as_dispatch.router)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                password_hash=pwd_context.hash("admin1234"),
                role="admin",
                name="관리자",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Tellustech ERP API"}
