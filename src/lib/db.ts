import Dexie, { type Table } from 'dexie';
import { Product, Customer, Sale, InventoryMovement, User, Purchase } from '../types';

export class SoftplusDB extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  purchases!: Table<Purchase>;
  inventoryMovements!: Table<InventoryMovement>;
  users!: Table<User>;
  settings!: Table<{ key: string; value: any }>;
  syncQueue!: Table<{
    id?: number;
    endpoint: string;
    method: string;
    body: any;
    timestamp: number;
  }>;

  constructor() {
    super('SoftplusDB');
    this.version(1).stores({
      products: '++id, name, category',
      customers: '++id, name, email',
      sales: '++id, user_id, customer_id, created_at',
      purchases: '++id, supplier_id, created_at',
      inventoryMovements: '++id, product_id, user_id, created_at',
      users: '++id, username',
      settings: 'key',
      syncQueue: '++id, timestamp'
    });
  }
}

export const db = new SoftplusDB();
