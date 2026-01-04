import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { User, Building2, LogOut, DollarSign, Globe, Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { organizationsApi, platformsApi } from '../services/api';
import { Platform } from '../types';
import PlatformModal from '../components/platforms/PlatformModal';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { currentOrg, setCurrentOrg, refreshOrganizations } = useOrg();
  const navigate = useNavigate();
  
  // Currency settings form state
  const [currencyFormData, setCurrencyFormData] = useState({
    main_currency: '',
    additional_currency: '',
    exchange_rate: '1.0',
  });
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Platform management state
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [deletingPlatform, setDeletingPlatform] = useState<string | null>(null);

  // Initialize form data when currentOrg changes
  useEffect(() => {
    if (currentOrg) {
      setCurrencyFormData({
        main_currency: currentOrg.main_currency || 'USD',
        additional_currency: currentOrg.additional_currency || '',
        exchange_rate: currentOrg.exchange_rate || '1.0',
      });
      loadPlatforms();
    }
  }, [currentOrg]);

  const loadPlatforms = async () => {
    if (!currentOrg) return;
    setLoadingPlatforms(true);
    try {
      const response = await platformsApi.getAll(currentOrg.org_id);
      setPlatforms(response.data);
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const handleCreatePlatform = () => {
    setSelectedPlatform(null);
    setShowPlatformModal(true);
  };

  const handleEditPlatform = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowPlatformModal(true);
  };

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this platform? This action cannot be undone.')) {
      return;
    }

    setDeletingPlatform(platformId);
    try {
      await platformsApi.delete(platformId);
      await loadPlatforms();
    } catch (error: any) {
      console.error('Failed to delete platform:', error);
      alert(error.response?.data?.detail || 'Failed to delete platform');
    } finally {
      setDeletingPlatform(null);
    }
  };

  const handlePlatformSave = () => {
    loadPlatforms();
  };

  const handleLogout = () => {
    logout();
    setCurrentOrg(null);
    navigate('/login');
  };

  const handleChangeOrg = () => {
    setCurrentOrg(null);
    navigate('/orgs');
  };

  const handleSaveCurrencySettings = async () => {
    if (!currentOrg) return;

    setIsSavingCurrency(true);
    setCurrencyMessage(null);

    try {
      const updateData: {
        main_currency?: string;
        additional_currency?: string;
        exchange_rate?: string;
      } = {};

      if (currencyFormData.main_currency) {
        updateData.main_currency = currencyFormData.main_currency;
      }
      if (currencyFormData.additional_currency) {
        updateData.additional_currency = currencyFormData.additional_currency;
      } else {
        // If empty, clear the additional currency (set to undefined, not null)
        updateData.additional_currency = undefined;
      }
      if (currencyFormData.exchange_rate) {
        const exchangeRate = parseFloat(currencyFormData.exchange_rate);
        if (isNaN(exchangeRate) || exchangeRate <= 0) {
          setCurrencyMessage({ type: 'error', text: 'Exchange rate must be a positive number' });
          setIsSavingCurrency(false);
          return;
        }
        updateData.exchange_rate = currencyFormData.exchange_rate;
      }

      const response = await organizationsApi.update(currentOrg.org_id, updateData);
      
      // Update the current org in context
      setCurrentOrg(response.data);
      
      // Refresh organizations list
      await refreshOrganizations();
      
      setCurrencyMessage({ type: 'success', text: 'Currency settings saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setCurrencyMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to update currency settings:', error);
      setCurrencyMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save currency settings',
      });
    } finally {
      setIsSavingCurrency(false);
    }
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
            {user?.username && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <p className="text-gray-900">{user.username}</p>
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

        {/* Platform Management */}
        {currentOrg && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Platforms</h2>
              </div>
              <button
                onClick={handleCreatePlatform}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Platform
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage your sales platforms. Channels are fixed (online/offline), but you can create custom platform names for your store.
            </p>
            {loadingPlatforms ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : platforms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No platforms yet. Create your first platform to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {platforms.map((platform) => (
                      <tr key={platform.platform_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {platform.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            platform.channel === 'online' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {platform.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditPlatform(platform)}
                              className="text-primary-600 hover:text-primary-700 p-1"
                              title="Edit platform"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlatform(platform.platform_id)}
                              disabled={deletingPlatform === platform.platform_id}
                              className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete platform"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Currency Settings */}
        {currentOrg && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Currency Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Currency <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currencyFormData.main_currency}
                  onChange={(e) => setCurrencyFormData({ ...currencyFormData, main_currency: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The main currency used throughout the store
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Currency (Optional)
                </label>
                <input
                  type="text"
                  value={currencyFormData.additional_currency}
                  onChange={(e) => setCurrencyFormData({ ...currencyFormData, additional_currency: e.target.value.toUpperCase() })}
                  placeholder="CNY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional second currency for input when editing parts/products
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Rate {currencyFormData.additional_currency && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={currencyFormData.exchange_rate}
                  onChange={(e) => setCurrencyFormData({ ...currencyFormData, exchange_rate: e.target.value })}
                  placeholder="7.2"
                  disabled={!currencyFormData.additional_currency}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {currencyFormData.additional_currency ? (
                    <>1 {currencyFormData.main_currency} = {currencyFormData.exchange_rate || '1.0'} {currencyFormData.additional_currency}</>
                  ) : (
                    'Enter an additional currency to set the exchange rate'
                  )}
                </p>
              </div>

              {currencyMessage && (
                <div
                  className={`p-3 rounded-md ${
                    currencyMessage.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {currencyMessage.text}
                </div>
              )}

              <button
                onClick={handleSaveCurrencySettings}
                disabled={isSavingCurrency || !currencyFormData.main_currency}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSavingCurrency ? 'Saving...' : 'Save Currency Settings'}
              </button>
            </div>
          </div>
        )}

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
            CraftFlow v1.0.0
          </p>
          <p className="text-gray-600 mt-2">
            Manage your handcraft inventory, products, and sales all in one place.
          </p>
        </div>
      </div>

      {/* Platform Modal */}
      {showPlatformModal && (
        <PlatformModal
          platform={selectedPlatform}
          onClose={() => {
            setShowPlatformModal(false);
            setSelectedPlatform(null);
          }}
          onSave={handlePlatformSave}
        />
      )}
    </div>
  );
};

export default SettingsPage;

