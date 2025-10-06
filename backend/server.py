from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str  # "super_admin" or "counter"
    restaurant_id: Optional[str] = None  # Only for counter role
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    restaurant_id: Optional[str] = None

class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    phone: str
    type: str  # "restaurant" or "bar"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    address: str
    phone: str
    type: str

class Table(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_number: str
    qr_url: str  # URL that customers will scan
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    restaurant_id: str
    table_number: str

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    category: str
    full_price: float
    half_price: Optional[float] = None
    description: Optional[str] = None
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    restaurant_id: str
    name: str
    category: str
    full_price: float
    half_price: Optional[float] = None
    description: Optional[str] = None
    is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    full_price: Optional[float] = None
    half_price: Optional[float] = None
    description: Optional[str] = None
    is_available: Optional[bool] = None

class HalfOrderSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    menu_item_id: str
    menu_item_name: str
    table_id: str
    table_number: str
    customer_name: str
    customer_mobile: str
    order_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    status: str = "ACTIVE"  # ACTIVE, MATCHED, EXPIRED

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    table_number: str
    customer_name: str
    customer_mobile: str
    items: List[dict]  # [{menu_item_id, name, portion (full/half), price, session_id}]
    total_amount: float
    status: str = "OPEN"  # OPEN, MATCHED, PREPARING, SERVED, EXPIRED, CANCELLED
    is_half_order: bool = False
    session_id: Optional[str] = None
    matched_order_id: Optional[str] = None  # For half orders that got matched
    matched_table_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    restaurant_id: str
    table_id: str
    table_number: str
    customer_name: str
    customer_mobile: str
    items: List[dict]  # [{menu_item_id, name, portion, price}]

class OrderStatusUpdate(BaseModel):
    status: str

class JoinHalfOrder(BaseModel):
    session_id: str
    table_id: str
    table_number: str
    customer_name: str
    customer_mobile: str

# ============ AUTH UTILITIES ============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        restaurant_id=user_data.restaurant_id
    )
    await db.users.insert_one(user.dict())
    return {"message": "User created successfully", "user_id": user.id}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "restaurant_id": user.get("restaurant_id")
        }
    }

