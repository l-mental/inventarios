import {
  User,
  Product,
  Customer,
  Supplier,
  Purchase,
  InventoryMovement,
  AuditLog,
  Sale,
  CashSession,
  CashMovement,
  Quotation,
  Expense,
  BranchTransfer,
} from '../types';

import {
  TRACTOR_PARTS_PRODUCTS,
  DEFAULT_TRACTOR_SUPPLIERS,
} from '../data/tractorPartsCatalog';

const STORAGE_KEY = 'agrorepuestos_tractores_v1';

export interface LocalStore {
  users: (User & { password_plain?: string })[];
  products: (Product & { active?: number })[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  inventory_movements: InventoryMovement[];
  sales: Sale[];
  branch_transfers: BranchTransfer[];
  cash_sessions: CashSession[];
  cash_movements: CashMovement[];
  quotations: Quotation[];
  credit_payments: {
    id: number;
    sale_id: number;
    customer_id: number;
    user_id: number;
    user_name: string;
    amount: number;
    payment_method: string;
    notes: string;
    created_at: string;
  }[];
  expenses: Expense[];
  audit_logs: AuditLog[];
  settings: Record<string, string>;
}

const DEFAULT_PRODUCTS: (Product & { active?: number })[] = TRACTOR_PARTS_PRODUCTS;

function createInitialStore(): LocalStore {
  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];

  const users: (User & { password_plain?: string })[] = [
    { id: 1, username: 'admin', full_name: 'Administrador Sistema', role: 'Admin', role_id: 1, password_plain: 'admin123' },
    { id: 2, username: 'vendedor', full_name: 'Carlos Vendedor', role: 'Vendedor', role_id: 2, password_plain: 'vendedor123' }
  ];

  const customers: Customer[] = [
    { id: 1, name: 'Estancia Agrícola El Porvenir', email: 'compras@elporvenir.bo', phone: '78945612', address: 'Carretera al Norte Km 32', points: 240, credit_balance: 0, created_at: nowIso },
    { id: 2, name: 'Taller Mecánico Diesel & Agro', email: 'taller.dieselagro@gmail.com', phone: '71239845', address: 'Av. Cristo Redentor Km 8', points: 165, credit_balance: 0, created_at: nowIso },
    { id: 3, name: 'Cooperativa Cañeros Unidos', email: 'logistica@canerosunidos.org', phone: '68521479', address: 'Zona Montero Parque Industrial', points: 320, credit_balance: 0, created_at: nowIso },
    { id: 4, name: 'Ing. Roberto Chávez Mendoza', email: 'rchavez@agroservicios.bo', phone: '74125896', address: 'Av. Banzer 4to Anillo #402', points: 90, credit_balance: 0, created_at: nowIso },
    { id: 5, name: 'Hacienda San Ignacio S.R.L.', email: 'repuestos@sanignacio.com', phone: '77445566', address: 'Ruta San Ignacio Km 14', points: 410, credit_balance: 0, created_at: nowIso }
  ];

  const suppliers: Supplier[] = DEFAULT_TRACTOR_SUPPLIERS;

  const inventory_movements: InventoryMovement[] = DEFAULT_PRODUCTS.filter(p => p.stock > 0).slice(0, 20).map((p, idx) => ({
    id: idx + 1,
    product_id: p.id,
    product_name: p.name,
    user_id: 1,
    user_name: 'Administrador Sistema',
    type: 'IN',
    quantity: p.stock,
    reason: `Carga inicial de inventario (${p.supplier_name || p.brand || 'Almacén'})`,
    created_at: nowIso
  }));

  const pPiston = DEFAULT_PRODUCTS.find(p => p.barcode === 'EM9532') || DEFAULT_PRODUCTS[90];
  const pCojinete = DEFAULT_PRODUCTS.find(p => p.barcode === '4949') || DEFAULT_PRODUCTS[82];

  const sales: Sale[] = [
    {
      id: 1,
      user_id: 1,
      customer_id: 2,
      total: Number(((pPiston?.price || 95) * 2 + (pCojinete?.price || 58)).toFixed(2)),
      status: 'COMPLETED',
      payment_method: 'CASH',
      cash_amount: Number(((pPiston?.price || 95) * 2 + (pCojinete?.price || 58)).toFixed(2)),
      qr_amount: 0,
      credit_amount: 0,
      paid_amount: Number(((pPiston?.price || 95) * 2 + (pCojinete?.price || 58)).toFixed(2)),
      discount_amount: 0,
      points_redeemed: 0,
      created_at: nowIso,
      seller_name: 'Administrador Sistema',
      customer_name: 'Taller Mecánico Diesel & Agro',
      customer_phone: '71239845',
      details: [
        { id: 1, sale_id: 1, product_id: pPiston?.id || 91, product_name: pPiston?.name || 'PISTON + ANILLA 100MM Ø P=38MM EMMARK', quantity: 2, unit_price: pPiston?.price || 95, subtotal: Number(((pPiston?.price || 95) * 2).toFixed(2)) },
        { id: 2, sale_id: 1, product_id: pCojinete?.id || 83, product_name: pCojinete?.name || 'COJINETE DE BANCADA 010 PERKINS 1104 EMMARK 4347', quantity: 1, unit_price: pCojinete?.price || 58, subtotal: pCojinete?.price || 58 }
      ]
    }
  ];

  const cash_movements: CashMovement[] = [
    { id: 1, session_id: 1, user_id: 1, user_name: 'Administrador Sistema', type: 'INCOME', amount: 150.00, reason: 'Fondo sencillo para caja mostrador', created_at: nowIso },
    { id: 2, session_id: 1, user_id: 1, user_name: 'Administrador Sistema', type: 'EXPENSE', amount: 40.00, reason: 'Envío encomienda repuestos urgentes a taller', created_at: nowIso }
  ];

