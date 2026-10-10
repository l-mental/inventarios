import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Expense, FinanceSummary, CashSession } from '../types';
import {
  TrendingUp,
  DollarSign,
  Plus,
  Trash2,
  Download,
  Printer,
  RefreshCw,
  Award,
  BarChart3,
  Wallet,
  Receipt,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

const EXPENSE_CATEGORIES = [
  'Alquiler',
  'Servicios Básicos',
  'Sueldos y Comisiones',
  'Internet y Sistemas',
  'Logística y Transporte',
  'Publicidad y Marketing',
  'Mantenimiento',
  'Impuestos y Tasas',
  'Otros Gastos'
];

export default function Finance() {
  const { formatPrice, settings } = useSettings();
  const { token, user } = useAuth();
  const { apiFetch } = useApi();

  const [activeTab, setActiveTab] = useState<'profitability' | 'expenses' | 'cash_history'>('profitability');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashHistory, setCashHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  // New Expense Form
  const [newExpense, setNewExpense] = useState({
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'CASH'
  });

  const isAdmin = user?.role === 'Admin';
  const taxRate = parseFloat(settings.tax_percentage || '13') / 100;

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [sumData, expData, cashData] = await Promise.all([
        apiFetch('/api/finance/summary'),
        apiFetch('/api/expenses'),
        apiFetch('/api/cash/history')
      ]);
      setSummary(sumData);
      setExpenses(expData);
      setCashHistory(cashData);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [token]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        })
      });
      setNewExpense({
        ...newExpense,
        description: '',
        amount: ''
      });
      fetchFinanceData();
    } catch (err) {
      console.error('Error creating expense:', err);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchFinanceData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const handleExportAccountingExcel = () => {
    if (!summary) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen Financiero y Tributario
    const taxAmount = Number((summary.revenue * taxRate).toFixed(2));
    const netRevenueExTax = Number((summary.revenue - taxAmount).toFixed(2));

    const summaryRows = [
      { Concepto: 'Ingresos Brutos por Ventas', Monto: summary.revenue },
      { Concepto: `Impuesto Estimado (${(taxRate * 100).toFixed(0)}% IVA/IGV)`, Monto: taxAmount },
      { Concepto: 'Ventas Netas sin Impuestos', Monto: netRevenueExTax },
      { Concepto: 'Costo de Mercadería Vendida (CMV)', Monto: summary.cogs },
      { Concepto: 'Ganancia Bruta en Ventas', Monto: summary.grossProfit },
      { Concepto: 'Total Gastos Operativos', Monto: summary.totalExpenses },
      { Concepto: 'UTILIDAD NETA REAL DEL PERIODO', Monto: summary.netProfit },
      { Concepto: 'Cuentas por Cobrar Pendientes (Créditos)', Monto: summary.pendingCredits },
      { Concepto: 'Total Compras a Proveedores', Monto: summary.totalPurchases }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Estado_Resultados');

    // Sheet 2: Rentabilidad por Producto
    const prodRows = summary.productProfitability.map(p => ({
      ID: p.id,
      Producto: p.name,
      Categoria: p.category,
      Unidades_Vendidas: p.units_sold,
      Precio_Venta: p.price,
      Costo_Unitario: p.cost_price,
      Ingresos_Totales: p.revenue,
      Costo_Total_Vendido: p.total_cost,
      Utilidad_Real: p.profit,
      Margen_Porcentaje: `${p.margin_percent}%`
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodRows), 'Rentabilidad_Productos');

    // Sheet 3: Gastos Operativos
    const expRows = expenses.map(e => ({
      Fecha: e.expense_date,
      Categoria: e.category,
      Descripcion: e.description,
      Metodo_Pago: e.payment_method,
      Monto: e.amount,
      Registrado_Por: e.user_name || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'Gastos_Operativos');

    // Sheet 4: Ranking y Comisiones por Vendedor
    const sellerRows = summary.sellerRanking.map(s => ({
      Vendedor: s.full_name,
      Rol: s.role,
      Ventas_Cerradas: s.sales_count,
      Total_Recaudado: s.total_revenue,
      Comision_5_Porciento: s.commission
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sellerRows), 'Ranking_Vendedores');

    XLSX.writeFile(wb, `Reporte_Contable_Softplus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Gerencia <ChevronRight className="w-3 h-3 text-brand" /> Finanzas y Rentabilidad
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded shadow-lg shadow-brand/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                Finanzas y Reportes
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Utilidad Neta Real, Gastos Operativos, Comisiones y Exportación Contable
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAccountingExcel}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black uppercase tracking-widest text-[10px] shadow-md flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar Contabilidad (.xlsx)
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir PDF
          </button>
          <button
            onClick={fetchFinanceData}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Financial Executive KPIs */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ventas Brutas</p>
            <p className="text-2xl font-display font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatPrice(summary.revenue)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              IVA/IGV ({settings.tax_percentage || 13}%): {formatPrice(summary.revenue * taxRate)}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ganancia Bruta Ventas</p>
            <p className="text-2xl font-display font-black text-blue-600 dark:text-blue-400 tabular-nums mt-1">
              {formatPrice(summary.grossProfit)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Costo Mercadería: {formatPrice(summary.cogs)}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Gastos Operativos</p>
            <p className="text-2xl font-display font-black text-rose-600 dark:text-rose-400 tabular-nums mt-1">
              -{formatPrice(summary.totalExpenses)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Alquiler, luz, internet, logística
            </p>
          </div>

          <div className={`p-5 rounded-lg border shadow-sm ${summary.netProfit >= 0 ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-500/30'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Utilidad Neta Real</p>
            <p className={`text-2xl font-display font-black tabular-nums mt-1 ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatPrice(summary.netProfit)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Ganancia Bruta - Gastos Operativos
            </p>
          </div>

          <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg border border-amber-500/20 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Cuentas por Cobrar</p>
            <p className="text-2xl font-display font-black text-amber-600 dark:text-amber-400 tabular-nums mt-1">
              {formatPrice(summary.pendingCredits)}
            </p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-1">
              Saldo pendiente en ventas al crédito
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'profitability'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Rentabilidad por Producto y Vendedor
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Gastos Operativos ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('cash_history')}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'cash_history'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          Historial Arqueos de Caja
        </button>
      </div>

      {/* TAB 1: Product & Seller Profitability */}
      {activeTab === 'profitability' && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Profitability Table */}
          <div className="lg:col-span-2 tech-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black uppercase italic text-sm text-slate-900 dark:text-white">
                  Rentabilidad Real por Producto
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Desglose de Costo vs. Precio de Venta y Margen Neto
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Vendidos</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Costo / Venta</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ingresos</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Utilidad Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {summary.productProfitability.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.category} · Margen Unitario: {p.margin_percent}%</p>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {p.units_sold}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-slate-500">
                        {formatPrice(p.cost_price)} / <span className="font-bold text-slate-900 dark:text-white">{formatPrice(p.price)}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatPrice(p.revenue)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(p.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seller Ranking & Commissions */}
          <div className="space-y-6">
            <div className="tech-card p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <Award className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-display font-black uppercase italic text-sm text-slate-900 dark:text-white">
                    Ranking por Vendedor
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Ventas cerradas y comisión (5%)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {summary.sellerRanking.map((s, idx) => (
                  <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-brand">0{idx + 1}.</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{s.full_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {s.sales_count} ventas completadas · Rol: {s.role}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatPrice(s.total_revenue)}</p>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Comisión: {formatPrice(s.commission)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses Breakdown by Category */}
            <div className="tech-card p-6 space-y-4">
              <h3 className="font-display font-black uppercase italic text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Distribución de Gastos Operativos
              </h3>
              <div className="space-y-2.5">
                {summary.expensesByCategory.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">{cat.category}</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatPrice(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Operating Expenses Management */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddExpense} className="tech-card p-6 space-y-4 h-fit">
            <h3 className="font-display font-black uppercase italic text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Registrar Gasto Operativo
            </h3>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Categoría de Gasto</label>
              <select
                value={newExpense.category}
                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Descripción / Concepto</label>
              <input
                type="text"
                required
                placeholder="Ej. Pago de luz eléctrica mes actual"
                value={newExpense.description}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Monto</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha</label>
                <input
                  type="date"
                  required
                  value={newExpense.expense_date}
                  onChange={e => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand text-white rounded font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Guardar Gasto
            </button>
          </form>

          <div className="lg:col-span-2 tech-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                    <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                    {isAdmin && <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{exp.expense_date}</td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">{exp.category}</td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">{exp.description}</td>
                      <td className="px-5 py-4 text-right font-mono font-black text-xs text-rose-600 dark:text-rose-400">
                        -{formatPrice(exp.amount)}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Cash Register Sessions History */}
      {activeTab === 'cash_history' && (
        <div className="tech-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sesión</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cajero</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Apertura</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto Inicial</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Esperado</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Real Cierre</th>
                  <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {cashHistory.map(cs => (
                  <tr key={cs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">#CAJA-{cs.id}</td>
                    <td className="px-5 py-4 text-xs text-slate-700 dark:text-slate-300">{cs.user_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{new Date(cs.opened_at).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-mono text-xs">{formatPrice(cs.opening_amount)}</td>
                    <td className="px-5 py-4 text-right font-mono text-xs font-bold">{cs.expected_amount ? formatPrice(cs.expected_amount) : '-'}</td>
                    <td className="px-5 py-4 text-right font-mono text-xs font-black text-emerald-600">{cs.closing_amount ? formatPrice(cs.closing_amount) : '-'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-[10px] font-black uppercase ${cs.status === 'OPEN' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {cs.status === 'OPEN' ? 'En Curso' : 'Cerrada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
