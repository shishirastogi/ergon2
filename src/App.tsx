import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoginSignup } from './pages/LoginSignup';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { ProjectsPipeline } from './pages/ProjectsPipeline';
import { Quotes } from './pages/Quotes';
import { QuoteEditor } from './pages/QuoteEditor';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { InvoiceEditor } from './pages/InvoiceEditor';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

import { StudioProvider } from './context/StudioContext';
import { CurrencyProvider } from './context/CurrencyContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StudioProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/signup" element={<LoginSignup />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="clients/:id" element={<ClientDetail />} />
                  <Route path="projects" element={<ProjectsPipeline />} />
                  <Route path="quotes" element={<Quotes />} />
                  <Route path="quotes/new" element={<QuoteEditor />} />
                  <Route path="quotes/:id" element={<QuoteEditor />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/new" element={<InvoiceEditor />} />
                  <Route path="invoices/:id" element={<InvoiceDetail />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CurrencyProvider>
        </StudioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
