import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContextContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Weather from './pages/Weather';
import Crops from './pages/Crops';
import Pests from './pages/Pests';
import Soil from './pages/Soil';
import Market from './pages/Market';
import Login from './pages/Login';
import Signup from './pages/Signup';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-brand-green-600 bg-brand-green-50">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Main App Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="crops" element={<Crops />} />
        <Route path="weather" element={<Weather />} />
        <Route path="soil" element={<Soil />} />
        <Route path="pests" element={<Pests />} />
        <Route path="market" element={<Market />} />
      </Route>
    </Routes>
  );
}

export default App;
