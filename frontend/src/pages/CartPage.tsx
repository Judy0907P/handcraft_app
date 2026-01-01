import { useState, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { useCart } from '../contexts/CartContext';
import { salesApi, productsApi } from '../services/api';
import { Product } from '../types';
import { ShoppingCart, Trash2, Plus, Minus, DollarSign, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartPage = () => {
  const { currentOrg } = useOrg();
  const { cartItems, removeFromCart, updateQuantity, updateCustomPrice, clearCart, getTotalAmount } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (currentOrg && cartItems.length > 0) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [currentOrg, cartItems.length]);

  const loadProducts = async () => {
    if (!currentOrg) return;
    try {
      const productIds = cartItems.map((item) => item.product_id);
      // Fetch all products and filter
      const response = await productsApi.getAll(currentOrg.org_id);
      const fetchedProducts = response.data.filter((p) => productIds.includes(p.product_id));
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProduct = (productId: string): Product | undefined => {
    // First check if product is in cart item (from context)
    const cartItem = cartItems.find((item) => item.product_id === productId);
    if (cartItem?.product) return cartItem.product;
    // Otherwise find in products array (fetched for stock updates)
    return products.find((p) => p.product_id === productId);
  };

  const handleCheckout = async () => {
    if (!currentOrg || cartItems.length === 0) return;

    // Validate all items have prices
    for (const item of cartItems) {
      const product = getProduct(item.product_id);
      const price = item.customPrice || product?.base_price;
      if (!price || parseFloat(price) <= 0) {
        alert(`Please set a price for ${product?.name || 'item'}`);
        return;
      }
      if (product && item.quantity > product.quantity) {
        alert(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
        return;
      }
    }

    if (!confirm('Are you sure you want to checkout? This will record the sales.')) {
      return;
    }

    setCheckingOut(true);
    try {
      // Create a sale for each cart item
      const salePromises = cartItems.map((item) => {
        const product = getProduct(item.product_id);
        const unitPrice = item.customPrice || product?.base_price || '0';
        return salesApi.create(currentOrg.org_id, {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
        });
      });

      await Promise.all(salePromises);
      clearCart();
      alert('Checkout successful! Sales have been recorded.');
      navigate('/sales');
    } catch (error: any) {
      console.error('Checkout failed:', error);
      alert(error.response?.data?.detail || 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Add products to your cart to get started</p>
        <button
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const totalAmount = getTotalAmount();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cart</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {checkingOut ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Checkout
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cartItems.map((item) => {
                const product = getProduct(item.product_id);
                if (!product) return null;

                const basePrice = product.base_price ? parseFloat(product.base_price) : 0;
                const sellingPrice = item.customPrice ? parseFloat(item.customPrice) : basePrice;
                const subtotal = sellingPrice * item.quantity;

                return (
                  <tr key={item.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.image_url ? (
                          <img
                            src={
                              product.image_url.startsWith('http')
                                ? product.image_url
                                : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url}`
                            }
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-md mr-4"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mr-4">
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={product.quantity}
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1;
                            updateQuantity(item.product_id, Math.min(qty, product.quantity));
                          }}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
                          disabled={item.quantity >= product.quantity}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${basePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.customPrice || product.base_price || '0'}
                          onChange={(e) => updateCustomPrice(item.product_id, e.target.value)}
                          placeholder={product.base_price || '0.00'}
                          className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                  Total Amount:
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">${totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

