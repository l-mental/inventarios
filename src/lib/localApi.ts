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
} from '../types';

const STORAGE_KEY = 'softplus_cloud_store_v2';

export interface LocalStore {
  users: (User & { password_plain?: string })[];
  products: (Product & { active?: number })[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  inventory_movements: InventoryMovement[];
  sales: Sale[];
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

const DEFAULT_PRODUCTS: (Product & { active?: number })[] = [
  { id: 1, name: 'Paracetamol 500mg (Caja x20)', description: 'Analgésico y antipirético para el alivio del dolor y la fiebre', price: 12.50, cost_price: 7.75, stock: 85, category: 'Farmacia', barcode: '777010000001', batch_number: 'LOT-26A100', expiry_date: '2026-10-25', is_combo: 0, active: 1 },
  { id: 2, name: 'Ibuprofeno 400mg (Caja x10)', description: 'Antiinflamatorio no esteroideo para dolores musculares', price: 15.00, cost_price: 9.30, stock: 60, category: 'Farmacia', barcode: '777010000002', batch_number: 'LOT-26B101', expiry_date: '2026-11-15', is_combo: 0, active: 1 },
  { id: 3, name: 'Amoxicilina 500mg (Caja x12)', description: 'Antibiótico de amplio espectro bacteriano', price: 28.00, cost_price: 17.36, stock: 42, category: 'Farmacia', barcode: '777010000003', batch_number: 'LOT-26C102', expiry_date: '2027-03-20', is_combo: 0, active: 1 },
  { id: 4, name: 'Alcohol en Gel 500ml', description: 'Desinfectante antibacteriano con glicerina hidratante', price: 18.00, cost_price: 11.16, stock: 95, category: 'Higiene', barcode: '777010000004', batch_number: 'LOT-26D103', expiry_date: '2027-06-30', is_combo: 0, active: 1 },
  { id: 5, name: 'Mascarillas Quirúrgicas (Caja x50)', description: 'Protección respiratoria de triple capa termosellada', price: 25.00, cost_price: 15.50, stock: 110, category: 'Protección', barcode: '777010000005', batch_number: 'LOT-26E104', expiry_date: '2027-09-15', is_combo: 0, active: 1 },
  { id: 6, name: 'Suero Oral Rehidratante (Sobre)', description: 'Electrolitos para prevención de la deshidratación', price: 6.50, cost_price: 4.03, stock: 150, category: 'Farmacia', barcode: '777010000006', batch_number: 'LOT-26F105', expiry_date: '2026-11-02', is_combo: 0, active: 1 },
  { id: 7, name: 'Gasas Estériles (Pack x10)', description: 'Material de curación y apósito estéril para heridas', price: 8.00, cost_price: 4.96, stock: 75, category: 'Material Médico', barcode: '777010000007', batch_number: 'LOT-26A106', expiry_date: '2027-12-31', is_combo: 0, active: 1 },
  { id: 8, name: 'Termómetro Digital Infrarrojo', description: 'Medición rápida de temperatura corporal sin contacto', price: 85.00, cost_price: 52.70, stock: 18, category: 'Equipos', barcode: '777010000008', batch_number: 'LOT-26B107', expiry_date: '2028-05-10', is_combo: 0, active: 1 },
  { id: 9, name: 'Vitamina C 1000mg Efervescente', description: 'Refuerzo inmunológico en tabletas efervescentes x10', price: 22.00, cost_price: 13.64, stock: 64, category: 'Suplementos', barcode: '777010000009', batch_number: 'LOT-26C108', expiry_date: '2026-10-25', is_combo: 0, active: 1 },
  { id: 10, name: 'Jarabe para la Tos Infantil 120ml', description: 'Alivio eficaz de la tos seca y productiva para niños', price: 32.50, cost_price: 20.15, stock: 30, category: 'Farmacia', barcode: '777010000010', batch_number: 'LOT-26D109', expiry_date: '2026-11-15', is_combo: 0, active: 1 },
  { id: 11, name: 'Protector Solar FPS 50+ 200ml', description: 'Alta protección dermatológica contra rayos UVA y UVB', price: 65.00, cost_price: 40.30, stock: 24, category: 'Cuidado Personal', barcode: '777010000011', batch_number: 'LOT-26E110', expiry_date: '2027-03-20', is_combo: 0, active: 1 },
  { id: 12, name: 'Algodón Hidrófilo 200g', description: 'Puro algodón blanco absorbente para uso médico y cosmético', price: 11.00, cost_price: 6.82, stock: 80, category: 'Higiene', barcode: '777010000012', batch_number: 'LOT-26F111', expiry_date: '2027-06-30', is_combo: 0, active: 1 },
  { id: 13, name: 'Tiras Reactivas Glucosa (x50)', description: 'Tiras para glucómetro de monitoreo de glucosa en sangre', price: 95.00, cost_price: 58.90, stock: 15, category: 'Diagnóstico', barcode: '777010000013', batch_number: 'LOT-26A112', expiry_date: '2027-09-15', is_combo: 0, active: 1 },
  { id: 14, name: 'Tensiómetro Digital de Brazo', description: 'Medidor de presión arterial automático con pantalla LCD', price: 140.00, cost_price: 86.80, stock: 12, category: 'Equipos', barcode: '777010000014', batch_number: 'LOT-26B113', expiry_date: '2026-11-02', is_combo: 0, active: 1 },
  { id: 15, name: 'Crema Cicatrizante Antibacteriana', description: 'Pomada antiséptica para heridas leves y quemaduras', price: 24.00, cost_price: 14.88, stock: 45, category: 'Dermatología', barcode: '777010000015', batch_number: 'LOT-26C114', expiry_date: '2027-12-31', is_combo: 0, active: 1 },
  {
    id: 16,
    name: 'Pack Botiquín Familiar Bioseguridad',
    description: 'Combo promocional: Paracetamol + Alcohol en Gel + Mascarillas Quirúrgicas',
    price: 48.00,
    cost_price: 29.50,
    stock: 25,
    category: 'Promociones',
    barcode: '777999000111',
    batch_number: 'PACK-2026-01',
    expiry_date: '2027-08-30',
    is_combo: 1,
    combo_items: JSON.stringify([
      { product_id: 1, quantity: 1 },
      { product_id: 4, quantity: 1 },
      { product_id: 5, quantity: 1 }
    ]),
    active: 1
  }
];

function createInitialStore(): LocalStore {
  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];

  const users: (User & { password_plain?: string })[] = [
    { id: 1, username: 'admin', full_name: 'Administrador Sistema', role: 'Admin', role_id: 1, password_plain: 'admin123' },
    { id: 2, username: 'vendedor', full_name: 'Carlos Vendedor', role: 'Vendedor', role_id: 2, password_plain: 'vendedor123' }
  ];

  const customers: Customer[] = [
    { id: 1, name: 'Juan Pérez Morales', email: 'juan.perez@gmail.com', phone: '78945612', address: 'Av. 6 de Agosto #340', points: 120, credit_balance: 0, created_at: nowIso },
    { id: 2, name: 'María Elena Quispe', email: 'maria.quispe@hotmail.com', phone: '71239845', address: 'Calle Murillo #120', points: 85, credit_balance: 0, created_at: nowIso },
    { id: 3, name: 'Carlos Mendoza Ruiz', email: 'carlos.mendoza@yahoo.com', phone: '68521479', address: 'Zona Miraflores #55', points: 40, credit_balance: 0, created_at: nowIso },
    { id: 4, name: 'Ana Lucía Fernández', email: 'ana.fernandez@gmail.com', phone: '74125896', address: 'Av. Arce Edif. Illimani #402', points: 210, credit_balance: 0, created_at: nowIso },
    { id: 5, name: 'Clínica Santa María', email: 'compras@santamaria.org', phone: '22445566', address: 'Calle México #780', points: 350, credit_balance: 0, created_at: nowIso }
  ];

  const suppliers: Supplier[] = [
    { id: 1, name: 'Distribuidora FarmaPlus', phone: '77771234', email: 'ventas@farmaplus.bo', address: 'Av. Las Américas #102' },
    { id: 2, name: 'Laboratorios B4', phone: '76543210', email: 'contacto@laboratoriosb4.com', address: 'Calle Industrial #55' },
    { id: 3, name: 'LUBRAX & Salud', phone: '74504589', email: 'ventas@lubraxsalud.com', address: 'Zona Central #890' }
  ];

  const inventory_movements: InventoryMovement[] = DEFAULT_PRODUCTS.map((p, idx) => ({
    id: idx + 1,
    product_id: p.id,
    product_name: p.name,
    user_id: 1,
    user_name: 'Administrador Sistema',
    type: 'IN',
    quantity: p.stock,
    reason: 'Carga inicial de inventario',
    created_at: nowIso
  }));

  const sales: Sale[] = [
    {
      id: 1,
      user_id: 1,
      customer_id: 1,
      total: 40.00,
      status: 'COMPLETED',
      payment_method: 'CASH',
      cash_amount: 40.00,
      qr_amount: 0,
      credit_amount: 0,
      paid_amount: 40.00,
      discount_amount: 0,
      points_redeemed: 0,
      created_at: nowIso,
      seller_name: 'Administrador Sistema',
      customer_name: 'Juan Pérez Morales',
      customer_phone: '78945612',
      details: [
        { id: 1, sale_id: 1, product_id: 1, product_name: 'Paracetamol 500mg (Caja x20)', quantity: 2, unit_price: 12.50, subtotal: 25.00 },
        { id: 2, sale_id: 1, product_id: 2, product_name: 'Ibuprofeno 400mg (Caja x10)', quantity: 1, unit_price: 15.00, subtotal: 15.00 }
      ]
    }
  ];

  const cash_movements: CashMovement[] = [
    { id: 1, session_id: 1, user_id: 1, user_name: 'Administrador Sistema', type: 'INCOME', amount: 50.00, reason: 'Ingreso de sencillo para cambio', created_at: nowIso },
    { id: 2, session_id: 1, user_id: 1, user_name: 'Administrador Sistema', type: 'EXPENSE', amount: 25.00, reason: 'Compra de rollos térmicos para impresora', created_at: nowIso }
  ];

  const cash_sessions: CashSession[] = [
    {
      id: 1,
      user_id: 1,
      user_name: 'Administrador Sistema',
      opening_amount: 500.00,
      expected_amount: 565.00,
      extra_income: 50.00,
      extra_expense: 25.00,
      notes: 'Apertura de turno principal',
      status: 'OPEN',
      opened_at: nowIso,
      movements: cash_movements
    }
  ];

  const quotations: Quotation[] = [
    {
      id: 1,
      user_id: 1,
      customer_id: 1,
      seller_name: 'Administrador Sistema',
      customer_name: 'Juan Pérez Morales',
      customer_phone: '78945612',
      total: 107.50,
      valid_until: '2026-10-30',
      notes: 'Cotización corporativa sujeta a disponibilidad',
      status: 'PENDING',
      created_at: nowIso,
      details: [
        { id: 1, sale_id: 1, product_id: 1, product_name: 'Paracetamol 500mg (Caja x20)', quantity: 5, unit_price: 12.50, subtotal: 62.50 },
        { id: 2, sale_id: 1, product_id: 2, product_name: 'Ibuprofeno 400mg (Caja x10)', quantity: 3, unit_price: 15.00, subtotal: 45.00 }
      ]
    }
  ];

  const expenses: Expense[] = [
    { id: 1, user_id: 1, user_name: 'Administrador Sistema', category: 'Alquiler', description: 'Pago mensual de alquiler de local comercial', amount: 1800.00, expense_date: today, payment_method: 'QR', created_at: nowIso },
    { id: 2, user_id: 1, user_name: 'Administrador Sistema', category: 'Servicios Básicos', description: 'Factura de energía eléctrica y agua potable', amount: 320.50, expense_date: today, payment_method: 'CASH', created_at: nowIso },
    { id: 3, user_id: 1, user_name: 'Administrador Sistema', category: 'Internet y Sistemas', description: 'Servicio fibra óptica empresarial 300 Mbps', amount: 210.00, expense_date: today, payment_method: 'QR', created_at: nowIso },
    { id: 4, user_id: 1, user_name: 'Administrador Sistema', category: 'Logística y Transporte', description: 'Transporte de mercadería e insumos de almacén', amount: 145.00, expense_date: today, payment_method: 'CASH', created_at: nowIso }
  ];

  const purchases: Purchase[] = [
    { id: 1, number: 'FAC-00102', supplier_id: 1, supplier_name: 'Distribuidora FarmaPlus', warehouse: 'Almacén Principal S1', total: 480, status: 'COMPLETED', created_at: nowIso, purchase_date: today },
    { id: 2, number: 'FAC-00105', supplier_id: 2, supplier_name: 'Laboratorios B4', warehouse: 'Almacén Principal S1', total: 1250, status: 'COMPLETED', created_at: nowIso, purchase_date: today }
  ];

  const audit_logs: AuditLog[] = [
    { id: 1, user_id: 1, user_name: 'Administrador Sistema', action: 'LOGIN', entity: 'USER', entity_id: 1, details: 'Sistema inicializado correctamente', created_at: nowIso }
  ];

  return {
    users,
    products: DEFAULT_PRODUCTS,
    customers,
    suppliers,
    purchases,
    inventory_movements,
    sales,
    cash_sessions,
    cash_movements,
    quotations,
    credit_payments: [],
    expenses,
    audit_logs,
    settings: {
      company_name: 'Softplus',
      company_nit: '1023456789',
      currency: 'Bs',
      phone: '77889900',
      address: 'Av. Principal #450, Edificio Comercial Softplus',
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
    const lowStock = activeProducts.filter(p => p.stock < 10).length;

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

    return {
      revenue,
      salesCount: completedSales.length,
      productsCount: activeProducts.length,
      lowStock,
      customersCount: store.customers.length,
      recentSales,
      salesByDay
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
    const newProd: Product & { active?: number } = {
      id: nextId,
      name: body.name,
      description: body.description || '',
      price,
      cost_price,
      stock: Number(body.stock || 0),
      category: body.category || 'Otros',
      barcode: body.barcode || `777010${String(nextId).padStart(6, '0')}`,
      batch_number: body.batch_number || 'LOT-26-NEW',
      expiry_date: body.expiry_date || '2027-12-31',
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
    logLocalAudit(store, currentUser, 'CREATE', 'PRODUCT', nextId, `Producto creado: ${newProd.name}`);
    saveStore(store);
    return { id: nextId };
  }
  if (path.startsWith('/api/products/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const idx = store.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const oldStock = store.products[idx].stock;
      const newStock = Number(body.stock ?? oldStock);
      store.products[idx] = {
        ...store.products[idx],
        name: body.name ?? store.products[idx].name,
        description: body.description ?? store.products[idx].description,
        price: Number(body.price ?? store.products[idx].price),
        cost_price: body.cost_price !== undefined ? Number(body.cost_price) : store.products[idx].cost_price,
        stock: newStock,
        category: body.category ?? store.products[idx].category,
        barcode: body.barcode ?? store.products[idx].barcode,
        batch_number: body.batch_number ?? store.products[idx].batch_number,
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

    sale.status = 'CANCELLED';
    (sale.details || []).forEach(d => {
      const prod = store.products.find(p => p.id === d.product_id);
      if (prod) prod.stock += d.quantity;
      store.inventory_movements.unshift({
        id: store.inventory_movements.reduce((m, i) => Math.max(m, i.id), 0) + 1,
        product_id: d.product_id,
        product_name: d.product_name,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        type: 'IN',
        quantity: d.quantity,
        reason: `Anulación Venta #${saleId}`,
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

    logLocalAudit(store, currentUser, 'CANCEL', 'SALE', saleId, `Venta anulada ID: ${saleId}`);
    saveStore(store);
    return { success: true };
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

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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
}

