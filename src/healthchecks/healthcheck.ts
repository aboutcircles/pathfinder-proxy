export interface Healthcheck {
  timeout: number;
  isHealthy(): Promise<boolean>;
}
