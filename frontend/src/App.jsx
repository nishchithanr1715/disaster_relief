import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import VictimDashboard from './pages/VictimDashboard';
import NGOAdminDashboard from './pages/NGOAdminDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ResourceManagement from './pages/ResourceManagement';
import ChatBox from './components/ChatBox';
import Layout from './layouts/Layout';

// Placeholder components for roles
const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    if (user.role === 'VICTIM') return <Navigate to="/victim" replace />;
    if (user.role === 'VOLUNTEER') return <Navigate to="/volunteer" replace />;
    if (user.role === 'NGO_ADMIN') return <Navigate to="/admin" replace />;
  }

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
    <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-red-400">
      Disaster Relief Platform
    </h1>
    <p className="text-slate-400 text-xl mb-8 max-w-2xl text-center">
      Connecting victims, volunteers, and NGOs in real-time to save lives and coordinate relief efforts efficiently.
    </p>
    <div className="flex gap-4">
      <Link to="/login" className="btn-primary text-lg px-8 py-3 flex items-center justify-center">Get Started</Link>
      <Link to="/register" className="btn-secondary text-lg px-8 py-3 bg-transparent text-white border-white/20 hover:bg-white/5 flex items-center justify-center">Register</Link>
    </div>
  </div>
  );
};

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      
      {/* Protected Routes */}
      <Route 
        path="/victim/*" 
        element={
          <ProtectedRoute roles={['VICTIM']}>
            <VictimDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/volunteer/*" 
        element={
          <ProtectedRoute roles={['VOLUNTEER']}>
            <VolunteerDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute roles={['NGO_ADMIN']}>
            <Routes>
              <Route index element={<NGOAdminDashboard />} />
              <Route path="resources" element={<ResourceManagement />} />
              <Route path="chat" element={
                <Layout>
                  <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Command Center Chat</h2>
                    <ChatBox />
                  </div>
                </Layout>
              } />
              {/* Other admin subroutes */}
            </Routes>
          </ProtectedRoute>
        } 
      />

      <Route path="/unauthorized" element={<div className="p-8 text-center text-red-600 font-bold">Unauthorized Access</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
