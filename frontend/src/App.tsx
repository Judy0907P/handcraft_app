import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrgProvider } from './contexts/OrgContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrgSelectionPage from './pages/OrgSelectionPage';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import PartsPage from './pages/PartsPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrgProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/orgs"
              element={
                <ProtectedRoute>
                  <OrgSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="parts" element={<PartsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OrgProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

