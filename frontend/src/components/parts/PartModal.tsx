import { useState, useEffect, useRef } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { partsApi, partTypesApi, partSubtypesApi, partStatusLabelsApi, PartStatusLabel } from '../../services/api';
import { Part, PartType, PartSubtype } from '../../types';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';

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
    unit: '',
    type_id: '',
    subtype_id: '',
    specs: '',
    color: '',
    alert_stock: 0,
    image_url: '',
    status: [] as string[],
    notes: '',
  });
  
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
  const [availableStatusLabels, setAvailableStatusLabels] = useState<PartStatusLabel[]>([]);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPartTypes(partTypes);
    setLocalPartSubtypes(partSubtypes);
  }, [partTypes, partSubtypes]);

  useEffect(() => {
    // Fetch existing status labels from the database
    const loadStatusLabels = async () => {
      if (!currentOrg) return;
      try {
        const response = await partStatusLabelsApi.getAll(currentOrg.org_id);
        setAvailableStatusLabels(response.data);
      } catch (error) {
        console.error('Failed to load status labels:', error);
      }
    };
    loadStatusLabels();
  }, [currentOrg]);

  useEffect(() => {
    if (part) {
      const partSubtype = partSubtypes.find((st) => st.subtype_id === part.subtype_id);
      const partType = partSubtype ? partTypes.find((t) => t.type_id === partSubtype.type_id) : null;
      
      setFormData({
        name: part.name,
        unit: part.unit || '',
        type_id: partType?.type_id || '',
        subtype_id: part.subtype_id || '',
        specs: part.specs || '',
        color: part.color || '',
        alert_stock: part.alert_stock || 0,
        image_url: part.image_url || '',
        status: part.status || [],
        notes: part.notes || '',
      });
      
      // Set image preview if image exists
      if (part.image_url) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        setImagePreview(part.image_url.startsWith('http') ? part.image_url : `${apiBaseUrl}${part.image_url}`);
      } else {
        setImagePreview(null);
      }
    } else {
      // Reset form when creating a new part
      setFormData({
        name: '',
        unit: '',
        type_id: '',
        subtype_id: '',
        specs: '',
        color: '',
        alert_stock: 0,
        image_url: '',
        status: [],
        notes: '',
      });
      setImagePreview(null);
    }
  }, [part, partTypes, partSubtypes]);

  const getSubtypesForType = (typeId: string) => {
    return localPartSubtypes.filter((st) => st.type_id === typeId);
  };

  const handleStatusToggle = (label: string) => {
    if (formData.status.includes(label)) {
      setFormData({ ...formData, status: formData.status.filter(s => s !== label) });
    } else {
      setFormData({ ...formData, status: [...formData.status, label] });
    }
  };

  const handleAddStatusLabel = async () => {
    if (!currentOrg || !newStatusLabel.trim()) return;
    
    const labelText = newStatusLabel.trim();
    // Check if label already exists
    if (availableStatusLabels.some(l => l.label === labelText)) {
      setNewStatusLabel('');
      return;
    }

    try {
      const response = await partStatusLabelsApi.create({
        org_id: currentOrg.org_id,
        label: labelText,
      });
      setAvailableStatusLabels([...availableStatusLabels, response.data]);
      setFormData({ ...formData, status: [...formData.status, labelText] });
      setNewStatusLabel('');
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Label already exists, just add it to form selection
        setFormData({ ...formData, status: [...formData.status, labelText] });
        setNewStatusLabel('');
      } else {
        console.error('Failed to create status label:', error);
      }
    }
  };

  const handleDeleteStatusLabel = async (labelId: string, labelText: string) => {
    if (!confirm(`Are you sure you want to delete the status label "${labelText}"? This will remove it from all parts that have this label.`)) return;
    
    try {
      await partStatusLabelsApi.delete(labelId);
      setAvailableStatusLabels(availableStatusLabels.filter(l => l.label_id !== labelId));
      // Remove from form selection if selected (the backend already removed it from all parts in the database)
      if (formData.status.includes(labelText)) {
        setFormData({ ...formData, status: formData.status.filter(s => s !== labelText) });
      }
    } catch (error) {
      console.error('Failed to delete status label:', error);
      alert('Failed to delete status label');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload for existing parts
    if (part) {
      setUploadingImage(true);
      try {
        const response = await partsApi.uploadImage(part.part_id, file);
        setFormData({ ...formData, image_url: response.data.image_url || '' });
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        if (response.data.image_url) {
          setImagePreview(response.data.image_url.startsWith('http') ? response.data.image_url : `${apiBaseUrl}${response.data.image_url}`);
        }
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to upload image');
        // Reset preview on error
        if (part.image_url) {
          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          setImagePreview(part.image_url.startsWith('http') ? part.image_url : `${apiBaseUrl}${part.image_url}`);
        } else {
          setImagePreview(null);
        }
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const _handleImageUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !part) return;

    setUploadingImage(true);
    try {
      const response = await partsApi.uploadImage(part.part_id, file);
      setFormData({ ...formData, image_url: response.data.image_url || '' });
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      if (response.data.image_url) {
        setImagePreview(response.data.image_url.startsWith('http') ? response.data.image_url : `${apiBaseUrl}${response.data.image_url}`);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!part || !part.image_url) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await partsApi.deleteImage(part.part_id);
      setImagePreview(null);
      setFormData({ ...formData, image_url: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete image');
    }
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
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        unit: formData.unit || undefined,
        org_id: currentOrg.org_id,
        subtype_id: formData.subtype_id || undefined,
        specs: formData.specs || undefined,
        color: formData.color || undefined,
        alert_stock: formData.alert_stock,
        image_url: formData.image_url || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      let savedPart;
      if (part) {
        savedPart = await partsApi.update(part.part_id, data);
      } else {
        savedPart = await partsApi.create(data);
      }

      // If there's a new image file selected and part was just created/updated, upload it
      const file = fileInputRef.current?.files?.[0];
      if (file && savedPart.data) {
        try {
          await partsApi.uploadImage(savedPart.data.part_id, file);
        } catch (error: any) {
          console.error('Failed to upload image:', error);
          // Don't fail the whole save if image upload fails
        }
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

          {part && (
            <>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Stock: <span className="font-semibold text-gray-900">{part.stock}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Historical Average Cost: <span className="font-semibold text-gray-900">${parseFloat(part.unit_cost).toFixed(2)}</span>
                  <span className="text-xs text-gray-400 ml-1">(weighted avg of all purchases)</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Use the "Inventory Adjustment" button on the part card to adjust stock and cost.
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">
                  Note: Product recipes use FIFO cost (most recent purchases), which may differ from this historical average.
                </p>
              </div>
            </>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Stock</label>
            <input
              type="number"
              value={formData.alert_stock === 0 ? '' : formData.alert_stock}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setFormData({ ...formData, alert_stock: 0 });
                  return;
                }
                const numValue = parseInt(value.replace(/^0+/, '') || '0', 10);
                setFormData({ ...formData, alert_stock: isNaN(numValue) ? 0 : numValue });
              }}
              min="0"
              placeholder="Alert when stock falls below this level"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
            <div className="space-y-3">
              {/* Image Preview */}
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Part preview"
                      className="w-full h-full object-contain"
                    />
                    {part && part.image_url && (
                      <button
                        type="button"
                        onClick={handleImageDelete}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title="Delete image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Uploading...' : (imagePreview ? 'Replace Image' : 'Upload Image')}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {part 
                  ? 'Image will be uploaded immediately when selected. Supported formats: JPG, PNG, GIF, WebP (max 5MB)'
                  : 'Image will be uploaded when you save the part. Supported formats: JPG, PNG, GIF, WebP (max 5MB)'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStatusLabel();
                    }
                  }}
                  placeholder="Add new status label"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddStatusLabel}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableStatusLabels.map((statusLabel) => (
                  <div key={statusLabel.label_id} className="flex items-center gap-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.status.includes(statusLabel.label)}
                        onChange={() => handleStatusToggle(statusLabel.label)}
                        className="mr-2"
                      />
                      <span className="px-3 py-1 bg-gray-100 rounded-md text-sm">{statusLabel.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteStatusLabel(statusLabel.label_id, statusLabel.label)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title={`Delete "${statusLabel.label}"`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {formData.status.length === 0 && availableStatusLabels.length === 0 && (
                <p className="text-sm text-gray-500">No status labels available. Create one above.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
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

