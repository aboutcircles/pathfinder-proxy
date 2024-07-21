import express, {Request, Response} from 'express';
import {fetch} from 'cross-fetch';
import {NodeConfig} from "./nodeConfig";
import {LoadBalancer} from "./loadBalancer";
import {MethodFilter} from "./methodFilter";
import {RpcCall} from "./rpcCall";
import {Node} from "./node";

export const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
    let node: any = undefined;
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
        res.json(data);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error handling request: ${error.message}`);
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "An unknown error occurred"});
        }
    } finally {
        if (node instanceof Node) {
            loadBalancer.completeRequest(node.id);
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
