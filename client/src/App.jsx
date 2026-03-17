import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthContext } from './context/auth-context';
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
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-surface card-neuro flex items-center gap-3 rounded-2xl px-6 py-4 text-emerald-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Preparing your farm workspace...</span>
        </div>
      </div>
    );
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
