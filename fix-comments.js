#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
// Fix comments in JavaScript files to match .cursorrules style
//
function fixComments(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    //
    // Skip JSDoc comments (/** ... */)
    //
    if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
      result.push(line);
      continue;
    }
    
    //
    // Fix single-line // comments that are not wrapped
    // Skip if it's already a wrapped comment (just //)
    // Skip if it's an inline comment (code on the same line)
    //
    if (trimmed.startsWith('//') && trimmed.length > 2) {
      //
      // Check if previous line exists and is not empty
      //
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      const needsTopWrapper = prevLine !== '' && prevLine !== '//';
      
      //
      // Check if next line is also a comment or empty
      //
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      const isNextComment = nextLine.startsWith('//');
      const needsBottomWrapper = !isNextComment && nextLine !== '';
      
      if (needsTopWrapper) {
        result.push(line.replace(trimmed, '//'));
      }
      result.push(line);
      if (needsBottomWrapper) {
        result.push(line.replace(trimmed, '//'));
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

//
// Process all .js files in src directory
//
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const fixed = fixComments(content);
        
        if (content !== fixed) {
          fs.writeFileSync(fullPath, fixed, 'utf8');
          console.log(`Fixed: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

const srcDir = path.join(__dirname, 'src');
console.log('Fixing comments in all JavaScript files...');
processDirectory(srcDir);
console.log('Done!');

