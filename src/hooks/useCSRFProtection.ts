/**
 * React hook for CSRF protection
 * Automatically generates and manages CSRF tokens for forms
 */

import { useState, useEffect } from 'react';
import { SecurityHeaders } from '@/utils/securityHeaders';

interface CSRFProtection {
  token: string;
  isValid: boolean;
  regenerate: () => void;
}

export const useCSRFProtection = (): CSRFProtection => {
  const [token, setToken] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');

  // Generate initial token on mount
  useEffect(() => {
    regenerateToken();
  }, []);

  const regenerateToken = () => {
    const newToken = SecurityHeaders.generateCSRFToken();
    setToken(newToken);
    setSessionToken(newToken);
    
    // Store in session storage for validation
    sessionStorage.setItem('csrf_token', newToken);
  };

  const isValid = token === sessionToken && token.length === 64;

  return {
    token,
    isValid,
    regenerate: regenerateToken
  };
};

/**
 * Validate CSRF token from form submission
 */
export const validateCSRFToken = (submittedToken: string): boolean => {
  const sessionToken = sessionStorage.getItem('csrf_token');
  
  if (!sessionToken || !submittedToken) {
    return false;
  }

  return SecurityHeaders.validateCSRFToken(submittedToken, sessionToken);
};
