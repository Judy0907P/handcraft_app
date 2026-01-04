import { useState, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { ordersApi, platformsApi, productsApi } from '../services/api';
import { Order, Platform, Product } from '../types';
import { ShoppingBag, Calendar, Package, X, CheckCircle, Truck, Archive, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

// Tracking Number Modal Component
const TrackingModal = ({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (trackingNumber: string) => void; 
  onCancel: () => void;
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      onSubmit(trackingNumber.trim());
    } else {
      onSubmit(''); // Allow empty tracking number
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Tracking Number</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number (Optional)
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Mark Shipped
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type OrderSortOption = 'date' | 'status' | 'amount';

const statusColors: Record<Order['status'], string> = {
  created: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  shipped: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  canceled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<Order['status'], typeof Package> = {
  created: Package,
  completed: CheckCircle,
  shipped: Truck,
  closed: Archive,
  canceled: X,
};

const OrdersPage = () => {
  const { currentOrg } = useOrg();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState<OrderSortOption>('date');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ orderId: string; status: Order['status'] } | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingChannel, setEditingChannel] = useState(false);
  const [channelValue, setChannelValue] = useState<'online' | 'offline' | ''>('');
  const [editingPlatform, setEditingPlatform] = useState(false);
  const [platformValue, setPlatformValue] = useState<string>('');
  const [savingChannelPlatform, setSavingChannelPlatform] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  // Check for order_id in URL params and open the order detail modal
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('order_id');
    if (orderIdFromUrl && orders.length > 0 && !selectedOrder) {
      const order = orders.find(o => o.order_id === orderIdFromUrl);
      if (order) {
        handleViewDetails(order);
        // Remove the order_id from URL after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('order_id');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, orders]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [ordersRes, platformsRes, productsRes] = await Promise.all([
        ordersApi.getAll(currentOrg.org_id),
        platformsApi.getAll(currentOrg.org_id),
        productsApi.getAll(currentOrg.org_id),
      ]);
      setOrders(ordersRes.data);
      setPlatforms(platformsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Failed to load orders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedOrders = () => {
    return [...orders].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'amount':
          comparison = parseFloat(a.total_price) - parseFloat(b.total_price);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return -comparison; // Descending order
    });
  };

  const getPlatformName = (platformId: string | null) => {
    if (!platformId) return '-';
    return platforms.find((p) => p.platform_id === platformId)?.name || 'Unknown';
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.product_id === productId)?.name || 'Unknown Product';
  };

  const handleViewDetails = async (order: Order) => {
    try {
      const response = await ordersApi.getById(order.order_id);
      setSelectedOrder(response.data);
      setNotesValue(response.data.notes || '');
      setEditingNotes(false);
      setChannelValue(response.data.channel || '');
      setEditingChannel(false);
      setPlatformValue(response.data.platform_id || '');
      setEditingPlatform(false);
    } catch (error) {
      console.error('Failed to load order details:', error);
      // Fallback to order from list if API call fails
      setSelectedOrder(order);
      setNotesValue(order.notes || '');
      setEditingNotes(false);
      setChannelValue(order.channel || '');
      setEditingChannel(false);
      setPlatformValue(order.platform_id || '');
      setEditingPlatform(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    setSavingNotes(true);
    try {
      await ordersApi.update(selectedOrder.order_id, { notes: notesValue });
      const updatedOrder = await ordersApi.getById(selectedOrder.order_id);
      setSelectedOrder(updatedOrder.data);
      setEditingNotes(false);
      await loadData();
    } catch (error: any) {
      console.error('Failed to update notes:', error);
      alert(error.response?.data?.detail || 'Failed to update notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEditNotes = () => {
    setNotesValue(selectedOrder?.notes || '');
    setEditingNotes(false);
  };

  const handleSaveChannelPlatform = async () => {
    if (!selectedOrder) return;
    setSavingChannelPlatform(true);
    try {
      const updateData: { channel?: string; platform_id?: string | null } = {};
      if (channelValue !== '') {
        updateData.channel = channelValue as 'online' | 'offline';
      } else {
        updateData.channel = null;
      }
      if (platformValue !== '') {
        updateData.platform_id = platformValue;
      } else {
        updateData.platform_id = null;
      }
      await ordersApi.update(selectedOrder.order_id, updateData);
      const updatedOrder = await ordersApi.getById(selectedOrder.order_id);
      setSelectedOrder(updatedOrder.data);
      setEditingChannel(false);
      setEditingPlatform(false);
      await loadData();
    } catch (error: any) {
      console.error('Failed to update channel/platform:', error);
      alert(error.response?.data?.detail || 'Failed to update channel/platform. Please try again.');
    } finally {
      setSavingChannelPlatform(false);
    }
  };

  const handleCancelEditChannelPlatform = () => {
    setChannelValue(selectedOrder?.channel || '');
    setPlatformValue(selectedOrder?.platform_id || '');
    setEditingChannel(false);
    setEditingPlatform(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status'], trackingNumber?: string) => {
    setUpdatingStatus(orderId);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      
      // If marking as shipped and tracking number provided, append to notes
      if (newStatus === 'shipped' && trackingNumber && trackingNumber.trim()) {
        const order = await ordersApi.getById(orderId);
        const currentNotes = order.data.notes || '';
        const trackingNote = trackingNumber.trim();
        const updatedNotes = currentNotes 
          ? `${currentNotes}\nTracking: ${trackingNote}`
          : `Tracking: ${trackingNote}`;
        await ordersApi.update(orderId, { notes: updatedNotes });
      }
      
      await loadData();
      if (selectedOrder?.order_id === orderId) {
        const updatedOrder = await ordersApi.getById(orderId);
        setSelectedOrder(updatedOrder.data);
      }
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      alert(error.response?.data?.detail || 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleShippedClick = (orderId: string) => {
    console.log('handleShippedClick called with orderId:', orderId);
    setPendingStatusUpdate({ orderId, status: 'shipped' });
    setShowTrackingModal(true);
  };

  const handleTrackingSubmit = (trackingNumber: string) => {
    if (pendingStatusUpdate) {
      handleStatusUpdate(pendingStatusUpdate.orderId, pendingStatusUpdate.status, trackingNumber);
      setPendingStatusUpdate(null);
      setShowTrackingModal(false);
    }
  };

  const handleTrackingCancel = () => {
    setPendingStatusUpdate(null);
    setShowTrackingModal(false);
  };

  const handleReturnOrder = async (orderId: string) => {
    setUpdatingStatus(orderId);
    try {
      await ordersApi.returnOrder(orderId);
      await loadData();
      if (selectedOrder?.order_id === orderId) {
        const updatedOrder = await ordersApi.getById(orderId);
        setSelectedOrder(updatedOrder.data);
        setNotesValue(updatedOrder.data.notes || '');
      }
    } catch (error: any) {
      console.error('Failed to return order:', error);
      alert(error.response?.data?.detail || 'Failed to return order. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status === 'closed')
    .reduce((sum, order) => sum + parseFloat(order.total_price), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'created').length;

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
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{pendingOrders}</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Closed Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Package className="w-8 h-8 text-white" />
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
            onChange={(e) => setSortBy(e.target.value as OrderSortOption)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="date">Date</option>
            <option value="status">Status</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedOrders().map((order) => {
                const StatusIcon = statusIcons[order.status];
                return (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.channel || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPlatformName(order.platform_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${parseFloat(order.total_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.notes || ''}>
                      {order.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600">Orders will appear here after checkout from cart</p>
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      {showTrackingModal && (
        <TrackingModal
          onSubmit={handleTrackingSubmit}
          onCancel={handleTrackingCancel}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    // Clear any order_id from URL when closing modal
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.delete('order_id');
                    if (newSearchParams.toString() !== searchParams.toString()) {
                      setSearchParams(newSearchParams, { replace: true });
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Order ID</p>
                  <p className="text-sm text-gray-900">{selectedOrder.order_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-600">Channel</p>
                    {!editingChannel && !editingPlatform && (
                      <button
                        onClick={() => setEditingChannel(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingChannel ? (
                    <div className="space-y-2">
                      <select
                        value={channelValue}
                        onChange={(e) => setChannelValue(e.target.value as 'online' | 'offline' | '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">{selectedOrder.channel || '-'}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-600">Platform</p>
                    {!editingChannel && !editingPlatform && (
                      <button
                        onClick={() => setEditingPlatform(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingPlatform ? (
                    <div className="space-y-2">
                      <select
                        value={platformValue}
                        onChange={(e) => setPlatformValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {platforms.map((platform) => (
                          <option key={platform.platform_id} value={platform.platform_id}>
                            {platform.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">{getPlatformName(selectedOrder.platform_id)}</p>
                  )}
                </div>
                {(editingChannel || editingPlatform) && (
                  <div className="col-span-2 flex gap-2 pt-2">
                    <button
                      onClick={handleSaveChannelPlatform}
                      disabled={savingChannelPlatform}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {savingChannelPlatform ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEditChannelPlatform}
                      disabled={savingChannelPlatform}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Created At</p>
                  <p className="text-sm text-gray-900">{format(new Date(selectedOrder.created_at), 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Price</p>
                  <p className="text-sm font-semibold text-gray-900">${parseFloat(selectedOrder.total_price).toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-600">Notes</p>
                    {!editingNotes && (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Add notes..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {savingNotes ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEditNotes}
                          disabled={savingNotes}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedOrder.notes || 'No notes'}</p>
                  )}
                </div>
              </div>

              {/* Order Lines */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.order_lines?.map((line) => (
                        <tr key={line.order_line_id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{getProductName(line.product_id)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{line.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${parseFloat(line.unit_cost).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${parseFloat(line.unit_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ${parseFloat(line.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Actions */}
              {selectedOrder.status !== 'closed' && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.status === 'created' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to mark this order as completed?')) {
                            handleStatusUpdate(selectedOrder.order_id, 'completed');
                          }
                        }}
                        disabled={updatingStatus === selectedOrder.order_id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Mark Completed
                      </button>
                    )}
                    {selectedOrder.status === 'completed' && (
                      <button
                        onClick={() => handleShippedClick(selectedOrder.order_id)}
                        disabled={updatingStatus === selectedOrder.order_id}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Mark Shipped
                      </button>
                    )}
                    {(selectedOrder.status === 'completed' || selectedOrder.status === 'shipped') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to close this order? This will record the sale.')) {
                            handleStatusUpdate(selectedOrder.order_id, 'closed');
                          }
                        }}
                        disabled={updatingStatus === selectedOrder.order_id}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Close Order
                      </button>
                    )}
                    {selectedOrder.status === 'shipped' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to return this order? It will be marked as canceled and inventory will be restored.')) {
                            handleReturnOrder(selectedOrder.order_id);
                          }
                        }}
                        disabled={updatingStatus === selectedOrder.order_id}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Return Order
                      </button>
                    )}
                    {(selectedOrder.status === 'created' || selectedOrder.status === 'completed') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order? Inventory will be restored.')) {
                            handleStatusUpdate(selectedOrder.order_id, 'canceled');
                          }
                        }}
                        disabled={updatingStatus === selectedOrder.order_id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

