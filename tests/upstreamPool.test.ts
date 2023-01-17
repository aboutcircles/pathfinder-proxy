import {UpstreamPool} from "../src/upstream/upstreamPool";
import {MockUpstream} from "../src/upstream/mocks/mockUpstream";

jest.useFakeTimers();

describe("UpstreamPool", () => {
  test('it should throw if the pool is not running', async () => {
    const pool = new UpstreamPool(1000, 1000);
    let error = null;
    try {
      await pool.dispatchRoundRobin({
        id: '1',
        method: 'test',
      });
    } catch (e) {
      error = e;
    }
    expect((<any>error).message).toBe('Dispatcher is not running.');
  });

  test('it should throw if the pool is down', async () => {
    const pool = new UpstreamPool(1000, 1000);
    pool.registerUpstreamService(new MockUpstream('http://localhost:5000', false));
    pool.start();

    await new Promise((resolve) => {
      pool.registerStateChangeHandler(() => {
        resolve(null);
      });
      jest.advanceTimersByTime(1000);
    });

    let error = null;
    try {
      await pool.dispatchRoundRobin({
        id: '1',
        method: 'test',
      });
    } catch (e) {
      error = e;
    }
    expect((<any>error).message).toBe('No healthy upstream services available.');
  });


  test('it should add new upstream services', () => {
    const pool = new UpstreamPool(1000, 1000);

    pool.registerUpstreamService(new MockUpstream('http://host1:5000', true));
    pool.registerUpstreamService(new MockUpstream('http://host2:5001', true));
    pool.registerUpstreamService(new MockUpstream('http://host3:5002', false));

    expect(pool.upstreamServices.length).toBe(3);
  });

  test('it should determine the health of the services when started', async () => {
    const pool = new UpstreamPool(1000, 1000);

    pool.registerUpstreamService(new MockUpstream('http://localhost:5000', true));
    pool.registerUpstreamService(new MockUpstream('http://localhost:5001', true));
    pool.registerUpstreamService(new MockUpstream('http://localhost:5002', true));

    pool.start();

    let c = 0;

    await new Promise((resolve) => {
      pool.registerStateChangeHandler((status) => {
        if (c == 0) {
          expect(status).toBe("degraded");
        } else if (c == 1) {
          expect(status).toBe("degraded");
        } else if (c == 2) {
          expect(status).toBe("healthy");
          resolve(null);
        }
        c++;
      });
      jest.advanceTimersByTime(1000);
    });

    expect(pool.status).toBe("healthy");
  });

  test('it should dispatch only to healthy services', async () => {
    const pool = new UpstreamPool(1000, 1000);

    const shouldNotBeCalled = jest.fn();
    const shouldBeCalled = jest.fn();

    pool.registerUpstreamService(new MockUpstream('http://localhost:5000', true, shouldBeCalled));
    pool.registerUpstreamService(new MockUpstream('http://localhost:5001', true, shouldBeCalled));
    pool.registerUpstreamService(new MockUpstream('http://localhost:5002', false, shouldNotBeCalled));

    pool.start();

    let c = 0;

    await new Promise((resolve) => {
      pool.registerStateChangeHandler((status) => {
        if (c == 0) {
          expect(status).toBe("degraded");
        } else if (c == 1) {
          expect(status).toBe("degraded");
        } else if (c == 2) {
          expect(status).toBe("degraded");
          resolve(null);
        }
        c++;
      });
      jest.advanceTimersByTime(1000);
    });

    for (let i = 0; i < 10; i++) {
      await pool.dispatchRoundRobin({
        id: i.toString(),
        method: "test",
        params: []
      });
    }

    expect(shouldBeCalled).toBeCalledTimes(10);
    expect(shouldNotBeCalled).toBeCalledTimes(0);
  });

  test('it should dispatch in a round-robin fashion', async () => {
    const pool = new UpstreamPool(1000, 1000);

    const callCount: {[id:string]: number} = {};
    const countCall = (id: string) => {
      callCount[id] = callCount[id] ? callCount[id] + 1 : 1;
    };

    pool.registerUpstreamService(new MockUpstream('http://host1:5000', true, () => countCall("1")));
    pool.registerUpstreamService(new MockUpstream('http://host2:5001', true, () => countCall("2")));
    pool.registerUpstreamService(new MockUpstream('http://host3:5001', true, () => countCall("3")));
    pool.registerUpstreamService(new MockUpstream('http://host4:5001', true, () => countCall("4")));
    pool.registerUpstreamService(new MockUpstream('http://host5:5001', true, () => countCall("5")));

    pool.start();

    let c = 0;

    await new Promise((resolve) => {
      pool.registerStateChangeHandler((status) => {
        console.log(status);
        if (c == 4) {
          expect(status).toBe("healthy");
          resolve(null);
        }
        c++;
      });
      jest.advanceTimersByTime(1000);
    });

    for (let i = 0; i < 10; i++) {
      await pool.dispatchRoundRobin({
        id: i.toString(),
        method: "test",
        params: []
      });
    }

    // expect all calls to be distributed evenly
    expect(callCount["1"]).toBe(2);
    expect(callCount["2"]).toBe(2);
    expect(callCount["3"]).toBe(2);
    expect(callCount["4"]).toBe(2);
    expect(callCount["5"]).toBe(2);
  });

  test('it should dispatch randomly', async () => {
    const pool = new UpstreamPool(1000, 1000);

    const callCount: {[id:string]: number} = {};
    const countCall = (id: string) => {
      callCount[id] = callCount[id] ? callCount[id] + 1 : 1;
    };

    pool.registerUpstreamService(new MockUpstream('http://host1:5000', true, () => countCall("1")));
    pool.registerUpstreamService(new MockUpstream('http://host2:5001', true, () => countCall("2")));
    pool.registerUpstreamService(new MockUpstream('http://host3:5001', true, () => countCall("3")));
    pool.registerUpstreamService(new MockUpstream('http://host4:5001', true, () => countCall("4")));
    pool.registerUpstreamService(new MockUpstream('http://host5:5001', true, () => countCall("5")));

    pool.start();

    let c = 0;

    await new Promise((resolve) => {
      pool.registerStateChangeHandler((status) => {
        console.log(status);
        if (c == 4) {
          expect(status).toBe("healthy");
          resolve(null);
        }
        c++;
      });
      jest.advanceTimersByTime(1000);
    });

    for (let i = 0; i < 10; i++) {
      await pool.dispatchRandom({
        id: i.toString(),
        method: "test",
        params: []
      });
    }

    let totalCallCount = 0;
    let distributedOverN = 0;

    Object.keys(callCount).forEach((key) => {
      const count = callCount[key];
      if (count > 0) {
        distributedOverN++;
      }
      totalCallCount += count;
    });

    expect(totalCallCount).toBe(10);
    expect(distributedOverN).toBeGreaterThan(1);
  });
});
