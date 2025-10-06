import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./pages/AdminDashboard";
import CounterDashboard from "./pages/CounterDashboard";
import CustomerMenu from "./pages/CustomerMenu";
import Login from "./pages/Login";
import CustomerOrders from "./pages/CustomerOrders";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return { user, token, login, logout };
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const auth = useAuth();

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login auth={auth} />} />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={auth.user} allowedRoles={["super_admin"]}>
                <AdminDashboard auth={auth} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/counter"
            element={
              <ProtectedRoute user={auth.user} allowedRoles={["counter", "super_admin"]}>
                <CounterDashboard auth={auth} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/menu/:restaurantId/:tableId"
            element={<CustomerMenu />}
          />
          
          <Route
            path="/orders/:restaurantId/:mobile"
            element={<CustomerOrders />}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
