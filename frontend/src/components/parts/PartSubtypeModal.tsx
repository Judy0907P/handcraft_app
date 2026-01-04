import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { partSubtypesApi, partTypesApi } from '../../services/api';
import { PartType } from '../../types';
import { X } from 'lucide-react';

interface PartSubtypeModalProps {
  type: PartType | null;
  onClose: () => void;
  onSave: () => void;
}

const PartSubtypeModal = ({ type, onClose, onSave }: PartSubtypeModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({ type_id: '', subtype_name: '' });
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrg) {
      partTypesApi.getAll(currentOrg.org_id).then((res) => {
        setPartTypes(res.data);
        if (type) {
          setFormData({ type_id: type.type_id, subtype_name: '' });
        } else if (res.data.length > 0) {
          setFormData({ type_id: res.data[0].type_id, subtype_name: '' });
        }
      });
    }
  }, [currentOrg, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await partSubtypesApi.create({
        type_id: formData.type_id,
        subtype_name: formData.subtype_name,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save subtype');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Subtype</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={formData.type_id}
              onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
              required
              disabled={!!type}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            >
              {partTypes.map((pt) => (
                <option key={pt.type_id} value={pt.type_id}>
                  {pt.type_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtype Name *</label>
            <input
              type="text"
              value={formData.subtype_name}
              onChange={(e) => setFormData({ ...formData, subtype_name: e.target.value })}
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

export default PartSubtypeModal;

