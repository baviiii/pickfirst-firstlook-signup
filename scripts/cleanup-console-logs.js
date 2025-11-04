#!/usr/bin/env node

/**
 * Script to replace console.log statements with production-safe logger
 * This will help secure the application by removing sensitive console logs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];
const DRY_RUN = process.argv.includes('--dry-run');

// Patterns to replace
const REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    needsImport: true
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    needsImport: true
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    needsImport: true
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    needsImport: true
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    needsImport: true
  }
];

// Files to exclude (test files, debug utilities, etc.)
const EXCLUDE_PATTERNS = [
  '**/test/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/debug*.ts',
  '**/test*.ts',
  '**/utils/logger.ts' // Don't modify the logger itself
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    const fullPattern = path.join(SRC_DIR, pattern);
    return filePath.match(fullPattern.replace(/\*/g, '.*'));
  });
}

function addLoggerImport(content, filePath) {
  // Check if logger import already exists
  if (content.includes('from \'@/utils/logger\'') || content.includes('from "@/utils/logger"')) {
    return content;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('type ')) {
      lastImportIndex = i;
    }
  }

  // Add logger import after the last import
  const loggerImport = "import { logger } from '@/utils/logger';";
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // No imports found, add at the top
    lines.unshift(loggerImport);
  }

  return lines.join('\n');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let needsLoggerImport = false;

    // Apply replacements
    REPLACEMENTS.forEach(({ pattern, replacement, needsImport }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        if (needsImport) {
          needsLoggerImport = true;
        }
      }
    });

    // Add logger import if needed
    if (needsLoggerImport && modified) {
      content = addLoggerImport(content, filePath);
    }

    if (modified) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would modify: ${filePath}`);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Modified: ${filePath}`);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Cleaning up console logs...\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Find all TypeScript/JavaScript files
  const patterns = EXTENSIONS.map(ext => `${SRC_DIR}/**/*.${ext}`);
  let allFiles = [];
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern);
    allFiles = allFiles.concat(files);
  });

  // Filter out excluded files
  const filesToProcess = allFiles.filter(file => !shouldExcludeFile(file));
  
  console.log(`📁 Found ${filesToProcess.length} files to process\n`);

  let modifiedCount = 0;
  let errorCount = 0;

  filesToProcess.forEach(filePath => {
    try {
      if (processFile(filePath)) {
        modifiedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error.message);
      errorCount++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`✅ Files processed: ${filesToProcess.length}`);
  console.log(`🔧 Files modified: ${modifiedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n🎉 Console log cleanup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes with git diff');
    console.log('2. Test your application');
    console.log('3. Commit the changes');
  }
}

// Run the script
main();
