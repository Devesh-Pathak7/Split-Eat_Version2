import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const AdminDashboard = ({ auth }) => {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [restaurants, setRestaurants] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forms
  const [restaurantForm, setRestaurantForm] = useState({ name: '', address: '', phone: '', type: 'restaurant' });
  const [tableForm, setTableForm] = useState({ table_number: '' });
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: '',
    full_price: '',
    half_price: '',
    description: '',
    is_available: true
  });

  const token = auth.token;
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchTables();
      fetchMenuItems();
      fetchAnalytics();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get(`${API}/restaurants`);
      setRestaurants(res.data);
      if (res.data.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  };

  const fetchTables = async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await axios.get(`${API}/tables/restaurant/${selectedRestaurant}`);
      setTables(res.data);
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };

  const fetchMenuItems = async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await axios.get(`${API}/menu-items/restaurant/${selectedRestaurant}`);
      setMenuItems(res.data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedRestaurant) return;
    try {
      const res = await axios.get(`${API}/analytics/restaurant/${selectedRestaurant}`, config);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const createRestaurant = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/restaurants`, restaurantForm, config);
      setRestaurantForm({ name: '', address: '', phone: '', type: 'restaurant' });
      fetchRestaurants();
      alert('Restaurant created successfully!');
    } catch (err) {
      alert('Error creating restaurant: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const deleteRestaurant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      await axios.delete(`${API}/restaurants/${id}`, config);
      fetchRestaurants();
      if (selectedRestaurant === id) setSelectedRestaurant(null);
      alert('Restaurant deleted successfully!');
    } catch (err) {
      alert('Error deleting restaurant');
    }
  };

  const createTable = async (e) => {
    e.preventDefault();
    if (!selectedRestaurant) {
      alert('Please select a restaurant first');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/tables`, {
        restaurant_id: selectedRestaurant,
        table_number: tableForm.table_number
      }, config);
      setTableForm({ table_number: '' });
      fetchTables();
      alert('Table created successfully!');
    } catch (err) {
      alert('Error creating table: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createMenuItem = async (e) => {
    e.preventDefault();
    if (!selectedRestaurant) {
      alert('Please select a restaurant first');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/menu-items`, {
        ...menuForm,
        restaurant_id: selectedRestaurant,
        full_price: parseFloat(menuForm.full_price),
        half_price: menuForm.half_price ? parseFloat(menuForm.half_price) : null
      }, config);
      setMenuForm({
        name: '',
        category: '',
        full_price: '',
        half_price: '',
        description: '',
        is_available: true
      });
      fetchMenuItems();
      alert('Menu item created successfully!');
    } catch (err) {
      alert('Error creating menu item: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await axios.delete(`${API}/menu-items/${id}`, config);
      fetchMenuItems();
      alert('Menu item deleted successfully!');
    } catch (err) {
      alert('Error deleting menu item');
    }
  };

  const toggleMenuItemAvailability = async (id, currentStatus) => {
    try {
      await axios.patch(`${API}/menu-items/${id}`, { is_available: !currentStatus }, config);
      fetchMenuItems();
    } catch (err) {
      alert('Error updating menu item');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🍽️ SplitEat - Admin Dashboard</h1>
          <div className="made-in-india" style={{ marginTop: '8px' }}>🇮🇳 Made in India</div>
        </div>
        <button onClick={() => { auth.logout(); navigate('/login'); }} className="btn-outline" data-testid="admin-logout-button">
          Logout
        </button>
      </div>

      {/* Restaurant Selector */}
      {restaurants.length > 0 && (
        <div style={styles.selector}>
          <label><strong>Select Restaurant:</strong></label>
          <select
            value={selectedRestaurant || ''}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            style={{ maxWidth: '300px' }}
            data-testid="restaurant-selector"
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Analytics */}
      {analytics && (
        <div style={styles.analytics}>
          <div className="card" style={styles.statCard}>
            <h3 style={styles.statValue}>₹{analytics.total_revenue.toFixed(2)}</h3>
            <p style={styles.statLabel}>Total Revenue</p>
          </div>
          <div className="card" style={styles.statCard}>
            <h3 style={styles.statValue}>{analytics.total_orders}</h3>
            <p style={styles.statLabel}>Total Orders</p>
          </div>
          <div className="card" style={styles.statCard}>
            <h3 style={styles.statValue}>{analytics.active_orders}</h3>
            <p style={styles.statLabel}>Active Orders</p>
          </div>
          <div className="card" style={styles.statCard}>
            <h3 style={styles.statValue}>{analytics.active_half_order_sessions}</h3>
            <p style={styles.statLabel}>Active Half Sessions</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('restaurants')}
          className={activeTab === 'restaurants' ? 'btn-primary' : 'btn-outline'}
          style={{ marginRight: '10px' }}
          data-testid="tab-restaurants"
        >
          Restaurants
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={activeTab === 'tables' ? 'btn-primary' : 'btn-outline'}
          style={{ marginRight: '10px' }}
          data-testid="tab-tables"
        >
          Tables
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={activeTab === 'menu' ? 'btn-primary' : 'btn-outline'}
          data-testid="tab-menu"
        >
          Menu Items
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'restaurants' && (
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <h2 style={styles.sectionTitle}>Create Restaurant</h2>
              <form onSubmit={createRestaurant} style={styles.form}>
                <div style={styles.formGrid}>
                  <div>
                    <label>Name</label>
                    <input
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                      required
                      data-testid="restaurant-name-input"
                    />
                  </div>
                  <div>
                    <label>Type</label>
                    <select
                      value={restaurantForm.type}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, type: e.target.value })}
                      data-testid="restaurant-type-select"
                    >
                      <option value="restaurant">Restaurant</option>
                      <option value="bar">Bar</option>
                    </select>
                  </div>
                  <div>
                    <label>Phone</label>
                    <input
                      value={restaurantForm.phone}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                      required
                      data-testid="restaurant-phone-input"
                    />
                  </div>
                  <div>
                    <label>Address</label>
                    <input
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      required
                      data-testid="restaurant-address-input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '16px' }} data-testid="create-restaurant-button">
                  {loading ? 'Creating...' : 'Create Restaurant'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={styles.sectionTitle}>All Restaurants</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id}>
                      <td data-testid={`restaurant-name-${r.id}`}>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{r.phone}</td>
                      <td>{r.address}</td>
                      <td>
                        <button onClick={() => deleteRestaurant(r.id)} className="btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }} data-testid={`delete-restaurant-${r.id}`}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <h2 style={styles.sectionTitle}>Create Table</h2>
              <form onSubmit={createTable} style={styles.form}>
                <div style={styles.formGrid}>
                  <div>
                    <label>Table Number</label>
                    <input
                      value={tableForm.table_number}
                      onChange={(e) => setTableForm({ table_number: e.target.value })}
                      placeholder="e.g., T1, T2, Table 10"
                      required
                      data-testid="table-number-input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !selectedRestaurant} style={{ marginTop: '16px' }} data-testid="create-table-button">
                  {loading ? 'Creating...' : 'Create Table'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={styles.sectionTitle}>All Tables</h2>
              {!selectedRestaurant ? (
                <p>Please select a restaurant first</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Table Number</th>
                      <th>QR Code URL</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map(t => (
                      <tr key={t.id}>
                        <td data-testid={`table-number-${t.id}`}>{t.table_number}</td>
                        <td>
                          <a href={t.qr_url} target="_blank" rel="noopener noreferrer" style={{ color: '#FF9933', fontWeight: '600' }}>
                            {t.qr_url}
                          </a>
                        </td>
                        <td>
                          <span className="status-badge" style={{ background: t.is_active ? '#d4edda' : '#f8d7da' }}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <h2 style={styles.sectionTitle}>Add Menu Item</h2>
              <form onSubmit={createMenuItem} style={styles.form}>
                <div style={styles.formGrid}>
                  <div>
                    <label>Name</label>
                    <input
                      value={menuForm.name}
                      onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                      required
                      data-testid="menu-item-name-input"
                    />
                  </div>
                  <div>
                    <label>Category</label>
                    <input
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      placeholder="e.g., Starters, Main Course"
                      required
                      data-testid="menu-item-category-input"
                    />
                  </div>
                  <div>
                    <label>Full Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={menuForm.full_price}
                      onChange={(e) => setMenuForm({ ...menuForm, full_price: e.target.value })}
                      required
                      data-testid="menu-item-full-price-input"
                    />
                  </div>
                  <div>
                    <label>Half Price (₹) - Optional</label>
                    <input
                      type="number"
                      step="0.01"
                      value={menuForm.half_price}
                      onChange={(e) => setMenuForm({ ...menuForm, half_price: e.target.value })}
                      data-testid="menu-item-half-price-input"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea
                      value={menuForm.description}
                      onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                      rows="2"
                      data-testid="menu-item-description-input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !selectedRestaurant} style={{ marginTop: '16px' }} data-testid="create-menu-item-button">
                  {loading ? 'Adding...' : 'Add Menu Item'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={styles.sectionTitle}>Menu Items</h2>
              {!selectedRestaurant ? (
                <p>Please select a restaurant first</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Full Price</th>
                      <th>Half Price</th>
                      <th>Available</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td data-testid={`menu-item-name-${item.id}`}>{item.name}</td>
                        <td>{item.category}</td>
                        <td>₹{item.full_price}</td>
                        <td>{item.half_price ? `₹${item.half_price}` : 'N/A'}</td>
                        <td>
                          <button
                            onClick={() => toggleMenuItemAvailability(item.id, item.is_available)}
                            className="status-badge"
                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              background: item.is_available ? '#d4edda' : '#f8d7da',
                              color: item.is_available ? '#155724' : '#721c24'
                            }}
                            data-testid={`toggle-availability-${item.id}`}
                          >
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                        <td>
                          <button onClick={() => deleteMenuItem(item.id)} className="btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }} data-testid={`delete-menu-item-${item.id}`}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
    background: 'linear-gradient(135deg, #FF6B35 0%, #FFA500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  selector: {
    marginBottom: '24px'
  },
  analytics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    textAlign: 'center',
    padding: '24px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  tabs: {
    marginBottom: '24px'
  },
  content: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#333'
  },
  form: {
    marginTop: '16px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  }
};

export default AdminDashboard;
