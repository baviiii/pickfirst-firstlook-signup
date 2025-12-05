import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';

type ViewMode = 'agent' | 'buyer';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  canSwitchToBuyer: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Initialize from localStorage or default based on role
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('viewMode') as ViewMode;
      if (saved && (saved === 'agent' || saved === 'buyer')) {
        return saved;
      }
    }
    // Default to agent if user is an agent, otherwise buyer
    return profile?.role === 'agent' ? 'agent' : 'buyer';
  });

  // Update view mode when profile changes
  useEffect(() => {
    if (profile?.role === 'agent') {
      // Agents can switch between modes
      const saved = localStorage.getItem('viewMode') as ViewMode;
      if (saved && (saved === 'agent' || saved === 'buyer')) {
        setViewModeState(saved);
      } else {
        setViewModeState('agent');
      }
    } else {
      // Non-agents are always in buyer mode
      setViewModeState('buyer');
    }
  }, [profile?.role]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('viewMode', mode);
    }
  };

  const toggleViewMode = () => {
    if (canSwitchToBuyer) {
      const newMode = viewMode === 'agent' ? 'buyer' : 'agent';
      setViewMode(newMode);
      // Full page reload and redirect to dashboard to refresh everything
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    }
  };

  const canSwitchToBuyer = profile?.role === 'agent';

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode, canSwitchToBuyer }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

