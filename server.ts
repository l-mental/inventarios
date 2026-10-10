import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(process.cwd(), 'sales_system.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Get or Initialize JWT Secret
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  try {
    // Ensure table exists before querying
    db.exec('CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)');
    
    const storedSecret = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('jwt_secret') as any;
    if (storedSecret) {
      JWT_SECRET = storedSecret.value;
    } else {
      JWT_SECRET = bcrypt.genSaltSync(10);
      db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run('jwt_secret', JWT_SECRET);
    }
  } catch (e) {
    console.error('Error initializing persistent JWT_SECRET:', e);
    JWT_SECRET = 'temporary-fallback-secret-123';
  }
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    category TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'IN', 'OUT', 'SALE', 'ADJUSTMENT'
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_id INTEGER,
    total REAL NOT NULL,
    status TEXT DEFAULT 'COMPLETED', -- 'COMPLETED', 'CANCELLED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sale_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    supplier_id INTEGER NOT NULL,
    warehouse TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'COMPLETED', -- 'COMPLETED', 'PENDING', 'CANCELLED'
    purchase_date TEXT NOT NULL,
    observations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Add fields to sales, products, customers if not exists
try { db.exec("ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'CASH'"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN with_invoice INTEGER DEFAULT 1"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN cash_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN qr_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN credit_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN paid_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN points_redeemed INTEGER DEFAULT 0"); } catch (e) {}

try { db.exec("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN barcode TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN batch_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN expiry_date TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN is_combo INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN combo_items TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE customers ADD COLUMN points INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE customers ADD COLUMN credit_balance REAL DEFAULT 0"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    opening_amount REAL NOT NULL DEFAULT 0,
    closing_amount REAL,
    expected_amount REAL,
    extra_income REAL DEFAULT 0,
    extra_expense REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'INCOME', 'EXPENSE'
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES cash_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_id INTEGER,
    total REAL NOT NULL,
    valid_until TEXT,
    notes TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'CONVERTED', 'CANCELLED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS quotation_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS credit_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'CASH',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'CASH',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Roles, Users, Products, Customers, and Demo Data if not exists
const seed = () => {
  const roles = ['Admin', 'Vendedor'];
  roles.forEach(roleName => {
    const exists = db.prepare('SELECT id FROM roles WHERE name = ?').get(roleName);
    if (!exists) {
      console.log(`Seeding role: ${roleName}`);
      db.prepare('INSERT INTO roles (name) VALUES (?)').run(roleName);
    }
  });

  const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Admin') as { id: number };
  const vendedorRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Vendedor') as { id: number };

  const adminExists = db.prepare('SELECT count(*) as count FROM users WHERE username = ?').get('admin') as { count: number };
  if (adminExists.count === 0) {
    console.log('Seeding admin user');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?, ?, ?, ?)')
      .run('admin', hashedPassword, 'Administrador Sistema', adminRole.id);
  }

  const vendedorExists = db.prepare('SELECT count(*) as count FROM users WHERE username = ?').get('vendedor') as { count: number };
  if (vendedorExists.count === 0) {
    console.log('Seeding vendedor user');
    const hashedPassword = bcrypt.hashSync('vendedor123', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?, ?, ?, ?)')
      .run('vendedor', hashedPassword, 'Carlos Vendedor', vendedorRole.id);
  }

  // Seed Suppliers
  const suppliersCount = db.prepare('SELECT count(*) as count FROM suppliers').get() as { count: number };
  if (suppliersCount.count === 0) {
    console.log('Seeding suppliers');
    const sellers = [
      ['Distribuidora FarmaPlus', '77771234', 'ventas@farmaplus.bo', 'Av. Las Américas #102'],
      ['Laboratorios B4', '76543210', 'contacto@laboratoriosb4.com', 'Calle Industrial #55'],
      ['LUBRAX & Salud', '74504589', 'ventas@lubraxsalud.com', 'Zona Central #890']
    ];
    sellers.forEach(([name, phone, email, address]) => {
      db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)').run(name, phone, email, address);
    });
  }

  // Seed 15 Products
  const productsCount = db.prepare('SELECT count(*) as count FROM products WHERE active = 1').get() as { count: number };
  if (productsCount.count === 0) {
    console.log('Seeding 15 products');
    const defaultProducts = [
      ['Paracetamol 500mg (Caja x20)', 'Analgésico y antipirético para el alivio del dolor y la fiebre', 12.50, 85, 'Farmacia'],
      ['Ibuprofeno 400mg (Caja x10)', 'Antiinflamatorio no esteroideo para dolores musculares', 15.00, 60, 'Farmacia'],
      ['Amoxicilina 500mg (Caja x12)', 'Antibiótico de amplio espectro bacteriano', 28.00, 42, 'Farmacia'],
      ['Alcohol en Gel 500ml', 'Desinfectante antibacteriano con glicerina hidratante', 18.00, 95, 'Higiene'],
      ['Mascarillas Quirúrgicas (Caja x50)', 'Protección respiratoria de triple capa termosellada', 25.00, 110, 'Protección'],
      ['Suero Oral Rehidratante (Sobre)', 'Electrolitos para prevención de la deshidratación', 6.50, 150, 'Farmacia'],
      ['Gasas Estériles (Pack x10)', 'Material de curación y apósito estéril para heridas', 8.00, 75, 'Material Médico'],
      ['Termómetro Digital Infrarrojo', 'Medición rápida de temperatura corporal sin contacto', 85.00, 18, 'Equipos'],
      ['Vitamina C 1000mg Efervescente', 'Refuerzo inmunológico en tabletas efervescentes x10', 22.00, 64, 'Suplementos'],
      ['Jarabe para la Tos Infantil 120ml', 'Alivio eficaz de la tos seca y productiva para niños', 32.50, 30, 'Farmacia'],
      ['Protector Solar FPS 50+ 200ml', 'Alta protección dermatológica contra rayos UVA y UVB', 65.00, 24, 'Cuidado Personal'],
      ['Algodón Hidrófilo 200g', 'Puro algodón blanco absorbente para uso médico y cosmético', 11.00, 80, 'Higiene'],
      ['Tiras Reactivas Glucosa (x50)', 'Tiras para glucómetro de monitoreo de glucosa en sangre', 95.00, 15, 'Diagnóstico'],
      ['Tensiómetro Digital de Brazo', 'Medidor de presión arterial automático con pantalla LCD', 140.00, 12, 'Equipos'],
      ['Crema Cicatrizante Antibacteriana', 'Pomada antiséptica para heridas leves y quemaduras', 24.00, 45, 'Dermatología']
    ];

    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
    const insertProduct = db.prepare('INSERT INTO products (name, description, price, stock, category, active) VALUES (?, ?, ?, ?, ?, 1)');
    const insertMovement = db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)');

    defaultProducts.forEach(([name, desc, price, stock, category]) => {
      const res = insertProduct.run(name, desc, price, stock, category);
      insertMovement.run(res.lastInsertRowid, adminUser.id, 'IN', stock, 'Carga inicial de inventario');
    });
  }

  // Seed Customers
  const customersCount = db.prepare('SELECT count(*) as count FROM customers').get() as { count: number };
  if (customersCount.count === 0) {
    console.log('Seeding customers');
    const defaultCustomers = [
      ['Juan Pérez Morales', 'juan.perez@gmail.com', '78945612', 'Av. 6 de Agosto #340'],
      ['María Elena Quispe', 'maria.quispe@hotmail.com', '71239845', 'Calle Murillo #120'],
      ['Carlos Mendoza Ruiz', 'carlos.mendoza@yahoo.com', '68521479', 'Zona Miraflores #55'],
      ['Ana Lucía Fernández', 'ana.fernandez@gmail.com', '74125896', 'Av. Arce Edif. Illimani #402'],
      ['Clínica Santa María', 'compras@santamaria.org', '22445566', 'Calle México #780']
    ];
    const insertCustomer = db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)');
    defaultCustomers.forEach(([name, email, phone, address]) => {
      insertCustomer.run(name, email, phone, address);
    });
  }

  // Seed System Settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM system_settings').get() as { count: number };
  if (settingsCount.count <= 1) { // only jwt_secret or empty
    console.log('Seeding system settings');
    const defaultSettings = [
      ['company_name', 'Softplus'],
      ['company_nit', '1023456789'],
      ['currency', 'Bs'],
      ['phone', '77889900'],
      ['address', 'Av. Principal #450, Edificio Comercial Softplus'],
      ['tax_percentage', '13']
    ];
    const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(([key, value]) => {
      insertSetting.run(key, value);
    });
  }

    // Seed Initial Sales if empty
    const salesCount = db.prepare('SELECT count(*) as count FROM sales').get() as { count: number };
    if (salesCount.count === 0) {
      console.log('Seeding demo sales');
      const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
      const firstCustomer = db.prepare('SELECT id FROM customers LIMIT 1').get() as { id: number } | undefined;
      const sampleProducts = db.prepare('SELECT id, price FROM products LIMIT 3').all() as { id: number; price: number }[];

      if (sampleProducts.length > 0) {
        const totalAmt = sampleProducts[0].price * 2 + sampleProducts[1].price;
        const saleResult = db.prepare('INSERT INTO sales (user_id, customer_id, total, payment_method, cash_amount, paid_amount, with_invoice, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(adminUser.id, firstCustomer ? firstCustomer.id : null, totalAmt, 'CASH', totalAmt, totalAmt, 1, 'COMPLETED');
        const saleId = saleResult.lastInsertRowid;

        db.prepare('INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
          .run(saleId, sampleProducts[0].id, 2, sampleProducts[0].price, sampleProducts[0].price * 2);
        if (sampleProducts[1]) {
          db.prepare('INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
            .run(saleId, sampleProducts[1].id, 1, sampleProducts[1].price, sampleProducts[1].price);
        }
      }
    }

    // Backfill product cost_price, barcode, batch_number, expiry_date for existing products
    const allProds = db.prepare('SELECT id, price, cost_price, barcode, batch_number, expiry_date FROM products').all() as any[];
    const expiryDates = [
      '2026-10-25', // Expiring very soon
      '2026-11-15', // Expiring soon
      '2027-03-20',
      '2027-06-30',
      '2027-09-15',
      '2026-11-02', // Expiring soon
      '2027-12-31',
      '2028-05-10'
    ];
    allProds.forEach((p, idx) => {
      const cost = p.cost_price && p.cost_price > 0 ? p.cost_price : Number((p.price * 0.62).toFixed(2));
      const barcode = p.barcode || `777010${String(p.id).padStart(6, '0')}`;
      const batch = p.batch_number || `LOT-26${String.fromCharCode(65 + (idx % 6))}${100 + idx}`;
      const expiry = p.expiry_date || expiryDates[idx % expiryDates.length];
      db.prepare('UPDATE products SET cost_price = ?, barcode = ?, batch_number = ?, expiry_date = ? WHERE id = ?')
        .run(cost, barcode, batch, expiry, p.id);
    });

    // Seed a Combo/Pack product if none exists
    const comboExists = db.prepare('SELECT count(*) as count FROM products WHERE is_combo = 1 AND active = 1').get() as { count: number };
    if (comboExists.count === 0 && allProds.length >= 3) {
      const comboItems = JSON.stringify([
        { product_id: allProds[0].id, quantity: 1 },
        { product_id: allProds[3]?.id || allProds[1].id, quantity: 1 },
        { product_id: allProds[4]?.id || allProds[2].id, quantity: 1 }
      ]);
      db.prepare(`
        INSERT INTO products (name, description, price, cost_price, stock, category, barcode, batch_number, expiry_date, is_combo, combo_items, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
      `).run(
        'Pack Botiquín Familiar Bioseguridad',
        'Combo promocional: Paracetamol + Alcohol en Gel + Mascarillas Quirúrgicas',
        48.00,
        29.50,
        25,
        'Promociones',
        '777999000111',
        'PACK-2026-01',
        '2027-08-30',
        comboItems
      );
    }

    // Backfill customer loyalty points if all 0
    const customersWithPoints = db.prepare('SELECT count(*) as count FROM customers WHERE points > 0').get() as { count: number };
    if (customersWithPoints.count === 0) {
      const custs = db.prepare('SELECT id FROM customers').all() as { id: number }[];
      const samplePoints = [120, 85, 40, 210, 350];
      custs.forEach((c, idx) => {
        db.prepare('UPDATE customers SET points = ? WHERE id = ?').run(samplePoints[idx % samplePoints.length], c.id);
      });
    }

    // Seed Operating Expenses if empty
    const expensesCount = db.prepare('SELECT count(*) as count FROM expenses').get() as { count: number };
    if (expensesCount.count === 0) {
      const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
      const today = new Date().toISOString().split('T')[0];
      const defaultExpenses = [
        ['Alquiler', 'Pago mensual de alquiler de local comercial', 1800.00, today, 'QR'],
        ['Servicios Básicos', 'Factura de energía eléctrica y agua potable', 320.50, today, 'CASH'],
        ['Internet y Sistemas', 'Servicio fibra óptica empresarial 300 Mbps', 210.00, today, 'QR'],
        ['Logística y Transporte', 'Transporte de mercadería e insumos de almacén', 145.00, today, 'CASH']
      ];
      const insertExpense = db.prepare('INSERT INTO expenses (user_id, category, description, amount, expense_date, payment_method) VALUES (?, ?, ?, ?, ?, ?)');
      defaultExpenses.forEach(([cat, desc, amount, date, method]) => {
        insertExpense.run(adminUser.id, cat, desc, amount, date, method);
      });
    }

    // Seed an Open Cash Register Session if none exists
    const cashSessionCount = db.prepare('SELECT count(*) as count FROM cash_sessions').get() as { count: number };
    if (cashSessionCount.count === 0) {
      const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
      const sessionRes = db.prepare('INSERT INTO cash_sessions (user_id, opening_amount, extra_income, extra_expense, notes, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(adminUser.id, 500.00, 50.00, 25.00, 'Apertura de turno principal', 'OPEN');
      db.prepare('INSERT INTO cash_movements (session_id, user_id, type, amount, reason) VALUES (?, ?, ?, ?, ?)')
        .run(sessionRes.lastInsertRowid, adminUser.id, 'INCOME', 50.00, 'Ingreso de sencillo para cambio');
      db.prepare('INSERT INTO cash_movements (session_id, user_id, type, amount, reason) VALUES (?, ?, ?, ?, ?)')
        .run(sessionRes.lastInsertRowid, adminUser.id, 'EXPENSE', 25.00, 'Compra de rollos térmicos para impresora');
    }

    // Seed a Demo Quotation if none exists
    const quotationCount = db.prepare('SELECT count(*) as count FROM quotations').get() as { count: number };
    if (quotationCount.count === 0 && allProds.length >= 2) {
      const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
      const firstCustomer = db.prepare('SELECT id FROM customers LIMIT 1').get() as { id: number } | undefined;
      const totalQ = allProds[0].price * 5 + allProds[1].price * 3;
      const qRes = db.prepare('INSERT INTO quotations (user_id, customer_id, total, valid_until, notes, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(adminUser.id, firstCustomer ? firstCustomer.id : null, totalQ, '2026-10-30', 'Cotización corporativa sujeta a disponibilidad', 'PENDING');
      db.prepare('INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(qRes.lastInsertRowid, allProds[0].id, 5, allProds[0].price, allProds[0].price * 5);
      db.prepare('INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(qRes.lastInsertRowid, allProds[1].id, 3, allProds[1].price, allProds[1].price * 3);
    }
};
seed();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/health', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok', database: 'connected' });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Middleware for Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    
    if (!token || token === 'null' || token === 'undefined') {
      console.warn(`[Auth] Missing or invalid token format: ${token}`);
      return res.status(401).json({ error: 'Sesión no iniciada o token inválido' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          console.warn(`[Auth] Session expired for token`);
        } else {
          console.error(`[Auth] JWT Verification Error: ${err.message}`);
        }
        return res.status(401).json({ 
          error: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
          code: 'TOKEN_EXPIRED'
        });
      }
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'Admin') {
      console.warn(`[Auth] Access denied for user ${req.user.username} (Role: ${req.user.role})`);
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };

  // Audit Helper
  const logAudit = (userId: number, action: string, entity: string, entityId?: number, details?: string) => {
    db.prepare('INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(userId, action, entity, entityId || null, details || null);
  };

  // Auth Routes
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`[Login] Attempt for username: ${username}`);
    
    try {
      const user = db.prepare(`
        SELECT u.*, r.name as role 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.username = ?
      `).get(username) as any;

      if (!user) {
        console.warn(`[Login] User not found: ${username}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (!bcrypt.compareSync(password, user.password)) {
        console.warn(`[Login] Invalid password for user: ${username}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`[Login] Success for user: ${username} (Role: ${user.role})`);
      
      logAudit(user.id, 'LOGIN', 'USER', user.id, 'Inicio de sesión exitoso');
      res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
    } catch (error: any) {
      console.error(`[Login] Error:`, error);
      res.status(500).json({ error: 'Error interno en el inicio de sesión' });
    }
  });

  // User Routes (Admin only)
  app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
    try {
      const users = db.prepare(`
        SELECT u.id, u.username, u.full_name, r.name as role, u.role_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
      `).all();
      res.json(users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', authenticateToken, isAdmin, (req: any, res) => {
    const { username, password, full_name, role_id } = req.body;
    console.log('Creating user:', { username, full_name, role_id });
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?, ?, ?, ?)')
        .run(username, hashedPassword, full_name, role_id);
      logAudit(req.user.id, 'CREATE', 'USER', Number(result.lastInsertRowid), `Usuario creado: ${username}`);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      console.error('Error creating user:', e);
      res.status(400).json({ error: e.message.includes('UNIQUE') ? 'El usuario ya existe' : e.message });
    }
  });

  app.put('/api/users/:id', authenticateToken, isAdmin, (req: any, res) => {
    const { username, full_name, role_id, password } = req.body;
    try {
      const userExists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
      if (userExists) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });

      if (password && password.trim() !== '') {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET username = ?, full_name = ?, role_id = ?, password = ? WHERE id = ?')
          .run(username, full_name, role_id, hashedPassword, req.params.id);
      } else {
        db.prepare('UPDATE users SET username = ?, full_name = ?, role_id = ? WHERE id = ?')
          .run(username, full_name, role_id, req.params.id);
      }
      logAudit(req.user.id, 'UPDATE', 'USER', Number(req.params.id), `Usuario actualizado: ${username}`);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Error updating user:', e);
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/users/:id', authenticateToken, isAdmin, (req: any, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'DELETE', 'USER', Number(req.params.id), `Usuario eliminado ID: ${req.params.id}`);
    res.json({ success: true });
  });

  // Customer Routes
  app.get('/api/customers', authenticateToken, (req, res) => {
    try {
      const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
      res.json(customers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers', authenticateToken, (req: any, res) => {
    const { name, email, phone, address } = req.body;
    console.log('Creating customer:', { name, email });
    try {
      const result = db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)')
        .run(name, email || null, phone || null, address || null);
      logAudit(req.user.id, 'CREATE', 'CUSTOMER', Number(result.lastInsertRowid), `Cliente creado: ${name}`);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      if (error.message.includes('UNIQUE constraint failed: customers.email')) {
        return res.status(400).json({ error: 'Ya existe un cliente registrado con este correo electrónico.' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/customers/:id', authenticateToken, (req: any, res) => {
    const { name, email, phone, address } = req.body;
    try {
      db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?')
        .run(name, email || null, phone || null, address || null, req.params.id);
      logAudit(req.user.id, 'UPDATE', 'CUSTOMER', Number(req.params.id), `Cliente actualizado: ${name}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      if (error.message.includes('UNIQUE constraint failed: customers.email')) {
        return res.status(400).json({ error: 'Ya existe otro cliente registrado con este correo electrónico.' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Product Routes
  app.get('/api/products', authenticateToken, (req, res) => {
    try {
      const products = db.prepare('SELECT * FROM products WHERE active = 1').all();
      res.json(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', authenticateToken, isAdmin, (req: any, res) => {
    const { name, description, price, cost_price, stock, category, barcode, batch_number, expiry_date, is_combo, combo_items } = req.body;
    console.log('Creating product:', { name, price, stock, category });
    try {
      const costVal = cost_price !== undefined ? Number(cost_price) : Number((Number(price) * 0.6).toFixed(2));
      const result = db.prepare(`
        INSERT INTO products (name, description, price, cost_price, stock, category, barcode, batch_number, expiry_date, is_combo, combo_items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        description || null,
        price,
        costVal,
        stock,
        category || 'Otros',
        barcode || `777010${Math.floor(100000 + Math.random() * 900000)}`,
        batch_number || null,
        expiry_date || null,
        is_combo ? 1 : 0,
        combo_items ? (typeof combo_items === 'string' ? combo_items : JSON.stringify(combo_items)) : null
      );
      
      db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
        .run(result.lastInsertRowid, req.user.id, 'IN', stock, 'Stock inicial');
      
      logAudit(req.user.id, 'CREATE', 'PRODUCT', Number(result.lastInsertRowid), `Producto creado: ${name}`);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authenticateToken, isAdmin, (req: any, res) => {
    const { name, description, price, cost_price, stock, category, barcode, batch_number, expiry_date, is_combo, combo_items } = req.body;
    const oldProduct = db.prepare('SELECT stock, cost_price FROM products WHERE id = ?').get(req.params.id) as any;
    const costVal = cost_price !== undefined ? Number(cost_price) : (oldProduct?.cost_price || Number((Number(price) * 0.6).toFixed(2)));
    
    db.prepare(`
      UPDATE products
      SET name = ?, description = ?, price = ?, cost_price = ?, stock = ?, category = ?, barcode = ?, batch_number = ?, expiry_date = ?, is_combo = ?, combo_items = ?
      WHERE id = ?
    `).run(
      name,
      description,
      price,
      costVal,
      stock,
      category,
      barcode || null,
      batch_number || null,
      expiry_date || null,
      is_combo ? 1 : 0,
      combo_items ? (typeof combo_items === 'string' ? combo_items : JSON.stringify(combo_items)) : null,
      req.params.id
    );
    
    if (oldProduct && oldProduct.stock !== stock) {
      const diff = stock - oldProduct.stock;
      db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.id, req.user.id, diff > 0 ? 'IN' : 'OUT', Math.abs(diff), 'Ajuste manual');
    }

    logAudit(req.user.id, 'UPDATE', 'PRODUCT', Number(req.params.id), `Producto actualizado: ${name}`);
    res.json({ success: true });
  });

  app.delete('/api/products/:id', authenticateToken, isAdmin, (req: any, res) => {
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'DELETE', 'PRODUCT', Number(req.params.id), `Producto desactivado ID: ${req.params.id}`);
    res.json({ success: true });
  });

  // Inventory Movements
  app.get('/api/inventory/movements', authenticateToken, (req, res) => {
    const movements = db.prepare(`
      SELECT m.*, p.name as product_name, u.full_name as user_name
      FROM inventory_movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `).all();
    res.json(movements);
  });

  // Sales Routes
  app.post('/api/sales', authenticateToken, (req: any, res) => {
    const {
      items,
      total,
      customer_id,
      payment_method,
      with_invoice,
      cash_amount,
      qr_amount,
      credit_amount,
      paid_amount,
      discount_amount,
      points_redeemed
    } = req.body;
    console.log('Processing sale:', { itemsCount: items?.length, total, customer_id, payment_method });
    
    const transaction = db.transaction(() => {
      const method = payment_method || 'CASH';
      const cashAmt = method === 'CASH' ? total : (method === 'MIXED' ? Number(cash_amount || 0) : (method === 'CREDIT' ? Number(paid_amount || 0) : 0));
      const qrAmt = method === 'QR' ? total : (method === 'MIXED' ? Number(qr_amount || 0) : 0);
      const credAmt = method === 'CREDIT' ? Number(credit_amount !== undefined ? credit_amount : (total - Number(paid_amount || 0))) : 0;
      const paidAmt = method === 'CREDIT' ? Number(paid_amount || 0) : total;

      if (method === 'CREDIT' && !customer_id) {
        throw new Error('Para ventas al crédito (Fiado) debe seleccionar un cliente registrado.');
      }

      // 1. Create Sale
      const saleResult = db.prepare(`
        INSERT INTO sales (user_id, customer_id, total, payment_method, cash_amount, qr_amount, credit_amount, paid_amount, discount_amount, points_redeemed, with_invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        customer_id || null,
        total,
        method,
        cashAmt,
        qrAmt,
        credAmt,
        paidAmt,
        Number(discount_amount || 0),
        Number(points_redeemed || 0),
        with_invoice ? 1 : 0
      );
      const saleId = saleResult.lastInsertRowid;

      // 2. Process Items & Combo Components
      for (const item of items) {
        const product = db.prepare('SELECT id, name, stock, is_combo, combo_items FROM products WHERE id = ?').get(item.id) as any;
        if (!product || product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para el producto: ${product?.name || item.id}`);
        }

        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
          .run(item.quantity, item.id);

        db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
          .run(item.id, req.user.id, 'SALE', item.quantity, `Venta #${saleId}`);

        // If it's a combo/kit, also deduct stock of its individual component products
        if (product.is_combo && product.combo_items) {
          try {
            const components = JSON.parse(product.combo_items) as { product_id: number; quantity: number }[];
            for (const comp of components) {
              const compQty = comp.quantity * item.quantity;
              const compProd = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(comp.product_id) as any;
              if (compProd && compProd.stock >= compQty) {
                db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(compQty, comp.product_id);
                db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
                  .run(comp.product_id, req.user.id, 'SALE', compQty, `Componente Combo (${product.name}) - Venta #${saleId}`);
              }
            }
          } catch (err) {
            console.warn('Error parsing combo_items:', err);
          }
        }

        db.prepare('INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
          .run(saleId, item.id, item.quantity, item.price, item.quantity * item.price);
      }

      // 3. Update Customer Loyalty Points & Credit Balance
      if (customer_id) {
        const pointsEarned = Math.floor(Number(total) / 10);
        const redeemed = Number(points_redeemed || 0);
        db.prepare(`
          UPDATE customers
          SET points = MAX(0, COALESCE(points, 0) - ? + ?),
              credit_balance = COALESCE(credit_balance, 0) + ?
          WHERE id = ?
        `).run(redeemed, pointsEarned, credAmt, customer_id);

        if (method === 'CREDIT' && paidAmt > 0) {
          db.prepare(`
            INSERT INTO credit_payments (sale_id, customer_id, user_id, amount, payment_method, notes)
            VALUES (?, ?, ?, ?, 'CASH', 'Pago inicial en venta al crédito')
          `).run(saleId, customer_id, req.user.id, paidAmt);
        }
      }

      return saleId;
    });

    try {
      const saleId = transaction();
      logAudit(req.user.id, 'CREATE', 'SALE', Number(saleId), `Venta realizada por total: ${total} (${payment_method || 'CASH'})`);
      res.json({ id: saleId });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/sales/:id/cancel', authenticateToken, isAdmin, (req: any, res) => {
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id) as any;
      if (!sale) throw new Error('Venta no encontrada');
      if (sale.status === 'CANCELLED') throw new Error('La venta ya está anulada');

      const details = db.prepare('SELECT * FROM sale_details WHERE sale_id = ?').all(req.params.id) as any[];
      
      for (const detail of details) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .run(detail.quantity, detail.product_id);
        
        db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
          .run(detail.product_id, req.user.id, 'IN', detail.quantity, `Anulación Venta #${req.params.id}`);
      }

      if (sale.customer_id && sale.credit_amount > 0) {
        const unpaid = Math.max(0, sale.total - (sale.paid_amount || 0));
        db.prepare('UPDATE customers SET credit_balance = MAX(0, COALESCE(credit_balance, 0) - ?) WHERE id = ?')
          .run(unpaid, sale.customer_id);
      }

      db.prepare('UPDATE sales SET status = "CANCELLED" WHERE id = ?').run(req.params.id);
      return true;
    });

    try {
      transaction();
      logAudit(req.user.id, 'CANCEL', 'SALE', Number(req.params.id), `Venta anulada ID: ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/sales', authenticateToken, (req: any, res) => {
    let query = `
      SELECT s.*, u.full_name as seller_name, c.name as customer_name, c.phone as customer_phone
      FROM sales s 
      JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
    `;
    let params: any[] = [];

    if (req.user.role !== 'Admin') {
      query += ' WHERE s.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY s.created_at DESC';
    const sales = db.prepare(query).all(...params);
    res.json(sales);
  });

  // Cash Register (Arqueo de Caja) Routes
  app.get('/api/cash/current', authenticateToken, (req: any, res) => {
    try {
      const session = db.prepare(`
        SELECT cs.*, u.full_name as user_name
        FROM cash_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.status = 'OPEN'
        ORDER BY cs.opened_at DESC LIMIT 1
      `).get() as any;

      if (!session) {
        return res.json({ session: null });
      }

      const movements = db.prepare(`
        SELECT cm.*, u.full_name as user_name
        FROM cash_movements cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.session_id = ?
        ORDER BY cm.created_at DESC
      `).all(session.id);

      // Calculate cash sales since session opened
      const salesStats = db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total WHEN payment_method = 'MIXED' THEN cash_amount WHEN payment_method = 'CREDIT' THEN paid_amount ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'QR' THEN total WHEN payment_method = 'MIXED' THEN qr_amount ELSE 0 END), 0) as qr_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'CREDIT' THEN (total - COALESCE(paid_amount, 0)) ELSE 0 END), 0) as credit_sales
        FROM sales
        WHERE status = 'COMPLETED' AND created_at >= ?
      `).get(session.opened_at) as any;

      const creditCollections = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM credit_payments
        WHERE payment_method = 'CASH' AND created_at >= ? AND notes != 'Pago inicial en venta al crédito'
      `).get(session.opened_at) as any;

      const expectedCash = Number(session.opening_amount || 0)
        + Number(salesStats?.cash_sales || 0)
        + Number(creditCollections?.total || 0)
        + Number(session.extra_income || 0)
        - Number(session.extra_expense || 0);

      res.json({
        session: {
          ...session,
          cash_sales: Number(salesStats?.cash_sales || 0),
          qr_sales: Number(salesStats?.qr_sales || 0),
          credit_sales: Number(salesStats?.credit_sales || 0),
          credit_collections: Number(creditCollections?.total || 0),
          expected_amount: expectedCash,
          movements
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/cash/history', authenticateToken, (req, res) => {
    try {
      const sessions = db.prepare(`
        SELECT cs.*, u.full_name as user_name
        FROM cash_sessions cs
        JOIN users u ON cs.user_id = u.id
        ORDER BY cs.opened_at DESC LIMIT 30
      `).all();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/cash/open', authenticateToken, (req: any, res) => {
    const { opening_amount, notes } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM cash_sessions WHERE status = 'OPEN'").get();
      if (existing) {
        return res.status(400).json({ error: 'Ya existe una caja abierta en curso.' });
      }
      const result = db.prepare(`
        INSERT INTO cash_sessions (user_id, opening_amount, notes, status)
        VALUES (?, ?, ?, 'OPEN')
      `).run(req.user.id, Number(opening_amount || 0), notes || 'Apertura de turno');
      logAudit(req.user.id, 'OPEN_CASH', 'CASH_SESSION', Number(result.lastInsertRowid), `Caja abierta con monto inicial: ${opening_amount}`);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/cash/movement', authenticateToken, (req: any, res) => {
    const { type, amount, reason } = req.body;
    try {
      const session = db.prepare("SELECT * FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1").get() as any;
      if (!session) {
        return res.status(400).json({ error: 'No hay una caja abierta actualmente.' });
      }
      const amt = Number(amount || 0);
      db.prepare(`
        INSERT INTO cash_movements (session_id, user_id, type, amount, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(session.id, req.user.id, type, amt, reason || 'Movimiento de caja');

      if (type === 'INCOME') {
        db.prepare('UPDATE cash_sessions SET extra_income = COALESCE(extra_income, 0) + ? WHERE id = ?').run(amt, session.id);
      } else {
        db.prepare('UPDATE cash_sessions SET extra_expense = COALESCE(extra_expense, 0) + ? WHERE id = ?').run(amt, session.id);
      }

      logAudit(req.user.id, 'CASH_MOVEMENT', 'CASH_SESSION', session.id, `${type}: ${amt} (${reason})`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/cash/close', authenticateToken, (req: any, res) => {
    const { closing_amount, expected_amount, notes } = req.body;
    try {
      const session = db.prepare("SELECT * FROM cash_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1").get() as any;
      if (!session) {
        return res.status(400).json({ error: 'No hay una caja abierta para cerrar.' });
      }
      db.prepare(`
        UPDATE cash_sessions
        SET closing_amount = ?, expected_amount = ?, notes = COALESCE(?, notes), status = 'CLOSED', closed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(Number(closing_amount || 0), Number(expected_amount || 0), notes || null, session.id);

      logAudit(req.user.id, 'CLOSE_CASH', 'CASH_SESSION', session.id, `Cierre de caja. Esperado: ${expected_amount}, Real: ${closing_amount}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Quotations / Proformas Routes
  app.get('/api/quotations', authenticateToken, (req, res) => {
    try {
      const quotations = db.prepare(`
        SELECT q.*, u.full_name as seller_name, c.name as customer_name, c.phone as customer_phone
        FROM quotations q
        JOIN users u ON q.user_id = u.id
        LEFT JOIN customers c ON q.customer_id = c.id
        ORDER BY q.created_at DESC
      `).all() as any[];

      const withDetails = quotations.map(q => {
        const details = db.prepare(`
          SELECT qd.*, p.name as product_name
          FROM quotation_details qd
          JOIN products p ON qd.product_id = p.id
          WHERE qd.quotation_id = ?
        `).all(q.id);
        return { ...q, details };
      });

      res.json(withDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/quotations', authenticateToken, (req: any, res) => {
    const { customer_id, items, total, valid_until, notes } = req.body;
    const transaction = db.transaction(() => {
      const validDate = valid_until || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const resQ = db.prepare(`
        INSERT INTO quotations (user_id, customer_id, total, valid_until, notes, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `).run(req.user.id, customer_id || null, total, validDate, notes || 'Cotización válida por 7 días');
      const quotationId = resQ.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(quotationId, item.id, item.quantity, item.price, item.quantity * item.price);
      }
      return quotationId;
    });

    try {
      const id = transaction();
      logAudit(req.user.id, 'CREATE', 'QUOTATION', Number(id), `Cotización creada por total: ${total}`);
      res.json({ id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/quotations/:id/convert', authenticateToken, (req: any, res) => {
    try {
      db.prepare("UPDATE quotations SET status = 'CONVERTED' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Credits / Accounts Receivable Routes
  app.get('/api/credits', authenticateToken, (req, res) => {
    try {
      const creditSales = db.prepare(`
        SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as seller_name
        FROM sales s
        JOIN customers c ON s.customer_id = c.id
        JOIN users u ON s.user_id = u.id
        WHERE s.payment_method = 'CREDIT' AND s.status = 'COMPLETED'
        ORDER BY s.created_at DESC
      `).all() as any[];

      const withPayments = creditSales.map(s => {
        const payments = db.prepare(`
          SELECT cp.*, u.full_name as user_name
          FROM credit_payments cp
          JOIN users u ON cp.user_id = u.id
          WHERE cp.sale_id = ?
          ORDER BY cp.created_at DESC
        `).all(s.id);
        return { ...s, payments, balance_due: Math.max(0, Number((s.total - (s.paid_amount || 0)).toFixed(2))) };
      });

      res.json(withPayments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/credits/pay', authenticateToken, (req: any, res) => {
    const { sale_id, amount, payment_method, notes } = req.body;
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id) as any;
      if (!sale) throw new Error('Venta al crédito no encontrada');

      const pending = Math.max(0, Number((sale.total - (sale.paid_amount || 0)).toFixed(2)));
      const payAmt = Number(amount || 0);
      if (payAmt <= 0 || payAmt > pending + 0.01) {
        throw new Error(`Monto inválido. El saldo pendiente es ${pending.toFixed(2)}`);
      }

      db.prepare(`
        INSERT INTO credit_payments (sale_id, customer_id, user_id, amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sale.id, sale.customer_id, req.user.id, payAmt, payment_method || 'CASH', notes || 'Abono de cuenta por cobrar');

      db.prepare(`
        UPDATE sales
        SET paid_amount = COALESCE(paid_amount, 0) + ?,
            credit_amount = MAX(0, total - (COALESCE(paid_amount, 0) + ?))
        WHERE id = ?
      `).run(payAmt, payAmt, sale.id);

      if (sale.customer_id) {
        db.prepare(`
          UPDATE customers
          SET credit_balance = MAX(0, COALESCE(credit_balance, 0) - ?)
          WHERE id = ?
        `).run(payAmt, sale.customer_id);
      }

      return true;
    });

    try {
      transaction();
      logAudit(req.user.id, 'PAY_CREDIT', 'SALE', Number(sale_id), `Abono registrado por: ${amount}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Operating Expenses & Financial Analytics Routes
  app.get('/api/expenses', authenticateToken, (req, res) => {
    try {
      const expenses = db.prepare(`
        SELECT e.*, u.full_name as user_name
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        ORDER BY e.expense_date DESC, e.id DESC
      `).all();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/expenses', authenticateToken, (req: any, res) => {
    const { category, description, amount, expense_date, payment_method } = req.body;
    try {
      const dateStr = expense_date || new Date().toISOString().split('T')[0];
      const resE = db.prepare(`
        INSERT INTO expenses (user_id, category, description, amount, expense_date, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(req.user.id, category || 'Operativo', description, Number(amount), dateStr, payment_method || 'CASH');
      logAudit(req.user.id, 'CREATE', 'EXPENSE', Number(resE.lastInsertRowid), `Gasto registrado: ${description} (${amount})`);
      res.json({ id: resE.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/expenses/:id', authenticateToken, isAdmin, (req: any, res) => {
    try {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/finance/summary', authenticateToken, (req, res) => {
    try {
      const totalSalesRow = db.prepare("SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE status = 'COMPLETED'").get() as any;
      const totalPurchasesRow = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM purchases WHERE status = 'COMPLETED'").get() as any;
      const totalExpensesRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses").get() as any;
      const pendingCreditsRow = db.prepare("SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as total FROM sales WHERE payment_method = 'CREDIT' AND status = 'COMPLETED'").get() as any;

      // Product profitability
      const productProfitability = db.prepare(`
        SELECT
          p.id,
          p.name,
          p.category,
          p.price,
          COALESCE(p.cost_price, p.price * 0.6) as cost_price,
          p.stock,
          COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN sd.quantity ELSE 0 END), 0) as units_sold,
          COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN sd.subtotal ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN sd.quantity * COALESCE(p.cost_price, p.price * 0.6) ELSE 0 END), 0) as total_cost
        FROM products p
        LEFT JOIN sale_details sd ON p.id = sd.product_id
        LEFT JOIN sales s ON sd.sale_id = s.id
        WHERE p.active = 1
        GROUP BY p.id
        ORDER BY revenue DESC
      `).all() as any[];

      const cogs = productProfitability.reduce((acc, p) => acc + Number(p.total_cost || 0), 0);
      const grossProfit = Number(totalSalesRow.total || 0) - cogs;
      const netProfit = grossProfit - Number(totalExpensesRow.total || 0);

      // Seller ranking & commissions
      const sellerRanking = db.prepare(`
        SELECT
          u.id,
          u.full_name,
          r.name as role,
          COUNT(s.id) as sales_count,
          COALESCE(SUM(s.total), 0) as total_revenue
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN sales s ON u.id = s.user_id AND s.status = 'COMPLETED'
        GROUP BY u.id
        ORDER BY total_revenue DESC
      `).all() as any[];

      const expensesByCategory = db.prepare(`
        SELECT category, SUM(amount) as total
        FROM expenses
        GROUP BY category
        ORDER BY total DESC
      `).all();

      res.json({
        revenue: Number(totalSalesRow.total || 0),
        salesCount: Number(totalSalesRow.count || 0),
        cogs: Number(cogs.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        totalExpenses: Number(totalExpensesRow.total || 0),
        totalPurchases: Number(totalPurchasesRow.total || 0),
        netProfit: Number(netProfit.toFixed(2)),
        pendingCredits: Number(pendingCreditsRow.total || 0),
        productProfitability: productProfitability.map(p => ({
          ...p,
          profit: Number((p.revenue - p.total_cost).toFixed(2)),
          margin_percent: p.price > 0 ? Number((((p.price - p.cost_price) / p.price) * 100).toFixed(1)) : 0
        })),
        sellerRanking: sellerRanking.map(s => ({
          ...s,
          commission: Number((s.total_revenue * 0.05).toFixed(2))
        })),
        expensesByCategory
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System Settings Routes
  app.get('/api/settings', authenticateToken, (req, res) => {
    const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post('/api/settings', authenticateToken, isAdmin, (req: any, res) => {
    try {
      const { key, value } = req.body;
      db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run(key, value);
      logAudit(req.user.id, 'UPDATE', 'SETTINGS', null, `Configuración actualizada: ${key}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Error al actualizar la configuración' });
    }
  });

  app.get('/api/sales/:id', authenticateToken, (req: any, res) => {
    const sale = db.prepare(`
      SELECT s.*, u.full_name as seller_name, c.name as customer_name
      FROM sales s 
      JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(req.params.id) as any;

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    if (req.user.role !== 'Admin' && sale.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const details = db.prepare(`
      SELECT sd.*, p.name as product_name
      FROM sale_details sd
      JOIN products p ON sd.product_id = p.id
      WHERE sd.sale_id = ?
    `).all(req.params.id);

    res.json({ ...sale, details });
  });

  // Audit Logs
  app.get('/api/audit', authenticateToken, isAdmin, (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.full_name as user_name
      FROM audit_logs l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC LIMIT 100
    `).all();
    res.json(logs);
  });

  // AI Context Endpoint
  app.get('/api/ai/context', authenticateToken, (req: any, res) => {
    try {
      const products = db.prepare('SELECT name, stock, price, category FROM products WHERE active = 1').all();
      const users = db.prepare('SELECT username, full_name, r.name as role FROM users JOIN roles r ON users.role_id = r.id').all();
      const salesSummary = db.prepare(`
        SELECT u.full_name as seller, COUNT(s.id) as total_sales, SUM(s.total) as total_revenue
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'COMPLETED'
        GROUP BY u.id
      `).all();
      
      const totalSalesCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE status = 'COMPLETED'").get() as any;
      const totalRevenue = db.prepare("SELECT SUM(total) as total FROM sales WHERE status = 'COMPLETED'").get() as any;
      
      const detailedSales = db.prepare(`
        SELECT s.id, u.full_name as seller, c.name as customer, s.total, s.created_at, s.status
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC LIMIT 100
      `).all();

      const systemInfo = {
        currency: 'Boliviano (Bs)',
        backupMethod: 'El sistema utiliza una base de datos SQLite (sales_system.db). Los respaldos se realizan mediante la exportación manual del archivo de base de datos desde la sección de Configuración.',
        lastUpdate: new Date().toISOString()
      };

      res.json({
        products,
        users,
        salesSummary,
        detailedSales,
        totalStats: {
          count: totalSalesCount.count,
          revenue: totalRevenue.total || 0
        },
        systemInfo
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Backup Download Endpoint
  app.get('/api/backup/download', authenticateToken, isAdmin, (req, res) => {
    const dbPath = path.join(process.cwd(), 'sales_system.db');
    res.download(dbPath, `backup_ventaspro_${new Date().toISOString().split('T')[0]}.db`);
  });

  // Purchase Routes
  app.get('/api/purchases', authenticateToken, (req, res) => {
    try {
      const purchases = db.prepare(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC
      `).all();
      res.json(purchases);
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/purchases', authenticateToken, (req: any, res) => {
    const { supplier_id, warehouse, purchase_date, number, total, observations, details } = req.body;
    
    const transaction = db.transaction(() => {
      // 1. Insert Purchase
      const result = db.prepare(`
        INSERT INTO purchases (number, supplier_id, warehouse, total, purchase_date, observations, status)
        VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED')
      `).run(number, supplier_id, warehouse, total, purchase_date, observations);
      
      const purchaseId = result.lastInsertRowid;

      // 2. Insert Details and Update stock
      for (const item of details) {
        db.prepare(`
          INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(purchaseId, item.product_id, item.quantity, item.unit_price, item.subtotal);

        // Update product stock
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .run(item.quantity, item.product_id);

        // Log entry
        db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
          .run(item.product_id, req.user.id, 'IN', item.quantity, `Compra #${purchaseId}`);
      }

      return purchaseId;
    });

    try {
      const purchaseId = transaction();
      logAudit(req.user.id, 'CREATE', 'PURCHASE', Number(purchaseId), `Compra registrada por total: ${total}`);
      res.json({ id: purchaseId });
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/suppliers', authenticateToken, (req, res) => {
    try {
      const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get('/api/stats', authenticateToken, (req: any, res) => {
    try {
      const isSeller = req.user.role !== 'Admin';
      const userId = req.user.id;
      console.log(`[Stats] Fetching stats for user: ${req.user.username} (Role: ${req.user.role})`);

      const totalSalesQuery = `SELECT SUM(total) as total FROM sales WHERE status = 'COMPLETED' ${isSeller ? 'AND user_id = ?' : ''}`;
      const totalSales = isSeller ? db.prepare(totalSalesQuery).get(userId) : db.prepare(totalSalesQuery).get();

      const salesCountQuery = `SELECT COUNT(*) as count FROM sales WHERE status = 'COMPLETED' ${isSeller ? 'AND user_id = ?' : ''}`;
      const salesCount = isSeller ? db.prepare(salesCountQuery).get(userId) : db.prepare(salesCountQuery).get();

      const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get() as any;
      const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10 AND active = 1').get() as any;
      const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as any;
      
      const recentSalesQuery = `
        SELECT s.total, s.created_at, u.full_name as seller 
        FROM sales s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.status = 'COMPLETED'
        ${isSeller ? 'AND s.user_id = ?' : ''}
        ORDER BY s.created_at DESC LIMIT 5
      `;
      const recentSales = isSeller ? db.prepare(recentSalesQuery).all(userId) : db.prepare(recentSalesQuery).all();

      const salesByDayQuery = `
        SELECT DATE(created_at) as date, SUM(total) as total
        FROM sales
        WHERE status = 'COMPLETED'
        ${isSeller ? 'AND user_id = ?' : ''}
        GROUP BY DATE(created_at)
        ORDER BY date ASC LIMIT 7
      `;
      const salesByDay = isSeller ? db.prepare(salesByDayQuery).all(userId) : db.prepare(salesByDayQuery).all();

      res.json({
        revenue: totalSales?.total || 0,
        salesCount: salesCount?.count || 0,
        productsCount: productsCount?.count || 0,
        lowStock: lowStock?.count || 0,
        customersCount: customersCount?.count || 0,
        recentSales: recentSales || [],
        salesByDay: salesByDay || []
      });
    } catch (error: any) {
      console.error(`[Stats] Error:`, error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  // API 404 handler
  app.all('/api*', (req, res) => {
    console.warn(`[404] API Route Not Found: ${req.originalUrl}`);
    res.status(404).json({ error: `Ruta API no encontrada: ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Global Error Handler]:', err);
    res.status(500).json({ error: 'Error interno del servidor. Por favor, contacta al administrador.' });
  });

  // Vite middleware for development vs static build for production
  const isDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev';
  const distDir = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  if (!isDev && hasDist) {
    console.log('[Server] Mode: Production (serving pre-built dist)');
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else if (isDev) {
    console.log('[Server] Mode: Development (Vite middleware)');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      if (fs.existsSync(path.join(distDir, 'index.html'))) {
        res.sendFile(path.join(distDir, 'index.html'));
      } else {
        res.status(503).send('Aplicación en preparación. Ejecute "npm run build" para compilar.');
      }
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ¡Servidor de Farmacia iniciado con éxito!');
    console.log(`🏠 Local:    http://localhost:${PORT}`);
    console.log(`🌐 Red:     http://0.0.0.0:${PORT}\n`);
  });
}

startServer();
