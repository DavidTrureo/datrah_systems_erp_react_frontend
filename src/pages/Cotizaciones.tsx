import React, { useState, useEffect } from 'react';
import { api, type Producto, type Cliente, type Cotizacion } from '../api';
import { FileText, Trash2, Printer, Search, ArrowRight, MessageCircle } from 'lucide-react';
import { generarCotizacionPDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';

interface CartItem {
  producto: Producto;
  cantidad: number;
  descuentoUnitario: number;
  tipoDescuento: 'PESOS' | 'PORCENTAJE';
}

const Cotizaciones: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva');

  // Historial
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filtroCotizacion, setFiltroCotizacion] = useState('');

  // Nueva Cotización
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

  const [descuentoGlobalValor, setDescuentoGlobalValor] = useState<number>(0);
  const [descuentoGlobalTipo, setDescuentoGlobalTipo] = useState<'PESOS' | 'PORCENTAJE'>('PESOS');
  const [notas, setNotas] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchCotizaciones();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [prods, clis] = await Promise.all([
        api.getProductos(),
        api.getClientes()
      ]);
      setProductos(prods.filter(p => p.activo));
      setClientes(clis);
    } catch (err) {
      console.error("Error loading dependencies", err);
    }
  };

  const fetchCotizaciones = async () => {
    try {
      const res = await api.getCotizaciones();
      setCotizaciones(res);
    } catch (err) {
      console.error("Error loading cotizaciones", err);
    }
  };

  const addToCart = (prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.producto.id === prod.id);
      if (existing) {
        return prev.map(i => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { producto: prod, cantidad: 1, descuentoUnitario: 0, tipoDescuento: 'PESOS' }];
    });
    setSearchQuery('');
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.cantidad * item.producto.precioVenta), 0);

  const descuentosItems = cart.reduce((sum, item) => {
    let desc = 0;
    if (item.tipoDescuento === 'PESOS') {
      desc = item.descuentoUnitario;
    } else {
      desc = (item.cantidad * item.producto.precioVenta) * (item.descuentoUnitario / 100);
    }
    return sum + desc;
  }, 0);

  let descGlobalCalc = 0;
  if (descuentoGlobalTipo === 'PESOS') descGlobalCalc = descuentoGlobalValor;
  else descGlobalCalc = (subtotal - descuentosItems) * (descuentoGlobalValor / 100);

  const baseImponible = subtotal - descuentosItems - descGlobalCalc;
  const iva = baseImponible * 0.19;
  const total = baseImponible + iva;

  const handleShareWhatsApp = (cot: Cotizacion) => {
    const clienteNombre = cot.cliente?.nombre || 'Estimado Cliente';
    const num = cot.numeroCotizacion;
    const totalFmt = `$${Number(cot.total).toLocaleString('es-CL')}`;
    
    const itemsList = cot.detalles && cot.detalles.length > 0 
      ? cot.detalles.map(d => `• ${d.cantidad}x ${d.producto?.nombre || 'Producto'} ($${Number(d.subtotal || 0).toLocaleString('es-CL')})`).join('\n')
      : '';

    const text = 
`Hola ${clienteNombre}! 📋
Le compartimos el detalle de su *Cotización N° ${num}* de Datrah Systems:

${itemsList ? `*Detalle de Productos:*\n${itemsList}\n\n` : ''}💰 *Total:* ${totalFmt}
🗓️ *Vigencia:* 15 días

Quedamos a su disposición para cualquier consulta o para confirmar su pedido.
¡Muchas gracias!`;

    let telefono = cot.cliente?.telefono ? cot.cliente.telefono.replace(/\D/g, '') : '';
    if (telefono.length === 9 && telefono.startsWith('9')) {
      telefono = '56' + telefono;
    }

    const url = telefono 
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleCrearCotizacion = async () => {
    if (cart.length === 0) { showWarning("Agrega al menos un producto a la cotización", "Cotización Vacía"); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        clienteId: clienteSeleccionado,
        impuestoPorcentaje: 19,
        notas,
        descuentoGlobalTipo,
        descuentoGlobalValor,
        detalles: cart.map(i => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
          tipoDescuento: i.tipoDescuento,
          valorDescuento: i.descuentoUnitario
        }))
      };

      const result = await api.crearCotizacion(payload);

      // Cleanup & show PDF
      setCart([]);
      setNotas('');
      setClienteSeleccionado(null);
      setDescuentoGlobalValor(0);
      showSuccess("Cotización Creada Exitosamente", "Documento Emitido");
      generarCotizacionPDF(result);

    } catch (err) {
      console.error(err);
      showError("Error al crear la cotización");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacturar = async (cot: Cotizacion) => {
    if (!window.confirm(`¿Estás seguro de convertir la Cotización N° ${cot.numeroCotizacion} a Factura? Esto descontará el stock.`)) return;
    try {
      // Create Factura from Cotizacion
      const payload = {
        clienteId: cot.cliente?.id,
        metodoPago: "EFECTIVO", // Podría solicitarse en un modal
        impuestoPorcentaje: cot.impuestoPorcentaje,
        notas: `Ref: Cotización ${cot.numeroCotizacion} - ${cot.notas || ''}`,
        descuentoGlobalTipo: 'PESOS',
        descuentoGlobalValor: cot.descuentoGlobal,
        detalles: cot.detalles.map(d => ({
          productoId: d.producto.id,
          cantidad: d.cantidad,
          tipoDescuento: 'PESOS',
          valorDescuento: d.descuento
        }))
      };

      await api.crearFactura(payload);
      await api.cambiarEstadoCotizacion(cot.id, 'FACTURADA');
      showSuccess("Factura generada exitosamente. Revisa el módulo de Facturación.", "Facturación Exitosa");
      fetchCotizaciones();
    } catch (error) {
      console.error(error);
      showError("Error al facturar la cotización. Verifica el stock disponible.");
    }
  };

  return (
    <div className="page-container">
      <div className="content-header">
        <div className="page-title">
          <FileText size={24} className="text-primary" />
          <h1>Cotizaciones y Presupuestos</h1>
        </div>
        <div className="flex gap-8">
          <button
            className={`btn ${activeTab === 'nueva' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('nueva')}
          >
            Nueva Cotización
          </button>
          <button
            className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('historial')}
          >
            Historial de Cotizaciones
          </button>
        </div>
      </div>

      <div className="content-body">
        {activeTab === 'nueva' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">

            {/* Buscador de Productos */}
            <div className="lg:col-span-2 space-y-24">
              <div className="data-card p-24">
                <h2 className="text-secondary mb-16 text-xl">Buscador</h2>
                <div className="relative mb-24">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={20} />
                  <input
                    type="text"
                    className="form-control w-full !pl-12 py-12 text-lg"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchQuery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {productos
                      .filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigoBarras?.includes(searchQuery))
                      .slice(0, 10)
                      .map(p => (
                        <div key={p.id} className="p-16 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex justify-between items-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => addToCart(p)}>
                          <div>
                            <div className="font-bold">{p.nombre}</div>
                            <div className="text-sm text-secondary">Stock: {p.stockActual}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-success">${Number(p.precioVenta).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="data-card p-16 md:p-24">
                {/* Carrito */}
                <h2 className="text-secondary mb-16 text-xl">Detalle de Cotización</h2>

                {/* Vista Móvil: Tarjetas de ítems en cotización */}
                <div className="mobile-only-cards block md:hidden">
                  {cart.length === 0 ? (
                    <div className="text-center py-16 text-muted text-sm bg-white/[0.02] rounded-xl border border-white/5">
                      No hay productos en la cotización
                    </div>
                  ) : (
                    <div className="flex flex-col gap-10">
                      {cart.map((item, index) => {
                        const precio = Number(item.producto.precioVenta);
                        let desc = item.tipoDescuento === 'PESOS' ? Number(item.descuentoUnitario) : (precio * item.cantidad * (Number(item.descuentoUnitario) / 100));
                        const subt = (precio * item.cantidad) - desc;
                        return (
                          <div key={index} className="p-12 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-white text-sm leading-snug">{item.producto.nombre}</span>
                              <button onClick={() => removeFromCart(index)} className="btn btn-secondary btn-icon-sm text-danger" title="Eliminar" aria-label="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-8 text-xs pt-4 border-t border-white/5">
                              <div className="flex items-center gap-4">
                                <span className="text-muted">Cant:</span>
                                <input type="number" className="form-control w-16 py-2 px-4 text-center" value={item.cantidad} onChange={e => updateCartItem(index, 'cantidad', Number(e.target.value))} min={1} />
                              </div>
                              <span className="text-muted">${precio.toLocaleString()} c/u</span>
                              <span className="font-bold text-success text-sm">${subt.toLocaleString()}</span>
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
                        <th>Cant.</th>
                        <th>Precio U.</th>
                        <th>Descuento</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => {
                        const precio = Number(item.producto.precioVenta);
                        let desc = item.tipoDescuento === 'PESOS' ? Number(item.descuentoUnitario) : (precio * item.cantidad * (Number(item.descuentoUnitario) / 100));
                        const subt = (precio * item.cantidad) - desc;

                        return (
                          <tr key={index}>
                            <td>{item.producto.nombre}</td>
                            <td>
                              <input type="number" aria-label="Cantidad" className="form-control w-20 text-center" value={item.cantidad} onChange={e => updateCartItem(index, 'cantidad', Number(e.target.value))} min={1} />
                            </td>
                            <td>${precio.toLocaleString()}</td>
                            <td>
                              <div className="flex gap-8">
                                <input type="number" className="form-control w-24" value={item.descuentoUnitario || ''} onChange={e => updateCartItem(index, 'descuentoUnitario', Number(e.target.value))} placeholder="0" />
                                <select aria-label="Tipo Descuento" className="form-control" value={item.tipoDescuento} onChange={e => updateCartItem(index, 'tipoDescuento', e.target.value)}>
                                  <option value="PESOS">$</option>
                                  <option value="PORCENTAJE">%</option>
                                </select>
                              </div>
                            </td>
                            <td className="font-bold">${subt.toLocaleString()}</td>
                            <td>
                              <button aria-label="Eliminar producto" onClick={() => removeFromCart(index)} className="btn btn-secondary text-danger p-8">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {cart.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-24 text-secondary">No hay productos en la cotización</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar de Pago/Resumen */}
            <div className="flex flex-col gap-24 h-full">
              <div className="data-card p-24">
                <h2 className="text-secondary mb-16 text-xl">Datos del Cliente</h2>
                <select aria-label="Seleccionar Cliente" className="form-control mb-16" value={clienteSeleccionado || ''} onChange={e => setClienteSeleccionado(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Cliente General (Sin Especificar)</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.documentoIdentidad}</option>
                  ))}
                </select>
                <textarea className="form-control" rows={2} placeholder="Notas adicionales..." value={notas} onChange={e => setNotas(e.target.value)}></textarea>
              </div>

              <div className="data-card p-24 flex-1 flex flex-col">
                <h2 className="text-secondary mb-16 text-xl">Resumen</h2>
                <div className="flex justify-between mb-12">
                  <span className="text-secondary">Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-12">
                  <span className="text-secondary">Descuento Ítems</span>
                  <span className="text-danger">-${descuentosItems.toLocaleString()}</span>
                </div>

                <div className="flex justify-between mb-16 items-center">
                  <span className="text-secondary text-sm">
                    Desc. Global:
                  </span>
                  <div className="flex items-center gap-8">
                    <input type="number" aria-label="Valor de descuento" className="form-control text-right w-[80px]" value={descuentoGlobalValor} onChange={e => setDescuentoGlobalValor(Number(e.target.value))} />
                    <select aria-label="Tipo de descuento" className="form-control w-[70px] px-[8px]" value={descuentoGlobalTipo} onChange={e => setDescuentoGlobalTipo(e.target.value as 'PESOS' | 'PORCENTAJE')}>
                      <option value="PESOS">$</option>
                      <option value="PORCENTAJE">%</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between mb-16">
                  <span className="text-secondary">IVA (19%)</span>
                  <span>${iva.toLocaleString()}</span>
                </div>

                <div className="mt-auto pt-24 border-t border-white/10">
                  <div className="flex justify-between items-center mb-16">
                    <span className="text-xl">TOTAL</span>
                    <span className="text-3xl font-bold font-mono text-primary">${total.toLocaleString()}</span>
                  </div>
                  <button
                    className="btn btn-primary w-full py-12 flex justify-center gap-8 items-center font-bold text-lg cursor-pointer"
                    onClick={handleCrearCotizacion}
                    disabled={isSubmitting}
                  >
                    <FileText size={20} /> Generar Cotización
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'historial' && (
          <div className="data-card p-24">
            <div className="flex justify-between items-center mb-24">
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={18} />
                <input
                  type="text"
                  className="form-control !pl-12 w-full"
                  placeholder="Buscar N° Cotización..."
                  value={filtroCotizacion}
                  onChange={e => setFiltroCotizacion(e.target.value)}
                />
              </div>
            </div>

            {/* Vista Móvil: Tarjetas de Cotizaciones */}
            <div className="mobile-only-cards block md:hidden">
              {cotizaciones.length === 0 ? (
                <div className="text-center py-20 text-muted">No hay cotizaciones emitidas</div>
              ) : (
                <div className="flex flex-col gap-10">
                  {cotizaciones
                    .filter(c => c.numeroCotizacion.toLowerCase().includes(filtroCotizacion.toLowerCase()))
                    .map(cot => (
                      <div key={cot.id} className="p-14 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-primary font-bold">{cot.numeroCotizacion}</span>
                          <span className={`badge ${cot.estado === 'PENDIENTE' ? 'badge-warning' : (cot.estado === 'FACTURADA' ? 'badge-success' : 'badge-danger')}`}>
                            {cot.estado}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {cot.cliente ? cot.cliente.nombre : 'Cliente General'}
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted">
                          <span>{new Date(cot.fechaEmision).toLocaleDateString()}</span>
                          <span className="text-base font-bold text-success">${Number(cot.total).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-8 pt-8 border-t border-white/5">
                          <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4 cursor-pointer" onClick={() => generarCotizacionPDF(cot)}>
                            <Printer size={14} /> PDF
                          </button>
                          <button 
                            className="btn bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex-1 py-6 text-xs flex-center-gap-4 cursor-pointer transition-colors" 
                            onClick={() => handleShareWhatsApp(cot)}
                            title="Compartir por WhatsApp"
                          >
                            <MessageCircle size={14} className="text-emerald-400" /> WhatsApp
                          </button>
                          {cot.estado === 'PENDIENTE' && (
                            <button className="btn btn-primary flex-1 py-6 text-xs flex-center-gap-4 cursor-pointer" onClick={() => handleFacturar(cot)}>
                              <ArrowRight size={14} /> Facturar
                            </button>
                          )}
                        </div>
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
                    <th>N° COTIZACIÓN</th>
                    <th>FECHA</th>
                    <th>CLIENTE</th>
                    <th>TOTAL</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones
                    .filter(c => c.numeroCotizacion.toLowerCase().includes(filtroCotizacion.toLowerCase()))
                    .map(cot => (
                      <tr key={cot.id}>
                        <td className="font-mono text-primary">{cot.numeroCotizacion}</td>
                        <td>{new Date(cot.fechaEmision).toLocaleDateString()}</td>
                        <td>{cot.cliente ? cot.cliente.nombre : 'General'}</td>
                        <td className="font-bold">${Number(cot.total).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${cot.estado === 'PENDIENTE' ? 'badge-warning' : (cot.estado === 'FACTURADA' ? 'badge-success' : 'badge-danger')}`}>
                            {cot.estado}
                          </span>
                        </td>
                        <td className="flex gap-8">
                          <button className="btn btn-secondary btn-icon-sm p-8 cursor-pointer" title="Exportar PDF" onClick={() => generarCotizacionPDF(cot)}>
                            <Printer size={16} />
                          </button>
                          <button 
                            className="btn bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 btn-icon-sm p-8 cursor-pointer transition-colors" 
                            title="Compartir por WhatsApp" 
                            onClick={() => handleShareWhatsApp(cot)}
                          >
                            <MessageCircle size={16} />
                          </button>
                          {cot.estado === 'PENDIENTE' && (
                            <button className="btn btn-primary btn-icon-sm p-8 cursor-pointer" title="Convertir a Factura" onClick={() => handleFacturar(cot)}>
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {cotizaciones.length === 0 && (
                    <tr><td colSpan={6} className="table-empty-row">No hay cotizaciones emitidas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cotizaciones;