# ============ RESTAURANT ROUTES ============

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(restaurant_data: RestaurantCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can create restaurants")
    
    restaurant = Restaurant(**restaurant_data.dict())
    await db.restaurants.insert_one(restaurant.dict())
    return restaurant

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants():
    restaurants = await db.restaurants.find().to_list(1000)
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return Restaurant(**restaurant)

@api_router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can delete restaurants")
    
    result = await db.restaurants.delete_one({"id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant deleted successfully"}

# ============ TABLE ROUTES ============

@api_router.post("/tables", response_model=Table)
async def create_table(table_data: TableCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    table = Table(**table_data.dict())
    # Generate QR URL
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    table.qr_url = f"{frontend_url}/menu/{table.restaurant_id}/{table.id}"
    
    await db.tables.insert_one(table.dict())
    return table

@api_router.get("/tables/restaurant/{restaurant_id}", response_model=List[Table])
async def get_tables_by_restaurant(restaurant_id: str):
    tables = await db.tables.find({"restaurant_id": restaurant_id}).to_list(1000)
    return [Table(**t) for t in tables]

@api_router.get("/tables/{table_id}", response_model=Table)
async def get_table(table_id: str):
    table = await db.tables.find_one({"id": table_id})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return Table(**table)

# ============ MENU ROUTES ============

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(item_data: MenuItemCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    menu_item = MenuItem(**item_data.dict())
    await db.menu_items.insert_one(menu_item.dict())
    return menu_item

@api_router.get("/menu-items/restaurant/{restaurant_id}", response_model=List[MenuItem])
async def get_menu_items(restaurant_id: str):
    items = await db.menu_items.find({"restaurant_id": restaurant_id}).to_list(1000)
    return [MenuItem(**item) for item in items]

@api_router.patch("/menu-items/{item_id}")
async def update_menu_item(item_id: str, update_data: MenuItemUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.menu_items.update_one({"id": item_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item updated successfully"}

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# ============ ORDER ROUTES ============

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Calculate total and check for half orders
    total_amount = sum(item["price"] for item in order_data.items)
    is_half_order = any(item.get("portion") == "half" for item in order_data.items)
    
    order = Order(
        restaurant_id=order_data.restaurant_id,
        table_id=order_data.table_id,
        table_number=order_data.table_number,
        customer_name=order_data.customer_name,
        customer_mobile=order_data.customer_mobile,
        items=order_data.items,
        total_amount=total_amount,
        is_half_order=is_half_order
    )
    
    # If half order, create session
    if is_half_order:
        for item in order_data.items:
            if item.get("portion") == "half":
                session = HalfOrderSession(
                    restaurant_id=order_data.restaurant_id,
                    menu_item_id=item["menu_item_id"],
                    menu_item_name=item["name"],
                    table_id=order_data.table_id,
                    table_number=order_data.table_number,
                    customer_name=order_data.customer_name,
                    customer_mobile=order_data.customer_mobile,
                    order_id=order.id,
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)
                )
                await db.half_order_sessions.insert_one(session.dict())
                order.session_id = session.id
    
    await db.orders.insert_one(order.dict())
    return order

@api_router.post("/orders/join-half")
async def join_half_order(join_data: JoinHalfOrder):
    # Find the session
    session = await db.half_order_sessions.find_one({"id": join_data.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = HalfOrderSession(**session)
    
    # Check if session is expired
    if datetime.now(timezone.utc) > session_obj.expires_at:
        await db.half_order_sessions.update_one(
            {"id": join_data.session_id},
            {"$set": {"status": "EXPIRED"}}
        )
        raise HTTPException(status_code=400, detail="Session expired")
    
    if session_obj.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session not active")
    
    # Get original order
    original_order = await db.orders.find_one({"id": session_obj.order_id})
    if not original_order:
        raise HTTPException(status_code=404, detail="Original order not found")
    
    # Create new order for joining customer
    menu_item = await db.menu_items.find_one({"id": session_obj.menu_item_id})
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    new_order = Order(
        restaurant_id=session_obj.restaurant_id,
        table_id=join_data.table_id,
        table_number=join_data.table_number,
        customer_name=join_data.customer_name,
        customer_mobile=join_data.customer_mobile,
        items=[{
            "menu_item_id": session_obj.menu_item_id,
            "name": session_obj.menu_item_name,
            "portion": "half",
            "price": menu_item["half_price"],
            "session_id": join_data.session_id
        }],
        total_amount=menu_item["half_price"],
        status="MATCHED",
        is_half_order=True,
        session_id=join_data.session_id,
        matched_order_id=session_obj.order_id,
        matched_table_number=session_obj.table_number
    )
    
    await db.orders.insert_one(new_order.dict())
    
    # Update original order
    await db.orders.update_one(
        {"id": session_obj.order_id},
        {"$set": {
            "status": "MATCHED",
            "matched_order_id": new_order.id,
            "matched_table_number": join_data.table_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update session
    await db.half_order_sessions.update_one(
        {"id": join_data.session_id},
        {"$set": {"status": "MATCHED"}}
    )
    
    return {"message": "Successfully joined half order", "order_id": new_order.id}

@api_router.get("/orders/restaurant/{restaurant_id}", response_model=List[Order])
async def get_orders_by_restaurant(restaurant_id: str):
    orders = await db.orders.find({"restaurant_id": restaurant_id}).sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/customer/{customer_mobile}/{restaurant_id}", response_model=List[Order])
async def get_customer_orders(customer_mobile: str, restaurant_id: str):
    orders = await db.orders.find({
        "customer_mobile": customer_mobile,
        "restaurant_id": restaurant_id
    }).sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated successfully"}

# ============ HALF ORDER SESSION ROUTES ============

@api_router.get("/half-order-sessions/restaurant/{restaurant_id}", response_model=List[HalfOrderSession])
async def get_active_half_order_sessions(restaurant_id: str):
    now = datetime.now(timezone.utc)
    
    # Update expired sessions
    await db.half_order_sessions.update_many(
        {
            "restaurant_id": restaurant_id,
            "status": "ACTIVE",
            "expires_at": {"$lt": now.isoformat()}
        },
        {"$set": {"status": "EXPIRED"}}
    )
    
    # Also update related orders
    expired_sessions = await db.half_order_sessions.find({
        "restaurant_id": restaurant_id,
        "status": "EXPIRED"
    }).to_list(1000)
    
    for session in expired_sessions:
        await db.orders.update_one(
            {"id": session["order_id"], "status": "OPEN"},
            {"$set": {"status": "EXPIRED", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Return active sessions
    sessions = await db.half_order_sessions.find({
        "restaurant_id": restaurant_id,
        "status": "ACTIVE"
    }).sort("created_at", -1).to_list(1000)
    
    return [HalfOrderSession(**session) for session in sessions]

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/restaurant/{restaurant_id}")
async def get_analytics(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["super_admin", "counter"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Total orders
    total_orders = await db.orders.count_documents({"restaurant_id": restaurant_id})
    
    # Active orders
    active_orders = await db.orders.count_documents({
        "restaurant_id": restaurant_id,
        "status": {"$in": ["OPEN", "MATCHED", "PREPARING"]}
    })
    
    # Total revenue
    orders = await db.orders.find({"restaurant_id": restaurant_id, "status": "SERVED"}).to_list(10000)
    total_revenue = sum(order.get("total_amount", 0) for order in orders)
    
    # Active sessions
    active_sessions = await db.half_order_sessions.count_documents({
        "restaurant_id": restaurant_id,
        "status": "ACTIVE"
    })
    
    return {
        "total_orders": total_orders,
        "active_orders": active_orders,
        "total_revenue": total_revenue,
        "active_half_order_sessions": active_sessions
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
