import {UpstreamService} from "./upstreamService";
import {RpcCall} from "../model/rpcCall";
import {HealthMonitor, HealthStatus, StatusChangedHandler} from "./healthMonitor";

export class UpstreamPool {
  readonly upstreamServices: UpstreamService[] = [];
  readonly healthMonitor: HealthMonitor;

  private _roundRobinIndex = 1;

  get isRunning() {
    return this.healthMonitor.isRunning;
  }

  get status() {
    return this.healthMonitor.status;
  }

  constructor(healthCheckInterval: number, healthCheckTimeout: number) {
    this.upstreamServices = [];
    this.healthMonitor = new HealthMonitor(this.upstreamServices, healthCheckInterval, healthCheckTimeout);
  }

  registerUpstreamService(upstreamService: UpstreamService) {
    this.upstreamServices.push(upstreamService);
  }

  start() {
    this.healthMonitor.start();
  }

  stop() {
    this.healthMonitor.stop();
  }

  async dispatchRandom(call: RpcCall) {
    this.throwOnInvalidState();

    const healthyServices = this.healthMonitor.healthyServices;
    const randomIndex = Math.floor(Math.random() * healthyServices.length);
    const randomService = healthyServices[randomIndex];

    return await randomService.dispatch(call);
  }

  async dispatchRoundRobin(call: RpcCall) {
    this.throwOnInvalidState();

    const rrIndex = this._roundRobinIndex % this.healthMonitor.healthyServices.length;
    const roundRobinService = this.healthMonitor.healthyServices[rrIndex];

    this._roundRobinIndex++;

    return await roundRobinService.dispatch(call);
  }

  private throwOnInvalidState() {
    if (!this.isRunning) {
      throw new Error("Dispatcher is not running.");
    }
    if (this.status === "down") {
      throw new Error("No healthy upstream services available.");
    }
  }

  registerStateChangeHandler(handler: (status: HealthStatus) => void) {
    this.healthMonitor.registerStateChangeHandler(handler);
  }
}
