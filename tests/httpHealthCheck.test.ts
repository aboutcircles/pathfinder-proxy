import {HttpStatusCodeHealthcheck} from "../src/healthchecks/httpStatusCodeHealthcheck";

describe("HttpHealthCheck", () => {
  it('should return true for available sites', async () => {
    const check = new HttpStatusCodeHealthcheck("https://google.com", 200);
    expect(await check.isHealthy()).toBe(true);
  });

  it('should return false for unavailable sites', async () => {
    const check = new HttpStatusCodeHealthcheck("https://auf-keinen-fall.diese-seite-gibt-es-nicht.com", 200);
    expect(await check.isHealthy()).toBe(false);
  });

  // TODO: Test 500 status codes
});
