const http = require('http');
const path = require('path');
const fs = require('fs').promises;

const mimeTypes = {
    '.vert': 'text/plain',
    '.frag': 'text/plain',
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.ply': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
};

const port = 3000;

async function handleRequest(request, response) {
    console.log(`request : ${request.url} `);
    console.log(`request decoded: ${decodeURI(request.url)}`);
    const lookup = (request.url === '/') ? '/index.html' : decodeURI(request.url);
    const file = lookup.substring(1, lookup.length);

    try {
        await fs.access(file, fs.constants.R_OK);
        console.log(`${lookup} is there`);

        try {
            const data = await fs.readFile(file);
            const headers = { 'Content-type': mimeTypes[path.extname(lookup)] };
            response.writeHead(200, headers);
            response.end(data);
        } catch (errorReadFile) {
            console.error(`Error reading file ${file}:`, errorReadFile);
            response.writeHead(500);
            response.end('Server Error!');
        }
    } catch (errorFileExists) {
        console.log(`${lookup} doesn't exist`);
        response.writeHead(404);
        response.end();
    }
}

http.createServer(handleRequest).listen(port, function () {
    console.log(`Server is listening on port ${port}`);
});
