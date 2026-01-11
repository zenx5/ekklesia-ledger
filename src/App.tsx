import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Entradas from "./pages/Entradas";
import Saidas from "./pages/Saidas";
import Auditoria from "./pages/Auditoria";
import Usuarios from "./pages/Usuarios";
import Permissoes from "./pages/Permissoes";
import Miembros from "./pages/Miembros";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/entradas" element={<Entradas />} />
            <Route path="/saidas" element={<Saidas />} />
            <Route path="/auditoria" element={<Auditoria />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/permissoes" element={<Permissoes />} />
            <Route path="/miembros" element={<Miembros />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
