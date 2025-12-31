import { useEffect, useState } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { partsApi, productsApi, salesApi } from '../services/api';
import { Package, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';

const HomePage = () => {
  const { currentOrg } = useOrg();
  const [stats, setStats] = useState({
    parts: 0,
    products: 0,
    sales: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      loadStats();
    }
  }, [currentOrg]);

  const loadStats = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [partsRes, productsRes, salesRes] = await Promise.all([
        partsApi.getAll(currentOrg.org_id),
        productsApi.getAll(currentOrg.org_id),
        salesApi.getAll(currentOrg.org_id),
      ]);

      const totalRevenue = salesRes.data.reduce(
        (sum, sale) => sum + parseFloat(sale.total_revenue),
        0
      );

      setStats({
        parts: partsRes.data.length,
        products: productsRes.data.length,
        sales: salesRes.data.length,
        revenue: totalRevenue,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Parts',
      value: stats.parts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Products',
      value: stats.products,
      icon: ShoppingBag,
      color: 'bg-green-500',
    },
    {
      label: 'Total Sales',
      value: stats.sales,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      label: 'Total Revenue',
      value: `$${stats.revenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;

