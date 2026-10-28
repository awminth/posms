import React, { useState } from 'react';
import {
  Database,
  Table,
  Key,
  Link,
  Code2,
  Copy,
  Check,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SchemaTable {
  name: string;
  category: string;
  description: string;
  columns: {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    references?: string;
    nullable?: boolean;
    description?: string;
  }[];
}

export const DatabaseSchemaViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('branches');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'tables' | 'sql'>('tables');

  const schemaTables: SchemaTable[] = [
    {
      name: 'branches',
      category: 'Multi-Store',
      description: 'Physical retail outlets, stores, and central warehouse hubs.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'UUID Primary Key' },
        { name: 'code', type: 'VARCHAR(20)', nullable: false, description: 'Unique branch code (e.g. BR-YGN-01)' },
        { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Store outlet name' },
        { name: 'type', type: 'VARCHAR(30)', description: 'RETAIL, WAREHOUSE, EXPRESS' },
        { name: 'address', type: 'TEXT', nullable: false, description: 'Street address' },
        { name: 'city', type: 'VARCHAR(50)', nullable: false, description: 'City (Yangon, Mandalay)' },
        { name: 'phone', type: 'VARCHAR(30)', nullable: false, description: 'Primary contact phone' },
        { name: 'email', type: 'VARCHAR(100)', description: 'Branch email' },
        { name: 'tax_rate', type: 'DECIMAL(5,2)', description: 'Commercial tax rate percentage (e.g. 5.00%)' },
        { name: 'currency', type: 'VARCHAR(10)', description: 'Default currency (MMK, USD)' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Operational status' },
      ],
    },
    {
      name: 'users',
      category: 'Auth & Staff',
      description: 'Cashiers, branch managers, inventory clerks, and superadmins.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)', description: 'Assigned branch (NULL for SuperAdmin)' },
        { name: 'username', type: 'VARCHAR(50)', nullable: false },
        { name: 'full_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(100)' },
        { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
        { name: 'pin_code', type: 'VARCHAR(10)', description: 'Quick 4-digit terminal cashier PIN' },
        { name: 'role', type: 'VARCHAR(30)', description: 'SUPER_ADMIN, BRANCH_MANAGER, CASHIER, INVENTORY_CLERK' },
        { name: 'is_active', type: 'BOOLEAN' },
      ],
    },
    {
      name: 'categories',
      category: 'Catalog',
      description: 'Product category taxonomy with display ordering and visual styling.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'slug', type: 'VARCHAR(100)', nullable: false },
        { name: 'icon', type: 'VARCHAR(50)', description: 'Lucide icon identifier' },
        { name: 'color_code', type: 'VARCHAR(20)' },
        { name: 'display_order', type: 'INT' },
      ],
    },
    {
      name: 'products',
      category: 'Catalog',
      description: 'Global master catalog items shared across the enterprise.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'category_id', type: 'VARCHAR(36)', isForeign: true, references: 'categories(id)' },
        { name: 'sku', type: 'VARCHAR(50)', nullable: false, description: 'Unique Stock Keeping Unit' },
        { name: 'barcode', type: 'VARCHAR(50)', description: 'EAN-13 / UPC Barcode' },
        { name: 'name', type: 'VARCHAR(150)', nullable: false },
        { name: 'cost_price', type: 'DECIMAL(12,2)' },
        { name: 'selling_price', type: 'DECIMAL(12,2)' },
        { name: 'unit', type: 'VARCHAR(20)', description: 'pcs, cup, slice, pack, kg' },
        { name: 'image_url', type: 'TEXT' },
        { name: 'track_stock', type: 'BOOLEAN' },
      ],
    },
    {
      name: 'branch_stocks',
      category: 'Inventory',
      description: 'Multi-branch stock quantity on hand, thresholds, and shelf locations.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'product_id', type: 'VARCHAR(36)', isForeign: true, references: 'products(id)' },
        { name: 'quantity_on_hand', type: 'INT', nullable: false, description: 'Live quantity available' },
        { name: 'reorder_level', type: 'INT', description: 'Low stock warning trigger threshold' },
        { name: 'ideal_stock', type: 'INT' },
        { name: 'shelf_location', type: 'VARCHAR(50)', description: 'Physical aisle / shelf coordinate' },
      ],
    },
    {
      name: 'stock_transfers',
      category: 'Inventory',
      description: 'Inter-branch stock dispatch, logistics transit, and receiving workflow.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'transfer_number', type: 'VARCHAR(30)', nullable: false, description: 'TRF-YYYY-XXXX' },
        { name: 'source_branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'destination_branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'status', type: 'VARCHAR(30)', description: 'PENDING, IN_TRANSIT, RECEIVED, CANCELLED' },
        { name: 'requested_by', type: 'VARCHAR(36)', isForeign: true, references: 'users(id)' },
        { name: 'notes', type: 'TEXT' },
      ],
    },
    {
      name: 'registers',
      category: 'Operations',
      description: 'Physical POS terminal hardware definitions.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'name', type: 'VARCHAR(50)', description: 'Terminal name (e.g. POS 01)' },
        { name: 'terminal_code', type: 'VARCHAR(30)', nullable: false },
        { name: 'is_active', type: 'BOOLEAN' },
      ],
    },
    {
      name: 'shifts',
      category: 'Operations',
      description: 'Cashier work periods, opening float, cash sales, and blind cash balancing.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'register_id', type: 'VARCHAR(36)', isForeign: true, references: 'registers(id)' },
        { name: 'cashier_id', type: 'VARCHAR(36)', isForeign: true, references: 'users(id)' },
        { name: 'opening_float', type: 'DECIMAL(12,2)', nullable: false },
        { name: 'expected_cash', type: 'DECIMAL(12,2)' },
        { name: 'actual_cash', type: 'DECIMAL(12,2)', description: 'Physical cash counted at close' },
        { name: 'difference', type: 'DECIMAL(12,2)', description: 'Over / Shortage' },
        { name: 'status', type: 'VARCHAR(20)', description: 'OPEN, CLOSED' },
      ],
    },
    {
      name: 'customers',
      category: 'CRM',
      description: 'Customer loyalty members, reward points, and lifetime spend.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'phone', type: 'VARCHAR(30)' },
        { name: 'email', type: 'VARCHAR(100)' },
        { name: 'loyalty_tier', type: 'VARCHAR(20)', description: 'REGULAR, SILVER, GOLD, VIP' },
        { name: 'loyalty_points', type: 'INT' },
        { name: 'total_spent', type: 'DECIMAL(14,2)' },
      ],
    },
    {
      name: 'orders',
      category: 'Transactions',
      description: 'Completed checkout orders, discounts, taxes, and customer links.',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'order_number', type: 'VARCHAR(40)', nullable: false },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'shift_id', type: 'VARCHAR(36)', isForeign: true, references: 'shifts(id)' },
        { name: 'cashier_id', type: 'VARCHAR(36)', isForeign: true, references: 'users(id)' },
        { name: 'customer_id', type: 'VARCHAR(36)', isForeign: true, references: 'customers(id)' },
        { name: 'subtotal', type: 'DECIMAL(12,2)' },
        { name: 'tax_amount', type: 'DECIMAL(12,2)' },
        { name: 'grand_total', type: 'DECIMAL(12,2)' },
        { name: 'order_status', type: 'VARCHAR(20)', description: 'COMPLETED, VOIDED, HOLD' },
      ],
    },
    {
      name: 'payments',
      category: 'Transactions',
      description: 'Split-tender and multi-method payments (Cash, KBZPay, WavePay, Card).',
      columns: [
        { name: 'id', type: 'VARCHAR(36)', isPrimary: true },
        { name: 'order_id', type: 'VARCHAR(36)', isForeign: true, references: 'orders(id)' },
        { name: 'branch_id', type: 'VARCHAR(36)', isForeign: true, references: 'branches(id)' },
        { name: 'payment_method', type: 'VARCHAR(30)', description: 'CASH, KBZ_PAY, WAVE_PAY, CREDIT_CARD' },
        { name: 'amount', type: 'DECIMAL(12,2)' },
        { name: 'change_given', type: 'DECIMAL(12,2)' },
        { name: 'transaction_ref', type: 'VARCHAR(100)' },
      ],
    },
  ];

  const currentTableData = schemaTables.find((t) => t.name === selectedTable) || schemaTables[0];

  const rawSqlSample = `-- Located in: /backend/database/schema.sql
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'RETAIL',
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 5.00,
    currency VARCHAR(10) DEFAULT 'MMK',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branch_stocks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    shelf_location VARCHAR(50),
    CONSTRAINT unique_branch_product UNIQUE (branch_id, product_id)
);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(40) NOT NULL UNIQUE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    customer_id VARCHAR(36) REFERENCES customers(id),
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    grand_total DECIMAL(12, 2) NOT NULL,
    order_status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawSqlSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="database-schema-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Relational Database Architecture
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-mono font-bold">
              11 Tables • Multi-Branch
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured relational design configured in <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-teal-600">/backend/database/schema.sql</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('tables')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              viewMode === 'tables'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5 inline mr-1" />
            <span>Table Browser</span>
          </button>
          <button
            onClick={() => setViewMode('sql')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              viewMode === 'sql'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 inline mr-1" />
            <span>Raw SQL Schema</span>
          </button>
        </div>
      </div>

      {viewMode === 'tables' ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Tables Sidebar */}
          <div className="w-full md:w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-1 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-2">
              Database Entity Tables
            </span>
            {schemaTables.map((t) => {
              const isSelected = selectedTable === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                    <span className="font-mono">{t.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">
                    {t.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Fields View */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-mono font-extrabold text-slate-900">
                    table: {currentTableData.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs font-bold">
                    {currentTableData.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{currentTableData.description}</p>
              </div>

              {/* Columns Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Column Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Constraints</th>
                      <th className="py-2.5 px-4 font-sans">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentTableData.columns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {col.isPrimary && <Key className="w-3.5 h-3.5 text-amber-500" />}
                            {col.isForeign && <Link className="w-3.5 h-3.5 text-teal-500" />}
                            <span>{col.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-teal-600 font-semibold">{col.type}</td>
                        <td className="py-2.5 px-4">
                          {col.isPrimary && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              PRIMARY KEY
                            </span>
                          )}
                          {col.isForeign && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                              FK &rarr; {col.references}
                            </span>
                          )}
                          {col.nullable === false && !col.isPrimary && (
                            <span className="text-slate-400 text-[10px]">NOT NULL</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-500 text-xs">
                          {col.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architectural Highlights */}
            <div className="p-5 rounded-2xl bg-teal-900 text-white space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-300" />
                <span>Multi-Branch Isolation Architecture</span>
              </h4>
              <p className="text-xs text-teal-200 leading-relaxed">
                All transactional entities (<code className="font-mono text-white bg-teal-950/80 px-1 py-0.5 rounded">orders</code>, <code className="font-mono text-white bg-teal-950/80 px-1 py-0.5 rounded">payments</code>, <code className="font-mono text-white bg-teal-950/80 px-1 py-0.5 rounded">branch_stocks</code>, <code className="font-mono text-white bg-teal-950/80 px-1 py-0.5 rounded">shifts</code>) feature foreign keys referencing <code className="font-mono text-white bg-teal-950/80 px-1 py-0.5 rounded">branches.id</code>. This guarantees strict data partition by store while allowing unified reporting for company executives.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Raw SQL Code View */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">backend/database/schema.sql (PostgreSQL DDL)</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-6 font-mono text-xs text-teal-200 overflow-auto flex-1 leading-relaxed selection:bg-teal-600 selection:text-white">
              {rawSqlSample}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
