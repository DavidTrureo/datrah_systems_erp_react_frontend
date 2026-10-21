import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, type Proveedor, type Producto, type Compra } from '../api';
import { Plus, Trash2, Truck, FileText, Ban } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';

interface PurchaseCartItem {
  producto: Producto;
  cantidad: number;
  precioCompra: number;
}

export default function Compras() {
  const { showSuccess, showError, showWarning } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  // Aux inputs
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addCost, setAddCost] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [provRes, prodRes, compRes] = await Promise.all([
        api.getProveedores(),
        api.getProductos(),
        api.getCompras(),
      ]);
      setProveedores(provRes);
      setProductos(prodRes);
      setCompras(compRes.reverse());
    } catch (err) {
      console.error("Error al cargar compras:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = productos.find(p => String(p.id) === prodId);
    if (prod) {
      setAddCost(prod.precioCompra); // Default to current buying price
    }
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = productos.find(p => String(p.id) === selectedProductId);
    if (!prod) return;

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.producto.id === prod.id);
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].cantidad += addQty;
      updatedCart[existingIndex].precioCompra = addCost; // update to newest cost entered
      setCart(updatedCart);
    } else {
      setCart([...cart, { producto: prod, cantidad: addQty, precioCompra: addCost }]);
    }

    // Reset helper inputs
    setSelectedProductId('');
    setAddQty(1);
    setAddCost(0);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const total = cart.reduce((sum, item) => sum + (item.cantidad * item.precioCompra), 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedorId) {
      showWarning("Por favor selecciona un proveedor.");
      return;
    }
    if (!numeroDocumento) {
      showWarning("Por favor ingresa el número de documento / factura de compra.");
      return;
    }
    if (cart.length === 0) {
      showWarning("El carro de compras está vacío.");
      return;
    }

    try {
      const payload = {
        numeroDocumento,
        proveedorId: Number(selectedProveedorId),
        notas,
        metodoPago,
        detalles: cart.map(item => ({
          productoId: item.producto.id!,
          cantidad: item.cantidad,
          precioCompra: item.precioCompra,
        })),
      };

      await api.crearCompra(payload);
      
      // Notificar cambio de stock para refrescar alertas globales
      window.dispatchEvent(new Event('refresh-bajo-stock'));
      
      // Reset form
      setCart([]);
      setSelectedProveedorId('');
      setNumeroDocumento('');
      setNotas('');
      setMetodoPago('EFECTIVO');
      
      loadData();
      showSuccess("¡Ingreso de mercadería / compra registrado correctamente!");
    } catch (err) {
      showError("Error al registrar compra: " + (err as Error).message);
    }
  };

  const handleAnularCompra = async (id: number) => {
    if (confirm("¿Estás seguro de anular esta compra? El stock ingresado se descontará del almacén de inmediato.")) {
      try {
        await api.anularCompra(id);
        window.dispatchEvent(new Event('refresh-bajo-stock'));
        loadData();
        showSuccess("Compra anulada con éxito.");
      } catch (err) {
        showError("Error al anular compra: " + (err as Error).message);
      }
    }
  };

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <div className="module-badge">
            <Truck size={13} className="text-indigo-400" /> Abastecimiento & Compras
          </div>
          <h1>Recepción de Mercadería & Facturas de Compra</h1>
          <p className="text-muted mt-2">Ingresa stock al almacén respaldado por facturas de compra y actualiza el costo de adquisición.</p>
        </div>
      </div>

      <div className="billing-grid">
        {/* Lógica de Carrito de Compras */}
        <div>
          {/* Añadir Producto al Carro */}
          <div className="data-card data-card-padded-mb-24">
            <h3 className="mb-16 flex-center-gap-8">
              <Truck size={18} className="text-primary" /> Agregar Producto
            </h3>
            <div className="grid-add-product-row">
              <div className="form-group m-0">
                <label htmlFor="producto-select">Producto</label>
                <CustomSelect
                  id="producto-select"
                  value={selectedProductId}
                  onChange={(val) => handleProductSelect(val)}
                  placeholder="Seleccione producto..."
                  options={[
                    { value: '', label: 'Seleccione producto...' },
                    ...productos.map(p => ({
                      value: String(p.id),
                      label: `${p.nombre} (Stock: ${p.stockActual} | Costo: $${p.precioCompra.toFixed(0)})`
                    }))
                  ]}
                />
              </div>

              <div className="form-group m-0">
                <label htmlFor="cantidad-ingresar-input">Cantidad a Ingresar</label>
                <input 
                  id="cantidad-ingresar-input"
                  type="number" 
                  min="0.001" 
                  step="0.001"
                  value={addQty} 
                  onChange={(e) => setAddQty(Number(e.target.value))} 
                  className="form-control"
                />
              </div>

              <div className="form-group m-0">
                <label htmlFor="costo-compra-input">Costo de Compra ($)</label>
                <input 
                  id="costo-compra-input"
                  type="number" 
                  min="0"
                  step="1"
                  value={addCost} 
                  onChange={(e) => setAddCost(Number(e.target.value))} 
                  className="form-control"
                />
              </div>

              <button type="button" className="btn btn-primary h-45" onClick={handleAddToCart}>
                <Plus size={18} /> Añadir
              </button>
            </div>
          </div>

          {/* Listado del Carrito */}
          <div className="data-card p-16 md:p-24">
            <h3 className="mb-16">Detalles de Recepción</h3>

            {/* Vista Móvil: Tarjetas Táctiles adaptadas al teléfono */}
            <div className="mobile-only-cards block md:hidden">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
                  El carro de compra está vacío. Agrega productos arriba.
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {cart.map((item, index) => {
                    const itemSubtotal = item.cantidad * item.precioCompra;
                    return (
                      <div key={index} className="p-12 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-white text-sm leading-snug">{item.producto.nombre}</span>
                          <button className="btn btn-secondary btn-icon-sm" onClick={() => handleRemoveFromCart(index)} title="Eliminar del carrito" aria-label="Eliminar">
                            <Trash2 size={16} className="text-danger" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-4 border-t border-white/5">
                          <span className="text-muted">Cant: <strong className="text-white">{item.cantidad}</strong></span>
                          <span className="text-muted">Costo: ${item.precioCompra.toFixed(0)}</span>
                          <span className="font-bold text-success text-sm">${itemSubtotal.toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vista Escritorio: Tabla tradicional */}
            <div className="desktop-only-table hidden md:block table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Costo Unitario</th>
                    <th>Subtotal</th>
                    <th className="text-right">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="table-empty-row">
                        El carro de compra está vacío. Agrega productos arriba.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => {
                      const itemSubtotal = item.cantidad * item.precioCompra;
                      return (
                        <tr key={index}>
                           <td className="font-medium">{item.producto.nombre}</td>
                           <td>{item.cantidad}</td>
                           <td>${item.precioCompra.toFixed(0)}</td>
                           <td className="font-semibold">${itemSubtotal.toFixed(0)}</td>
                           <td className="text-right">
                             <button className="btn btn-secondary btn-icon-sm" onClick={() => handleRemoveFromCart(index)} title="Eliminar del carrito" aria-label="Eliminar">
                               <Trash2 size={16} className="text-danger" />
                             </button>
                           </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Totales y Datos de Factura de Compra */}
        <div>
          <form onSubmit={handleCreatePurchase} className="pos-summary">
             <h3 className="border-b-padded">Datos de Compra</h3>

            {/* Proveedor */}
            <div className="form-group">
              <label htmlFor="proveedor-select">Proveedor *</label>
              <CustomSelect
                id="proveedor-select"
                required
                value={selectedProveedorId}
                onChange={(val) => setSelectedProveedorId(val)}
                placeholder="Seleccione proveedor..."
                options={[
                  { value: '', label: 'Seleccione proveedor...' },
                  ...proveedores.map(p => ({
                    value: String(p.id),
                    label: `${p.nombre} (${p.documentoIdentidad})`
                  }))
                ]}
              />
            </div>

            {/* Número Documento */}
            <div className="form-group">
              <label htmlFor="num-doc-compra-input">Nº Factura / Documento Compra *</label>
              <input 
                id="num-doc-compra-input"
                type="text" 
                required
                placeholder="Ej: FAC-COMPRA-40012"
                value={numeroDocumento} 
                onChange={(e) => setNumeroDocumento(e.target.value)} 
                className="form-control"
              />
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label htmlFor="metodo-pago-select-compra">Método de Pago</label>
              <CustomSelect
                id="metodo-pago-select-compra"
                value={metodoPago}
                onChange={(val) => setMetodoPago(val)}
                searchable={false}
                options={[
                  { value: 'EFECTIVO', label: 'Efectivo' },
                  { value: 'TARJETA', label: 'Tarjeta de Crédito / Débito' },
                  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
                  { value: 'CREDITO', label: 'Crédito Proveedor (CxP)' }
                ]}
              />
            </div>

            {/* Notas */}
            <div className="form-group">
              <label htmlFor="notas-compra-input">Notas / Observaciones</label>
              <textarea 
                id="notas-compra-input"
                value={notas} 
                onChange={(e) => setNotas(e.target.value)} 
                className="form-control"
                rows={2}
                placeholder="Observaciones de la recepción..."
              />
            </div>

            {/* Total */}
             <div className="flex-col-gap-10 mt-16">
               <div className="summary-row total">
                 <span>Total Compra:</span>
                 <span>${total.toFixed(0)}</span>
               </div>
             </div>
 
             <button type="submit" className="btn btn-primary btn-submit-checkout">
               Registrar Compra
             </button>
          </form>
        </div>
      </div>

      {/* Historial de Compras */}
       <div className="data-card mt-32">
         <div className="data-card-header">
           <h2 className="flex-center-gap-8">
             <FileText size={20} className="text-cyan" /> Historial de Compras Recibidas
           </h2>
        </div>
        {/* Vista Móvil: Tarjetas de Compras */}
        <div className="mobile-only-cards block md:hidden">
          {loading ? (
            <div className="text-center py-20 text-muted">Cargando historial...</div>
          ) : compras.length === 0 ? (
            <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
              No hay compras registradas aún
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {compras.map((c) => (
                <div key={c.id} className="mobile-card-item">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-base font-mono">Doc #{c.numeroDocumento}</span>
                    <span className={`badge ${c.estado === 'COMPRADA' ? 'badge-success' : c.estado === 'CREDITO_PENDIENTE' ? 'badge-warning' : 'badge-danger'}`}>
                      {c.estado}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white/90">
                    {c.proveedor?.nombre || 'Proveedor Desconocido'}
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted pt-2">
                    <span>{new Date(c.fechaCompra).toLocaleDateString()} • <strong className="text-slate-300">{c.metodoPago || 'EFECTIVO'}</strong></span>
                    <span className="text-lg font-black text-success font-mono">${c.total.toLocaleString('es-CL')}</span>
                  </div>
                  {c.estado === 'COMPRADA' && (
                    <div className="pt-8 border-t border-white/5 flex justify-end">
                      <button className="btn btn-secondary text-danger h-9 px-12 text-xs flex-center-gap-4 hover:bg-danger/10 hover:border-danger/30" onClick={() => handleAnularCompra(c.id!)}>
                        <Ban size={14} /> Anular Compra
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vista Escritorio: Tabla tradicional */}
        <div className="desktop-only-table hidden md:block table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Documento</th>
                <th>Fecha Compra</th>
                <th>Proveedor</th>
                <th>Método Pago</th>
                <th>Artículos</th>
                <th>Total Invertido</th>
                <th>Estado</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
               {loading ? (
                 <tr>
                   <td colSpan={8} className="table-empty-row">Cargando historial...</td>
                 </tr>
               ) : compras.length === 0 ? (
                 <tr>
                   <td colSpan={8} className="table-empty-row">No hay compras registradas aún</td>
                 </tr>
              ) : (
                compras.map((c) => (
                   <tr key={c.id}>
                     <td className="font-bold">{c.numeroDocumento}</td>
                     <td>{new Date(c.fechaCompra).toLocaleString()}</td>
                     <td>{c.proveedor?.nombre} ({c.proveedor?.documentoIdentidad})</td>
                     <td>
                       <span className="badge badge-secondary">
                         {c.metodoPago || 'EFECTIVO'}
                       </span>
                     </td>
                     <td>{c.detalles?.length || 0} items</td>
                     <td className="font-semibold">${c.total.toFixed(0)}</td>
                     <td>
                       <span className={`badge ${c.estado === 'COMPRADA' ? 'badge-success' : c.estado === 'CREDITO_PENDIENTE' ? 'badge-warning' : 'badge-danger'}`}>
                         {c.estado}
                       </span>
                     </td>
                     <td className="text-right">
                       {c.estado === 'COMPRADA' ? (
                         <button className="btn btn-secondary btn-danger-outline" onClick={() => handleAnularCompra(c.id!)}>
                           <Ban size={14} className="text-danger mr-4" /> Anular
                         </button>
                       ) : (
                         <span className="text-sm-muted">Anulada</span>
                       )}
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
