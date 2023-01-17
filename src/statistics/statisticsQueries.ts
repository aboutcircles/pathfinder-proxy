import {StatisticsLogger} from "./statisticsLogger";

export class StatisticsQueries {
  readonly statisticsLogger: StatisticsLogger;

  constructor(statisticsLogger: StatisticsLogger) {
    this.statisticsLogger = statisticsLogger;
  }

  getAvgResponseTimeUntil(timeSliceIndex: number) {
    if (timeSliceIndex >= this.statisticsLogger.history.items.length) {
      throw new Error("Time slice number out of range");
    }

    const slicesToConsider = [];
    for (let i = 0; i < this.statisticsLogger.history.items.length; i++) {
      slicesToConsider.push(this.statisticsLogger.history.items[i]);
      if (i === timeSliceIndex) {
        break;
      }
    }

    const sliceAverages = slicesToConsider.map((item) => {
      const pairs: {[id: string] : {request: number, response?: number, duration?:number} } = {};
      item.eventLog.forEach((event) => {
        switch (event.type) {
          case "request":
            pairs[event.opId] = {request: event.occurredAt};
           break;
          case "response":
          case "error":
            if (pairs[event.opId]) {
              pairs[event.opId].response = event.occurredAt;
            }
            break;
        }
      });
      let durationSum = 0;
      let durationCount = 0;

      Object.keys(pairs).forEach((key) => {
        const pair = pairs[key];
        if (!pair.response) {
          return;
        }
        durationSum += pair.response - pair.request;
        durationCount++;
      });

      if (durationCount === 0) {
        return 0;
      }

      return durationSum / durationCount;
    });

    return sliceAverages.reduce((a, b) => a + b, 0) / sliceAverages.length;
  }
}
