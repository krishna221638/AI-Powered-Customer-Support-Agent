import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Users,
  Building2,
  UserCircle,
  ListChecks,
  Settings,
  FileText,
  ShoppingBag,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { logout as serviceLogout } from '../services/authService';
import agentLogo from '../assets/agentlogo.png';
import DarkModeToggle from './DarkModeToggle';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, selectedCompanyId } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = () => {
    serviceLogout();
    onClose();
  };

  const commonLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `relative px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out flex items-center rounded-lg group nav-link-transition w-full ` +
    (isActive
      ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-sm border-l-2 border-primary-600 dark:border-primary-400"
      : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="relative">
                <img
                  src={agentLogo}
                  alt="Agent Logo"
                  className="h-8 w-auto transition-transform duration-200"
                />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">
                AI Support
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {user?.role === "superAdmin" && (
              <>
                <NavLink
                  to="/admin/select-company"
                  className={commonLinkClasses}
                  end
                >
                  <BarChart2 className="h-5 w-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink
                  to="/admin/select-company"
                  className={commonLinkClasses}
                >
                  <Building2 className="h-5 w-5 mr-3" /> Select Company
                </NavLink>
                {selectedCompanyId && (
                  <NavLink
                    to="/admin/company-dashboard"
                    className={commonLinkClasses}
                    end
                  >
                    <BarChart2 className="h-5 w-5 mr-3" /> Company Analytics
                  </NavLink>
                )}
                <NavLink
                  to="/admin/documentation"
                  className={commonLinkClasses}
                >
                  <FileText className="h-5 w-5 mr-3" /> Documentation
                </NavLink>
              </>
            )}

            {user?.role === "admin" && (
              <>
                <NavLink
                  to="/admin/analytics-dashboard"
                  className={commonLinkClasses}
                  end
                >
                  <BarChart2 className="h-5 w-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink to="/admin/team" className={commonLinkClasses}>
                  <Users className="h-5 w-5 mr-3" /> Team Management
                </NavLink>
                <NavLink to="/tickets" className={commonLinkClasses}>
                  <ListChecks className="h-5 w-5 mr-3" /> Tickets
                </NavLink>
                <NavLink
                  to="/admin/documentation"
                  className={commonLinkClasses}
                >
                  <FileText className="h-5 w-5 mr-3" /> Documentation
                </NavLink>
              </>
            )}

            {user?.role === "employee" && (
              <>
                <NavLink
                  to="/employee/dashboard"
                  className={commonLinkClasses}
                  end
                >
                  <BarChart2 className="h-5 w-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink to="/tickets" className={commonLinkClasses}>
                  <ListChecks className="h-5 w-5 mr-3" /> Tickets
                </NavLink>
              </>
            )}
            
            <NavLink to="/product" className={commonLinkClasses}>
              <ShoppingBag className="h-5 w-5 mr-3" /> Product
            </NavLink>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
              <DarkModeToggle />
            </div>

            {/* User info and actions */}
            {user && (
              <>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.role}
                    </p>
                  </div>
                </div>

                <NavLink
                  to="/profile"
                  onClick={onClose}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Profile Settings
                </NavLink>

                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;