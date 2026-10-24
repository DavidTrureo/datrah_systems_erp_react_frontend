import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, type Proveedor } from '../api';
import { Plus, Search, Edit3, Trash2, Truck, Download } from 'lucide-react';
import { exportJsonToExcel } from '../utils/excelExport';

export default function Proveedores() {
  const { showSuccess, showError } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handleExportExcel = async () => {
    if (proveedores.length === 0) {
      showError('No hay proveedores para exportar.');
      return;
    }
    try {
      const data = proveedores.map(p => ({
        'ID': p.id,
        'RUT / Documento': p.documentoIdentidad,
        'Razón Social / Proveedor': p.nombre,
        'Email': p.email || '',
        'Teléfono': p.telefono || '',
        'Dirección': p.direccion || '',
        'Estado': p.activo !== false ? 'Activo' : 'Inactivo'
      }));
      await exportJsonToExcel(data, `Proveedores_Datrah_${new Date().toISOString().slice(0, 10)}`, 'Proveedores');
      showSuccess('Listado de proveedores exportado a Excel.');
    } catch (err: any) {
      showError('Error al exportar proveedores: ' + err.message);
    }
  };
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    documentoIdentidad: '',
    email: '',
    telefono: '',
    direccion: '',
  });

  useEffect(() => {
    loadProveedores();
  }, []);

  async function loadProveedores() {
    setLoading(true);
    try {
      const res = await api.getProveedores();
      setProveedores(res);
    } catch (err) {
      console.error("Error al cargar proveedores:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (prov: Proveedor | null = null) => {
    if (prov) {
      setSelectedProveedor(prov);
      setFormData({
        nombre: prov.nombre,
        documentoIdentidad: prov.documentoIdentidad,
        email: prov.email || '',
        telefono: prov.telefono || '',
        direccion: prov.direccion || '',
      });
    } else {
      setSelectedProveedor(null);
      setFormData({
        nombre: '',
        documentoIdentidad: '',
        email: '',
        telefono: '',
        direccion: '',
      });
    }
    setShowModal(true);
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Proveedor = {
        nombre: formData.nombre,
        documentoIdentidad: formData.documentoIdentidad,
        email: formData.email,
        telefono: formData.telefono,
        direccion: formData.direccion,
      };

      if (selectedProveedor?.id) {
        await api.actualizarProveedor(selectedProveedor.id, payload);
      } else {
        await api.crearProveedor(payload);
      }

      setShowModal(false);
      showSuccess(selectedProveedor?.id ? "Proveedor actualizado con éxito" : "Proveedor registrado con éxito");
      loadProveedores();
    } catch (err) {
      showError("Error al guardar proveedor: " + (err as Error).message);
    }
  };

  const handleDeleteProveedor = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar a este proveedor?")) {
      try {
        await api.eliminarProveedor(id);
        loadProveedores();
      } catch (err) {
        showError("Error al desactivar proveedor: " + (err as Error).message);
      }
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    p.documentoIdentidad.includes(search)
  );

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <div className="module-badge">
            <Truck size={13} className="text-indigo-400" /> Abastecimiento & Proveedores
          </div>
          <h1>Directorio de Proveedores</h1>
          <p className="text-muted mt-2">Registra y administra las empresas proveedoras de tu mercancía y servicios.</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary flex-center-gap-6 text-emerald-400 hover:text-white" onClick={handleExportExcel} title="Exportar directorio de proveedores a Excel">
            <Download size={16} /> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="data-card p-16 mb-24">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar por RUT/RFC/DNI o razón social..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="form-control !pl-12 w-full"
          />
        </div>
      </div>

      {/* Listado de Proveedores */}
      <div className="data-card">
        {/* Vista Móvil: Tarjetas Táctiles adaptadas al teléfono */}
        <div className="mobile-only-cards block md:hidden">
          {loading ? (
            <div className="text-center py-20 text-muted">Cargando proveedores...</div>
          ) : filteredProveedores.length === 0 ? (
            <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
              No se encontraron proveedores
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {filteredProveedores.map((p) => (
                <div key={p.id} className="mobile-card-item">
                  <div className="flex justify-between items-start gap-12">
                    <div className="flex items-center gap-12 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {p.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-base leading-snug truncate">{p.nombre}</div>
                        <div className="text-xs text-muted font-mono mt-1">Doc: {p.documentoIdentidad}</div>
                      </div>
                    </div>
                    <div className="flex gap-8 shrink-0">
                      <button className="btn btn-secondary btn-icon-sm" onClick={() => handleOpenModal(p)} title="Editar" aria-label="Editar">
                        <Edit3 size={15} />
                      </button>
                      <button className="btn btn-secondary btn-icon-sm text-danger hover:bg-danger/10 hover:border-danger/30" onClick={() => handleDeleteProveedor(p.id!)} title="Eliminar" aria-label="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {(p.email || p.telefono || p.direccion) && (
                    <div className="text-xs text-secondary flex flex-col gap-6 pt-10 border-t border-white/5">
                      {p.email && <div className="truncate">✉️ {p.email}</div>}
                      {p.telefono && <div>📞 {p.telefono}</div>}
                      {p.direccion && <div className="truncate">📍 {p.direccion}</div>}
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
                <th>Doc. Identidad</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Cargando proveedores...</td>
                </tr>
              ) : filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={6}>No se encontraron proveedores</td>
                </tr>
              ) : (
                filteredProveedores.map((p) => (
                  <tr key={p.id}>
                    <td>{p.documentoIdentidad}</td>
                    <td>{p.nombre}</td>
                    <td>{p.email || '-'}</td>
                    <td>{p.telefono || '-'}</td>
                    <td>{p.direccion || '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-secondary btn-icon-sm p-8" onClick={() => handleOpenModal(p)} title="Editar" aria-label="Editar">
                          <Edit3 size={16} />
                        </button>
                        <button className="btn btn-secondary btn-icon-sm p-8 text-danger" onClick={() => handleDeleteProveedor(p.id!)} title="Eliminar" aria-label="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear/Editar Proveedor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <form onSubmit={handleSaveProveedor}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Proveedor *</label>
                <input 
                  id="nombre"
                  type="text" 
                  required 
                  title="Nombre del Proveedor"
                  placeholder="Ej. Empresa SA"
                  value={formData.nombre} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="documentoIdentidad">Documento de Identidad (RFC / RUT / DNI) *</label>
                <input 
                  id="documentoIdentidad"
                  type="text" 
                  required 
                  title="Documento de Identidad"
                  placeholder="Ej. 12345678-9"
                  value={formData.documentoIdentidad} 
                  onChange={(e) => setFormData({ ...formData, documentoIdentidad: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input 
                  id="email"
                  type="email" 
                  title="Correo Electrónico"
                  placeholder="contacto@empresa.com"
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono de Contacto</label>
                <input 
                  id="telefono"
                  type="text" 
                  title="Teléfono"
                  placeholder="+1 234 567 890"
                  value={formData.telefono} 
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="direccion">Dirección</label>
                <textarea 
                  id="direccion"
                  title="Dirección"
                  placeholder="Dirección completa..."
                  value={formData.direccion} 
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} 
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-16 mt-24">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
