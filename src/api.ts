const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

export interface Categoria {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface Producto {
  id?: number;
  codigoBarras: string;
  nombre: string;
  descripcion?: string;
  precioCompra: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  categoria?: Categoria;
  activo?: boolean;
}

export interface Cliente {
  id?: number;
  documentoIdentidad: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
}

export interface DetalleFactura {
  id?: number;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface Factura {
  id?: number;
  numeroFactura: string;
  fechaEmision: string;
  cliente: Cliente;
  subtotal: number;
  impuestoPorcentaje: number;
  impuestoValor: number;
  descuento: number;
  descuentoGlobal?: number;
  total: number;
  montoPagado: number;
  estado: 'EMITIDA' | 'ANULADA' | 'PENDIENTE' | 'CREDITO_PENDIENTE';
  metodoPago: string;
  notas?: string;
  detalles: DetalleFactura[];
}

export interface Cotizacion {
  id: number;
  numeroCotizacion: string;
  fechaEmision: string;
  validezDias: number;
  cliente: Cliente | null;
  subtotal: number;
  impuestoPorcentaje: number;
  impuestoValor: number;
  descuento: number;
  descuentoGlobal: number;
  total: number;
  estado: string;
  notas: string | null;
  detalles: DetalleCotizacion[];
}

export interface DetalleCotizacion {
  id: number;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface Kardex {
  id?: number;
  producto: Producto;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  stockAnterior: number;
  stockPosterior: number;
  documentoReferencia?: string;
  motivo?: string;
  usuarioId?: number;
  fechaMovimiento: string;
}

export interface Usuario {
  id?: number;
  username: string;
  nombre: string;
  rut?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  rol: 'ADMIN' | 'BODEGA' | 'VENTAS' | 'FINANZAS' | 'GERENCIA';
  activo?: boolean;
  password?: string;
}

export interface Proveedor {
  id?: number;
  documentoIdentidad: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
}

export interface DetalleCompra {
  id?: number;
  producto: Producto;
  cantidad: number;
  precioCompra: number;
  subtotal: number;
}

export interface Compra {
  id?: number;
  numeroDocumento: string;
  fechaCompra: string;
  proveedor: Proveedor;
  total: number;
  montoPagado: number;
  estado: 'COMPRADA' | 'ANULADA' | 'CREDITO_PENDIENTE';
  metodoPago: string;
  notas?: string;
  detalles: DetalleCompra[];
}

export interface FinanzasResumen {
  totalIngresos: number;
  totalEgresos: number;
  saldoNeto: number;
  outstandingCxC: number;
  outstandingCxP: number;
}

export interface TransaccionCaja {
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  notas?: string;
}

export interface LoginResponse {
  id?: number;
  username?: string;
  nombre?: string;
  rol?: 'ADMIN' | 'BODEGA' | 'VENTAS' | 'FINANZAS' | 'GERENCIA';
  authenticated: boolean;
  token?: string;
}

export interface LogActividad {
  id?: number;
  usuarioId: number;
  usuarioUsername: string;
  accion: string;
  entidad: string;
  detalle: string;
  fecha: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw);
      if (currentUser.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
    }
  } catch (e) {
    console.error('Error reading currentUser from localStorage', e);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Error calling ${path}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- CONTABILIDAD (Nuevos Reportes Financieros) ---
export interface LibroMayorRow {
  fecha: string;
  comprobante: string;
  glosa: string;
  debe: number;
  haber: number;
  saldo: number;
}

export interface CuentaSaldo {
  codigo: string;
  nombre: string;
  tipo: string;
  saldo: number;
}

export interface BalanceGeneralReport {
  activos: CuentaSaldo[];
  pasivos: CuentaSaldo[];
  patrimonio: CuentaSaldo[];
  totalActivos: number;
  totalPasivos: number;
  totalPatrimonio: number;
}

export interface EstadoResultadosReport {
  ingresos: CuentaSaldo[];
  egresos: CuentaSaldo[];
  totalIngresos: number;
  totalEgresos: number;
  utilidadNeta: number;
}

export const api = {
  // Auth & Usuarios
  login: (credentials: { username: string; password?: string }) => 
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getUsuarios: () => request<Usuario[]>('/auth/usuarios'),
  crearUsuario: (u: Partial<Usuario>) => request<Usuario>('/auth/registrar', { method: 'POST', body: JSON.stringify(u) }),
  actualizarUsuario: (id: number, u: Partial<Usuario>) => request<Usuario>(`/auth/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(u) }),

  // Logs / Auditoría
  getLogsActividad: () => request<LogActividad[]>('/logs'),

  // Categorias
  getCategorias: () => request<Categoria[]>('/categorias'),
  crearCategoria: (c: Categoria) => request<Categoria>('/categorias', { method: 'POST', body: JSON.stringify(c) }),
  actualizarCategoria: (id: number, c: Categoria) => request<Categoria>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  eliminarCategoria: (id: number) => request<void>(`/categorias/${id}`, { method: 'DELETE' }),

  // Productos
  getProductos: () => request<Producto[]>('/productos'),
  getProducto: (id: number) => request<Producto>(`/productos/${id}`),
  crearProducto: (p: Producto) => request<Producto>('/productos', { method: 'POST', body: JSON.stringify(p) }),
  actualizarProducto: (id: number, p: Producto) => request<Producto>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  eliminarProducto: (id: number) => request<void>(`/productos/${id}`, { method: 'DELETE' }),
  getProductosBajoStock: () => request<Producto[]>('/productos/bajo-stock'),
  
  // Stock / Kardex
  registrarEntrada: (id: number, qty: number, doc: string, reason: string) => 
    request<Kardex>(`/productos/${id}/entrada`, { method: 'POST', body: JSON.stringify({ cantidad: qty, documentoReferencia: doc, motivo: reason }) }),
  registrarSalida: (id: number, qty: number, doc: string, reason: string) => 
    request<Kardex>(`/productos/${id}/salida`, { method: 'POST', body: JSON.stringify({ cantidad: qty, documentoReferencia: doc, motivo: reason }) }),
  registrarAjuste: (id: number, newStock: number, reason: string) => 
    request<Kardex>(`/productos/${id}/ajuste`, { method: 'POST', body: JSON.stringify({ stockNuevo: newStock, motivo: reason }) }),
  getKardex: (id: number) => request<Kardex[]>(`/productos/${id}/kardex`),

  // Clientes
  getClientes: () => request<Cliente[]>('/clientes'),
  crearCliente: (c: Cliente) => request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(c) }),
  actualizarCliente: (id: number, c: Cliente) => request<Cliente>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  eliminarCliente: (id: number) => request<void>(`/clientes/${id}`, { method: 'DELETE' }),

  // Proveedores
  getProveedores: () => request<Proveedor[]>('/proveedores'),
  crearProveedor: (p: Proveedor) => request<Proveedor>('/proveedores', { method: 'POST', body: JSON.stringify(p) }),
  actualizarProveedor: (id: number, p: Proveedor) => request<Proveedor>(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  eliminarProveedor: (id: number) => request<void>(`/proveedores/${id}`, { method: 'DELETE' }),

  // Compras
  getCompras: () => request<Compra[]>('/compras'),
  getCompra: (id: number) => request<Compra>(`/compras/${id}`),
  crearCompra: (data: { numeroDocumento: string; proveedorId: number; notas?: string; metodoPago?: string; detalles: { productoId: number; cantidad: number; precioCompra: number }[] }) => 
    request<Compra>('/compras', { method: 'POST', body: JSON.stringify(data) }),
  anularCompra: (id: number) => request<Compra>(`/compras/${id}/anular`, { method: 'POST' }),

  // Facturas
  getFacturas: () => request<Factura[]>('/facturas'),
  crearFactura: (data: any) => request<Factura>('/facturas', { method: 'POST', body: JSON.stringify(data) }),
  anularFactura: (id: number) => request<void>(`/facturas/${id}/anular`, { method: 'POST' }),
  
  // Cotizaciones
  getCotizaciones: () => request<Cotizacion[]>('/cotizaciones'),
  crearCotizacion: (data: any) => request<Cotizacion>('/cotizaciones', { method: 'POST', body: JSON.stringify(data) }),
  cambiarEstadoCotizacion: (id: number, estado: string) => request<void>(`/cotizaciones/${id}/estado?estado=${estado}`, { method: 'PUT' }),

  descargarFacturaPdf: async (id: number) => {
    const headers: Record<string, string> = {};
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw);
      if (currentUser.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
    }
    const response = await fetch(`${API_BASE_URL}/facturas/${id}/pdf`, { headers });
    if (!response.ok) throw new Error('Error al descargar PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  descargarVentasExcel: async () => {
    const headers: Record<string, string> = {};
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw);
      if (currentUser.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
    }
    const response = await fetch(`${API_BASE_URL}/facturas/excel`, { headers });
    if (!response.ok) throw new Error('Error al descargar Excel');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Reportes
  getVentasPorDia: () => request<{ fecha: string; total: number }[]>('/reportes/ventas-dia'),
  getProductosEstrella: () => request<{ nombre: string; cantidad: number }[]>('/reportes/productos-estrella'),

  // Finanzas / Tesorería (ERP)
  getFinanzasResumen: () => request<FinanzasResumen>('/finanzas/resumen'),
  getFinanzasCxC: () => request<Factura[]>('/finanzas/cxc'),
  getFinanzasCxP: () => request<Compra[]>('/finanzas/cxp'),
  registrarAbonoCxC: (id: number, data: { monto: number; metodoPago: string; notas?: string }) => 
    request<any>(`/finanzas/cxc/${id}/abono`, { method: 'POST', body: JSON.stringify(data) }),
  registrarAbonoCxP: (id: number, data: { monto: number; metodoPago: string; notas?: string }) => 
    request<any>(`/finanzas/cxp/${id}/abono`, { method: 'POST', body: JSON.stringify(data) }),
  getFinanzasTransacciones: () => request<TransaccionCaja[]>('/finanzas/transacciones'),

  // Contabilidad (ERP)
  getCuentasContables: () => request<CuentaContable[]>('/contabilidad/cuentas'),
  crearCuentaContable: (cuenta: CuentaContable) => request<CuentaContable>('/contabilidad/cuentas', { method: 'POST', body: JSON.stringify(cuenta) }),
  getComprobantes: (start?: string, end?: string) => {
    let url = '/contabilidad/comprobantes';
    if (start && end) url += `?start=${start}&end=${end}`;
    return request<ComprobanteContable[]>(url);
  },
  crearComprobante: (comprobante: Partial<ComprobanteContable>) => request<ComprobanteContable>('/contabilidad/comprobantes', { method: 'POST', body: JSON.stringify(comprobante) }),
  anularComprobante: (id: number) => request<ComprobanteContable>(`/contabilidad/comprobantes/${id}/anular`, { method: 'POST' }),
  getLibroMayor: (cuentaId: number, start?: string, end?: string) => {
    let url = `/contabilidad/cuentas/${cuentaId}/mayor`;
    if (start && end) url += `?start=${start}&end=${end}`;
    return request<LibroMayorRow[]>(url);
  },
  getBalanceGeneral: (hasta?: string) => {
    let url = `/contabilidad/balance`;
    if (hasta) url += `?hasta=${hasta}`;
    return request<BalanceGeneralReport>(url);
  },
  getEstadoResultados: (start?: string, end?: string) => {
    let url = `/contabilidad/resultados`;
    if (start && end) url += `?start=${start}&end=${end}`;
    return request<EstadoResultadosReport>(url);
  }
};

export interface CuentaContable {
  id?: number;
  codigo: string;
  nombre: string;
  tipo: string;
  imputable: boolean;
}

export interface DetalleComprobante {
  id?: number;
  cuenta: CuentaContable;
  debe?: number;
  haber?: number;
  glosaLinea?: string;
}

export interface ComprobanteContable {
  id?: number;
  tipo: string;
  numeroComprobante: number;
  fecha: string;
  glosa: string;
  estado: string;
  detalles: DetalleComprobante[];
}
