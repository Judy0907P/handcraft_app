export interface User {
  user_id: string;
  email: string;
  display_name?: string;
  created_at: string;
  last_login_at?: string;
}

export interface Organization {
  org_id: string;
  name: string;
  main_currency: string;
  additional_currency?: string;
  exchange_rate: string;
  created_at: string;
}

export interface PartType {
  type_id: string;
  org_id: string;
  type_name: string;
  created_at: string;
}

export interface PartSubtype {
  subtype_id: string;
  type_id: string;
  subtype_name: string;
  created_at: string;
}

export interface Part {
  part_id: string;
  org_id: string;
  name: string;
  stock: number;
  unit_cost: string;
  unit?: string;
  subtype_id?: string;
  specs?: string;
  color?: string;
  alert_stock: number;
  image_url?: string;
  status: string[];
  notes?: string;
  created_at: string;
}

export interface ProductType {
  product_type_id: string;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ProductSubtype {
  product_subtype_id: string;
  product_type_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  product_id: string;
  org_id: string;
  name: string;
  description: string;
  primary_color: string;
  secondary_color: string;
  product_subtype_id?: string;
  status: string[];
  is_self_made: boolean;
  difficulty: string;
  quantity: number;
  alert_quantity: number;
  base_price?: string;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  sale_id: string;
  org_id: string;
  product_id: string;
  transaction_id: string;
  quantity: number;
  unit_price: string;
  total_revenue: string;
  sale_date: string;
  notes?: string;
  created_at: string;
}

export interface PartWithSubtype extends Part {
  subtype?: PartSubtype;
  type?: PartType;
}

export interface ProductWithSubtype extends Product {
  subtype?: ProductSubtype;
  type?: ProductType;
}

export type SortOption = 'stock' | 'name' | 'updated';
export type SortDirection = 'asc' | 'desc';

