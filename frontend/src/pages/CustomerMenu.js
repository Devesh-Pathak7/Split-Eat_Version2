import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const CustomerMenu = () => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [halfOrderSessions, setHalfOrderSessions] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchData();
    // Poll for half order sessions every 5 seconds
    const interval = setInterval(fetchHalfOrderSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [restRes, tableRes, menuRes] = await Promise.all([
        axios.get(`${API}/restaurants/${restaurantId}`),
        axios.get(`${API}/tables/${tableId}`),
        axios.get(`${API}/menu-items/restaurant/${restaurantId}`)
      ]);
      
      setRestaurant(restRes.data);
      setTable(tableRes.data);
      setMenuItems(menuRes.data.filter(item => item.is_available));
      
      await fetchHalfOrderSessions();
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Error loading menu. Please try again.');
    }
  };

  const fetchHalfOrderSessions = async () => {
    try {
      const res = await axios.get(`${API}/half-order-sessions/restaurant/${restaurantId}`);
      setHalfOrderSessions(res.data);
    } catch (err) {
      console.error('Error fetching half order sessions:', err);
    }
  };

  const addToCart = (item, portion) => {
    const price = portion === 'full' ? item.full_price : item.half_price;
    const cartItem = {
      menu_item_id: item.id,
      name: item.name,
      portion,
      price
    };
    setCart([...cart, cartItem]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/orders`, {
        restaurant_id: restaurantId,
        table_id: tableId,
        table_number: table.table_number,
        customer_name: customerName,
        customer_mobile: customerMobile,
        items: cart
      });

      alert('✅ Order placed successfully!');
      setCart([]);
      setShowCheckout(false);
      
      // Navigate to order tracking
      navigate(`/orders/${restaurantId}/${customerMobile}`);
    } catch (err) {
      alert('Error placing order: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const joinHalfOrder = async (session) => {
    if (!customerName || !customerMobile) {
      alert('Please enter your name and mobile number first');
      // Scroll to checkout
      setShowCheckout(true);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/orders/join-half`, {
        session_id: session.id,
        table_id: tableId,
        table_number: table.table_number,
        customer_name: customerName,
        customer_mobile: customerMobile
      });

      alert(`✅ Successfully joined half order for ${session.menu_item_name}!`);
      fetchHalfOrderSessions();
      
      // Navigate to order tracking
      navigate(`/orders/${restaurantId}/${customerMobile}`);
    } catch (err) {
      alert('Error joining half order: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];
  const filteredMenu = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);
  
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  if (!restaurant || !table) {
    return <div className="spinner" />;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.restaurantName}>{restaurant.name}</h1>
          <p style={styles.tableInfo}>Table: {table.table_number}</p>
        </div>
        <div className="made-in-india">🇮🇳 Made in India</div>
      </div>

      {/* Half Order Sessions */}
      {halfOrderSessions.length > 0 && (
        <div style={styles.sessionsSection}>
          <h2 style={styles.sectionTitle}>🤝 Active Half Order Sessions</h2>
          <p style={styles.sessionDescription}>Join someone's half order to complete a full order!</p>
          <div style={styles.sessionsGrid}>
            {halfOrderSessions.map(session => (
              <div key={session.id} className="card" style={styles.sessionCard} data-testid={`half-session-${session.id}`}>
                <h3 style={styles.sessionItemName}>{session.menu_item_name}</h3>
                <p style={styles.sessionTable}>Table: {session.table_number}</p>
                <p style={styles.sessionTime}>
                  Expires: {new Date(session.expires_at).toLocaleTimeString('en-IN')}
                </p>
                <button
                  onClick={() => joinHalfOrder(session)}
                  className="btn-secondary"
                  disabled={loading || session.table_id === tableId}
                  style={{ width: '100%', marginTop: '12px' }}
                  data-testid={`join-session-${session.id}`}
                >
                  {session.table_id === tableId ? 'Your Session' : 'Join Half Order'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div style={styles.categories}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'btn-primary' : 'btn-outline'}
            style={{ marginRight: '10px', marginBottom: '10px', textTransform: 'capitalize' }}
            data-testid={`category-${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div style={styles.menuGrid}>
        {filteredMenu.map(item => (
          <div key={item.id} className="card" style={styles.menuCard} data-testid={`menu-item-${item.id}`}>
            <h3 style={styles.itemName}>{item.name}</h3>
            <p style={styles.category}>{item.category}</p>
            {item.description && <p style={styles.description}>{item.description}</p>}
            
            <div style={styles.priceRow}>
              <div>
                <span style={styles.priceLabel}>Full:</span>
                <span style={styles.price}>₹{item.full_price}</span>
              </div>
              {item.half_price && (
                <div>
                  <span style={styles.priceLabel}>Half:</span>
                  <span style={styles.price}>₹{item.half_price}</span>
                </div>
              )}
            </div>

            <div style={styles.itemActions}>
              <button
                onClick={() => addToCart(item, 'full')}
                className="btn-primary"
                style={{ flex: 1 }}
                data-testid={`add-full-${item.id}`}
              >
                Add Full
              </button>
              {item.half_price && (
                <button
                  onClick={() => addToCart(item, 'half')}
                  className="btn-secondary"
                  style={{ flex: 1, marginLeft: '8px' }}
                  data-testid={`add-half-${item.id}`}
                >
                  Add Half
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCheckout(true)}
          style={styles.cartButton}
          data-testid="view-cart-button"
        >
          🛒 View Cart ({cart.length}) - ₹{cartTotal.toFixed(2)}
        </button>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={styles.modal} onClick={() => setShowCheckout(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Your Order</h2>
            
            <div style={styles.cartItems}>
              {cart.map((item, idx) => (
                <div key={idx} style={styles.cartItem}>
                  <div>
                    <strong>{item.name}</strong> ({item.portion})
                    <br />
                    <span style={{ color: '#FF9933', fontWeight: '600' }}>₹{item.price}</span>
                  </div>
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: '14px' }}
                    data-testid={`remove-cart-item-${idx}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div style={styles.cartTotal}>
              <strong>Total:</strong>
              <strong style={{ fontSize: '24px', color: '#FF9933' }}>₹{cartTotal.toFixed(2)}</strong>
            </div>

            <form onSubmit={placeOrder} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label>Your Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="Enter your name"
                  data-testid="customer-name-input"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  required
                  placeholder="Enter mobile number"
                  pattern="[0-9]{10}"
                  data-testid="customer-mobile-input"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                  data-testid="place-order-button"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="btn-outline"
                  style={{ flex: 1 }}
                  data-testid="cancel-checkout-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '100px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  restaurantName: {
    fontSize: '32px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #FF6B35 0%, #FFA500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  tableInfo: {
    fontSize: '18px',
    color: '#666',
    fontWeight: '600'
  },
  sessionsSection: {
    marginBottom: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%)',
    borderRadius: '16px',
    border: '2px solid #FF9933'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '8px'
  },
  sessionDescription: {
    color: '#666',
    marginBottom: '16px'
  },
  sessionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  sessionCard: {
    padding: '16px',
    background: 'white'
  },
  sessionItemName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#FF9933',
    marginBottom: '8px'
  },
  sessionTable: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px'
  },
  sessionTime: {
    fontSize: '12px',
    color: '#999'
  },
  categories: {
    marginBottom: '24px'
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  menuCard: {
    padding: '20px'
  },
  itemName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '6px'
  },
  category: {
    fontSize: '14px',
    color: '#FF9933',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '8px'
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px'
  },
  priceRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0'
  },
  priceLabel: {
    fontSize: '14px',
    color: '#666',
    marginRight: '6px'
  },
  price: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#138808'
  },
  itemActions: {
    display: 'flex',
    gap: '8px'
  },
  cartButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    left: '20px',
    maxWidth: '500px',
    margin: '0 auto',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #FF9933 0%, #FFAB00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(255, 153, 51, 0.4)',
    transition: 'transform 0.2s',
    zIndex: 1000
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#333'
  },
  cartItems: {
    marginBottom: '20px'
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  cartTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderTop: '2px solid #f0f0f0',
    fontSize: '18px'
  }
};

export default CustomerMenu;
