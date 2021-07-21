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

Get a list of all swaps
```
{
  swaps{
    id
    transaction
  	timestamp
  	sender
  	inputTokenAddress
  	outputTokenAddress
  	inputAmount
  	outputAmount
  }
}
```
