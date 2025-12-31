import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { partTypesApi } from '../../services/api';
import { PartType } from '../../types';
import { X } from 'lucide-react';

interface PartTypeModalProps {
  type: PartType | null;
  onClose: () => void;
  onSave: () => void;
}

const PartTypeModal = ({ type, onClose, onSave }: PartTypeModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({ type_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type) {
      setFormData({ type_name: type.type_name });
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError('');
    setLoading(true);

    try {
      if (type) {
        // Update not implemented in backend, so we'll just close
        onClose();
      } else {
        await partTypesApi.create({
          org_id: currentOrg.org_id,
          type_name: formData.type_name,
        });
        onSave();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {type ? 'Edit Type' : 'Create Type'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name *</label>
            <input
              type="text"
              value={formData.type_name}
              onChange={(e) => setFormData({ type_name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
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

export default PartTypeModal;

