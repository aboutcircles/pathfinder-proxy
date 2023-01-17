export interface RpcCall {
  id: string;
  method: string;
  [x:string]:any;
}
