import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Users, 
  Package, 
  Truck, 
  DollarSign, 
  Book, 
  Settings, 
  ArrowRight,
  Receipt,
  BookOpen,
  CornerDownLeft
} from 'lucide-react';
import { api, type Cliente, type Producto, type Factura, type CuentaContable } from '../api';

export type ViewType = 
  | 'dashboard' 
  | 'facturacion' 
  | 'cotizaciones' 
  | 'inventario' 
  | 'clientes' 
  | 'compras' 
  | 'proveedores' 
  | 'finanzas' 
  | 'administracion' 
  | 'contabilidad';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

type ItemType = 'PAGE' | 'CLIENTE' | 'FACTURA' | 'PRODUCTO' | 'CUENTA';

interface SearchResultItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  targetView: ViewType;
  raw?: any;
}

const STATIC_PAGES: Array<{ id: string; title: string; subtitle: string; view: ViewType; icon: React.ReactNode }> = [
  { id: 'page-dashboard', title: 'Panel de Control (Dashboard)', subtitle: 'Métricas, KPIs generales y gráficos de rendimiento', view: 'dashboard', icon: <LayoutDashboard size={18} className="text-indigo-400" /> },
  { id: 'page-facturacion', title: 'Facturación & POS', subtitle: 'Punto de venta, cobros, emisión de facturas y boletas', view: 'facturacion', icon: <ShoppingCart size={18} className="text-emerald-400" /> },
  { id: 'page-cotizaciones', title: 'Cotizaciones Comerciales', subtitle: 'Presupuestos y cotizaciones con envío 1-clic por WhatsApp', view: 'cotizaciones', icon: <FileText size={18} className="text-cyan-400" /> },
  { id: 'page-clientes', title: 'Directorio de Clientes', subtitle: 'Gestión de RUTs, teléfonos, correos y cuentas comerciales', view: 'clientes', icon: <Users size={18} className="text-blue-400" /> },
  { id: 'page-inventario', title: 'Inventario & Kardex', subtitle: 'Catálogo de existencias, control de stock mínimo y alertas', view: 'inventario', icon: <Package size={18} className="text-amber-400" /> },
  { id: 'page-compras', title: 'Compras & Abastecimiento', subtitle: 'Recepción de mercaderías e ingreso de inventario', view: 'compras', icon: <Truck size={18} className="text-purple-400" /> },
  { id: 'page-proveedores', title: 'Proveedores & Distribuidores', subtitle: 'Registro de empresas proveedoras y contactos', view: 'proveedores', icon: <Users size={18} className="text-violet-400" /> },
  { id: 'page-finanzas', title: 'Tesorería, Caja & Finanzas', subtitle: 'Flujo de caja, cuentas por cobrar (CxC) y por pagar (CxP)', view: 'finanzas', icon: <DollarSign size={18} className="text-emerald-400" /> },
  { id: 'page-contabilidad', title: 'Contabilidad ERP', subtitle: 'Libro diario, plan de cuentas, balances y asientos contables', view: 'contabilidad', icon: <Book size={18} className="text-rose-400" /> },
  { id: 'page-administracion', title: 'Administración & Configuración', subtitle: 'Parámetros del sistema, usuarios y roles de acceso', view: 'administracion', icon: <Settings size={18} className="text-slate-400" /> },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | ItemType>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Entities state
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('ALL');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      loadEntities();
    }
  }, [isOpen]);

  const loadEntities = async () => {
    setLoadingData(true);
    try {
      const [cliRes, prodRes, facRes, cuenRes] = await Promise.allSettled([
        api.getClientes(),
        api.getProductos(),
        api.getFacturas(),
        api.getCuentasContables(),
      ]);

      if (cliRes.status === 'fulfilled') setClientes(cliRes.value);
      if (prodRes.status === 'fulfilled') setProductos(prodRes.value);
      if (facRes.status === 'fulfilled') setFacturas(facRes.value);
      if (cuenRes.status === 'fulfilled') setCuentas(cuenRes.value);
    } catch (err) {
      console.error('Error cargando entidades para CommandPalette:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Convert raw entities to uniform searchable results
  const allResults = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();

    // 1. Pages
    const pages: SearchResultItem[] = STATIC_PAGES.map(p => ({
      id: p.id,
      type: 'PAGE',
      title: p.title,
      subtitle: p.subtitle,
      category: 'Páginas & Menús',
      icon: p.icon,
      targetView: p.view,
    }));

    // 2. Clientes
    const clientItems: SearchResultItem[] = clientes.map(c => ({
      id: `client-${c.id}`,
      type: 'CLIENTE',
      title: c.nombre,
      subtitle: `RUT: ${c.documentoIdentidad} ${c.telefono ? `• Tel: ${c.telefono}` : ''} ${c.email ? `• ${c.email}` : ''}`,
      category: 'Clientes',
      icon: <Users size={18} className="text-blue-400" />,
      badge: 'Cliente',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      targetView: 'clientes',
      raw: c,
    }));

    // 3. Facturas
    const facturaItems: SearchResultItem[] = facturas.map(f => ({
      id: `factura-${f.id}`,
      type: 'FACTURA',
      title: `Factura #${f.numeroFactura}`,
      subtitle: `Cliente: ${f.cliente?.nombre || 'General'} • Total: $${Number(f.total).toLocaleString('es-CL')} • ${f.metodoPago || 'Efectivo'}`,
      category: 'Facturas',
      icon: <Receipt size={18} className="text-emerald-400" />,
      badge: f.estado,
      badgeColor: f.estado === 'EMITIDA' 
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
        : 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      targetView: 'facturacion',
      raw: f,
    }));

    // 4. Productos
    const productItems: SearchResultItem[] = productos.map(p => ({
      id: `prod-${p.id}`,
      type: 'PRODUCTO',
      title: p.nombre,
      subtitle: `Precio: $${Number(p.precioVenta).toLocaleString('es-CL')} • Stock: ${p.stockActual} un. ${p.codigoBarras ? `• Código: ${p.codigoBarras}` : ''}`,
      category: 'Productos',
      icon: <Package size={18} className="text-amber-400" />,
      badge: `Stock ${p.stockActual}`,
      badgeColor: Number(p.stockActual) <= Number(p.stockMinimo)
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      targetView: 'inventario',
      raw: p,
    }));

    // 5. Cuentas Contables
    const cuentaItems: SearchResultItem[] = cuentas.map(c => ({
      id: `cuenta-${c.id || c.codigo}`,
      type: 'CUENTA',
      title: `${c.codigo} - ${c.nombre}`,
      subtitle: `Tipo: ${c.tipo} • ${c.imputable ? 'Imputable (Asientos)' : 'Cuenta Agrupadora'}`,
      category: 'Plan de Cuentas Contable',
      icon: <BookOpen size={18} className="text-rose-400" />,
      badge: c.tipo,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      targetView: 'contabilidad',
      raw: c,
    }));

    const combined = [...pages, ...clientItems, ...facturaItems, ...productItems, ...cuentaItems];

    if (!q) {
      // If no query, return pages and most recent entities
      return combined.filter(item => {
        if (activeCategory !== 'ALL' && item.type !== activeCategory) return false;
        return true;
      });
    }

    return combined.filter(item => {
      if (activeCategory !== 'ALL' && item.type !== activeCategory) return false;
      const haystack = `${item.title} ${item.subtitle} ${item.category}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, activeCategory, clientes, productos, facturas, cuentas]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  const handleSelectItem = (item: SearchResultItem) => {
    onNavigate(item.targetView);
    onClose();
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (allResults.length > 0 ? (prev + 1) % allResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelectItem(allResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categories: Array<{ id: 'ALL' | ItemType; label: string }> = [
    { id: 'ALL', label: 'Todo' },
    { id: 'PAGE', label: 'Páginas' },
    { id: 'CLIENTE', label: 'Clientes' },
    { id: 'FACTURA', label: 'Facturas' },
    { id: 'PRODUCTO', label: 'Productos' },
    { id: 'CUENTA', label: 'Cuentas' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-start justify-center px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        paddingTop: 'calc(48px + env(safe-area-inset-top, 0px))'
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0d0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search size={20} className="text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar páginas, clientes, facturas, productos, cuentas contables... (ESC para salir)"
            className="w-full bg-transparent border-none text-white text-base placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button 
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Borrar texto"
            >
              <X size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/10 rounded px-2 py-0.5">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/40 overflow-x-auto no-scrollbar text-xs">
          {categories.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
          {loadingData && (
            <span className="text-[11px] text-slate-500 ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              Sincronizando...
            </span>
          )}
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.03] space-y-1 max-h-[50vh]"
        >
          {allResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-slate-400 text-sm">No se encontraron resultados para &ldquo;<span className="text-white font-medium">{query}</span>&rdquo;</p>
              <p className="text-slate-500 text-xs mt-1">Prueba buscando por RUT, número de factura, nombre de producto o cuenta contable.</p>
            </div>
          ) : (
            allResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition text-left ${
                    isSelected 
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm' 
                      : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-500/30' : 'bg-white/5'}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-white">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor || 'bg-white/10 text-white border-white/20'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
                      {item.category}
                    </span>
                    <ArrowRight size={14} className={`transition ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-[10px] text-white">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-[10px] text-white">↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-[10px] text-white flex items-center">
                <CornerDownLeft size={10} />
              </kbd>
              <span>Seleccionar</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Comando Rápido Universal</span>
            <span className="text-indigo-400 font-semibold">• Datrah ERP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
