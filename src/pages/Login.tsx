import React, { useState } from 'react';
import { api, type LoginResponse } from '../api';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: LoginResponse) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login({ username, password });
      if (response.authenticated) {
        onLoginSuccess(response);
      } else {
        setError('Credenciales inválidas o cuenta inactiva.');
      }
    } catch (err) {
      setError((err as Error).message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="modal-content">
        <div>
          <img src="/logo.png" alt="Datrah Systems" />
          <h1>Iniciar Sesión</h1>
          <p>Ingresa a Datrah Systems</p>
        </div>

        {error && (
          <div>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <User size={14} /> Usuario
            </label>
            <input 
              type="text" 
              required
              placeholder="Ej: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={14} /> Contraseña
            </label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
// Trigger IDE refresh
