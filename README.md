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


Get total swap volume (all swaps) and current liquidity
```
{
  behodler(id:1)
    {
      ethVolume
      usdVolume
      ethLiquidity
      usdLiquidity
    }
}
```

Get a list of all liquidity transactions, most recent first
```
{
  liquidities(orderBy: timestamp, orderDirection: desc){
    id
    timestamp
    direction
    token {
      id
      symbol
    }
    amount
    scx
  }
}
```


# Development

Adapted from the [documentation](https://thegraph.com/docs/developer/quick-start)


For local development you can use hardhat to fork and cache a hosted ethereum node. Hardhat recommends Alchemy for the hosted node provider.
The block number is required to enabled local caching. This replaces the steps involving `ganache` in the official documentation.

```
npx hardhat node --fork <eth_provider> --hostname 0.0.0.0 --fork-block-number <block_number>
```

This should function as a drop-in replacement for `ganache`.

When using a hosted ethereum data provider, you can also change the following to minimize request/data/compute use.

  * start block: `startBlock` in `subgraph.yaml` (one month ~172800 blocks)
  * eth polling interval: `ethereum_polling_interval` in `docker-compose.yaml` (unit is milliseconds, 15000 is 15 seconds)



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
