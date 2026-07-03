import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import ExcelPage from './pages/ExcelPage';
import PdfPage from './pages/PdfPage';
import Departments from './pages/Departments';
import Categories from './pages/Categories';
import Responsables from './pages/Responsables';
import UsersPage from './pages/UsersPage';
import Audit from './pages/Audit';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bienes" element={<Assets />} />
          <Route path="/escaner" element={<Scanner />} />
          <Route path="/departamentos" element={<Departments />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/responsables" element={<Responsables />} />
          <Route element={<ProtectedRoute roles={['ADMIN', 'SUPERVISOR']} />}>
            <Route path="/excel" element={<ExcelPage />} />
            <Route path="/pdf" element={<PdfPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/auditoria" element={<Audit />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
