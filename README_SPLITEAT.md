# 🍽️ SplitEat - Restaurant & Bar Management System

## 🇮🇳 Made in India

A full-fledged restaurant and bar management web application with real-time order tracking and innovative half-order session matching feature.

## ✨ Key Features

### 1. Multi-Role System
- **Super Admin**: Complete system control - manage restaurants, menus, tables, and view analytics
- **Restaurant Counter/Manager**: Manage incoming orders, update order status, track table-wise orders
- **Customer**: Scan QR code, browse menu, place orders, track order status in real-time

### 2. Half-Order Session Feature (Unique!)
- Customers can order "half portions" of dishes
- Creates a 30-minute live session visible to all tables in the restaurant
- Other customers can join the half-order to complete a full order
- Automatic session expiration after 30 minutes
- Real-time session updates via polling

### 3. Order Management
**Order Status Flow:**
- `OPEN` → Order placed, waiting for restaurant acceptance
- `MATCHED` → Half order matched with another table
- `PREPARING` → Restaurant is preparing the food
- `SERVED` → Order delivered to table
- `EXPIRED` → Half order session expired without match
- `CANCELLED` → Order cancelled by restaurant

### 4. QR Code-Based Ordering
- Each table has a unique QR code URL
- Customers scan and directly access the menu
- No login required for customers
- Enter name and mobile to place orders

### 5. Real-Time Updates
- Order status updates every 5 seconds (polling)
- Live half-order session visibility
- Counter dashboard auto-refreshes for new orders

## 🎨 Design Theme

