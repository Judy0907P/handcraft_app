import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useCart } from '../../contexts/CartContext';
import { Home, Package, ShoppingBag, ShoppingCart, FileText, DollarSign, Settings, LogOut, Building2, ChevronDown } from 'lucide-react';

const MainLayout = () => {
  const { logout } = useAuth();
  const { currentOrg, setCurrentOrg } = useOrg();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { path: '/orders', icon: FileText, label: 'Orders' },
    { path: '/sales', icon: DollarSign, label: 'Sales' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Get the current active nav item
  const activeNavItem = navItems.find(item => isActive(item.path)) || navItems[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close dropdown when navigating
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/craftflow_wide.png" 
                alt="CraftFlow" 
                className="h-8"
              />
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
          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden md:flex space-x-1">
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

          {/* Mobile Navigation - dropdown style */}
          <div className="md:hidden relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium border-b-2 border-primary-500 text-primary-600"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const ActiveIcon = activeNavItem.icon;
                  return (
                    <>
                      <ActiveIcon className="w-5 h-5" />
                      <span>{activeNavItem.label}</span>
                      {activeNavItem.path === '/cart' && cartItemCount > 0 && (
                        <span className="ml-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cartItemCount}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const showBadge = item.path === '/cart' && cartItemCount > 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                        active
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cartItemCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
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