  const cash_sessions: CashSession[] = [
    {
      id: 1,
      user_id: 1,
      user_name: 'Administrador Sistema',
      opening_amount: 500.00,
      expected_amount: Number((500 + 150 - 40 + sales[0].total).toFixed(2)),
      extra_income: 150.00,
      extra_expense: 40.00,
      notes: 'Apertura de turno Sucursal Central',
      status: 'OPEN',
      opened_at: nowIso,
      movements: cash_movements
    }
  ];

  const pCamisa = DEFAULT_PRODUCTS.find(p => p.barcode === '51-09415-000') || DEFAULT_PRODUCTS[33];
  const pAnilla = DEFAULT_PRODUCTS.find(p => p.barcode === '4948') || DEFAULT_PRODUCTS[89];

  const quotations: Quotation[] = [
    {
      id: 1,
      user_id: 1,
      customer_id: 1,
      seller_name: 'Administrador Sistema',
      customer_name: 'Estancia Agrícola El Porvenir',
      customer_phone: '78945612',
      total: Number(((pCamisa?.price || 65) * 4 + (pAnilla?.price || 18.68) * 4).toFixed(2)),
      valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: 'Proforma overhaul motor tractor Fiat / Perkins 1104',
      status: 'PENDING',
      created_at: nowIso,
      details: [
        { id: 1, sale_id: 1, product_id: pCamisa?.id || 34, product_name: pCamisa?.name || 'CAMISA HUMEDA 115MM X 225MM NORMAL/TURBO', quantity: 4, unit_price: pCamisa?.price || 65, subtotal: Number(((pCamisa?.price || 65) * 4).toFixed(2)) },
        { id: 2, sale_id: 1, product_id: pAnilla?.id || 90, product_name: pAnilla?.name || 'JGO. DE ANILLA 105MM STD 2.7X2.5X3.00 PERKINS 1104', quantity: 4, unit_price: pAnilla?.price || 18.68, subtotal: Number(((pAnilla?.price || 18.68) * 4).toFixed(2)) }
      ]
    }
  ];

  const expenses: Expense[] = [
    { id: 1, user_id: 1, user_name: 'Administrador Sistema', category: 'Alquiler', description: 'Alquiler tienda y almacén central de repuestos agrícolas', amount: 2400.00, expense_date: today, payment_method: 'QR', created_at: nowIso },
    { id: 2, user_id: 1, user_name: 'Administrador Sistema', category: 'Servicios Básicos', description: 'Energía eléctrica e internet tienda principal', amount: 380.00, expense_date: today, payment_method: 'CASH', created_at: nowIso },
    { id: 3, user_id: 1, user_name: 'Administrador Sistema', category: 'Logística y Transporte', description: 'Despacho y flete importación QTP / GB Ricambi', amount: 420.00, expense_date: today, payment_method: 'QR', created_at: nowIso }
  ];

  const purchases: Purchase[] = [
    { id: 1, number: 'IMP-00412', supplier_id: 1, supplier_name: 'BETTY VALLE GRANDE', warehouse: 'Sucursal Central', total: 1450, status: 'COMPLETED', created_at: nowIso, purchase_date: today },
    { id: 2, number: 'IMP-00418', supplier_id: 5, supplier_name: 'EMMARK BETTY', warehouse: 'Sucursal Central', total: 2280, status: 'COMPLETED', created_at: nowIso, purchase_date: today }
  ];

  const audit_logs: AuditLog[] = [
    { id: 1, user_id: 1, user_name: 'Administrador Sistema', action: 'LOGIN', entity: 'USER', entity_id: 1, details: 'Catálogo de 91 repuestos de tractores inicializado', created_at: nowIso }
  ];

  return {
    users,
    products: DEFAULT_PRODUCTS,
    customers,
    suppliers,
    purchases,
    inventory_movements,
    sales,
    branch_transfers: [],
    cash_sessions,
    cash_movements,
    quotations,
    credit_payments: [],
    expenses,
    audit_logs,
    settings: {
      company_name: 'AgroPartes Tractores S.R.L.',
      company_nit: '1028495021',
      currency: 'Bs',
      phone: '77889900',
      address: 'Av. Agrícola Km 4, Zona Talleres Maquinaria Pesada',
      tax_percentage: '13'
    }
  };
}

export function getStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.products)) {
        if (!Array.isArray(parsed.branch_transfers)) {
          parsed.branch_transfers = [];
        }
        parsed.products.forEach((p: any) => {
          if (p.min_stock === undefined || p.min_stock === null) p.min_stock = 0;
          if (!p.branch_stocks) {
            const central = Math.ceil((p.stock || 0) * 0.7);
            const norte = Math.max(0, (p.stock || 0) - central);
            p.branch_stocks = {
              'Sucursal Central': central,
              'Sucursal Norte': norte,
              'Sucursal Sur': 0,
            };
          }
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local store, resetting to default:', e);
  }
  const initial = createInitialStore();
  saveStore(initial);
  return initial;
}

export function saveStore(store: LocalStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Error saving local store:', e);
  }
}

