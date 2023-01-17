import {StatisticsLogger} from "../src/statistics/statisticsLogger";
import {StatisticsQueries} from "../src/statistics/statisticsQueries";

jest.useFakeTimers();

describe("StatisticsQueries", () => {
  test('it should calculate the average response time', () => {
    // noinspection DuplicatedCode

    const totalDuration =
      10 * 100
      + 10 * 200
      + 10 * 300
      + 10 * 200
      + 10 * 100;

    const statistics = new StatisticsLogger(1000, totalDuration / 1000);
    statistics.start();

    for (let i = 0; i < 50; i++) {
      statistics.request(i.toString());

      if (i / 10 < 1)
        jest.advanceTimersByTime(100);
      else if (i / 10 < 2)
        jest.advanceTimersByTime(200);
      else if (i / 10 < 3)
        jest.advanceTimersByTime(300);
      else if (i / 10 < 4)
        jest.advanceTimersByTime(200);
      else if (i / 10 < 5)
        jest.advanceTimersByTime(100);

      if (i % 2 === 0) {
        statistics.response(i.toString());
      } else {
        statistics.error(i.toString());
      }
    }

    statistics.stop();

    const queries = new StatisticsQueries(statistics);

    expect(Math.trunc(queries.getAvgResponseTimeUntil(0))).toBe(100);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(1))).toBe(150);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(2))).toBe(166);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(3))).toBe(200);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(4))).toBe(220);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(5))).toBe(233);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(6))).toBe(228);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(7))).toBe(225);
    expect(Math.trunc(queries.getAvgResponseTimeUntil(8))).toBe(211);
  });

  test('it should throw when getAvgResponseTimeUntil() is called with an index thats too big', () => {
    const statistics = new StatisticsLogger(1000, 3);
    statistics.start();
    const queries = new StatisticsQueries(statistics);
    expect(() => queries.getAvgResponseTimeUntil(4)).toThrow();
  });
});
