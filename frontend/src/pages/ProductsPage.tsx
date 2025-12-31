import { useState, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { productsApi, productTypesApi, productSubtypesApi } from '../services/api';
import { Product, ProductType, ProductSubtype, SortOption, SortDirection } from '../types';
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ProductModal from '../components/products/ProductModal';
import ProductTypeModal from '../components/products/ProductTypeModal';
import ProductSubtypeModal from '../components/products/ProductSubtypeModal';

const ProductsPage = () => {
  const { currentOrg } = useOrg();
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productSubtypes, setProductSubtypes] = useState<ProductSubtype[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showSubtypeModal, setShowSubtypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [productsRes, typesRes] = await Promise.all([
        productsApi.getAll(currentOrg.org_id),
        productTypesApi.getAll(currentOrg.org_id),
      ]);
      setProducts(productsRes.data);
      setProductTypes(typesRes.data);

      const subtypesPromises = typesRes.data.map((type) =>
        productSubtypesApi.getByType(type.product_type_id)
      );
      const subtypesResults = await Promise.all(subtypesPromises);
      const allSubtypes = subtypesResults.flatMap((res) => res.data);
      setProductSubtypes(allSubtypes);
    } catch (error) {
      console.error('Failed to load products data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const filteredAndSortedProducts = () => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'stock':
          comparison = a.quantity - b.quantity;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const getProductsBySubtype = (subtypeId: string) => {
    return filteredAndSortedProducts().filter((product) => product.product_subtype_id === subtypeId);
  };

  const getUncategorizedProducts = () => {
    return filteredAndSortedProducts().filter((product) => !product.product_subtype_id);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(productId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this type? All subtypes will be deleted.')) return;
    try {
      await productTypesApi.delete(typeId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete type');
    }
  };

  const handleDeleteSubtype = async (subtypeId: string) => {
    if (!confirm('Are you sure you want to delete this subtype?')) return;
    try {
      await productSubtypesApi.delete(subtypeId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete subtype');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => {
            setSelectedProduct(null);
            setShowProductModal(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Product
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="stock">Sort by Stock</option>
              <option value="updated">Sort by Date</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {sortDirection === 'asc' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedType(null);
                setShowSubtypeModal(true);
              }}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Add Subtype
            </button>
            <button
              onClick={() => {
                setSelectedType(null);
                setShowTypeModal(true);
              }}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Add Type
            </button>
          </div>
        </div>

        {productTypes.map((type) => {
          const subtypes = productSubtypes.filter((st) => st.product_type_id === type.product_type_id);
          const isExpanded = expandedTypes.has(type.product_type_id);

          return (
            <div key={type.product_type_id} className="bg-white rounded-lg shadow-md mb-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => toggleType(type.product_type_id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                  <span className="text-sm text-gray-500">
                    ({subtypes.reduce((sum, st) => sum + getProductsBySubtype(st.product_subtype_id).length, 0)} products)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedType(type);
                      setShowSubtypeModal(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Add Subtype
                  </button>
                  <button
                    onClick={() => handleDeleteType(type.product_type_id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4">
                  {subtypes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No subtypes yet</p>
                  ) : (
                    subtypes.map((subtype) => {
                      const subtypeProducts = getProductsBySubtype(subtype.product_subtype_id);
                      return (
                        <div key={subtype.product_subtype_id} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-700">{subtype.name}</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedType(type);
                                  setShowSubtypeModal(true);
                                }}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSubtype(subtype.product_subtype_id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subtypeProducts.map((product) => (
                              <ProductCard
                                key={product.product_id}
                                product={product}
                                onEdit={() => {
                                  setSelectedProduct(product);
                                  setShowProductModal(true);
                                }}
                                onDelete={() => handleDeleteProduct(product.product_id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {getUncategorizedProducts().length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uncategorized</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getUncategorizedProducts().map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onEdit={() => {
                    setSelectedProduct(product);
                    setShowProductModal(true);
                  }}
                  onDelete={() => handleDeleteProduct(product.product_id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          productTypes={productTypes}
          productSubtypes={productSubtypes}
          onClose={() => {
            setShowProductModal(false);
            setSelectedProduct(null);
          }}
          onSave={loadData}
        />
      )}

      {showTypeModal && (
        <ProductTypeModal
          type={selectedType}
          onClose={() => {
            setShowTypeModal(false);
            setSelectedType(null);
          }}
          onSave={loadData}
        />
      )}

      {showSubtypeModal && (
        <ProductSubtypeModal
          type={selectedType}
          onClose={() => {
            setShowSubtypeModal(false);
            setSelectedType(null);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
};

const ProductCard = ({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{product.name}</h4>
          <p className="text-sm text-gray-600">Stock: {product.quantity}</p>
          {product.base_price && (
            <p className="text-sm text-gray-600">Price: ${parseFloat(product.base_price).toFixed(2)}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-md" />
        ) : (
          'No image'
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

