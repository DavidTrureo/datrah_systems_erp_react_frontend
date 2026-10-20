import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import { api, type Factura, type Compra } from '../api';
import {
  Building2,
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet,
  Check,
  Sparkles,
  Download,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  Layers,
  CheckCheck,
  CreditCard
} from 'lucide-react';

export interface MovimientoBancario {
  id: string;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  rutReferencia?: string;
  monto: number; // Positivo para abono (ingreso), positivo también pero con tipo 'CARGO'
  tipo: 'ABONO' | 'CARGO';
  saldo?: number;
  estado: 'PENDIENTE' | 'CONCILIADO' | 'DESCARTADO';
  conciliadoCon?: {
    tipo: 'FACTURA' | 'COMPRA' | 'GASTO_BANCARIO' | 'INGRESO_VARIOS';
    id?: number;
    docNumero?: string;
    entidadNombre?: string;
    fechaConciliacion: string;
    notas?: string;
  };
}

interface Props {
  cxcList: Factura[];
  cxpList: Compra[];
  onRefreshFinanzas: () => Promise<void>;
}

const STORAGE_KEY = 'datrah_conciliacion_movimientos_v1';
const BANCO_KEY = 'datrah_conciliacion_banco_v1';

export default function ConciliacionBancaria({ cxcList, cxpList, onRefreshFinanzas }: Props) {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [banco, setBanco] = useState<string>(() => {
    return localStorage.getItem(BANCO_KEY) || 'BANCO_CHILE';
  });

  const [movimientos, setMovimientos] = useState<MovimientoBancario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTES' | 'CONCILIADOS' | 'ABONOS' | 'CARGOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal de Asociación Manual
  const [modalAsociarMov, setModalAsociarMov] = useState<MovimientoBancario | null>(null);
  const [manualDocId, setManualDocId] = useState<string>('');

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movimientos));
    } catch (err) {
      console.error('Error al guardar movimientos en localStorage:', err);
    }
  }, [movimientos]);

  useEffect(() => {
    localStorage.setItem(BANCO_KEY, banco);
  }, [banco]);

  // Motor de Búsqueda de Coincidencias en tiempo real
  const encontrarCoincidencia = (mov: MovimientoBancario) => {
    if (mov.estado === 'CONCILIADO') return null;

    if (mov.tipo === 'ABONO') {
      // Buscar en facturas pendientes de cobro (CxC)
      const facturasCandidatas = cxcList.filter(f => {
        const pendiente = f.total - (f.montoPagado || 0);
        return pendiente > 0;
      });

      // 1. Coincidencia exacta de monto
      const exacta = facturasCandidatas.find(f => {
        const pendiente = f.total - (f.montoPagado || 0);
        return Math.round(pendiente) === Math.round(mov.monto);
      });

      if (exacta) {
        return {
          tipo: 'FACTURA' as const,
          id: exacta.id!,
          docNumero: exacta.numeroFactura,
          entidadNombre: exacta.cliente?.nombre || 'Cliente General',
          montoPendiente: exacta.total - (exacta.montoPagado || 0),
          confianza: 'EXACTA' as const
        };
      }

      // 2. Coincidencia por nombre de cliente en la glosa
      const porNombre = facturasCandidatas.find(f => {
        const clienteNom = f.cliente?.nombre?.toLowerCase() || '';
        return clienteNom.length > 3 && mov.descripcion.toLowerCase().includes(clienteNom);
      });

      if (porNombre) {
        return {
          tipo: 'FACTURA' as const,
          id: porNombre.id!,
          docNumero: porNombre.numeroFactura,
          entidadNombre: porNombre.cliente?.nombre || 'Cliente General',
          montoPendiente: porNombre.total - (porNombre.montoPagado || 0),
          confianza: 'SUGERIDA' as const
        };
      }
    } else {
      // Buscar en compras a proveedores pendientes (CxP)
      const comprasCandidatas = cxpList.filter(c => {
        const pendiente = c.total - (c.montoPagado || 0);
        return pendiente > 0;
      });

      const exacta = comprasCandidatas.find(c => {
        const pendiente = c.total - (c.montoPagado || 0);
        return Math.round(pendiente) === Math.round(mov.monto);
      });

      if (exacta) {
        return {
          tipo: 'COMPRA' as const,
          id: exacta.id!,
          docNumero: exacta.numeroDocumento,
          entidadNombre: exacta.proveedor?.nombre || 'Proveedor',
          montoPendiente: exacta.total - (exacta.montoPagado || 0),
          confianza: 'EXACTA' as const
        };
      }

      // Si es un cargo recurrente bancario o comisión
      const descLower = mov.descripcion.toLowerCase();
      if (
        descLower.includes('comision') || 
        descLower.includes('comisión') || 
        descLower.includes('transbank') || 
        descLower.includes('manten') || 
        descLower.includes('iva cargo') ||
        descLower.includes('interes') ||
        descLower.includes('cargo tgr')
      ) {
        return {
          tipo: 'GASTO_BANCARIO' as const,
          docNumero: 'CARGO-BANCARIO',
          entidadNombre: 'Gastos y Comisiones Bancarias',
          montoPendiente: mov.monto,
          confianza: 'EXACTA' as const
        };
      }
    }

    return null;
  };

  // Cargar Cartola de Prueba Simulada (100% Gratis para probar ya mismo)
  const handleCargarCartolaPrueba = () => {
    const hoy = new Date();
    const formatoFecha = (offsetDias: number) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() - offsetDias);
      return d.toISOString().split('T')[0];
    };

    // Tomamos la primera factura y compra pendiente si existen para garantizar coincidencia perfecta
    const primeraFactura = cxcList.find(f => (f.total - (f.montoPagado || 0)) > 0);
    const primeraCompra = cxpList.find(c => (c.total - (c.montoPagado || 0)) > 0);

    const cartolaPrueba: MovimientoBancario[] = [
      {
        id: 'mov-demo-1',
        fecha: formatoFecha(1),
        descripcion: primeraFactura 
          ? `TRANSFERENCIA DE ${primeraFactura.cliente?.nombre?.toUpperCase() || 'CLIENTE'} PAGO FACT ${primeraFactura.numeroFactura}`
          : 'TRANSF. TERCEROS PAGO CLIENTE COMERCIAL LTDA',
        monto: primeraFactura ? (primeraFactura.total - (primeraFactura.montoPagado || 0)) : 185000,
        tipo: 'ABONO',
        saldo: 4520300,
        estado: 'PENDIENTE'
      },
      {
        id: 'mov-demo-2',
        fecha: formatoFecha(2),
        descripcion: 'ABONO VENTAS TRANSBANK POS DIARIO CIERRE LOTES',
        monto: 342500,
        tipo: 'ABONO',
        saldo: 4335300,
        estado: 'PENDIENTE'
      },
      {
        id: 'mov-demo-3',
        fecha: formatoFecha(2),
        descripcion: 'COMISION SERVICIO TRANSBANK POS 1.85% + IVA',
        monto: 6336,
        tipo: 'CARGO',
        saldo: 3992800,
        estado: 'PENDIENTE'
      },
      {
        id: 'mov-demo-4',
        fecha: formatoFecha(3),
        descripcion: primeraCompra
          ? `TRANSFERENCIA PROVEEDOR ${primeraCompra.proveedor?.nombre?.toUpperCase() || 'INSUMOS'} ORDEN ${primeraCompra.numeroDocumento}`
          : 'PAGO PROVEEDOR INSUMOS INDUSTRIALES CHILE S.A.',
        monto: primeraCompra ? (primeraCompra.total - (primeraCompra.montoPagado || 0)) : 124000,
        tipo: 'CARGO',
        saldo: 3999136,
        estado: 'PENDIENTE'
      },
      {
        id: 'mov-demo-5',
        fecha: formatoFecha(4),
        descripcion: 'CARGO MANTENCION MENSUAL CUENTA CORRIENTE EMPRESA',
        monto: 15990,
        tipo: 'CARGO',
        saldo: 4123136,
        estado: 'PENDIENTE'
      },
      {
        id: 'mov-demo-6',
        fecha: formatoFecha(5),
        descripcion: 'TRANSFERENCIA DESDE OTRA CUENTA APORTE CAPITAL SOCIO',
        monto: 500000,
        tipo: 'ABONO',
        saldo: 4139126,
        estado: 'PENDIENTE'
      }
    ];

    setMovimientos(cartolaPrueba);
    showSuccess('¡Cartola bancaria de prueba cargada con 6 movimientos realistas!', 'Cartola Lista');
  };

  // Importar Cartola Real desde Excel (.xlsx, .xls) o CSV
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          showWarning('El archivo cargado no contiene filas de movimientos bancarios.');
          return;
        }

        const parsedMovs: MovimientoBancario[] = [];

        rawRows.forEach((row, idx) => {
          // Detectar columnas de forma flexible para BancoEstado, Banco de Chile, BCI, Santander, etc.
          const fechaRaw = row['Fecha'] || row['FECHA'] || row['Date'] || row['fecha'] || row['Fec.'] || '';
          const descRaw = row['Descripción'] || row['DESCRIPCION'] || row['Descripcion'] || row['Detalle'] || row['Glosa'] || row['Movimiento'] || row['Concepto'] || '';
          
          let cargo = Number(row['Cargo'] || row['CARGO'] || row['Cargos'] || row['Egreso'] || row['Débito'] || 0);
          let abono = Number(row['Abono'] || row['ABONO'] || row['Abonos'] || row['Ingreso'] || row['Crédito'] || 0);
          const saldo = Number(row['Saldo'] || row['SALDO'] || 0);

          // Si el banco trae solo una columna "Monto" con signos positivos/negativos
          if (cargo === 0 && abono === 0) {
            const montoUnico = Number(row['Monto'] || row['MONTO'] || row['Importe'] || 0);
            if (montoUnico < 0) {
              cargo = Math.abs(montoUnico);
            } else if (montoUnico > 0) {
              abono = montoUnico;
            }
          }

          if (!descRaw && cargo === 0 && abono === 0) return;

          let fechaFormateada = new Date().toISOString().split('T')[0];
          if (fechaRaw instanceof Date && !isNaN(fechaRaw.getTime())) {
            fechaFormateada = fechaRaw.toISOString().split('T')[0];
          } else if (typeof fechaRaw === 'string' && fechaRaw.trim()) {
            // Manejar DD/MM/AAAA o AAAA-MM-DD
            if (fechaRaw.includes('/')) {
              const parts = fechaRaw.trim().split('/');
              if (parts.length === 3) {
                const dia = parts[0].padStart(2, '0');
                const mes = parts[1].padStart(2, '0');
                const anio = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                fechaFormateada = `${anio}-${mes}-${dia}`;
              }
            } else {
              fechaFormateada = fechaRaw.slice(0, 10);
            }
          }

          const esAbono = abono > 0;
          const montoFinal = esAbono ? abono : cargo;

          parsedMovs.push({
            id: `mov-${Date.now()}-${idx}`,
            fecha: fechaFormateada,
            descripcion: String(descRaw).trim(),
            monto: Math.abs(montoFinal),
            tipo: esAbono ? 'ABONO' : 'CARGO',
            saldo: saldo || undefined,
            estado: 'PENDIENTE'
          });
        });

        if (parsedMovs.length === 0) {
          showError('No se reconocieron columnas de Fecha, Descripción y Montos/Cargos/Abonos en el archivo.');
          return;
        }

        setMovimientos(parsedMovs);
        showSuccess(`¡Se importaron ${parsedMovs.length} movimientos bancarios con éxito!`, 'Cartola Importada');
      } catch (err: any) {
        console.error('Error al parsear cartola bancaria:', err);
        showError('Error al leer el archivo Excel/CSV: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Conciliar un movimiento con Factura o Compra
  const handleConciliarMovimiento = async (mov: MovimientoBancario, coincidenciaForzada?: any) => {
    const match = coincidenciaForzada || encontrarCoincidencia(mov);
    if (!match) return;

    setProcesandoId(mov.id);
    try {
      if (match.tipo === 'FACTURA' && match.id) {
        // Registrar abono a la factura pendiente en el ERP
        await api.registrarAbonoCxC(match.id, {
          monto: mov.monto,
          metodoPago: 'TRANSFERENCIA',
          notas: `Conciliación Cartola: ${mov.descripcion}`
        });
        showSuccess(`Factura #${match.docNumero} conciliada y abonada con éxito por $${mov.monto.toLocaleString('es-CL')}`);
      } else if (match.tipo === 'COMPRA' && match.id) {
        // Registrar abono a compra pendiente en el ERP
        await api.registrarAbonoCxP(match.id, {
          monto: mov.monto,
          metodoPago: 'TRANSFERENCIA',
          notas: `Conciliación Cartola: ${mov.descripcion}`
        });
        showSuccess(`Compra #${match.docNumero} conciliada y pagada con éxito por $${mov.monto.toLocaleString('es-CL')}`);
      } else {
        // Gasto bancario o varios
        showSuccess(`Movimiento "${mov.descripcion}" registrado como ${match.entidadNombre || 'Gasto'}`);
      }

      // Marcar movimiento como conciliado localmente
      setMovimientos(prev => prev.map(m => {
        if (m.id === mov.id) {
          return {
            ...m,
            estado: 'CONCILIADO',
            conciliadoCon: {
              tipo: match.tipo,
              id: match.id,
              docNumero: match.docNumero,
              entidadNombre: match.entidadNombre,
              fechaConciliacion: new Date().toISOString()
            }
          };
        }
        return m;
      }));

      await onRefreshFinanzas();
    } catch (err: any) {
      showError('Error al conciliar movimiento: ' + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  // Conciliación masiva automática de coincidencias exactas
  const handleConciliarTodasExactas = async () => {
    const pendientesConMatch = movimientos.filter(m => {
      if (m.estado === 'CONCILIADO') return false;
      const match = encontrarCoincidencia(m);
      return match && match.confianza === 'EXACTA';
    });

    if (pendientesConMatch.length === 0) {
      showInfo('No hay coincidencias exactas pendientes por conciliar.');
      return;
    }

    let conciledCount = 0;
    for (const mov of pendientesConMatch) {
      await handleConciliarMovimiento(mov);
      conciledCount++;
    }

    showSuccess(`¡Se conciliaron automáticamente ${conciledCount} movimientos exactos!`, 'Conciliación Masiva Lista');
  };

  // Deshacer conciliación
  const handleDeshacerConciliacion = (movId: string) => {
    setMovimientos(prev => prev.map(m => {
      if (m.id === movId) {
        return {
          ...m,
          estado: 'PENDIENTE',
          conciliadoCon: undefined
        };
      }
      return m;
    }));
    showInfo('Conciliación deshecha. El movimiento volvió a estado pendiente.');
  };

  // Limpiar toda la cartola
  const handleLimpiarCartola = () => {
    if (confirm('¿Estás seguro de que deseas limpiar los movimientos de la cartola actual?')) {
      setMovimientos([]);
      localStorage.removeItem(STORAGE_KEY);
      showInfo('Cartola limpiada.');
    }
  };

  // Exportar reporte de conciliación a Excel
  const handleExportarExcel = () => {
    if (movimientos.length === 0) {
      showWarning('No hay movimientos para exportar.');
      return;
    }

    const data = movimientos.map(m => ({
      'Fecha': m.fecha,
      'Descripción / Glosa': m.descripcion,
      'Tipo': m.tipo,
      'Monto ($)': m.monto,
      'Estado': m.estado,
      'Documento Conciliado': m.conciliadoCon ? `${m.conciliadoCon.tipo} #${m.conciliadoCon.docNumero || ''}` : '-',
      'Entidad Asociada': m.conciliadoCon?.entidadNombre || '-',
      'Fecha Conciliación': m.conciliadoCon ? new Date(m.conciliadoCon.fechaConciliacion).toLocaleString('es-CL') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Conciliación Bancaria');
    XLSX.writeFile(workbook, `Conciliacion_${banco}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showSuccess('Informe de conciliación exportado a Excel.');
  };

  // Métricas calculadas
  const stats = useMemo(() => {
    const total = movimientos.length;
    const conciliados = movimientos.filter(m => m.estado === 'CONCILIADO').length;
    const pendientes = total - conciliados;
    const pct = total > 0 ? Math.round((conciliados / total) * 100) : 0;

    const totalAbonos = movimientos
      .filter(m => m.tipo === 'ABONO')
      .reduce((sum, m) => sum + m.monto, 0);

    const totalCargos = movimientos
      .filter(m => m.tipo === 'CARGO')
      .reduce((sum, m) => sum + m.monto, 0);

    const pendientesMatchExacto = movimientos.filter(m => {
      if (m.estado === 'CONCILIADO') return false;
      const match = encontrarCoincidencia(m);
      return match && match.confianza === 'EXACTA';
    }).length;

    return {
      total,
      conciliados,
      pendientes,
      pct,
      totalAbonos,
      totalCargos,
      saldoNeto: totalAbonos - totalCargos,
      pendientesMatchExacto
    };
  }, [movimientos, cxcList, cxpList]);

  // Lista filtrada
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      // Filtro por estado / tipo
      if (filtroEstado === 'PENDIENTES' && m.estado !== 'PENDIENTE') return false;
      if (filtroEstado === 'CONCILIADOS' && m.estado !== 'CONCILIADO') return false;
      if (filtroEstado === 'ABONOS' && m.tipo !== 'ABONO') return false;
      if (filtroEstado === 'CARGOS' && m.tipo !== 'CARGO') return false;

      // Filtro de búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincideDesc = m.descripcion.toLowerCase().includes(q);
        const coincideMonto = m.monto.toString().includes(q);
        const coincideDoc = m.conciliadoCon?.docNumero?.toLowerCase().includes(q) || false;
        const coincideEntidad = m.conciliadoCon?.entidadNombre?.toLowerCase().includes(q) || false;
        return coincideDesc || coincideMonto || coincideDoc || coincideEntidad;
      }

      return true;
    });
  }, [movimientos, filtroEstado, busqueda]);

  return (
    <div className="flex flex-col gap-24">
      {/* Barra de Acciones y Banco */}
      <div className="data-card p-16 md:p-20 bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 flex flex-wrap justify-between items-center gap-16">
        <div className="flex flex-wrap items-center gap-12">
          <div className="flex items-center gap-8">
            <Building2 size={20} className="text-primary" />
            <span className="text-sm font-semibold text-white">Banco / Cuenta:</span>
          </div>
          <select 
            value={banco} 
            onChange={(e) => setBanco(e.target.value)}
            className="form-control text-sm py-6 px-12 bg-black/40 border-white/10 w-auto"
          >
            <option value="BANCO_CHILE">Banco de Chile / Edwards</option>
            <option value="BANCO_ESTADO">BancoEstado (Cuenta RUT / Corriente)</option>
            <option value="SANTANDER">Banco Santander Chile</option>
            <option value="BCI">Banco BCI / Nova</option>
            <option value="SCOTIABANK">Scotiabank Chile</option>
            <option value="ITAU">Banco Itaú</option>
            <option value="OTRO">Otro Banco / Formato Genérico</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-8">
          {/* Input oculto para subir archivo */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary flex items-center gap-6 text-xs md:text-sm py-8 px-14 shadow-lg shadow-indigo-500/20"
            title="Importar archivo Excel o CSV descargado desde tu banco"
          >
            <UploadCloud size={16} /> Subir Cartola Excel / CSV
          </button>

          <button
            type="button"
            onClick={handleCargarCartolaPrueba}
            className="btn btn-secondary flex items-center gap-6 text-xs md:text-sm py-8 px-12 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            title="Cargar 6 movimientos reales simulados para probar la conciliación sin ningún archivo"
          >
            <Sparkles size={16} className="text-emerald-400" /> Cargar Cartola de Prueba
          </button>

          {movimientos.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportarExcel}
                className="btn btn-secondary flex items-center gap-6 text-xs md:text-sm py-8 px-12"
                title="Exportar cartola con detalle de conciliación"
              >
                <Download size={15} /> Exportar
              </button>

              <button
                type="button"
                onClick={handleLimpiarCartola}
                className="btn btn-secondary text-danger py-8 px-10 text-xs"
                title="Limpiar cartola actual"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards de Conciliación */}
      {movimientos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="data-card p-16 bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-muted mb-6">
              <span>Progreso de Conciliación</span>
              <CheckCircle2 size={16} className={stats.pct === 100 ? 'text-success' : 'text-primary'} />
            </div>
            <div className="flex items-baseline gap-8">
              <span className="text-2xl font-mono font-bold text-white">{stats.pct}%</span>
              <span className="text-xs text-muted">({stats.conciliados} de {stats.total} movs.)</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-10">
              <div 
                className={`h-full transition-all duration-500 ${stats.pct === 100 ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${stats.pct}%` }}
              ></div>
            </div>
          </div>

          <div className="data-card p-16 bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-muted mb-6">
              <span>Total Abonos (Ingresos Banco)</span>
              <ArrowDownLeft size={16} className="text-success" />
            </div>
            <div className="text-2xl font-mono font-bold text-success">
              +${stats.totalAbonos.toLocaleString('es-CL')}
            </div>
            <span className="text-xs text-muted mt-6">Dinero entrante según cartola</span>
          </div>

          <div className="data-card p-16 bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-muted mb-6">
              <span>Total Cargos (Egresos Banco)</span>
              <ArrowUpRight size={16} className="text-danger" />
            </div>
            <div className="text-2xl font-mono font-bold text-danger">
              -${stats.totalCargos.toLocaleString('es-CL')}
            </div>
            <span className="text-xs text-muted mt-6">Pagos, comisiones y retiros</span>
          </div>

          <div className="data-card p-16 bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-muted mb-6">
              <span>Flujo Neto en Cartola</span>
              <CreditCard size={16} className="text-cyan" />
            </div>
            <div className={`text-2xl font-mono font-bold ${stats.saldoNeto >= 0 ? 'text-white' : 'text-warning'}`}>
              ${stats.saldoNeto.toLocaleString('es-CL')}
            </div>
            <span className="text-xs text-muted mt-6">Abonos menos cargos</span>
          </div>
        </div>
      )}

      {/* Banner de Conciliación Rápida Automática si hay coincidencias exactas */}
      {stats.pendientesMatchExacto > 0 && (
        <div className="p-16 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-wrap justify-between items-center gap-12">
          <div className="flex items-center gap-12">
            <div className="p-8 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                ¡Detectamos {stats.pendientesMatchExacto} coincidencias exactas con facturas y órdenes de compra del ERP!
              </div>
              <div className="text-xs text-muted mt-2">
                Los montos calzan con documentos pendientes. Puedes conciliar todas con un solo clic.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConciliarTodasExactas}
            className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-8 px-16 flex items-center gap-6 shadow-lg shadow-emerald-500/20"
          >
            <CheckCheck size={16} /> Conciliar {stats.pendientesMatchExacto} Automáticamente
          </button>
        </div>
      )}

      {/* Estado Vacío si no hay movimientos */}
      {movimientos.length === 0 ? (
        <div className="data-card p-40 text-center flex flex-col items-center justify-center gap-16 border border-dashed border-white/10">
          <div className="p-16 rounded-2xl bg-primary/10 text-primary">
            <FileSpreadsheet size={48} />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-white mb-6">No hay cartola bancaria cargada</h3>
            <p className="text-sm text-muted mb-20 leading-relaxed">
              Sube la cartola en Excel/CSV de tu banco o prueba el motor de cruce automático con datos simulados ahora mismo sin costo.
            </p>
            <div className="flex flex-wrap justify-center gap-12">
              <button
                type="button"
                onClick={handleCargarCartolaPrueba}
                className="btn btn-primary flex items-center gap-6 py-10 px-16"
              >
                <Sparkles size={16} /> Probar con Cartola de Demostración
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary flex items-center gap-6 py-10 px-16"
              >
                <UploadCloud size={16} /> Cargar Archivo Excel / CSV
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tabla y Tarjetas de Movimientos */
        <div className="data-card overflow-hidden">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-16 border-b border-white/5 flex flex-wrap justify-between items-center gap-12">
            <div className="flex flex-wrap items-center gap-6">
              <button 
                onClick={() => setFiltroEstado('TODOS')}
                className={`btn btn-sm py-4 px-10 text-xs rounded-lg ${filtroEstado === 'TODOS' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Todos ({movimientos.length})
              </button>
              <button 
                onClick={() => setFiltroEstado('PENDIENTES')}
                className={`btn btn-sm py-4 px-10 text-xs rounded-lg ${filtroEstado === 'PENDIENTES' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Pendientes ({stats.pendientes})
              </button>
              <button 
                onClick={() => setFiltroEstado('CONCILIADOS')}
                className={`btn btn-sm py-4 px-10 text-xs rounded-lg ${filtroEstado === 'CONCILIADOS' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Conciliados ({stats.conciliados})
              </button>
              <button 
                onClick={() => setFiltroEstado('ABONOS')}
                className={`btn btn-sm py-4 px-10 text-xs rounded-lg ${filtroEstado === 'ABONOS' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Abonos (+)
              </button>
              <button 
                onClick={() => setFiltroEstado('CARGOS')}
                className={`btn btn-sm py-4 px-10 text-xs rounded-lg ${filtroEstado === 'CARGOS' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Cargos (-)
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por glosa o monto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="form-control !pl-10 text-xs py-6 w-full bg-black/30 border-white/10"
              />
            </div>
          </div>

          {/* Vista Móvil: Tarjetas Táctiles adaptadas */}
          <div className="mobile-only-cards block md:hidden p-12">
            <div className="flex flex-col gap-10">
              {movimientosFiltrados.map((mov) => {
                const match = encontrarCoincidencia(mov);
                const isConciliado = mov.estado === 'CONCILIADO';

                return (
                  <div 
                    key={mov.id} 
                    className={`p-14 rounded-xl border flex flex-col gap-10 transition-all ${
                      isConciliado 
                        ? 'bg-emerald-500/[0.04] border-emerald-500/20' 
                        : match?.confianza === 'EXACTA'
                        ? 'bg-indigo-500/[0.05] border-indigo-500/30'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-8">
                      <div>
                        <span className="text-xs text-muted font-mono">{mov.fecha}</span>
                        <div className="font-semibold text-white text-sm mt-1 leading-snug">
                          {mov.descripcion}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-base font-mono font-bold ${mov.tipo === 'ABONO' ? 'text-success' : 'text-danger'}`}>
                          {mov.tipo === 'ABONO' ? '+' : '-'}${mov.monto.toLocaleString('es-CL')}
                        </div>
                        <span className={`badge text-[10px] mt-1 ${isConciliado ? 'badge-success' : 'badge-warning'}`}>
                          {isConciliado ? 'CONCILIADO' : 'PENDIENTE'}
                        </span>
                      </div>
                    </div>

                    {/* Resultado de Coincidencia */}
                    {isConciliado ? (
                      <div className="p-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                        <span className="flex items-center gap-4">
                          <Check size={14} /> Conciliado con {mov.conciliadoCon?.tipo} #{mov.conciliadoCon?.docNumero || ''} ({mov.conciliadoCon?.entidadNombre})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeshacerConciliacion(mov.id)}
                          className="text-xs text-muted hover:text-white underline ml-6"
                        >
                          Deshacer
                        </button>
                      </div>
                    ) : match ? (
                      <div className={`p-8 rounded-lg border text-xs flex flex-col gap-6 ${
                        match.confianza === 'EXACTA' 
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-4 font-semibold">
                            <Sparkles size={14} /> Coincidencia {match.confianza}: {match.tipo} #{match.docNumero}
                          </span>
                          <span className="font-bold">${match.montoPendiente.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="text-xs opacity-90">{match.entidadNombre}</div>
                        <button
                          type="button"
                          disabled={procesandoId === mov.id}
                          onClick={() => handleConciliarMovimiento(mov, match)}
                          className="btn btn-primary py-6 text-xs flex items-center justify-center gap-4 w-full"
                        >
                          {procesandoId === mov.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                          Conciliar con {match.tipo} #{match.docNumero}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-6 pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setModalAsociarMov(mov);
                            setManualDocId('');
                          }}
                          className="btn btn-secondary flex-1 py-6 text-xs"
                        >
                          Asociar Manualmente
                        </button>
                        {mov.tipo === 'CARGO' && (
                          <button
                            type="button"
                            onClick={() => handleConciliarMovimiento(mov, {
                              tipo: 'GASTO_BANCARIO',
                              docNumero: 'CARGO',
                              entidadNombre: 'Gasto Bancario / Operacional',
                              montoPendiente: mov.monto,
                              confianza: 'EXACTA'
                            })}
                            className="btn btn-secondary flex-1 py-6 text-xs text-secondary hover:text-white"
                          >
                            Gasto Bancario
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vista Escritorio: Tabla tradicional con touch scroll */}
          <div className="desktop-only-table hidden md:block table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Glosa / Movimiento Bancario</th>
                  <th>Tipo</th>
                  <th>Monto Cartola</th>
                  <th>Cruce / Documento Sugerido</th>
                  <th>Estado</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty-row py-20 text-center text-muted">
                      No se encontraron movimientos con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((mov) => {
                    const match = encontrarCoincidencia(mov);
                    const isConciliado = mov.estado === 'CONCILIADO';

                    return (
                      <tr key={mov.id} className={isConciliado ? 'opacity-85' : ''}>
                        <td className="font-mono text-xs whitespace-nowrap">{mov.fecha}</td>
                        <td className="font-medium text-sm text-white max-w-xs truncate" title={mov.descripcion}>
                          {mov.descripcion}
                        </td>
                        <td>
                          <span className={`badge ${mov.tipo === 'ABONO' ? 'badge-success' : 'badge-danger'}`}>
                            {mov.tipo === 'ABONO' ? 'ABONO (+)' : 'CARGO (-)'}
                          </span>
                        </td>
                        <td className={`font-mono font-bold text-sm ${mov.tipo === 'ABONO' ? 'text-success' : 'text-danger'}`}>
                          {mov.tipo === 'ABONO' ? '+' : '-'}${mov.monto.toLocaleString('es-CL')}
                        </td>
                        <td>
                          {isConciliado ? (
                            <div className="flex items-center gap-6 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 size={15} />
                              <span>{mov.conciliadoCon?.tipo} #{mov.conciliadoCon?.docNumero} ({mov.conciliadoCon?.entidadNombre})</span>
                            </div>
                          ) : match ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-6 text-xs">
                                <span className={`badge ${match.confianza === 'EXACTA' ? 'badge-primary' : 'badge-warning'}`}>
                                  {match.confianza}
                                </span>
                                <span className="font-semibold text-white">
                                  {match.tipo} #{match.docNumero}
                                </span>
                              </div>
                              <span className="text-xxs-secondary text-muted">
                                {match.entidadNombre} • Saldo: ${match.montoPendiente.toLocaleString('es-CL')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Sin coincidencia automática</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${isConciliado ? 'badge-success' : 'badge-warning'}`}>
                            {isConciliado ? 'CONCILIADO' : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {isConciliado ? (
                            <button
                              type="button"
                              onClick={() => handleDeshacerConciliacion(mov.id)}
                              className="btn btn-secondary btn-sm py-4 px-8 text-xs text-muted hover:text-white"
                              title="Deshacer conciliación"
                            >
                              Deshacer
                            </button>
                          ) : match ? (
                            <button
                              type="button"
                              disabled={procesandoId === mov.id}
                              onClick={() => handleConciliarMovimiento(mov, match)}
                              className="btn btn-primary btn-sm py-6 px-12 text-xs flex items-center gap-4"
                            >
                              {procesandoId === mov.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                              Conciliar
                            </button>
                          ) : (
                            <div className="flex justify-end gap-6">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalAsociarMov(mov);
                                  setManualDocId('');
                                }}
                                className="btn btn-secondary btn-sm py-4 px-8 text-xs"
                              >
                                Asociar
                              </button>
                              {mov.tipo === 'CARGO' && (
                                <button
                                  type="button"
                                  onClick={() => handleConciliarMovimiento(mov, {
                                    tipo: 'GASTO_BANCARIO',
                                    docNumero: 'CARGO',
                                    entidadNombre: 'Gasto Bancario / Operacional',
                                    montoPendiente: mov.monto,
                                    confianza: 'EXACTA'
                                  })}
                                  className="btn btn-secondary btn-sm py-4 px-8 text-xs text-muted hover:text-white"
                                  title="Marcar como comisión o gasto bancario"
                                >
                                  Gasto Bancario
                                </button>
                              )}
                            </div>
                          )}
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

      {/* MODAL: Asociar Manualmente un Movimiento a Factura o Compra */}
      {modalAsociarMov && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-md">
            <div className="flex justify-between items-center mb-16 pb-12 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-8">
                <Layers size={18} className="text-primary" /> Asociar Movimiento Manualmente
              </h3>
              <button 
                type="button" 
                onClick={() => setModalAsociarMov(null)}
                className="btn btn-secondary btn-sm py-2 px-8 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-12 rounded-xl bg-white/[0.02] border border-white/5 mb-16 flex flex-col gap-6 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Glosa Bancaria:</span>
                <span className="font-semibold text-white">{modalAsociarMov.descripcion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fecha y Tipo:</span>
                <span>{modalAsociarMov.fecha} • {modalAsociarMov.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Monto:</span>
                <span className="font-mono font-bold text-white">${modalAsociarMov.monto.toLocaleString('es-CL')}</span>
              </div>
            </div>

            <div className="form-group mb-16">
              <label className="text-xs font-semibold text-secondary mb-6 block">
                Seleccionar Documento Pendiente del ERP:
              </label>
              <select
                value={manualDocId}
                onChange={(e) => setManualDocId(e.target.value)}
                className="form-control text-xs py-8"
              >
                <option value="">Selecciona un documento...</option>
                {modalAsociarMov.tipo === 'ABONO' ? (
                  <optgroup label="Facturas Pendientes de Cobro (CxC)">
                    {cxcList
                      .filter(f => (f.total - (f.montoPagado || 0)) > 0)
                      .map(f => (
                        <option key={f.id} value={`F-${f.id}`}>
                          Factura #{f.numeroFactura} - {f.cliente?.nombre || 'Cliente General'} (Saldo: ${(f.total - (f.montoPagado || 0)).toLocaleString('es-CL')})
                        </option>
                      ))}
                  </optgroup>
                ) : (
                  <optgroup label="Compras Pendientes a Proveedores (CxP)">
                    {cxpList
                      .filter(c => (c.total - (c.montoPagado || 0)) > 0)
                      .map(c => (
                        <option key={c.id} value={`C-${c.id}`}>
                          Orden #{c.numeroDocumento} - {c.proveedor?.nombre || 'Proveedor'} (Saldo: ${(c.total - (c.montoPagado || 0)).toLocaleString('es-CL')})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-8 pt-12 border-t border-white/5">
              <button
                type="button"
                onClick={() => setModalAsociarMov(null)}
                className="btn btn-secondary text-xs py-8 px-14"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!manualDocId}
                onClick={async () => {
                  if (!manualDocId) return;
                  const [prefix, idStr] = manualDocId.split('-');
                  const docId = Number(idStr);
                  
                  if (prefix === 'F') {
                    const factura = cxcList.find(f => f.id === docId);
                    if (factura) {
                      await handleConciliarMovimiento(modalAsociarMov, {
                        tipo: 'FACTURA',
                        id: factura.id,
                        docNumero: factura.numeroFactura,
                        entidadNombre: factura.cliente?.nombre || 'Cliente',
                        montoPendiente: factura.total - (factura.montoPagado || 0),
                        confianza: 'EXACTA'
                      });
                    }
                  } else {
                    const compra = cxpList.find(c => c.id === docId);
                    if (compra) {
                      await handleConciliarMovimiento(modalAsociarMov, {
                        tipo: 'COMPRA',
                        id: compra.id,
                        docNumero: compra.numeroDocumento,
                        entidadNombre: compra.proveedor?.nombre || 'Proveedor',
                        montoPendiente: compra.total - (compra.montoPagado || 0),
                        confianza: 'EXACTA'
                      });
                    }
                  }
                  setModalAsociarMov(null);
                }}
                className="btn btn-primary text-xs py-8 px-16"
              >
                Confirmar Conciliación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
