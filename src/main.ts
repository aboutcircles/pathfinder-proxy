import express from "express";
import {UpstreamPool} from "./upstream/upstreamPool";
import {UpstreamService} from "./upstream/upstreamService";
import {HttpStatusCodeHealthcheck} from "./healthchecks/httpStatusCodeHealthcheck";
import {StatisticsLogger} from "./statistics/statisticsLogger";
import {MethodFilter} from "./filter/methodFilter";
import {StatisticsQueries} from "./statistics/statisticsQueries";
import {Environment} from "./environment";

Environment.validateAndSummarize();

const app = express();
app.use(express.json());

const upstreamPool = new UpstreamPool(5000, 1000);

// Store two minutes of statistics with a resolution of 1 second per upstream service
const statisticsSettings = {
  interval: 1000,
  historySize: 120
};

Environment.upstreamServiceEndpoints.forEach((upstreamUrl, index) => {
  const healthcheckUrl = Environment.upstreamHealthEndpoints[index];
  const upstreamService = new UpstreamService(
    upstreamUrl.toString()
    , new HttpStatusCodeHealthcheck(healthcheckUrl.toString(), 1000)
    , new StatisticsLogger(statisticsSettings.interval, statisticsSettings.historySize));

  upstreamService.statisticsLogger.start();
  upstreamPool.registerUpstreamService(upstreamService);
});

upstreamPool.start();

const filter = new MethodFilter({
  "compute_transfer": true
});

app.get('/', (req, res) => {
  let statusString = `Pathfinder proxy is running. <br> 
                        Upstream pool size: ${upstreamPool.upstreamServices.length}. <br/>
                        Upstream pool health: ${upstreamPool.status} <br/><br/>`;

  upstreamPool.upstreamServices.forEach((upstream) => {
    const stats = upstream.statisticsLogger;
    const max = stats.history.items.length
    statusString += "Stats for " + upstream.url + ": <br/>";
    if (max < 30) {
      statusString += "-> Not enough data to compute statistics<br/>";
      return;
    }
    const queries = new StatisticsQueries(stats);
    let avgs: any = {};
    const avg30 = queries.getAvgResponseTimeUntil(29);
    avgs = {
      ...avgs,
      avg30: avg30
    };
    if (max >= 60) {
      const avg60 = queries.getAvgResponseTimeUntil(59);
      avgs = {
        ...avgs,
        avg60: avg60
      };
    }
    if (max >= 120) {
      const avg120 = queries.getAvgResponseTimeUntil(119);
      avgs = {
        ...avgs,
        avg120: avg120
      };
    }
    statusString += "-> " + JSON.stringify(avgs) + "<br/>";
  });

  res.send(statusString);
});

app.post('/', async (req, res) => {
  try {
    const call = await req.body;
    const canPass = filter.canPass(call);
    if (!canPass) {
      res.status(400).send('RPC method not allowed');
      return;
    }

    const response = await upstreamPool.dispatchRoundRobin(call);
    res.send(response);
  } catch (e) {
    // return 500
    res.status(500).send(e);
  }
});

app.listen(Environment.port, () => {
  console.log(`Example app listening on port ${Environment.port}`)
});
