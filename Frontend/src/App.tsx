import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import TopNavbar from "./components/TopNavbar";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import CompanyDetailsPage from "./pages/CompanyDetailsPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import SelectCompanyPage from "./pages/admin/SelectCompanyPage";
import CompanyDashboard from "./pages/admin/CompanyDashboard";
import AdminAnalyticsDashboardPage from "./pages/admin/AdminAnalyticsDashboardPage";
import AdminTeamManagementPage from "./pages/admin/AdminTeamManagementPage";
import AllTicketsPage from "./pages/AllTicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import ProfilePage from "./pages/ProfilePage";
import DummyCreateTicketPage from "./pages/admin/DummyCreateTicketPage";
import AdminDocsPage from "./pages/admin/AdminDocsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./stores/authStore";
import { refreshToken, isTokenValid } from "./services/authService";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Check if current route should use sidebar layout
  const shouldUseSidebar =
    isAuthenticated && !["/login", "/signup", "/"].includes(location.pathname);

  useEffect(() => {
    const attemptRehydrate = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        if (isTokenValid()) {
          try {
            const refreshedUserData = await refreshToken();
            if (refreshedUserData) {
              if (!refreshedUserData.role) {
                console.error(
                  "App.tsx (attemptRehydrate): User data refreshed, but ROLE IS MISSING. Logging out.",
                  JSON.parse(JSON.stringify(refreshedUserData))
                );
                useAuthStore.getState().clearAuth();
                localStorage.removeItem("token");
              } else {
                useAuthStore.getState().setUser(refreshedUserData);
                useAuthStore.getState().setIsAuthenticated(true);

                if (refreshedUserData.role === "superAdmin") {
                  useAuthStore.getState().setSelectedCompanyId(null);
                } else if (
                  refreshedUserData.role === "admin" ||
                  refreshedUserData.role === "employee"
                ) {
                  if (typeof refreshedUserData.company_id !== "undefined") {
                    useAuthStore
                      .getState()
                      .setSelectedCompanyId(refreshedUserData.company_id);
                  } else {
                    console.warn(
                      "App.tsx (attemptRehydrate): User refreshed but company_id is missing for admin/employee role. Clearing selectedCompanyId."
                    );
                    useAuthStore.getState().setSelectedCompanyId(null);
                  }
                }
              }
            } else {
              console.log(
                "App.tsx (attemptRehydrate): refreshToken returned null or undefined. Clearing auth."
              );
              useAuthStore.getState().clearAuth();
              localStorage.removeItem("token");
            }
          } catch (error) {
            console.error("Failed to rehydrate session:", error);
            useAuthStore.getState().clearAuth();
            localStorage.removeItem("token");
          }
        } else {
          useAuthStore.getState().clearAuth();
          localStorage.removeItem("token");
        }
      } else {
        if (isAuthenticated) {
          useAuthStore.getState().clearAuth();
        }
      }
      setIsInitializing(false);
    };

    if (!isAuthenticated) {
      attemptRehydrate();
    } else {
      setIsInitializing(false);
    }
  }, [isAuthenticated]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          Loading application...
        </p>
      </div>
    );
  }

  if (shouldUseSidebar) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col lg:ml-64">
          <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <div className="w-10"></div>
          </div>
          <main className="flex-1 bg-gray-50 dark:bg-gray-800/50 overflow-auto">
            <ScrollToTop />
            <div className="page-transition" key={location.pathname}>
              <Routes>
                {/* Authenticated User Routes */}
                <Route
                  path="/tickets"
                  element={
                    <ProtectedRoute role={["admin", "employee"]}>
                      <AllTicketsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ticket/:ticketId"
                  element={
                    <ProtectedRoute role={["admin", "employee"]}>
                      <TicketDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/select-company"
                  element={
                    <ProtectedRoute role="superAdmin">
                      <SelectCompanyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/company-dashboard"
                  element={
                    <ProtectedRoute role="superAdmin">
                      <CompanyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics-dashboard"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminAnalyticsDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee/dashboard"
                  element={
                    <ProtectedRoute role="employee">
                      <AdminAnalyticsDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/team"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminTeamManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dummy-create-ticket"
                  element={
                    <ProtectedRoute role={["admin", "superAdmin"]}>
                      <DummyCreateTicketPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/documentation"
                  element={
                    <ProtectedRoute role={["admin", "superAdmin"]}>
                      <AdminDocsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/product" element={<ProductPage />} />
                <Route path="/company" element={<CompanyDetailsPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-800/50 page-container">
      <Navbar />
      <main className="flex-grow bg-white dark:bg-gray-800/50 pt-16">
        <ScrollToTop />
        <div className="page-transition" key={location.pathname}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/company" element={<CompanyDetailsPage />} />
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
