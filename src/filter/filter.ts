import {RpcCall} from "../model/rpcCall";


export interface Filter {
  canPass(rpcCall: RpcCall): boolean;
}
