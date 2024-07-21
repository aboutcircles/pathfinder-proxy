import express, {Request, Response} from 'express';
import {fetch} from 'cross-fetch';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

export interface RpcCall {
    id: string;
    method: string;

    [x: string]: any;
}

// Configuration for each node
interface NodeConfig {
    id: string;
    url: string;
    cores: number;
    allowedOverload: number; // Allowed overload percentage, e.g., 1.5 for 150%
    healthUrl: string;
    healthCheckInterval: number; // Interval in milliseconds
}

// Node class representing a server node
class Node {
    id: string;
    url: string;
    cores: number;
    allowedOverload: number;
    currentLoad: number; // Load in terms of core usage (e.g., 2 means 100% load on two cores)
    healthUrl: string;
    isHealthy: boolean;
    healthCheckInterval: number;
    healthCheckTimer: NodeJS.Timeout | null | number;

    constructor(config: NodeConfig) {
        this.id = config.id;
        this.url = config.url;
        this.cores = config.cores;
        this.allowedOverload = config.allowedOverload;
        this.currentLoad = 0;
        this.healthUrl = config.healthUrl;
        this.isHealthy = true;
        this.healthCheckInterval = config.healthCheckInterval;
        this.healthCheckTimer = null;
        this.startHealthCheck();
    }

    // Check if the node can handle a new request
    canHandleRequest(): boolean {
        return this.isHealthy && this.currentLoad < this.cores * this.allowedOverload;
    }

    // Assign a new request to the node
    assignRequest() {
        if (this.canHandleRequest()) {
            this.currentLoad += 1; // Each request uses 100% of one core
            console.log(`Assigned request to node ${this.id}. Current load: ${this.getLoadPercentage()}%`);
        } else {
            throw new Error(`Node ${this.id} is overloaded.`);
        }
    }

    // Complete a request on the node
    completeRequest() {
        if (this.currentLoad > 0) {
            this.currentLoad -= 1;
            console.log(`Request completed on node ${this.id}. Current load: ${this.getLoadPercentage()}%`);
        }
    }

    // Get the load percentage of the node
    getLoadPercentage(): number {
        return (this.currentLoad / this.cores) * 100;
    }

    // Start periodic health check
    startHealthCheck() {
        this.healthCheckTimer = setInterval(async () => {
            try {
                const response = await fetch(this.healthUrl);
                this.isHealthy = response.status == 200;
            } catch (error) {
                this.isHealthy = false;
            }
            console.log(`Health check for node ${this.id}: ${this.isHealthy ? 'Healthy' : 'Unhealthy'}`);
        }, this.healthCheckInterval);
    }

    // Stop periodic health check
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
}

// LoadBalancer class to manage and distribute requests across nodes
class LoadBalancer {
    nodes: Node[];

    constructor(nodeConfigs: NodeConfig[]) {
        this.nodes = nodeConfigs.map(config => new Node(config));
    }

    // Get the node with the least load
    getNodeWithLeastLoad(): Node {
        const healthyNodes = this.nodes.filter(node => node.isHealthy);
        if (healthyNodes.length === 0) {
            throw new Error("All nodes are unhealthy.");
        }
        return healthyNodes.reduce((leastLoadedNode, node) => {
            return node.getLoadPercentage() < leastLoadedNode.getLoadPercentage() ? node : leastLoadedNode;
        });
    }

    // Assign a request to the least loaded node
    assignRequest(): Node {
        const node = this.getNodeWithLeastLoad();
        if (!node.canHandleRequest()) {
            throw new Error("All nodes are overloaded.");
        }
        node.assignRequest();
        return node;
    }

    // Complete a request on a specific node
    completeRequest(nodeId: string) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.completeRequest();
        } else {
            throw new Error(`Node with id ${nodeId} not found.`);
        }
    }

    // Get statistics for all nodes
    getStatistics() {
        return this.nodes.map(node => ({
            id: node.id,
            url: node.url,
            // cores: node.cores,
            // allowedOverload: node.allowedOverload,
            currentLoad: node.currentLoad,
            loadPercentage: node.getLoadPercentage(),
            isHealthy: node.isHealthy
        }));
    }
}

// MethodFilter class to filter allowed methods
class MethodFilter implements Filter {
    readonly rules: { [key: string]: boolean };

    constructor(rules: { [key: string]: boolean }) {
        this.rules = rules;
    }

    canPass(rpcCall: RpcCall): boolean {
        return this.rules[rpcCall.method];
    }
}

// Filter interface
interface Filter {
    canPass(rpcCall: RpcCall): boolean;
}

// Node configurations
const nodeConfigs: NodeConfig[] = [
    {
        id: 'node1',
        url: 'http://127.0.0.1:8080',
        cores: 4,
        allowedOverload: 1.25,
        healthUrl: 'http://host1:4000/health',
        healthCheckInterval: 5000
    }/*,
    {
        id: 'node2',
        url: 'http://host2:4000',
        cores: 8,
        allowedOverload: 1.5,
        healthUrl: 'http://host2:4000/health',
        healthCheckInterval: 5000
    },
    {
        id: 'node3',
        url: 'http://host3:4000',
        cores: 2,
        allowedOverload: 1.0,
        healthUrl: 'http://host3:4000/health',
        healthCheckInterval: 5000
    }*/
];

// Create an instance of LoadBalancer with the given node configurations
const loadBalancer = new LoadBalancer(nodeConfigs);

// Create an instance of MethodFilter with the allowed methods
const filter = new MethodFilter({
    "compute_transfer": true
});

// Route to handle incoming JSON-RPC requests
app.post('/', async (req: Request, res: Response) => {
    try {
        console.log(`Received request: ${JSON.stringify(req.body)}`);
        const rpcCall: RpcCall = req.body;

        // Check if the request is allowed by the filter
        if (!filter.canPass(rpcCall)) {
            res.status(403).json({error: "Method not allowed"});
            return;
        }

        const node = loadBalancer.assignRequest();
        const startTime = Date.now();

        // Forward the request to the selected node
        const response = await fetch(node.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const endTime = Date.now();
        console.log(`Request forwarded to node ${node.id}. Response time: ${endTime - startTime}ms`);

        if (response.status != 200) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        loadBalancer.completeRequest(node.id);
        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error handling request: ${error.message}`);
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "An unknown error occurred"});
        }
    }
});

// Route to get statistics for all nodes
app.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = loadBalancer.getStatistics();
        res.json(stats);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error getting stats: ${error.message}`);
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "An unknown error occurred"});
        }
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Load balancer server running on port ${PORT}`);
});
