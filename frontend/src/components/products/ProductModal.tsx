import { useState, useEffect, useRef } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { productsApi, productTypesApi, productSubtypesApi, productStatusLabelsApi, ProductStatusLabel } from '../../services/api';
import { Product, ProductType, ProductSubtype } from '../../types';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import ProductTypeModal from './ProductTypeModal';
import ProductSubtypeModal from './ProductSubtypeModal';

interface ProductModalProps {
  product: Product | null;
  productTypes: ProductType[];
  productSubtypes: ProductSubtype[];
  onClose: () => void;
  onSave: () => void;
}

const ProductModal = ({ product, productTypes, productSubtypes, onClose, onSave }: ProductModalProps) => {
  const { currentOrg } = useOrg();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primary_color: '',
    secondary_color: '',
    product_subtype_id: '',
    status: [] as string[],
    is_self_made: true,
    difficulty: 'NA',
    quantity: 0,
    alert_quantity: 0,
    base_price: '',
    image_url: '',
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
  const [localProductTypes, setLocalProductTypes] = useState<ProductType[]>(productTypes);
  const [localProductSubtypes, setLocalProductSubtypes] = useState<ProductSubtype[]>(productSubtypes);
  const [availableStatusLabels, setAvailableStatusLabels] = useState<ProductStatusLabel[]>([]);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalProductTypes(productTypes);
    setLocalProductSubtypes(productSubtypes);
  }, [productTypes, productSubtypes]);

  useEffect(() => {
    // Fetch existing status labels from the database
    const loadStatusLabels = async () => {
      if (!currentOrg) return;
      try {
        const response = await productStatusLabelsApi.getAll(currentOrg.org_id);
        setAvailableStatusLabels(response.data);
      } catch (error) {
        console.error('Failed to load status labels:', error);
      }
    };
    loadStatusLabels();
  }, [currentOrg]);

  useEffect(() => {
    if (product) {
      const productSubtype = productSubtypes.find((st) => st.product_subtype_id === product.product_subtype_id);
      const productType = productSubtype ? productTypes.find((t) => t.product_type_id === productSubtype.product_type_id) : null;
      
      setFormData({
        name: product.name,
        description: product.description || '',
        primary_color: product.primary_color || '',
        secondary_color: product.secondary_color || '',
        product_subtype_id: product.product_subtype_id || '',
        status: product.status || [],
        is_self_made: product.is_self_made,
        difficulty: product.difficulty,
        quantity: product.quantity,
        alert_quantity: product.alert_quantity,
        base_price: product.base_price || '',
        image_url: product.image_url || '',
        notes: product.notes || '',
      });

      // Set image preview if image exists
      if (product.image_url) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        setImagePreview(product.image_url.startsWith('http') ? product.image_url : `${apiBaseUrl}${product.image_url}`);
      } else {
        setImagePreview(null);
      }
    } else {
      // Reset form when creating a new product
      setFormData({
        name: '',
        description: '',
        primary_color: '',
        secondary_color: '',
        product_subtype_id: '',
        status: [],
        is_self_made: true,
        difficulty: 'NA',
        quantity: 0,
        alert_quantity: 0,
        base_price: '',
        image_url: '',
        notes: '',
      });
      setImagePreview(null);
    }
  }, [product, productTypes, productSubtypes]);

  const getSubtypesForType = (typeId: string) => {
    return localProductSubtypes.filter((st) => st.product_type_id === typeId);
  };

  const getTypeForSubtype = (subtypeId: string) => {
    const subtype = localProductSubtypes.find((st) => st.product_subtype_id === subtypeId);
    return subtype ? localProductTypes.find((t) => t.product_type_id === subtype.product_type_id) : null;
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
      const response = await productStatusLabelsApi.create({
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
    if (!confirm(`Are you sure you want to delete the status label "${labelText}"? This will remove it from all products that have this label.`)) return;
    
    try {
      await productStatusLabelsApi.delete(labelId);
      setAvailableStatusLabels(availableStatusLabels.filter(l => l.label_id !== labelId));
      // Remove from form selection if selected (the backend already removed it from all products in the database)
      if (formData.status.includes(labelText)) {
        setFormData({ ...formData, status: formData.status.filter(s => s !== labelText) });
      }
    } catch (error) {
      console.error('Failed to delete status label:', error);
      alert('Failed to delete status label');
    }
  };

  const handleCreateType = async () => {
    if (!currentOrg || !newTypeName.trim()) return;
    setCreatingType(true);
    try {
      const response = await productTypesApi.create({
        org_id: currentOrg.org_id,
        name: newTypeName.trim(),
        description: undefined,
      });
      setLocalProductTypes([...localProductTypes, response.data]);
      setNewTypeName('');
      setShowCreateType(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create type');
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateSubtype = async () => {
    const typeId = selectedType?.product_type_id || (formData.product_subtype_id ? getTypeForSubtype(formData.product_subtype_id)?.product_type_id : null);
    if (!typeId || !newSubtypeName.trim()) return;
    setCreatingSubtype(true);
    try {
      const response = await productSubtypesApi.create({
        product_type_id: typeId,
        name: newSubtypeName.trim(),
        description: undefined,
      });
      setLocalProductSubtypes([...localProductSubtypes, response.data]);
      setFormData({ ...formData, product_subtype_id: response.data.product_subtype_id });
      setNewSubtypeName('');
      setShowCreateSubtype(false);
      setSelectedType(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create subtype');
    } finally {
      setCreatingSubtype(false);
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

    // Auto-upload for existing products
    if (product) {
      setUploadingImage(true);
      try {
        const response = await productsApi.uploadImage(product.product_id, file);
        setFormData({ ...formData, image_url: response.data.image_url || '' });
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        if (response.data.image_url) {
          setImagePreview(response.data.image_url.startsWith('http') ? response.data.image_url : `${apiBaseUrl}${response.data.image_url}`);
        }
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to upload image');
        // Reset preview on error
        if (product.image_url) {
          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          setImagePreview(product.image_url.startsWith('http') ? product.image_url : `${apiBaseUrl}${product.image_url}`);
        } else {
          setImagePreview(null);
        }
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleImageDelete = async () => {
    if (!product || !product.image_url) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await productsApi.deleteImage(product.product_id);
      setImagePreview(null);
      setFormData({ ...formData, image_url: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete image');
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
        description: formData.description || undefined,
        primary_color: formData.primary_color || undefined,
        secondary_color: formData.secondary_color || undefined,
        org_id: currentOrg.org_id,
        product_subtype_id: formData.product_subtype_id || undefined,
        status: formData.status,
        is_self_made: formData.is_self_made,
        difficulty: formData.difficulty,
        quantity: formData.quantity,
        alert_quantity: formData.alert_quantity,
        base_price: formData.base_price ? formData.base_price : undefined,
        image_url: formData.image_url || undefined,
        notes: formData.notes || undefined,
      };

      let savedProduct;
      if (product) {
        savedProduct = await productsApi.update(product.product_id, data);
      } else {
        savedProduct = await productsApi.create(data);
      }

      // If there's a new image file selected and product was just created/updated, upload it
      const file = fileInputRef.current?.files?.[0];
      if (file && savedProduct.data) {
        try {
          await productsApi.uploadImage(savedProduct.data.product_id, file);
        } catch (error: any) {
          console.error('Failed to upload image:', error);
          // Don't fail the whole save if image upload fails
        }
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Create Product'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity === 0 ? '' : formData.quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Handle empty input
                  if (value === '') {
                    setFormData({ ...formData, quantity: 0 });
                    return;
                  }
                  // Remove leading zeros and parse
                  const numValue = parseInt(value.replace(/^0+/, '') || '0', 10);
                  setFormData({ ...formData, quantity: isNaN(numValue) ? 0 : numValue });
                }}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Quantity</label>
              <input
                type="number"
                value={formData.alert_quantity === 0 ? '' : formData.alert_quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setFormData({ ...formData, alert_quantity: 0 });
                    return;
                  }
                  const numValue = parseInt(value.replace(/^0+/, '') || '0', 10);
                  setFormData({ ...formData, alert_quantity: isNaN(numValue) ? 0 : numValue });
                }}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="NA">N/A</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="difficult">Difficult</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Is Self Made</label>
              <select
                value={formData.is_self_made ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_self_made: e.target.value === 'true' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
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
                      alt="Product preview"
                      className="w-full h-full object-contain"
                    />
                    {product && product.image_url && (
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
                {product 
                  ? 'Image will be uploaded immediately when selected. Supported formats: JPG, PNG, GIF, WebP (max 5MB)'
                  : 'Image will be uploaded when you save the product. Supported formats: JPG, PNG, GIF, WebP (max 5MB)'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              <select
                value={(() => {
                  const currentSubtype = localProductSubtypes.find((st) => st.product_subtype_id === formData.product_subtype_id);
                  return currentSubtype ? localProductTypes.find((t) => t.product_type_id === currentSubtype.product_type_id)?.product_type_id || '' : '';
                })()}
                onChange={(e) => {
                  const typeId = e.target.value;
                  if (typeId) {
                    const type = localProductTypes.find((t) => t.product_type_id === typeId);
                    setSelectedType(type || null);
                    // Clear subtype if type changes
                    const currentSubtype = localProductSubtypes.find((st) => st.product_subtype_id === formData.product_subtype_id);
                    if (!currentSubtype || currentSubtype.product_type_id !== typeId) {
                      setFormData({ ...formData, product_subtype_id: '' });
                    }
                  } else {
                    setSelectedType(null);
                    setFormData({ ...formData, product_subtype_id: '' });
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a type</option>
                {localProductTypes.map((type) => (
                  <option key={type.product_type_id} value={type.product_type_id}>
                    {type.name}
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

          {(() => {
            const currentSubtype = localProductSubtypes.find((st) => st.product_subtype_id === formData.product_subtype_id);
            const typeId = currentSubtype ? currentSubtype.product_type_id : (selectedType?.product_type_id || '');
            return typeId ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtype</label>
                <div className="flex gap-2">
                  <select
                    value={formData.product_subtype_id}
                    onChange={(e) => setFormData({ ...formData, product_subtype_id: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {getSubtypesForType(typeId).map((subtype) => (
                      <option key={subtype.product_subtype_id} value={subtype.product_subtype_id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const type = selectedType || localProductTypes.find((t) => t.product_type_id === typeId);
                      setSelectedType(type || null);
                      setShowCreateSubtype(true);
                    }}
                    disabled={!typeId}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Create new subtype"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null;
          })()}

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
                  Type: {selectedType?.name || getTypeForSubtype(formData.product_subtype_id)?.name || 'N/A'}
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
                    disabled={creatingSubtype || !newSubtypeName.trim() || !(selectedType?.product_type_id || getTypeForSubtype(formData.product_subtype_id)?.product_type_id)}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingSubtype ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSubtype(false);
                      setNewSubtypeName('');
                      setSelectedType(null);
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

export default ProductModal;
