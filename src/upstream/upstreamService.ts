import {StatisticsLogger} from "../statistics/statisticsLogger";
import {RpcCall} from "../model/rpcCall";
import fetch from "cross-fetch";
import {Healthcheck} from "../healthchecks/healthcheck";

export class UpstreamService {
  readonly url:string;
  readonly healthcheck:Healthcheck;
  readonly statisticsLogger:StatisticsLogger;

  constructor(url:string, healthcheck:Healthcheck, statisticsLogger:StatisticsLogger) {
    this.url = url;
    this.healthcheck = healthcheck;
    this.statisticsLogger = statisticsLogger;
  }

  async dispatch(call: RpcCall) : Promise<unknown> {
    this.statisticsLogger.request(call.id);

    console.log(`Dispatching call ${call.id} to upstream ${this.url}`);

    const request = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(call),
      headers: { 'Content-Type': 'application/json' }
    });

    try {
      const response = await request.json();
      this.statisticsLogger.response(call.id);
      return response;
    } catch (e) {
      this.statisticsLogger.error(call.id);
      throw e;
    }
  }
}
