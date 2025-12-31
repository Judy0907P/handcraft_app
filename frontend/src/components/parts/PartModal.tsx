import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { partsApi, partTypesApi, partSubtypesApi } from '../../services/api';
import { Part, PartType, PartSubtype } from '../../types';
import { X, Plus } from 'lucide-react';

interface PartModalProps {
  part: Part | null;
  partTypes: PartType[];
  partSubtypes: PartSubtype[];
  onClose: () => void;
  onSave: () => void;
}

const PartModal = ({ part, partTypes, partSubtypes, onClose, onSave }: PartModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({
    name: '',
    stock: 0,
    unit_cost: '',
    total_cost: '',
    cost_type: 'unit' as 'unit' | 'total',
    cost_currency: 'USD' as 'USD' | 'RMB',
    unit: '',
    type_id: '',
    subtype_id: '',
    specs: '',
    color: '',
  });
  
  // Exchange rate: 1 USD = 7.2 RMB (you can make this configurable later)
  const EXCHANGE_RATE = 7.2;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateType, setShowCreateType] = useState(false);
  const [showCreateSubtype, setShowCreateSubtype] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newSubtypeName, setNewSubtypeName] = useState('');
  const [creatingType, setCreatingType] = useState(false);
  const [creatingSubtype, setCreatingSubtype] = useState(false);
  const [localPartTypes, setLocalPartTypes] = useState<PartType[]>(partTypes);
  const [localPartSubtypes, setLocalPartSubtypes] = useState<PartSubtype[]>(partSubtypes);

  useEffect(() => {
    setLocalPartTypes(partTypes);
    setLocalPartSubtypes(partSubtypes);
  }, [partTypes, partSubtypes]);

  useEffect(() => {
    if (part) {
      const partSubtype = partSubtypes.find((st) => st.subtype_id === part.subtype_id);
      const partType = partSubtype ? partTypes.find((t) => t.type_id === partSubtype.type_id) : null;
      
      setFormData({
        name: part.name,
        stock: part.stock,
        unit_cost: part.unit_cost,
        total_cost: '',
        cost_type: 'unit',
        cost_currency: 'USD', // Parts are stored in USD
        unit: part.unit || '',
        type_id: partType?.type_id || '',
        subtype_id: part.subtype_id || '',
        specs: part.specs || '',
        color: part.color || '',
      });
    } else {
      // Reset form when creating a new part
      setFormData({
        name: '',
        stock: 0,
        unit_cost: '',
        total_cost: '',
        cost_type: 'unit',
        cost_currency: 'USD',
        unit: '',
        type_id: '',
        subtype_id: '',
        specs: '',
        color: '',
      });
    }
  }, [part, partTypes, partSubtypes]);

  const getSubtypesForType = (typeId: string) => {
    return localPartSubtypes.filter((st) => st.type_id === typeId);
  };

  const handleCreateType = async () => {
    if (!currentOrg || !newTypeName.trim()) return;
    setCreatingType(true);
    try {
      const response = await partTypesApi.create({
        org_id: currentOrg.org_id,
        type_name: newTypeName.trim(),
      });
      setLocalPartTypes([...localPartTypes, response.data]);
      setFormData({ ...formData, type_id: response.data.type_id });
      setNewTypeName('');
      setShowCreateType(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create type');
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateSubtype = async () => {
    if (!formData.type_id || !newSubtypeName.trim()) return;
    setCreatingSubtype(true);
    try {
      const response = await partSubtypesApi.create({
        type_id: formData.type_id,
        subtype_name: newSubtypeName.trim(),
      });
      setLocalPartSubtypes([...localPartSubtypes, response.data]);
      setFormData({ ...formData, subtype_id: response.data.subtype_id });
      setNewSubtypeName('');
      setShowCreateSubtype(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create subtype');
    } finally {
      setCreatingSubtype(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError('');
    
    // Validate cost fields
    if (formData.cost_type === 'unit' && !formData.unit_cost) {
      setError('Please enter unit cost or switch to total cost');
      return;
    }
    if (formData.cost_type === 'total' && !formData.total_cost) {
      setError('Please enter total cost or switch to unit cost');
      return;
    }
    if (formData.cost_type === 'unit' && formData.total_cost) {
      setError('Please enter either unit cost OR total cost, not both');
      return;
    }
    if (formData.cost_type === 'total' && formData.unit_cost) {
      setError('Please enter either unit cost OR total cost, not both');
      return;
    }

    // Calculate unit_cost from total_cost if needed and convert to USD
    let unit_cost = formData.unit_cost;
    if (formData.cost_type === 'total' && formData.total_cost && formData.stock > 0) {
      let totalCostUSD = parseFloat(formData.total_cost);
      // Convert to USD if currency is RMB
      if (formData.cost_currency === 'RMB') {
        totalCostUSD = totalCostUSD / EXCHANGE_RATE;
      }
      unit_cost = (totalCostUSD / formData.stock).toFixed(2);
    } else if (formData.cost_type === 'total' && formData.total_cost) {
      setError('Stock must be greater than 0 to calculate unit cost from total cost');
      return;
    } else if (formData.cost_type === 'unit' && formData.unit_cost) {
      // Convert unit cost to USD if currency is RMB
      if (formData.cost_currency === 'RMB') {
        unit_cost = (parseFloat(formData.unit_cost) / EXCHANGE_RATE).toFixed(2);
      }
    }

    setLoading(true);

    try {
      const data = {
        name: formData.name,
        stock: formData.stock,
        unit_cost: unit_cost,
        unit: formData.unit || undefined,
        org_id: currentOrg.org_id,
        subtype_id: formData.subtype_id || undefined,
        specs: formData.specs || undefined,
        color: formData.color || undefined,
      };

      if (part) {
        await partsApi.update(part.part_id, data);
      } else {
        await partsApi.create(data);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {part ? 'Edit Part' : 'Create Part'}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input
              type="number"
              value={formData.stock === 0 ? '' : formData.stock}
              onChange={(e) => {
                const value = e.target.value;
                // Handle empty input
                if (value === '') {
                  setFormData({ ...formData, stock: 0 });
                  return;
                }
                // Remove leading zeros and parse
                const numValue = parseInt(value.replace(/^0+/, '') || '0', 10);
                setFormData({ ...formData, stock: isNaN(numValue) ? 0 : numValue });
              }}
              required
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cost Information *</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cost_type"
                  value="unit"
                  checked={formData.cost_type === 'unit'}
                  onChange={(e) => setFormData({ ...formData, cost_type: 'unit', total_cost: '' })}
                  className="mr-2"
                />
                <span>Unit Cost</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cost_type"
                  value="total"
                  checked={formData.cost_type === 'total'}
                  onChange={(e) => setFormData({ ...formData, cost_type: 'total', unit_cost: '' })}
                  className="mr-2"
                />
                <span>Total Cost</span>
              </label>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cost_currency"
                    value="USD"
                    checked={formData.cost_currency === 'USD'}
                    onChange={(e) => setFormData({ ...formData, cost_currency: 'USD' })}
                    className="mr-2"
                  />
                  <span>USD</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cost_currency"
                    value="RMB"
                    checked={formData.cost_currency === 'RMB'}
                    onChange={(e) => setFormData({ ...formData, cost_currency: 'RMB' })}
                    className="mr-2"
                  />
                  <span>RMB</span>
                </label>
              </div>
            </div>
            {formData.cost_type === 'unit' ? (
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value, total_cost: '' })}
                  required={formData.cost_type === 'unit'}
                  min="0"
                  placeholder={`Enter unit cost in ${formData.cost_currency}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {formData.unit_cost && formData.cost_currency === 'RMB' && (
                  <p className="mt-1 text-xs text-gray-500">
                    ≈ ${(parseFloat(formData.unit_cost) / EXCHANGE_RATE).toFixed(2)} USD
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: e.target.value, unit_cost: '' })}
                  required={formData.cost_type === 'total'}
                  min="0"
                  placeholder={`Enter total cost in ${formData.cost_currency}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {formData.total_cost && formData.stock > 0 && (
                  <div className="mt-1 text-xs text-gray-500 space-y-1">
                    <p>
                      Total: {formData.cost_currency === 'RMB' 
                        ? `¥${parseFloat(formData.total_cost).toFixed(2)} ≈ $${(parseFloat(formData.total_cost) / EXCHANGE_RATE).toFixed(2)} USD`
                        : `$${parseFloat(formData.total_cost).toFixed(2)} USD`}
                    </p>
                    <p>
                      Unit cost: {formData.cost_currency === 'RMB'
                        ? `¥${(parseFloat(formData.total_cost) / formData.stock).toFixed(2)} ≈ $${((parseFloat(formData.total_cost) / EXCHANGE_RATE) / formData.stock).toFixed(2)} USD`
                        : `$${(parseFloat(formData.total_cost) / formData.stock).toFixed(2)} USD`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g., piece, kg, meter"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specs</label>
            <input
              type="text"
              value={formData.specs}
              onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
              placeholder="e.g., 2.5mm, 10cm x 10cm"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="e.g., Red, Blue, Natural"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              <select
                value={formData.type_id}
                onChange={(e) => setFormData({ ...formData, type_id: e.target.value, subtype_id: '' })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a type</option>
                {localPartTypes.map((type) => (
                  <option key={type.type_id} value={type.type_id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreateType(true)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                title="Create new type"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {formData.type_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtype</label>
              <div className="flex gap-2">
                <select
                  value={formData.subtype_id}
                  onChange={(e) => setFormData({ ...formData, subtype_id: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {getSubtypesForType(formData.type_id).map((subtype) => (
                    <option key={subtype.subtype_id} value={subtype.subtype_id}>
                      {subtype.subtype_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateSubtype(true)}
                  disabled={!formData.type_id}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Create new subtype"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Create Type Modal */}
          {showCreateType && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-semibold mb-4">Create New Type</h3>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Type name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateType();
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateType}
                    disabled={creatingType || !newTypeName.trim()}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingType ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateType(false);
                      setNewTypeName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Subtype Modal */}
          {showCreateSubtype && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-semibold mb-4">Create New Subtype</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Type: {localPartTypes.find((t) => t.type_id === formData.type_id)?.type_name}
                </p>
                <input
                  type="text"
                  value={newSubtypeName}
                  onChange={(e) => setNewSubtypeName(e.target.value)}
                  placeholder="Subtype name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateSubtype();
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateSubtype}
                    disabled={creatingSubtype || !newSubtypeName.trim() || !formData.type_id}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingSubtype ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSubtype(false);
                      setNewSubtypeName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

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

export default PartModal;

