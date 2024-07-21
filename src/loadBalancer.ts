// LoadBalancer class to manage and distribute requests across nodes
import {NodeConfig} from "./nodeConfig";
import {Node} from "./node";

export class LoadBalancer {
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