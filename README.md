Subgraph definition for Behodler for The Graph


example queries:

Get a list of all tokens ever used in swaps
```{
  tokens{
    id
    name
    symbol
    decimals
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
