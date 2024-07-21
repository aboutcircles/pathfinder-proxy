import request from 'supertest';
import nock from 'nock';
import { startServer, stopServer } from './testServer'; // adjust the import path

describe('Express Routes', () => {
    beforeAll(async () => {
        await startServer();
    });

    afterAll(async () => {
        await stopServer();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    test('should forward request and return 200 for allowed methods', async () => {
        nock('http://127.0.0.1:8080')
            .post('/')
            .reply(200, { result: 'success' });

        const response = await request('http://localhost:9999')
            .post('/')
            .send({ id: '1', method: 'compute_transfer' });

        expect(response.status).toBe(200);
        expect(response.body.result).toBe('success');
    });

    test('should return 403 for disallowed methods', async () => {
        const response = await request('http://localhost:9999')
            .post('/')
            .send({ id: '1', method: 'disallowed_method' });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Method not allowed');
    });

    test('should return 500 for internal server error', async () => {
        nock('http://127.0.0.1:8080')
            .post('/')
            .reply(500, { error: 'Internal Server Error' });

        const response = await request('http://localhost:9999')
            .post('/')
            .send({ id: '1', method: 'compute_transfer' });

        expect(response.status).toBe(500);
    });

    test('should get node statistics', async () => {
        const response = await request('http://localhost:9999')
            .get('/stats');

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });
});
