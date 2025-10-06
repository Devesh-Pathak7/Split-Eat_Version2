import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const CustomerOrders = () => {
  const { restaurantId, mobile } = useParams();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [restRes, ordersRes] = await Promise.all([
        axios.get(`${API}/restaurants/${restaurantId}`),
        axios.get(`${API}/orders/customer/${mobile}/${restaurantId}`)
      ]);
      
      setRestaurant(restRes.data);
      setOrders(ordersRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Error loading orders');
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders/customer/${mobile}/${restaurantId}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#fff3cd',
      'MATCHED': '#d1ecf1',
      'PREPARING': '#cce5ff',
      'SERVED': '#d4edda',
      'EXPIRED': '#f8d7da',
      'CANCELLED': '#f8d7da'
    };
    return colors[status] || '#e0e0e0';
  };

  const getStatusEmoji = (status) => {
    const emojis = {
      'OPEN': '⏳',
      'MATCHED': '🤝',
      'PREPARING': '👨‍🍳',
      'SERVED': '✅',
      'EXPIRED': '⏰',
      'CANCELLED': '❌'
    };
    return emojis[status] || '📋';
  };

  const getStatusMessage = (status) => {
    const messages = {
      'OPEN': 'Your order has been received and is waiting for restaurant confirmation.',
      'MATCHED': 'Your half order has been matched with another table!',
      'PREPARING': 'Your order is being prepared.',
      'SERVED': 'Your order has been served. Enjoy your meal!',
      'EXPIRED': 'Your half order session expired without a match.',
      'CANCELLED': 'This order was cancelled.'
    };
    return messages[status] || 'Order status unknown';
  };

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 My Orders</h1>
          {restaurant && <p style={styles.restaurantName}>{restaurant.name}</p>}
          <p style={styles.mobile}>📞 {mobile}</p>
        </div>
        <div className="made-in-india">🇮🇳 Made in India</div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
            No orders found
          </p>
          <button 
            onClick={() => navigate(-1)} 
            className="btn-primary"
            data-testid="back-to-menu-button"
          >
            Back to Menu
          </button>
        </div>
      ) : (
        <div style={styles.ordersGrid}>
          {orders.map(order => (
            <div key={order.id} className="card" style={styles.orderCard} data-testid={`customer-order-${order.id}`}>
              <div style={styles.orderHeader}>
                <div>
                  <h3 style={styles.orderTitle}>Order #{order.id.substring(0, 8)}</h3>
                  <p style={styles.tableInfo}>Table: {order.table_number}</p>
                </div>
                <span 
                  className="status-badge" 
                  style={{ background: getStatusColor(order.status) }}
                  data-testid={`customer-order-status-${order.id}`}
                >
                  {getStatusEmoji(order.status)} {order.status}
                </span>
              </div>

              <div style={styles.statusMessage}>
                {getStatusMessage(order.status)}
              </div>

              {order.matched_order_id && (
                <div style={styles.matchedInfo}>
                  🤝 Matched with Table {order.matched_table_number}
                </div>
              )}

              <div style={styles.orderItems}>
                <h4 style={styles.itemsTitle}>Items:</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} style={styles.item}>
                    <span>
                      {item.name} 
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginLeft: '8px',
                        textTransform: 'uppercase'
                      }}>
                        ({item.portion})
                      </span>
                    </span>
                    <span style={{ fontWeight: '600' }}>₹{item.price}</span>
                  </div>
                ))}
                <div style={styles.totalRow}>
                  <span style={{ fontWeight: '700' }}>Total:</span>
                  <span style={{ fontWeight: '700', fontSize: '20px', color: '#FF9933' }}>
                    ₹{order.total_amount}
                  </span>
                </div>
              </div>

              <div style={styles.orderTime}>
                Placed: {new Date(order.created_at).toLocaleString('en-IN')}
              </div>

              {order.status === 'SERVED' && (
                <div style={styles.servedBadge}>
                  ✅ Served at {new Date(order.updated_at).toLocaleTimeString('en-IN')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={styles.footer}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn-outline"
          data-testid="back-button"
        >
          ← Back to Menu
        </button>
        <button 
          onClick={fetchOrders} 
          className="btn-primary"
          data-testid="refresh-orders-button"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #FF9933 0%, #138808 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  restaurantName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '4px'
  },
  mobile: {
    fontSize: '16px',
    color: '#999'
  },
  ordersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  orderCard: {
    padding: '20px'
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0'
  },
  orderTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '4px'
  },
  tableInfo: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '600'
  },
  statusMessage: {
    background: '#f8f9fa',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.5'
  },
  matchedInfo: {
    background: '#d1ecf1',
    color: '#0c5460',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  orderItems: {
    marginBottom: '16px'
  },
  itemsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    marginTop: '8px',
    borderTop: '2px solid #f0f0f0'
  },
  orderTime: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
    marginTop: '12px'
  },
  servedBadge: {
    background: '#d4edda',
    color: '#155724',
    padding: '10px',
    borderRadius: '8px',
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center'
  },
  footer: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '32px'
  }
};

export default CustomerOrders;
