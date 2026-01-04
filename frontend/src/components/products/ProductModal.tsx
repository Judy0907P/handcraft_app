import { useState, useEffect, useRef } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { productsApi, productTypesApi, productSubtypesApi, productStatusLabelsApi, ProductStatusLabel, partsApi, recipesApi, RecipeLine, partTypesApi, partSubtypesApi } from '../../services/api';
import { Product, ProductType, ProductSubtype, Part, PartType, PartSubtype } from '../../types';
import { X, Plus, Upload, Image as ImageIcon, Trash2, Search, Edit } from 'lucide-react';
// ProductTypeModal and ProductSubtypeModal imports removed - not used in this component
// import ProductTypeModal from './ProductTypeModal';
// import ProductSubtypeModal from './ProductSubtypeModal';

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
    price_currency: '',
    image_url: '',
    notes: '',
  });
  
  // Exchange rate from organization settings: 1 main_currency = exchange_rate additional_currency
  // Currently not used but kept for potential future use
  // const EXCHANGE_RATE = currentOrg?.exchange_rate ? parseFloat(currentOrg.exchange_rate) : 1.0;
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
  const [recipeLines, setRecipeLines] = useState<Array<{ part_id: string; quantity: string }>>([]);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [fifoCosts, setFifoCosts] = useState<Record<string, number>>({}); // part_id -> fifo_unit_cost
  const [loadingParts, setLoadingParts] = useState(false);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [partSubtypes, setPartSubtypes] = useState<PartSubtype[]>([]);
  const [partSearchQuery, setPartSearchQuery] = useState<Record<number, string>>({});
  const [selectedPartTypeId, setSelectedPartTypeId] = useState<Record<number, string>>({});
  const [selectedPartSubtypeId, setSelectedPartSubtypeId] = useState<Record<number, string>>({});
  const [partSelectorMode, setPartSelectorMode] = useState<Record<number, 'search' | 'browse'>>({});
  const [editingRecipeLineIndex, setEditingRecipeLineIndex] = useState<number | null>(null);
  const [savingRecipeLineIndex, setSavingRecipeLineIndex] = useState<number | null>(null);
  const [originalRecipeLines, setOriginalRecipeLines] = useState<Array<{ part_id: string; quantity: string }>>([]);

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

    // Load parts, part types, and subtypes for recipe editing
    const loadPartsData = async () => {
      if (!currentOrg) return;
      setLoadingParts(true);
      try {
        const [partsRes, typesRes] = await Promise.all([
          partsApi.getAll(currentOrg.org_id),
          partTypesApi.getAll(currentOrg.org_id),
        ]);
        setAvailableParts(partsRes.data);
        setPartTypes(typesRes.data);

        // Load subtypes for each type
        const subtypesPromises = typesRes.data.map((type) =>
          partSubtypesApi.getByType(type.type_id)
        );
        const subtypesResults = await Promise.all(subtypesPromises);
        const allSubtypes = subtypesResults.flatMap((res) => res.data);
        setPartSubtypes(allSubtypes);
      } catch (error) {
        console.error('Failed to load parts data:', error);
      } finally {
        setLoadingParts(false);
      }
    };
    loadPartsData();
  }, [currentOrg]);

  useEffect(() => {
    if (product) {
      const productSubtype = productSubtypes.find((st) => st.product_subtype_id === product.product_subtype_id);
      // Find product type for the subtype (not used directly but kept for potential future use)
      const _productType = productSubtype ? productTypes.find((t) => t.product_type_id === productSubtype.product_type_id) : null;
      
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
        price_currency: currentOrg?.main_currency || 'USD', // Products are stored in main currency, default to main for display
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

      // Recipe lines will be loaded in separate useEffect
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
        price_currency: currentOrg?.main_currency || 'USD',
        image_url: '',
        notes: '',
      });
      setImagePreview(null);
      setRecipeLines([]);
    }
  }, [product, productTypes, productSubtypes, currentOrg]);

  const loadRecipeLines = async (productId: string) => {
    try {
      const response = await recipesApi.getByProduct(productId);
      setRecipeLines(response.data.map(line => ({
        part_id: line.part_id,
        quantity: line.quantity,
      })));
    } catch (error) {
      console.error('Failed to load recipe lines:', error);
    }
  };

  useEffect(() => {
    if (product?.product_id) {
      loadRecipeLines(product.product_id);
    } else {
      setRecipeLines([]);
    }
  }, [product?.product_id]);

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

  const handleAddRecipeLine = () => {
    const newIndex = recipeLines.length;
    setRecipeLines([...recipeLines, { part_id: '', quantity: '1' }]);
    setEditingRecipeLineIndex(newIndex);
    setPartSelectorMode({ ...partSelectorMode, [newIndex]: 'search' });
    setPartSearchQuery({ ...partSearchQuery, [newIndex]: '' });
    setSelectedPartTypeId({ ...selectedPartTypeId, [newIndex]: '' });
    setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [newIndex]: '' });
  };

  const handleUpdateRecipeLine = (index: number, field: 'part_id' | 'quantity', value: string) => {
    const updated = [...recipeLines];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeLines(updated);
  };

  const handleDeleteRecipeLine = async (index: number) => {
    const line = recipeLines[index];
    
    // If this is an existing recipe line (has part_id and product exists), delete from backend
    if (product && line.part_id) {
      if (!confirm('Are you sure you want to delete this recipe line?')) return;
      try {
        setSavingRecipeLineIndex(index);
        await recipesApi.delete(product.product_id, line.part_id);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to delete recipe line');
        setSavingRecipeLineIndex(null);
        return;
      } finally {
        setSavingRecipeLineIndex(null);
      }
    }
    
    // Remove from local state
    setRecipeLines(recipeLines.filter((_, i) => i !== index));
    setEditingRecipeLineIndex(null);
    
    // Clean up filter state for this index
    const newSearchQuery = { ...partSearchQuery };
    const newTypeId = { ...selectedPartTypeId };
    const newSubtypeId = { ...selectedPartSubtypeId };
    const newMode = { ...partSelectorMode };
    delete newSearchQuery[index];
    delete newTypeId[index];
    delete newSubtypeId[index];
    delete newMode[index];
    setPartSearchQuery(newSearchQuery);
    setSelectedPartTypeId(newTypeId);
    setSelectedPartSubtypeId(newSubtypeId);
    setPartSelectorMode(newMode);
  };

  const handleSaveRecipeLine = async (index: number) => {
    const line = recipeLines[index];
    
    if (!line.part_id || !line.quantity || parseFloat(line.quantity) <= 0) {
      alert('Please select a part and enter a valid quantity');
      return;
    }

    if (!product) {
      // For new products, just mark as saved (will be saved when product is created)
      setEditingRecipeLineIndex(null);
      return;
    }

    try {
      setSavingRecipeLineIndex(index);
      
      // Check if this recipe line already exists
      const existingLines = await recipesApi.getByProduct(product.product_id);
      const existing = existingLines.data.find(
        (rl: RecipeLine) => rl.part_id === line.part_id
      );

      if (existing) {
        // Update existing
        await recipesApi.patch(product.product_id, line.part_id, {
          quantity: line.quantity,
        });
      } else {
        // Create new
        await recipesApi.create(product.product_id, {
          part_id: line.part_id,
          quantity: line.quantity,
        });
      }

      setEditingRecipeLineIndex(null);
      setOriginalRecipeLines([]);
      // Reset filters for this line
      setPartSearchQuery({ ...partSearchQuery, [index]: '' });
      setSelectedPartTypeId({ ...selectedPartTypeId, [index]: '' });
      setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: '' });
      
      // Reload recipe lines to get updated data
      if (product?.product_id) {
        await loadRecipeLines(product.product_id);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save recipe line');
    } finally {
      setSavingRecipeLineIndex(null);
    }
  };

  const handleEditRecipeLine = (index: number) => {
    // Store original values for cancel
    setOriginalRecipeLines([...recipeLines]);
    setEditingRecipeLineIndex(index);
    if (!partSelectorMode[index]) {
      setPartSelectorMode({ ...partSelectorMode, [index]: 'search' });
    }
  };

  const getFilteredParts = (index: number) => {
    let filtered = availableParts;
    const mode = partSelectorMode[index] || 'search';
    const searchQuery = partSearchQuery[index] || '';
    const typeId = selectedPartTypeId[index] || '';
    const subtypeId = selectedPartSubtypeId[index] || '';

    if (mode === 'search') {
      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter((part) =>
          part.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    } else {
      // Filter by type and subtype
      if (subtypeId) {
        filtered = filtered.filter((part) => part.subtype_id === subtypeId);
      } else if (typeId) {
        const subtypeIds = partSubtypes
          .filter((st) => st.type_id === typeId)
          .map((st) => st.subtype_id);
        filtered = filtered.filter((part) => 
          part.subtype_id && subtypeIds.includes(part.subtype_id)
        );
      }
    }

    return filtered;
  };

  const getSubtypesForPartType = (typeId: string) => {
    return partSubtypes.filter((st) => st.type_id === typeId);
  };

  // Fetch FIFO costs for all recipe lines
  useEffect(() => {
    const fetchFIFOCosts = async () => {
      const costs: Record<string, number> = {};
      for (const line of recipeLines) {
        if (line.part_id && line.quantity) {
          try {
            const quantity = parseFloat(line.quantity) || 0;
            if (quantity > 0) {
              const response = await partsApi.getFIFOCost(line.part_id, quantity);
              costs[line.part_id] = parseFloat(response.data.fifo_unit_cost) || 0;
            }
          } catch (error) {
            console.error(`Failed to fetch FIFO cost for part ${line.part_id}:`, error);
            // Fallback to historical average
            const part = availableParts.find((p) => p.part_id === line.part_id);
            if (part && part.unit_cost) {
              costs[line.part_id] = parseFloat(part.unit_cost) || 0;
            }
          }
        }
      }
      setFifoCosts(costs);
    };

    if (recipeLines.length > 0 && availableParts.length > 0) {
      fetchFIFOCosts();
    } else {
      setFifoCosts({});
    }
  }, [recipeLines, availableParts]);

  const calculateRecipeTotalCost = () => {
    let total = 0;
    recipeLines.forEach((line) => {
      if (line.part_id && line.quantity) {
        const quantity = parseFloat(line.quantity) || 0;
        // Use FIFO cost if available, otherwise fallback to historical average
        const fifoCost = fifoCosts[line.part_id];
        if (fifoCost !== undefined) {
          total += quantity * fifoCost;
        } else {
          // Fallback to historical average while loading
          const part = availableParts.find((p) => p.part_id === line.part_id);
          if (part && part.unit_cost) {
            total += quantity * parseFloat(part.unit_cost);
          }
        }
      }
    });
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError('');
    setLoading(true);

    try {
      const data: any = {
        name: formData.name,
        description: formData.description || undefined,
        primary_color: formData.primary_color || undefined,
        secondary_color: formData.secondary_color || undefined,
        org_id: currentOrg.org_id,
        product_subtype_id: formData.product_subtype_id || undefined,
        status: formData.status,
        is_self_made: formData.is_self_made,
        difficulty: formData.difficulty,
        quantity: 0, // Quantity always starts at 0 for new products, can only be changed via inventory transactions
        alert_quantity: formData.alert_quantity,
        // total_cost is calculated automatically from recipe by database trigger
        image_url: formData.image_url || undefined,
        notes: formData.notes || undefined,
      };

      let savedProduct;
      if (product) {
        savedProduct = await productsApi.update(product.product_id, data);
      } else {
        savedProduct = await productsApi.create(data);
      }

      const productId = savedProduct.data.product_id;

      // Save recipe lines (only for new products - existing products should have lines saved individually)
      if (productId && !product) {
        try {
          // Filter out empty recipe lines and validate
          const validRecipeLines = recipeLines
            .filter(line => line.part_id && parseFloat(line.quantity) > 0)
            .map(line => ({
              part_id: line.part_id,
              quantity: line.quantity,
            }));
          if (validRecipeLines.length > 0) {
            await recipesApi.bulkUpdate(productId, validRecipeLines);
          }
        } catch (error: any) {
          console.error('Failed to save recipe lines:', error);
          setError(error.response?.data?.detail || 'Failed to save recipe lines');
          setLoading(false);
          return;
        }
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Recipe</label>
            </div>
            <div className="space-y-2">
              {recipeLines.map((line, index) => {
                const part = availableParts.find(p => p.part_id === line.part_id);
                const isEditing = editingRecipeLineIndex === index;
                const isSaving = savingRecipeLineIndex === index;
                const filteredParts = getFilteredParts(index);
                const hasPart = !!line.part_id && !!part;
                
                return (
                  <div key={index} className="p-3 border border-gray-200 rounded-md">
                    {!isEditing && hasPart ? (
                      // Compact view when part is selected
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{part.name}</div>
                          <div className="text-sm text-gray-600">
                            Quantity: {line.quantity} {part.unit ? `(${part.unit})` : ''}
                          </div>
                          {(() => {
                            const quantity = parseFloat(line.quantity || '0');
                            const fifoCost = fifoCosts[line.part_id];
                            const cost = fifoCost !== undefined 
                              ? quantity * fifoCost 
                              : (part.unit_cost ? quantity * parseFloat(part.unit_cost) : 0);
                            return (
                              <div className="text-sm text-gray-500">
                                Cost: ${cost.toFixed(2)}
                                {fifoCost !== undefined && fifoCost !== parseFloat(part.unit_cost || '0') && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    (FIFO, avg: ${parseFloat(part.unit_cost || '0').toFixed(2)})
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditRecipeLine(index)}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipeLine(index)}
                            disabled={isSaving}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Remove recipe line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Full editing interface
                      <div className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            {/* Part Selector Mode Toggle */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPartSelectorMode({ ...partSelectorMode, [index]: 'search' });
                                  setPartSearchQuery({ ...partSearchQuery, [index]: '' });
                                  setSelectedPartTypeId({ ...selectedPartTypeId, [index]: '' });
                                  setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: '' });
                                }}
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                  (partSelectorMode[index] || 'search') === 'search'
                                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <Search className="w-4 h-4 inline mr-1" />
                                Search
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPartSelectorMode({ ...partSelectorMode, [index]: 'browse' });
                                  setPartSearchQuery({ ...partSearchQuery, [index]: '' });
                                  setSelectedPartTypeId({ ...selectedPartTypeId, [index]: '' });
                                  setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: '' });
                                }}
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                  (partSelectorMode[index] || 'search') === 'browse'
                                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                Browse
                              </button>
                            </div>

                            {/* Search Mode */}
                            {(partSelectorMode[index] || 'search') === 'search' && (
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  type="text"
                                  value={partSearchQuery[index] || ''}
                                  onChange={(e) => setPartSearchQuery({ ...partSearchQuery, [index]: e.target.value })}
                                  placeholder="Search parts by name..."
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                            )}

                            {/* Browse Mode */}
                            {(partSelectorMode[index] || 'search') === 'browse' && (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={selectedPartTypeId[index] || ''}
                                  onChange={(e) => {
                                    setSelectedPartTypeId({ ...selectedPartTypeId, [index]: e.target.value });
                                    setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: '' });
                                  }}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                  <option value="">All Types</option>
                                  {partTypes.map((type) => (
                                    <option key={type.type_id} value={type.type_id}>
                                      {type.type_name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={selectedPartSubtypeId[index] || ''}
                                  onChange={(e => setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: e.target.value }))}
                                  disabled={!selectedPartTypeId[index]}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">All Subtypes</option>
                                  {selectedPartTypeId[index] && getSubtypesForPartType(selectedPartTypeId[index]).map((subtype) => (
                                    <option key={subtype.subtype_id} value={subtype.subtype_id}>
                                      {subtype.subtype_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Part Selection Dropdown */}
                            <select
                              value={line.part_id}
                              onChange={(e) => {
                                handleUpdateRecipeLine(index, 'part_id', e.target.value);
                                // For new products, exit editing mode once part is selected
                                if (!product && e.target.value) {
                                  setEditingRecipeLineIndex(null);
                                }
                                // Reset filters after selection
                                setPartSearchQuery({ ...partSearchQuery, [index]: '' });
                                setSelectedPartTypeId({ ...selectedPartTypeId, [index]: '' });
                                setSelectedPartSubtypeId({ ...selectedPartSubtypeId, [index]: '' });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Select part</option>
                              {filteredParts.map((p) => (
                                <option key={p.part_id} value={p.part_id}>
                                  {p.name} {p.unit ? `(${p.unit})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipeLine(index)}
                            disabled={isSaving}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Remove recipe line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quantity and Unit Display */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              value={line.quantity}
                              onChange={(e) => handleUpdateRecipeLine(index, 'quantity', e.target.value)}
                              placeholder="Quantity"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                              {part?.unit || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Save/Cancel Buttons */}
                        {product && (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                // Restore original values
                                if (originalRecipeLines.length > 0) {
                                  setRecipeLines([...originalRecipeLines]);
                                } else {
                                  // Reload from server
                                  loadRecipeLines(product.product_id);
                                }
                                setEditingRecipeLineIndex(null);
                                setOriginalRecipeLines([]);
                              }}
                              disabled={isSaving}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveRecipeLine(index)}
                              disabled={isSaving || !line.part_id || !line.quantity}
                              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddRecipeLine}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-primary-500 hover:bg-primary-50 transition-colors text-gray-600 hover:text-primary-600"
              >
                <Plus className="w-4 h-4" />
                Add Recipe Line
              </button>
              {recipeLines.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No recipe lines. Click "Add Recipe Line" to add parts required to make this product.</p>
              )}
              
              {/* Total Cost Display */}
              {recipeLines.length > 0 && (
                <>
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Recipe Cost:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ${calculateRecipeTotalCost().toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 italic">
                    * Calculated using FIFO cost (most recent purchases) for each part, not historical average.
                  </div>
                </>
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
