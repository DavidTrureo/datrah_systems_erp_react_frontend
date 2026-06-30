import React, { useEffect, useState } from 'react';
import { api, type Proveedor } from '../api';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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
      loadProveedores();
    } catch (err) {
      alert("Error al guardar proveedor: " + (err as Error).message);
    }
  };

  const handleDeleteProveedor = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar a este proveedor?")) {
      try {
        await api.eliminarProveedor(id);
        loadProveedores();
      } catch (err) {
        alert("Error al desactivar proveedor: " + (err as Error).message);
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
          <h1>Directorio de Proveedores</h1>
          <p>Registra y administra las empresas proveedoras de tu mercancía.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      {/* Buscador */}
      <div className="data-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Search style={{ color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            placeholder="Buscar por RUT/RFC/NIT o nombre del proveedor..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="form-control"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px' }}
          />
        </div>
      </div>

      {/* Listado de Proveedores */}
      <div className="data-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doc. Identidad</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Cargando proveedores...</td>
                </tr>
              ) : filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No se encontraron proveedores</td>
                </tr>
              ) : (
                filteredProveedores.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '500' }}>{p.documentoIdentidad}</td>
                    <td style={{ fontWeight: '600' }}>{p.nombre}</td>
                    <td>{p.email || '-'}</td>
                    <td>{p.telefono || '-'}</td>
                    <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{p.direccion || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px' }} onClick={() => handleOpenModal(p)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteProveedor(p.id!)}>
                          <Trash2 size={16} style={{ color: 'var(--danger)' }} />
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
            <form onSubmit={handleSaveProveedor} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Nombre del Proveedor *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Documento de Identidad (RFC / RUT / NIT) *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.documentoIdentidad} 
                  onChange={(e) => setFormData({ ...formData, documentoIdentidad: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Teléfono de Contacto</label>
                <input 
                  type="text" 
                  value={formData.telefono} 
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <textarea 
                  value={formData.direccion} 
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} 
                  className="form-control"
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
