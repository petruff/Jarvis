
// @ts-ignore
import screenshot from 'screenshot-desktop';
import fs from 'fs';

console.log("Testing Screenshot...");

screenshot({ format: 'png' }).then((img: any) => {
    console.log(`SUCCESS: Captured screenshot! Size: ${img.length} bytes.`);
    fs.writeFileSync('test_screenshot.png', img);
    console.log("Saved to test_screenshot.png");
}).catch((err: any) => {
    console.error("FAILURE:", err);
    process.exit(1);
});
