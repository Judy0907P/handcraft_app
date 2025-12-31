import { useState, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { partsApi, partTypesApi, partSubtypesApi } from '../services/api';
import { Part, PartType, PartSubtype, SortOption, SortDirection } from '../types';
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import PartModal from '../components/parts/PartModal';
import PartTypeModal from '../components/parts/PartTypeModal';
import PartSubtypeModal from '../components/parts/PartSubtypeModal';

const PartsPage = () => {
  const { currentOrg } = useOrg();
  const [parts, setParts] = useState<Part[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [partSubtypes, setPartSubtypes] = useState<PartSubtype[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showSubtypeModal, setShowSubtypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState<PartType | null>(null);
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
      const [partsRes, typesRes] = await Promise.all([
        partsApi.getAll(currentOrg.org_id),
        partTypesApi.getAll(currentOrg.org_id),
      ]);
      setParts(partsRes.data);
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

  const filteredAndSortedParts = () => {
    let filtered = parts;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((part) =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'stock':
          comparison = a.stock - b.stock;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const getPartsBySubtype = (subtypeId: string) => {
    return filteredAndSortedParts().filter((part) => part.subtype_id === subtypeId);
  };

  const getUncategorizedParts = () => {
    return filteredAndSortedParts().filter((part) => !part.subtype_id);
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part?')) return;
    try {
      await partsApi.delete(partId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete part');
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this type? All subtypes will be deleted.')) return;
    try {
      await partTypesApi.delete(typeId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete type');
    }
  };

  const handleDeleteSubtype = async (subtypeId: string) => {
    if (!confirm('Are you sure you want to delete this subtype?')) return;
    try {
      await partSubtypesApi.delete(subtypeId);
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
        <h1 className="text-3xl font-bold text-gray-900">Parts</h1>
        <button
          onClick={() => {
            setSelectedPart(null);
            setShowPartModal(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Part
        </button>
      </div>

      {/* Search and Sort */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search parts by name..."
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

      {/* Type Management */}
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

        {/* Parts by Category */}
        {partTypes.map((type) => {
          const subtypes = partSubtypes.filter((st) => st.type_id === type.type_id);
          const isExpanded = expandedTypes.has(type.type_id);

          return (
            <div key={type.type_id} className="bg-white rounded-lg shadow-md mb-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => toggleType(type.type_id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{type.type_name}</h3>
                  <span className="text-sm text-gray-500">
                    ({subtypes.reduce((sum, st) => sum + getPartsBySubtype(st.subtype_id).length, 0)} parts)
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
                    onClick={() => handleDeleteType(type.type_id)}
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
                      const subtypeParts = getPartsBySubtype(subtype.subtype_id);
                      return (
                        <div key={subtype.subtype_id} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-700">{subtype.subtype_name}</h4>
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
                                onClick={() => handleDeleteSubtype(subtype.subtype_id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subtypeParts.map((part) => (
                              <PartCard
                                key={part.part_id}
                                part={part}
                                onEdit={() => {
                                  setSelectedPart(part);
                                  setShowPartModal(true);
                                }}
                                onDelete={() => handleDeletePart(part.part_id)}
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

        {/* Uncategorized Parts */}
        {getUncategorizedParts().length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uncategorized</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getUncategorizedParts().map((part) => (
                <PartCard
                  key={part.part_id}
                  part={part}
                  onEdit={() => {
                    setSelectedPart(part);
                    setShowPartModal(true);
                  }}
                  onDelete={() => handleDeletePart(part.part_id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPartModal && (
        <PartModal
          part={selectedPart}
          partTypes={partTypes}
          partSubtypes={partSubtypes}
          onClose={() => {
            setShowPartModal(false);
            setSelectedPart(null);
          }}
          onSave={loadData}
        />
      )}

      {showTypeModal && (
        <PartTypeModal
          type={selectedType}
          onClose={() => {
            setShowTypeModal(false);
            setSelectedType(null);
          }}
          onSave={loadData}
        />
      )}

      {showSubtypeModal && (
        <PartSubtypeModal
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

const PartCard = ({
  part,
  onEdit,
  onDelete,
}: {
  part: Part;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{part.name}</h4>
          <p className="text-sm text-gray-600">Stock: {part.stock} {part.unit || ''}</p>
          {part.alert_stock > 0 && (
            <p className="text-sm text-orange-600">Alert at: {part.alert_stock} {part.unit || ''}</p>
          )}
          <p className="text-sm text-gray-600">Cost: ${parseFloat(part.unit_cost).toFixed(2)}</p>
          {part.specs && <p className="text-sm text-gray-500">Specs: {part.specs}</p>}
          {part.color && <p className="text-sm text-gray-500">Color: {part.color}</p>}
          {part.status && part.status.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {part.status.map((status, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {status}
                </span>
              ))}
            </div>
          )}
          {part.notes && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{part.notes}</p>
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
      {/* Image thumbnail */}
      {part.image_url ? (
        <img
          src={part.image_url}
          alt={part.name}
          className="w-full h-32 object-cover rounded-md"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm ${part.image_url ? 'hidden' : ''}`}>
        No image
      </div>
    </div>
  );
};

export default PartsPage;

