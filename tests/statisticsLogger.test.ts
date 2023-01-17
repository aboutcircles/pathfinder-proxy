import {StatisticsLogger} from "../src/statistics/statisticsLogger";

jest.useFakeTimers();

describe("StatisticsLogger", () => {

  test('it should rotate the current time slice at the set interval when started', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();

    const firstWindow = statistics.currentWindowStart;
    jest.advanceTimersByTime(1000);

    const secondWindow = statistics.currentWindowStart;
    expect(firstWindow).not.toBe(secondWindow);
  });

  test('it should stop rotating the current time slice when stopped', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();
    jest.advanceTimersByTime(1000);

    const firstWindow = statistics.currentWindowStart;
    statistics.stop();
    jest.advanceTimersByTime(1000);

    const secondWindow = statistics.currentWindowStart;
    expect(firstWindow).toBe(secondWindow);
  });

  test('it should only keep the last N slices in history', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();

    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(1000);

    expect(statistics.history.items.length).toBe(3);
  });

  test('it should log the corresponding events when request(), response() or error() are called', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();

    for (let i = 0; i < 30; i++) {
      statistics.request(i.toString());

      jest.advanceTimersByTime(100);

      if (i % 2 === 0) {
        statistics.response(i.toString());
      } else {
        statistics.error(i.toString());
      }
    }

    statistics.stop();

    const allBalanced = statistics.history.items.reduce((p, c) => p && c.isBalanced(), true);

    expect(allBalanced).toBe(true);
    expect(statistics.history.items.length).toBe(3);

    statistics.history.items.forEach(slice => {
      // Each of the three slices should have 10 requests, 5 responses and 5 errors.
      expect(slice.eventLog.filter(e => e.type === "request").length).toBe(10);
      expect(slice.eventLog.filter(e => e.type === "response").length).toBe(5);
      expect(slice.eventLog.filter(e => e.type === "error").length).toBe(5);
    });
  });

  test('it should not have any balanced slices (which are not the active slice) in the pending list', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();

    jest.advanceTimersByTime(1000);
    statistics.request("1");
    statistics.response("1");

    jest.advanceTimersByTime(1000);
    statistics.request("1");
    statistics.response("1");

    jest.advanceTimersByTime(1000);
    statistics.request("1");
    statistics.response("1");

    jest.advanceTimersByTime(1000);
    statistics.request("1");
    statistics.response("1");

    const balancedPending = statistics.pending.filter(o => o.startTimestamp !== statistics.currentWindowStart
                                                        && o.isBalanced());

    expect(balancedPending.length).toBe(0);
  });
});