function getCurrentUserFromToken(): User {
  try {
    const saved = localStorage.getItem('user');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { id: 1, username: 'admin', full_name: 'Administrador Sistema', role: 'Admin', role_id: 1 };
}

function logLocalAudit(store: LocalStore, user: User, action: string, entity: string, entityId: number, details: string) {
  const nextId = store.audit_logs.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  store.audit_logs.unshift({
    id: nextId,
    user_id: user.id,
    user_name: user.full_name,
    action,
    entity,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString()
  });
}

export function handleLocalAuthLogin(username: string, password: string): { token: string; user: User } {
  const store = getStore();
  const cleanUser = (username || '').trim().toLowerCase();
  const found = store.users.find(u => u.username.toLowerCase() === cleanUser);

  if (!found) {
    throw new Error('Credenciales inválidas');
  }

  const expectedPass = found.password_plain || (found.username === 'admin' ? 'admin123' : 'vendedor123');
  if (password !== expectedPass) {
    throw new Error('Credenciales inválidas');
  }

  const userObj: User = {
    id: found.id,
    username: found.username,
    full_name: found.full_name,
    role: found.role,
    role_id: found.role_id || (found.role === 'Admin' ? 1 : 2)
  };

  logLocalAudit(store, userObj, 'LOGIN', 'USER', userObj.id, 'Inicio de sesión exitoso');
  saveStore(store);

  const token = `local-jwt-${btoa(JSON.stringify({ id: userObj.id, username: userObj.username, role: userObj.role, iat: Date.now() }))}`;
  return { token, user: userObj };
}

export async function handleLocalApiRequest(url: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
  const store = getStore();
  const currentUser = getCurrentUserFromToken();
  const nowIso = new Date().toISOString();

  // Clean URL path
  const path = url.split('?')[0];

  // 1. Auth
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLocalAuthLogin(body.username, body.password);
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return { user: currentUser };
  }
  if (path === '/api/health') {
    return { status: 'ok', database: 'connected' };
  }

  // 2. Dashboard Stats
  if (path === '/api/stats' && method === 'GET') {
    const isSeller = currentUser.role !== 'Admin';
    const completedSales = store.sales.filter(s => s.status === 'COMPLETED' && (!isSeller || s.user_id === currentUser.id));
    const revenue = completedSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const activeProducts = store.products.filter(p => p.active !== 0);
    const lowStock = activeProducts.filter(p => {
      const minThreshold = p.min_stock !== undefined ? p.min_stock : 0;
      if (minThreshold === 0) {
        return p.stock < 0; // Never false-alarm when min_stock = 0
      }
      return p.stock <= minThreshold;
    }).length;

    const recentSales = [...completedSales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(s => ({
        total: s.total,
        created_at: s.created_at,
        seller: s.seller_name || currentUser.full_name
      }));

    const dayMap: Record<string, number> = {};
    completedSales.forEach(s => {
      const d = (s.created_at || nowIso).split('T')[0];
      dayMap[d] = (dayMap[d] || 0) + Number(s.total || 0);
    });
    const salesByDay = Object.entries(dayMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    // Period metrics for day, week, month, bimonth, quarter, year
    const calcPeriod = (days: number) => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const matched = completedSales.filter(s => new Date(s.created_at) >= cutoff);
      const totalRev = matched.reduce((acc, s) => acc + Number(s.total || 0), 0);
      return {
        count: matched.length,
        revenue: totalRev,
        avgTicket: matched.length > 0 ? totalRev / matched.length : 0
      };
    };

    const periodMetrics = {
      day: calcPeriod(1),
      week: calcPeriod(7),
      month: calcPeriod(30),
      bimonth: calcPeriod(60),
      quarter: calcPeriod(90),
      year: calcPeriod(365)
    };

    return {
      revenue,
      salesCount: completedSales.length,
      productsCount: activeProducts.length,
      lowStock,
      customersCount: store.customers.length,
      recentSales,
      salesByDay,
      periodMetrics
    };
  }

  // 3. Products
  if (path === '/api/products' && method === 'GET') {
    return store.products.filter(p => p.active !== 0);
  }
  if (path === '/api/products' && method === 'POST') {
    const nextId = store.products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const price = Number(body.price || 0);
    const cost_price = body.cost_price !== undefined ? Number(body.cost_price) : Number((price * 0.6).toFixed(2));
    const stockVal = Number(body.stock ?? 0);
    const minStockVal = body.min_stock !== undefined && body.min_stock !== null && body.min_stock !== ''
      ? Math.max(0, Number(body.min_stock))
      : 0;

    const newProd: Product & { active?: number } = {
      id: nextId,
      name: body.name,
      description: body.description || '',
      price,
      cost_price,
      stock: stockVal,
      min_stock: minStockVal,
      branch_stocks: body.branch_stocks || {
        'Sucursal Central': stockVal,
        'Sucursal Norte': 0,
        'Sucursal Sur': 0
      },
      category: body.category || 'MOTOR',
      brand: body.brand || 'GENERAL',
      oem_codes: body.oem_codes || '',
      supplier_name: body.supplier_name || 'GENERAL',
      unit_type: body.unit_type || 'UNIDAD',
      barcode: body.barcode || `REP-${String(nextId).padStart(4, '0')}`,
      batch_number: body.supplier_name || body.batch_number || 'GENERAL',
      expiry_date: body.expiry_date || '2030-12-31',
      is_combo: body.is_combo ? 1 : 0,
      combo_items: body.combo_items ? (typeof body.combo_items === 'string' ? body.combo_items : JSON.stringify(body.combo_items)) : undefined,
      active: 1
    };
    store.products.push(newProd);
    store.inventory_movements.unshift({
      id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
      product_id: nextId,
      product_name: newProd.name,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      type: 'IN',
      quantity: newProd.stock,
      reason: 'Stock inicial',
      created_at: nowIso
    });
    logLocalAudit(store, currentUser, 'CREATE', 'PRODUCT', nextId, `Repuesto creado: ${newProd.name}`);
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/products/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const idx = store.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const oldStock = store.products[idx].stock;
      const newStock = Number(body.stock ?? oldStock);
      const minStockVal = body.min_stock !== undefined && body.min_stock !== null && body.min_stock !== ''
        ? Math.max(0, Number(body.min_stock))
        : (store.products[idx].min_stock ?? 0);

      const existingBranches = store.products[idx].branch_stocks || {
        'Sucursal Central': oldStock,
        'Sucursal Norte': 0,
        'Sucursal Sur': 0
      };
      // If stock changed and no explicit branch_stocks provided, adjust Central branch by diff
      if (oldStock !== newStock && !body.branch_stocks) {
        existingBranches['Sucursal Central'] = Math.max(0, (existingBranches['Sucursal Central'] || 0) + (newStock - oldStock));
      }

      store.products[idx] = {
        ...store.products[idx],
        name: body.name ?? store.products[idx].name,
        description: body.description ?? store.products[idx].description,
        price: Number(body.price ?? store.products[idx].price),
        cost_price: body.cost_price !== undefined ? Number(body.cost_price) : store.products[idx].cost_price,
        stock: newStock,
        min_stock: minStockVal,
        branch_stocks: body.branch_stocks || existingBranches,
        category: body.category ?? store.products[idx].category,
        brand: body.brand ?? store.products[idx].brand,
        oem_codes: body.oem_codes ?? store.products[idx].oem_codes,
        supplier_name: body.supplier_name ?? store.products[idx].supplier_name,
        unit_type: body.unit_type ?? store.products[idx].unit_type,
        barcode: body.barcode ?? store.products[idx].barcode,
        batch_number: body.supplier_name ?? body.batch_number ?? store.products[idx].batch_number,
        expiry_date: body.expiry_date ?? store.products[idx].expiry_date,
        is_combo: body.is_combo ? 1 : 0,
        combo_items: body.combo_items ? (typeof body.combo_items === 'string' ? body.combo_items : JSON.stringify(body.combo_items)) : undefined
      };
      if (oldStock !== newStock) {
        const diff = newStock - oldStock;
        store.inventory_movements.unshift({
          id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
          product_id: id,
          product_name: store.products[idx].name,
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          type: diff > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(diff),
          reason: 'Ajuste manual',
          created_at: nowIso
        });
      }
      logLocalAudit(store, currentUser, 'UPDATE', 'PRODUCT', id, `Producto actualizado: ${store.products[idx].name}`);
      saveStore(store);
    }
    return { success: true };
  }
  if (path.startsWith('/api/products/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    const prod = store.products.find(p => p.id === id);
    if (prod) prod.active = 0;
    logLocalAudit(store, currentUser, 'DELETE', 'PRODUCT', id, `Producto desactivado ID: ${id}`);
    saveStore(store);
    return { success: true };
  }

  // 4. Customers
  if (path === '/api/customers' && method === 'GET') {
    return [...store.customers].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (path === '/api/customers' && method === 'POST') {
    const nextId = store.customers.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const newCust: Customer = {
      id: nextId,
      name: body.name,
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      points: 0,
      credit_balance: 0,
      created_at: nowIso
    };
    store.customers.push(newCust);
    logLocalAudit(store, currentUser, 'CREATE', 'CUSTOMER', nextId, `Cliente creado: ${newCust.name}`);
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/customers/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const idx = store.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      store.customers[idx] = {
        ...store.customers[idx],
        name: body.name ?? store.customers[idx].name,
        email: body.email ?? store.customers[idx].email,
        phone: body.phone ?? store.customers[idx].phone,
        address: body.address ?? store.customers[idx].address
      };
      logLocalAudit(store, currentUser, 'UPDATE', 'CUSTOMER', id, `Cliente actualizado: ${store.customers[idx].name}`);
      saveStore(store);
    }
    return { success: true };
  }

  // 5. Inventory Movements
  if (path === '/api/inventory/movements' && method === 'GET') {
    return store.inventory_movements;
  }

  // 6. Sales
  if (path === '/api/sales' && method === 'GET') {
    const isSeller = currentUser.role !== 'Admin';
    return store.sales.filter(s => !isSeller || s.user_id === currentUser.id);
  }
  if (path.startsWith('/api/sales/') && path.endsWith('/cancel') && method === 'POST') {
    const parts = path.split('/');
    const saleId = Number(parts[parts.length - 2]);
    const sale = store.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Venta no encontrada');
    if (sale.status === 'CANCELLED') throw new Error('La venta ya está anulada');

    const reason = body?.reason || 'Anulación solicitada por el usuario';
    sale.status = 'CANCELLED';
    sale.cancel_reason = reason;
    sale.cancelled_at = nowIso;
    sale.cancelled_by = currentUser.full_name;

    (sale.details || []).forEach(d => {
      const prod = store.products.find(p => p.id === d.product_id);
      if (prod) {
        prod.stock += d.quantity;
        if (!prod.branch_stocks) {
          prod.branch_stocks = {
            'Sucursal Central': prod.stock,
            'Sucursal Norte': 0
          };
        } else {
          prod.branch_stocks['Sucursal Central'] = (prod.branch_stocks['Sucursal Central'] || 0) + d.quantity;
        }
      }
      store.inventory_movements.unshift({
        id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
        product_id: d.product_id,
        product_name: d.product_name,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        type: 'IN',
        quantity: d.quantity,
        reason: `Anulación Factura #${saleId}: ${reason}`,
        created_at: nowIso
      });
    });

    if (sale.customer_id && (sale.credit_amount || 0) > 0) {
      const cust = store.customers.find(c => c.id === sale.customer_id);
      if (cust) {
        const unpaid = Math.max(0, sale.total - (sale.paid_amount || 0));
        cust.credit_balance = Math.max(0, (cust.credit_balance || 0) - unpaid);
      }
    }

    logLocalAudit(store, currentUser, 'CANCEL', 'SALE', saleId, `Venta anulada ID: ${saleId}. Motivo: ${reason}`);
    saveStore(store);
    return { success: true };
  }

  // Branch & Transfers Routes
  if (path === '/api/branches' && method === 'GET') {
    return [
      { id: 1, name: 'Sucursal Central', is_main: true },
      { id: 2, name: 'Sucursal Norte', is_main: false },
      { id: 3, name: 'Sucursal Sur', is_main: false }
    ];
  }

  if (path === '/api/branches/transfers' && method === 'GET') {
    return store.branch_transfers || [];
  }

  if (path === '/api/branches/transfer' && method === 'POST') {
    const { product_id, from_branch, to_branch, quantity, notes } = body;
    const qty = Number(quantity);
    if (!product_id) throw new Error('Debe seleccionar el producto a transferir.');
    if (!from_branch || !to_branch) throw new Error('Debe especificar sucursal origen y sucursal destino.');
    if (from_branch === to_branch) throw new Error('La sucursal de origen y la de destino deben ser diferentes.');
    if (isNaN(qty) || qty <= 0) throw new Error('La cantidad a transferir debe ser mayor a 0.');

    const prod = store.products.find(p => p.id === Number(product_id));
    if (!prod) throw new Error('Producto no encontrado en inventario.');

    if (!prod.branch_stocks) {
      prod.branch_stocks = {
        'Sucursal Central': Math.floor(prod.stock * 0.7),
        'Sucursal Norte': Math.ceil(prod.stock * 0.3)
      };
    }

    const available = Number(prod.branch_stocks[from_branch] ?? 0);
    if (available < qty) {
      throw new Error(`Stock insuficiente en ${from_branch}. Stock actual disponible: ${available} unidades.`);
    }

    prod.branch_stocks[from_branch] = available - qty;
    prod.branch_stocks[to_branch] = Number(prod.branch_stocks[to_branch] ?? 0) + qty;

    if (!Array.isArray(store.branch_transfers)) store.branch_transfers = [];
    const transferId = store.branch_transfers.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const newTransfer: BranchTransfer = {
      id: transferId,
      product_id: prod.id,
      product_name: prod.name,
      from_branch,
      to_branch,
      quantity: qty,
      notes: notes || '',
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      created_at: nowIso
    };
    store.branch_transfers.unshift(newTransfer);

    store.inventory_movements.unshift({
      id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
      product_id: prod.id,
      product_name: prod.name,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      type: 'ADJUSTMENT',
      quantity: qty,
      reason: `Traspaso entre sucursales: ${qty} un. de [${from_branch}] hacia [${to_branch}]${notes ? ` (${notes})` : ''}`,
      created_at: nowIso
    });

    logLocalAudit(store, currentUser, 'TRANSFER', 'BRANCH_TRANSFER', transferId, `Traspaso de ${qty} un. de ${prod.name} desde ${from_branch} hacia ${to_branch}`);
    saveStore(store);
    return { success: true, transfer: newTransfer, updated_stocks: prod.branch_stocks };
  }
  if (path.startsWith('/api/sales/') && method === 'GET') {
    const id = Number(path.split('/').pop());
    const sale = store.sales.find(s => s.id === id);
    if (!sale) throw new Error('Venta no encontrada');
    return sale;
  }
  if (path === '/api/sales' && method === 'POST') {
    const {
      items,
      total,
      customer_id,
      payment_method,
      cash_amount,
      qr_amount,
      credit_amount,
      paid_amount,
      discount_amount,
      points_redeemed
    } = body;

    const method = payment_method || 'CASH';
    const totalNum = Number(total || 0);
    const cashAmt = method === 'CASH' ? totalNum : (method === 'MIXED' ? Number(cash_amount || 0) : (method === 'CREDIT' ? Number(paid_amount || 0) : 0));
    const qrAmt = method === 'QR' ? totalNum : (method === 'MIXED' ? Number(qr_amount || 0) : 0);
    const credAmt = method === 'CREDIT' ? Number(credit_amount !== undefined ? credit_amount : (totalNum - Number(paid_amount || 0))) : 0;
    const paidAmt = method === 'CREDIT' ? Number(paid_amount || 0) : totalNum;

    if (method === 'CREDIT' && !customer_id) {
      throw new Error('Para ventas al crédito (Fiado) debe seleccionar un cliente registrado.');
    }

    const nextSaleId = store.sales.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const customer = store.customers.find(c => c.id === Number(customer_id));

    const saleDetails = (items || []).map((item: any, idx: number) => {
      const prod = store.products.find(p => p.id === Number(item.id || item.product_id));
      if (!prod || prod.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto: ${prod?.name || item.id}`);
      }
      prod.stock -= Number(item.quantity);
      store.inventory_movements.unshift({
        id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
        product_id: prod.id,
        product_name: prod.name,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        type: 'SALE',
        quantity: Number(item.quantity),
        reason: `Venta #${nextSaleId}`,
        created_at: nowIso
      });

      if (prod.is_combo && prod.combo_items) {
        try {
          const components = JSON.parse(prod.combo_items) as { product_id: number; quantity: number }[];
          components.forEach(comp => {
            const compProd = store.products.find(p => p.id === comp.product_id);
            const compQty = comp.quantity * Number(item.quantity);
            if (compProd && compProd.stock >= compQty) {
              compProd.stock -= compQty;
              store.inventory_movements.unshift({
                id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
                product_id: compProd.id,
                product_name: compProd.name,
                user_id: currentUser.id,
                user_name: currentUser.full_name,
                type: 'SALE',
                quantity: compQty,
                reason: `Componente Combo (${prod.name}) - Venta #${nextSaleId}`,
                created_at: nowIso
              });
            }
          });
        } catch {}
      }

      return {
        id: idx + 1,
        sale_id: nextSaleId,
        product_id: prod.id,
        product_name: prod.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        subtotal: Number(item.quantity) * Number(item.price)
      };
    });

    const newSale: Sale = {
      id: nextSaleId,
      user_id: currentUser.id,
      customer_id: customer ? customer.id : undefined,
      total: totalNum,
      status: 'COMPLETED',
      payment_method: method,
      cash_amount: cashAmt,
      qr_amount: qrAmt,
      credit_amount: credAmt,
      paid_amount: paidAmt,
      discount_amount: Number(discount_amount || 0),
      points_redeemed: Number(points_redeemed || 0),
      created_at: nowIso,
      seller_name: currentUser.full_name,
      customer_name: customer?.name,
      customer_phone: customer?.phone,
      details: saleDetails
    };

    store.sales.unshift(newSale);

    if (customer) {
      const pointsEarned = Math.floor(totalNum / 10);
      const redeemed = Number(points_redeemed || 0);
      customer.points = Math.max(0, (customer.points || 0) - redeemed + pointsEarned);
      customer.credit_balance = (customer.credit_balance || 0) + credAmt;

      if (method === 'CREDIT' && paidAmt > 0) {
        store.credit_payments.unshift({
          id: store.credit_payments.reduce((m, c) => Math.max(m, c.id), 0) + 1,
          sale_id: nextSaleId,
          customer_id: customer.id,
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          amount: paidAmt,
          payment_method: 'CASH',
          notes: 'Pago inicial en venta al crédito',
          created_at: nowIso
        });
      }
    }

    logLocalAudit(store, currentUser, 'CREATE', 'SALE', nextSaleId, `Venta realizada por total: ${totalNum} (${method})`);
    saveStore(store);
    return { id: nextSaleId };
  }

  // 7. Cash Register (Arqueo de Caja)
  if (path === '/api/cash/current' && method === 'GET') {
    const session = store.cash_sessions.find(cs => cs.status === 'OPEN');
    if (!session) return { session: null };

    const sessionMovements = store.cash_movements.filter(cm => cm.session_id === session.id);
    const sessionSales = store.sales.filter(s => s.status === 'COMPLETED' && s.created_at >= session.opened_at);

    let cash_sales = 0;
    let qr_sales = 0;
    let credit_sales = 0;

    sessionSales.forEach(s => {
      if (s.payment_method === 'CASH') cash_sales += s.total;
      else if (s.payment_method === 'QR') qr_sales += s.total;
      else if (s.payment_method === 'MIXED') {
        cash_sales += Number(s.cash_amount || 0);
        qr_sales += Number(s.qr_amount || 0);
      } else if (s.payment_method === 'CREDIT') {
        cash_sales += Number(s.paid_amount || 0);
        credit_sales += Math.max(0, s.total - Number(s.paid_amount || 0));
      }
    });

    const credit_collections = store.credit_payments
      .filter(cp => cp.created_at >= session.opened_at && cp.notes !== 'Pago inicial en venta al crédito')
      .reduce((sum, cp) => sum + cp.amount, 0);

    const expected_amount = Number(session.opening_amount || 0)
      + cash_sales
      + credit_collections
      + Number(session.extra_income || 0)
      - Number(session.extra_expense || 0);

    return {
      session: {
        ...session,
        cash_sales,
        qr_sales,
        credit_sales,
        credit_collections,
        expected_amount,
        movements: sessionMovements
      }
    };
  }
  if (path === '/api/cash/history' && method === 'GET') {
    return store.cash_sessions;
  }
  if (path === '/api/cash/open' && method === 'POST') {
    const existing = store.cash_sessions.find(cs => cs.status === 'OPEN');
    if (existing) throw new Error('Ya existe una caja abierta en curso.');
    const nextId = store.cash_sessions.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    const amt = Number(body.opening_amount || 0);
    const newSession: CashSession = {
      id: nextId,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      opening_amount: amt,
      expected_amount: amt,
      extra_income: 0,
      extra_expense: 0,
      notes: body.notes || 'Apertura de turno',
      status: 'OPEN',
      opened_at: nowIso,
      movements: []
    };
    store.cash_sessions.unshift(newSession);
    logLocalAudit(store, currentUser, 'OPEN_CASH', 'CASH_SESSION', nextId, `Caja abierta con monto inicial: ${amt}`);
    saveStore(store);
    return { id: nextId };
  }
  if (path === '/api/cash/movement' && method === 'POST') {
    const session = store.cash_sessions.find(cs => cs.status === 'OPEN');
    if (!session) throw new Error('No hay una caja abierta actualmente.');
    const amt = Number(body.amount || 0);
    const nextMoveId = store.cash_movements.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    store.cash_movements.unshift({
      id: nextMoveId,
      session_id: session.id,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      type: body.type,
      amount: amt,
      reason: body.reason || 'Movimiento de caja',
      created_at: nowIso
    });
    if (body.type === 'INCOME') session.extra_income = (session.extra_income || 0) + amt;
    else session.extra_expense = (session.extra_expense || 0) + amt;
    saveStore(store);
    return { success: true };
  }
  if (path === '/api/cash/close' && method === 'POST') {
    const session = store.cash_sessions.find(cs => cs.status === 'OPEN');
    if (!session) throw new Error('No hay una caja abierta para cerrar.');
    session.closing_amount = Number(body.closing_amount || 0);
    session.expected_amount = Number(body.expected_amount || 0);
    session.status = 'CLOSED';
    session.closed_at = nowIso;
    logLocalAudit(store, currentUser, 'CLOSE_CASH', 'CASH_SESSION', session.id, `Cierre de caja. Esperado: ${session.expected_amount}, Real: ${session.closing_amount}`);
    saveStore(store);
    return { success: true };
  }

  // 8. Quotations (Proformas)
  if (path === '/api/quotations' && method === 'GET') {
    return store.quotations;
  }
  if (path === '/api/quotations' && method === 'POST') {
    const nextId = store.quotations.reduce((m, q) => Math.max(m, q.id), 0) + 1;
    const cust = store.customers.find(c => c.id === Number(body.customer_id));
    const details = (body.items || []).map((item: any, idx: number) => {
      const prod = store.products.find(p => p.id === Number(item.id));
      return {
        id: idx + 1,
        sale_id: nextId,
        product_id: Number(item.id),
        product_name: prod?.name || 'Producto',
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        subtotal: Number(item.quantity) * Number(item.price)
      };
    });
    const newQ: Quotation = {
      id: nextId,
      user_id: currentUser.id,
      customer_id: cust?.id,
      seller_name: currentUser.full_name,
      customer_name: cust?.name,
      customer_phone: cust?.phone,
      total: Number(body.total || 0),
      valid_until: body.valid_until || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: body.notes || 'Cotización válida por 7 días',
      status: 'PENDING',
      created_at: nowIso,
      details
    };
    store.quotations.unshift(newQ);
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/quotations/') && path.endsWith('/convert') && method === 'POST') {
    const parts = path.split('/');
    const qId = Number(parts[parts.length - 2]);
    const found = store.quotations.find(q => q.id === qId);
    if (found) found.status = 'CONVERTED';
    saveStore(store);
    return { success: true };
  }

  // 9. Credits / Accounts Receivable
  if (path === '/api/credits' && method === 'GET') {
    const creditSales = store.sales.filter(s => s.payment_method === 'CREDIT' && s.status === 'COMPLETED');
    return creditSales.map(s => ({
      ...s,
      payments: store.credit_payments.filter(cp => cp.sale_id === s.id),
      balance_due: Math.max(0, Number((s.total - (s.paid_amount || 0)).toFixed(2)))
    }));
  }
  if (path === '/api/credits/pay' && method === 'POST') {
    const sale = store.sales.find(s => s.id === Number(body.sale_id));
    if (!sale) throw new Error('Venta al crédito no encontrada');
    const payAmt = Number(body.amount || 0);
    sale.paid_amount = Number(sale.paid_amount || 0) + payAmt;
    sale.credit_amount = Math.max(0, sale.total - sale.paid_amount);

    if (sale.customer_id) {
      const cust = store.customers.find(c => c.id === sale.customer_id);
      if (cust) {
        cust.credit_balance = Math.max(0, Number(((cust.credit_balance || 0) - payAmt).toFixed(2)));
      }
      store.credit_payments.unshift({
        id: store.credit_payments.reduce((m, c) => Math.max(m, c.id), 0) + 1,
        sale_id: sale.id,
        customer_id: sale.customer_id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        amount: payAmt,
        payment_method: body.payment_method || 'CASH',
        notes: body.notes || 'Abono de cuenta por cobrar',
        created_at: nowIso
      });
    }
    saveStore(store);
    return { success: true };
  }

  // 10. Expenses & Financial Summary
  if (path === '/api/expenses' && method === 'GET') {
    return store.expenses;
  }
  if (path === '/api/expenses' && method === 'POST') {
    const nextId = store.expenses.reduce((m, e) => Math.max(m, e.id), 0) + 1;
    const newExp: Expense = {
      id: nextId,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      category: body.category || 'Operativo',
      description: body.description,
      amount: Number(body.amount || 0),
      expense_date: body.expense_date || nowIso.split('T')[0],
      payment_method: body.payment_method || 'CASH',
      created_at: nowIso
    };
    store.expenses.unshift(newExp);
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/expenses/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    store.expenses = store.expenses.filter(e => e.id !== id);
    saveStore(store);
    return { success: true };
  }
  if (path === '/api/finance/summary' && method === 'GET') {
    const completedSales = store.sales.filter(s => s.status === 'COMPLETED');
    const revenue = completedSales.reduce((sum, s) => sum + s.total, 0);
    const totalExpenses = store.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPurchases = store.purchases.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.total, 0);
    const pendingCredits = completedSales
      .filter(s => s.payment_method === 'CREDIT')
      .reduce((sum, s) => sum + Math.max(0, s.total - (s.paid_amount || 0)), 0);

    const productProfitability = store.products
      .filter(p => p.active !== 0)
      .map(p => {
        const cost_price = p.cost_price || Number((p.price * 0.6).toFixed(2));
        let units_sold = 0;
        let prodRev = 0;
        completedSales.forEach(s => {
          (s.details || []).forEach(d => {
            if (d.product_id === p.id) {
              units_sold += d.quantity;
              prodRev += d.subtotal;
            }
          });
        });
        const total_cost = Number((units_sold * cost_price).toFixed(2));
        const profit = Number((prodRev - total_cost).toFixed(2));
        const margin_percent = p.price > 0 ? Number((((p.price - cost_price) / p.price) * 100).toFixed(1)) : 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          cost_price,
          stock: p.stock,
          units_sold,
          revenue: prodRev,
          total_cost,
          profit,
          margin_percent
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const cogs = Number(productProfitability.reduce((sum, p) => sum + p.total_cost, 0).toFixed(2));
    const grossProfit = Number((revenue - cogs).toFixed(2));
    const netProfit = Number((grossProfit - totalExpenses).toFixed(2));

    const sellerRanking = store.users.map(u => {
      const userSales = completedSales.filter(s => s.user_id === u.id);
      const total_revenue = userSales.reduce((sum, s) => sum + s.total, 0);
      return {
        id: u.id,
        full_name: u.full_name,
        role: u.role,
        sales_count: userSales.length,
        total_revenue,
        commission: Number((total_revenue * 0.05).toFixed(2))
      };
    }).sort((a, b) => b.total_revenue - a.total_revenue);

    const catMap: Record<string, number> = {};
    store.expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const expensesByCategory = Object.entries(catMap).map(([category, total]) => ({ category, total }));

    return {
      revenue,
      salesCount: completedSales.length,
      cogs,
      grossProfit,
      totalExpenses,
      totalPurchases,
      netProfit,
      pendingCredits,
      productProfitability,
      sellerRanking,
      expensesByCategory
    };
  }

  // 11. Purchases & Suppliers
  if (path === '/api/purchases' && method === 'GET') {
    return store.purchases;
  }
  if (path === '/api/purchases' && method === 'POST') {
    const nextId = store.purchases.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const sup = store.suppliers.find(s => s.id === Number(body.supplier_id));
    const newP: Purchase = {
      id: nextId,
      number: body.number || `CMP-${nextId}`,
      supplier_id: Number(body.supplier_id),
      supplier_name: sup?.name || 'Proveedor General',
      warehouse: body.warehouse || 'Almacén Principal S1',
      total: Number(body.total || 0),
      status: 'COMPLETED',
      purchase_date: body.purchase_date || nowIso.split('T')[0],
      observations: body.observations || '',
      created_at: nowIso
    };
    store.purchases.unshift(newP);
    (body.details || []).forEach((item: any) => {
      const prod = store.products.find(p => p.id === Number(item.product_id));
      if (prod) {
        prod.stock += Number(item.quantity || 0);
        store.inventory_movements.unshift({
          id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
          product_id: prod.id,
          product_name: prod.name,
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          type: 'IN',
          quantity: Number(item.quantity || 0),
          reason: `Compra #${nextId}`,
          created_at: nowIso
        });
      }
    });
    saveStore(store);
    return { id: nextId };
  }
  if (path === '/api/suppliers' && method === 'GET') {
    return store.suppliers;
  }

  // 12. Users
  if (path === '/api/users' && method === 'GET') {
    return store.users.map(({ password_plain, ...u }) => u);
  }
  if (path === '/api/users' && method === 'POST') {
    const nextId = store.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const roleName = Number(body.role_id) === 1 ? 'Admin' : 'Vendedor';
    store.users.push({
      id: nextId,
      username: body.username,
      full_name: body.full_name,
      role: roleName,
      role_id: Number(body.role_id || 2),
      password_plain: body.password || '123456'
    });
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/users/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const idx = store.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const roleName = Number(body.role_id) === 1 ? 'Admin' : 'Vendedor';
      store.users[idx] = {
        ...store.users[idx],
        username: body.username ?? store.users[idx].username,
        full_name: body.full_name ?? store.users[idx].full_name,
        role: roleName,
        role_id: Number(body.role_id ?? store.users[idx].role_id),
        password_plain: body.password && body.password.trim() !== '' ? body.password : store.users[idx].password_plain
      };
      saveStore(store);
    }
    return { success: true };
  }
  if (path.startsWith('/api/users/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    store.users = store.users.filter(u => u.id !== id);
    saveStore(store);
    return { success: true };
  }

  // 13. Settings & Audit & AI Context
  if (path === '/api/settings' && method === 'GET') {
    return store.settings;
  }
  if (path === '/api/settings' && method === 'POST') {
    if (body.key) {
      if (body.value === null) delete store.settings[body.key];
      else store.settings[body.key] = String(body.value);
      saveStore(store);
    }
    return { success: true };
  }
  if (path === '/api/audit' && method === 'GET') {
    return store.audit_logs;
  }
  if (path === '/api/ai/context' && method === 'GET') {
    const completedSales = store.sales.filter(s => s.status === 'COMPLETED');
    return {
      products: store.products.filter(p => p.active !== 0),
      users: store.users.map(u => ({ username: u.username, full_name: u.full_name, role: u.role })),
      salesSummary: [],
      detailedSales: completedSales.map(s => ({
        id: s.id,
        seller: s.seller_name || 'Administrador',
        customer: s.customer_name || 'Consumidor Final',
        total: s.total,
        created_at: s.created_at,
        status: s.status
      })),
      totalStats: {
        count: completedSales.length,
        revenue: completedSales.reduce((sum, s) => sum + s.total, 0)
      },
      systemInfo: {
        currency: 'Boliviano (Bs)',
        backupMethod: 'Almacenamiento Híbrido Sincronizado',
        lastUpdate: nowIso
      }
    };
  }

  if (path === '/api/backup/download') {
    return store;
  }

  return {};
}

export function isStaticHostEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  // Known static/serverless frontend hosts where Express + SQLite server.ts is not running
  if (
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.surge.sh') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app')
  ) {
    return true;
  }
  return sessionStorage.getItem('softplus_static_mode') === 'true';
}

