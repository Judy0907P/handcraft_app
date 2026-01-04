import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { platformsApi } from '../../services/api';
import { Platform } from '../../types';
import { X } from 'lucide-react';

interface PlatformModalProps {
  platform: Platform | null;
  onClose: () => void;
  onSave: () => void;
}

const PlatformModal = ({ platform, onClose, onSave }: PlatformModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({ name: '', channel: 'online' as 'online' | 'offline' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (platform) {
      setFormData({ name: platform.name, channel: platform.channel });
    } else {
      setFormData({ name: '', channel: 'online' });
    }
  }, [platform]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError('');
    setLoading(true);

    try {
      if (platform) {
        // Update existing platform
        await platformsApi.update(platform.platform_id, {
          name: formData.name,
          channel: formData.channel,
        });
      } else {
        // Create new platform
        await platformsApi.create({
          org_id: currentOrg.org_id,
          name: formData.name,
          channel: formData.channel,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save platform');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {platform ? 'Edit Platform' : 'Create Platform'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Etsy, WeChat, Soso Market"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value as 'online' | 'offline' })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlatformModal;

