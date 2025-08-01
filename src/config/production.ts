// Production configuration for audit system
export const productionConfig = {
  // Audit system settings
  audit: {
    // Enable enhanced logging in production
    enhancedLogging: true,
    // Enable IP detection
    ipDetection: true,
    // Enable user context caching
    userContextCaching: true,
    // Batch size for audit logs
    batchSize: 10,
    // Flush interval in milliseconds
    flushInterval: 5000,
    // Maximum queue size before forced flush
    maxQueueSize: 50,
  },

  // Rate limiting settings
  rateLimiting: {
    // Enable rate limiting in production
    enabled: true,
    // Default limits
    defaults: {
      'db:read': { requests: 50, window: 60000 }, // 50 requests per minute
      'client:create': { requests: 20, window: 60000 }, // 20 requests per minute
      'client:delete': { requests: 10, window: 60000 }, // 10 requests per minute
      'client:search': { requests: 30, window: 60000 }, // 30 requests per minute
      'admin:users:view': { requests: 10, window: 60000 }, // 10 requests per minute
      'admin:users:delete': { requests: 5, window: 60000 }, // 5 requests per minute
    },
  },

  // Security settings
  security: {
    // Enable error boundaries
    errorBoundaries: true,
    // Enable input validation
    inputValidation: true,
    // Enable input sanitization
    inputSanitization: true,
    // Enable audit logging for all actions
    auditAllActions: true,
  },

  // IP detection settings
  ipDetection: {
    // Enable real IP detection
    enabled: true,
    // Fallback IP services
    fallbackServices: [
      'https://api.ipify.org?format=json',
      'https://api.myip.com',
    ],
    // Timeout for IP detection requests
    timeout: 5000,
  },

  // User context settings
  userContext: {
    // Enable user context caching
    caching: true,
    // Cache duration in milliseconds
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    // Enable session tracking
    sessionTracking: true,
  },
};

// Environment-specific overrides
export const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isProduction) {
    return {
      ...productionConfig,
      audit: {
        ...productionConfig.audit,
        enhancedLogging: true,
        ipDetection: true,
      },
    };
  }
  
  if (isDevelopment) {
    return {
      ...productionConfig,
      audit: {
        ...productionConfig.audit,
        enhancedLogging: true,
        ipDetection: true,
        batchSize: 5, // Smaller batches for development
        flushInterval: 2000, // Faster flushing for development
      },
      rateLimiting: {
        ...productionConfig.rateLimiting,
        enabled: true, // Keep rate limiting in development
      },
    };
  }
  
  return productionConfig;
};

export default getConfig(); 