export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'Admin' | 'Vendedor';
  role_id?: number;
  password?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  cost_price?: number;
  stock: number;
  category: string;
  barcode?: string;
  batch_number?: string;
  expiry_date?: string;
  is_combo?: number;
  combo_items?: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  points?: number;
  credit_balance?: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Purchase {
  id: number;
  number: string;
  supplier_id: number;
  supplier_name: string;
  warehouse: string;
  total: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  created_at: string;
  purchase_date: string;
  observations?: string;
  details?: PurchaseDetail[];
}

export interface PurchaseDetail {
  id: number;
  purchase_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name: string;
  user_id: number;
  user_name: string;
  type: 'IN' | 'OUT' | 'SALE' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity: string;
  entity_id: number;
  details: string;
  created_at: string;
}

export interface Sale {
  id: number;
  user_id: number;
  customer_id?: number;
  total: number;
  status: 'COMPLETED' | 'CANCELLED';
  payment_method: 'CASH' | 'QR' | 'MIXED' | 'CREDIT';
  cash_amount?: number;
  qr_amount?: number;
  credit_amount?: number;
  paid_amount?: number;
  discount_amount?: number;
  points_redeemed?: number;
  created_at: string;
  seller_name?: string;
  customer_name?: string;
  customer_phone?: string;
  details?: SaleDetail[];
}

export interface CashMovement {
  id: number;
  session_id: number;
  user_id: number;
  user_name?: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  reason: string;
  created_at: string;
}

export interface CashSession {
  id: number;
  user_id: number;
  user_name?: string;
  opening_amount: number;
  closing_amount?: number;
  expected_amount: number;
  extra_income: number;
  extra_expense: number;
  cash_sales?: number;
  qr_sales?: number;
  credit_sales?: number;
  credit_collections?: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  movements?: CashMovement[];
}

export interface Quotation {
  id: number;
  user_id: number;
  customer_id?: number;
  seller_name?: string;
  customer_name?: string;
  customer_phone?: string;
  total: number;
  valid_until: string;
  notes?: string;
  status: 'PENDING' | 'CONVERTED' | 'CANCELLED';
  created_at: string;
  details?: SaleDetail[];
}

export interface CreditSale extends Sale {
  balance_due: number;
  payments?: {
    id: number;
    amount: number;
    payment_method: string;
    notes: string;
    user_name: string;
    created_at: string;
  }[];
}

export interface Expense {
  id: number;
  user_id: number;
  user_name?: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  created_at: string;
}

export interface FinanceSummary {
  revenue: number;
  salesCount: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  totalPurchases: number;
  netProfit: number;
  pendingCredits: number;
  productProfitability: {
    id: number;
    name: string;
    category: string;
    price: number;
    cost_price: number;
    stock: number;
    units_sold: number;
    revenue: number;
    total_cost: number;
    profit: number;
    margin_percent: number;
  }[];
  sellerRanking: {
    id: number;
    full_name: string;
    role: string;
    sales_count: number;
    total_revenue: number;
    commission: number;
  }[];
  expensesByCategory: {
    category: string;
    total: number;
  }[];
}

export interface SaleDetail {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DashboardStats {
  revenue: number;
  salesCount: number;
  productsCount: number;
  lowStock: number;
  customersCount: number;
  recentSales: {
    total: number;
    created_at: string;
    seller: string;
  }[];
  salesByDay: {
    date: string;
    total: number;
  }[];
}
