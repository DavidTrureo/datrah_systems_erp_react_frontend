import React, { useState, useEffect } from 'react';
import { api, type Usuario, type LogActividad } from '../api';
import { Edit2, UserX, UserCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { CustomSelect } from '../components/CustomSelect';

const Administracion: React.FC = () => {
  const { showSuccess, showError } = useToast();
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
      showSuccess(editingUsuario ? "Usuario actualizado exitosamente" : "Usuario creado exitosamente");
      resetForm();
      fetchUsuarios();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      showError('Error al guardar el usuario');
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
      await api.actualizarUsuario(u.id, { ...u, activo: !u.activo });
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

      <div className="data-card mt-32 tabs-container-flat mb-24">
        <div className="tabs-header-border">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Gestión de Usuarios
          </button>
          <button
            onClick={() => setActiveTab('bitacora')}
            className={`btn ${activeTab === 'bitacora' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Bitácora de Auditoría
          </button>
        </div>
      </div>

      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-24">
          {/* Formulario de Usuario */}
          <div className="data-card">
            <div className="data-card-header">
              <h2 className="text-[18px] font-semibold m-0">
                {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>
            <div className="p-16 md:p-24">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
                  <div className="form-group">
                    <label>Apellido Paterno</label>
                    <input type="text" placeholder="Apellido Paterno" title="Apellido Paterno" value={apellidoPaterno}
                      onChange={e => setApellidoPaterno(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido Materno</label>
                    <input type="text" placeholder="Apellido Materno" title="Apellido Materno" value={apellidoMaterno}
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
                  <input type="password" required={!editingUsuario} placeholder="Contraseña" title="Contraseña" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <CustomSelect
                    value={rol}
                    onChange={val => setRol(val as 'ADMIN' | 'BODEGA' | 'VENTAS' | 'FINANZAS' | 'GERENCIA')}
                    searchable={false}
                    options={[
                      { value: 'VENTAS', label: 'Ventas / Cajero' },
                      { value: 'BODEGA', label: 'Bodega / Almacén' },
                      { value: 'FINANZAS', label: 'Finanzas / Contador' },
                      { value: 'GERENCIA', label: 'Gerencia' },
                      { value: 'ADMIN', label: 'Administrador' }
                    ]}
                  />
                </div>
                {editingUsuario && (
                  <div className="form-group flex items-center gap-12">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={activo}
                      onChange={e => setActivo(e.target.checked)}
                    />
                    <label htmlFor="activo">
                      Usuario Activo
                    </label>
                  </div>
                )}
                <div className="flex justify-end gap-16 mt-24">
                  {editingUsuario && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
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
              <h2 className="text-[18px] font-semibold m-0">Usuarios del Sistema</h2>
            </div>
            {/* Vista Móvil: Tarjetas Táctiles */}
            <div className="mobile-only-cards block md:hidden p-14">
              {loadingUsuarios ? (
                <div className="text-center py-20 text-muted">Cargando usuarios...</div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-20 text-muted bg-white/[0.02] rounded-xl border border-white/5">
                  No hay usuarios registrados
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {usuarios.map(u => (
                    <div key={u.id} className="p-14 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-8 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-base">{u.nombre}</div>
                          <div className="text-xs text-muted font-mono mt-1">@{u.username} {u.rut && `• ${u.rut}`}</div>
                        </div>
                        <div className="flex gap-6">
                          <button
                            onClick={() => handleEditUsuario(u)}
                            className="btn btn-secondary btn-icon-sm p-8"
                            title="Editar Usuario"
                          >
                            <Edit2 size={16} className="text-primary" />
                          </button>
                          <button
                            onClick={() => toggleUsuarioActivo(u)}
                            className="btn btn-secondary btn-icon-sm p-8"
                            title={u.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                          >
                            {u.activo ? <UserX size={16} className="text-danger" /> : <UserCheck size={16} className="text-success" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                        <span className={`badge ${u.rol === 'ADMIN' ? 'badge-warning' : 'badge-success'}`}>
                          {u.rol}
                        </span>
                        <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vista Escritorio: Tabla tradicional */}
            <div className="desktop-only-table hidden md:block table-responsive">
              {loadingUsuarios ? (
                <div className="p-16">Cargando usuarios...</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
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
                        <td className="flex items-center gap-8">
                          <button
                            onClick={() => handleEditUsuario(u)}
                            className="btn btn-secondary btn-icon-sm p-8"
                            title="Editar Usuario"
                          >
                            <Edit2 size={16} className="text-primary" />
                          </button>
                          <button
                            onClick={() => toggleUsuarioActivo(u)}
                            className="btn btn-secondary btn-icon-sm p-8"
                            title={u.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                          >
                            {u.activo ? <UserX size={16} className="text-danger" /> : <UserCheck size={16} className="text-success" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={5}>
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
            <h2 className="text-[18px] font-semibold m-0">Bitácora de Auditoría</h2>
            <button
              onClick={fetchLogs}
              className="btn btn-secondary"
            >
              Refrescar
            </button>
          </div>
          <div className="table-responsive">
            {loadingLogs ? (
              <div>Cargando bitácora...</div>
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
                      <td>
                        {new Date(log.fecha).toLocaleString()}
                      </td>
                      <td>
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
                      <td title={log.detalle}>
                        {log.detalle}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5}>
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
