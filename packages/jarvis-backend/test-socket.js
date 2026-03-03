
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/socket.io/?EIO=4&transport=polling',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
