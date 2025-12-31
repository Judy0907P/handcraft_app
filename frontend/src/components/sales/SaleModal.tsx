import { useState } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { salesApi } from '../../services/api';
import { Product } from '../../types';
import { X } from 'lucide-react';

interface SaleModalProps {
  products: Product[];
  onClose: () => void;
  onSave: () => void;
}

const SaleModal = ({ products, onClose, onSave }: SaleModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((p) => p.product_id === formData.product_id);
  const totalAmount = formData.quantity * parseFloat(formData.unit_price || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError('');
    setLoading(true);

    try {
      await salesApi.create(currentOrg.org_id, {
        product_id: formData.product_id,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        notes: formData.notes || undefined,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Sale</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select
              value={formData.product_id}
              onChange={(e) => {
                const product = products.find((p) => p.product_id === e.target.value);
                setFormData({
                  ...formData,
                  product_id: e.target.value,
                  unit_price: product?.base_price || '',
                });
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a product</option>
              {products
                .map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.name} {product.base_price ? `($${parseFloat(product.base_price).toFixed(2)})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Available stock: <span className="font-medium">{selectedProduct.quantity}</span>
              </p>
              {selectedProduct.base_price && (
                <p className="text-sm text-gray-600 mt-1">
                  Base price: <span className="font-medium">${parseFloat(selectedProduct.base_price).toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                required
                min="1"
                max={selectedProduct?.quantity || 999999}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {formData.unit_price && formData.quantity > 0 && (
            <div className="p-3 bg-primary-50 rounded-md">
              <p className="text-sm font-medium text-primary-900">
                Total Amount: <span className="text-lg">${totalAmount.toFixed(2)}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optional notes about this sale..."
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
              {loading ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleModal;

