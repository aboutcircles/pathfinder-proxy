import { app } from '../src/main';
import http from 'http';

let server: http.Server;

export const startServer = () => {
    return new Promise<void>((resolve) => {
        server = app.listen(9999, () => {
            console.log('Test server running on port 9999');
            resolve();
        });
    });
};

export const stopServer = () => {
    return new Promise<void>((resolve) => {
        server.close(() => {
            console.log('Test server stopped');
            resolve();
        });
    });
};
