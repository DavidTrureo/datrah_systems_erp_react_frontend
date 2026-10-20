import React, { useEffect, useState } from 'react';
import { api, type Cliente, type Producto, type Factura } from '../api';
import { Plus, Trash2, ShoppingCart, User, CreditCard, Ban, FileText, Printer, Percent, Camera, MessageCircle } from 'lucide-react';
import { generarTicketPDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface CartItem {
  producto: Producto;
  cantidad: number;
  descuento: number;
  tipoDescuento: 'PESOS' | 'PORCENTAJE';
  valorDescuento: number;
}

export default function Facturacion() {
  const { showSuccess, showError, showWarning } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Cart State
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(19);
  const [notas, setNotas] = useState('');

  // Aux variables
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addDiscountType, setAddDiscountType] = useState<'PESOS' | 'PORCENTAJE'>('PESOS');
  const [addDiscountVal, setAddDiscountVal] = useState(0);

  // Descuento Global / Promociones
  const [globalDiscountType, setGlobalDiscountType] = useState<string>('NINGUNO');
  const [globalDiscountVal, setGlobalDiscountVal] = useState<number>(0);

  // Print Invoice Handler
  const handleOpenPrintModal = (fac: Factura) => {
    generarTicketPDF(fac);
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cliRes, prodRes, facRes] = await Promise.all([
        api.getClientes(),
        api.getProductos(),
        api.getFacturas(),
      ]);
      setClientes(cliRes);
      setProductos(prodRes);
      setFacturas(facRes.reverse());
    } catch (err) {
      console.error("Error al cargar facturación:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleScanProduct = (code: string) => {
    const trimmed = code.trim();
    const prod = productos.find(p => p.codigoBarras === trimmed || String(p.id) === trimmed);
    if (!prod) {
      showError(`No se encontró ningún producto con el código: ${trimmed}`, 'Producto No Encontrado');
      return;
    }

    if (Number(prod.stockActual) <= 0) {
      showWarning(`El producto "${prod.nombre}" no tiene stock disponible.`, 'Sin Stock');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.producto.id === prod.id);
      if (existing) {
        if (Number(prod.stockActual) < existing.cantidad + 1) {
          showWarning(`No hay más stock disponible para "${prod.nombre}".`);
          return prev;
        }
        showSuccess(`+1 "${prod.nombre}" al carro`);
        return prev.map(item => item.producto.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      } else {
        showSuccess(`"${prod.nombre}" agregado al carro`);
        return [...prev, { producto: prod, cantidad: 1, descuento: 0, tipoDescuento: 'PESOS', valorDescuento: 0 }];
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = productos.find(p => String(p.id) === selectedProductId);
    if (!prod) return;

    if (Number(prod.stockActual) < addQty) {
      showWarning(`No hay stock suficiente. Stock disponible: ${prod.stockActual}`);
      return;
    }

    // Calcular descuento del ítem en pesos
    let calculatedDiscount = 0;
    if (addDiscountType === 'PORCENTAJE') {
      calculatedDiscount = Math.round((addQty * prod.precioVenta) * (addDiscountVal / 100));
    } else {
      calculatedDiscount = addDiscountVal;
    }

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.producto.id === prod.id);
    if (existingIndex >= 0) {
      const newQty = cart[existingIndex].cantidad + addQty;
      if (Number(prod.stockActual) < newQty) {
        showWarning(`No hay stock suficiente para aumentar la cantidad. Stock disponible: ${prod.stockActual}`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].cantidad = newQty;
      updatedCart[existingIndex].tipoDescuento = addDiscountType;
      updatedCart[existingIndex].valorDescuento = cart[existingIndex].valorDescuento + addDiscountVal;
      
      // Recalcular el descuento plano
      let newFlatDiscount = 0;
      if (addDiscountType === 'PORCENTAJE') {
        newFlatDiscount = Math.round((newQty * prod.precioVenta) * (updatedCart[existingIndex].valorDescuento / 100));
      } else {
        newFlatDiscount = updatedCart[existingIndex].valorDescuento;
      }
      updatedCart[existingIndex].descuento = newFlatDiscount;
      setCart(updatedCart);
      showSuccess(`"${prod.nombre}" actualizado en el carro`);
    } else {
      setCart([...cart, { 
        producto: prod, 
        cantidad: addQty, 
        descuento: calculatedDiscount,
        tipoDescuento: addDiscountType,
        valorDescuento: addDiscountVal
      }]);
      showSuccess(`"${prod.nombre}" agregado al carro`);
    }

    // Reset helper inputs
    setSelectedProductId('');
    setAddQty(1);
    setAddDiscountVal(0);
    setAddDiscountType('PESOS');
  };

  const handleRemoveFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  // Calcular totales temporales
  const subtotal = cart.reduce((sum, item) => {
    return sum + (item.cantidad * item.producto.precioVenta - item.descuento);
  }, 0);

  // Calcular descuento global
  let globalDiscountAmount = 0;
  let sentGlobalDiscountTipo = 'NINGUNO';
  let sentGlobalDiscountValor = 0;

  if (globalDiscountType === 'MANUAL_PESOS') {
    globalDiscountAmount = globalDiscountVal;
    sentGlobalDiscountTipo = 'PESOS';
    sentGlobalDiscountValor = globalDiscountVal;
  } else if (globalDiscountType === 'MANUAL_PORCENTAJE') {
    globalDiscountAmount = Math.round(subtotal * (globalDiscountVal / 100));
    sentGlobalDiscountTipo = 'PORCENTAJE';
    sentGlobalDiscountValor = globalDiscountVal;
  } else if (globalDiscountType === 'PROMO_20K') {
    if (subtotal > 20000) {
      globalDiscountAmount = Math.round(subtotal * 0.10); // 10%
      sentGlobalDiscountTipo = 'PORCENTAJE';
      sentGlobalDiscountValor = 10;
    }
  } else if (globalDiscountType === 'PROMO_50K') {
    if (subtotal > 50000) {
      globalDiscountAmount = 5000; // $5.000 flat
      sentGlobalDiscountTipo = 'PESOS';
      sentGlobalDiscountValor = 5000;
    }
  }

  const baseImponible = Math.max(0, subtotal - globalDiscountAmount);
  const impuestoValor = Math.round(baseImponible * (impuestoPorcentaje / 100));
  const totalRaw = baseImponible + impuestoValor;

  // Ley de Redondeo Chilena
  const aplicarLeyRedondeo = (val: number) => {
    const totalEntero = Math.round(val);
    const ultimoDigito = totalEntero % 10;
    if (ultimoDigito >= 1 && ultimoDigito <= 5) {
      return totalEntero - ultimoDigito;
    } else if (ultimoDigito >= 6 && ultimoDigito <= 9) {
      return totalEntero + (10 - ultimoDigito);
    }
    return totalEntero;
  };

  const total = metodoPago === 'EFECTIVO' ? aplicarLeyRedondeo(totalRaw) : totalRaw;
  const redondeoDiferencia = total - totalRaw;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteId) {
      showWarning("Por favor selecciona un cliente para emitir la factura.");
      return;
    }
    if (cart.length === 0) {
      showWarning("El carro de compras está vacío. Agrega al menos un producto.");
      return;
    }

    try {
      const payload = {
        clienteId: Number(selectedClienteId),
        metodoPago,
        impuestoPorcentaje,
        notas,
        descuentoGlobalTipo: sentGlobalDiscountTipo,
        descuentoGlobalValor: sentGlobalDiscountValor,
        detalles: cart.map(item => ({
          productoId: item.producto.id!,
          cantidad: item.cantidad,
          tipoDescuento: item.tipoDescuento,
          valorDescuento: item.valorDescuento,
        })),
      };

      await api.crearFactura(payload);
      
      // Notificar cambio de stock para refrescar alertas globales
      window.dispatchEvent(new Event('refresh-bajo-stock'));
      
      // Limpiar formulario
      setCart([]);
      setSelectedClienteId('');
      setNotas('');
      setGlobalDiscountType('NINGUNO');
      setGlobalDiscountVal(0);
      
      // Recargar datos
      loadData();
      showSuccess("¡Factura emitida correctamente con rebaja de stock!", "Venta Exitosa");
    } catch (err) {
      showError("Error al emitir factura: " + (err as Error).message);
    }
  };

  const handleShareFacturaWhatsApp = (f: Factura) => {
    const clienteNombre = f.cliente?.nombre || 'Estimado Cliente';
    const num = f.numeroFactura;
    const totalFmt = `$${Number(f.total).toLocaleString('es-CL')}`;
    const metodo = f.metodoPago || 'Efectivo';
    
    const itemsList = f.detalles && f.detalles.length > 0
      ? f.detalles.map(d => `• ${d.cantidad}x ${d.producto?.nombre || 'Producto'} ($${Number(d.subtotal || 0).toLocaleString('es-CL')})`).join('\n')
      : '';

    const text = 
`Hola ${clienteNombre}! 🧾
Le compartimos el comprobante de su *Factura / Venta N° ${num}* de Datrah Systems:

${itemsList ? `*Detalle de Productos:*\n${itemsList}\n\n` : ''}💳 *Método de Pago:* ${metodo}
💰 *Total Pagado:* ${totalFmt}
📅 *Fecha:* ${new Date(f.fechaEmision).toLocaleDateString('es-CL')}

¡Muchas gracias por su compra! Quedamos a su disposición.`;

    let telefono = f.cliente?.telefono ? f.cliente.telefono.replace(/\D/g, '') : '';
    if (telefono.length === 9 && telefono.startsWith('9')) {
      telefono = '56' + telefono;
    }

    const url = telefono 
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleAnularFactura = async (id: number) => {
    if (confirm("¿Estás seguro de anular esta factura? El stock de los productos se devolverá automáticamente al almacén.")) {
      try {
        await api.anularFactura(id);
        window.dispatchEvent(new Event('refresh-bajo-stock'));
        loadData();
        showSuccess("Factura anulada con éxito y stock repuesto.");
      } catch (err) {
        showError("Error al anular factura: " + (err as Error).message);
      }
    }
  };

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <h1>Módulo de Facturación (POS)</h1>
          <p>Crea facturas de venta rápidas y administra tus ingresos históricos.</p>
        </div>
      </div>

      <div className="billing-grid">
        {/* Lógica de Carrito de Ventas */}
        <div>
          {/* Añadir Producto al Carro */}
          <div className="data-card data-card-padded-mb-24">
            <div className="flex items-center justify-between mb-16">
              <h3 className="m-0 flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary" /> Agregar al Carro
              </h3>
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5"
                title="Escanear producto con cámara web o celular"
              >
                <Camera size={16} className="text-blue-400" /> Escanear Código
              </button>
            </div>
            <div className="grid-add-product-row">
              <div className="form-group m-0">
                <label htmlFor="producto-select-factura">Producto</label>
                <select 
                  id="producto-select-factura"
                  value={selectedProductId} 
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Seleccione producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${p.precioVenta.toFixed(0)} (Stock: {p.stockActual})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group m-0">
                <label htmlFor="cantidad-factura-input">Cantidad</label>
                <input 
                  id="cantidad-factura-input"
                  type="number" 
                  min="0.001" 
                  step="0.001"
                  value={addQty} 
                  onChange={(e) => setAddQty(Number(e.target.value))} 
                  className="form-control"
                />
              </div>

              <div className="form-group-min-110">
                <label htmlFor="tipo-desc-select-factura">Tipo Desc.</label>
                <select 
                  id="tipo-desc-select-factura"
                  value={addDiscountType} 
                  onChange={(e) => setAddDiscountType(e.target.value as 'PESOS' | 'PORCENTAJE')} 
                  className="form-control"
                >
                  <option value="PESOS">Pesos ($)</option>
                  <option value="PORCENTAJE">Porc. (%)</option>
                </select>
              </div>

              <div className="form-group m-0">
                <label htmlFor="descuento-factura-input">Descuento</label>
                <input 
                  id="descuento-factura-input"
                  type="number" 
                  min="0"
                  step={addDiscountType === 'PORCENTAJE' ? '0.1' : '1'}
                  value={addDiscountVal} 
                  onChange={(e) => setAddDiscountVal(Number(e.target.value))} 
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
            <h3 className="mb-16 text-lg font-bold">Detalles de la Compra</h3>
            
            {/* Vista Móvil: Tarjetas Táctiles que se adaptan al 100% de la pantalla del celular */}
            <div className="block md:hidden">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
                  El carro está vacío. Agrega productos arriba.
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {cart.map((item, index) => {
                    const itemSubtotal = item.cantidad * item.producto.precioVenta - item.descuento;
                    return (
                      <div key={index} className="p-14 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-white text-base leading-snug">{item.producto.nombre}</div>
                            <div className="text-xs text-muted mt-2">
                              ${item.producto.precioVenta.toLocaleString('es-CL')} c/u
                            </div>
                          </div>
                          <button 
                            className="btn btn-secondary btn-icon-sm text-danger" 
                            onClick={() => handleRemoveFromCart(index)} 
                            title="Eliminar del carrito" 
                            aria-label="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-8 border-t border-white/5">
                          <div className="flex items-center gap-8 text-sm">
                            <span className="text-muted text-xs">Cant:</span>
                            <span className="font-bold bg-white/10 px-8 py-2 rounded-md">{item.cantidad}</span>
                            {item.valorDescuento > 0 && (
                              <span className="text-xs text-danger">
                                -{item.tipoDescuento === 'PORCENTAJE' ? `${item.valorDescuento}%` : `$${item.descuento.toLocaleString('es-CL')}`}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted block">Subtotal</span>
                            <span className="font-bold text-success text-base">${itemSubtotal.toLocaleString('es-CL')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vista Escritorio: Tabla de alta densidad */}
            <div className="hidden md:block table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Descuento</th>
                    <th>Subtotal</th>
                    <th className="text-right">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty-row">
                        El carro está vacío. Agrega productos arriba.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => {
                      const itemSubtotal = item.cantidad * item.producto.precioVenta - item.descuento;
                      return (
                        <tr key={index}>
                          <td className="font-medium">{item.producto.nombre}</td>
                          <td>{item.cantidad}</td>
                          <td>${item.producto.precioVenta.toFixed(0)}</td>
                          <td className="text-sm-danger">
                            {item.valorDescuento > 0 ? (
                              <>
                                -{item.tipoDescuento === 'PORCENTAJE' ? `${item.valorDescuento}%` : `$${item.valorDescuento.toLocaleString('es-CL')}`} 
                                <br />
                                <span className="text-xxs-secondary">
                                  (Total: -${item.descuento.toLocaleString('es-CL')})
                                </span>
                              </>
                            ) : '-'}
                          </td>
                          <td className="font-semibold">${itemSubtotal.toLocaleString('es-CL')}</td>
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

        {/* Facturación y totales */}
        <div>
          <form onSubmit={handleCreateInvoice} className="pos-summary">
             <h3 className="border-b-padded">Resumen de Factura</h3>

            {/* Seleccionar Cliente */}
            <div className="form-group">
              <label htmlFor="cliente-select-facturacion" className="flex-center-gap-4">
                <User size={14} /> Cliente *
              </label>
              <select 
                id="cliente-select-facturacion"
                required
                value={selectedClienteId} 
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className="form-control"
              >
                <option value="">Seleccione cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.documentoIdentidad})</option>
                ))}
              </select>
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label htmlFor="metodo-pago-select-facturacion" className="flex-center-gap-4">
                <CreditCard size={14} /> Método de Pago
              </label>
              <select 
                id="metodo-pago-select-facturacion"
                value={metodoPago} 
                onChange={(e) => setMetodoPago(e.target.value)}
                className="form-control"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta de Crédito / Débito</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="CREDITO">Crédito Cliente (CxC)</option>
              </select>
            </div>

            {/* IVA */}
            <div className="form-group">
              <label htmlFor="iva-input-facturacion">Impuesto (IVA %) </label>
              <input 
                id="iva-input-facturacion"
                type="number" 
                value={impuestoPorcentaje} 
                onChange={(e) => setImpuestoPorcentaje(Number(e.target.value))} 
                className="form-control"
              />
            </div>

            {/* Notas */}
            <div className="form-group">
              <label htmlFor="notas-textarea-facturacion">Notas / Observaciones</label>
              <textarea 
                id="notas-textarea-facturacion"
                value={notas} 
                onChange={(e) => setNotas(e.target.value)} 
                className="form-control"
                rows={2}
                placeholder="Notas que aparecerán en la factura..."
              />
            </div>

            {/* Descuento Global / Promociones */}
            <div className="form-group">
              <label htmlFor="descuento-global-select-facturacion" className="flex-center-gap-4">
                <Percent size={14} /> Descuento Global / Promo
              </label>
              <select 
                id="descuento-global-select-facturacion"
                value={globalDiscountType} 
                onChange={(e) => setGlobalDiscountType(e.target.value)}
                className="form-control"
              >
                <option value="NINGUNO">Sin Descuento Global</option>
                <option value="MANUAL_PESOS">Descuento Manual ($)</option>
                <option value="MANUAL_PORCENTAJE">Descuento Manual (%)</option>
                <option value="PROMO_20K">Promo: Compra &gt; $20.000 (-10%)</option>
                <option value="PROMO_50K">Promo: Compra &gt; $50.000 (-$5.000)</option>
              </select>
            </div>

            {(globalDiscountType === 'MANUAL_PESOS' || globalDiscountType === 'MANUAL_PORCENTAJE') && (
              <div className="form-group">
                <label htmlFor="descuento-global-valor-input-facturacion">Valor de Descuento {globalDiscountType === 'MANUAL_PESOS' ? '($)' : '(%)'}</label>
                <input 
                  id="descuento-global-valor-input-facturacion"
                  type="number" 
                  min="0"
                  required
                  value={globalDiscountVal} 
                  onChange={(e) => setGlobalDiscountVal(Number(e.target.value))} 
                  className="form-control"
                />
              </div>
            )}

            {/* Desglose de Dinero */}
             <div className="flex-col-gap-10 mt-16">
              <div className="summary-row">
                <span>Subtotal Neto:</span>
                <span>${subtotal.toLocaleString('es-CL')}</span>
              </div>
              {globalDiscountAmount > 0 && (
                <>
                   <div className="summary-row text-danger">
                     <span>Descuento Global:</span>
                     <span>-${globalDiscountAmount.toLocaleString('es-CL')}</span>
                   </div>
                  <div className="summary-row">
                    <span>Base Afecta:</span>
                    <span>${baseImponible.toLocaleString('es-CL')}</span>
                  </div>
                </>
              )}
              <div className="summary-row">
                <span>IVA ({impuestoPorcentaje}%):</span>
                <span>${impuestoValor.toLocaleString('es-CL')}</span>
              </div>
              {metodoPago === 'EFECTIVO' && redondeoDiferencia !== 0 && (
                 <div className="summary-row text-sm-secondary">
                   <span>Redondeo Ley:</span>
                   <span>{redondeoDiferencia > 0 ? `+$${redondeoDiferencia}` : `-$${Math.abs(redondeoDiferencia)}`}</span>
                 </div>
              )}
              <div className="summary-row total">
                <span>Total a Pagar:</span>
                <span>${total.toLocaleString('es-CL')}</span>
              </div>
            </div>

             <button type="submit" className="btn btn-primary btn-submit-checkout">
               Emitir Factura
             </button>
          </form>
        </div>
      </div>

      {/* Historial de Facturas Emitidas */}
      <div className="data-card mt-32">
        <div className="data-card-header">
          <h2 className="flex-center-gap-8">
            <FileText size={20} className="text-cyan" /> Historial de Facturas Emitidas
          </h2>
          <button className="btn btn-primary btn-sm flex-center-gap-4" onClick={async () => {
            try {
              await api.descargarVentasExcel();
            } catch (err) {
              showError("Error al descargar Excel: " + (err as Error).message);
            }
          }}>
            Exportar Excel
          </button>
        </div>
        {/* Vista Móvil: Tarjetas de Facturas */}
        <div className="block md:hidden p-16">
          {loading ? (
            <div className="text-center py-20 text-muted">Cargando historial...</div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
              No hay facturas emitidas aún
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {facturas.map((f) => (
                <div key={f.id} className="p-14 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-base">Factura #{f.numeroFactura}</span>
                    <span className={`badge ${f.estado === 'EMITIDA' ? 'badge-success' : 'badge-danger'}`}>
                      {f.estado}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white/90">
                    {f.cliente?.nombre || 'Cliente General'}
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted">
                    <span>{new Date(f.fechaEmision).toLocaleDateString()}</span>
                    <span>{f.metodoPago}</span>
                    <span className="text-base font-bold text-success">${f.total.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex gap-8 pt-8 border-t border-white/5 mt-4">
                    <button 
                      className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" 
                      onClick={async () => {
                        try {
                          await api.descargarFacturaPdf(f.id!);
                        } catch (err) {
                          showError("Error al descargar PDF: " + (err as Error).message);
                        }
                      }}
                    >
                      <FileText size={14} /> PDF
                    </button>
                    <button 
                      className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" 
                      onClick={() => handleOpenPrintModal(f)}
                    >
                      <Printer size={14} /> Ticket
                    </button>
                    <button 
                      className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" 
                      onClick={() => handleShareFacturaWhatsApp(f)}
                      title="Compartir por WhatsApp"
                    >
                      <MessageCircle size={14} className="text-emerald-400" /> WhatsApp
                    </button>
                    {f.estado === 'EMITIDA' && (
                      <button 
                        className="btn btn-secondary text-danger py-6 px-10 text-xs" 
                        onClick={() => handleAnularFactura(f.id!)} 
                        title="Anular Factura"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vista Escritorio: Tabla tradicional */}
        <div className="hidden md:block table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Factura</th>
                <th>Fecha Emisión</th>
                <th>Cliente</th>
                <th>Método Pago</th>
                <th>Subtotal</th>
                <th>Impuestos</th>
                <th>Total</th>
                <th>Estado</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">Cargando historial...</td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">No hay facturas emitidas aún</td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id}>
                    <td className="font-bold">{f.numeroFactura}</td>
                    <td>{new Date(f.fechaEmision).toLocaleString()}</td>
                    <td>{f.cliente?.nombre} ({f.cliente?.documentoIdentidad})</td>
                    <td>{f.metodoPago}</td>
                    <td>${f.subtotal.toFixed(0)}</td>
                    <td>${f.impuestoValor.toFixed(0)}</td>
                    <td className="font-semibold">${f.total.toFixed(0)}</td>
                    <td>
                      <span className={`badge ${f.estado === 'EMITIDA' ? 'badge-success' : 'badge-danger'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex-gap-8">
                        <button className="btn btn-secondary btn-sm" title="Descargar Factura PDF" onClick={async () => {
                          try {
                            await api.descargarFacturaPdf(f.id!);
                          } catch (err) {
                            showError("Error al descargar PDF: " + (err as Error).message);
                          }
                        }}>
                          PDF
                        </button>
                        <button className="btn btn-secondary btn-sm" title="Imprimir Ticket POS" onClick={() => handleOpenPrintModal(f)}>
                          <Printer size={14} className="mr-4" /> Ticket
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm flex-center-gap-4 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" 
                          title="Compartir por WhatsApp" 
                          onClick={() => handleShareFacturaWhatsApp(f)}
                        >
                          <MessageCircle size={14} className="text-emerald-400 mr-4" /> WhatsApp
                        </button>
                        {f.estado === 'EMITIDA' ? (
                          <button className="btn btn-secondary btn-danger-outline" onClick={() => handleAnularFactura(f.id!)}>
                            <Ban size={14} className="text-danger mr-4" /> Anular
                          </button>
                        ) : (
                          <span className="text-sm-muted align-self-center">Anulada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Escaneo con Cámara para POS */}
      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={handleScanProduct}
        title="Escanear Producto para la Venta"
      />
    </div>
  );
}
