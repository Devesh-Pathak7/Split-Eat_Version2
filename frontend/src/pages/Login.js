import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const Login = ({ auth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      const { access_token, user } = response.data;
      auth.login(user, access_token);

      // Navigate based on role
      if (user.role === 'super_admin') {
        navigate('/admin');
      } else if (user.role === 'counter') {
        navigate('/counter');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>🍽️ SplitEat</h1>
          <p style={styles.subtitle}>Restaurant & Bar Management</p>
          <div className="made-in-india" style={styles.badge}>
            🇮🇳 Made in India
          </div>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              data-testid="login-username-input"
            />
          </div>

          <div style={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              data-testid="login-password-input"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '10px' }}
            data-testid="login-submit-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.info}>
          <p style={styles.infoText}>👤 <strong>Demo Credentials:</strong></p>
          <p style={styles.infoText}>Super Admin: admin / admin123</p>
          <p style={styles.infoText}>Counter: counter1 / counter123</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 50%, #FFEDD5 100%)'
  },
  loginBox: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(255, 107, 53, 0.2)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #FF6B35 0%, #FFA500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '16px'
  },
  badge: {
    display: 'inline-flex',
    margin: '0 auto'
  },
  form: {
    marginTop: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '12px',
    fontSize: '14px'
  },
  info: {
    marginTop: '24px',
    padding: '16px',
    background: '#FFF7ED',
    borderRadius: '12px',
    borderLeft: '4px solid #FF6B35'
  },
  infoText: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0'
  }
};

export default Login;
