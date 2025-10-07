import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const CounterDashboard = ({ auth }) => {
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const navigate = useNavigate();

  const token = auth.token;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      // Poll every 5 seconds for real-time updates
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get(`${API}/restaurants`);
      setRestaurants(res.data);
      
      // If counter role, use their assigned restaurant
      if (auth.user.role === 'counter' && auth.user.restaurant_id) {
        setSelectedRestaurant(auth.user.restaurant_id);
      } else if (res.data.length > 0) {
        setSelectedRestaurant(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  };

  const fetchOrders = async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await axios.get(`${API}/orders/restaurant/${selectedRestaurant}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, config);
      fetchOrders();
    } catch (err) {
      alert('Error updating order status');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    if (filter === 'active') {
      return orders.filter(o => ['OPEN', 'MATCHED', 'PREPARING'].includes(o.status));
    } else if (filter === 'completed') {
      return orders.filter(o => ['SERVED', 'CANCELLED', 'EXPIRED'].includes(o.status));
    }
    return orders;
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

  const filteredOrders = getFilteredOrders();
  const activeCount = orders.filter(o => ['OPEN', 'MATCHED', 'PREPARING'].includes(o.status)).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Counter Dashboard</h1>
          <div className="made-in-india" style={{ marginTop: '8px' }}>🇮🇳 Made in India</div>
        </div>
        <button onClick={() => { auth.logout(); navigate('/login'); }} className="btn-outline" data-testid="counter-logout-button">
          Logout
        </button>
      </div>

      {/* Restaurant Selector */}
      {restaurants.length > 0 && auth.user.role === 'super_admin' && (
        <div style={styles.selector}>
          <label><strong>Select Restaurant:</strong></label>
          <select
            value={selectedRestaurant || ''}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            style={{ maxWidth: '300px' }}
            data-testid="counter-restaurant-selector"
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div style={styles.stats}>
        <div className="card" style={styles.statCard}>
          <h3 style={styles.statValue}>{activeCount}</h3>
          <p style={styles.statLabel}>Active Orders</p>
        </div>
        <div className="card" style={styles.statCard}>
          <h3 style={styles.statValue}>{orders.filter(o => o.status === 'OPEN').length}</h3>
          <p style={styles.statLabel}>Pending</p>
        </div>
        <div className="card" style={styles.statCard}>
          <h3 style={styles.statValue}>{orders.filter(o => o.status === 'PREPARING').length}</h3>
          <p style={styles.statLabel}>Preparing</p>
        </div>
        <div className="card" style={styles.statCard}>
          <h3 style={styles.statValue}>{orders.filter(o => o.status === 'SERVED').length}</h3>
          <p style={styles.statLabel}>Served</p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'btn-primary' : 'btn-outline'}
          style={{ marginRight: '10px' }}
          data-testid="filter-all"
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'btn-primary' : 'btn-outline'}
          style={{ marginRight: '10px' }}
          data-testid="filter-active"
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'btn-primary' : 'btn-outline'}
          data-testid="filter-completed"
        >
          Completed ({orders.filter(o => ['SERVED', 'CANCELLED', 'EXPIRED'].includes(o.status)).length})
        </button>
      </div>

      {/* Orders List */}
      <div style={styles.ordersGrid}>
        {filteredOrders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="card" style={styles.orderCard} data-testid={`order-card-${order.id}`}>
              <div style={styles.orderHeader}>
                <div>
                  <h3 style={styles.tableNumber}>Table {order.table_number}</h3>
                  <p style={styles.customerName}>{order.customer_name}</p>
                  <p style={styles.mobile}>📞 {order.customer_mobile}</p>
                </div>
                <span
                  className="status-badge"
                  style={{ background: getStatusColor(order.status) }}
                  data-testid={`order-status-${order.id}`}
                >
                  {order.status}
                </span>
              </div>

              <div style={styles.orderItems}>
                <h4 style={styles.itemsTitle}>Items:</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} style={styles.item}>
                    <span>{item.name} ({item.portion})</span>
                    <span style={{ fontWeight: '600' }}>₹{item.price}</span>
                  </div>
                ))}
                <div style={styles.totalRow}>
                  <span style={{ fontWeight: '700' }}>Total:</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#FF9933' }}>₹{order.total_amount}</span>
                </div>
              </div>

              {order.matched_order_id && (
                <div style={styles.matchedInfo}>
                  🤝 Matched with Table {order.matched_table_number}
                </div>
              )}

              <div style={styles.orderActions}>
                {order.status === 'OPEN' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%' }}
                    data-testid={`accept-order-${order.id}`}
                  >
                    Accept & Start Preparing
                  </button>
                )}
                {order.status === 'MATCHED' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%' }}
                    data-testid={`start-preparing-${order.id}`}
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'SERVED')}
                    className="btn-secondary"
                    disabled={loading}
                    style={{ width: '100%' }}
                    data-testid={`mark-served-${order.id}`}
                  >
                    Mark as Served
                  </button>
                )}
                {['OPEN', 'MATCHED', 'PREPARING'].includes(order.status) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                    className="btn-outline"
                    disabled={loading}
                    style={{ width: '100%', marginTop: '8px', color: '#dc3545', borderColor: '#dc3545' }}
                    data-testid={`cancel-order-${order.id}`}
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <div style={styles.orderTime}>
                {new Date(order.created_at).toLocaleString('en-IN')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1400px',
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
    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  selector: {
    marginBottom: '24px'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    textAlign: 'center',
    padding: '20px'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#FF9933',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  filters: {
    marginBottom: '24px'
  },
  ordersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  orderCard: {
    padding: '20px'
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0'
  },
  tableNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FF9933',
    marginBottom: '4px'
  },
  customerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '2px'
  },
  mobile: {
    fontSize: '14px',
    color: '#666'
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
  orderActions: {
    marginTop: '16px'
  },
  orderTime: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#999',
    textAlign: 'center'
  }
};

export default CounterDashboard;
