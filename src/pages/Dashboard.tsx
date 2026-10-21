import { useEffect, useState } from 'react';
import { api, type Factura, type FinanzasResumen } from '../api';
import { DollarSign, Users, ShoppingBag, AlertTriangle, TrendingUp, Activity, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';

interface DashboardStats {
  totalVendido: number;
  totalClientes: number;
  totalProductos: number;
  alertasStock: number;
}

interface ChartDataDay {
  fecha: string;
  total: number;
}

interface ChartDataProduct {
  nombre: string;
  cantidad: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalVendido: 0,
    totalClientes: 0,
    totalProductos: 0,
    alertasStock: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Factura[]>([]);
  const [finanzas, setFinanzas] = useState<FinanzasResumen | null>(null);
  
  // Charts
  const [ventasDiaData, setVentasDiaData] = useState<ChartDataDay[]>([]);
  const [productosEstrellaData, setProductosEstrellaData] = useState<ChartDataProduct[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [facturas, productos, clientes, vDia, pEstrella, fin] = await Promise.all([
          api.getFacturas(),
          api.getProductos(),
          api.getClientes(),
          api.getVentasPorDia(),
          api.getProductosEstrella(),
          api.getFinanzasResumen()
        ]);

        // Calcular estadísticas
        const totalVendido = facturas
          .filter(f => f.estado === 'EMITIDA')
          .reduce((sum, f) => sum + f.total, 0);

        const lowStock = productos.filter(p => Number(p.stockActual) <= Number(p.stockMinimo));

        setStats({
          totalVendido,
          totalClientes: clientes.length,
          totalProductos: productos.length,
          alertasStock: lowStock.length,
        });

        setRecentInvoices(facturas.slice(-5).reverse());
        // Removed lowStockProducts state update as it's no longer used in UI
        
        setVentasDiaData(vDia);
        setProductosEstrellaData(pEstrella);
        setFinanzas(fin);

        // Generate Forecast Data (30-day simulated Cash Flow based on current balance, CxC, CxP)
        const currentBalance = fin.saldoNeto;
        const cxc = fin.outstandingCxC;
        const cxp = fin.outstandingCxP;
        
        let projected = currentBalance;
        const dailyCxC = cxc / 30;
        const dailyCxP = cxp / 30;
        const forecast = [];
        const today = new Date();
        
        for (let i = 0; i <= 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          
          if (i > 0) {
            // Add some realistic noise
            const noise = (Math.random() - 0.5) * (cxc * 0.05);
            projected += dailyCxC - dailyCxP + noise;
          }
          
          forecast.push({
            dia: date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
            saldo: Math.round(projected)
          });
        }
        setForecastData(forecast);

      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-center h-[80vh] flex-col gap-[20px]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted font-mono animate-pulse">Inicializando Datrah Command Center...</p>
      </div>
    );
  }

  const barColors = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div>
      {/* Live Ticker superior */}
      <div className="w-full bg-[#12141d] overflow-hidden flex items-center border border-white/10 rounded-xl mb-32 h-12 relative shadow-lg">
        <div className="bg-primary h-full px-16 flex items-center gap-8 font-bold text-xs uppercase tracking-wider text-white z-10 relative shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
          <Activity size={14} className="animate-pulse" /> LIVE
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-ticker flex gap-32 whitespace-nowrap text-xs font-mono text-muted">
            {recentInvoices.map((inv, i) => (
              <span key={i} className="flex items-center gap-8">
                <span className={inv.estado === 'EMITIDA' ? 'text-success' : 'text-danger'}>{inv.estado === 'EMITIDA' ? '▲' : '▼'}</span>
                FACTURA #{inv.numeroFactura} 
                <span className="text-white">${inv.total.toLocaleString('es-CL')}</span> 
                ({inv.cliente?.nombre})
              </span>
            ))}
            {/* Duplicar para el scroll infinito suave */}
            {recentInvoices.map((inv, i) => (
              <span key={'dup-'+i} className="flex items-center gap-8">
                <span className={inv.estado === 'EMITIDA' ? 'text-success' : 'text-danger'}>{inv.estado === 'EMITIDA' ? '▲' : '▼'}</span>
                FACTURA #{inv.numeroFactura} 
                <span className="text-white">${inv.total.toLocaleString('es-CL')}</span> 
                ({inv.cliente?.nombre})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="content-header mb-28">
        <div className="page-title">
          <div className="module-badge">
            <Zap size={13} className="text-indigo-400" /> Command Center Executive
          </div>
          <h1 className="flex items-center gap-10 font-black text-2xl md:text-3xl">
            Panel de Control General
          </h1>
          <p className="text-muted mt-2">Datrah Systems ERP • Monitor de métricas y rendimiento en tiempo real</p>
        </div>
      </div>

      {stats.alertasStock > 0 && (
        <div className="dashboard-alert-banner mb-28 border border-danger/30 bg-danger/10 p-18 rounded-2xl flex items-center gap-14 shadow-lg shadow-danger/10">
          <div className="p-10 rounded-xl bg-danger/20 text-danger shrink-0">
            <AlertTriangle size={24} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="m-0 text-danger font-bold text-base">Alerta Crítica de Inventario</h4>
            <p className="m-0 text-white/80 text-xs md:text-sm mt-1">
              Existen <strong className="text-white font-bold">{stats.alertasStock} producto(s)</strong> con existencias bajo el stock de seguridad.
            </p>
          </div>
        </div>
      )}

      {/* Grid de Estadísticas Premium Obsidian Luxury */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-20 mb-32">
        <div className="card-stat">
          <div className="card-stat-header">
            <span className="card-stat-label">Flujo Actual Disponible</span>
            <div className="card-stat-icon icon-success">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="card-stat-value text-white">
            ${finanzas?.saldoNeto.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-success font-medium flex items-center gap-4 mt-2">
            <TrendingUp size={13} /> Saldo líquido en caja y bancos
          </div>
        </div>

        <div className="card-stat">
          <div className="card-stat-header">
            <span className="card-stat-label">Ventas Totales</span>
            <div className="card-stat-icon icon-blue">
              <Activity size={20} />
            </div>
          </div>
          <div className="card-stat-value text-white">
            ${stats.totalVendido.toLocaleString('es-CL')}
          </div>
          <div className="text-xs text-indigo-400 font-medium flex items-center gap-4 mt-2">
            Facturas emitidas y confirmadas
          </div>
        </div>

        <div className="card-stat">
          <div className="card-stat-header">
            <span className="card-stat-label">Cuentas por Cobrar (CxC)</span>
            <div className="card-stat-icon icon-warning">
              <Users size={20} />
            </div>
          </div>
          <div className="card-stat-value text-white">
            ${finanzas?.outstandingCxC.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-warning font-medium flex items-center gap-4 mt-2">
            Créditos vigentes de clientes
          </div>
        </div>

        <div className="card-stat">
          <div className="card-stat-header">
            <span className="card-stat-label">Cuentas por Pagar (CxP)</span>
            <div className="card-stat-icon" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'var(--danger)' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="card-stat-value text-white">
            ${finanzas?.outstandingCxP.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-danger font-medium flex items-center gap-4 mt-2">
            Compromisos con proveedores
          </div>
        </div>
      </div>

      {/* Proyector de Flujo de Efectivo (Full Width) */}
      <div className="mb-32">
        <div className="data-card data-card-padded">
          <div className="flex justify-between items-center mb-24">
            <h3 className="m-0 flex items-center gap-8 font-bold text-lg">
              <TrendingUp size={20} className="text-success" /> Proyección de Flujo de Efectivo (30 Días)
            </h3>
            <span className="badge badge-success border-success/30 bg-success/10 text-success">
              Datrah Forecaster AI
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value/1000)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-CL')}`, 'Liquidez Proyectada']}
                />
                <Area type="monotone" dataKey="saldo" fill="url(#colorForecast)" stroke="none" />
                <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 8, fill: '#10b981', stroke: '#1e1e2e', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Área de Gráficos Secundarios */}
      <div className="dashboard-charts-grid mb-32">
        {/* Curva de ventas */}
        <div className="data-card data-card-padded">
          <h3 className="m-0 mb-24 font-bold text-md text-white/80">
            Ventas Diarias (Histórico)
          </h3>
          <div className="chart-container">
            {ventasDiaData.length === 0 ? (
              <div className="chart-placeholder text-muted font-mono text-sm">Sin datos para graficar</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventasDiaData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} width={80} tickFormatter={(value) => `$${(value/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                  />
                  <Area type="monotone" dataKey="total" name="Total ($)" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Productos estrella */}
        <div className="data-card data-card-padded">
          <h3 className="m-0 mb-24 font-bold text-md text-white/80">Top 5 Productos Estrella</h3>
          <div className="chart-container">
            {productosEstrellaData.length === 0 ? (
              <div className="chart-placeholder text-muted font-mono text-sm">Sin ventas registradas</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productosEstrellaData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis dataKey="nombre" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  />
                  <Bar dataKey="cantidad" name="Vendidos" radius={[0, 4, 4, 0]} barSize={16}>
                    {productosEstrellaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// Trigger IDE refresh
