
import screenshot from 'screenshot-desktop';
import robot from 'robotjs';
import { FastifyInstance } from 'fastify';

// Configuration
const SCREEN_WIDTH = robot.getScreenSize().width;
const SCREEN_HEIGHT = robot.getScreenSize().height;

console.log(`Desktop Automation Initialized. Screen Size: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}`);

export const captureScreen = async (): Promise<Buffer> => {
    try {
        const img = await screenshot({ format: 'png' });
        return img;
    } catch (err) {
        console.error("Failed to capture screen:", err);
        throw err;
    }
};

export const performAction = (action: any) => {
    console.log("Executing Action:", action);

    try {
        switch (action.type) {
            case 'click':
                if (action.x && action.y) {
                    robot.moveMouse(action.x, action.y);
                    robot.mouseClick();
                }
                break;

            case 'type':
                if (action.text) {
                    robot.typeString(action.text);
                }
                break;

            case 'key':
                if (action.key) {
                    // RobotJS keyTap(key, modifier)
                    // modifier must be a string or array of strings
                    robot.keyTap(action.key, action.modifier || []);
                }
                break;

            case 'scroll':
                // RobotJS doesn't support scroll well natively on all OS, skipping for now or use alternative
                console.warn("Scroll not fully supported in this version.");
                break;

            default:
                console.warn("Unknown action type:", action.type);
        }
    } catch (err) {
        console.error("Action Execution Failed:", err);
        throw err; // Re-throw to let orchestrator know
    }
};
