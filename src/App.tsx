import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './crm/components/ProtectedRoute';
import { CRMLayout } from './crm/CRMLayout';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './crm/context/AuthContext';

// Redirect HTTP to HTTPS in production to enable secure context APIs (like cameras/scanners)
if (
  typeof window !== 'undefined' &&
  window.location.protocol === 'http:' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  !window.location.hostname.startsWith('192.168.') &&
  !window.location.hostname.startsWith('10.') &&
  !window.location.hostname.startsWith('172.')
) {
  window.location.replace(window.location.href.replace('http:', 'https:'));
}

// Redirect subdomain to CRM route
if (
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'срм.леоника56.рф' || 
    window.location.hostname === 'xn--l1ahc.xn--56-6kctpmeri.xn--p1ai' ||
    window.location.hostname === 'crm.леоника56.рф' ||
    window.location.hostname === 'crm.xn--56-6kctpmeri.xn--p1ai'
  ) &&
  (window.location.hash === '' || window.location.hash === '#/')
) {
  window.location.replace('/#/crm');
}

// Lazy load website public pages
const SaaSLanding = React.lazy(() => import('./pages/SaaSLanding').then(m => ({ default: m.SaaSLanding })));
const HomePage = React.lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const SectorPage = React.lazy(() => import('./pages/SectorPage').then(m => ({ default: m.SectorPage })));
const MaterialPage = React.lazy(() => import('./pages/MaterialPage').then(m => ({ default: m.MaterialPage })));
const StandardPage = React.lazy(() => import('./pages/StandardPage').then(m => ({ default: m.StandardPage })));
const ContactLanding = React.lazy(() => import('./pages/ContactLanding').then(m => ({ default: m.ContactLanding })));

// Lazy load CRM pages
const Login = React.lazy(() => import('./crm/pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./crm/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Clients = React.lazy(() => import('./crm/pages/Clients').then(m => ({ default: m.Clients })));
const Objects = React.lazy(() => import('./crm/pages/Objects').then(m => ({ default: m.Objects })));
const Finance = React.lazy(() => import('./crm/pages/Finance').then(m => ({ default: m.Finance })));
const Inventory = React.lazy(() => import('./crm/pages/Inventory').then(m => ({ default: m.Inventory })));
const Equipment = React.lazy(() => import('./crm/pages/Equipment').then(m => ({ default: m.Equipment })));
const Templates = React.lazy(() => import('./crm/pages/Templates').then(m => ({ default: m.Templates })));
const TemplatesAndContent = React.lazy(() => import('./crm/pages/TemplatesAndContent').then(m => ({ default: m.TemplatesAndContent })));
const AdminSettings = React.lazy(() => import('./crm/pages/AdminSettings').then(m => ({ default: m.AdminSettings })));
const Tenders = React.lazy(() => import('./crm/pages/Tenders').then(m => ({ default: m.Tenders })));
const Analytics = React.lazy(() => import('./crm/pages/Analytics').then(m => ({ default: m.Analytics })));
const Tasks = React.lazy(() => import('./crm/pages/Tasks').then(m => ({ default: m.Tasks })));
const AuditLogs = React.lazy(() => import('./crm/pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const SpecialTasks = React.lazy(() => import('./crm/pages/SpecialTasks').then(m => ({ default: m.SpecialTasks })));
const TmaKanban = React.lazy(() => import('./crm/pages/TmaKanban').then(m => ({ default: m.TmaKanban })));
const ConstructionDashboard = React.lazy(() => import('./crm/pages/Construction/ConstructionDashboard'));
const ConstructionProjectView = React.lazy(() => import('./crm/pages/Construction/ConstructionProjectView'));
const SuperAdmin = React.lazy(() => import('./crm/pages/SuperAdmin').then(m => ({ default: m.SuperAdmin })));
const SupportDesk = React.lazy(() => import('./crm/pages/SupportDesk'));
const Marketplace = React.lazy(() => import('./crm/pages/Marketplace').then(m => ({ default: m.Marketplace })));
const SupplyPipeline = React.lazy(() => import('./crm/pages/SupplyPipeline'));
const ServiceTickets = React.lazy(() => import('./crm/pages/ServiceTickets'));
const ServicesTechCards = React.lazy(() => import('./crm/pages/ServicesTechCards'));
const AppointmentsChessboard = React.lazy(() => import('./crm/pages/AppointmentsChessboard'));

// Premium Skeleton Loader Fallback
const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col space-y-6 animate-pulse p-4">
      {/* Upper Control Bar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-2.5">
          <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-72 bg-zinc-150 dark:bg-zinc-800/60 rounded-md" />
        </div>
        <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Grid Content Bento-like Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="h-5 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="space-y-3 pt-2">
            <div className="h-4 w-full bg-zinc-150 dark:bg-zinc-800/40 rounded-md" />
            <div className="h-4 w-5/6 bg-zinc-150 dark:bg-zinc-800/40 rounded-md" />
            <div className="h-4 w-4/5 bg-zinc-150 dark:bg-zinc-800/40 rounded-md" />
            <div className="h-4 w-2/3 bg-zinc-150 dark:bg-zinc-800/40 rounded-md" />
          </div>
        </div>
        <div className="h-80 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="h-5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="flex justify-center py-4">
            <div className="h-20 w-20 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-350 dark:border-t-zinc-700 animate-spin" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-3/4 bg-zinc-150 dark:bg-zinc-800/60 rounded-md mx-auto" />
            <div className="h-3.5 w-1/2 bg-zinc-150 dark:bg-zinc-800/60 rounded-md mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Main Website Layout */}
              <Route path="/" element={<Layout />}>
                <Route index element={<SaaSLanding />} />
                <Route path="industrial" element={<HomePage />} />
                <Route path="sectors/:id" element={<SectorPage />} />
                <Route path="materials/:id" element={<MaterialPage />} />
                <Route path="standards/:id" element={<StandardPage />} />
              </Route>

              {/* Standalone Public Mobile vCard Route */}
              <Route path="/c" element={<ContactLanding />} />

              {/* Admin Login Route */}
              <Route path="/crm/login" element={<Login />} />

              {/* Telegram Mini App Route */}
              <Route path="/tma" element={<ProtectedRoute />}>
                <Route index element={<TmaKanban />} />
              </Route>

              {/* Protected Admin CRM Layout */}
              <Route path="/crm" element={<ProtectedRoute />}>
                <Route element={<CRMLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="objects" element={<Objects />} />
                  <Route path="construction" element={<ConstructionDashboard />} />
                  <Route path="construction/:id" element={<ConstructionProjectView />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="equipment" element={<Equipment />} />
                  <Route path="doc-templates" element={<Templates />} />
                  <Route path="templates" element={<TemplatesAndContent />} />
                  <Route path="admin" element={<AdminSettings />} />
                   <Route path="tenders" element={<Tenders />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="special-tasks" element={<SpecialTasks />} />
                  <Route path="superadmin" element={<SuperAdmin />} />
                  <Route path="support" element={<SupportDesk />} />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="supply" element={<SupplyPipeline />} />
                  <Route path="service" element={<ServiceTickets />} />
                  <Route path="booking">
                    <Route path="services" element={<ServicesTechCards />} />
                    <Route path="appointments" element={<AppointmentsChessboard />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
