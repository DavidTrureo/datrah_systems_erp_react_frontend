import React, { useState, useEffect } from 'react';
import { api, type Usuario, type LogActividad } from '../api';

const Administracion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'bitacora'>('usuarios');
  
  // Usuarios State
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  
  // Bitacora State
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form State para Usuario
  const [username, setUsername] = useState('');
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ADMIN' | 'BODEGA' | 'VENTAS' | 'FINANZAS' | 'GERENCIA'>('VENTAS');
  const [activo, setActivo] = useState(true);
  
  useEffect(() => {
    if (activeTab === 'usuarios') {
      fetchUsuarios();
    } else {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const data = await api.getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getLogsActividad();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUsuario?.id) {
        await api.actualizarUsuario(editingUsuario.id, {
          username,
          nombre,
          rut,
          apellidoPaterno,
          apellidoMaterno,
          rol,
          activo,
          password: password ? password : undefined,
        });
      } else {
        await api.crearUsuario({
          username,
          nombre,
          rut,
          apellidoPaterno,
          apellidoMaterno,
          rol,
          activo,
          password,
        });
      }
      resetForm();
      fetchUsuarios();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error al guardar el usuario');
    }
  };

  const resetForm = () => {
    setEditingUsuario(null);
    setUsername('');
    setNombre('');
    setRut('');
    setApellidoPaterno('');
    setApellidoMaterno('');
    setPassword('');
    setRol('VENTAS');
    setActivo(true);
  };

  const handleEditUsuario = (u: Usuario) => {
    setEditingUsuario(u);
    setUsername(u.username);
    setNombre(u.nombre);
    setRut(u.rut || '');
    setApellidoPaterno(u.apellidoPaterno || '');
    setApellidoMaterno(u.apellidoMaterno || '');
    setRol(u.rol);
    setActivo(u.activo ?? true);
    setPassword(''); // No mostramos el password anterior
  };

  const toggleUsuarioActivo = async (u: Usuario) => {
    if (!u.id) return;
    try {
      await api.actualizarUsuario(u.id, { activo: !u.activo });
      fetchUsuarios();
    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="content-header">
        <div className="page-title">
          <h1>Administración del Sistema</h1>
          <p>Gestión de usuarios y auditoría de seguridad</p>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          style={{ 
            background: 'none', border: 'none', padding: '12px 16px', color: activeTab === 'usuarios' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'usuarios' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'usuarios' ? '600' : '500', cursor: 'pointer', fontSize: '15px', transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('usuarios')}
        >
          Gestión de Usuarios
        </button>
        <button
          style={{ 
            background: 'none', border: 'none', padding: '12px 16px', color: activeTab === 'bitacora' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'bitacora' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'bitacora' ? '600' : '500', cursor: 'pointer', fontSize: '15px', transition: 'var(--transition-smooth)'
          }}
          onClick={() => setActiveTab('bitacora')}
        >
          Bitácora de Auditoría
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Formulario de Usuario */}
          <div className="data-card">
            <div className="data-card-header">
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSubmitUsuario}>
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="form-control"
                    placeholder="Ej: jdoe"
                  />
                </div>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="form-control"
                    placeholder="Ej: John"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Apellido Paterno</label>
                    <input
                      type="text"
                      value={apellidoPaterno}
                      onChange={e => setApellidoPaterno(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido Materno</label>
                    <input
                      type="text"
                      value={apellidoMaterno}
                      onChange={e => setApellidoMaterno(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>RUT</label>
                  <input
                    type="text"
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                    className="form-control"
                    placeholder="12.345.678-9"
                  />
                </div>
                <div className="form-group">
                  <label>Password {editingUsuario && '(Dejar en blanco para no cambiar)'}</label>
                  <input
                    type="password"
                    required={!editingUsuario}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={rol}
                    onChange={e => setRol(e.target.value as 'ADMIN' | 'BODEGA' | 'VENTAS' | 'FINANZAS' | 'GERENCIA')}
                    className="form-control"
                  >
                    <option value="VENTAS">Ventas / Cajero</option>
                    <option value="BODEGA">Bodega / Almacén</option>
                    <option value="FINANZAS">Finanzas / Contador</option>
                    <option value="GERENCIA">Gerencia</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                {editingUsuario && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      id="activo"
                      checked={activo}
                      onChange={e => setActivo(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="activo" style={{ marginBottom: 0, cursor: 'pointer' }}>
                      Usuario Activo
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  {editingUsuario && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {editingUsuario ? 'Actualizar' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Lista de Usuarios */}
          <div className="data-card">
            <div className="data-card-header">
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Usuarios del Sistema</h2>
            </div>
            <div className="table-responsive">
              {loadingUsuarios ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando usuarios...</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '500' }}>{u.username}</td>
                        <td>{u.nombre}</td>
                        <td>
                          <span className={`badge ${u.rol === 'ADMIN' ? 'badge-warning' : 'badge-success'}`}>
                            {u.rol}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditUsuario(u)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', marginRight: '8px' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleUsuarioActivo(u)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', color: u.activo ? 'var(--danger)' : 'var(--success)', borderColor: u.activo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' }}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bitacora' && (
        <div className="data-card">
          <div className="data-card-header">
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Bitácora de Auditoría</h2>
            <button
              onClick={fetchLogs}
              className="btn btn-secondary"
            >
              Refrescar
            </button>
          </div>
          <div className="table-responsive">
            {loadingLogs ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando bitácora...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Módulo/Entidad</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {new Date(log.fecha).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '500' }}>
                        {log.usuarioUsername}
                      </td>
                      <td>
                        <span className={`badge ${
                          log.accion === 'CREAR' ? 'badge-success' :
                          log.accion === 'MODIFICAR' ? 'badge-warning' :
                          log.accion === 'ELIMINAR' ? 'badge-danger' :
                          'badge-success'
                        }`}>
                          {log.accion}
                        </span>
                      </td>
                      <td>{log.entidad}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)', fontSize: '14px' }} title={log.detalle}>
                        {log.detalle}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No hay registros en la bitácora.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Administracion;
