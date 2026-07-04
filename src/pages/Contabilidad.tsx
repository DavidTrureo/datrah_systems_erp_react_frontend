import React, { useEffect, useState } from 'react';
import { api, type CuentaContable, type ComprobanteContable, type DetalleComprobante, type BalanceGeneralReport, type EstadoResultadosReport, type LibroMayorRow } from '../api';
import { PlusCircle, CheckCircle, XCircle, Search, FileText, ArrowRight } from 'lucide-react';

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
            onClick={() => setActiveTab('nuevo')}
            className={`btn flex-center-gap-8 ${activeTab === 'nuevo' ? 'btn-success text-white' : 'btn-secondary text-success'}`}
            className={`tab-btn ${activeTab === 'nuevo' ? 'bg-success text-white border-success' : 'border-success text-success'}`}
          >
            <PlusCircle size={18} /> Nuevo Comprobante
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
          <div className="stats-grid mb-24">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <FileText size={24} />
              </div>
              <div className="stat-info">
                <h3>Comprobantes</h3>
                <p className="stat-number">{comprobantes.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper income">
                <PlusCircle size={24} />
              </div>
              <div className="stat-info">
                <h3>Total Cargos (Debe)</h3>
                <p className="stat-number text-success">${totalDiarioDebe.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper expense">
                <ArrowRight size={24} />
              </div>
              <div className="stat-info">
                <h3>Total Abonos (Haber)</h3>
                <p className="stat-number text-danger">${totalDiarioHaber.toLocaleString('es-CL')}</p>
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
            <h2>Plan de Cuentas (Chile)</h2>
            <div className="search-bar">
              <Search size={18} />
              <input type="text" placeholder="Buscar cuenta..." />
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
        <div className="data-card mt-20 p-24">
          <h2 className="mb-20 border-b pb-12 border-gray-800">Crear Comprobante Manual</h2>
          <form onSubmit={handleSaveComprobante} className="form-container">
            <div className="grid-2-cols-gap-16">
              <div className="form-group">
                <label>Tipo de Comprobante</label>
                <select 
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
              <div className="form-group">
                <label>Fecha</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={nuevoComp.fecha}
                  onChange={e => setNuevoComp({...nuevoComp, fecha: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-group mt-16">
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

            <div className="data-card p-16 mt-24">
              <h3 className="mb-16">Agregar Línea de Detalle</h3>
              <div>
                <div className="form-group m-0">
                  <label>Cuenta Contable</label>
                  <select 
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
                <div className="form-group m-0">
                  <label>Glosa Línea (Opcional)</label>
                  <input type="text" className="form-control" value={detalleForm.glosaLinea} onChange={e => setDetalleForm({...detalleForm, glosaLinea: e.target.value})} placeholder="Detalle..." />
                </div>
                <div className="form-group m-0">
                  <label>Debe ($)</label>
                  <input type="number" min="0" className="form-control" value={detalleForm.debe} onChange={e => setDetalleForm({...detalleForm, debe: Number(e.target.value)})} />
                </div>
                <div className="form-group m-0">
                  <label>Haber ($)</label>
                  <input type="number" min="0" className="form-control" value={detalleForm.haber} onChange={e => setDetalleForm({...detalleForm, haber: Number(e.target.value)})} />
                </div>
                <div className="pb-4">
                  <button type="button" onClick={handleAddDetalle} className="btn">
                    <PlusCircle size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-24">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Glosa</th>
                    <th className="text-right">Debe</th>
                    <th className="text-right">Haber</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {nuevoComp.detalles?.map((det, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{det.cuenta?.codigo} - {det.cuenta?.nombre}</td>
                      <td className="text-secondary">{det.glosaLinea}</td>
                      <td className="text-right font-mono">{det.debe! > 0 ? `$${det.debe?.toLocaleString('es-CL')}` : ''}</td>
                      <td className="text-right font-mono">{det.haber! > 0 ? `$${det.haber?.toLocaleString('es-CL')}` : ''}</td>
                      <td className="text-center">
                        <button type="button" onClick={() => handleRemoveDetalle(idx)} className="btn-link text-danger">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {nuevoComp.detalles?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-16 text-secondary">Sin líneas agregadas</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="text-right p-16">TOTALES:</td>
                    <td className={`text-right font-mono p-16 ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) !== nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0) ? 'text-danger' : 'text-success'}`}>
                      ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0).toLocaleString('es-CL')}
                    </td>
                    <td className={`text-right font-mono p-16 ${nuevoComp.detalles?.reduce((a,b)=>a+(b.debe||0),0) !== nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0) ? 'text-danger' : 'text-success'}`}>
                      ${nuevoComp.detalles?.reduce((a,b)=>a+(b.haber||0),0).toLocaleString('es-CL')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="form-actions mt-24 flex">
              <button type="submit" className="btn btn-primary flex-center-gap-8">
                <CheckCircle size={18} /> Registrar Comprobante
              </button>
            </div>
          </form>
        </div>
      )}


      {activeTab === 'mayor' && (
        <div className="data-card mt-20 p-24">
          <div className="flex-between mb-16">
            <h2>Libro Mayor</h2>
            <div className="form-group m-0">
              <select 
                className="form-control"
                value={selectedCuentaMayor}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCuentaMayor(val ? Number(val) : '');
                  if (val) loadMayor(Number(val));
                }}
              >
                <option value="">Seleccione cuenta...</option>
                {cuentas.filter(c => c.imputable).map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedCuentaMayor === '' ? (
            <div className="text-center p-24 text-secondary">Seleccione una cuenta contable para ver su Libro Mayor.</div>
          ) : (
            <table className="data-table mt-16">
              <thead>
                <tr>
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
                  <tr key={i}>
                    <td>{new Date(m.fecha).toLocaleDateString()}</td>
                    <td className="font-bold text-primary">{m.comprobante}</td>
                    <td className="text-secondary">{m.glosa}</td>
                    <td className="text-right font-mono">{m.debe > 0 ? `$${m.debe.toLocaleString('es-CL')}` : ''}</td>
                    <td className="text-right font-mono">{m.haber > 0 ? `$${m.haber.toLocaleString('es-CL')}` : ''}</td>
                    <td className={`text-right font-mono font-bold ${m.saldo < 0 ? 'text-danger' : 'text-success'}`}>
                      ${m.saldo.toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
                {mayor.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-16 text-secondary">Sin movimientos</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'balance' && balance && (
        <div className="mt-20 grid grid-cols-2 gap-24">
          <div className="data-card p-24">
            <h2 className="text-success mb-16 border-b border-gray-800 pb-8">Activos</h2>
            <table className="data-table">
              <tbody>
                {balance.activos.map(c => (
                  <tr key={c.codigo}>
                    <td>{c.codigo} - {c.nombre}</td>
                    <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-lg">
                  <td className="p-12">TOTAL ACTIVOS</td>
                  <td className="text-right font-mono text-success p-12">${balance.totalActivos.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div>
            <div className="data-card p-24 mb-24">
              <h2 className="text-danger mb-16 border-b border-gray-800 pb-8">Pasivos</h2>
              <table className="data-table">
                <tbody>
                  {balance.pasivos.map(c => (
                    <tr key={c.codigo}>
                      <td>{c.codigo} - {c.nombre}</td>
                      <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="p-12">TOTAL PASIVOS</td>
                    <td className="text-right font-mono text-danger p-12">${balance.totalPasivos.toLocaleString('es-CL')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="data-card p-24">
              <h2 className="text-warning mb-16 border-b border-gray-800 pb-8">Patrimonio</h2>
              <table className="data-table">
                <tbody>
                  {balance.patrimonio.map(c => (
                    <tr key={c.codigo}>
                      <td>{c.codigo} - {c.nombre}</td>
                      <td className="text-right font-mono">${c.saldo.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="p-12">TOTAL PATRIMONIO</td>
                    <td className="text-right font-mono text-warning p-12">${balance.totalPatrimonio.toLocaleString('es-CL')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="data-card p-16 mt-24 text-center">
              <h3 className="text-secondary mb-4">Total Pasivo + Patrimonio</h3>
              <p className={`text-2xl font-mono font-bold ${balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? 'text-success' : 'text-danger'}`}>
                ${(balance.totalPasivos + balance.totalPatrimonio).toLocaleString('es-CL')}
              </p>
              {balance.totalActivos === (balance.totalPasivos + balance.totalPatrimonio) ? (
                <span className="badge badge-success mt-8">¡Balance Cuadrado!</span>
              ) : (
                <span className="badge badge-danger mt-8">¡Descuadre en el Balance!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resultados' && resultados && (
        <div className="data-card mt-20 p-24">
          <h2 className="mb-24 text-center border-b border-gray-800 pb-16">Estado de Resultados</h2>
          
          <h3 className="text-success mb-12">Ingresos (Ganancias)</h3>
          <table className="data-table mb-24">
            <tbody>
              {resultados.ingresos.map(c => (
                <tr key={c.codigo}>
                  <td>{c.codigo} - {c.nombre}</td>
                  <td className="text-right font-mono text-success">${c.saldo.toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-12">TOTAL INGRESOS</td>
                <td className="text-right font-mono text-success p-12">${resultados.totalIngresos.toLocaleString('es-CL')}</td>
              </tr>
            </tfoot>
          </table>

          <h3 className="text-danger mb-12">Egresos (Pérdidas / Gastos)</h3>
          <table className="data-table mb-32">
            <tbody>
              {resultados.egresos.map(c => (
                <tr key={c.codigo}>
                  <td>{c.codigo} - {c.nombre}</td>
                  <td className="text-right font-mono text-danger">${c.saldo.toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-12">TOTAL EGRESOS</td>
                <td className="text-right font-mono text-danger p-12">${resultados.totalEgresos.toLocaleString('es-CL')}</td>
              </tr>
            </tfoot>
          </table>

          <div className="p-24 rounded-lg text-center">
            <h3 className={resultados.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}>
              {resultados.utilidadNeta >= 0 ? 'Utilidad Neta (Ganancia)' : 'Pérdida Neta'}
            </h3>
            <p className={`text-4xl font-mono font-bold mt-8 ${resultados.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}`}>
              ${Math.abs(resultados.utilidadNeta).toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
