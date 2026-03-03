
import http from 'http';

const check = () => {
    console.log("Checking connectivity to http://localhost:3000...");
    const req = http.get('http://localhost:3000', (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.on('data', (chunk) => console.log(`BODY: ${chunk}`));
        process.exit(0);
    });

    req.on('error', (e) => {
        console.error(`ERROR: ${e.message}`);
        process.exit(1);
    });
};

check();
