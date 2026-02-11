import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ChatProvider } from './context/ChatProvider';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import DealerDashboard from './pages/Dealer/Dashboard';
import './styles/index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'dealer' }> = ({ children, requiredRole }) => {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: '#fff' }}>
      <div className="loading-spinner">Initializing Session...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (!profile) {
    // If we have a user but no profile, we might be waiting for the trigger or something went wrong
    // Instead of looping, show an error or a minimal dashboard
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: '#fff', gap: '20px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Account Setup in Progress</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '20px' }}>
          We're preparing your partner portal. If this takes more than a few seconds,
          you may need to refresh your session.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '12px 24px' }}>Refresh Status</button>
          <button onClick={() => signOut()} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dealer'} />;
  }

  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', color: '#fff' }}>
      <div className="loading-spinner">Initializing...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (profile?.role === 'admin') return <Navigate to="/admin" />;
  return <Navigate to="/dealer" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/admin/*" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/dealer/*" element={
              <ProtectedRoute requiredRole="dealer">
                <DealerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
