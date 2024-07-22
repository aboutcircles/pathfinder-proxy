import express, {Request, Response} from 'express';
import cors from 'cors';
import {fetch} from 'cross-fetch';
import {NodeConfig} from "./nodeConfig";
import {LoadBalancer} from "./loadBalancer";
import {MethodFilter} from "./methodFilter";
import {RpcCall} from "./rpcCall";
import {Node} from "./node";
import fs from 'fs';
import path from 'path';

export const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CONFIG_FILE = process.env.CONFIG_FILE || './config.json';

// Function to load configurations from a JSON file
const loadConfigs = (filePath: string) => {
    try {
        const configPath = path.resolve(__dirname, filePath);
        const configData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        console.error(`Error loading configurations:`, error);
        process.exit(1);
    }
};

// Load configurations from config.json
const config = loadConfigs(CONFIG_FILE);
const nodeConfigs: NodeConfig[] = config.nodes;

// Set up CORS with the specified configuration
app.use(cors(config.server.cors));

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

        node = loadBalancer.assignRequest();
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
