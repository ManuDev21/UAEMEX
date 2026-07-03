import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-4 dark:bg-slate-950">
      <h1 className="text-7xl font-extrabold text-brand-600">404</h1>
      <p className="text-lg text-slate-500 dark:text-slate-400">
        La pagina que buscas no existe.
      </p>
      <Link to="/" className="btn-primary">
        <Home size={16} /> Volver al inicio
      </Link>
    </div>
  );
}
