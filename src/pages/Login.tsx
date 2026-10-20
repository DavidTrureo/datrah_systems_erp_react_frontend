import React, { useState } from 'react';
import { api, type LoginResponse } from '../api';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: LoginResponse) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Por favor, ingresa tanto tu usuario como tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.login({ username: trimmedUser, password: trimmedPass });
      if (response.authenticated) {
        onLoginSuccess(response);
      } else {
        setError('Usuario o contraseña incorrectos. Revisa tus credenciales e intenta nuevamente.');
      }
    } catch (err) {
      setError((err as Error).message || 'Error de conexión con el servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="modal-content !max-w-md w-full relative z-10 flex flex-col gap-6 shadow-2xl border border-white/10 backdrop-blur-md">
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="Datrah Systems ERP" className="w-48 mb-2 drop-shadow-2xl" />
          <h1 className="text-xl font-bold text-white tracking-wide mt-2">Iniciar Sesión</h1>
          <p className="text-xs text-white/60">Ingresa tus credenciales para acceder al ERP</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-200 animate-shake">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="form-group mb-0 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-white/70 font-medium text-sm">
              <User size={14} className="text-blue-400" /> Usuario o Correo
            </label>
            <input 
              type="text" 
              required
              placeholder="Ej: admin o usuario@datrah.cl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control"
              autoComplete="username"
              autoCapitalize="none"
              disabled={loading}
            />
          </div>

          <div className="form-group mb-0 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-white/70 font-medium text-sm">
              <Lock size={14} className="text-blue-400" /> Contraseña
            </label>
            <div className="relative flex items-center">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control pr-10 w-full"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-white/50 hover:text-white transition-colors"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full justify-center mt-3 text-base py-3 font-semibold tracking-wide"
          >
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
