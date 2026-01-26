import { FC, useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BrainCog,
  LogOut,
  BarChart2,
  Users,
  Building2,
  UserCircle,
  ListChecks,
  Settings,
  ChevronDown,
  Home as HomeIcon,
  ShoppingBag,
  FileText,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { logout as serviceLogout } from "../services/authService";
import agentLogo from "../assets/agentlogo.png";
import DarkModeToggle from "./DarkModeToggle";

const Navbar: FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, selectedCompanyId } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    serviceLogout();
    setIsProfileOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const commonLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `relative px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out flex items-center rounded-lg group nav-link-transition ` +
    (isActive
      ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-sm border-l-2 border-primary-600 dark:border-primary-400"
      : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm");

  const commonMobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-base font-medium rounded-xl flex items-center transition-all duration-200 nav-link-transition ` +
    (isActive
      ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-soft border-l-4 border-primary-600 dark:border-primary-400"
      : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700");

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 z-50 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center group">
              <div className="relative">
                <img
                  src={agentLogo}
                  alt="Agent Logo"
                  className="h-8 w-auto transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-accent-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur"></div>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-2 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent group-hover:from-primary-500 group-hover:to-accent-500 transition-all duration-200">
                AI Support Agent
              </span>
            </NavLink>
          </div>

          <div className="hidden md:flex items-center">
            <div className="flex space-x-4">
              {!isAuthenticated ? (
                <>
                  <NavLink to="/" className={commonLinkClasses} end>
                    <HomeIcon className="h-4 w-4 mr-1" /> Home
                  </NavLink>
                  <NavLink to="/product" className={commonLinkClasses}>
                    <ShoppingBag className="h-4 w-4 mr-1" /> Product
                  </NavLink>
                  <NavLink to="/company" className={commonLinkClasses}>
                    <Building2 className="h-4 w-4 mr-1" /> Company Details
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/product" className={commonLinkClasses}>
                    <ShoppingBag className="h-4 w-4 mr-1" /> Product
                  </NavLink>

                  {user?.role === "superAdmin" && (
                    <>
                      <NavLink
                        to="/admin/select-company"
                        className={commonLinkClasses}
                        end
                      >
                        <Building2 className="h-4 w-4 mr-1" /> Select Company
                      </NavLink>
                      {selectedCompanyId && (
                        <NavLink
                          to="/admin/company-dashboard"
                          className={commonLinkClasses}
                          end
                        >
                          <BarChart2 className="h-4 w-4 mr-1" /> Company
                          Dashboard
                        </NavLink>
                      )}
                    </>
                  )}
                  {user?.role === "admin" && (
                    <>
                      <NavLink
                        to="/admin/analytics-dashboard"
                        className={commonLinkClasses}
                        end
                      >
                        <BarChart2 className="h-4 w-4 mr-1" /> Dashboard
                      </NavLink>
                      <NavLink to="/admin/team" className={commonLinkClasses}>
                        <Users className="h-4 w-4 mr-1" /> Team Management
                      </NavLink>
                      <NavLink to="/tickets" className={commonLinkClasses}>
                        <ListChecks className="h-4 w-4 mr-1" /> Tickets
                      </NavLink>
                      <NavLink
                        to="/admin/documentation"
                        className={commonLinkClasses}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Documentation
                      </NavLink>
                    </>
                  )}
                  {user?.role === "superAdmin" && (
                    <NavLink
                      to="/admin/documentation"
                      className={commonLinkClasses}
                    >
                      <FileText className="h-4 w-4 mr-1" /> Documentation
                    </NavLink>
                  )}
                  {user?.role === "employee" && (
                    <>
                      <NavLink
                        to="/employee/dashboard"
                        className={commonLinkClasses}
                        end
                      >
                        <UserCircle className="h-4 w-4 mr-1" /> My Dashboard
                      </NavLink>
                      <NavLink to="/tickets" className={commonLinkClasses}>
                        <ListChecks className="h-4 w-4 mr-1" /> Tickets
                      </NavLink>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3" ref={profileRef}>
            {/* Dark mode toggle */}
            <DarkModeToggle />
            
            {/* Mobile menu button for non-authenticated users */}
            {!isAuthenticated && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {!isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate("/login")}
                  className="btn-ghost px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="btn-primary px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <>
                {user && (
                  <button
                    onClick={toggleProfile}
                    className="flex items-center p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 focus-ring transition-all duration-200 group"
                    aria-label="User menu"
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-white" />
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-600 dark:text-gray-400 ml-2 transition-transform duration-200 ${
                        isProfileOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
                {isProfileOpen && user && (
                  <div
                    className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-large border border-gray-200 dark:border-gray-700 py-2 z-50 animate-slide-down"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.role}
                      </p>
                    </div>
                    <NavLink
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" />
                      View Profile
                    </NavLink>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu for both authenticated and non-authenticated users */}
      <div className={`md:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md max-h-96 overflow-y-auto ${
        (!isAuthenticated && !isMobileMenuOpen) ? 'hidden' : ''
      }`}>
        <div className="px-4 py-6 space-y-2">
          {!isAuthenticated ? (
            <>
              <NavLink to="/" className={commonMobileLinkClasses} end>
                <HomeIcon className="h-5 w-5 mr-2" /> Home
              </NavLink>
              <NavLink to="/product" className={commonMobileLinkClasses}>
                <ShoppingBag className="h-5 w-5 mr-2" /> Product
              </NavLink>
              <NavLink to="/company" className={commonMobileLinkClasses}>
                <Building2 className="h-5 w-5 mr-2" /> Company Details
              </NavLink>
            </>
          ) : (
            <>
              {/* Mobile hamburger menu icon */}
              <button className="flex items-center w-full px-4 py-3 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 md:hidden">
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Menu
              </button>
              <NavLink to="/product" className={commonMobileLinkClasses}>
                <ShoppingBag className="h-5 w-5 mr-2" /> Product
              </NavLink>

              {user?.role === "superAdmin" && (
                <>
                  <NavLink
                    to="/admin/select-company"
                    className={commonMobileLinkClasses}
                    end
                  >
                    <Building2 className="h-5 w-5 mr-2" /> Select Company
                  </NavLink>
                  {selectedCompanyId && (
                    <NavLink
                      to="/admin/company-dashboard"
                      className={commonMobileLinkClasses}
                      end
                    >
                      <BarChart2 className="h-5 w-5 mr-2" /> Company Dashboard
                    </NavLink>
                  )}
                </>
              )}
              {user?.role === "admin" && (
                <>
                  <NavLink
                    to="/admin/analytics-dashboard"
                    className={commonMobileLinkClasses}
                    end
                  >
                    <BarChart2 className="h-5 w-5 mr-2" /> Dashboard
                  </NavLink>
                  <NavLink to="/admin/team" className={commonMobileLinkClasses}>
                    <Users className="h-5 w-5 mr-2" /> Team Management
                  </NavLink>
                  <NavLink to="/tickets" className={commonMobileLinkClasses}>
                    <ListChecks className="h-5 w-5 mr-2" /> Tickets
                  </NavLink>
                  <NavLink
                    to="/admin/documentation"
                    className={commonMobileLinkClasses}
                  >
                    <FileText className="h-5 w-5 mr-2" /> Documentation
                  </NavLink>
                </>
              )}
              {user?.role === "superAdmin" && (
                <NavLink
                  to="/admin/documentation"
                  className={commonMobileLinkClasses}
                >
                  <FileText className="h-5 w-5 mr-2" /> Documentation
                </NavLink>
              )}
              {user?.role === "employee" && (
                <>
                  <NavLink
                    to="/employee/dashboard"
                    className={commonMobileLinkClasses}
                    end
                  >
                    <UserCircle className="h-5 w-5 mr-2" /> My Dashboard
                  </NavLink>
                  <NavLink to="/tickets" className={commonMobileLinkClasses}>
                    <ListChecks className="h-5 w-5 mr-2" /> Tickets
                  </NavLink>
                </>
              )}
            </>
          )}
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-base font-medium rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
            >
              <LogOut className="h-5 w-5 mr-3" /> Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;