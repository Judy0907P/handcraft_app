import axios from 'axios';
import type {
  Organization,
  PartType,
  PartSubtype,
  Part,
  ProductType,
  ProductSubtype,
  Product,
  Sale,
  Platform,
  Order,
  OrderLine,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  username: string;
}

export const authApi = {
  register: (data: RegisterData) => api.post<TokenResponse>('/auth/register', data),
  login: (data: LoginData) => {
    // OAuth2PasswordRequestForm uses form data with username/password
    const formData = new URLSearchParams();
    formData.append('username', data.email); // OAuth2 uses 'username' for email
    formData.append('password', data.password);
    return api.post<TokenResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getMe: () => api.get<{ user_id: string; email: string; username: string; created_at: string }>('/auth/me'),
};

// Organizations
export const organizationsApi = {
  getAll: () => api.get<Organization[]>('/organizations/'),
  getById: (orgId: string) => api.get<Organization>(`/organizations/${orgId}`),
  create: (data: { name: string; main_currency?: string; additional_currency?: string; exchange_rate?: string }) => api.post<Organization>('/organizations/', data),
  update: (orgId: string, data: { name?: string; main_currency?: string; additional_currency?: string; exchange_rate?: string }) => api.patch<Organization>(`/organizations/${orgId}`, data),
  delete: (orgId: string) => api.delete(`/organizations/${orgId}`),
};

// Part Types
export const partTypesApi = {
  getAll: (orgId: string) => api.get<PartType[]>(`/part-types/org/${orgId}`),
  getById: (typeId: string) => api.get<PartType>(`/part-types/${typeId}`),
  create: (data: { org_id: string; type_name: string }) => api.post<PartType>('/part-types/', data),
  delete: (typeId: string) => api.delete(`/part-types/${typeId}`),
};

// Part Subtypes
export const partSubtypesApi = {
  getByType: (typeId: string) => api.get<PartSubtype[]>(`/part-types/subtypes/type/${typeId}`),
  getById: (subtypeId: string) => api.get<PartSubtype>(`/part-types/subtypes/${subtypeId}`),
  create: (data: { type_id: string; subtype_name: string }) => api.post<PartSubtype>('/part-types/subtypes', data),
  delete: (subtypeId: string) => api.delete(`/part-types/subtypes/${subtypeId}`),
};

// Parts
export const partsApi = {
  getAll: (orgId: string, subtypeId?: string) => {
    const params = subtypeId ? { subtype_id: subtypeId } : {};
    return api.get<Part[]>(`/parts/org/${orgId}`, { params });
  },
  getById: (partId: string) => api.get<Part>(`/parts/${partId}`),
  create: (data: {
    org_id: string;
    name: string;
    stock?: number;
    unit_cost?: string;
    unit?: string;
    subtype_id?: string;
  }) => api.post<Part>('/parts/', data),
  update: (partId: string, data: Partial<Part>) => api.patch<Part>(`/parts/${partId}`, data),
  delete: (partId: string) => api.delete(`/parts/${partId}`),
  uploadImage: (partId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Part>(`/parts/${partId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteImage: (partId: string) => api.delete<Part>(`/parts/${partId}/image`),
  getFIFOCost: (partId: string, quantity: number) => api.get<{ part_id: string; quantity: string; fifo_unit_cost: string; historical_average_cost: string }>(`/parts/${partId}/fifo-cost`, { params: { quantity } }),
  adjustInventory: (partId: string, data: {
    part_id: string;
    txn_type: 'purchase' | 'loss';
    qty: number;
    unit_cost?: string;
    total_cost?: string;
    cost_type?: 'unit' | 'total';
    notes?: string;
  }) => api.post<{ transaction_id: string; part_id: string; txn_type: string; qty: number; new_stock: number; new_unit_cost: string; message: string }>(`/parts/${partId}/inventory`, data),
};

// Product Types
export const productTypesApi = {
  getAll: (orgId: string) => api.get<ProductType[]>(`/product-types/org/${orgId}`),
  getById: (typeId: string) => api.get<ProductType>(`/product-types/${typeId}`),
  create: (data: { org_id: string; name: string; description?: string }) =>
    api.post<ProductType>('/product-types/', data),
  delete: (typeId: string) => api.delete(`/product-types/${typeId}`),
};

// Product Subtypes
export const productSubtypesApi = {
  getByType: (typeId: string) => api.get<ProductSubtype[]>(`/product-types/subtypes/type/${typeId}`),
  getById: (subtypeId: string) => api.get<ProductSubtype>(`/product-types/subtypes/${subtypeId}`),
  create: (data: { product_type_id: string; name: string; description?: string }) =>
    api.post<ProductSubtype>('/product-types/subtypes', data),
  delete: (subtypeId: string) => api.delete(`/product-types/subtypes/${subtypeId}`),
};

// Products
export const productsApi = {
  getAll: (orgId: string, subtypeId?: string) => {
    const params: any = {};
    if (subtypeId) params.product_subtype_id = subtypeId;
    return api.get<Product[]>(`/products/org/${orgId}`, { params });
  },
  getById: (productId: string) => api.get<Product>(`/products/${productId}`),
  create: (data: {
    org_id: string;
    name: string;
    description?: string;
    primary_color?: string;
    secondary_color?: string;
    product_subtype_id?: string;
    status: string[];
    is_self_made: boolean;
    difficulty: string;
    quantity: number;
    alert_quantity: number;
    total_cost?: string;
    image_url?: string;
    notes?: string;
  }) => api.post<Product>('/products/', data),
  update: (productId: string, data: Partial<Product>) => api.patch<Product>(`/products/${productId}`, data),
  delete: (productId: string) => api.delete(`/products/${productId}`),
  uploadImage: (productId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Product>(`/products/${productId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteImage: (productId: string) => api.delete<Product>(`/products/${productId}/image`),
  adjustInventory: (productId: string, data: { txn_type: 'loss' | 'build_product'; qty: string; notes?: string }) => {
    if (data.txn_type === 'build_product') {
      // Use production build endpoint
      return api.post<{ transaction_id: string; message: string; product_id: string; build_qty: string; new_product_quantity: number }>('/production/build', {
        product_id: productId,
        build_qty: data.qty,
      });
    } else {
      // Use inventory adjustment endpoint
      return api.post<{ transaction_id: string; product_id: string; txn_type: string; qty: string; new_product_quantity: number; message: string }>(`/products/${productId}/inventory`, {
        product_id: productId,
        txn_type: data.txn_type,
        qty: data.qty,
        notes: data.notes,
      });
    }
  },
};

// Product Status Labels
export interface ProductStatusLabel {
  label_id: string;
  org_id: string;
  label: string;
  created_at: string;
}

export const productStatusLabelsApi = {
  getAll: (orgId: string) => api.get<ProductStatusLabel[]>(`/product-status-labels/org/${orgId}`),
  create: (data: { org_id: string; label: string }) => api.post<ProductStatusLabel>('/product-status-labels/', data),
  delete: (labelId: string) => api.delete(`/product-status-labels/${labelId}`),
};

// Part Status Labels
export interface PartStatusLabel {
  label_id: string;
  org_id: string;
  label: string;
  created_at: string;
}

export const partStatusLabelsApi = {
  getAll: (orgId: string) => api.get<PartStatusLabel[]>(`/part-status-labels/org/${orgId}`),
  create: (data: { org_id: string; label: string }) => api.post<PartStatusLabel>('/part-status-labels/', data),
  delete: (labelId: string) => api.delete(`/part-status-labels/${labelId}`),
};

// Recipes
export interface RecipeLine {
  product_id: string;
  part_id: string;
  quantity: string;
  created_at: string;
}

export const recipesApi = {
  getByProduct: (productId: string) => api.get<RecipeLine[]>(`/recipes/product/${productId}`),
  create: (productId: string, data: { part_id: string; quantity: string }) =>
    api.post<RecipeLine>(`/recipes/product/${productId}`, data),
  update: (productId: string, partId: string, data: { part_id: string; quantity: string }) =>
    api.put<RecipeLine>(`/recipes/product/${productId}/part/${partId}`, data),
  patch: (productId: string, partId: string, data: { quantity?: string }) =>
    api.patch<RecipeLine>(`/recipes/product/${productId}/part/${partId}`, data),
  delete: (productId: string, partId: string) => api.delete(`/recipes/product/${productId}/part/${partId}`),
  bulkUpdate: (productId: string, recipeLines: Array<{ part_id: string; quantity: string }>) =>
    api.post<RecipeLine[]>(`/recipes/product/${productId}/bulk`, recipeLines),
};

// Sales
export const salesApi = {
  getAll: (orgId: string) => api.get<Sale[]>(`/sales/org/${orgId}`),
  getById: (saleId: string) => api.get<Sale>(`/sales/${saleId}`),
  create: (orgId: string, data: { product_id: string; quantity: number; unit_price: string; notes?: string }) =>
    api.post<Sale>(`/sales/?org_id=${orgId}`, data),
};

// Platforms
export const platformsApi = {
  getAll: (orgId: string) => api.get<Platform[]>(`/platforms/org/${orgId}`),
  getById: (platformId: string) => api.get<Platform>(`/platforms/${platformId}`),
  create: (data: { org_id: string; name: string; channel: 'online' | 'offline' }) =>
    api.post<Platform>('/platforms/', data),
  update: (platformId: string, data: { name?: string; channel?: 'online' | 'offline' }) =>
    api.patch<Platform>(`/platforms/${platformId}`, data),
  delete: (platformId: string) => api.delete(`/platforms/${platformId}`),
};

// Orders
export const ordersApi = {
  getAll: (orgId: string, skip?: number, limit?: number) => {
    const params: any = {};
    if (skip !== undefined) params.skip = skip;
    if (limit !== undefined) params.limit = limit;
    return api.get<Order[]>(`/orders/org/${orgId}`, { params });
  },
  getById: (orderId: string) => api.get<Order>(`/orders/${orderId}`),
  create: (data: {
    org_id: string;
    user_id: string;
    channel?: 'online' | 'offline';
    platform_id?: string;
    notes?: string;
    order_lines: Array<{ product_id: string; quantity: number; unit_price: string }>;
  }) => api.post<Order>('/orders/', data),
  updateStatus: (orderId: string, status: 'created' | 'completed' | 'shipped' | 'closed' | 'canceled') =>
    api.patch<Order>(`/orders/${orderId}/status`, { status }),
  update: (orderId: string, data: { notes?: string; channel?: 'online' | 'offline' | null; platform_id?: string | null }) =>
    api.patch<Order>(`/orders/${orderId}`, data),
  returnOrder: (orderId: string) =>
    api.post<Order>(`/orders/${orderId}/return`),
};

