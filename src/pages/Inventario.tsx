import React, { useEffect, useState } from 'react';
import { api, type Producto, type Categoria, type Kardex } from '../api';
import { Plus, Search, Edit3, Trash2, ArrowUp, ArrowDown, Settings2, History, Download, Upload, Camera } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import * as XLSX from 'xlsx';

export default function Inventario() {
  const { showSuccess, showError, showWarning } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  // Formulario Categoría
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Formulario Producto
  const [formData, setFormData] = useState({
    nombre: '',
    codigoBarras: '',
    descripcion: '',
    precioCompra: 0,
    precioVenta: 0,
    stockMinimo: 0,
    categoriaId: '',
  });

  // Formulario Movimiento de Stock
  const [stockAction, setStockAction] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [stockQty, setStockQty] = useState(0);
  const [stockDoc, setStockDoc] = useState('');
  const [stockReason, setStockReason] = useState('');

  // Historial Kardex
  const [kardexList, setKardexList] = useState<Kardex[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProductos(),
        api.getCategorias()
      ]);
      setProductos(prodRes);
      setCategorias(catRes);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleExportExcel = () => {
    try {
      const data = productos.map((p) => ({
        'ID': p.id,
        'Código Barras': p.codigoBarras || '',
        'Nombre': p.nombre,
        'Descripción': p.descripcion || '',
        'Categoría': p.categoria?.nombre || 'Sin Categoría',
        'Precio Compra ($)': p.precioCompra,
        'Precio Venta ($)': p.precioVenta,
        'Stock Actual': p.stockActual,
        'Stock Mínimo': p.stockMinimo || 0,
        'Estado': p.activo ? 'Activo' : 'Inactivo',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
      XLSX.writeFile(workbook, `Inventario_Datrah_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showSuccess('Archivo Excel generado y descargado correctamente', 'Exportación Exitosa');
    } catch (err: any) {
      showError('Error al exportar inventario a Excel: ' + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          showWarning('El archivo Excel no contiene filas de datos.');
          return;
        }

        let importados = 0;
        for (const row of rows) {
          const nombre = row['Nombre'] || row['nombre'] || row['PRODUCTO'] || row['producto'];
          if (!nombre) continue;

          const pCompra = Number(row['Precio Compra ($)'] || row['precioCompra'] || row['Compra'] || 0);
          const pVenta = Number(row['Precio Venta ($)'] || row['precioVenta'] || row['Venta'] || 0);
          const sMin = Number(row['Stock Mínimo'] || row['stockMinimo'] || 0);
          const cod = String(row['Código Barras'] || row['codigoBarras'] || row['Codigo'] || '').trim();

          const catNombre = String(row['Categoría'] || row['categoria'] || '').trim();
          let cat = categorias.find((c) => c.nombre.toLowerCase() === catNombre.toLowerCase());

          await api.crearProducto({
            nombre,
            codigoBarras: cod,
            precioCompra: pCompra,
            precioVenta: pVenta,
            stockMinimo: sMin,
            stockActual: 0,
            categoria: cat || undefined,
          });
          importados++;
        }

        showSuccess(`Se importaron ${importados} productos al inventario!`, 'Importación Exitosa');
        loadData();
      } catch (err: any) {
        console.error('Error al importar Excel:', err);
        showError('Error al procesar el archivo Excel: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.crearCategoria({ nombre: catName, descripcion: catDesc });
      setCatName('');
      setCatDesc('');
      showSuccess(`Categoría "${catName}" creada con éxito.`);
      loadData();
    } catch (err) {
      showError("Error al crear categoría: " + (err as Error).message);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas desactivar/eliminar esta categoría?")) return;
    try {
      await api.eliminarCategoria(id);
      showSuccess("Categoría eliminada.");
      loadData();
    } catch (err) {
      showError("Error al eliminar categoría: " + (err as Error).message);
    }
  };

  const handleOpenProductModal = (prod: Producto | null = null) => {
    if (prod) {
      setSelectedProduct(prod);
      setFormData({
        nombre: prod.nombre,
        codigoBarras: prod.codigoBarras || '',
        descripcion: prod.descripcion || '',
        precioCompra: prod.precioCompra,
        precioVenta: prod.precioVenta,
        stockMinimo: prod.stockMinimo || 0,
        categoriaId: prod.categoria?.id ? String(prod.categoria.id) : '',
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        nombre: '',
        codigoBarras: '',
        descripcion: '',
        precioCompra: 0,
        precioVenta: 0,
        stockMinimo: 0,
        categoriaId: '',
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cat = categorias.find(c => String(c.id) === formData.categoriaId);
      const payload: Producto = {
        nombre: formData.nombre,
        codigoBarras: formData.codigoBarras,
        descripcion: formData.descripcion,
        precioCompra: Number(formData.precioCompra),
        precioVenta: Number(formData.precioVenta),
        stockActual: selectedProduct ? selectedProduct.stockActual : 0,
        stockMinimo: Number(formData.stockMinimo),
        categoria: cat || undefined,
      };

      if (selectedProduct?.id) {
        await api.actualizarProducto(selectedProduct.id, payload);
        showSuccess(`Producto "${formData.nombre}" actualizado.`);
      } else {
        await api.crearProducto(payload);
        showSuccess(`Producto "${formData.nombre}" agregado al catálogo.`);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      showError("Error al guardar producto: " + (err as Error).message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar este producto del catálogo?")) {
      try {
        await api.eliminarProducto(id);
        showSuccess("Producto eliminado del catálogo.");
        loadData();
      } catch (err) {
        showError("Error al eliminar producto: " + (err as Error).message);
      }
    }
  };

  // Movimiento de Stock
  const handleOpenStockModal = (prod: Producto, action: 'ENTRADA' | 'SALIDA' | 'AJUSTE') => {
    setSelectedProduct(prod);
    setStockAction(action);
    setStockQty(0);
    setStockDoc('');
    setStockReason('');
    setShowStockModal(true);
  };

  const handleSaveStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct?.id) return;

    try {
      if (stockAction === 'ENTRADA') {
        await api.registrarEntrada(selectedProduct.id, stockQty, stockDoc, stockReason);
      } else if (stockAction === 'SALIDA') {
        await api.registrarSalida(selectedProduct.id, stockQty, stockDoc, stockReason);
      } else if (stockAction === 'AJUSTE') {
        await api.registrarAjuste(selectedProduct.id, stockQty, stockReason);
      }
      window.dispatchEvent(new Event('refresh-bajo-stock'));
      setShowStockModal(false);
      loadData();
    } catch (err) {
      showError("Error al registrar movimiento: " + (err as Error).message);
    }
  };

  // Kardex
  const handleOpenKardex = async (prod: Producto) => {
    setSelectedProduct(prod);
    try {
      const history = await api.getKardex(prod.id!);
      setKardexList(history);
      setShowKardexModal(true);
    } catch (err) {
      showError("Error al obtener Kardex: " + (err as Error).message);
    }
  };

  const filteredProducts = productos.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (p.codigoBarras && p.codigoBarras.includes(search))
  );

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <h1>Inventario & Productos</h1>
          <p>Maneja tus artículos, precios y monitorea el flujo de existencias (Kardex).</p>
        </div>
        <div className="flex-end-gap-12 flex-wrap">
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
            <Settings2 size={18} /> Categorías
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} title="Exportar catálogo completo a archivo Excel">
            <Download size={18} /> Exportar Excel
          </button>
          <label className="btn btn-secondary cursor-pointer" title="Importar productos masivamente desde Excel">
            <Upload size={18} /> Importar Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>
          <button className="btn btn-primary" onClick={() => handleOpenProductModal()}>
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="data-card p-16 mb-24">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar por código o nombre de producto..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="form-control !pl-12 w-full"
          />
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="data-card">
        {/* Vista Móvil: Tarjetas de Producto Táctiles adaptadas al teléfono */}
        <div className="mobile-only-cards block md:hidden p-14">
          {loading ? (
            <div className="text-center py-20 text-muted">Cargando catálogo...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
              No se encontraron productos
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {filteredProducts.map((p) => {
                const isLow = Number(p.stockActual) <= Number(p.stockMinimo);
                return (
                  <div key={p.id} className={`p-14 rounded-xl bg-white/[0.03] border flex flex-col gap-10 shadow-sm ${isLow ? 'border-danger/40 bg-danger/[0.04]' : 'border-white/10'}`}>
                    <div className="flex justify-between items-start gap-8">
                      <div>
                        <div className="font-bold text-white text-base leading-snug">{p.nombre}</div>
                        <div className="text-xs text-muted font-mono mt-2">
                          {p.codigoBarras ? `Cód: ${p.codigoBarras}` : 'Sin código'} • {p.categoria?.nombre || 'General'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-extrabold px-8 py-2 rounded-lg ${isLow ? 'bg-danger/20 text-danger border border-danger/30' : 'bg-success/20 text-success border border-success/30'}`}>
                          Stock: {p.stockActual}
                        </div>
                        {isLow && <span className="text-[10px] text-danger block mt-1">Mínimo: {p.stockMinimo}</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs py-6 px-10 bg-white/[0.02] rounded-lg border border-white/5">
                      <span>Venta: <strong className="text-white text-sm">${p.precioVenta.toLocaleString('es-CL')}</strong></span>
                      <span className="text-muted">Costo: ${p.precioCompra.toLocaleString('es-CL')}</span>
                    </div>

                    {/* Botones de acción táctiles para móviles */}
                    <div className="flex flex-col gap-8 pt-4">
                      <div className="flex gap-6">
                        <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" onClick={() => handleOpenStockModal(p, 'ENTRADA')}>
                          <ArrowUp size={13} className="text-success" /> Entrada
                        </button>
                        <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" onClick={() => handleOpenStockModal(p, 'SALIDA')}>
                          <ArrowDown size={13} className="text-danger" /> Salida
                        </button>
                        <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" onClick={() => handleOpenStockModal(p, 'AJUSTE')}>
                          <Settings2 size={13} className="text-warning" /> Ajustar
                        </button>
                      </div>
                      <div className="flex gap-6 justify-end">
                        <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" onClick={() => handleOpenKardex(p)}>
                          <History size={14} /> Kardex
                        </button>
                        <button className="btn btn-secondary flex-1 py-6 text-xs flex-center-gap-4" onClick={() => handleOpenProductModal(p)}>
                          <Edit3 size={14} /> Editar
                        </button>
                        <button className="btn btn-secondary text-danger py-6 px-12 text-xs" onClick={() => handleDeleteProduct(p.id!)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vista Escritorio: Tabla de alta densidad */}
        <div className="desktop-only-table hidden md:block table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cód. Barras</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Compra</th>
                <th>Venta</th>
                <th>Stock</th>
                <th>Stock Min.</th>
                <th className="text-center">Acciones Inventario</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">Cargando catálogo...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">No se encontraron productos</td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = Number(p.stockActual) <= Number(p.stockMinimo);
                  return (
                    <tr key={p.id} className={isLow ? 'row-low-stock' : ''}>
                      <td className="font-mono-secondary">{p.codigoBarras || 'N/A'}</td>
                      <td className="font-semibold">{p.nombre}</td>
                      <td><span className="badge badge-light-bg">{p.categoria?.nombre || 'General'}</span></td>
                      <td>${p.precioCompra.toFixed(0)}</td>
                      <td>${p.precioVenta.toFixed(0)}</td>
                      <td className={`font-bold ${isLow ? 'text-danger' : 'text-success'}`}>
                        {p.stockActual}
                      </td>
                      <td className="text-muted">{p.stockMinimo}</td>
                      <td className="flex-center-gap-8 justify-center">
                        <button className="btn btn-secondary btn-table-action-sm" onClick={() => handleOpenStockModal(p, 'ENTRADA')}>
                          <ArrowUp size={14} className="text-success" /> Entrada
                        </button>
                        <button className="btn btn-secondary btn-table-action-sm" onClick={() => handleOpenStockModal(p, 'SALIDA')}>
                          <ArrowDown size={14} className="text-danger" /> Salida
                        </button>
                        <button className="btn btn-secondary btn-table-action-sm" onClick={() => handleOpenStockModal(p, 'AJUSTE')}>
                          <Settings2 size={14} className="text-warning" /> Ajustar
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn btn-secondary btn-icon-sm" title="Ver Kardex" onClick={() => handleOpenKardex(p)}>
                            <History size={16} />
                          </button>
                          <button className="btn btn-secondary btn-icon-sm" title="Editar" onClick={() => handleOpenProductModal(p)}>
                            <Edit3 size={16} />
                          </button>
                          <button className="btn btn-secondary btn-danger-outline-icon" title="Eliminar" onClick={() => handleDeleteProduct(p.id!)}>
                            <Trash2 size={16} className="text-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear/Editar Producto */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSaveProduct} className="mt-20">
              <div className="form-group">
                <label htmlFor="prod-nombre-input">Nombre del Producto *</label>
                <input 
                  id="prod-nombre-input"
                  type="text" 
                  required 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-codigo-input">Código de Barras</label>
                <div className="flex gap-2">
                  <input 
                    id="prod-codigo-input"
                    type="text" 
                    value={formData.codigoBarras} 
                    onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })} 
                    className="form-control flex-1"
                    placeholder="Escribe o escanea..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="btn btn-secondary flex items-center gap-1.5 whitespace-nowrap text-xs"
                    title="Escanear con cámara"
                  >
                    <Camera size={16} className="text-blue-400" /> Escanear
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-categoria-select">Categoría</label>
                <select 
                  id="prod-categoria-select"
                  value={formData.categoriaId} 
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  className="form-control"
                >
                  <option value="">Selecciona categoría...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid-2-cols-gap-16">
                <div className="form-group">
                  <label htmlFor="prod-precio-compra-input">Precio Compra ($)</label>
                  <input 
                    id="prod-precio-compra-input"
                    type="number" 
                    step="1" 
                    required 
                    value={formData.precioCompra} 
                    onChange={(e) => setFormData({ ...formData, precioCompra: Number(e.target.value) })} 
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-precio-venta-input">Precio Venta ($)</label>
                  <input 
                    id="prod-precio-venta-input"
                    type="number" 
                    step="1" 
                    required 
                    value={formData.precioVenta} 
                    onChange={(e) => setFormData({ ...formData, precioVenta: Number(e.target.value) })} 
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-stock-min-input">Stock Mínimo Alerta</label>
                <input 
                  id="prod-stock-min-input"
                  type="number" 
                  step="0.001" 
                  value={formData.stockMinimo} 
                  onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-descripcion-input">Descripción</label>
                <textarea 
                  id="prod-descripcion-input"
                  value={formData.descripcion} 
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-16 mt-24">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Entrada/Salida/Ajuste Stock */}
      {showStockModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Movimiento de Stock: {selectedProduct.nombre}</h2>
            <p className="movement-modal-subtitle">
              Operación: <strong>{stockAction}</strong> | Stock Actual: {selectedProduct.stockActual}
            </p>
            <form onSubmit={handleSaveStockMovement}>
              <div className="form-group">
                <label htmlFor="stock-qty-input">{stockAction === 'AJUSTE' ? 'Nuevo Stock Total *' : 'Cantidad *'}</label>
                <input 
                  id="stock-qty-input"
                  type="number" 
                  step="0.001" 
                  required 
                  min="0"
                  value={stockQty} 
                  onChange={(e) => setStockQty(Number(e.target.value))} 
                  className="form-control"
                />
              </div>

              {stockAction !== 'AJUSTE' && (
                <div className="form-group">
                  <label htmlFor="stock-doc-input">Documento de Referencia (Ej: Factura Compra Nº)</label>
                  <input 
                    id="stock-doc-input"
                    type="text" 
                    value={stockDoc} 
                    onChange={(e) => setStockDoc(e.target.value)} 
                    className="form-control"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Motivo / Observación *</label>
                <textarea 
                  required 
                  value={stockReason} 
                  onChange={(e) => setStockReason(e.target.value)} 
                  className="form-control"
                  rows={3}
                  placeholder="Justifica el cambio de inventario..."
                />
              </div>

              <div className="flex justify-end gap-16 mt-24">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Auditoría Kardex */}
      {showKardexModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg">
            <div className="flex-between-center mb-20">
              <h2>Historial de Movimientos (Kardex): {selectedProduct.nombre}</h2>
              <button className="btn btn-secondary" onClick={() => setShowKardexModal(false)}>Cerrar</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Operación</th>
                    <th>Cantidad</th>
                    <th>Stock Ant.</th>
                    <th>Stock Post.</th>
                    <th>Referencia</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty-row">No hay movimientos en Kardex</td>
                    </tr>
                  ) : (
                    kardexList.map((k) => (
                      <tr key={k.id}>
                       <td className="text-sm">{new Date(k.fechaMovimiento).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${k.tipoMovimiento === 'ENTRADA' ? 'badge-success' : k.tipoMovimiento === 'SALIDA' ? 'badge-danger' : 'badge-warning'}`}>
                            {k.tipoMovimiento}
                          </span>
                        </td>
                        <td className="font-semibold">{k.cantidad}</td>
                        <td>{k.stockAnterior}</td>
                        <td className="font-semibold">{k.stockPosterior}</td>
                        <td className="font-mono">{k.documentoReferencia || '-'}</td>
                        <td className="text-sm-secondary">{k.motivo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Gestionar Categorías */}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-md">
            <div className="flex-between-center mb-20">
              <h2>Gestionar Categorías / Tipos</h2>
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cerrar</button>
            </div>
            
            {/* Formulario Nueva Categoría */}
            <form onSubmit={handleCreateCategory} className="data-card p-16-mb-20">
              <h3 className="mb-12-fs-16">Agregar Nueva Categoría</h3>
              <div className="form-group">
                <label htmlFor="cat-nombre-input">Nombre de Categoría</label>
                <input 
                  id="cat-nombre-input"
                  type="text" 
                  required 
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)} 
                  className="form-control"
                  placeholder="Ej: Alimentos, Electrodomésticos, Ferretería..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="cat-desc-input">Descripción (Opcional)</label>
                <input 
                  id="cat-desc-input"
                  type="text" 
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)} 
                  className="form-control"
                  placeholder="Breve descripción..."
                />
              </div>
              <button type="submit" className="btn btn-primary mt-8">
                Crear Categoría
              </button>
            </form>

            {/* Listado de Categorías */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="table-empty-row-p-16">No hay categorías registradas</td>
                    </tr>
                  ) : (
                    categorias.map((cat) => (
                      <tr key={cat.id}>
                        <td className="font-semibold">{cat.nombre}</td>
                        <td className="text-sm-secondary">{cat.descripcion || '-'}</td>
                        <td className="text-right">
                          <button 
                            type="button"
                            className="btn btn-secondary btn-danger-outline" 
                            onClick={() => handleDeleteCategory(cat.id!)}
                            title="Eliminar Categoría"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} className="text-danger" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escaneo con Cámara */}
      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={(code) => {
          setFormData((prev) => ({ ...prev, codigoBarras: code }));
          showSuccess(`Código escaneado: ${code}`);
        }}
        title="Escanear Código para Producto"
      />
    </div>
  );
}
