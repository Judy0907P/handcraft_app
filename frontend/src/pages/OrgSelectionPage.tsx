import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { organizationsApi } from '../services/api';
import { Building2, Plus, ArrowRight } from 'lucide-react';

const OrgSelectionPage = () => {
  const { organizations, refreshOrganizations, setCurrentOrg } = useOrg();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    refreshOrganizations();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await organizationsApi.create({ name: orgName });
      await refreshOrganizations();
      setCurrentOrg(response.data);
      setShowCreateForm(false);
      setOrgName('');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = (org: any) => {
    setCurrentOrg(org);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Select Your Shop</h1>
          <p className="text-gray-600">Choose an organization or create a new one</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {!showCreateForm ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {organizations.map((org) => (
                <button
                  key={org.org_id}
                  onClick={() => handleSelectOrg(org)}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary-500 text-left group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Building2 className="w-6 h-6 text-primary-600" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{org.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full md:w-auto bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create New Shop
            </button>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Shop</h2>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="My Handcraft Shop"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setOrgName('');
                    setError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgSelectionPage;

