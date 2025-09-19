/**
 * Production-grade input sanitization and validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class InputSanitizer {
  // Email validation with comprehensive checks
  static validateEmail(email: string): ValidationResult {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }

    // Sanitize: trim whitespace and convert to lowercase
    const sanitized = email.trim().toLowerCase();

    // Check length limits
    if (sanitized.length > 254) {
      return { isValid: false, error: 'Email address too long' };
    }

    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitized)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  // Password validation with security requirements
  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }

    // Check minimum length
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    // Check maximum length (prevent DoS)
    if (password.length > 128) {
      return { isValid: false, error: 'Password too long (max 128 characters)' };
    }

    // Check for required character types
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasLowercase) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!hasUppercase) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!hasNumbers) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    // Check for common weak passwords
    if (this.isCommonPassword(password)) {
      return { isValid: false, error: 'Password is too common, please choose a stronger password' };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(password)) {
      return { isValid: false, error: 'Password contains invalid characters' };
    }

    return { isValid: true, sanitizedValue: password };
  }

  // Sanitize user input for display/storage
  static sanitizeText(input: string, maxLength: number = 1000): ValidationResult {
    if (!input) {
      return { isValid: true, sanitizedValue: '' };
    }

    // Remove null bytes and control characters except newlines/tabs
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > maxLength) {
      return { isValid: false, error: `Input too long (max ${maxLength} characters)` };
    }

    // Check for script injection patterns
    if (this.containsScriptInjection(sanitized)) {
      return { isValid: false, error: 'Input contains invalid content' };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  // Check for suspicious patterns (injection attempts, etc.)
  private static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<script/i,
      /on\w+=/i,
      /\bexec\b/i,
      /\bunion\b.*\bselect\b/i,
      /\bdrop\b.*\btable\b/i,
      /'.*or.*'.*='/i,
      /--/,
      /\/\*/,
      /\*\//
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  // Check for script injection patterns
  private static containsScriptInjection(input: string): boolean {
    const scriptPatterns = [
      /<script/i,
      /<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    return scriptPatterns.some(pattern => pattern.test(input));
  }

  // Check against common password list
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', '12345678', '12345',
      'password123', 'admin', 'qwerty', 'abc123', 'Password1',
      'welcome', 'monkey', 'dragon', 'letmein', 'trustno1',
      'sunshine', 'master', 'hello', 'freedom', 'whatever',
      'qazwsx', '123123', 'football', 'baseball', 'welcome123'
    ];

    const lowerPassword = password.toLowerCase();
    return commonPasswords.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    );
  }

  // Validate URL parameters for security
  static validateUrlParam(param: string, paramName: string): ValidationResult {
    if (!param) {
      return { isValid: false, error: `${paramName} is required` };
    }

    // Check for suspicious patterns in URL parameters
    if (this.containsSuspiciousPatterns(param)) {
      return { isValid: false, error: `Invalid ${paramName} format` };
    }

    // Specific validation for tokens (should be base64-like)
    if (paramName.includes('token')) {
      const tokenRegex = /^[A-Za-z0-9+/=_-]+$/;
      if (!tokenRegex.test(param)) {
        return { isValid: false, error: 'Invalid token format' };
      }
    }

    return { isValid: true, sanitizedValue: param };
  }

  // Rate limiting validation
  static validateRateLimit(attempts: number, maxAttempts: number, timeWindow: string): ValidationResult {
    if (attempts >= maxAttempts) {
      return { 
        isValid: false, 
        error: `Too many attempts. Please try again later (${timeWindow}).` 
      };
    }

    return { isValid: true };
  }
}