import {MockUpstream} from "../src/upstream/mocks/mockUpstream";
import {HealthMonitor} from "../src/upstream/healthMonitor";

jest.useFakeTimers();

describe("HealthMonitor", () => {
  it ('should be healthy when all services are healthy', async () => {
    const services = [
      new MockUpstream('http://localhost:5000', true),
      new MockUpstream('http://localhost:5001', true),
      new MockUpstream('http://localhost:5002', true)
    ];

    const healthMonitor = new HealthMonitor(services, 1000, 1000);
    healthMonitor.start();

    jest.advanceTimersByTime(1000);

    await new Promise((resolve) => {
      let c = 0;
      healthMonitor.registerStateChangeHandler((healthyServices) => {
        jest.advanceTimersByTime(100);
        c++;
        if (c == 3) {
          resolve(null);
        }
      });
    });

    expect(healthMonitor.healthyServices.length).toBe(3);
    expect(healthMonitor.status).toBe("healthy");
  });

  it ('should be degraded when at least one service is unhealthy', async () => {
    const services = [
      new MockUpstream('http://localhost:5000', true),
      new MockUpstream('http://localhost:5001', true),
      new MockUpstream('http://localhost:5002', false)
    ];

    const healthMonitor = new HealthMonitor(services, 1000, 1000);
    healthMonitor.start();

    jest.advanceTimersByTime(1000);

    await new Promise((resolve) => {
      let c = 0;
      healthMonitor.registerStateChangeHandler((healthyServices) => {
        jest.advanceTimersByTime(100);
        c++;
        if (c == 3) {
          resolve(null);
        }
      });
    });

    expect(healthMonitor.healthyServices.length).toBe(2);
    expect(healthMonitor.status).toBe("degraded");
  });

  it ('should be down when all services are unhealthy', async () => {
    const services = [
      new MockUpstream('http://localhost:5000', false),
      new MockUpstream('http://localhost:5001', false),
      new MockUpstream('http://localhost:5002', false)
    ];

    const healthMonitor = new HealthMonitor(services, 1000, 1000);
    healthMonitor.start();

    jest.advanceTimersByTime(1000);

    await new Promise((resolve) => {
      let c = 0;
      healthMonitor.registerStateChangeHandler((healthyServices) => {
        jest.advanceTimersByTime(100);
        c++;
        if (c == 3) {
          resolve(null);
        }
      });
    });

    expect(healthMonitor.healthyServices.length).toBe(0);
    expect(healthMonitor.status).toBe("down");
  });

  it('should be "down" when there are no upstreams to monitor', () => {
    const healthMonitor = new HealthMonitor([], 1000, 1000);
    expect(healthMonitor.status).toBe("down");
  });
});
