import {NodeConfig} from "../src/nodeConfig";
import {LoadBalancer} from "../src/loadBalancer";
import {Node} from "../src/node";

describe('LoadBalancer Class', () => {
    let nodeConfigs: NodeConfig[];
    let loadBalancer: LoadBalancer;

    beforeEach(() => {
        nodeConfigs = [
            {
                id: 'node1',
                url: 'http://localhost:8080',
                cores: 4,
                allowedOverload: 1.25,
                healthUrl: 'http://localhost:4000/health',
                healthCheckInterval: 5000
            },
            {
                id: 'node2',
                url: 'http://localhost:8081',
                cores: 8,
                allowedOverload: 1.5,
                healthUrl: 'http://localhost:4001/health',
                healthCheckInterval: 5000
            }
        ];
        loadBalancer = new LoadBalancer(nodeConfigs);
    });

    test('should initialize with correct values', () => {
        expect(loadBalancer.nodes.length).toBe(nodeConfigs.length);
    });

    test('should get the node with the least load', () => {
        const node = loadBalancer.getNodeWithLeastLoad();
        expect(node.id).toBe('node1');
    });

    test('should assign a request to the least loaded node', () => {
        const node = loadBalancer.assignRequest();
        expect(node.id).toBe('node1');
        expect(node.currentLoad).toBe(1);
    });

    test('should correctly balance load between nodes', () => {
        // Assign enough requests to ensure both nodes get used
        for (let i = 0; i < 10; i++) {
            loadBalancer.assignRequest();
        }

        const node1 = loadBalancer.nodes.find(node => node.id === 'node1');
        const node2 = loadBalancer.nodes.find(node => node.id === 'node2');

        expect(node1?.currentLoad).toBe(4); // node1 has 4 cores, should handle 4 requests
        expect(node2?.currentLoad).toBe(6); // node2 has 8 cores, should handle remaining 6 requests
    });

    test('should not assign request if all nodes are overloaded', () => {
        // Assign enough requests to overload all nodes
        for (let i = 0; i < 20; i++) {
            try {
                loadBalancer.assignRequest();
            } catch (error) {
                if (error instanceof Error) {
                    expect(error.message).toBe('All nodes are overloaded.');
                }
                break;
            }
        }
    });

    test('should throw an error if all nodes are unhealthy', () => {
        // Set all nodes to unhealthy
        loadBalancer.nodes.forEach(node => node.isHealthy = false);

        expect(() => loadBalancer.getNodeWithLeastLoad()).toThrow('All nodes are unhealthy.');
    });

    test('should complete a request on a specific node', () => {
        const node = loadBalancer.assignRequest();
        loadBalancer.completeRequest(node.id);
        expect(node.currentLoad).toBe(0);
    });

    test('should get statistics for all nodes', () => {
        const stats = loadBalancer.getStatistics();
        expect(stats.length).toBe(nodeConfigs.length);
        expect(stats[0].id).toBe('node1');
        expect(stats[0].currentLoad).toBe(0);
    });

    test('should handle node health status change', async () => {
        jest.useFakeTimers();
        const node1 = loadBalancer.nodes.find(node => node.id === 'node1') as Node;

        // Simulate health check that sets the node to unhealthy
        node1.isHealthy = true; // Ensure node is initially healthy
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() =>
            Promise.resolve({
                status: 500
            } as any)
        );

        jest.advanceTimersByTime(node1.healthCheckInterval);
        await new Promise(process.nextTick); // wait for the health check to complete

        expect(node1.isHealthy).toBe(false);

        global.fetch = originalFetch;
        jest.useRealTimers();
    });
});
