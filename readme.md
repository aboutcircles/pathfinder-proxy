# Pathfinder proxy
A simple application-level proxy for the pathfinder's RPC protocol.

## Purpose
The vanilla pathfinder listens on a configurable port for incoming rpc-calls.
Some rpc functions allow to change the pathfinder's state which should not be possible from outside.
This proxy limits access to only whitelisted rpc-functions and also acts as a load balancer and auto scaler.

## Usage
### Configuration
The proxy can be configured with the following environment variables:  
_(___Note___: every upstream must have a corresponding health check entry)_

#### PORT
The port the proxy listens on.

#### CORS_ORIGINS
A comma separated list of allowed origins for CORS:
```
https://my-first-client-app.com,https://my-second-client-app.com
```

#### UPSTREAM_SERVICE_ENDPOINTS  
A comma separated list of URLs that point to upstream pathfinder instances:
```
https://pathfinder-1.com,https://pathfinder-2.com
```

#### UPSTREAM_HEALTH_ENDPOINTS  
A comma separated list of URLs that point to the health endpoints of the upstream pathfinders:
```
https://pathfinder-1.com/health,https://pathfinder-2.com/health
```

### Start the proxy
1. Clone the repository
2. Install dependencies with `npm install`
3. Compile typescript with `npx tsc`
4. Start the proxy with `node dist/main.js`

```shell
# Get the code
git clone https://github.com/CirclesUBI/pathfinder-proxy.git

# Build
cd pathfinder-proxy
npm install
npx tsc

# Configure
PORT=5551
CORS_ORIGINS=https://my-first-client-app.com,https://my-second-client-app.com
UPSTREAM_SERVICE_ENDPOINTS=https://pathfinder-1.com,https://pathfinder-2.com
UPSTREAM_HEALTH_ENDPOINTS=https://pathfinder-1.com/health,https://pathfinder-2.com/health

# Run
node dist/main.js
```

### Send requests
The proxy listens on port 4999 for incoming requests.
It accepts POST requests to the `/` path.  

You can use the following curl command to test the proxy:
```bash
curl --location --request POST 'localhost:4999' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id":"875634785", 
    "method": "compute_transfer", 
    "params": {
        "from": "0x052b4793d50d37FD3BFcBf93AAC9Cda6292F81Fa",
        "to": "0x42cEDde51198D1773590311E2A340DC06B24cB37",
        "value": "9999999999999999999999999999"
    }
}'
```

## Implemented features
### UpstreamService list
The proxy maintains a list of upstreams. Each upstream is a pathfinder2 instance and has an associated health status.
Unhealthy instances will not receive any calls.

### Health check
The proxy performs a health check on every upstream and blocks access as long as the upstream is unhealthy.
Health checks are just http requests. The proxy expects a 200 status code for a healthy upstream service and 500 for an unhealthy one.

### Statistics
Associated with every upstream is a set of statistics. These are updated on every call.
Currently only the average response time is tracked for 30, 60 and 120 second windows.

### Whitelist
The proxy maintains a whitelist of rpc-functions. Only calls to whitelisted functions are forwarded to an upstream.
The filters compare the 'method' field of the rpc-call against the whitelist.

The only externally available method for now is "compute_transfer".

### Load balancing
The requests are distributed to the upstreams using round-robin.

## Proposed features
### Auto-scale
Based on the statistics, the proxy must be able to decide if new cluster-nodes should be added or if some can be removed.
It should use the kubernetes api from within the pod to scale the pathfinder deployment.
