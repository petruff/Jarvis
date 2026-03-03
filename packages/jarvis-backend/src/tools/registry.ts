import { config } from "../config/loader";

export interface ToolPermission {
    toolName: string;
    server: string;
    minTier: number;
    allowedSquads: string[]; // '*' for all squads
}

// Trust Tiers: 1=Read/Safe, 2=Write/Actionable, 3=Destructive/Terminal
export const TOOL_REGISTRY: Record<string, ToolPermission> = {
    // Filesystem - Read
    "list_directory": { toolName: "list_directory", server: "filesystem", minTier: 1, allowedSquads: ['*'] },
    "directory_tree": { toolName: "directory_tree", server: "filesystem", minTier: 1, allowedSquads: ['*'] },
    "read_file": { toolName: "read_file", server: "filesystem", minTier: 1, allowedSquads: ['*'] },
    "read_multiple_files": { toolName: "read_multiple_files", server: "filesystem", minTier: 1, allowedSquads: ['*'] },
    "search_files": { toolName: "search_files", server: "filesystem", minTier: 1, allowedSquads: ['*'] },
    "get_file_info": { toolName: "get_file_info", server: "filesystem", minTier: 1, allowedSquads: ['*'] },

    // Web Search abstraction (handled internally, mapped here for consistency)
    "web_search": { toolName: "web_search", server: "internal", minTier: 1, allowedSquads: ['*'] },

    // Browsing (Puppeteer)
    "puppeteer_navigate": { toolName: "puppeteer_navigate", server: "puppeteer", minTier: 2, allowedSquads: ['oracle', 'mercury', 'nexus', 'vault'] },
    "puppeteer_screenshot": { toolName: "puppeteer_screenshot", server: "puppeteer", minTier: 2, allowedSquads: ['oracle', 'mercury', 'nexus', 'vault'] },
    "puppeteer_click": { toolName: "puppeteer_click", server: "puppeteer", minTier: 2, allowedSquads: ['oracle', 'mercury', 'nexus', 'vault'] },
    "puppeteer_type": { toolName: "puppeteer_type", server: "puppeteer", minTier: 2, allowedSquads: ['oracle', 'mercury', 'nexus', 'vault'] },

    // Filesystem - Write
    "write_file": { toolName: "write_file", server: "filesystem", minTier: 2, allowedSquads: ['forge', 'nexus'] },
    "edit_file": { toolName: "edit_file", server: "filesystem", minTier: 2, allowedSquads: ['forge', 'nexus'] },
    "create_directory": { toolName: "create_directory", server: "filesystem", minTier: 2, allowedSquads: ['forge', 'nexus'] },
    "move_file": { toolName: "move_file", server: "filesystem", minTier: 2, allowedSquads: ['forge', 'nexus'] },
    "delete_file": { toolName: "delete_file", server: "filesystem", minTier: 2, allowedSquads: ['forge', 'nexus'] },

    // Desktop/Shell
    "desktop_command": { toolName: "execute_command", server: "desktop", minTier: 3, allowedSquads: ['forge', 'nexus'] },
};

export function canExecuteTool(toolName: string, squadId: string): { allowed: boolean; reason: string } {
    let permission = Object.values(TOOL_REGISTRY).find(t => t.toolName === toolName);

    if (!permission) {
        // Fallback for dynamic MCP tools (playwright_*, filesystem, etc.) to enable full AGI
        permission = { toolName, server: "dynamic", minTier: 1, allowedSquads: ['*'] };
    }

    // Default to Tier 3 (Full Autonomy) instead of Tier 1 to allow file writing and browsing out-of-the-box
    const currentTier = config.jarvis.trust_tier || 3;

    // Check Tier
    if (currentTier < permission.minTier) {
        return { allowed: false, reason: `Requires Trust Tier ${permission.minTier}, system is at Tier ${currentTier || 3}. Queueing for PENDING_APPROVAL.` };
    }

    // Check Squad
    if (!permission.allowedSquads.includes('*') && !permission.allowedSquads.includes(squadId.toLowerCase())) {
        return { allowed: false, reason: `Squad ${squadId} is not authorized to use ${toolName}.` };
    }

    return { allowed: true, reason: 'Approved' };
}
