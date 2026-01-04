import { useState, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { salesApi, productsApi } from '../services/api';
import { Sale, Product } from '../types';
import { Plus, DollarSign, Calendar, Package, ExternalLink } from 'lucide-react';
import SaleModal from '../components/sales/SaleModal';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type SaleSortOption = 'quantity' | 'amount' | 'date';

const SalesPage = () => {
  const { currentOrg } = useOrg();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState<SaleSortOption>('date');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Extract order_id from sale notes (format: "Order <order_id>" or "Order <order_id>\n...")
  const extractOrderId = (notes: string | undefined | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/^Order\s+([a-f0-9-]{36})/i);
    return match ? match[1] : null;
  };

  const handleOrderLinkClick = (orderId: string) => {
    navigate(`/orders?order_id=${orderId}`);
  };

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        salesApi.getAll(currentOrg.org_id),
        productsApi.getAll(currentOrg.org_id),
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedSales = () => {
    return [...sales].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'quantity':
          comparison = a.qty - b.qty;
          break;
        case 'amount':
          comparison = parseFloat(a.total_revenue) - parseFloat(b.total_revenue);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return -comparison; // Descending order
    });
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.product_id === productId)?.name || 'Unknown Product';
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_revenue), 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.qty, 0);

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
        <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
        <button
          onClick={() => setShowSaleModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{sales.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quantity</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalQuantity}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SaleSortOption)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="date">Date</option>
            <option value="quantity">Quantity</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSales().map((sale) => {
                const orderId = extractOrderId(sale.notes);
                return (
                  <tr key={sale.txn_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(sale.created_at), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getProductName(sale.product_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(sale.unit_price_for_sale).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${parseFloat(sale.total_revenue).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {orderId ? (
                        <span className="truncate block" title={sale.notes || ''}>
                          {sale.notes?.replace(/^Order\s+[a-f0-9-]{36}/i, '').trim() || '-'}
                        </span>
                      ) : (
                        <span className="truncate block" title={sale.notes || ''}>
                          {sale.notes || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {orderId ? (
                        <button
                          onClick={() => handleOrderLinkClick(orderId)}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                          title={`View Order ${orderId}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Order
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sales.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sales Yet</h3>
            <p className="text-gray-600 mb-4">Start recording sales to see them here</p>
            <button
              onClick={() => setShowSaleModal(true)}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Sale
            </button>
          </div>
        )}
      </div>

      {showSaleModal && (
        <SaleModal
          products={products}
          onClose={() => setShowSaleModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
};

export default SalesPage;

