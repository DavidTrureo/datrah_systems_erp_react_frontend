import React, { useEffect, useState } from 'react';
import { api, type Cliente } from '../api';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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
      loadClientes();
    } catch (err) {
      alert("Error al guardar cliente: " + (err as Error).message);
    }
  };

  const handleDeleteCliente = async (id: number) => {
    if (confirm("¿Estás seguro de desactivar a este cliente?")) {
      try {
        await api.eliminarCliente(id);
        loadClientes();
      } catch (err) {
        alert("Error al desactivar cliente: " + (err as Error).message);
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
          <h1>Gestión de Clientes</h1>
          <p>Registra y administra los perfiles de tus clientes para la facturación.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="data-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Search style={{ color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            placeholder="Buscar por RUT/RFC/DNI o nombre de cliente..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="form-control"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px' }}
          />
        </div>
      </div>

      {/* Listado de Clientes */}
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Cargando clientes...</td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No se encontraron clientes</td>
                </tr>
              ) : (
                filteredClientes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '500' }}>{c.documentoIdentidad}</td>
                    <td style={{ fontWeight: '600' }}>{c.nombre}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.telefono || '-'}</td>
                    <td style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{c.direccion || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px' }} onClick={() => handleOpenModal(c)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteCliente(c.id!)}>
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

      {/* MODAL: Crear/Editar Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSaveCliente} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Nombre del Cliente *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Documento de Identidad (RFC / RUT / DNI) *</label>
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
                <button type="submit" className="btn btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
