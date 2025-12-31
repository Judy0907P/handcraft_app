import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { User, Building2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { currentOrg, setCurrentOrg } = useOrg();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setCurrentOrg(null);
    navigate('/login');
  };

  const handleChangeOrg = () => {
    setCurrentOrg(null);
    navigate('/orgs');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {/* User Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">User Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            {user?.display_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <p className="text-gray-900">{user.display_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Organization Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Organization</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Shop</label>
              <p className="text-gray-900">{currentOrg?.name || 'No shop selected'}</p>
            </div>
            <button
              onClick={handleChangeOrg}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Change Shop
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Actions</h2>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* About */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
          <p className="text-gray-600">
            Handcraft Management System v1.0.0
          </p>
          <p className="text-gray-600 mt-2">
            Manage your handcraft inventory, products, and sales all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

