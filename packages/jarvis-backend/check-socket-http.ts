
import http from 'http';

const check = () => {
    console.log("Checking Socket.IO handshake at http://localhost:3000/socket.io/?EIO=4&transport=polling");

    const req = http.get('http://localhost:3000/socket.io/?EIO=4&transport=polling', (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`BODY: ${data}`);
            if (res.statusCode === 200 && data.startsWith('0')) {
                console.log("SUCCESS: Socket.IO Server detected!");
                process.exit(0);
            } else {
                console.log("FAILURE: Unexpected response.");
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`ERROR: ${e.message}`);
        process.exit(1);
    });
};

check();