**Indian Color Palette:**
- Saffron (#FF9933)
- White (#FFFFFF)
- Green (#138808)
- Orange (#FFAB00)
- Navy Blue (#000080)

**UI Features:**
- Bright, modern Indian-themed design
- "Made in India" branding throughout
- Responsive for mobile and desktop
- Clean card-based layouts
- Smooth animations and transitions

## 🚀 Quick Start

### Login Credentials

**Super Admin:**
- Username: `admin`
- Password: `admin123`

**Counter/Manager:**
- Username: `counter1`
- Password: `counter123`

### Demo Data Included

**1. Spice Garden Restaurant**
- 10 tables (T1 - T10)
- 17 menu items across 5 categories
- Full Indian menu (Starters, Main Course, Breads, Desserts, Beverages)

**2. Royal Bar & Lounge**
- 5 tables (B1 - B5)
- 7 menu items (Cocktails, Beer, Spirits, Snacks)

### Sample QR Code URLs

**Restaurant Table T1:**
```
https://tableorderhub.preview.emergentagent.com/menu/811302ff-ec02-4e6c-beda-38743ba26bf7/3fee27f0-ee3f-472e-a802-8ebeb1fedf67
```

**Bar Table B1:**
```
https://tableorderhub.preview.emergentagent.com/menu/6195dd58-bd3b-469c-80a4-a87609b848bb/82ec378d-f07f-48b5-a503-5fe2282b4ccb
```

## 📱 User Flows

### Super Admin Flow
1. Login with admin credentials
2. View analytics dashboard (revenue, orders, active sessions)
3. Manage restaurants (create/delete)
4. Manage tables (create tables with QR URLs)
5. Manage menu items (add/edit/delete/toggle availability)
6. Switch between multiple restaurants

### Counter/Manager Flow
1. Login with counter credentials
2. View order statistics (active, pending, preparing, served)
3. See incoming orders with table numbers and customer details
4. Update order status: Accept → Preparing → Served
5. View matched half-orders with table pairings
6. Cancel orders if needed
7. Real-time order queue updates

### Customer Flow
1. Scan QR code on table
2. Browse menu with category filters
3. See full and half pricing options
4. Add items to cart (full or half portions)
5. **Option A - Direct Order:**
   - Enter name and mobile
   - Place order
6. **Option B - Join Half Order:**
   - View active half-order sessions
   - Join existing half order
   - Order gets matched automatically
7. Track order status in real-time
8. View order history

## 🔄 Half-Order Session Logic

```
Customer A (Table T1) orders half Butter Chicken
    ↓
30-minute session created
    ↓
Session visible to all tables with "Join Half Order" button
    ↓
Customer B (Table T5) joins the session
    ↓
Both orders marked as "MATCHED"
    ↓
Restaurant sees combined order with both table numbers
    ↓
Both tables get their half portions
    ↓
Separate receipts for T1 and T5
```

**If no one joins within 30 minutes:**
```
Session expires → Order marked as "EXPIRED"
```

## 🛠️ Technology Stack

**Frontend:**
- React 19
- React Router DOM
- Axios for API calls
- Custom CSS with Indian theme
- Responsive design

**Backend:**
- FastAPI (Python)
- Motor (Async MongoDB driver)
- JWT authentication
- Pydantic models
- Bcrypt password hashing

**Database:**
- MongoDB
- Collections: users, restaurants, tables, menu_items, orders, half_order_sessions

## 📊 Database Schema

### Users
```javascript
{
  id: UUID,
  username: string,
  password_hash: string,
  role: "super_admin" | "counter",
  restaurant_id: UUID (optional, for counter users),
  created_at: datetime
}
```

### Restaurants
```javascript
{
  id: UUID,
  name: string,
  address: string,
  phone: string,
  type: "restaurant" | "bar",
  created_at: datetime
}
```

### Tables
```javascript
{
  id: UUID,
  restaurant_id: UUID,
  table_number: string,
  qr_url: string,
  is_active: boolean,
  created_at: datetime
}
```

### Menu Items
```javascript
{
  id: UUID,
  restaurant_id: UUID,
  name: string,
  category: string,
  full_price: float,
  half_price: float (optional),
  description: string,
  is_available: boolean,
  created_at: datetime
}
```

### Orders
```javascript
{
  id: UUID,
  restaurant_id: UUID,
  table_id: UUID,
  table_number: string,
  customer_name: string,
  customer_mobile: string,
  items: array of {menu_item_id, name, portion, price},
  total_amount: float,
  status: "OPEN" | "MATCHED" | "PREPARING" | "SERVED" | "EXPIRED" | "CANCELLED",
  is_half_order: boolean,
  session_id: UUID (optional),
  matched_order_id: UUID (optional),
  matched_table_number: string (optional),
  created_at: datetime,
  updated_at: datetime
}
```

### Half Order Sessions
```javascript
{
  id: UUID,
  restaurant_id: UUID,
  menu_item_id: UUID,
  menu_item_name: string,
  table_id: UUID,
  table_number: string,
  customer_name: string,
  customer_mobile: string,
  order_id: UUID,
  created_at: datetime,
  expires_at: datetime (30 minutes from creation),
  status: "ACTIVE" | "MATCHED" | "EXPIRED"
}
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (admin/counter)
- `POST /api/auth/login` - Login and get JWT token

### Restaurants
- `GET /api/restaurants` - List all restaurants
- `GET /api/restaurants/{id}` - Get restaurant details
- `POST /api/restaurants` - Create restaurant (admin only)
- `DELETE /api/restaurants/{id}` - Delete restaurant (admin only)

### Tables
- `GET /api/tables/restaurant/{restaurant_id}` - List restaurant tables
- `GET /api/tables/{table_id}` - Get table details
- `POST /api/tables` - Create table (admin/counter)

### Menu Items
- `GET /api/menu-items/restaurant/{restaurant_id}` - List menu items
- `POST /api/menu-items` - Create menu item (admin/counter)
- `PATCH /api/menu-items/{id}` - Update menu item (admin/counter)
- `DELETE /api/menu-items/{id}` - Delete menu item (admin/counter)

### Orders
- `POST /api/orders` - Place new order
- `POST /api/orders/join-half` - Join half order session
- `GET /api/orders/restaurant/{restaurant_id}` - List restaurant orders
- `GET /api/orders/customer/{mobile}/{restaurant_id}` - Customer order history
- `GET /api/orders/{id}` - Get order details
- `PATCH /api/orders/{id}/status` - Update order status (admin/counter)

### Half Order Sessions
- `GET /api/half-order-sessions/restaurant/{restaurant_id}` - Active sessions

### Analytics
- `GET /api/analytics/restaurant/{restaurant_id}` - Restaurant analytics

## 🎯 Use Cases

### Use Case 1: Solo Diner
Customer sits alone, wants half portion of expensive dish, places half order, wait or cancel if no match.

### Use Case 2: Table Sharing
Two strangers at different tables both want Fish Tikka (half). One creates session, other joins. Both get half portions at half price.

### Use Case 3: Group Dining
Multiple people at same table, each orders separately with their mobile numbers. Counter sees all orders for that table. Can generate separate receipts.

### Use Case 4: Busy Restaurant
Counter sees live queue of pending orders. Accepts orders in priority. Updates status as preparing/served. Customers see real-time updates on their phones.

## 📈 Analytics Dashboard

Super Admin can view:
- Total Revenue (₹)
- Total Orders Count
- Active Orders Count
- Active Half Order Sessions Count

Real-time data, updates on every page refresh.

## 🔄 Real-Time Features

**Polling Intervals:**
- Customer menu: 5 seconds (for half-order sessions)
- Counter dashboard: 5 seconds (for new orders)
- Customer order tracking: 5 seconds (for status updates)

**Session Expiration:**
- Half-order sessions auto-expire after 30 minutes
- Backend automatically marks expired sessions
- Related orders updated to "EXPIRED" status

## 🎨 UI Components

**Buttons:**
- Primary: Orange gradient (Add to cart, Submit)
- Secondary: Green gradient (Half orders, Success actions)
- Outline: White with colored border (Cancel, Secondary actions)

**Cards:**
- White background with shadow
- Rounded corners (16px)
- Hover effects (lift and shadow)

**Status Badges:**
- Color-coded by status
- Rounded pill shape
- Uppercase text

**Forms:**
- Clean input fields
- Focus states with colored borders
- Grid layouts for multi-field forms

## 🚦 Order Status Colors

- **OPEN**: Yellow (#fff3cd) - Awaiting acceptance
- **MATCHED**: Blue (#d1ecf1) - Half order matched
- **PREPARING**: Light Blue (#cce5ff) - Being prepared
- **SERVED**: Green (#d4edda) - Delivered
- **EXPIRED**: Red (#f8d7da) - Session expired
- **CANCELLED**: Red (#f8d7da) - Cancelled

## 📝 Notes

1. **No Payment Integration**: System tracks orders only, no payment gateway
2. **No Images**: Focus on functionality, no menu item images
3. **Mobile First**: Responsive design works on all devices
4. **Real Restaurant Ready**: Can be deployed with real QR codes
5. **Scalable**: Supports multiple restaurants and bars
6. **Session-based**: Half orders use time-based session matching

## 🔧 Maintenance

### Re-seed Database
```bash
cd /app/backend
python seed_data.py
```

This will:
- Clear all existing data
- Create admin and counter users
- Create demo restaurants and bars
- Create tables with QR URLs
- Populate menu items

### Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.*.log
```

### Restart Services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

## 🎉 Success Criteria

✅ Multi-role authentication working
✅ Admin can manage restaurants, tables, menus
✅ Counter can manage orders with real-time updates
✅ Customers can scan QR and order
✅ Half-order session creation and matching
✅ Real-time order status tracking
✅ Indian color theme throughout
✅ "Made in India" branding
✅ Responsive design
✅ Session expiration logic
✅ Analytics dashboard
✅ Order history tracking

## 🚀 Production Deployment

For production:
1. Generate real QR codes from table URLs
2. Print and place QR codes on tables
3. Update `FRONTEND_URL` in backend/.env
4. Change `SECRET_KEY` to secure random string
5. Set up proper MongoDB with backups
6. Configure HTTPS
7. Set up proper logging and monitoring

---

**Built with ❤️ in India** 🇮🇳
