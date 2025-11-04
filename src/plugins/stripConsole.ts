/**
 * Vite plugin to strip console logs in production builds
 */
import type { Plugin } from 'vite';

export function stripConsolePlugin(): Plugin {
  return {
    name: 'strip-console',
    transform(code: string, id: string) {
      // Only apply in production builds
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }

      // Skip node_modules and test files
      if (id.includes('node_modules') || id.includes('.test.') || id.includes('.spec.')) {
        return null;
      }

      // Remove console statements but keep console.error for critical issues
      const strippedCode = code
        .replace(/console\.log\([^)]*\);?/g, '')
        .replace(/console\.debug\([^)]*\);?/g, '')
        .replace(/console\.info\([^)]*\);?/g, '')
        .replace(/console\.warn\([^)]*\);?/g, '')
        // Keep console.error but make it conditional
        .replace(/console\.error\(/g, 'if (import.meta.env.DEV) console.error(');

      return {
        code: strippedCode,
        map: null
      };
    }
  };
}
