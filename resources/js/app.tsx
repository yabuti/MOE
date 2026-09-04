import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Schools from './pages/Schools';
import SchoolDashboard from './pages/SchoolDashboard';
import SchoolStudents from './pages/SchoolStudents';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import NodeTypes from './pages/NodeTypes';
import Catalog from './pages/Catalog';
import Content from './pages/Content';
import Exams from './pages/Exams';
import Questions from './pages/Questions';
import AuditLogs from './pages/AuditLogs';
import BookImport from './pages/BookImport';
import Library from './pages/Library';
import BookReader from './pages/BookReader';
import ParentDashboard from './pages/ParentDashboard';
import MyProgress from './pages/MyProgress';

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
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
                        <Route path="school/dashboard" element={<SchoolDashboard />} />
                        <Route path="school/students" element={<SchoolStudents />} />
                        <Route path="node-types" element={<NodeTypes />} />
                        <Route path="catalog" element={<Catalog />} />
                        <Route path="import-books" element={<BookImport />} />
                        <Route path="content" element={<Content />} />
                        <Route path="content/:nodeId" element={<Content />} />
                        <Route path="exams" element={<Exams />} />
                        <Route path="exams/:examId/questions" element={<Questions />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="library" element={<Library />} />
                        <Route path="read/:bookId" element={<BookReader />} />
                        <Route path="parent" element={<ParentDashboard />} />
                        <Route path="my-progress" element={<MyProgress />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="change-password" element={<ChangePassword />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
