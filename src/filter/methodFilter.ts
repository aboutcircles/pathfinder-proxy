import {RpcCall} from "../model/rpcCall";
import {Filter} from "./filter";

export class MethodFilter implements Filter {
  readonly rules: { [key: string]: boolean };

  constructor(rules: { [key: string]: boolean }) {
    this.rules = rules;
  }

  canPass(rpcCall: RpcCall): boolean {
    return !!this.rules[rpcCall.method];
  }
}
