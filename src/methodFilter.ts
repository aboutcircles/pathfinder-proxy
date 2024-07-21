// Filter interface
import {RpcCall} from "./rpcCall";

export interface Filter {
    canPass(rpcCall: RpcCall): boolean;
}

// MethodFilter class to filter allowed methods
export class MethodFilter implements Filter {
    readonly rules: { [key: string]: boolean };

    constructor(rules: { [key: string]: boolean }) {
        this.rules = rules;
    }

    canPass(rpcCall: RpcCall): boolean {
        if (!this.rules[rpcCall.method]) {
            return false;
        }
        return this.rules[rpcCall.method];
    }
}