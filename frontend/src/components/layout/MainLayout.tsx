import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useCart } from '../../contexts/CartContext';
import { Home, Package, ShoppingBag, ShoppingCart, DollarSign, Settings, LogOut, Building2 } from 'lucide-react';

const MainLayout = () => {
  const { logout } = useAuth();
  const { currentOrg, setCurrentOrg } = useOrg();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setCurrentOrg(null);
    navigate('/login');
  };

  const handleOrgChange = () => {
    setCurrentOrg(null);
    navigate('/orgs');
  };

  const cartItemCount = getItemCount();
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/parts', icon: Package, label: 'Parts' },
    { path: '/products', icon: ShoppingBag, label: 'Products' },
    { path: '/cart', icon: ShoppingCart, label: 'Cart' },
    { path: '/sales', icon: DollarSign, label: 'Sales' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Handcraft Management</h1>
              {currentOrg && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{currentOrg.name}</span>
                  <button
                    onClick={handleOrgChange}
                    className="text-sm text-primary-600 hover:text-primary-700 ml-2"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const showBadge = item.path === '/cart' && cartItemCount > 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                    active
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {showBadge && (
                    <span className="ml-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentOrg ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Shop Selected</h2>
            <p className="text-gray-600 mb-6">Please select or create a shop to continue</p>
            <Link
              to="/orgs"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Building2 className="w-5 h-5" />
              Select Shop
            </Link>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
};

export default MainLayout;

