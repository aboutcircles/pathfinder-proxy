import {Node} from '../src/node';
import {NodeConfig} from '../src/nodeConfig';
import nock from 'nock';

describe('Node Class', () => {
    let node: Node;
    let config: NodeConfig;

    beforeEach(() => {
        config = {
            id: 'node1',
            url: 'http://127.0.0.1:8080',
            cores: 4,
            allowedOverload: 1.5,
            healthUrl: 'http://example.com',
            healthCheckInterval: 1000
        };
        node = new Node(config);
        node.startHealthCheck();
    });

    afterEach(() => {
        node.stopHealthCheck();
        nock.cleanAll();
    });

    test('should initialize correctly', () => {
        expect(node.id).toBe(config.id);
        expect(node.url).toBe(config.url);
        expect(node.cores).toBe(config.cores);
        expect(node.allowedOverload).toBe(config.allowedOverload);
        expect(node.currentLoad).toBe(0);
        expect(node.healthUrl).toBe(config.healthUrl);
        expect(node.isHealthy).toBe(true);
        expect(node.healthCheckInterval).toBe(config.healthCheckInterval);
    });

    test('should handle request correctly', () => {
        node.assignRequest();
        expect(node.currentLoad).toBe(1);
        expect(node.getLoadPercentage()).toBe(25);

        node.completeRequest();
        expect(node.currentLoad).toBe(0);
        expect(node.getLoadPercentage()).toBe(0);
    });

    test('should not exceed allowed overload', () => {
        for (let i = 0; i < 7; i++) {
            if (i < 6) {
                node.assignRequest();
            } else {
                expect(() => node.assignRequest()).toThrow(`Node ${node.id} is overloaded.`);
            }
        }
    });

    test('should perform health check correctly', async () => {
        node.healthUrl = 'https://example.com';
        await new Promise((resolve) => setTimeout(resolve, config.healthCheckInterval + 100));
        expect(node.isHealthy).toBe(true);

        node.healthUrl = 'https://1.1.1.1:999999999';
        await new Promise((resolve) => setTimeout(resolve, config.healthCheckInterval + 100));

        expect(node.isHealthy).toBe(false);
    });

    test('should stop health check correctly', () => {
        node.stopHealthCheck();
        expect(node.healthCheckTimer).toBe(null);
    });
});
