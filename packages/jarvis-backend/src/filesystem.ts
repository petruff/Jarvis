
import fs from 'fs';
import path from 'path';

/**
 * Safely list files in a directory.
 * Restricted to non-system critical paths if needed, but for now open.
 */
export const listFiles = (dirPath: string) => {
    try {
        const fullPath = path.resolve(dirPath);
        if (!fs.existsSync(fullPath)) {
            return `Error: Directory ${fullPath} does not exist.`;
        }

        const items = fs.readdirSync(fullPath, { withFileTypes: true });
        return items.map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`).join('\n');
    } catch (e: any) {
        return `Error listing directory: ${e.message}`;
    }
};

/**
 * Safely read a text file.
 * formatting: Returns content or error message.
 */
export const readFile = (filePath: string) => {
    try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath)) {
            return `Error: File ${fullPath} does not exist.`;
        }

        // Check stats to avoid reading huge files
        const stats = fs.statSync(fullPath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
            return `Error: File is too large to read (Limit: 10MB).`;
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        return content;
    } catch (e: any) {
        return `Error reading file: ${e.message}`;
    }
};

/**
 * Safely write to a text file.
 * formatting: Returns success message or error.
 */
export const writeFile = (filePath: string, content: string) => {
    try {
        const fullPath = path.resolve(filePath);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        return `Success: Wrote ${content.length} bytes to ${fullPath}`;
    } catch (e: any) {
        return `Error writing file: ${e.message}`;
    }
};