let interceptorInstalled = false;

export function installLocalApiInterceptor() {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  if (typeof window.fetch !== 'function') return;

  const originalFetch = window.fetch.bind(window);

  const createJsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const executeLocalAsResponse = async (url: string, init?: RequestInit): Promise<Response> => {
    try {
      const result = await handleLocalApiRequest(url, init);
      return createJsonResponse(result, 200);
    } catch (err: any) {
      const msg = err?.message || 'Error en la operación';
      const status = msg === 'Credenciales inválidas' ? 401 : 400;
      return createJsonResponse({ error: msg }, status);
    }
  };

  const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.pathname + input.search
        : input.url;

    // Extract relative /api/* path if same-origin
    let apiPath: string | null = null;
    if (rawUrl.startsWith('/api/')) {
      apiPath = rawUrl;
    } else if (rawUrl.startsWith(window.location.origin + '/api/')) {
      apiPath = rawUrl.slice(window.location.origin.length);
    }

    if (!apiPath) {
      return originalFetch(input, init);
    }

    // If on Vercel or known static host, handle locally immediately without triggering 404 network errors
    if (isStaticHostEnvironment() || !navigator.onLine) {
      return executeLocalAsResponse(apiPath, init);
    }

    try {
      const res = await originalFetch(input, init);
      const contentType = res.headers.get('content-type') || '';

      // If the host returned 404, 405, 502, 503, 504 or HTML/plain-text instead of JSON, switch to local engine
      if (
        res.status === 404 ||
        res.status === 405 ||
        res.status >= 502 ||
        !contentType.includes('application/json')
      ) {
        sessionStorage.setItem('softplus_static_mode', 'true');
        return executeLocalAsResponse(apiPath, init);
      }

      return res;
    } catch {
      sessionStorage.setItem('softplus_static_mode', 'true');
      return executeLocalAsResponse(apiPath, init);
    }
  };

  try {
    const ownDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (ownDesc && !ownDesc.configurable) {
      return;
    }
    Object.defineProperty(window, 'fetch', {
      value: patchedFetch,
      writable: true,
      configurable: true,
    });
  } catch {
    // Some locked-down environments define window.fetch as a non-configurable getter;
    // useApi, LoginPage, and AuthContext already handle static fallback directly.
  }
}

