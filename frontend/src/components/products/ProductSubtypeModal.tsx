import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { productSubtypesApi, productTypesApi } from '../../services/api';
import { ProductType } from '../../types';
import { X } from 'lucide-react';

interface ProductSubtypeModalProps {
  type: ProductType | null;
  onClose: () => void;
  onSave: () => void;
}

const ProductSubtypeModal = ({ type, onClose, onSave }: ProductSubtypeModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({ product_type_id: '', name: '', description: '' });
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrg) {
      productTypesApi.getAll(currentOrg.org_id).then((res) => {
        setProductTypes(res.data);
        if (type) {
          setFormData({ product_type_id: type.product_type_id, name: '', description: '' });
        } else if (res.data.length > 0) {
          setFormData({ product_type_id: res.data[0].product_type_id, name: '', description: '' });
        }
      });
    }
  }, [currentOrg, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await productSubtypesApi.create({
        product_type_id: formData.product_type_id,
        name: formData.name,
        description: formData.description || undefined,
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
              value={formData.product_type_id}
              onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
              required
              disabled={!!type}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            >
              {productTypes.map((pt) => (
                <option key={pt.product_type_id} value={pt.product_type_id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtype Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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

export default ProductSubtypeModal;

