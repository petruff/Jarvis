import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Docker Verifier — Phase 8 Code Physics
 * 
 * Executes code in ephemeral containers to provide "Ground Truth" 
 * for success, defeating LLM hallucination.
 */
export class DockerVerifier {
    /**
     * Physically verify code in a specific directory
     */
    async verifyPhysics(directory: string, testCommand: string): Promise<{ success: boolean; logs: string }> {
        const runId = `verify_${Date.now()}`;

        try {
            // Ensure Dockerfile exists in the directory
            const dockerfilePath = path.join(directory, 'Dockerfile');
            if (!fs.existsSync(dockerfilePath)) {
                await fs.writeFile(dockerfilePath, `
          FROM node:18-slim
          WORKDIR /app
          COPY . .
          RUN npm install --ignore-scripts || true
          CMD ${testCommand}
        `);
            }

            console.log(`[DockerVerifier] Building & Running container in ${directory}...`);

            // Build and run
            const { stdout, stderr } = await execAsync(
                `docker build -t ${runId} . && docker run --rm ${runId}`,
                { cwd: directory }
            );

            return {
                success: true,
                logs: stdout + stderr
            };
        } catch (error: any) {
            console.error(`[DockerVerifier] Verification failed:`, error.message);
            return {
                success: false,
                logs: error.stdout + error.stderr || error.message
            };
        }
    }
}

export const dockerVerifier = new DockerVerifier();
