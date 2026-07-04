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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="modal-content !max-w-md w-full relative z-10 flex flex-col gap-6">
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="Datrah Systems" className="w-48 mb-6 drop-shadow-2xl" />
          <h1 className="text-2xl font-bold mb-2">Iniciar Sesión</h1>
          <p className="text-white/60">Ingresa a Datrah Systems</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-200">
            <AlertCircle size={18} className="text-red-500" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="form-group mb-0 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-white/70 font-medium">
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

          <div className="form-group mb-0 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-white/70 font-medium">
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
            className="btn btn-primary w-full justify-center mt-4 text-base py-3"
          >
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
// Trigger IDE refresh
