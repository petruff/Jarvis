import * as fs from 'fs';
import * as path from 'path';

// Load the skills index
const SKILLS_ROOT = 'c:\\Users\\ppetr\\antigravity-skills';
const SKILLS_INDEX_PATH = path.join(SKILLS_ROOT, 'skills_index.json');

interface SkillDefinition {
    id: string;
    path: string;
    name: string;
    description: string;
}

let skillsIndex: SkillDefinition[] = [];

try {
    if (fs.existsSync(SKILLS_INDEX_PATH)) {
        skillsIndex = JSON.parse(fs.readFileSync(SKILLS_INDEX_PATH, 'utf-8'));
    } else {
        console.warn(`[SkillLoader] Skills index not found at ${SKILLS_INDEX_PATH}`);
    }
} catch (e) {
    console.error(`[SkillLoader] Failed to load skills index:`, e);
}

export const getSkillContent = (skillId: string): string => {
    const skill = skillsIndex.find(s => s.id === skillId);
    if (!skill) return '';

    const skillPath = path.join(SKILLS_ROOT, skill.path, 'SKILL.md');
    try {
        if (fs.existsSync(skillPath)) {
            return fs.readFileSync(skillPath, 'utf-8');
        }
    } catch (e) {
        console.error(`[SkillLoader] Failed to read skill ${skillId}:`, e);
    }
    return '';
};

export const getRelevantSkillsForAgent = (agentRole: string): string[] => {
    const lowerRole = agentRole.toLowerCase();
    const skills: string[] = [];

    if (lowerRole.includes('architect') || lowerRole.includes('developer') || lowerRole.includes('coder')) {
        skills.push('react-best-practices');
        skills.push('frontend-design');
        skills.push('systematic-debugging');
        skills.push('test-driven-development');
    }

    if (lowerRole.includes('designer') || lowerRole.includes('ux')) {
        skills.push('ui-ux-pro-max');
        skills.push('theme-factory');
        skills.push('web-design-guidelines');
    }

    if (lowerRole.includes('researcher') || lowerRole.includes('eye')) {
        skills.push('webapp-testing'); // For browsing capabilities
        skills.push('defuddle');
    }

    if (lowerRole.includes('writer') || lowerRole.includes('copywriter') || lowerRole.includes('voice')) {
        skills.push('writing-skills');
        skills.push('internal-comms');
    }

    if (lowerRole.includes('strategist') || lowerRole.includes('manager') || lowerRole.includes('hand')) {
        skills.push('planning-with-files');
        skills.push('project-development');
        skills.push('writing-plans');
    }

    return skills;
};

export const augmentSystemPrompt = (basePrompt: string, agentRole: string): string => {
    const skillIds = getRelevantSkillsForAgent(agentRole);
    if (skillIds.length === 0) return basePrompt;

    let skillSection = `\n\n## EXPERT SKILLS & PROTOCOLS\nYou have access to the following expert capabilities. Follow them strictly when applicable.\n`;

    for (const id of skillIds) {
        const content = getSkillContent(id);
        if (content) {
            skillSection += `\n### SKILL: ${id}\n${content}\n`;
        }
    }

    return basePrompt + skillSection;
};
