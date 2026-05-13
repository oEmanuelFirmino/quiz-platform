import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './AuthContext';
import App from './App.tsx';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Editor from './pages/admin/Editor';
import QuizPublic from './pages/public/QuizPublic';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="quiz/:id" element={<Editor />} />
          </Route>
          <Route path="/q/:id" element={<QuizPublic />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
