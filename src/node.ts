// Node class representing a server node
import {NodeConfig} from "./nodeConfig";

export class Node {
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
                console.log(`Performing health check for node ${this.id} (url: ${this.healthUrl})...`);
                const response = await fetch(this.healthUrl);
                console.log(`Health check response for node ${this.id}: ${response.status}`);
                this.isHealthy = response.status == 200;
            } catch (error) {
                console.error(`Health check failed for node ${this.id}: ${error}`);
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