import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import DarkModeToggle from './DarkModeToggle';

interface TopNavbarProps {
  onMenuClick: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ onMenuClick }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="ml-2 lg:ml-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center space-x-3">
        {/* Dark mode toggle */}
        <DarkModeToggle />
      </div>
    </header>
  );
};

export default TopNavbar;