import { useState } from 'react';
import { X } from 'lucide-react';
import { productsApi } from '../../services/api';

interface ProductInventoryDialogProps {
  productId: string;
  currentQuantity: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductInventoryDialog({
  productId,
  currentQuantity,
  onClose,
  onSuccess,
}: ProductInventoryDialogProps) {
  const [txnType, setTxnType] = useState<'build_product' | 'adjustment' | 'purchase'>('build_product');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity) {
      setError('Please enter a quantity');
      return;
    }

    const qtyValue = parseQuantity(quantity);
    if (isNaN(qtyValue) || qtyValue === 0) {
      setError('Please enter a valid non-zero quantity');
      return;
    }

    // Validate quantity sign based on transaction type
    if (txnType === 'purchase' && qtyValue <= 0) {
      setError('Purchase quantity must be positive (greater than 0)');
      return;
    }
    
    // For adjustment, ensure final quantity is non-negative
    if (txnType === 'adjustment') {
      const newQty = currentQuantity + qtyValue;
      if (newQty < 0) {
        setError(`Adjustment would result in negative inventory. Maximum decrease: ${currentQuantity}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // For adjustment, use parsed value (can be negative); for others use raw quantity
      const qtyString = txnType === 'adjustment' ? qtyValue.toString() : quantity;
      await productsApi.adjustInventory(productId, {
        txn_type: txnType,
        qty: qtyString,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Inventory adjustment error:', err);
      // Extract the error message from the response
      let errorDetail = 'Failed to adjust inventory';
      try {
        if (err?.response?.data?.detail) {
          errorDetail = err.response.data.detail;
        } else if (err?.response?.data?.message) {
          errorDetail = err.response.data.message;
        } else if (err?.message) {
          errorDetail = err.message;
        } else if (typeof err === 'string') {
          errorDetail = err;
        }
      } catch (parseErr) {
        console.error('Error parsing error message:', parseErr);
        errorDetail = 'An unexpected error occurred';
      }
      setError(errorDetail);
      setLoading(false); // Stop loading on error
    }
  };

  const getQuantityLabel = () => {
    switch (txnType) {
      case 'build_product':
        return 'Quantity to Build';
      case 'purchase':
        return 'Quantity to Add (must be positive)';
      case 'adjustment':
        return 'Quantity Change (positive to increase, negative to decrease)';
      default:
        return 'Quantity';
    }
  };

  const getQuantityPlaceholder = () => {
    switch (txnType) {
      case 'build_product':
      case 'purchase':
        return 'e.g., 5';
      case 'adjustment':
        return 'e.g., +3 or -2';
      default:
        return '';
    }
  };

  const handleQuantityChange = (value: string) => {
    if (txnType === 'adjustment') {
      // Allow negative values for adjustment (e.g., +5, -3, 5, -3)
      setQuantity(value);
    } else {
      // Only allow positive values for build_product and purchase
      const numValue = value.replace(/[^0-9.]/g, '');
      setQuantity(numValue);
    }
  };

  const parseQuantity = (value: string): number => {
    // Parse adjustment values (e.g., "+5", "-3", "5")
    if (value.startsWith('+')) {
      return parseFloat(value.substring(1)) || 0;
    }
    return parseFloat(value) || 0;
  };

  const getExpectedNewQuantity = () => {
    if (!quantity) return null;
    const change = parseQuantity(quantity);
    if (isNaN(change)) return null;
    
    if (txnType === 'adjustment') {
      // Adjustment can add or remove (change can be positive or negative)
      return Math.max(0, currentQuantity + change);
    } else {
      // build_product and purchase add inventory (always positive)
      return currentQuantity + Math.abs(change);
    }
  };

  const expectedQuantity = getExpectedNewQuantity();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold text-gray-900">{currentQuantity}</span></p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={txnType}
              onChange={(e) => {
                setTxnType(e.target.value as typeof txnType);
                setQuantity(''); // Reset quantity when type changes
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="build_product">Build Product (uses recipe parts)</option>
              <option value="purchase">Purchase (add inventory, positive)</option>
              <option value="adjustment">Adjustment (increase or decrease)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {txnType === 'build_product' && 'This will consume parts from the recipe and increase product quantity.'}
              {txnType === 'purchase' && 'This will add inventory without affecting parts. Quantity must be positive.'}
              {txnType === 'adjustment' && 'This allows manual adjustment of inventory (positive or negative).'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{getQuantityLabel()}</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder={getQuantityPlaceholder()}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {expectedQuantity !== null && (
              <p className="text-xs text-gray-500 mt-1">
                New quantity after change: <span className="font-semibold">{expectedQuantity}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this inventory change..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !quantity || parseQuantity(quantity) === 0 || isNaN(parseQuantity(quantity))}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Apply Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

