import {UpstreamService} from "../upstreamService";
import {StatisticsLogger} from "../../statistics/statisticsLogger";
import {RpcCall} from "../../model/rpcCall";

export class MockUpstream extends UpstreamService {
  constructor(url: string, isHealthy: boolean, private dispatchHandler?: (call: RpcCall) => any) {
    super(url, {
      isHealthy(): Promise<boolean> {
        return Promise.resolve(isHealthy);
      },
      timeout: 1000
    }, new StatisticsLogger(1000, 10))
  }

  async dispatch(call: RpcCall): Promise<any> {
    return Promise.resolve(this.dispatchHandler
      ? this.dispatchHandler(call)
      : {
        id: call.id,
      }
    );
  }
}
