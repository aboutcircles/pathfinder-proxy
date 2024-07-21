// Configuration for each node
export interface NodeConfig {
    id: string;
    url: string;
    cores: number;
    allowedOverload: number; // Allowed overload percentage, e.g., 1.5 for 150%
    healthUrl: string;
    healthCheckInterval: number; // Interval in milliseconds
}