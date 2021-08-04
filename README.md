Subgraph definition for Behodler for The Graph


example queries:

Get a list of all tokens ever used in swaps
```
{
  tokens{
    id
    name
    symbol
    eth
    usd
  }
}
```

Get a list of all swaps, most recent first
```
{
  swaps(orderBy: timestamp, orderDirection: desc){
    id
    transaction
    timestamp
    sender
    inputToken {
      id
      symbol
    }
    outputToken {
      id
      symbol
    }
    inputAmount
    outputAmount
  }
}
```


# Development

Adapted from the [documentation](https://thegraph.com/docs/developer/quick-start)

When using a hosted ethereum data provider, change the following:

  * start block: `startBlock` in `subgraph.yaml` (one month ~172800 blocks)
  * eth data provider, polling interval: `ethereum` and `ethereum_polling_interval` in `docker-compose.yaml`

These changes allow testing with less request/data use.


Start local graph node instance
```
docker-compose up
```

Build and deploy the subgraph locally
```
yarn codegen

yarn create-local

yarn deploy-local
```
