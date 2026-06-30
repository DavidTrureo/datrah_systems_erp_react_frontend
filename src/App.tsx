import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Facturacion from './pages/Facturacion';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Login from './pages/Login';
import { api, type LoginResponse, type Producto } from './api';
import { LayoutDashboard, ShoppingCart, Package, Users, Truck, LogOut, Bell, DollarSign } from 'lucide-react';
import Finanzas from './pages/Finanzas';
import Administracion from './pages/Administracion';
import Contabilidad from './pages/Contabilidad';
import { Book } from 'lucide-react';
import { Copilot } from './components/Copilot';

type ViewType = 'dashboard' | 'facturacion' | 'inventario' | 'clientes' | 'compras' | 'proveedores' | 'finanzas' | 'administracion' | 'contabilidad';

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);

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

  const userRole = currentUser.rol || 'VENTAS';
  const isAdmin = userRole === 'ADMIN';
  const isGerencia = userRole === 'GERENCIA';
  const isBodega = userRole === 'BODEGA';
  const isVentas = userRole === 'VENTAS';
  const isFinanzas = userRole === 'FINANZAS';

  const canViewInventario = isAdmin || isGerencia || isBodega;
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
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
        <div className="logo-container" style={{ justifyContent: 'center', padding: '24px 12px' }}>
          <img src="/logo.png" alt="Datrah Systems" style={{ width: '160px', height: 'auto', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
        </div>

        {/* Info del usuario logueado */}
        <div className="sidebar-user-section">
          <div className="sidebar-user-name">{currentUser.nombre}</div>
          <div className="sidebar-user-status">
            <span className="status-dot"></span>
            <span>{currentUser.rol}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-links">
            <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}>
              <a href="#dashboard" onClick={() => setActiveView('dashboard')}>
                <LayoutDashboard size={20} />
                <span>Panel Control</span>
              </a>
            </li>
            
            {canViewFacturacion && (
              <li className={`nav-item ${activeView === 'facturacion' ? 'active' : ''}`}>
                <a href="#facturacion" onClick={() => setActiveView('facturacion')}>
                  <ShoppingCart size={20} />
                  <span>Facturación (POS)</span>
                </a>
              </li>
            )}

            {canViewClientes && (
              <li className={`nav-item ${activeView === 'clientes' ? 'active' : ''}`}>
                <a href="#clientes" onClick={() => setActiveView('clientes')}>
                  <Users size={20} />
                  <span>Clientes</span>
                </a>
              </li>
            )}

            {canViewInventario && (
              <li className={`nav-item ${activeView === 'inventario' ? 'active' : ''}`}>
                <a href="#inventario" onClick={() => setActiveView('inventario')}>
                  <Package size={20} />
                  <span>Inventario & Kardex</span>
                </a>
              </li>
            )}
            
            {canViewCompras && (
              <li className={`nav-item ${activeView === 'compras' ? 'active' : ''}`}>
                <a href="#compras" onClick={() => setActiveView('compras')}>
                  <Truck size={20} />
                  <span>Compras (Stock)</span>
                </a>
              </li>
            )}

            {canViewProveedores && (
              <li className={`nav-item ${activeView === 'proveedores' ? 'active' : ''}`}>
                <a href="#proveedores" onClick={() => setActiveView('proveedores')}>
                  <Users size={20} />
                  <span>Proveedores</span>
                </a>
              </li>
            )}

            {canViewFinanzas && (
              <li className={`nav-item ${activeView === 'finanzas' ? 'active' : ''}`}>
                <a href="#finanzas" onClick={() => setActiveView('finanzas')}>
                  <DollarSign size={20} />
                  <span>Finanzas / Tesorería</span>
                </a>
              </li>
            )}

            {canViewContabilidad && (
              <li className={`nav-item ${activeView === 'contabilidad' ? 'active' : ''}`}>
                <a href="#contabilidad" onClick={() => setActiveView('contabilidad')}>
                  <Book size={20} />
                  <span>Contabilidad (ERP)</span>
                </a>
              </li>
            )}

            {canViewAdmin && (
              <li className={`nav-item ${activeView === 'administracion' ? 'active' : ''}`}>
                <a href="#administracion" onClick={() => setActiveView('administracion')}>
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
        
        {/* Header Superior de Alertas de Stock */}
        <div className="header-alerts-container">
          <div className="bell-notification-trigger" onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}>
            <Bell size={20} style={{ color: bajoStock.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }} />
            {bajoStock.length > 0 && (
              <span className="notification-badge">
                {bajoStock.length}
              </span>
            )}
          </div>

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
        </div>

        {renderActiveView()}
        <Copilot />
      </main>
    </div>
  );
}
