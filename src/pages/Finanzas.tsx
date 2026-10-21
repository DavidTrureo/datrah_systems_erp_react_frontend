import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, type Factura, type Compra, type FinanzasResumen, type TransaccionCaja } from '../api';
import ConciliacionBancaria from '../components/ConciliacionBancaria';
import { CustomSelect } from '../components/CustomSelect';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  FileText,
  Calendar,
  Building2
} from 'lucide-react';

export default function Finanzas() {
  const { showSuccess, showError, showWarning } = useToast();
  const [resumen, setResumen] = useState<FinanzasResumen | null>(null);
  const [cxcList, setCxcList] = useState<Factura[]>([]);
  const [cxpList, setCxpList] = useState<Compra[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'caja' | 'cxc' | 'cxp' | 'historial' | 'conciliacion'>('caja');

  // Modal de Abono
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<{
    tipo: 'cxc' | 'cxp';
    id: number;
    docNum: string;
    total: number;
    pending: number;
  } | null>(null);
  const [abonoMonto, setAbonoMonto] = useState<number>(0);
  const [abonoMetodo, setAbonoMetodo] = useState('EFECTIVO');
  const [abonoNotas, setAbonoNotas] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resumenRes, cxcRes, cxpRes, txRes] = await Promise.all([
        api.getFinanzasResumen(),
        api.getFinanzasCxC(),
        api.getFinanzasCxP(),
        api.getFinanzasTransacciones()
      ]);
      setResumen(resumenRes);
      setCxcList(cxcRes);
      setCxpList(cxpRes);
      setTransacciones(txRes);
    } catch (err) {
      console.error("Error al cargar finanzas:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAbonoModal = (tipo: 'cxc' | 'cxp', id: number, docNum: string, total: number, paid: number) => {
    const pending = total - (paid || 0);
    setAbonoTarget({ tipo, id, docNum, total, pending });
    setAbonoMonto(pending);
    setAbonoMetodo('EFECTIVO');
    setAbonoNotas('');
    setShowAbonoModal(true);
  };

  const handleSaveAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoTarget) return;

    if (abonoMonto <= 0) {
      showWarning("El monto del abono debe ser mayor a 0.");
      return;
    }
    if (abonoMonto > abonoTarget.pending) {
      showWarning("El monto del abono no puede exceder el saldo pendiente.");
      return;
    }

    try {
      const payload = {
        monto: abonoMonto,
        metodoPago: abonoMetodo,
        notas: abonoNotas
      };

      if (abonoTarget.tipo === 'cxc') {
        await api.registrarAbonoCxC(abonoTarget.id, payload);
      } else {
        await api.registrarAbonoCxP(abonoTarget.id, payload);
      }

      setShowAbonoModal(false);
      setAbonoTarget(null);
      await loadData();
      showSuccess("¡Abono registrado con éxito!");
    } catch (err) {
      showError("Error al registrar abono: " + (err as Error).message);
    }
  };

  if (loading && !resumen) {
    return <div className="loading-app">Cargando Módulo Financiero...</div>;
  }

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <div className="module-badge">
            <DollarSign size={13} className="text-indigo-400" /> Tesorería & Finanzas
          </div>
          <h1>Finanzas & Tesorería ERP</h1>
          <p className="text-muted mt-2">Supervisa el flujo de caja neto, gestiona las cuentas por cobrar a clientes y las cuentas por pagar a proveedores.</p>
        </div>
      </div>

      {/* Tarjetas KPI Financieros */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-16 md:gap-20 mb-28 w-full">
          <div className="card-stat">
            <div className="card-stat-header">
              <span className="card-stat-label">Ingresos Reales</span>
              <div className="card-stat-icon icon-success">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="card-stat-value text-white">
              ${resumen.totalIngresos.toLocaleString('es-CL')}
            </div>
            <div className="text-xs text-success font-medium mt-2">
              Ventas contado + abonos cobrados
            </div>
          </div>

          <div className="card-stat">
            <div className="card-stat-header">
              <span className="card-stat-label">Egresos Reales</span>
              <div className="card-stat-icon" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'var(--danger)' }}>
                <TrendingDown size={20} />
              </div>
            </div>
            <div className="card-stat-value text-white">
              ${resumen.totalEgresos.toLocaleString('es-CL')}
            </div>
            <div className="text-xs text-danger font-medium mt-2">
              Compras contado + abonos pagados
            </div>
          </div>

          <div className="card-stat">
            <div className="card-stat-header">
              <span className="card-stat-label">Caja / Saldo Neto</span>
              <div className="card-stat-icon icon-blue">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="card-stat-value text-white">
              <span className={resumen.saldoNeto >= 0 ? 'text-primary' : 'text-danger'}>
                ${resumen.saldoNeto.toLocaleString('es-CL')}
              </span>
            </div>
            <div className="text-xs text-indigo-400 font-medium mt-2">
              Diferencia de flujo real
            </div>
          </div>

          <div className="card-stat">
            <div className="card-stat-header">
              <span className="card-stat-label">Pendientes (CxC - CxP)</span>
              <div className="card-stat-icon icon-warning">
                <Clock size={20} />
              </div>
            </div>
            <div className="card-stat-value text-warning">
              ${(resumen.outstandingCxC - resumen.outstandingCxP).toLocaleString('es-CL')}
            </div>
            <div className="text-xs text-muted font-medium mt-2">
              CxC: ${resumen.outstandingCxC.toLocaleString('es-CL')} | CxP: ${resumen.outstandingCxP.toLocaleString('es-CL')}
            </div>
          </div>
        </div>
      )}

      {/* Pestañas de Submódulo Swipeable */}
      <div className="module-tabs-nav">
        <button 
          className={`btn ${activeTab === 'caja' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('caja')}
        >
          Flujo de Caja Real
        </button>
        <button 
          className={`btn ${activeTab === 'cxc' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cxc')}
        >
          Cuentas por Cobrar {cxcList.filter(f => f.estado === 'CREDITO_PENDIENTE').length > 0 && `(${cxcList.filter(f => f.estado === 'CREDITO_PENDIENTE').length})`}
        </button>
        <button 
          className={`btn ${activeTab === 'cxp' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cxp')}
        >
          Cuentas por Pagar {cxpList.filter(c => c.estado === 'CREDITO_PENDIENTE').length > 0 && `(${cxpList.filter(c => c.estado === 'CREDITO_PENDIENTE').length})`}
        </button>
        <button 
          className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial de Movimientos
        </button>
        <button 
          className={`btn ${activeTab === 'conciliacion' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          onClick={() => setActiveTab('conciliacion')}
        >
          <Building2 size={16} /> Conciliación Bancaria
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      {activeTab === 'conciliacion' ? (
        <div className="mt-20">
          <ConciliacionBancaria
            cxcList={cxcList}
            cxpList={cxpList}
            onRefreshFinanzas={loadData}
          />
        </div>
      ) : (
        <div className="data-card mt-20 p-24">
        {activeTab === 'caja' && (
          <div>
            <h2 className="mb-16 flex-center-gap-8"><TrendingUp size={20} className="text-primary" /> Distribución de Flujo de Caja</h2>
            <p className="text-secondary mb-20">Este desglose muestra los flujos reales de dinero en efectivo, transferencias y tarjetas (contado directo y abonos de créditos).</p>
            
            <div className="grid-2-cols-gap-16">
              <div className="data-card p-16-mb-20 m-0">
                <h3 className="mb-12-fs-16 flex-center-gap-8 text-success"><ArrowUpRight size={18} /> Entradas de Caja</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th className="text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.filter(t => t.tipo === 'INGRESO').slice(0, 10).map((t, idx) => (
                        <tr key={idx}>
                          <td>{t.concepto}</td>
                          <td className="font-semibold text-success text-right">${t.monto.toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                      {transacciones.filter(t => t.tipo === 'INGRESO').length === 0 && (
                        <tr>
                          <td colSpan={2} className="table-empty-row-p-16">No hay registros de ingresos.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="data-card p-16-mb-20 m-0">
                <h3 className="mb-12-fs-16 flex-center-gap-8 text-danger"><ArrowDownRight size={18} /> Salidas de Caja</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th className="text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.filter(t => t.tipo === 'EGRESO').slice(0, 10).map((t, idx) => (
                        <tr key={idx}>
                          <td>{t.concepto}</td>
                          <td className="font-semibold text-danger text-right">${t.monto.toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                      {transacciones.filter(t => t.tipo === 'EGRESO').length === 0 && (
                        <tr>
                          <td colSpan={2} className="table-empty-row-p-16">No hay registros de egresos.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cxc' && (
          <div>
            <h2 className="mb-16 flex-center-gap-8"><Clock size={20} className="text-warning" /> Cuentas por Cobrar (Clientes)</h2>
            <p className="text-secondary mb-20 text-sm">Controla las facturas y ventas emitidas a crédito. Registra abonos cuando los clientes realicen transferencias o entreguen efectivo.</p>
            
            {/* Mobile View: Cards */}
            <div className="mobile-only-cards block md:hidden">
              {cxcList.length === 0 ? (
                <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
                  No hay cuentas por cobrar pendientes.
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {cxcList.map((f) => {
                    const pendiente = f.total - (f.montoPagado || 0);
                    return (
                      <div key={f.id} className="mobile-card-item">
                        <div className="flex justify-between items-start gap-10">
                          <div>
                            <span className="font-bold text-white text-base font-mono">Factura #{f.numeroFactura}</span>
                            <div className="text-sm font-semibold text-white/90 mt-1">{f.cliente?.nombre || 'Cliente General'}</div>
                            <div className="text-xs text-muted font-mono mt-1">{new Date(f.fechaEmision).toLocaleDateString()}</div>
                          </div>
                          <span className={`badge ${f.estado === 'EMITIDA' ? 'badge-success' : 'badge-warning'}`}>
                            {f.estado === 'EMITIDA' ? 'SALDADA' : 'PENDIENTE'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-8 py-10 px-12 bg-white/[0.03] rounded-xl border border-white/5 text-center text-xs">
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Total</span>
                            <span className="font-bold text-white font-mono">${f.total.toLocaleString('es-CL')}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Cobrado</span>
                            <span className="font-bold text-success font-mono">${(f.montoPagado || 0).toLocaleString('es-CL')}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Pendiente</span>
                            <span className="font-black text-danger font-mono text-sm">${pendiente.toLocaleString('es-CL')}</span>
                          </div>
                        </div>

                        {pendiente > 0 && (
                          <button 
                            className="btn btn-primary h-10 text-xs flex items-center justify-center gap-6 w-full font-bold shadow-indigo-500/20"
                            onClick={() => handleOpenAbonoModal('cxc', f.id!, f.numeroFactura, f.total, f.montoPagado)}
                          >
                            <PlusCircle size={15} /> Registrar Abono
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="desktop-only-table hidden md:block table-responsive w-full">
              <table className="data-table min-w-[780px]">
                <thead>
                  <tr>
                    <th>Nº Factura</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total Factura</th>
                    <th>Cobrado</th>
                    <th>Pendiente</th>
                    <th>Estado</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cxcList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty-row">No hay cuentas por cobrar pendientes.</td>
                    </tr>
                  ) : (
                    cxcList.map((f) => {
                      const pendiente = f.total - (f.montoPagado || 0);
                      return (
                        <tr key={f.id}>
                          <td className="font-bold">{f.numeroFactura}</td>
                          <td>{new Date(f.fechaEmision).toLocaleDateString()}</td>
                          <td>{f.cliente?.nombre}</td>
                          <td className="font-semibold">${f.total.toLocaleString('es-CL')}</td>
                          <td className="text-success">${(f.montoPagado || 0).toLocaleString('es-CL')}</td>
                          <td className="font-bold text-danger">${pendiente.toLocaleString('es-CL')}</td>
                          <td>
                            <span className={`badge ${f.estado === 'EMITIDA' ? 'badge-success' : 'badge-warning'}`}>
                              {f.estado === 'EMITIDA' ? 'SALDADA' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="text-right">
                            {pendiente > 0 ? (
                              <button 
                                className="btn btn-primary btn-table-action-sm inline-flex-gap-8"
                                onClick={() => handleOpenAbonoModal('cxc', f.id!, f.numeroFactura, f.total, f.montoPagado)}
                              >
                                <PlusCircle size={14} /> Registrar Abono
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'cxp' && (
          <div>
            <h2 className="mb-16 flex-center-gap-8"><Clock size={20} className="text-warning" /> Cuentas por Pagar (Proveedores)</h2>
            <p className="text-secondary mb-20 text-sm">Controla las compras de mercadería que has realizado a crédito. Registra tus pagos para llevar al día tus cuentas.</p>
            
            {/* Mobile View: Cards */}
            <div className="mobile-only-cards block md:hidden">
              {cxpList.length === 0 ? (
                <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
                  No hay cuentas por pagar pendientes.
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {cxpList.map((c) => {
                    const pendiente = c.total - (c.montoPagado || 0);
                    return (
                      <div key={c.id} className="mobile-card-item">
                        <div className="flex justify-between items-start gap-10">
                          <div>
                            <span className="font-bold text-white text-base font-mono">Orden #{c.numeroDocumento}</span>
                            <div className="text-sm font-semibold text-white/90 mt-1">{c.proveedor?.nombre || 'Proveedor General'}</div>
                            <div className="text-xs text-muted font-mono mt-1">{new Date(c.fechaCompra).toLocaleDateString()}</div>
                          </div>
                          <span className={`badge ${c.estado === 'COMPRADA' ? 'badge-success' : 'badge-warning'}`}>
                            {c.estado === 'COMPRADA' ? 'SALDADO' : 'PENDIENTE'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-8 py-10 px-12 bg-white/[0.03] rounded-xl border border-white/5 text-center text-xs">
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Total</span>
                            <span className="font-bold text-white font-mono">${c.total.toLocaleString('es-CL')}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Pagado</span>
                            <span className="font-bold text-success font-mono">${(c.montoPagado || 0).toLocaleString('es-CL')}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px] uppercase font-bold">Pendiente</span>
                            <span className="font-black text-danger font-mono text-sm">${pendiente.toLocaleString('es-CL')}</span>
                          </div>
                        </div>

                        {pendiente > 0 && (
                          <button 
                            className="btn btn-primary h-10 text-xs flex items-center justify-center gap-6 w-full font-bold shadow-indigo-500/20"
                            onClick={() => handleOpenAbonoModal('cxp', c.id!, c.numeroDocumento, c.total, c.montoPagado)}
                          >
                            <PlusCircle size={15} /> Registrar Pago
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="desktop-only-table hidden md:block table-responsive w-full">
              <table className="data-table min-w-[780px]">
                <thead>
                  <tr>
                    <th>Nº Documento</th>
                    <th>Fecha Compra</th>
                    <th>Proveedor</th>
                    <th>Total Compra</th>
                    <th>Pagado</th>
                    <th>Pendiente</th>
                    <th>Estado</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cxpList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty-row">No hay cuentas por pagar pendientes.</td>
                    </tr>
                  ) : (
                    cxpList.map((c) => {
                      const pendiente = c.total - (c.montoPagado || 0);
                      return (
                        <tr key={c.id}>
                          <td className="font-bold">{c.numeroDocumento}</td>
                          <td>{new Date(c.fechaCompra).toLocaleDateString()}</td>
                          <td>{c.proveedor?.nombre}</td>
                          <td className="font-semibold">${c.total.toLocaleString('es-CL')}</td>
                          <td className="text-success">${(c.montoPagado || 0).toLocaleString('es-CL')}</td>
                          <td className="font-bold text-danger">${pendiente.toLocaleString('es-CL')}</td>
                          <td>
                            <span className={`badge ${c.estado === 'COMPRADA' ? 'badge-success' : 'badge-warning'}`}>
                              {c.estado === 'COMPRADA' ? 'SALDADO' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="text-right">
                            {pendiente > 0 ? (
                              <button 
                                className="btn btn-primary btn-table-action-sm inline-flex-gap-8"
                                onClick={() => handleOpenAbonoModal('cxp', c.id!, c.numeroDocumento, c.total, c.montoPagado)}
                              >
                                <PlusCircle size={14} /> Registrar Pago
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div>
            <h2 className="mb-16 flex-center-gap-8"><FileText size={20} className="text-cyan" /> Libro Auxiliar de Caja</h2>
            <p className="text-secondary mb-20">Línea de tiempo histórica unificada que detalla todos los flujos monetarios reales que han entrado o salido del sistema.</p>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Método Pago</th>
                    <th>Observación</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {transacciones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty-row">No hay movimientos registrados.</td>
                    </tr>
                  ) : (
                    transacciones.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="text-sm">
                          <span className="inline-flex-gap-8 text-secondary">
                            <Calendar size={13} />
                            {new Date(tx.fecha).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${tx.tipo === 'INGRESO' ? 'badge-success' : 'badge-danger'}`}>
                            {tx.tipo}
                          </span>
                        </td>
                        <td className="font-semibold">{tx.concepto}</td>
                        <td>
                          <span className="badge badge-secondary">{tx.metodoPago}</span>
                        </td>
                        <td className="text-sm-secondary">{tx.notas || '-'}</td>
                        <td className={`font-bold text-right ${tx.tipo === 'INGRESO' ? 'text-success' : 'text-danger'}`}>
                          {tx.tipo === 'INGRESO' ? '+' : '-'}${tx.monto.toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* MODAL: Registrar Abono / Pago */}
      {showAbonoModal && abonoTarget && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-md">
            <div className="flex-between-center mb-20">
              <h2>Registrar Pago / Abono</h2>
              <button className="btn btn-secondary" onClick={() => setShowAbonoModal(false)}>Cerrar</button>
            </div>

            <p className="movement-modal-subtitle">
              Documento: <strong>{abonoTarget.docNum}</strong> | Saldo Pendiente: <strong className="text-danger">${abonoTarget.pending.toLocaleString('es-CL')}</strong>
            </p>

            <form onSubmit={handleSaveAbono}>
              <div className="form-group">
                <label htmlFor="abono-monto-input">Monto del Abono ($) *</label>
                <input 
                  id="abono-monto-input"
                  type="number"
                  required
                  min="1"
                  max={abonoTarget.pending}
                  step="1"
                  value={abonoMonto}
                  onChange={(e) => setAbonoMonto(Number(e.target.value))}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="abono-metodo-select">Método de Pago *</label>
                <CustomSelect
                  id="abono-metodo-select"
                  value={abonoMetodo}
                  onChange={(val) => setAbonoMetodo(val)}
                  searchable={false}
                  options={[
                    { value: 'EFECTIVO', label: 'Efectivo' },
                    { value: 'TARJETA', label: 'Tarjeta de Crédito / Débito' },
                    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="abono-notas-input">Notas / Referencia (Opcional)</label>
                <textarea 
                  id="abono-notas-input"
                  value={abonoNotas}
                  onChange={(e) => setAbonoNotas(e.target.value)}
                  className="form-control"
                  rows={2}
                  placeholder="Ej: Transferencia Banco Estado Nº 39182"
                />
              </div>

              <div className="flex justify-end gap-16 mt-24">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAbonoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
