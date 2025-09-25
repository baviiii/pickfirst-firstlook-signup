import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { InputSanitizer } from '@/utils/inputSanitization';
import { rateLimitService } from '@/services/rateLimitService';
import { ipTrackingService } from '@/services/ipTrackingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageSecurityWrapperProps {
  children: ReactNode;
  feature: string;
  action: 'send_message' | 'create_conversation' | 'view_messages';
  onSecurityViolation?: () => void;
}

export const MessageSecurityWrapper = ({ 
  children, 
  feature, 
  action, 
  onSecurityViolation 
}: MessageSecurityWrapperProps) => {
  const { user, profile } = useAuth();
  const { isFeatureEnabled } = useSubscription();
  const [isSecurityChecked, setIsSecurityChecked] = useState(false);
  const [securityPassed, setSecurityPassed] = useState(false);

  useEffect(() => {
    const performSecurityChecks = async () => {
      if (!user) {
        setSecurityPassed(false);
        setIsSecurityChecked(true);
        return;
      }

      try {
        // 1. Feature access validation
        if (!isFeatureEnabled(feature)) {
          await logSecurityEvent('FEATURE_ACCESS_DENIED', {
            feature,
            action,
            reason: 'Feature not enabled for user tier'
          });
          setSecurityPassed(false);
          setIsSecurityChecked(true);
          return;
        }

        // 2. Rate limiting check
        const rateLimitKey = `messaging_${action}_${user.id}`;
        const rateLimitResult = await rateLimitService.checkRateLimit(
          user.id,
          `messaging_${action}`
        );

        if (!rateLimitResult.allowed) {
          await logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            feature,
            action,
            reason: 'Rate limit exceeded for messaging action',
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          });
          toast.error('Too many requests. Please wait before trying again.');
          onSecurityViolation?.();
          setSecurityPassed(false);
          setIsSecurityChecked(true);
          return;
        }

        // 3. User authentication and profile validation
        if (!profile || profile.role !== 'buyer') {
          await logSecurityEvent('INVALID_USER_ROLE', {
            feature,
            action,
            reason: 'User role not authorized for messaging'
          });
          setSecurityPassed(false);
          setIsSecurityChecked(true);
          return;
        }

        // 4. IP tracking and suspicious activity detection
        const clientInfo = await ipTrackingService.getClientInfo();
        const clientIP = clientInfo?.ip || 'unknown';
        const suspiciousActivity = await checkSuspiciousActivity(user.id, clientIP);
        
        if (suspiciousActivity) {
          await logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', {
            feature,
            action,
            reason: 'Suspicious messaging activity detected',
            ip_address: clientIP
          });
          toast.error('Security check failed. Please contact support if this continues.');
          onSecurityViolation?.();
          setSecurityPassed(false);
          setIsSecurityChecked(true);
          return;
        }

        // All security checks passed
        setSecurityPassed(true);
        setIsSecurityChecked(true);

      } catch (error) {
        console.error('Security check failed:', error);
        await logSecurityEvent('SECURITY_CHECK_ERROR', {
          feature,
          action,
          reason: 'Security validation error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        setSecurityPassed(false);
        setIsSecurityChecked(true);
      }
    };

    performSecurityChecks();
  }, [user, profile, feature, action, isFeatureEnabled]);

  const logSecurityEvent = async (eventType: string, details: any) => {
    try {
      const clientInfo = await ipTrackingService.getClientInfo();
      const clientIP = clientInfo?.ip || 'unknown';
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        action: eventType,
        table_name: 'messaging_security',
        user_agent: navigator.userAgent,
        ip_address: clientIP,
        new_values: {
          ...details,
          timestamp: new Date().toISOString(),
          user_role: profile?.role || 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const checkSuspiciousActivity = async (userId: string, ipAddress: string): Promise<boolean> => {
    try {
      // Check for rapid messaging attempts from different IPs
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('ip_address, created_at')
        .eq('user_id', userId)
        .eq('table_name', 'messaging_security')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentActivity && recentActivity.length > 5) {
        const uniqueIPs = new Set(recentActivity.map(log => log.ip_address));
        if (uniqueIPs.size > 2) {
          return true; // Multiple IPs in short time frame
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return false;
    }
  };

  // Show loading state during security checks
  if (!isSecurityChecked) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Validating access...</span>
      </div>
    );
  }

  // Security checks failed
  if (!securityPassed) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="text-destructive text-sm font-medium">Access Denied</div>
          <div className="text-muted-foreground text-xs">
            Security validation failed for this messaging feature.
          </div>
        </div>
      </div>
    );
  }

  // Security checks passed, render children
  return <>{children}</>;
};

// Enhanced message input sanitizer for messaging
export const sanitizeMessageContent = (content: string): { isValid: boolean; sanitized: string; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic validation
  if (!content || content.trim().length === 0) {
    errors.push('Message cannot be empty');
    return { isValid: false, sanitized: '', errors };
  }

  if (content.length > 2000) {
    errors.push('Message too long (max 2000 characters)');
    return { isValid: false, sanitized: content, errors };
  }

  // Use existing InputSanitizer for comprehensive validation
  const sanitizationResult = InputSanitizer.sanitizeText(content, 2000);
  
  if (!sanitizationResult.isValid) {
    errors.push(sanitizationResult.error || 'Invalid content');
    return { isValid: false, sanitized: content, errors };
  }

  // Additional messaging-specific checks
  const suspiciousPatterns = [
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?/g, // URLs
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card patterns
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      errors.push('Message contains potentially sensitive information');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized: sanitizationResult.sanitizedValue || content,
    errors
  };
};
