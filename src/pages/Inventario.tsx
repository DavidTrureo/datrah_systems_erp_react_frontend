import React, { useEffect, useState } from 'react';
import { api, type Producto, type Categoria, type Kardex } from '../api';
import { Plus, Search, Edit3, Trash2, ArrowUp, ArrowDown, Settings2, History } from 'lucide-react';

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.crearCategoria({ nombre: catName, descripcion: catDesc });
      setCatName('');
      setCatDesc('');
      loadData();
    } catch (err) {
      alert("Error al crear categoría: " + (err as Error).message);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas desactivar/eliminar esta categoría?")) return;
    try {
      await api.eliminarCategoria(id);
      loadData();
    } catch (err) {
      alert("Error al eliminar categoría: " + (err as Error).message);
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
      } else {
        await api.crearProducto(payload);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      alert("Error al guardar producto: " + (err as Error).message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar este producto del catálogo?")) {
      try {
        await api.eliminarProducto(id);
        loadData();
      } catch (err) {
        alert("Error al eliminar producto: " + (err as Error).message);
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
      alert("Error al registrar movimiento: " + (err as Error).message);
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
      alert("Error al obtener Kardex: " + (err as Error).message);
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
        <div className="flex-end-gap-12">
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
            <Settings2 size={18} /> Categorías
          </button>
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
        <div className="table-responsive">
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
                <input 
                  id="prod-codigo-input"
                  type="text" 
                  value={formData.codigoBarras} 
                  onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })} 
                  className="form-control"
                />
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
    </div>
  );
}
