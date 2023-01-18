import {getEnvVarOrThrow, getUrlListFromEnvOrThrow} from "./utils";

export class Environment {

  static validateAndSummarize() {
    console.log("Starting pathfinder-proxy ..");
    console.log("");

    console.log("PORT: " + Environment.port);

    console.log("CORS_ORIGINS: ");
    Environment.corsOrigins.map(o => o.toString()).forEach(o => console.log("* " + o));

    console.log("UPSTREAM_SERVICE_ENDPOINTS: ");
    Environment.upstreamServiceEndpoints.map(o => o.toString()).forEach(o => console.log("* " + o));

    console.log("UPSTREAM_HEALTH_ENDPOINTS: ");
    Environment.upstreamHealthEndpoints.map(o => o.toString()).forEach(o => console.log("* " + o));

    if (Environment.upstreamServiceEndpoints.length !== Environment.upstreamHealthEndpoints.length) {
      throw new Error("The number of UPSTREAM_SERVICE_ENDPOINTS and UPSTREAM_HEALTH_ENDPOINTS must be equal.");
    }
  }

  static get port(): string {
    return getEnvVarOrThrow("PORT");
  }

  static get corsOrigins() : URL[] {
    return getUrlListFromEnvOrThrow("CORS_ORIGINS");
  }

  static get upstreamServiceEndpoints() : URL[] {
    return getUrlListFromEnvOrThrow("UPSTREAM_SERVICE_ENDPOINTS");
  }

  static get upstreamHealthEndpoints() : URL[] {
    return getUrlListFromEnvOrThrow("UPSTREAM_HEALTH_ENDPOINTS");
  }
}
