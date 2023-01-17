import {UpstreamService} from "./upstreamService";

export type HealthStatus = "healthy" | "degraded" | "down";
export type StatusChangedHandler = (status: HealthStatus, runningServices: UpstreamService[]) => void;

export class HealthMonitor {
  get healthyServices(): UpstreamService[] {
    return Object.values(this._healthyServices);
  }

  get status() : HealthStatus {
    if (this.healthyServices.length === 0) {
      return "down";
    }
    return this.healthyServices.length == this.upstreamServices.length ? "healthy"
      : this.healthyServices.length > 0 ? "degraded"
        : "down";
  }

  private _healthyServices: {[url:string]: UpstreamService } = {};
  private _pendingChecksStartedAt: {[url:string]: number } = {};
  private _interval?: NodeJS.Timeout

  private _stateChangeHandlers: StatusChangedHandler[] = [];

  constructor(private upstreamServices: UpstreamService[],
              public checkInterval: number,
              public timeout: number) {
  }

  start() {
    if (this._interval) {
      throw new Error("Already running");
    }
    this._interval = setInterval(() => this.maintainHealthyServices(), this.checkInterval);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
    }
    this._interval = undefined;
  }

  private maintainHealthyServices() {
    this.upstreamServices.map(async (service) => {
      const alreadyStartedAt = this._pendingChecksStartedAt[service.url];
      const duration = Date.now() - alreadyStartedAt;
      if(alreadyStartedAt && duration < this.timeout) {
        console.info(`Skipping healthcheck for ${service.url} because it was already started ${duration}ms ago.`);
        return;
      }

      if (alreadyStartedAt && duration >= this.timeout) {
        delete this._pendingChecksStartedAt[service.url];
        delete this._healthyServices[service.url];

        console.warn(`Healthcheck for ${service.url} timed out after ${duration}ms`);
        this.onUnHealthyService(service);
        return;
      }

      this._pendingChecksStartedAt[service.url] = Date.now();
      try {
        const result = await service.healthcheck.isHealthy();
        if (result) {
          this.onHealthyService(service);
        } else {
          this.onUnHealthyService(service);
        }
      } catch (e) {
        console.error(`Healthcheck for ${service.url} failed with error: ${e}`);
        this.onUnHealthyService(service);
      }
    });
  }

  registerStateChangeHandler(handler: StatusChangedHandler) {
    this._stateChangeHandlers.push(handler);
  }

  private onStateChange(service: UpstreamService) {
    delete this._pendingChecksStartedAt[service.url];
    this._stateChangeHandlers.forEach(handler => {
      handler(this.status, this.healthyServices);
    });
  }

  private onHealthyService(service: UpstreamService) {
    console.info(`Service ${service.url} is healthy`);
    this._healthyServices[service.url] = service;
    this.onStateChange(service);
  }

  private onUnHealthyService(service: UpstreamService) {
    console.warn(`Healthcheck for ${service.url} failed`);
    delete this._healthyServices[service.url];
    this.onStateChange(service);
  }

  get isRunning() : boolean {
    return this._interval !== undefined;
  }
}
