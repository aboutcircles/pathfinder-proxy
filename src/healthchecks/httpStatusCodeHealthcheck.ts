import fetch from "cross-fetch";
import {Healthcheck} from "./healthcheck";

export class HttpStatusCodeHealthcheck implements Healthcheck {
  readonly timeout: number;
  readonly url: string;

  constructor(url: string, timeout: number) {
    this.url = url;
    this.timeout = timeout;
  }
  async isHealthy(): Promise<boolean> {
    try {
      const fetchResult = await fetch(this.url, {
        method: "GET"
      });
      return fetchResult.status.toString().startsWith("2")
          || fetchResult.status.toString().startsWith("3");
    } catch (e) {
      return false;
    }
  }
}
