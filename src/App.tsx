import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Facturacion from './pages/Facturacion';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Login from './pages/Login';
import { api, type LoginResponse, type Producto } from './api';
import { LayoutDashboard, ShoppingCart, Package, Users, Truck, LogOut, Bell, DollarSign, Book, FileText, Menu, X, Search } from 'lucide-react';
import Finanzas from './pages/Finanzas';
import Administracion from './pages/Administracion';
import Contabilidad from './pages/Contabilidad';
import { Copilot } from './components/Copilot';
import Cotizaciones from './pages/Cotizaciones';
import { CommandPalette } from './components/CommandPalette';

type ViewType = 'dashboard' | 'facturacion' | 'cotizaciones' | 'inventario' | 'clientes' | 'compras' | 'proveedores' | 'finanzas' | 'administracion' | 'contabilidad';

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Escuchar atajo de teclado universal Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: ViewType) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  // Stock Alerts States
  const [bajoStock, setBajoStock] = useState<Producto[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const checkBajoStock = async () => {
    try {
      const res = await api.getProductosBajoStock();
      setBajoStock(res);
    } catch (err) {
      console.error("Error al obtener alertas de stock:", err);
    }
  };

  useEffect(() => {
    // Cargar usuario autenticado de localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Error al cargar sesión local", err);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.authenticated) {
      checkBajoStock();
      // Escuchar eventos globales de recarga de stock
      window.addEventListener('refresh-bajo-stock', checkBajoStock);
      // Chequear cada 15 segundos
      const interval = setInterval(checkBajoStock, 15000);
      
      return () => {
        window.removeEventListener('refresh-bajo-stock', checkBajoStock);
        clearInterval(interval);
      };
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: LoginResponse) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  if (loading) {
    return <div className="loading-app">Cargando Aplicación...</div>;
  }

  // Si no está autenticado, mostrar login
  if (!currentUser || !currentUser.authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = (currentUser.username?.toLowerCase() === 'admin' || currentUser.nombre?.toLowerCase().includes('administrador'))
    ? 'ADMIN'
    : (currentUser.rol || 'VENTAS');
  const isAdmin = userRole === 'ADMIN';
  const isGerencia = userRole === 'GERENCIA';
  const isBodega = userRole === 'BODEGA';
  const isVentas = userRole === 'VENTAS';
  const isFinanzas = userRole === 'FINANZAS';

  const canViewInventario = isAdmin || isGerencia || isBodega || isVentas;
  const canViewCompras = isAdmin || isGerencia || isBodega;
  const canViewProveedores = isAdmin || isGerencia || isBodega;
  
  const canViewFacturacion = isAdmin || isGerencia || isVentas;
  const canViewClientes = isAdmin || isGerencia || isVentas;
  
  const canViewFinanzas = isAdmin || isGerencia || isFinanzas;
  const canViewContabilidad = isAdmin || isGerencia || isFinanzas;
  
  const canViewAdmin = isAdmin;

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventario':
        return canViewInventario ? <Inventario /> : <Dashboard />;
      case 'facturacion':
        return canViewFacturacion ? <Facturacion /> : <Dashboard />;
      case 'cotizaciones':
        return canViewFacturacion ? <Cotizaciones /> : <Dashboard />;
      case 'clientes':
        return canViewClientes ? <Clientes /> : <Dashboard />;
      case 'proveedores':
        return canViewProveedores ? <Proveedores /> : <Dashboard />;
      case 'compras':
        return canViewCompras ? <Compras /> : <Dashboard />;
      case 'finanzas':
        return canViewFinanzas ? <Finanzas /> : <Dashboard />;
      case 'contabilidad':
        return canViewContabilidad ? <Contabilidad /> : <Dashboard />;
      case 'administracion':
        return canViewAdmin ? <Administracion /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Backdrop para móviles al abrir el drawer */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar de Navegación con soporte off-canvas móvil */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-top-bar">
          <div className="logo-container app-logo-container">
            <img src="/logo.png" alt="Datrah Systems ERP" className="w-36 h-auto object-contain" />
          </div>
          <button 
            className="sidebar-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info del usuario logueado */}
        <div className="sidebar-user-section">
          <div className="sidebar-user-name">{currentUser.nombre}</div>
          <div className="sidebar-user-status">
            <span className="status-dot"></span>
            <span>{userRole}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-links">
            <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}>
              <a href="#dashboard" onClick={() => handleNavigate('dashboard')}>
                <LayoutDashboard size={20} />
                <span>Panel Control</span>
              </a>
            </li>
            
            {/* Sección Comercial */}
            {(canViewFacturacion || canViewClientes) && (
              <div className="sidebar-section-header">
                <span>Comercial</span>
              </div>
            )}
            {canViewFacturacion && (
              <>
                <li className={`nav-item ${activeView === 'facturacion' ? 'active' : ''}`}>
                  <a href="#facturacion" onClick={() => handleNavigate('facturacion')}>
                    <ShoppingCart size={20} />
                    <span>Facturación (POS)</span>
                  </a>
                </li>
                <li className={`nav-item ${activeView === 'cotizaciones' ? 'active' : ''}`}>
                  <a href="#cotizaciones" onClick={() => handleNavigate('cotizaciones')}>
                    <FileText size={20} />
                    <span>Cotizaciones</span>
                  </a>
                </li>
              </>
            )}
            {canViewClientes && (
              <li className={`nav-item ${activeView === 'clientes' ? 'active' : ''}`}>
                <a href="#clientes" onClick={() => handleNavigate('clientes')}>
                  <Users size={20} />
                  <span>Clientes</span>
                </a>
              </li>
            )}

            {/* Sección Operaciones */}
            {(canViewInventario || canViewCompras || canViewProveedores) && (
              <div className="sidebar-section-header">
                <span>Operaciones</span>
              </div>
            )}
            {canViewInventario && (
              <li className={`nav-item ${activeView === 'inventario' ? 'active' : ''}`}>
                <a href="#inventario" onClick={() => handleNavigate('inventario')}>
                  <Package size={20} />
                  <span>Inventario & Kardex</span>
                </a>
              </li>
            )}
            {canViewCompras && (
              <li className={`nav-item ${activeView === 'compras' ? 'active' : ''}`}>
                <a href="#compras" onClick={() => handleNavigate('compras')}>
                  <Truck size={20} />
                  <span>Compras (Stock)</span>
                </a>
              </li>
            )}
            {canViewProveedores && (
              <li className={`nav-item ${activeView === 'proveedores' ? 'active' : ''}`}>
                <a href="#proveedores" onClick={() => handleNavigate('proveedores')}>
                  <Users size={20} />
                  <span>Proveedores</span>
                </a>
              </li>
            )}

            {/* Sección Finanzas & Contabilidad */}
            {(canViewFinanzas || canViewContabilidad) && (
              <div className="sidebar-section-header">
                <span>Finanzas</span>
              </div>
            )}
            {canViewFinanzas && (
              <li className={`nav-item ${activeView === 'finanzas' ? 'active' : ''}`}>
                <a href="#finanzas" onClick={() => handleNavigate('finanzas')}>
                  <DollarSign size={20} />
                  <span>Tesorería / Caja</span>
                </a>
              </li>
            )}
            {canViewContabilidad && (
              <li className={`nav-item ${activeView === 'contabilidad' ? 'active' : ''}`}>
                <a href="#contabilidad" onClick={() => handleNavigate('contabilidad')}>
                  <Book size={20} />
                  <span>Contabilidad (ERP)</span>
                </a>
              </li>
            )}

            {/* Sección Sistema */}
            {canViewAdmin && (
              <div className="sidebar-section-header">
                <span>Sistema</span>
              </div>
            )}
            {canViewAdmin && (
              <li className={`nav-item ${activeView === 'administracion' ? 'active' : ''}`}>
                <a href="#administracion" onClick={() => handleNavigate('administracion')}>
                  <Users size={20} />
                  <span>Administración</span>
                </a>
              </li>
            )}
          </ul>
        </nav>

        {/* Botón de Logout */}
        <div className="sidebar-footer">
          <ul className="nav-links">
            <li className="nav-item">
              <a href="#logout" onClick={handleLogout} className="text-danger">
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="main-content">
        
        {/* Barra superior visible exclusivamente en móviles */}
        <header className="mobile-topbar">
          <div className="mobile-topbar-left">
            <button 
              className="mobile-menu-toggle" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <div className="mobile-brand">
              <span className="mobile-brand-title">DATRAH</span>
              <span className="mobile-brand-badge">ERP</span>
            </div>
          </div>

          <div className="mobile-topbar-right">
            <button 
              className="mobile-search-trigger" 
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Buscar en el ERP (Ctrl+K)"
              aria-label="Buscar"
            >
              <Search size={19} />
            </button>
            <div 
              className="bell-notification-trigger" 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              title="Alertas de Stock"
            >
              <Bell size={20} />
              {bajoStock.length > 0 && (
                <span className="notification-badge">
                  {bajoStock.length}
                </span>
              )}
            </div>
            <div className="mobile-user-avatar" title={`${currentUser.nombre || 'Usuario'} (${currentUser.rol || ''})`}>
              {(currentUser.nombre || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Header Superior de Búsqueda Universal y Alertas de Stock (solo desktop) */}
        <div className="header-alerts-container desktop-alerts">
          <button 
            type="button"
            className="command-palette-trigger-btn"
            onClick={() => setIsCommandPaletteOpen(true)}
            title="Búsqueda Universal (Ctrl + K / Cmd + K)"
          >
            <Search size={15} className="text-indigo-400 shrink-0" />
            <span className="trigger-text">Buscar clientes, facturas, productos, cuentas...</span>
            <kbd className="trigger-kbd">⌘K</kbd>
          </button>

          <div className="bell-notification-trigger" onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}>
            <Bell size={20} />
            {bajoStock.length > 0 && (
              <span className="notification-badge">
                {bajoStock.length}
              </span>
            )}
          </div>
        </div>

        {/* Panel Dropdown de Alertas de Inventario */}
        {showNotificationDropdown && (
          <div className="dropdown-panel">
            <div className="dropdown-header">
              <strong>Alertas de Inventario ({bajoStock.length})</strong>
              <button onClick={() => setShowNotificationDropdown(false)} className="btn-close-dropdown">Cerrar</button>
            </div>
            <div className="dropdown-body">
              {bajoStock.length === 0 ? (
                <div className="dropdown-empty">
                  ✅ Todo en orden. No hay productos con stock crítico.
                </div>
              ) : (
                bajoStock.map((prod) => (
                  <div key={prod.id} className="notification-item-critical">
                    <div className="notification-item-title">{prod.nombre}</div>
                    <div className="notification-item-meta">
                      <span>Stock: <strong className="text-danger">{Number(prod.stockActual).toFixed(0)}</strong></span>
                      <span>Mínimo: <strong>{Number(prod.stockMinimo).toFixed(0)}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {renderActiveView()}
        <Copilot />
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
        />
      </main>
    </div>
  );
}
