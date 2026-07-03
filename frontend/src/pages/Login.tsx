import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alerts } from '../lib/alerts';
import { Spinner } from '../components/ui';

const schema = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      alerts.success('Bienvenido');
      navigate('/');
    } catch (err: any) {
      alerts.error('No se pudo iniciar sesion', err?.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-950 to-slate-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="UAEMEX" className="mb-4 h-20 w-20 rounded-xl object-contain" />
          <h1 className="text-2xl font-bold">Gestion de Activos</h1>
          <p className="text-sm text-gold-600">
            Universidad Autonoma del Estado de Mexico
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Correo institucional</label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="email"
                className="input pl-10"
                placeholder="usuario@universidad.edu"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">Contrasena</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-10 pr-10"
                placeholder="********"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-2.5"
          >
            {isSubmitting ? <Spinner /> : 'Iniciar sesion'}
          </button>
        </form>

      </motion.div>
    </div>
  );
}
