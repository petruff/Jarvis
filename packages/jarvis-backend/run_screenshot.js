const { exec } = require('child_process');
console.log('Running screenshot script...');
exec('npx tsx test-screenshot.ts', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
});