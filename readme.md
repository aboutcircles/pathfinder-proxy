# Pathfinder proxy
A simple application-level proxy for the pathfinder's RPC protocol.

## Purpose
The vanilla pathfinder listens on a configurable port for incoming rpc-calls.
Some rpc functions allow to change the pathfinder's state which should not be possible from outside.
This proxy limits access to only whitelisted rpc-functions and also acts as a load balancer and auto scaler.

## Proposed features
### UpstreamService list
The proxy maintains a list of upstreams. Each upstream is a pathfinder2 instance and has an associated health status.
Unhealthy instances will not receive any calls.

### Statistics
Associated with every upstream is a set of statistics. These are updated on every call.

I propose to track the following values:
- min, max and avg requests per time window
- min, max and avg errors per time window
- min, max and avg response times per time window

There should be three time windows. Each one longer that its predecessor.
This can then be used to find out if the load is increasing or decreasing (like the linux load average).

### Whitelist
The proxy maintains a whitelist of rpc-functions. Only calls to whitelisted functions are forwarded to an upstream.
It should be sufficient to compare the "method" field of the rpc-call against the whitelist.

The only externally available method for now is the "compute_transfer" method.

### Load balancing
The requests are distributed to the upstreams using round-robin.

### Health check
The proxy performs a health check on every upstream and blocks access as long as the upstream is unhealthy.

### Auto-scaling
Based on the statistics, the proxy must be able to decide if new cluster-nodes should be added or if some can be removed.
It should use the kubernetes api from within the pod to scale the pathfinder deployment.

## Implementation

### Use existing software
It is worth a thought if we should implement the proxy ourselves or if a ready-to-use implementation exists that suits our needs.

Candidates that come to mind are:
- traefik with custom middleware
- ?

### Build it ourselves
It should be sufficient to use nodejs with "express", "fetch" and the [kubernetes-js-sdk](https://github.com/kubernetes-client/javascript) to implement the proxy.
Not in the scope of the proxy is TLS handling. This should be done by the ingress controller.

