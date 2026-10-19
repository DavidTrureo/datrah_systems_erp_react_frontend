import React, { useEffect, useState } from 'react';
import { api, type CuentaContable, type ComprobanteContable, type DetalleComprobante, type BalanceGeneralReport, type EstadoResultadosReport, type LibroMayorRow } from '../api';
import { PlusCircle, CheckCircle, XCircle, Search, FileText, ArrowRight, BookOpen, AlertCircle, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { generarReporteTablaPDF } from '../utils/pdfGenerator';

export default function Contabilidad() {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [comprobantes, setComprobantes] = useState<ComprobanteContable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'diario' | 'nuevo' | 'balance' | 'resultados' | 'mayor'>('diario');
  const [balance, setBalance] = useState<BalanceGeneralReport | null>(null);
  const [resultados, setResultados] = useState<EstadoResultadosReport | null>(null);
  const [mayor, setMayor] = useState<LibroMayorRow[]>([]);
  const [selectedCuentaMayor, setSelectedCuentaMayor] = useState<number | ''>('');

  // Formulario Nuevo Comprobante
  const [nuevoComp, setNuevoComp] = useState<Partial<ComprobanteContable>>({
    tipo: 'INGRESO',
    fecha: new Date().toISOString().split('T')[0],
    glosa: '',
    estado: 'CONTABILIZADO',
    detalles: []
  });

  const [detalleForm, setDetalleForm] = useState<Partial<DetalleComprobante>>({
    cuenta: undefined,
    debe: 0,
    haber: 0,
    glosaLinea: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cuentasRes, comprobantesRes] = await Promise.all([
        api.getCuentasContables(),
        api.getComprobantes()
      ]);
      setCuentas(cuentasRes);
      setComprobantes(comprobantesRes);
    } catch (err) {
      console.error("Error al cargar contabilidad:", err);
    } finally {
      setLoading(false);
    }
  }

  const loadBalance = async () => {
    try {
      const data = await api.getBalanceGeneral();
      setBalance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResultados = async () => {
    try {
      const data = await api.getEstadoResultados();
      setResultados(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMayor = async (cuentaId: number) => {
    if (!cuentaId) {
      setMayor([]);
      return;
    }
    try {
      const data = await api.getLibroMayor(cuentaId);
      setMayor(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'balance' && !balance) loadBalance();
    if (activeTab === 'resultados' && !resultados) loadResultados();
  }, [activeTab, balance, resultados]);

  const handleAddDetalle = () => {
    if (!detalleForm.cuenta) {
      alert("Debe seleccionar una cuenta contable");
      return;
    }
    const debe = Number(detalleForm.debe || 0);
    const haber = Number(detalleForm.haber || 0);

    if (debe === 0 && haber === 0) {
      alert("Debe ingresar un monto en Debe o Haber");
      return;
    }
    if (debe > 0 && haber > 0) {
      alert("Una línea no puede tener monto en Debe y Haber al mismo tiempo");
      return;
    }

    setNuevoComp(prev => ({
      ...prev,
      detalles: [...(prev.detalles || []), detalleForm as DetalleComprobante]
    }));

    setDetalleForm({ cuenta: undefined, debe: 0, haber: 0, glosaLinea: '' });
  };

  const handleRemoveDetalle = (idx: number) => {
    setNuevoComp(prev => {
      const copy = [...(prev.detalles || [])];
      copy.splice(idx, 1);
      return { ...prev, detalles: copy };
    });
  };

  const handleSaveComprobante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComp.glosa || !nuevoComp.fecha || !nuevoComp.detalles || nuevoComp.detalles.length < 2) {
      alert("Complete los datos requeridos y agregue al menos 2 líneas de detalle.");
      return;
    }

    // Verificar Partida Doble
    const totalDebe = nuevoComp.detalles.reduce((acc, det) => acc + Number(det.debe || 0), 0);
    const totalHaber = nuevoComp.detalles.reduce((acc, det) => acc + Number(det.haber || 0), 0);

    if (totalDebe !== totalHaber) {
      alert(`El comprobante no cuadra (Partida Doble).\nTotal Debe: $${totalDebe}\nTotal Haber: $${totalHaber}`);
      return;
    }

    try {
      // En un caso real, un comprobante manual puede no tener número hasta que se guarda, 
      // pero nuestro backend por ahora requiere numeroComprobante. Generamos uno aleatorio o secuencial
      const numC = Math.floor(Math.random() * 100000);
      const payload = { ...nuevoComp, numeroComprobante: numC };
      
      await api.crearComprobante(payload);
      alert("Comprobante creado exitosamente.");
      setActiveTab('diario');
      setNuevoComp({
        tipo: 'INGRESO',
        fecha: new Date().toISOString().split('T')[0],
        glosa: '',
        estado: 'CONTABILIZADO',
        detalles: []
      });
      loadData();
    } catch (err) {
      alert("Error al crear comprobante: " + (err as Error).message);
    }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm("¿Está seguro de anular este comprobante?")) return;
    try {
      await api.anularComprobante(id);
      loadData();
    } catch (err) {
      alert("Error al anular: " + (err as Error).message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando Módulo Contable...</div>;
  }

  // --- Sub-vistas ---
  
  const totalDiarioDebe = comprobantes.reduce((sum, c) => sum + (c.estado !== 'ANULADO' ? c.detalles.reduce((s, d) => s + (d.debe || 0), 0) : 0), 0);
  const totalDiarioHaber = comprobantes.reduce((sum, c) => sum + (c.estado !== 'ANULADO' ? c.detalles.reduce((s, d) => s + (d.haber || 0), 0) : 0), 0);

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <h1>Contabilidad (ERP)</h1>
          <p>Motor de partida doble, libro diario y plan de cuentas de la empresa.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setActiveTab('nuevo')}
        >
          <PlusCircle size={18} /> Nuevo Comprobante
        </button>
      </div>

      <div className="data-card mt-32 tabs-container-flat">
        <div className="tabs-header-border">
          <button
            onClick={() => setActiveTab('diario')}
            className={`btn ${activeTab === 'diario' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Libro Diario
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`btn ${activeTab === 'plan' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Plan de Cuentas
          </button>

          <button
            onClick={() => setActiveTab('mayor')}
            className={`btn ${activeTab === 'mayor' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Libro Mayor
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`btn ${activeTab === 'balance' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Balance General
          </button>
          <button
            onClick={() => setActiveTab('resultados')}
            className={`btn ${activeTab === 'resultados' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Estado de Resultados
          </button>
        </div>
      </div>

      {activeTab === 'diario' && (
        <div className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 mb-24">
            <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group flex flex-col h-full">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all"></div>
              <div className="flex justify-between items-start mb-16 relative z-10">
                <span className="text-muted font-medium uppercase tracking-wider text-xs">Comprobantes</span>
                <div className="p-8 bg-primary/10 rounded-lg text-primary">
                  <FileText size={20} />
                </div>
              </div>
              <div className="text-3xl font-mono font-bold text-white relative z-10">
                {comprobantes.length}
              </div>
              <div className="text-xs text-muted mt-8 relative z-10">
                Registrados en el diario
              </div>
            </div>

            <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group flex flex-col h-full">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/20 rounded-full blur-xl group-hover:bg-success/30 transition-all"></div>
              <div className="flex justify-between items-start mb-16 relative z-10">
                <span className="text-muted font-medium uppercase tracking-wider text-xs">Total Cargos (Debe)</span>
                <div className="p-8 bg-success/10 rounded-lg text-success">
                  <PlusCircle size={20} />
                </div>
              </div>
              <div className="text-3xl font-mono font-bold text-white relative z-10">
                ${totalDiarioDebe.toLocaleString('es-CL')}
              </div>
              <div className="text-xs text-muted mt-8 relative z-10">
                Movimientos de cargo
              </div>
            </div>

            <div className="data-card p-24 bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3c] border border-white/5 relative overflow-hidden group flex flex-col h-full">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-danger/20 rounded-full blur-xl group-hover:bg-danger/30 transition-all"></div>
              <div className="flex justify-between items-start mb-16 relative z-10">
                <span className="text-muted font-medium uppercase tracking-wider text-xs">Total Abonos (Haber)</span>
                <div className="p-8 bg-danger/10 rounded-lg text-danger">
                  <ArrowRight size={20} />
                </div>
              </div>
              <div className="text-3xl font-mono font-bold text-white relative z-10">
                ${totalDiarioHaber.toLocaleString('es-CL')}
              </div>
              <div className="text-xs text-muted mt-8 relative z-10">
                Movimientos de abono
              </div>
            </div>
          </div>

          <div className="data-card p-24">
            <h2 className="mb-16">Libro Diario</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Comprobante</th>
                    <th>Glosa</th>
                    <th>Cuenta</th>
                    <th className="text-right">Debe</th>
                    <th className="text-right">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-16 text-secondary">
                        No hay comprobantes contables registrados.
                      </td>
                    </tr>
                  ) : (
                    comprobantes.map(comp => (
                      <React.Fragment key={comp.id}>
                        {comp.detalles.map((det, idx) => (
                          <tr key={`${comp.id}-${idx}`} className={`${comp.estado === 'ANULADO' ? 'opacity-50 line-through' : ''} ${idx === comp.detalles.length - 1 ? 'border-b-thick' : ''}`}>
                            {idx === 0 ? (
                              <>
                                <td rowSpan={comp.detalles.length} className="font-semibold">{new Date(comp.fecha).toLocaleDateString()}</td>
                                <td rowSpan={comp.detalles.length}>
                                  <div className="font-bold text-primary">{comp.tipo}-{comp.numeroComprobante}</div>
                                  {comp.estado === 'ANULADO' && <span className="badge badge-danger mt-4 block">ANULADO</span>}
                                  {comp.estado !== 'ANULADO' && (
                                    <button onClick={() => handleAnular(comp.id!)} className="btn-link text-danger mt-4 block">Anular</button>
                                  )}
                                </td>
                                <td rowSpan={comp.detalles.length} className="text-secondary">{comp.glosa}</td>
                              </>
                            ) : null}
                            <td>
                              <div className={det.haber! > 0 ? 'pl-24 text-secondary' : 'font-semibold'}>
                                {det.cuenta.codigo} - {det.cuenta.nombre}
                              </div>
                              {det.glosaLinea && <div className="text-secondary">{det.glosaLinea}</div>}
                            </td>
                            <td className="text-right font-mono">
                              {det.debe! > 0 ? `$${Number(det.debe).toLocaleString('es-CL')}` : ''}
                            </td>
                            <td className="text-right font-mono">
                              {det.haber! > 0 ? `$${Number(det.haber).toLocaleString('es-CL')}` : ''}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="data-card mt-20 p-24">
          <div className="flex-between mb-16">
            <h2 className="m-0">Plan de Cuentas (Chile)</h2>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input type="text" placeholder="Buscar cuenta..." className="form-control !pl-10 w-72" />
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre Cuenta</th>
                <th>Tipo</th>
                <th className="text-center">Imputable</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map(c => (
                <tr key={c.id}>
                  <td className="font-mono text-primary font-bold">{c.codigo}</td>
                  <td className="font-semibold">{c.nombre}</td>
                  <td>
                    <span className={`badge ${
                      c.tipo === 'ACTIVO' ? 'badge-success' :
                      c.tipo === 'PASIVO' ? 'badge-danger' :
                      c.tipo === 'PATRIMONIO' ? 'badge-warning' :
                      'badge-primary'
                    }`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="text-center">
                    {c.imputable ? <CheckCircle size={18} className="text-success inline-block" /> : <XCircle size={18} className="text-danger inline-block" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'nuevo' && (
        <div className="mt-20">
          <form onSubmit={handleSaveComprobante}>
            <div className="data-card p-24 mb-24">
              <h2 className="mb-20 border-b pb-12 border-gray-800 text-primary flex items-center gap-2">
                <FileText size={20} /> Crear Comprobante Manual
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                <div className="form-group m-0">
                  <label>Tipo de Comprobante</label>
                  <select 
                    title="Tipo de Comprobante"
                    className="form-control"
                    value={nuevoComp.tipo}
                    onChange={e => setNuevoComp({...nuevoComp, tipo: e.target.value})}
                    required
                  >
                    <option value="INGRESO">Ingreso</option>
                    <option value="EGRESO">Egreso</option>
                    <option value="TRASPASO">Traspaso</option>
                  </select>
                </div>
                <div className="form-group m-0">
                  <label>Fecha</label>
                  <input 
                    type="date" 
                    title="Fecha"
                    placeholder="Fecha"
                    className="form-control"
                    value={nuevoComp.fecha}
                    onChange={e => setNuevoComp({...nuevoComp, fecha: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group m-0">
                  <label>Glosa (Descripción General)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={nuevoComp.glosa}
                    onChange={e => setNuevoComp({...nuevoComp, glosa: e.target.value})}
                    placeholder="Ej. Apertura de caja, Pago proveedor..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="data-card p-24 mb-24">
              <h3 className="mb-16 text-secondary">1. Agregar Línea de Detalle</h3>
              <div className="flex items-end gap-16 bg-darker p-16 rounded-lg border border-gray-800/50">
                <div className="form-group m-0 flex-1">
                  <label>Cuenta Contable</label>
                  <select 
                    title="Cuenta Contable"
                    className="form-control"
                    value={detalleForm.cuenta?.id || ''}
                    onChange={e => {
                      const c = cuentas.find(x => x.id === Number(e.target.value));
                      setDetalleForm({...detalleForm, cuenta: c});
                    }}
                  >
                    <option value="">Seleccione cuenta...</option>
                    {cuentas.filter(c => c.imputable).map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group m-0 flex-1">
                  <label>Glosa Línea (Opcional)</label>
                  <input type="text" title="Glosa" className="form-control" value={detalleForm.glosaLinea} onChange={e => setDetalleForm({...detalleForm, glosaLinea: e.target.value})} placeholder="Detalle de la cuenta..." />
                </div>
                <div className="form-group m-0 w-32">
                  <label>Debe ($)</label>
                  <input type="number" title="Debe" placeholder="0" min="0" className="form-control" value={detalleForm.debe || ''} onChange={e => setDetalleForm({...detalleForm, debe: Number(e.target.value)})} />
                </div>
                <div className="form-group m-0 w-32">
                  <label>Haber ($)</label>
                  <input type="number" title="Haber" placeholder="0" min="0" className="form-control" value={detalleForm.haber || ''} onChange={e => setDetalleForm({...detalleForm, haber: Number(e.target.value)})} />
                </div>
                <div>
                  <button type="button" onClick={handleAddDetalle} className="btn btn-secondary h-11" title="Agregar Línea" aria-label="Agregar Línea">
                    <PlusCircle size={18} /> Agregar
                  </button>
                </div>
              </div>

              <h3 className="mt-24 mb-16 text-secondary">2. Asiento Contable</h3>
              <table className="data-table">
                <thead>
                  <tr className="bg-darker">
                    <th>Cuenta</th>
                    <th>Glosa</th>
                    <th className="text-right">Debe</th>
                    <th className="text-right">Haber</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {nuevoComp.detalles?.map((det, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50">
                      <td className="font-semibold">{det.cuenta?.codigo} - {det.cuenta?.nombre}</td>
                      <td className="text-secondary">{det.glosaLinea}</td>
                      <td className="text-right font-mono text-success">{det.debe! > 0 ? `$${det.debe?.toLocaleString('es-CL')}` : ''}</td>
                      <td className="text-right font-mono text-danger">{det.haber! > 0 ? `$${det.haber?.toLocaleString('es-CL')}` : ''}</td>
                      <td className="text-center">
                        <button type="button" onClick={() => handleRemoveDetalle(idx)} className="btn-link text-danger">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {nuevoComp.detalles?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-32 text-secondary bg-darker/50 italic">Aún no has agregado líneas al comprobante.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-darker border-t border-gray-700">
                    <td colSpan={2} className="text-right p-16 font-bold">TOTALES:</td>
                    <td className={`text-right font-mono p-16 font-bold ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) !== nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0) ? 'text-danger' : 'text-success'}`}>
                      ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0).toLocaleString('es-CL')}
                    </td>
                    <td className={`text-right font-mono p-16 font-bold ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) !== nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0) ? 'text-danger' : 'text-success'}`}>
                      ${nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0).toLocaleString('es-CL')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              
              <div className="flex-between mt-24">
                <div className="text-sm">
                  {nuevoComp.detalles?.length! > 0 && nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) === nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0) ? (
                    <span className="badge badge-success">✓ Asiento Cuadrado</span>
                  ) : nuevoComp.detalles?.length! > 0 ? (
                    <span className="badge badge-danger">✗ Diferencia: ${Math.abs(nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0)! - nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0)!).toLocaleString('es-CL')}</span>
                  ) : null}
                </div>
                <button type="submit" className="btn btn-primary btn-lg flex-center-gap-8" disabled={nuevoComp.detalles?.length === 0 || nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) !== nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0)}>
                  <CheckCircle size={20} /> Registrar Comprobante
                </button>
              </div>
            </div>
          </form>
        </div>
      )}


      {activeTab === 'mayor' && (
        <div className="mt-20">
          <div className="data-card p-24 mb-24">
            <div className="flex-between">
              <h2 className="m-0 flex items-center gap-2 text-primary">
                <BookOpen size={20} /> Libro Mayor
              </h2>
              <div className="form-group m-0 w-96">
                <select 
                  title="Cuenta Mayor"
                  className="form-control"
                  value={selectedCuentaMayor}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedCuentaMayor(val ? Number(val) : '');
                    if (val) loadMayor(Number(val));
                  }}
                >
                  <option value="">Seleccione una cuenta para analizar...</option>
                  {cuentas.filter(c => c.imputable).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCuentaMayor === '' ? (
            <div className="data-card p-48 text-center text-secondary border-dashed border-2 border-gray-800">
              <div className="flex justify-center mb-16 opacity-50">
                <Search size={48} />
              </div>
              <h3 className="mb-8">Ninguna cuenta seleccionada</h3>
              <p>Por favor, utiliza el selector de arriba para elegir una cuenta contable y ver todos sus movimientos históricos.</p>
            </div>
          ) : (
            <div className="data-card p-24">
              <table className="data-table">
                <thead>
                  <tr className="bg-darker">
                    <th>Fecha</th>
                    <th>Comprobante</th>
                    <th>Glosa</th>
                    <th className="text-right">Debe</th>
                    <th className="text-right">Haber</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {mayor.map((m, i) => (
                    <tr key={i} className="border-b border-gray-800/30">
                      <td>{new Date(m.fecha).toLocaleDateString()}</td>
                      <td className="font-bold text-primary">{m.comprobante}</td>
                      <td className="text-secondary">{m.glosa}</td>
                      <td className="text-right font-mono text-success">{m.debe > 0 ? `$${m.debe.toLocaleString('es-CL')}` : ''}</td>
                      <td className="text-right font-mono text-danger">{m.haber > 0 ? `$${m.haber.toLocaleString('es-CL')}` : ''}</td>
                      <td className={`text-right font-mono font-bold ${m.saldo < 0 ? 'text-danger' : 'text-success'}`}>
                        ${m.saldo.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                  {mayor.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-32 text-secondary bg-darker/50 italic">Sin movimientos registrados para esta cuenta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balance' && !balance && (
        <div className="mt-20 p-40 text-center text-secondary">
          <div className="animate-spin inline-block w-32 h-32 border-4 border-primary border-t-transparent rounded-full mb-16"></div>
          <p>Cargando Balance General...</p>
        </div>
      )}
      {activeTab === 'balance' && balance && (
        <div className="mt-20">
          <div className="flex justify-end mb-16">
            <button 
              className="btn btn-primary flex items-center gap-8" 
              onClick={() => {
                const datos = [
                  ...balance.activos.map(c => ['Activo', `${c.codigo} - ${c.nombre}`, `$${c.saldo.toLocaleString('es-CL')}`]),
                  ...balance.pasivos.map(c => ['Pasivo', `${c.codigo} - ${c.nombre}`, `$${c.saldo.toLocaleString('es-CL')}`]),
                  ...balance.patrimonio.map(c => ['Patrimonio', `${c.codigo} - ${c.nombre}`, `$${c.saldo.toLocaleString('es-CL')}`])
                ];
                generarReporteTablaPDF('Balance General', `Total Activos: $${balance.totalActivos.toLocaleString('es-CL')} | Total Pasivo+Patrimonio: $${(balance.totalPasivos + balance.totalPatrimonio).toLocaleString('es-CL')}`, ['Categoría', 'Cuenta', 'Saldo'], datos);
              }}
            >
              <Printer size={16} /> Exportar a PDF
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
          <div className="data-card overflow-hidden">
            <h2 className="text-success m-0 p-16 bg-success/20 border-b border-success/30 flex items-center gap-2">
              <TrendingUp size={20} /> Activos
            </h2>
            <div className="p-16">
              <table className="data-table">
                <tbody>
                  {balance.activos.map(c => (
                    <tr key={c.codigo} className="border-b border-gray-800/30">
                      <td>{c.codigo} - {c.nombre}</td>
                      <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-lg bg-darker/50 border-t-2 border-success/50">
                    <td className="p-12">TOTAL ACTIVOS</td>
                    <td className="text-right font-mono text-success p-12">${balance.totalActivos.toLocaleString('es-CL')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div>
            <div className="data-card overflow-hidden mb-24">
              <h2 className="text-danger m-0 p-16 bg-danger/20 border-b border-danger/30 flex items-center gap-2">
                <TrendingDown size={20} /> Pasivos
              </h2>
              <div className="p-16">
                <table className="data-table">
                  <tbody>
                    {balance.pasivos.map(c => (
                      <tr key={c.codigo} className="border-b border-gray-800/30">
                        <td>{c.codigo} - {c.nombre}</td>
                        <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-darker/50 border-t-2 border-danger/50">
                      <td className="p-12">TOTAL PASIVOS</td>
                      <td className="text-right font-mono text-danger p-12">${balance.totalPasivos.toLocaleString('es-CL')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="data-card overflow-hidden">
              <h2 className="text-warning m-0 p-16 bg-warning/20 border-b border-warning/30 flex items-center gap-2">
                <BookOpen size={20} /> Patrimonio
              </h2>
              <div className="p-16">
                <table className="data-table">
                  <tbody>
                    {balance.patrimonio.map(c => (
                      <tr key={c.codigo} className="border-b border-gray-800/30">
                        <td>{c.codigo} - {c.nombre}</td>
                        <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-darker/50 border-t-2 border-warning/50">
                      <td className="p-12">TOTAL PATRIMONIO</td>
                      <td className="text-right font-mono text-warning p-12">${balance.totalPatrimonio.toLocaleString('es-CL')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className={`data-card p-24 mt-24 text-center border-2 shadow-lg relative overflow-hidden ${balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? 'border-success/50 bg-success/5 shadow-success/20' : 'border-danger/50 bg-danger/5 shadow-danger/20'}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? 'bg-success' : 'bg-danger'}`}></div>
              <h3 className="text-secondary mb-8">Total Pasivo + Patrimonio</h3>
              <p className={`text-4xl font-mono font-bold ${balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? 'text-success' : 'text-danger'}`}>
                ${(balance.totalPasivos + balance.totalPatrimonio).toLocaleString('es-CL')}
              </p>
              
              <div className="mt-16">
                {balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? (
                  <span className="badge badge-success px-16 py-8 text-sm"><CheckCircle size={16} className="inline mr-4" /> ¡Balance Cuadrado!</span>
                ) : (
                  <span className="badge badge-danger px-16 py-8 text-sm"><AlertCircle size={16} className="inline mr-4" /> ¡Descuadre en el Balance!</span>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'resultados' && !resultados && (
        <div className="mt-20 p-40 text-center text-secondary">
          <div className="animate-spin inline-block w-32 h-32 border-4 border-primary border-t-transparent rounded-full mb-16"></div>
          <p>Cargando Estado de Resultados...</p>
        </div>
      )}
      {activeTab === 'resultados' && resultados && (
        <div className="mt-20">
          <div className="flex justify-end mb-16">
            <button 
              className="btn btn-primary flex items-center gap-8" 
              onClick={() => {
                const datos = [
                  ...resultados.ingresos.map(c => ['Ingresos', `${c.codigo} - ${c.nombre}`, `$${c.saldo.toLocaleString('es-CL')}`]),
                  ...resultados.egresos.map(c => ['Egresos', `${c.codigo} - ${c.nombre}`, `$${c.saldo.toLocaleString('es-CL')}`])
                ];
                generarReporteTablaPDF('Estado de Resultados', `Total Ingresos: $${resultados.totalIngresos.toLocaleString('es-CL')} | Total Egresos: $${resultados.totalEgresos.toLocaleString('es-CL')} | Utilidad Neta: $${resultados.utilidadNeta.toLocaleString('es-CL')}`, ['Categoría', 'Cuenta', 'Saldo'], datos);
              }}
            >
              <Printer size={16} /> Exportar a PDF
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 mb-24">
            <div className="data-card overflow-hidden">
              <h2 className="text-success m-0 p-16 bg-success/20 border-b border-success/30 flex items-center gap-2">
                <TrendingUp size={20} /> Ingresos (Ganancias)
              </h2>
              <div className="p-16">
                <table className="data-table">
                  <tbody>
                    {resultados.ingresos.map(c => (
                      <tr key={c.codigo} className="border-b border-gray-800/30">
                        <td>{c.codigo} - {c.nombre}</td>
                        <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                    {resultados.ingresos.length === 0 && (
                      <tr><td colSpan={2} className="text-center text-secondary italic">Sin registros</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-lg bg-darker/50 border-t-2 border-success/50">
                      <td className="p-12">TOTAL INGRESOS</td>
                      <td className="text-right font-mono text-success p-12">${resultados.totalIngresos.toLocaleString('es-CL')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="data-card overflow-hidden">
              <h2 className="text-danger m-0 p-16 bg-danger/20 border-b border-danger/30 flex items-center gap-2">
                <TrendingDown size={20} /> Egresos (Pérdidas)
              </h2>
              <div className="p-16">
                <table className="data-table">
                  <tbody>
                    {resultados.egresos.map(c => (
                      <tr key={c.codigo} className="border-b border-gray-800/30">
                        <td>{c.codigo} - {c.nombre}</td>
                        <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                    {resultados.egresos.length === 0 && (
                      <tr><td colSpan={2} className="text-center text-secondary italic">Sin registros</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-lg bg-darker/50 border-t-2 border-danger/50">
                      <td className="p-12">TOTAL EGRESOS</td>
                      <td className="text-right font-mono text-danger p-12">${resultados.totalEgresos.toLocaleString('es-CL')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className={`data-card p-32 text-center border-2 shadow-lg relative overflow-hidden ${resultados.utilidadNeta >= 0 ? 'border-success/50 bg-success/5 shadow-success/20' : 'border-danger/50 bg-danger/5 shadow-danger/20'}`}>
            <div className={`absolute top-0 left-0 w-full h-2 ${resultados.utilidadNeta >= 0 ? 'bg-success' : 'bg-danger'}`}></div>
            <h2 className="text-secondary mb-8 text-xl uppercase tracking-wider font-bold">Utilidad Neta del Ejercicio</h2>
            <div className="flex justify-center items-center gap-16">
              {resultados.utilidadNeta >= 0 ? <TrendingUp size={48} className="text-success opacity-80" /> : <TrendingDown size={48} className="text-danger opacity-80" />}
              <p className={`text-6xl font-mono font-bold ${resultados.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}`}>
                ${resultados.utilidadNeta.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="mt-16 text-secondary font-mono">
              (Ingresos - Egresos)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
