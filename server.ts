import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { TRACTOR_PARTS_PRODUCTS, DEFAULT_TRACTOR_SUPPLIERS } from './src/data/tractorPartsCatalog.ts';

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
try { db.exec("ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 5"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN branch_stocks TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN image_url TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN design_type TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN color_name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN color_hex TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN thickness TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN width_m REAL DEFAULT 0.85"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN standard_length_m REAL DEFAULT 3.0"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN unit_type TEXT DEFAULT 'UNIDAD'"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN brand TEXT DEFAULT 'GENERAL'"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN oem_codes TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN supplier_name TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE sale_details ADD COLUMN sheet_length_m REAL"); } catch (e) {}
try { db.exec("ALTER TABLE sale_details ADD COLUMN sheet_count REAL"); } catch (e) {}
try { db.exec("ALTER TABLE sale_details ADD COLUMN measurement_summary TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE quotation_details ADD COLUMN sheet_length_m REAL"); } catch (e) {}
try { db.exec("ALTER TABLE quotation_details ADD COLUMN sheet_count REAL"); } catch (e) {}
try { db.exec("ALTER TABLE quotation_details ADD COLUMN measurement_summary TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE quotations ADD COLUMN quote_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN exchange_rate REAL DEFAULT 6.96"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN currency_mode TEXT DEFAULT 'USD_TO_BS'"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN tractor_model TEXT DEFAULT 'REPUESTOS'"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN sale_condition TEXT DEFAULT 'Stock'"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN validity_label TEXT DEFAULT '7 días'"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN observations TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN subtotal REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN paid_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_code TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_nit TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_phone TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_city TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE quotations ADD COLUMN customer_email TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE sales ADD COLUMN cancel_reason TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN cancelled_at DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE sales ADD COLUMN cancelled_by TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE customers ADD COLUMN points INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE customers ADD COLUMN credit_balance REAL DEFAULT 0"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS branch_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    from_branch TEXT NOT NULL,
    to_branch TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

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

  // Check if database still holds legacy Calamina demo data without tractor parts
  const legacyCalaminaExists = db.prepare("SELECT count(*) as count FROM products WHERE barcode = 'CAL-ZNC-035'").get() as { count: number };
  const hasTractorPart = db.prepare("SELECT count(*) as count FROM products WHERE barcode = 'EM9532'").get() as { count: number };

  if (legacyCalaminaExists.count > 0 && hasTractorPart.count === 0) {
    console.log('Migrating legacy Calamina demo DB to Tractor Spare Parts catalog (91 items)...');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DELETE FROM sale_details;
      DELETE FROM sales;
      DELETE FROM quotation_details;
      DELETE FROM quotations;
      DELETE FROM credit_payments;
      DELETE FROM purchase_details;
      DELETE FROM purchases;
      DELETE FROM branch_transfers;
      DELETE FROM inventory_movements;
      DELETE FROM products;
      DELETE FROM suppliers;
      DELETE FROM customers;
      DELETE FROM expenses;
      DELETE FROM cash_movements;
      DELETE FROM cash_sessions;
      DELETE FROM sqlite_sequence WHERE name IN ('products','suppliers','customers','sales','sale_details','quotations','quotation_details','purchases','purchase_details','inventory_movements','branch_transfers','expenses','cash_sessions','cash_movements');
    `);
    db.pragma('foreign_keys = ON');
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('company_name', 'AgroPartes Tractores S.R.L.');
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('address', 'Av. Agrícola Km 4, Zona Talleres Maquinaria Pesada');
  }

  // Seed Suppliers
  const suppliersCount = db.prepare('SELECT count(*) as count FROM suppliers').get() as { count: number };
  if (suppliersCount.count === 0) {
    console.log('Seeding tractor parts suppliers');
    const insertSup = db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)');
    DEFAULT_TRACTOR_SUPPLIERS.forEach((s) => {
      insertSup.run(s.name, s.phone, s.email, s.address);
    });
  }

  // Seed Tractor Spare Parts (91 items)
  const productsCount = db.prepare('SELECT count(*) as count FROM products WHERE active = 1').get() as { count: number };
  if (productsCount.count === 0) {
    console.log('Seeding 91 tractor spare parts products');
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
    const insertProduct = db.prepare(`
      INSERT INTO products (
        name, description, price, cost_price, stock, min_stock, branch_stocks,
        category, brand, oem_codes, supplier_name, barcode, batch_number, expiry_date, unit_type, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const insertMovement = db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)');

    TRACTOR_PARTS_PRODUCTS.forEach((p) => {
      const res = insertProduct.run(
        p.name,
        p.description || null,
        p.price,
        p.cost_price ?? 0,
        p.stock,
        p.min_stock ?? 0,
        JSON.stringify(p.branch_stocks || { 'Sucursal Central': p.stock, 'Sucursal Norte': 0, 'Sucursal Sur': 0 }),
        p.category,
        p.brand || 'GENERAL',
        p.oem_codes || '',
        p.supplier_name || 'GENERAL',
        p.barcode || '',
        p.supplier_name || p.batch_number || 'GENERAL',
        p.expiry_date || '2030-12-31',
        p.unit_type || 'UNIDAD'
      );
      if (p.stock > 0) {
        insertMovement.run(res.lastInsertRowid, adminUser.id, 'IN', p.stock, `Carga inicial (${p.supplier_name || p.brand || 'Almacén'})`);
      }
    });
  }

  // Seed Customers
  const customersCount = db.prepare('SELECT count(*) as count FROM customers').get() as { count: number };
  if (customersCount.count === 0) {
    console.log('Seeding tractor parts customers');
    const defaultCustomers = [
      ['Estancia Agrícola El Porvenir', 'compras@elporvenir.bo', '78945612', 'Carretera al Norte Km 32'],
      ['Taller Mecánico Diesel & Agro', 'taller.dieselagro@gmail.com', '71239845', 'Av. Cristo Redentor Km 8'],
      ['Cooperativa Cañeros Unidos', 'logistica@canerosunidos.org', '68521479', 'Zona Montero Parque Industrial'],
      ['Ing. Roberto Chávez Mendoza', 'rchavez@agroservicios.bo', '74125896', 'Av. Banzer 4to Anillo #402'],
      ['Hacienda San Ignacio S.R.L.', 'repuestos@sanignacio.com', '77445566', 'Ruta San Ignacio Km 14']
    ];
    const insertCustomer = db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)');
    defaultCustomers.forEach(([name, email, phone, address]) => {
      insertCustomer.run(name, email, phone, address);
    });
  }

  // Seed System Settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM system_settings').get() as { count: number };
  if (settingsCount.count <= 1) {
    console.log('Seeding system settings');
    const defaultSettings = [
      ['company_name', 'AgroPartes Tractores S.R.L.'],
      ['company_nit', '1028495021'],
      ['currency', 'Bs'],
      ['phone', '77889900'],
      ['address', 'Av. Agrícola Km 4, Zona Talleres Maquinaria Pesada'],
      ['tax_percentage', '13'],
      ['exchange_rate', '6.96'],
      ['company_website', 'www.agropartestractores.com']
    ];
    const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(([key, value]) => {
      insertSetting.run(key, value);
    });
  }
  db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)').run('exchange_rate', '6.96');
  db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)').run('company_website', 'www.agropartestractores.com');

  // Seed Initial Sales if empty
  const salesCount = db.prepare('SELECT count(*) as count FROM sales').get() as { count: number };
  if (salesCount.count === 0) {
    console.log('Seeding demo tractor parts sales');
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
    const workshopCust = db.prepare('SELECT id FROM customers LIMIT 1 OFFSET 1').get() as { id: number } | undefined;
    const pistonProd = db.prepare("SELECT id, price FROM products WHERE barcode = 'EM9532'").get() as { id: number; price: number } | undefined;
    const cojineteProd = db.prepare("SELECT id, price FROM products WHERE barcode = '4949'").get() as { id: number; price: number } | undefined;

    if (pistonProd && cojineteProd) {
      const totalAmt = Number((pistonProd.price * 2 + cojineteProd.price).toFixed(2));
      const saleResult = db.prepare('INSERT INTO sales (user_id, customer_id, total, payment_method, cash_amount, paid_amount, with_invoice, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(adminUser.id, workshopCust ? workshopCust.id : null, totalAmt, 'CASH', totalAmt, totalAmt, 1, 'COMPLETED');
      const saleId = saleResult.lastInsertRowid;

      db.prepare('INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(saleId, pistonProd.id, 2, pistonProd.price, Number((pistonProd.price * 2).toFixed(2)));
      db.prepare('INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(saleId, cojineteProd.id, 1, cojineteProd.price, cojineteProd.price);
    }
  }

  const allProds = db.prepare('SELECT id, price, cost_price, barcode, batch_number, expiry_date FROM products').all() as any[];

  // Backfill customer loyalty points if all 0
  const customersWithPoints = db.prepare('SELECT count(*) as count FROM customers WHERE points > 0').get() as { count: number };
  if (customersWithPoints.count === 0) {
    const custs = db.prepare('SELECT id FROM customers').all() as { id: number }[];
    const samplePoints = [240, 165, 320, 90, 410];
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
      ['Alquiler', 'Alquiler tienda y almacén central de repuestos agrícolas', 2400.00, today, 'QR'],
      ['Servicios Básicos', 'Energía eléctrica e internet tienda principal', 380.00, today, 'CASH'],
      ['Logística y Transporte', 'Despacho y flete importación QTP / GB Ricambi', 420.00, today, 'QR']
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
      .run(adminUser.id, 500.00, 150.00, 0.00, 'Apertura de turno Sucursal Central', 'OPEN');
    db.prepare('INSERT INTO cash_movements (session_id, user_id, type, amount, reason) VALUES (?, ?, ?, ?, ?)')
      .run(sessionRes.lastInsertRowid, adminUser.id, 'INCOME', 150.00, 'Fondo sencillo para caja mostrador');
  }

  // Seed a Demo Quotation if none exists
  const quotationCount = db.prepare('SELECT count(*) as count FROM quotations').get() as { count: number };
  if (quotationCount.count === 0 && allProds.length >= 3) {
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number };
    const firstCustomer = db.prepare('SELECT id FROM customers LIMIT 1').get() as { id: number } | undefined;
    const camisaProd = db.prepare("SELECT id, price FROM products WHERE barcode = '51-09415-000'").get() as { id: number; price: number } | undefined;
    const anillaProd = db.prepare("SELECT id, price FROM products WHERE barcode = '4948'").get() as { id: number; price: number } | undefined;
    if (camisaProd && anillaProd) {
      const totalQ = Number((camisaProd.price * 4 + anillaProd.price * 4).toFixed(2));
      const qRes = db.prepare('INSERT INTO quotations (user_id, customer_id, total, valid_until, notes, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(adminUser.id, firstCustomer ? firstCustomer.id : null, totalQ, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], 'Proforma overhaul motor tractor Fiat / Perkins 1104', 'PENDING');
      db.prepare('INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(qRes.lastInsertRowid, camisaProd.id, 4, camisaProd.price, Number((camisaProd.price * 4).toFixed(2)));
      db.prepare('INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
        .run(qRes.lastInsertRowid, anillaProd.id, 4, anillaProd.price, Number((anillaProd.price * 4).toFixed(2)));
    }
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

  app.get('/downloads/agropartes-laravel.zip', (req, res) => {
    const zipPath = path.resolve(process.cwd(), 'public', 'downloads', 'agropartes-laravel.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'Archivo Laravel ZIP no encontrado' });
    }
    res.download(zipPath, 'agropartes-laravel.zip');
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
      const products = db.prepare('SELECT * FROM products WHERE active = 1').all() as any[];
      const formatted = products.map((p) => {
        let parsedBranches: Record<string, number> | undefined;
        if (typeof p.branch_stocks === 'string') {
          try {
            parsedBranches = JSON.parse(p.branch_stocks);
          } catch {
            parsedBranches = { 'Sucursal Central': p.stock || 0, 'Sucursal Norte': 0 };
          }
        } else {
          parsedBranches = p.branch_stocks;
        }
        return {
          ...p,
          branch_stocks: parsedBranches,
        };
      });
      res.json(formatted);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', authenticateToken, isAdmin, (req: any, res) => {
    const {
      name, description, price, cost_price, stock, min_stock, branch_stocks,
      category, brand, oem_codes, supplier_name, barcode, batch_number, expiry_date,
      is_combo, combo_items, unit_type
    } = req.body;
    console.log('Creating tractor part:', { name, price, stock, category, brand });
    try {
      const costVal = cost_price !== undefined ? Number(cost_price) : Number((Number(price) * 0.65).toFixed(2));
      const minStockVal = min_stock !== undefined && min_stock !== null && min_stock !== '' ? Math.max(0, Number(min_stock)) : 0;
      const stockVal = Number(Number(stock || 0).toFixed(2));
      const branchStocksVal = branch_stocks ? (typeof branch_stocks === 'string' ? branch_stocks : JSON.stringify(branch_stocks)) : JSON.stringify({ 'Sucursal Central': stockVal, 'Sucursal Norte': 0, 'Sucursal Sur': 0 });
      const supplierVal = supplier_name || batch_number || 'GENERAL';

      const result = db.prepare(`
        INSERT INTO products (
          name, description, price, cost_price, stock, min_stock, branch_stocks, category,
          brand, oem_codes, supplier_name, barcode, batch_number, expiry_date, is_combo, combo_items, unit_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        description || null,
        price,
        costVal,
        stockVal,
        minStockVal,
        branchStocksVal,
        category || 'MOTOR',
        brand || 'GENERAL',
        oem_codes || '',
        supplierVal,
        barcode || `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierVal,
        expiry_date || '2030-12-31',
        is_combo ? 1 : 0,
        combo_items ? (typeof combo_items === 'string' ? combo_items : JSON.stringify(combo_items)) : null,
        unit_type || 'UNIDAD'
      );
      
      db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
        .run(result.lastInsertRowid, req.user.id, 'IN', stockVal, 'Stock inicial repuesto');
      
      logAudit(req.user.id, 'CREATE', 'PRODUCT', Number(result.lastInsertRowid), `Repuesto creado: ${name}`);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authenticateToken, isAdmin, (req: any, res) => {
    const {
      name, description, price, cost_price, stock, min_stock, branch_stocks,
      category, brand, oem_codes, supplier_name, barcode, batch_number, expiry_date,
      is_combo, combo_items, unit_type
    } = req.body;
    const oldProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    const costVal = cost_price !== undefined ? Number(cost_price) : (oldProduct?.cost_price || Number((Number(price) * 0.65).toFixed(2)));
    const minStockVal = min_stock !== undefined && min_stock !== null && min_stock !== '' ? Math.max(0, Number(min_stock)) : (oldProduct?.min_stock ?? 0);
    const stockVal = Number(Number(stock ?? oldProduct?.stock ?? 0).toFixed(2));
    const branchStocksVal = branch_stocks ? (typeof branch_stocks === 'string' ? branch_stocks : JSON.stringify(branch_stocks)) : (oldProduct?.branch_stocks || JSON.stringify({ 'Sucursal Central': stockVal, 'Sucursal Norte': 0, 'Sucursal Sur': 0 }));
    const supplierVal = supplier_name ?? oldProduct?.supplier_name ?? batch_number ?? oldProduct?.batch_number ?? 'GENERAL';
    
    db.prepare(`
      UPDATE products
      SET name = ?, description = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?, branch_stocks = ?,
          category = ?, brand = ?, oem_codes = ?, supplier_name = ?, barcode = ?, batch_number = ?, expiry_date = ?,
          is_combo = ?, combo_items = ?, unit_type = ?
      WHERE id = ?
    `).run(
      name,
      description || null,
      price,
      costVal,
      stockVal,
      minStockVal,
      branchStocksVal,
      category,
      brand ?? oldProduct?.brand ?? 'GENERAL',
      oem_codes ?? oldProduct?.oem_codes ?? '',
      supplierVal,
      barcode || oldProduct?.barcode || null,
      supplierVal,
      expiry_date || oldProduct?.expiry_date || '2030-12-31',
      is_combo ? 1 : 0,
      combo_items ? (typeof combo_items === 'string' ? combo_items : JSON.stringify(combo_items)) : null,
      unit_type ?? oldProduct?.unit_type ?? 'UNIDAD',
      req.params.id
    );
    
    if (oldProduct && oldProduct.stock !== stockVal) {
      const diff = Number((stockVal - oldProduct.stock).toFixed(2));
      db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.id, req.user.id, diff > 0 ? 'IN' : 'OUT', Math.abs(diff), 'Ajuste manual de stock');
    }

    logAudit(req.user.id, 'UPDATE', 'PRODUCT', Number(req.params.id), `Repuesto actualizado: ${name}`);
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
        const qty = Number(Number(item.quantity || 0).toFixed(2));
        const product = db.prepare('SELECT id, name, stock, is_combo, combo_items FROM products WHERE id = ?').get(item.id) as any;
        if (!product || product.stock + 0.001 < qty) {
          throw new Error(`Stock insuficiente para el material: ${product?.name || item.id}`);
        }

        const newStock = Math.max(0, Number((product.stock - qty).toFixed(2)));
        db.prepare('UPDATE products SET stock = ? WHERE id = ?')
          .run(newStock, item.id);

        db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
          .run(item.id, req.user.id, 'SALE', qty, item.measurement_summary ? `Venta #${saleId} (${item.measurement_summary})` : `Venta #${saleId}`);

        // If it's a combo/kit, also deduct stock of its individual component products
        if (product.is_combo && product.combo_items) {
          try {
            const components = JSON.parse(product.combo_items) as { product_id: number; quantity: number }[];
            for (const comp of components) {
              const compQty = Number((comp.quantity * qty).toFixed(2));
              const compProd = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(comp.product_id) as any;
              if (compProd && compProd.stock >= compQty) {
                db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(Number((compProd.stock - compQty).toFixed(2)), comp.product_id);
                db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
                  .run(comp.product_id, req.user.id, 'SALE', compQty, `Componente Pack (${product.name}) - Venta #${saleId}`);
              }
            }
          } catch (err) {
            console.warn('Error parsing combo_items:', err);
          }
        }

        const subtotalItem = Number((qty * Number(item.price)).toFixed(2));
        db.prepare(`
          INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal, sheet_length_m, sheet_count, measurement_summary)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          saleId,
          item.id,
          qty,
          item.price,
          subtotalItem,
          item.sheet_length_m || null,
          item.sheet_count || null,
          item.measurement_summary || null
        );
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

  app.post('/api/sales/:id/cancel', authenticateToken, (req: any, res) => {
    const { reason } = req.body;
    const cancelReason = reason || 'Anulación solicitada por el usuario';
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id) as any;
      if (!sale) throw new Error('Venta no encontrada');
      if (sale.status === 'CANCELLED') throw new Error('La venta ya está anulada');
      if (req.user.role !== 'Admin' && sale.user_id !== req.user.id) {
        throw new Error('Solo un administrador o el vendedor de la factura pueden anularla.');
      }

      const details = db.prepare('SELECT * FROM sale_details WHERE sale_id = ?').all(req.params.id) as any[];
      
      for (const detail of details) {
        const prod = db.prepare('SELECT stock FROM products WHERE id = ?').get(detail.product_id) as any;
        const restored = Number(((prod?.stock || 0) + Number(detail.quantity || 0)).toFixed(2));
        db.prepare('UPDATE products SET stock = ? WHERE id = ?')
          .run(restored, detail.product_id);
        
        db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
          .run(detail.product_id, req.user.id, 'IN', detail.quantity, `Anulación Factura #${req.params.id}: ${cancelReason}`);
      }

      if (sale.customer_id && sale.credit_amount > 0) {
        const unpaid = Math.max(0, sale.total - (sale.paid_amount || 0));
        db.prepare('UPDATE customers SET credit_balance = MAX(0, COALESCE(credit_balance, 0) - ?) WHERE id = ?')
          .run(unpaid, sale.customer_id);
      }

      db.prepare(`
        UPDATE sales 
        SET status = 'CANCELLED', cancel_reason = ?, cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ? 
        WHERE id = ?
      `).run(cancelReason, req.user.full_name || req.user.username, req.params.id);
      return true;
    });

    try {
      transaction();
      logAudit(req.user.id, 'CANCEL', 'SALE', Number(req.params.id), `Venta anulada ID: ${req.params.id}. Motivo: ${cancelReason}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Branch & Transfers Routes
  app.get('/api/branches', authenticateToken, (req, res) => {
    res.json([
      { id: 1, name: 'Sucursal Central', is_main: true },
      { id: 2, name: 'Sucursal Norte', is_main: false },
      { id: 3, name: 'Sucursal Sur', is_main: false }
    ]);
  });

  app.get('/api/branches/transfers', authenticateToken, (req, res) => {
    try {
      const transfers = db.prepare(`
        SELECT bt.*, p.name as product_name, u.full_name as user_name
        FROM branch_transfers bt
        JOIN products p ON bt.product_id = p.id
        JOIN users u ON bt.user_id = u.id
        ORDER BY bt.created_at DESC
      `).all();
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/branches/transfer', authenticateToken, (req: any, res) => {
    const { product_id, from_branch, to_branch, quantity, notes } = req.body;
    const qty = Number(quantity);

    if (!product_id) return res.status(400).json({ error: 'Debe seleccionar el producto a transferir.' });
    if (!from_branch || !to_branch) return res.status(400).json({ error: 'Debe especificar sucursal origen y destino.' });
    if (from_branch === to_branch) return res.status(400).json({ error: 'La sucursal de origen y la de destino deben ser diferentes.' });
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'La cantidad a transferir debe ser mayor a 0.' });

    const transaction = db.transaction(() => {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
      if (!prod) throw new Error('Producto no encontrado en inventario.');

      let branches: Record<string, number> = {};
      try {
        if (prod.branch_stocks) branches = JSON.parse(prod.branch_stocks);
      } catch {}

      if (!branches[from_branch]) {
        branches['Sucursal Central'] = branches['Sucursal Central'] ?? Math.floor(prod.stock * 0.7);
        branches['Sucursal Norte'] = branches['Sucursal Norte'] ?? Math.ceil(prod.stock * 0.3);
      }

      const available = Number(branches[from_branch] || 0);
      if (available < qty) {
        throw new Error(`Stock insuficiente en ${from_branch}. Disponible actual: ${available} uds.`);
      }

      branches[from_branch] = Number((available - qty).toFixed(2));
      branches[to_branch] = Number((Number(branches[to_branch] || 0) + qty).toFixed(2));

      db.prepare('UPDATE products SET branch_stocks = ? WHERE id = ?')
        .run(JSON.stringify(branches), product_id);

      const result = db.prepare(`
        INSERT INTO branch_transfers (product_id, from_branch, to_branch, quantity, notes, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(product_id, from_branch, to_branch, qty, notes || null, req.user.id);

      db.prepare('INSERT INTO inventory_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)')
        .run(product_id, req.user.id, 'ADJUSTMENT', qty, `Traspaso entre sucursales: ${qty} uds de [${from_branch}] a [${to_branch}]${notes ? ` (${notes})` : ''}`);

      return { transferId: result.lastInsertRowid, branches };
    });

    try {
      const { transferId, branches } = transaction();
      logAudit(req.user.id, 'TRANSFER', 'BRANCH_TRANSFER', Number(transferId), `Traspaso de ${qty} uds de ${from_branch} a ${to_branch}`);
      res.json({ success: true, transferId, updated_stocks: branches });
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
        SELECT q.*,
               u.full_name as seller_name,
               COALESCE(q.customer_name, c.name) as customer_name,
               COALESCE(q.customer_phone, c.phone) as customer_phone,
               COALESCE(q.customer_city, c.address) as customer_city,
               COALESCE(q.customer_email, c.email) as customer_email
        FROM quotations q
        JOIN users u ON q.user_id = u.id
        LEFT JOIN customers c ON q.customer_id = c.id
        ORDER BY q.created_at DESC
      `).all() as any[];

      const withDetails = quotations.map(q => {
        const details = db.prepare(`
          SELECT qd.*, p.name as product_name, p.barcode as product_code
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
    const {
      customer_id,
      customer_name,
      customer_code,
      customer_nit,
      customer_phone,
      customer_city,
      customer_email,
      quote_number,
      exchange_rate,
      currency_mode,
      tractor_model,
      sale_condition,
      validity_label,
      observations,
      subtotal,
      discount_amount,
      paid_amount,
      items,
      total,
      valid_until,
      notes,
    } = req.body;
    const transaction = db.transaction(() => {
      const validDate = valid_until || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const resQ = db.prepare(`
        INSERT INTO quotations (
          user_id, customer_id, quote_number, exchange_rate, currency_mode,
          tractor_model, sale_condition, validity_label, observations,
          subtotal, discount_amount, paid_amount,
          customer_name, customer_code, customer_nit, customer_phone, customer_city, customer_email,
          total, valid_until, notes, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        req.user.id,
        customer_id || null,
        quote_number || null,
        Number(exchange_rate || 6.96),
        currency_mode || 'USD_TO_BS',
        tractor_model || 'REPUESTOS',
        sale_condition || 'Stock',
        validity_label || '7 días',
        observations || '',
        Number(subtotal ?? total ?? 0),
        Number(discount_amount || 0),
        Number(paid_amount || 0),
        customer_name || null,
        customer_code || null,
        customer_nit || null,
        customer_phone || null,
        customer_city || null,
        customer_email || null,
        Number(total || 0),
        validDate,
        notes || observations || 'Cotización válida según fecha indicada'
      );
      const quotationId = resQ.lastInsertRowid;
      if (!quote_number) {
        db.prepare('UPDATE quotations SET quote_number = ? WHERE id = ?').run(
          String(11000 + Number(quotationId)),
          quotationId
        );
      }

      for (const item of items) {
        const qty = Number(Number(item.quantity || 0).toFixed(2));
        const unitPrice = Number(item.price || 0);
        db.prepare(`
          INSERT INTO quotation_details (quotation_id, product_id, quantity, unit_price, subtotal, sheet_length_m, sheet_count, measurement_summary)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          quotationId,
          item.id,
          qty,
          unitPrice,
          Number((qty * unitPrice).toFixed(2)),
          item.sheet_length_m || null,
          item.sheet_count || null,
          item.measurement_summary || null
        );
      }
      return quotationId;
    });

    try {
      const id = transaction();
      logAudit(req.user.id, 'CREATE', 'QUOTATION', Number(id), `Cotización creada por total: ${total} (TC: ${exchange_rate || 6.96})`);
      res.json({ id, quote_number: quote_number || String(11000 + Number(id)) });
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

  app.post('/api/settings', authenticateToken, (req: any, res) => {
    try {
      const { key, value } = req.body;
      if (key !== 'exchange_rate' && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador' });
      }
      db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run(key, String(value));
      logAudit(req.user.id, 'UPDATE', 'SETTINGS', null, `Configuración actualizada: ${key} = ${value}`);
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
      const products = db.prepare('SELECT barcode, name, brand, category, supplier_name, stock, min_stock, price, unit_type FROM products WHERE active = 1').all();
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
      const lowStock = db.prepare(`
        SELECT COUNT(*) as count FROM products 
        WHERE active = 1 AND (
          (COALESCE(min_stock, 0) > 0 AND stock <= COALESCE(min_stock, 0))
          OR (COALESCE(min_stock, 0) = 0 AND stock < 0)
        )
      `).get() as any;
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

      const calcPeriod = (days: number) => {
        const q = `
          SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
          FROM sales
          WHERE status = 'COMPLETED' AND datetime(created_at) >= datetime('now', '-${days} days')
          ${isSeller ? 'AND user_id = ?' : ''}
        `;
        const r = isSeller ? db.prepare(q).get(userId) as any : db.prepare(q).get() as any;
        const count = r?.count || 0;
        const revenue = r?.revenue || 0;
        return {
          count,
          revenue,
          avgTicket: count > 0 ? revenue / count : 0
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

      res.json({
        revenue: totalSales?.total || 0,
        salesCount: salesCount?.count || 0,
        productsCount: productsCount?.count || 0,
        lowStock: lowStock?.count || 0,
        customersCount: customersCount?.count || 0,
        recentSales: recentSales || [],
        salesByDay: salesByDay || [],
        periodMetrics
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

  const PORT = isDev ? 3000 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ¡Servidor AgroPartes Pro (Repuestos de Tractores) iniciado con éxito!');
    console.log(`🏠 Local:    http://localhost:${PORT}`);
    console.log(`🌐 Red:     http://0.0.0.0:${PORT}\n`);
  });
}

startServer();
