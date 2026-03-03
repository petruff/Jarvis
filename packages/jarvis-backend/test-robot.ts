
import robot from 'robotjs';

console.log("Testing RobotJS...");
const screenSize = robot.getScreenSize();
console.log(`Screen Size: ${screenSize.width}x${screenSize.height}`);

console.log("Moving mouse to 100, 100...");
robot.moveMouse(100, 100);

console.log("Moving mouse to 200, 200...");
robot.moveMouseSmooth(200, 200);

console.log("SUCCESS: RobotJS is working.");
