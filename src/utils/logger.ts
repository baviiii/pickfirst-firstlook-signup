/**
 * Production-safe logging utility
 * Automatically removes logs in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Debug logs - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment || this.isTest) {
      console.log(`🔧 [DEBUG] ${message}`, context ? context : '');
    }
  }

  /**
   * Info logs - shown in development, suppressed in production
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment || this.isTest) {
      console.log(`ℹ️ [INFO] ${message}`, context ? context : '');
    }
  }

  /**
   * Warning logs - shown in all environments but sanitized in production
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment || this.isTest) {
      console.warn(`⚠️ [WARN] ${message}`, context ? context : '');
    } else {
      // In production, only log generic warnings without sensitive data
      console.warn(`⚠️ [WARN] ${message}`);
    }
  }

  /**
   * Error logs - always shown but sanitized in production
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.isDevelopment || this.isTest) {
      console.error(`❌ [ERROR] ${message}`, error, context ? context : '');
    } else {
      // In production, log errors but without sensitive context
      console.error(`❌ [ERROR] ${message}`, error?.message || 'An error occurred');
      
      // Send to error tracking service in production
      this.sendToErrorTracking(message, error, context);
    }
  }

  /**
   * Performance logging for optimization
   */
  performance(label: string, startTime?: number): void {
    if (this.isDevelopment || this.isTest) {
      if (startTime) {
        const duration = performance.now() - startTime;
        console.log(`⏱️ [PERF] ${label}: ${duration.toFixed(2)}ms`);
      } else {
        console.time(`⏱️ [PERF] ${label}`);
      }
    }
  }

  /**
   * API request/response logging
   */
  api(method: string, url: string, status?: number, duration?: number): void {
    if (this.isDevelopment || this.isTest) {
      const statusEmoji = status && status >= 400 ? '❌' : '✅';
      const durationText = duration ? ` (${duration}ms)` : '';
      console.log(`🌐 [API] ${statusEmoji} ${method} ${url}${durationText}`);
    }
  }

  /**
   * User action tracking (sanitized for production)
   */
  userAction(action: string, userId?: string, metadata?: any): void {
    if (this.isDevelopment || this.isTest) {
      console.log(`👤 [USER] ${action}`, { userId, metadata });
    }
    // In production, send to analytics without logging to console
  }

  /**
   * Security-related logging
   */
  security(event: string, context?: LogContext): void {
    if (this.isDevelopment || this.isTest) {
      console.warn(`🔒 [SECURITY] ${event}`, context);
    } else {
      // Always log security events but without sensitive data
      console.warn(`🔒 [SECURITY] ${event}`);
      this.sendToSecurityMonitoring(event, context);
    }
  }

  /**
   * Send errors to external tracking service in production
   */
  private sendToErrorTracking(message: string, error?: any, context?: LogContext): void {
    // TODO: Integrate with Sentry, LogRocket, or similar service
    // Example:
    // Sentry.captureException(error, { extra: { message, context } });
  }

  /**
   * Send security events to monitoring service
   */
  private sendToSecurityMonitoring(event: string, context?: LogContext): void {
    // TODO: Send to security monitoring service
    // Example: Send to SIEM, security dashboard, etc.
  }

  /**
   * Completely remove all console logs (for production builds)
   */
  static stripAllLogs(): void {
    if (typeof window !== 'undefined' && !import.meta.env.DEV) {
      // Override console methods in production
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
      console.warn = () => {};
      // Keep console.error for critical issues
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Auto-strip logs in production
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  Logger.stripAllLogs();
}

export default logger;
