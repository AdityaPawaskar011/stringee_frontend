import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Layout } from './Layout';
import PrivateRoute from './routes/PrivateRoute';
import PublicRoute from './routes/PublicRoute';
import SessionPopup from '@/features/auth/components/SessionPopup';
import { PageFallback } from '@/shared/components/ui';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

// Route-level code splitting — each page becomes its own chunk so the
// initial bundle only ships what's needed for the current screen.
const Dashboard          = lazy(() => import('@/features/dashboard/DashboardPage'));
const LeadsUploadPage    = lazy(() => import('@/features/leads/LeadsUploadPage'));
const EmailTemplatesPage = lazy(() => import('@/features/email-templates/EmailTemplatesPage'));
const CampaignLeadsPage  = lazy(() => import('@/features/campaign-leads/CampaignLeadsPage'));
const LoginPage          = lazy(() => import('@/features/auth/LoginPage'));
const UnauthorizedPage   = lazy(() => import('@/features/auth/UnauthorizedPage'));
const CallPage           = lazy(() => import('@/features/calls/CallPage'));
const AgentMailPage      = lazy(() => import('@/features/agent-mail/AgentMailPage'));
const ReportingPage      = lazy(() => import('@/features/reporting/ReportingPage'));
const LeadManagementPage = lazy(() => import('@/features/lead-management/LeadManagementPage'));
const ManagerViewPage    = lazy(() => import('@/features/manager-view/ManagerViewPage'));
const WhatsAppAdminPage  = lazy(() => import('@/features/whatsapp-admin/WhatsAppAdminPage'));
const WaApiExplorerPage  = lazy(() => import('@/features/wa-api/WaApiExplorerPage'));
const WhatsAppLoginPage  = lazy(() => import('@/features/whatsapp-login/WhatsAppLoginPage'));
const WhatsAppSessionsPage = lazy(() => import('@/features/whatsapp-sessions/WhatsAppSessionsPage'));
const WhatsAppAutomationPage = lazy(() => import('@/features/whatsapp-automation/WhatsAppAutomationPage'));
const DoubleTickPage     = lazy(() => import('@/features/double-tick/DoubleTickPage'));
const StringeeAgentsPage = lazy(() => import('@/features/stringee-agents/StringeeAgentsPage'));
const IntegrationsPage   = lazy(() => import('@/features/settings/IntegrationsPage'));
const DispositionsPage   = lazy(() => import('@/features/settings/DispositionsPage'));
const CompaniesPage      = lazy(() => import('@/features/platform/CompaniesPage'));
const CallQualityPage    = lazy(() => import('@/features/settings/CallQualityPage'));
const StringeePage       = lazy(() => import('@/features/settings/StringeePage'));
const ManualAnalysisPage = lazy(() => import('@/features/manual-analysis/ManualAnalysisPage'));
const AdminUsersPage     = lazy(() => import('@/features/admin/UsersPage'));
const AdminCampaignsPage = lazy(() => import('@/features/admin/CampaignsPage'));
const AdminListsPage     = lazy(() => import('@/features/admin/ListsPage'));
const AdminLeadsPage     = lazy(() => import('@/features/admin/LeadsPage'));
const AdminDncPage       = lazy(() => import('@/features/admin/DncPage'));
const SelectivePage      = lazy(() => import('@/pages/SelectivePage'));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'));

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Layout>
          <SessionPopup />
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route element={<PrivateRoute allowedAdmin={true} />}>
                  <Route path="/"                element={<Dashboard />} />
                  <Route path="/selective"       element={<SelectivePage />} />
                  <Route path="/leads-upload"    element={<LeadsUploadPage />} />
                  <Route path="/email-templates" element={<EmailTemplatesPage />} />
                  <Route path="/campaign-leads"  element={<CampaignLeadsPage />} />
                  <Route path="/lead-management" element={<LeadManagementPage />} />
                  <Route path="/manager-view"    element={<ManagerViewPage />} />
                  <Route path="/whatsapp-login"    element={<WhatsAppLoginPage />} />
                  <Route path="/whatsapp-sessions" element={<WhatsAppSessionsPage />} />
                  <Route path="/whatsapp-automation" element={<WhatsAppAutomationPage />} />
                  <Route path="/double-tick"       element={<DoubleTickPage />} />
                  <Route path="/stringee-agents"   element={<StringeeAgentsPage />} />
                </Route>

                {/* Company settings and dialer setup: company admins only. */}
                <Route element={<PrivateRoute allowedAdmin={true} requireCompanyAdmin />}>
                  <Route path="/settings/integrations" element={<IntegrationsPage />} />
                  <Route path="/settings/dispositions" element={<DispositionsPage />} />
                  <Route path="/settings/call-quality" element={<CallQualityPage />} />
                  <Route path="/settings/stringee" element={<StringeePage />} />
                  <Route path="/manual-analysis" element={<ManualAnalysisPage />} />
                  <Route path="/admin/users"     element={<AdminUsersPage />} />
                  <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
                  <Route path="/admin/lists"     element={<AdminListsPage />} />
                  <Route path="/admin/leads"     element={<AdminLeadsPage />} />
                  <Route path="/admin/dnc"       element={<AdminDncPage />} />
                </Route>

                <Route element={<PrivateRoute allowedAdmin={true} requirePlatformAdmin />}>
                  <Route path="/platform/companies" element={<CompaniesPage />} />
                </Route>

                <Route element={<PrivateRoute allowedAdmin={false} />}>
                  <Route path="/call" element={<CallPage />} />
                </Route>

                {/* WhatsApp admin console — visible only to the `adminr` login user. */}
                <Route element={<PrivateRoute requireAdminr />}>
                  <Route path="/whatsapp-admin" element={<WhatsAppAdminPage />} />
                </Route>

                {/* Accessible to both admins and agents (PrivateRoute without
                    `allowedAdmin` skips the role check). */}
                <Route element={<PrivateRoute />}>
                  <Route path="/agent-mail"      element={<AgentMailPage />} />
                  <Route path="/reporting"       element={<ReportingPage />} />
                  <Route path="/lead-management" element={<LeadManagementPage />} />
                  <Route path="/wa-api"          element={<WaApiExplorerPage />} />
                  {/* WhatsApp console — same component; scopes to the agent's own
                      conversations for non-admins, full feed for admins. */}
                  <Route path="/whatsapp"        element={<WhatsAppAdminPage />} />
                </Route>

                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
