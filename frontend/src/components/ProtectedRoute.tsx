import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';
import type { RoleName } from '../types';

export function ProtectedRoute({ roles }: { roles?: RoleName[] }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
