import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Schools from './pages/Schools';
import NodeTypes from './pages/NodeTypes';
import Catalog from './pages/Catalog';
import Content from './pages/Content';
import Media from './pages/Media';
import Exams from './pages/Exams';
import Questions from './pages/Questions';
import AuditLogs from './pages/AuditLogs';
import BookImport from './pages/BookImport';
import Library from './pages/Library';
import BookReader from './pages/BookReader';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="users" element={<Users />} />
                        <Route path="roles" element={<Roles />} />
                        <Route path="schools" element={<Schools />} />
                        <Route path="node-types" element={<NodeTypes />} />
                        <Route path="catalog" element={<Catalog />} />
                        <Route path="import-books" element={<BookImport />} />
                        <Route path="content" element={<Content />} />
                        <Route path="content/:nodeId" element={<Content />} />
                        <Route path="media" element={<Media />} />
                        <Route path="exams" element={<Exams />} />
                        <Route path="exams/:examId/questions" element={<Questions />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="library" element={<Library />} />
                        <Route path="read/:bookId" element={<BookReader />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
