import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, type Cliente } from '../api';
import { Plus, Search, Edit3, Trash2, Users, Download } from 'lucide-react';
import { exportJsonToExcel } from '../utils/excelExport';

export default function Clientes() {
  const { showSuccess, showError } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handleExportExcel = async () => {
    if (clientes.length === 0) {
      showError('No hay clientes para exportar.');
      return;
    }
    try {
      const data = clientes.map(c => ({
        'ID': c.id,
        'RUT / Documento': c.documentoIdentidad,
        'Razón Social / Nombre': c.nombre,
        'Email': c.email || '',
        'Teléfono': c.telefono || '',
        'Dirección': c.direccion || '',
        'Estado': c.activo !== false ? 'Activo' : 'Inactivo'
      }));
      await exportJsonToExcel(data, `Clientes_Datrah_${new Date().toISOString().slice(0, 10)}`, 'Clientes');
      showSuccess('Listado de clientes exportado a Excel.');
    } catch (err: any) {
      showError('Error al exportar clientes: ' + err.message);
    }
  };
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    documentoIdentidad: '',
    email: '',
    telefono: '',
    direccion: '',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    setLoading(true);
    try {
      const res = await api.getClientes();
      setClientes(res);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (cli: Cliente | null = null) => {
    if (cli) {
      setSelectedCliente(cli);
      setFormData({
        nombre: cli.nombre,
        documentoIdentidad: cli.documentoIdentidad,
        email: cli.email || '',
        telefono: cli.telefono || '',
        direccion: cli.direccion || '',
      });
    } else {
      setSelectedCliente(null);
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

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Cliente = {
        nombre: formData.nombre,
        documentoIdentidad: formData.documentoIdentidad,
        email: formData.email,
        telefono: formData.telefono,
        direccion: formData.direccion,
      };

      if (selectedCliente?.id) {
        await api.actualizarCliente(selectedCliente.id, payload);
      } else {
        await api.crearCliente(payload);
      }

      setShowModal(false);
      showSuccess(selectedCliente?.id ? "Cliente actualizado con éxito" : "Cliente registrado con éxito");
      loadClientes();
    } catch (err) {
      showError("Error al guardar cliente: " + (err as Error).message);
    }
  };

  const handleDeleteCliente = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar a este cliente?")) {
      try {
        await api.eliminarCliente(id);
        loadClientes();
      } catch (err) {
        showError("Error al desactivar cliente: " + (err as Error).message);
      }
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) || 
    c.documentoIdentidad.includes(search)
  );

  return (
    <div>
      <div className="content-header">
        <div className="page-title">
          <div className="module-badge">
            <Users size={13} className="text-indigo-400" /> Directorio Comercial
          </div>
          <h1>Directorio de Clientes</h1>
          <p className="text-muted mt-2">Registra y administra los perfiles y datos de contacto de tus clientes.</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary flex-center-gap-6 text-emerald-400 hover:text-white" onClick={handleExportExcel} title="Exportar directorio de clientes a Excel">
            <Download size={16} /> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="data-card p-16 mb-24">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar por RUT/RFC/DNI o nombre de cliente..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="form-control !pl-12 w-full"
          />
        </div>
      </div>

      {/* Listado de Clientes */}
      <div className="data-card">
        {/* Vista Móvil: Tarjetas de Clientes adaptadas al teléfono */}
        <div className="mobile-only-cards block md:hidden">
          {loading ? (
            <div className="text-center py-20 text-muted">Cargando clientes...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
              No se encontraron clientes
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {filteredClientes.map((c) => (
                <div key={c.id} className="mobile-card-item">
                  <div className="flex justify-between items-start gap-12">
                    <div className="flex items-center gap-12 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-base leading-snug truncate">{c.nombre}</div>
                        <div className="text-xs text-muted font-mono mt-1">Doc: {c.documentoIdentidad}</div>
                      </div>
                    </div>
                    <div className="flex gap-8 shrink-0">
                      <button className="btn btn-secondary btn-icon-sm" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar">
                        <Edit3 size={15} />
                      </button>
                      <button className="btn btn-secondary btn-icon-sm text-danger hover:bg-danger/10 hover:border-danger/30" onClick={() => handleDeleteCliente(c.id!)} title="Eliminar" aria-label="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {(c.email || c.telefono || c.direccion) && (
                    <div className="text-xs text-secondary flex flex-col gap-6 pt-10 border-t border-white/5">
                      {c.email && <div className="truncate">✉️ {c.email}</div>}
                      {c.telefono && <div>📞 {c.telefono}</div>}
                      {c.direccion && <div className="truncate">📍 {c.direccion}</div>}
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
                  <td colSpan={6}>Cargando clientes...</td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6}>No se encontraron clientes</td>
                </tr>
              ) : (
                filteredClientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.documentoIdentidad}</td>
                    <td>{c.nombre}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.telefono || '-'}</td>
                    <td>{c.direccion || '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-secondary" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar">
                          <Edit3 size={18} />
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleDeleteCliente(c.id!)} title="Eliminar" aria-label="Eliminar">
                          <Trash2 size={18} />
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

      {/* MODAL: Crear/Editar Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSaveCliente}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Cliente *</label>
                <input 
                  id="nombre"
                  type="text" 
                  required 
                  title="Nombre del Cliente"
                  placeholder="Ej. Juan Pérez"
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
                  placeholder="correo@ejemplo.com"
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
                <button type="submit" className="btn btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
