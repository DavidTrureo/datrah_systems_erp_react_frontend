import React, { useEffect, useState } from 'react';
import { api, type Cliente, type Producto, type Factura } from '../api';
import { Plus, Trash2, ShoppingCart, User, CreditCard, Ban, FileText, Printer, Percent } from 'lucide-react';

interface CartItem {
  producto: Producto;
  cantidad: number;
  descuento: number;
  tipoDescuento: 'PESOS' | 'PORCENTAJE';
  valorDescuento: number;
}

export default function Facturacion() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Print Invoice States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Factura | null>(null);

  const handleOpenPrintModal = (fac: Factura) => {
    setInvoiceToPrint(fac);
    setShowPrintModal(true);
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

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = productos.find(p => String(p.id) === selectedProductId);
    if (!prod) return;

    if (Number(prod.stockActual) < addQty) {
      alert(`No hay stock suficiente. Stock disponible: ${prod.stockActual}`);
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
        alert(`No hay stock suficiente para aumentar la cantidad. Stock disponible: ${prod.stockActual}`);
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
    } else {
      setCart([...cart, { 
        producto: prod, 
        cantidad: addQty, 
        descuento: calculatedDiscount,
        tipoDescuento: addDiscountType,
        valorDescuento: addDiscountVal
      }]);
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
      alert("Por favor selecciona un cliente.");
      return;
    }
    if (cart.length === 0) {
      alert("El carro de compras está vacío.");
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
      alert("¡Factura emitida correctamente!");
    } catch (err) {
      alert("Error al emitir factura: " + (err as Error).message);
    }
  };

  const handleAnularFactura = async (id: number) => {
    if (confirm("¿Estás seguro de anular esta factura? El stock de los productos se devolverá automáticamente al almacén.")) {
      try {
        await api.anularFactura(id);
        window.dispatchEvent(new Event('refresh-bajo-stock'));
        loadData();
        alert("Factura anulada con éxito.");
      } catch (err) {
        alert("Error al anular factura: " + (err as Error).message);
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
            <h3 className="mb-16 flex-center-gap-8">
              <ShoppingCart size={18} className="text-primary" /> Agregar al Carro
            </h3>
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
          <div className="data-card p-24">
            <h3 className="mb-16">Detalles de la Compra</h3>
            <div className="table-responsive">
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
              alert("Error al descargar Excel: " + (err as Error).message);
            }
          }}>
            Exportar Excel
          </button>
        </div>
        <div className="table-responsive">
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
                            alert("Error al descargar PDF: " + (err as Error).message);
                          }
                        }}>
                          PDF
                        </button>
                        <button className="btn btn-secondary btn-sm" title="Imprimir Ticket POS" onClick={() => handleOpenPrintModal(f)}>
                          <Printer size={14} className="mr-4" /> Ticket
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

      {/* MODAL DE IMPRESIÓN DE FACTURA (TICKET/A4) */}
      {showPrintModal && invoiceToPrint && (
        <div className="modal-overlay print-modal-overlay">
          <div className="modal-content print-modal-content">
            
            {/* Header del Ticket */}
            <div className="ticket-header">
              <h2 className="ticket-title">DATRAH SYSTEMS</h2>
              <p className="ticket-subtitle">Distribución & Facturación de Stock Profesional</p>
              <p className="ticket-meta-line">Av. de las Américas 1234, Santiago</p>
              <p className="ticket-meta-line">Teléfono: +56 2 2222 3333</p>
            </div>

            {/* Datos de la Factura */}
            <div className="ticket-metadata-grid">
              <div>
                <strong>Nº Factura:</strong> {invoiceToPrint.numeroFactura}<br />
                <strong>Fecha:</strong> {new Date(invoiceToPrint.fechaEmision).toLocaleString()}<br />
                <strong>Estado:</strong> <span className={invoiceToPrint.estado === 'EMITIDA' ? 'status-green' : 'status-red'}>{invoiceToPrint.estado}</span>
              </div>
              <div className="text-right">
                <strong>Cliente:</strong> {invoiceToPrint.cliente?.nombre}<br />
                <strong>Doc. Identidad:</strong> {invoiceToPrint.cliente?.documentoIdentidad}<br />
                <strong>Método Pago:</strong> {invoiceToPrint.metodoPago}
              </div>
            </div>

            {/* Listado de items */}
            <table className="ticket-table">
              <thead>
                <tr className="border-b-padded">
                  <th className="ticket-table-th-left">Descripción</th>
                  <th className="ticket-table-th-center">Cant.</th>
                  <th className="ticket-table-th-right">Precio Unit.</th>
                  <th className="ticket-table-th-right-danger">Descuento</th>
                  <th className="ticket-table-th-right-bold">${detallesFormat(invoiceToPrint.detalles)}</th>
                </tr>
              </thead>
              <tbody>
                {invoiceToPrint.detalles?.map((det) => (
                  <tr key={det.id} className="ticket-table-tr-dashed">
                    <td className="ticket-table-td-left">{det.producto?.nombre}</td>
                    <td className="ticket-table-td-center">{det.cantidad}</td>
                    <td className="ticket-table-td-right">${det.precioUnitario.toFixed(0)}</td>
                    <td className="ticket-table-td-right-danger">-${det.descuento.toFixed(0)}</td>
                    <td className="ticket-table-td-right-bold">${det.subtotal.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Desglose de totales */}
            <div className="ticket-totales-container">
              <div>Subtotal Neto: <strong className="ml-12">${invoiceToPrint.subtotal.toLocaleString('es-CL')}</strong></div>
              {invoiceToPrint.descuentoGlobal && invoiceToPrint.descuentoGlobal > 0 ? (
                <>
                  <div>Desc. Global: <strong className="ml-12-red">-${invoiceToPrint.descuentoGlobal.toLocaleString('es-CL')}</strong></div>
                  <div>Base Afecta: <strong className="ml-12">${(invoiceToPrint.subtotal - invoiceToPrint.descuentoGlobal).toLocaleString('es-CL')}</strong></div>
                </>
              ) : null}
              <div>IVA ({invoiceToPrint.impuestoPorcentaje}%): <strong className="ml-12">${invoiceToPrint.impuestoValor.toLocaleString('es-CL')}</strong></div>
              {invoiceToPrint.metodoPago === 'EFECTIVO' && (() => {
                const exactTotal = (invoiceToPrint.subtotal - (invoiceToPrint.descuentoGlobal || 0)) + invoiceToPrint.impuestoValor;
                const rDiff = invoiceToPrint.total - exactTotal;
                if (rDiff !== 0) {
                  return (
                    <div>Redondeo Ley: <strong className="ml-12">{rDiff > 0 ? `+$${rDiff}` : `-$${Math.abs(rDiff)}`}</strong></div>
                  );
                }
                return null;
              })()}
              <div className="ticket-total-row">Total Cobrado: <span className="ml-12">${invoiceToPrint.total.toLocaleString('es-CL')}</span></div>
            </div>

            {/* Notas */}
            {invoiceToPrint.notas && (
              <div className="ticket-notes-box">
                <strong>Observaciones:</strong> {invoiceToPrint.notas}
              </div>
            )}

            {/* Mensaje de pie */}
            <div className="ticket-footer">
              ¡Gracias por preferir nuestros servicios!<br />
              <strong>Datrah Systems - Software ERP Profesional</strong>
            </div>

            {/* Botones de acción no imprimibles */}
            <div className="no-print flex-end-gap-12-mt-30">
              <button className="btn btn-secondary btn-close-ticket" onClick={() => setShowPrintModal(false)}>
                Cerrar Vista
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                Imprimir Documento (PDF)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Helper para evitar error de JSX en th
function detallesFormat(_detalles: any[]) {
  return "Subtotal";
}
// Trigger IDE refresh
