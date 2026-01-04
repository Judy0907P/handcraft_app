import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { partsApi } from '../../services/api';
import { useOrg } from '../../contexts/OrgContext';

interface PartInventoryDialogProps {
  partId: string;
  currentStock: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PartInventoryDialog({
  partId,
  currentStock,
  onClose,
  onSuccess,
}: PartInventoryDialogProps) {
  const { currentOrg } = useOrg();
  const [txnType, setTxnType] = useState<'purchase' | 'loss'>('purchase');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [costType, setCostType] = useState<'unit' | 'total'>('unit');
  const [costCurrency, setCostCurrency] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize currency when component mounts
  useEffect(() => {
    if (currentOrg) {
      setCostCurrency(currentOrg.main_currency || 'USD');
    }
  }, [currentOrg]);

  // Exchange rate from organization settings
  const EXCHANGE_RATE = currentOrg?.exchange_rate ? parseFloat(currentOrg.exchange_rate) : 1.0;

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
    if (qtyValue <= 0) {
      setError('Quantity must be positive (greater than 0)');
      return;
    }
    
    // For loss, ensure final stock is non-negative
    if (txnType === 'loss') {
      const newStock = currentStock - qtyValue;
      if (newStock < 0) {
        setError(`Loss would result in negative inventory. Maximum decrease: ${currentStock}`);
        return;
      }
    }

    // For purchase, validate cost
    if (txnType === 'purchase') {
      if (costType === 'unit' && !unitCost) {
        setError('Please enter unit cost or switch to total cost');
        return;
      }
      if (costType === 'total' && !totalCost) {
        setError('Please enter total cost or switch to unit cost');
        return;
      }
      if (costType === 'unit' && totalCost) {
        setError('Please enter either unit cost OR total cost, not both');
        return;
      }
      if (costType === 'total' && unitCost) {
        setError('Please enter either unit cost OR total cost, not both');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const adjustmentData: any = {
        part_id: partId,
        txn_type: txnType,
        qty: qtyValue,
        cost_type: costType,
        notes: notes || undefined,
      };

      if (txnType === 'purchase') {
        if (costType === 'unit') {
          // Convert to main currency if needed
          let costValue = parseFloat(unitCost);
          if (costCurrency === currentOrg?.additional_currency && currentOrg?.additional_currency) {
            costValue = costValue / EXCHANGE_RATE;
          }
          adjustmentData.unit_cost = costValue.toFixed(2);
        } else {
          // Convert to main currency if needed
          let costValue = parseFloat(totalCost);
          if (costCurrency === currentOrg?.additional_currency && currentOrg?.additional_currency) {
            costValue = costValue / EXCHANGE_RATE;
          }
          adjustmentData.total_cost = costValue.toFixed(2);
        }
      }

      await partsApi.adjustInventory(partId, adjustmentData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Inventory adjustment error:', err);
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
      setLoading(false);
    }
  };

  const getQuantityLabel = () => {
    switch (txnType) {
      case 'purchase':
        return 'Quantity to Purchase';
      case 'loss':
        return 'Quantity to Lose (must be positive)';
      default:
        return 'Quantity';
    }
  };

  const handleQuantityChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '');
    setQuantity(numValue);
  };

  const parseQuantity = (value: string): number => {
    return parseFloat(value) || 0;
  };

  const getExpectedNewStock = () => {
    if (!quantity) return null;
    const change = parseQuantity(quantity);
    if (isNaN(change)) return null;
    
    if (txnType === 'loss') {
      return Math.max(0, currentStock - change);
    } else {
      return currentStock + change;
    }
  };

  const expectedStock = getExpectedNewStock();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold text-gray-900">{currentStock}</span></p>
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
                setQuantity('');
                setUnitCost('');
                setTotalCost('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="purchase">Purchase (increases inventory)</option>
              <option value="loss">Loss (decreases inventory)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {txnType === 'purchase' && 'This will increase part inventory and update the average cost.'}
              {txnType === 'loss' && 'This will decrease part inventory. Quantity must be positive.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{getQuantityLabel()}</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {expectedStock !== null && (
              <p className="text-xs text-gray-500 mt-1">
                New stock after change: <span className="font-semibold">{expectedStock}</span>
              </p>
            )}
          </div>

          {txnType === 'purchase' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost Information *</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cost_type"
                      value="unit"
                      checked={costType === 'unit'}
                      onChange={() => {
                        setCostType('unit');
                        setTotalCost('');
                      }}
                      className="mr-2"
                    />
                    <span>Unit Cost</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cost_type"
                      value="total"
                      checked={costType === 'total'}
                      onChange={() => {
                        setCostType('total');
                        setUnitCost('');
                      }}
                      className="mr-2"
                    />
                    <span>Total Cost</span>
                  </label>
                </div>
                {currentOrg?.additional_currency && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="cost_currency"
                          value={currentOrg.main_currency}
                          checked={costCurrency === currentOrg.main_currency}
                          onChange={() => setCostCurrency(currentOrg.main_currency)}
                          className="mr-2"
                        />
                        <span>{currentOrg.main_currency}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="cost_currency"
                          value={currentOrg.additional_currency}
                          checked={costCurrency === currentOrg.additional_currency}
                          onChange={() => {
                            if (currentOrg.additional_currency) {
                              setCostCurrency(currentOrg.additional_currency);
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{currentOrg.additional_currency}</span>
                      </label>
                    </div>
                  </div>
                )}
                {costType === 'unit' ? (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => {
                        setUnitCost(e.target.value);
                        setTotalCost('');
                      }}
                      required
                      min="0"
                      placeholder={`Enter unit cost in ${costCurrency}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {unitCost && costCurrency === currentOrg?.additional_currency && currentOrg?.additional_currency && (
                      <p className="mt-1 text-xs text-gray-500">
                        ≈ {(parseFloat(unitCost) / EXCHANGE_RATE).toFixed(2)} {currentOrg.main_currency}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={totalCost}
                      onChange={(e) => {
                        setTotalCost(e.target.value);
                        setUnitCost('');
                      }}
                      required
                      min="0"
                      placeholder={`Enter total cost in ${costCurrency}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {totalCost && quantity && parseQuantity(quantity) > 0 && currentOrg && (
                      <div className="mt-1 text-xs text-gray-500 space-y-1">
                        <p>
                          Total: {costCurrency === currentOrg.additional_currency && currentOrg.additional_currency
                            ? `${parseFloat(totalCost).toFixed(2)} ${currentOrg.additional_currency} ≈ ${(parseFloat(totalCost) / EXCHANGE_RATE).toFixed(2)} ${currentOrg.main_currency}`
                            : `${parseFloat(totalCost).toFixed(2)} ${currentOrg.main_currency}`}
                        </p>
                        <p>
                          Unit cost: {costCurrency === currentOrg.additional_currency && currentOrg.additional_currency
                            ? `${(parseFloat(totalCost) / parseQuantity(quantity)).toFixed(2)} ${currentOrg.additional_currency} ≈ ${((parseFloat(totalCost) / EXCHANGE_RATE) / parseQuantity(quantity)).toFixed(2)} ${currentOrg.main_currency}`
                            : `${(parseFloat(totalCost) / parseQuantity(quantity)).toFixed(2)} ${currentOrg.main_currency}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
              disabled={loading || !quantity || parseQuantity(quantity) === 0 || isNaN(parseQuantity(quantity)) || (txnType === 'purchase' && !unitCost && !totalCost)}
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

