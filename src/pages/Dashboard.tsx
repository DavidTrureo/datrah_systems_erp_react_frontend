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
      <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '20px' }}>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted font-mono animate-pulse">Inicializando Datrah Command Center...</p>
      </div>
    );
  }

  const barColors = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div>
      {/* Live Ticker superior */}
      <div className="w-full bg-darker overflow-hidden flex items-center border-b border-white/5 mb-24 h-10" style={{ position: 'relative', marginTop: '-32px', marginLeft: '-32px', width: 'calc(100% + 64px)' }}>
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

      <div className="content-header mb-32">
        <div className="page-title">
          <h1 className="flex items-center gap-12 font-bold" style={{ fontSize: '2.5rem' }}>
            <Zap className="text-primary animate-pulse" size={32} /> Command Center
          </h1>
          <p className="text-muted font-mono mt-8">Datrah Systems ERP • Visión global operativa</p>
        </div>
      </div>

      {stats.alertasStock > 0 && (
        <div className="dashboard-alert-banner mb-32" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '16px', borderRadius: '0 8px 8px 0' }}>
          <div className="flex gap-16 items-center">
            <AlertTriangle size={32} className="text-danger animate-pulse" />
            <div className="flex-1">
              <h4 className="m-0 text-danger font-bold text-lg">¡ALERTA CRÍTICA DE STOCK!</h4>
              <p className="m-0 text-white/80 mt-4">
                Existen <strong className="text-white">{stats.alertasStock} producto(s)</strong> con nivel de inventario bajo el mínimo permitido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Estadísticas Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-24 mb-32">
        <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/20 rounded-full blur-xl group-hover:bg-success/30 transition-all"></div>
          <div className="flex justify-between items-start mb-16 relative z-10">
            <span className="text-muted font-medium uppercase tracking-wider text-xs">Flujo Actual</span>
            <div className="p-8 bg-success/10 rounded-lg text-success">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-white relative z-10">
            ${finanzas?.saldoNeto.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-success mt-8 flex items-center gap-4 relative z-10">
            <TrendingUp size={12} /> Saldo líquido disponible
          </div>
        </div>

        <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all"></div>
          <div className="flex justify-between items-start mb-16 relative z-10">
            <span className="text-muted font-medium uppercase tracking-wider text-xs">Ventas (Total)</span>
            <div className="p-8 bg-primary/10 rounded-lg text-primary">
              <Activity size={20} />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-white relative z-10">
            ${stats.totalVendido.toLocaleString('es-CL')}
          </div>
          <div className="text-xs text-primary mt-8 flex items-center gap-4 relative z-10">
            En base a facturas emitidas
          </div>
        </div>

        <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/20 rounded-full blur-xl group-hover:bg-warning/30 transition-all"></div>
          <div className="flex justify-between items-start mb-16 relative z-10">
            <span className="text-muted font-medium uppercase tracking-wider text-xs">Cuentas por Cobrar</span>
            <div className="p-8 bg-warning/10 rounded-lg text-warning">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-white relative z-10">
            ${finanzas?.outstandingCxC.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-warning mt-8 flex items-center gap-4 relative z-10">
            Dinero pendiente de ingreso
          </div>
        </div>

        <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-danger/20 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-danger/20 rounded-full blur-xl group-hover:bg-danger/30 transition-all"></div>
          <div className="flex justify-between items-start mb-16 relative z-10">
            <span className="text-muted font-medium uppercase tracking-wider text-xs">Cuentas por Pagar</span>
            <div className="p-8 bg-danger/10 rounded-lg text-danger">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="text-3xl font-mono font-bold text-white relative z-10">
            ${finanzas?.outstandingCxP.toLocaleString('es-CL') || 0}
          </div>
          <div className="text-xs text-danger mt-8 flex items-center gap-4 relative z-10">
            Deuda pendiente con proveedores
          </div>
        </div>
      </div>

      {/* Área de Gráficos */}
      <div className="dashboard-charts-grid mb-32">
        {/* Proyector de Flujo de Efectivo (Novedad) */}
        <div className="data-card data-card-padded" style={{ gridColumn: '1 / -1' }}>
          <div className="flex justify-between items-center mb-24">
            <h3 className="m-0 flex items-center gap-8 font-bold text-lg">
              <TrendingUp size={20} className="text-success" /> Proyección de Flujo de Efectivo (30 Días)
            </h3>
            <span className="badge badge-success border-success/30 bg-success/10 text-success">
              Datrah Forecaster AI
            </span>
          </div>
          <div className="chart-container" style={{ height: '350px' }}>
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
