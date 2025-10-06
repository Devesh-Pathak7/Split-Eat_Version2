import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Seeding database...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    await db.users.delete_many({})
    await db.restaurants.delete_many({})
    await db.tables.delete_many({})
    await db.menu_items.delete_many({})
    await db.orders.delete_many({})
    await db.half_order_sessions.delete_many({})
    print("✅ Cleared existing data")
    
    # Create Super Admin
    admin_id = str(uuid.uuid4())
    admin = {
        "id": admin_id,
        "username": "admin",
        "password_hash": pwd_context.hash("admin123"),
        "role": "super_admin",
        "restaurant_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    print("✅ Created super admin (username: admin, password: admin123)")
    
    # Create Demo Restaurant
    restaurant_id = str(uuid.uuid4())
    restaurant = {
        "id": restaurant_id,
        "name": "Spice Garden Restaurant",
        "address": "123 MG Road, Bangalore, Karnataka",
        "phone": "+91 9876543210",
        "type": "restaurant",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.restaurants.insert_one(restaurant)
    print(f"✅ Created demo restaurant: {restaurant['name']}")
    
    # Create Counter User for this restaurant
    counter_id = str(uuid.uuid4())
    counter = {
        "id": counter_id,
        "username": "counter1",
        "password_hash": pwd_context.hash("counter123"),
        "role": "counter",
        "restaurant_id": restaurant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(counter)
    print("✅ Created counter user (username: counter1, password: counter123)")
    
    # Create Demo Bar
    bar_id = str(uuid.uuid4())
    bar = {
        "id": bar_id,
        "name": "Royal Bar & Lounge",
        "address": "456 Church Street, Bangalore, Karnataka",
        "phone": "+91 9876543211",
        "type": "bar",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.restaurants.insert_one(bar)
    print(f"✅ Created demo bar: {bar['name']}")
    
    # Create Tables for Restaurant
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    tables = []
    for i in range(1, 11):  # Create 10 tables
        table_id = str(uuid.uuid4())
        table = {
            "id": table_id,
            "restaurant_id": restaurant_id,
            "table_number": f"T{i}",
            "qr_url": f"{frontend_url}/menu/{restaurant_id}/{table_id}",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        tables.append(table)
    
    await db.tables.insert_many(tables)
    print(f"✅ Created 10 tables for restaurant")
    
    # Create Tables for Bar
    bar_tables = []
    for i in range(1, 6):  # Create 5 tables for bar
        table_id = str(uuid.uuid4())
        table = {
            "id": table_id,
            "restaurant_id": bar_id,
            "table_number": f"B{i}",
            "qr_url": f"{frontend_url}/menu/{bar_id}/{table_id}",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        bar_tables.append(table)
    
    await db.tables.insert_many(bar_tables)
    print(f"✅ Created 5 tables for bar")
    
    # Create Menu Items for Restaurant
    menu_items = [
        # Starters
        {"name": "Paneer Tikka", "category": "Starters", "full_price": 250, "half_price": 150, "description": "Grilled cottage cheese with Indian spices"},
        {"name": "Chicken 65", "category": "Starters", "full_price": 280, "half_price": 160, "description": "Spicy fried chicken from South India"},
        {"name": "Veg Spring Rolls", "category": "Starters", "full_price": 180, "half_price": 100, "description": "Crispy rolls with vegetable filling"},
        {"name": "Fish Tikka", "category": "Starters", "full_price": 320, "half_price": 180, "description": "Marinated fish grilled to perfection"},
        
        # Main Course
        {"name": "Butter Chicken", "category": "Main Course", "full_price": 350, "half_price": 200, "description": "Creamy tomato-based chicken curry"},
        {"name": "Dal Makhani", "category": "Main Course", "full_price": 220, "half_price": 130, "description": "Rich black lentils cooked overnight"},
        {"name": "Biryani (Chicken)", "category": "Main Course", "full_price": 280, "half_price": None, "description": "Fragrant rice with spiced chicken"},
        {"name": "Biryani (Veg)", "category": "Main Course", "full_price": 230, "half_price": None, "description": "Fragrant rice with mixed vegetables"},
        {"name": "Palak Paneer", "category": "Main Course", "full_price": 240, "half_price": 140, "description": "Cottage cheese in spinach gravy"},
        
        # Breads
        {"name": "Butter Naan", "category": "Breads", "full_price": 50, "half_price": None, "description": "Soft leavened bread with butter"},
        {"name": "Garlic Naan", "category": "Breads", "full_price": 60, "half_price": None, "description": "Naan topped with garlic"},
        {"name": "Tandoori Roti", "category": "Breads", "full_price": 40, "half_price": None, "description": "Whole wheat flatbread"},
        
        # Desserts
        {"name": "Gulab Jamun", "category": "Desserts", "full_price": 120, "half_price": 70, "description": "Sweet milk dumplings in syrup"},
        {"name": "Rasmalai", "category": "Desserts", "full_price": 140, "half_price": 80, "description": "Cottage cheese in sweet milk"},
        
        # Beverages
        {"name": "Masala Chai", "category": "Beverages", "full_price": 40, "half_price": None, "description": "Indian spiced tea"},
        {"name": "Lassi (Sweet)", "category": "Beverages", "full_price": 80, "half_price": None, "description": "Yogurt-based drink"},
        {"name": "Fresh Lime Soda", "category": "Beverages", "full_price": 60, "half_price": None, "description": "Refreshing lime drink"},
    ]
    
    for item_data in menu_items:
        item = {
            "id": str(uuid.uuid4()),
            "restaurant_id": restaurant_id,
            "name": item_data["name"],
            "category": item_data["category"],
            "full_price": item_data["full_price"],
            "half_price": item_data.get("half_price"),
            "description": item_data["description"],
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.menu_items.insert_one(item)
    
    print(f"✅ Created {len(menu_items)} menu items for restaurant")
    
    # Create Menu Items for Bar
    bar_menu_items = [
        {"name": "Mojito", "category": "Cocktails", "full_price": 180, "half_price": None, "description": "Refreshing mint cocktail"},
        {"name": "Long Island Iced Tea", "category": "Cocktails", "full_price": 280, "half_price": None, "description": "Strong mixed cocktail"},
        {"name": "Beer (Kingfisher)", "category": "Beer", "full_price": 150, "half_price": None, "description": "Premium Indian beer"},
        {"name": "Whiskey (Single)", "category": "Spirits", "full_price": 200, "half_price": 120, "description": "Premium whiskey shot"},
        {"name": "Vodka (Single)", "category": "Spirits", "full_price": 180, "half_price": 110, "description": "Premium vodka shot"},
        {"name": "Chicken Wings", "category": "Snacks", "full_price": 280, "half_price": 160, "description": "Spicy fried chicken wings"},
        {"name": "Nachos", "category": "Snacks", "full_price": 220, "half_price": 130, "description": "Tortilla chips with cheese"},
    ]
    
    for item_data in bar_menu_items:
        item = {
            "id": str(uuid.uuid4()),
            "restaurant_id": bar_id,
            "name": item_data["name"],
            "category": item_data["category"],
            "full_price": item_data["full_price"],
            "half_price": item_data.get("half_price"),
            "description": item_data["description"],
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.menu_items.insert_one(item)
    
    print(f"✅ Created {len(bar_menu_items)} menu items for bar")
    
    print("\n🎉 Database seeding completed!")
    print("\n📋 Login Credentials:")
    print("   Super Admin: username=admin, password=admin123")
    print("   Counter: username=counter1, password=counter123")
    print(f"\n🏪 Restaurant: {restaurant['name']}")
    print(f"   QR Code URL (Table T1): {tables[0]['qr_url']}")
    print(f"\n🍺 Bar: {bar['name']}")
    print(f"   QR Code URL (Table B1): {bar_tables[0]['qr_url']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
