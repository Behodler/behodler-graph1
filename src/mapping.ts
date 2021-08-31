import { log, BigInt, BigDecimal, Address, ethereum} from '@graphprotocol/graph-ts'
import {
  Behodler,
  Approval,
  Burn,
  LiquidityAdded as LiquidityAddedEvent,
  LiquidityWithdrawn as LiquidityWithdrawnEvent,
  Mint,
  OwnershipTransferred,
  Swap as SwapEvent,
  Transfer
} from "../generated/Behodler/Behodler"
import {
  Token,
  Swap,
  Liquidity,
  Behodler as BehodlerEntity
} from "../generated/schema"
import { getToken, isETH, isUSD, SCX_ADDRESS, fetchTokenBalanceOf, getBehodlerSingleton } from "./token"
import { convertToDecimal, ZERO_BD, ZERO_BI, TWO_BD } from "./math"
import { updateDayLiquidityAdded, updateDayLiquidityWithdrawn, updateBehodlerDayVolumeETH, updateBehodlerDayVolumeUSD } from "./dayUpdates"

let DEFAULT_DECIMAL = BigInt.fromI32(18)

let ONE = BigInt.fromString("1000000000000000000")

/*

The following is basic documentation about how to write mappings in The Graph
It includes an example function 'handleApproval' and some basic operations


export function handleApproval(event: Approval): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.owner = event.params.owner
  entity.spender = event.params.spender

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.Lachesis(...)
  // - contract.MIN_LIQUIDITY(...)
  // - contract.Weth(...)
  // - contract.allowance(...)
  // - contract.approve(...)
  // - contract.arbiter(...)
  // - contract.balanceOf(...)
  // - contract.burn(...)
  // - contract.config(...)
  // - contract.decimals(...)
  // - contract.getConfiguration(...)
  // - contract.getMaxLiquidityExit(...)
  // - contract.migrator(...)
  // - contract.name(...)
  // - contract.owner(...)
  // - contract.symbol(...)
  // - contract.tokenBurnable(...)
  // - contract.totalSupply(...)
  // - contract.transfer(...)
  // - contract.transferFrom(...)
  // - contract.validTokens(...)
  // - contract.whiteListUsers(...)
  // - contract.withdrawLiquidityFindSCX(...)
}
*/

/**
 * Block handler runs once per block that has a call to the contract (when specified with a call filter)
 * https://thegraph.com/docs/developer/create-subgraph-hosted#block-handlers
 *
 * This is a convenient way to calculate liquidity because it runs after all other handlers
 *
 * Unfortunately it's broken right now: https://github.com/graphprotocol/graph-node/issues/2314
 * so, we call it manually once at the beginning of a swap

 */
export function handleBlock(block: ethereum.Block) : void {

  let behodler = getBehodlerSingleton()

  behodler.ethLiquidity = ZERO_BD
  behodler.usdLiquidity = ZERO_BD

  // get list of all tokens
  let tokens = behodler.tokens

  let token : Token | null = null
  let scxAddress = Address.fromString(SCX_ADDRESS)

  for (let i = 0; i < tokens.length; i++) {
    token = Token.load(tokens[i])

    if(token == null){
      token.liquidity = ZERO_BD
      continue
    }

    // call balanceOf on each token with the SCX/Behodler address
    let balanceOf = fetchTokenBalanceOf(Address.fromString(token.id), scxAddress)

    let balance = convertToDecimal(balanceOf, token.decimals)

    token.liquidity = balance

    behodler.ethLiquidity += token.liquidity * token.eth
    behodler.usdLiquidity += token.liquidity * token.usd

    token.save()
  }


  behodler.save()
}

export function handleApproval(event: Approval): void {}

export function handleBurn(event: Burn): void {}

export function handleLiquidityAdded(event: LiquidityAddedEvent): void {

  /*
    event LiquidityAdded(
        address sender,
        address token,
        uint256 tokenValue,
        uint256 scx
    )
    */
  // recommended in docs (https://thegraph.com/docs/developer/create-subgraph-hosted#recommended-ids-for-creating-new-entities)
  // event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let liquidity = new Liquidity(event.transaction.hash.toHexString())

  let token = getToken(event.params.token)

  let amount = convertToDecimal(event.params.tokenValue, token.decimals)

  let scxAmount = convertToDecimal(event.params.scx, DEFAULT_DECIMAL)


  liquidity.direction = "Add"
  liquidity.token = token.id
  liquidity.amount = amount
  liquidity.scx = scxAmount

  liquidity.transaction = event.transaction.hash.toHexString()
  liquidity.timestamp = event.block.timestamp

  liquidity.save()


  // look for ETH and USD exchanges to calculate SCX price
  let scxToken = getToken(Address.fromString(SCX_ADDRESS))

  updateETHPrice(<Token>scxToken, <Token>token, scxAmount, amount, event.block)
  updateUSDPrice(<Token>scxToken, <Token>token, scxAmount, amount, event.block)

  //updateVolume(<Token>token, <Token>scxToken, amount, scxAmount)

  scxToken.save()

  // Update daily data
  updateDayLiquidityAdded(event)
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawnEvent): void {

  /*
    event LiquidityWithdrawn(
        address recipient,
        address token,
        uint256 tokenValue,
        uint256 scx
    )
  */
  let liquidity = new Liquidity(event.transaction.hash.toHexString())

  let token = getToken(event.params.token)

  let amount = convertToDecimal(event.params.tokenValue, token.decimals)

  let scxAmount = convertToDecimal(event.params.scx, DEFAULT_DECIMAL)


  liquidity.direction = "Withdraw"
  liquidity.token = token.id
  liquidity.amount = amount
  liquidity.scx = scxAmount


  liquidity.transaction = event.transaction.hash.toHexString()
  liquidity.timestamp = event.block.timestamp

  liquidity.save()


  // look for ETH and USD exchanges to calculate SCX price
  let scxToken = getToken(Address.fromString(SCX_ADDRESS))

  updateETHPrice(<Token>token, <Token>scxToken, amount, scxAmount, event.block)
  updateUSDPrice(<Token>token, <Token>scxToken, amount, scxAmount, event.block)

  //updateVolume(<Token>token, <Token>scxToken, amount, scxAmount)

  scxToken.save()

  // Update daily data
  updateDayLiquidityWithdrawn(event)
}


export function handleMint(event: Mint): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleSwap(event: SwapEvent): void {

  /* SwapEvent, event.params: (from the Behodler contract)
      address sender,
      address inputToken,
      address outputToken,
      uint256 inputValue,
      uint256 outputValue
  */
  let swap = new Swap(event.transaction.hash.toHexString())

  /*
  let swap = new SwapEvent(
    event.transaction.hash
      .toHexString()
      .concat('-')
      .concat(BigInt.fromI32(swaps.length).toString())
  )
  */


  // retrieve/create the tokens
  let token0 = getToken(event.params.inputToken)
  let token1 = getToken(event.params.outputToken)

  if(token0 === null || token1 === null){
    return
  }


  // convert values to float
  let inputAmount = convertToDecimal(event.params.inputValue, token0.decimals)
  let outputAmount = convertToDecimal(event.params.outputValue, token1.decimals)


  // update values for swap and save
  swap.timestamp = event.block.timestamp
  swap.transaction = event.transaction.hash.toHexString()
  swap.sender = event.params.sender
  swap.inputToken = token0.id
  swap.outputToken = token1.id
  swap.inputAmount = inputAmount as BigDecimal
  swap.outputAmount = outputAmount as BigDecimal

  swap.save()

  // check for price signals
  updateETHPrice(<Token>token0, <Token>token1, inputAmount, outputAmount, event.block)
  updateUSDPrice(<Token>token0, <Token>token1, inputAmount, outputAmount, event.block)

  updateVolume(<Token>token0, <Token>token1, inputAmount, outputAmount, event)


  // this whole section is a hack to workaround the bug that prevents
  // blockhandlers from running when specified with a call filter
  // when that bug gets fixed remove this section and the 'block' property from the singleton
  // https://github.com/graphprotocol/graph-node/issues/2314
  let behodler = getBehodlerSingleton()

  if(behodler.block < event.block.number){
    behodler.block = event.block.number
    behodler.save()
    handleBlock(event.block)
  }

}

export function handleTransfer(event: Transfer): void {}


/**
 * Update the volume information for both tokens based on a swap.
 */
function updateVolume(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal, event: SwapEvent): void {

  let behodler = getBehodlerSingleton()

  token0.volume += inputAmount
  token1.volume += outputAmount

  let inputVolume = inputAmount*<BigDecimal>token0.eth
  let outputVolume = outputAmount*<BigDecimal>token1.eth

  if(inputVolume > ZERO_BD && outputVolume > ZERO_BD){
    // volume amounts should theoretically be the same, but in practice won't be
    // we average to get a better approximation to the actual value
    token0.ethVolume += (inputVolume + outputVolume) / TWO_BD
    token1.ethVolume += (inputVolume + outputVolume) / TWO_BD

    behodler.ethVolume += (inputVolume + outputVolume) / TWO_BD
    updateBehodlerDayVolumeETH(event, ((inputVolume + outputVolume) / TWO_BD))

  } else if(inputVolume > ZERO_BD){
    // this section uses a single volume value in case one token doesn't have an eth value yet
    token0.ethVolume += inputVolume
    token1.ethVolume += inputVolume

    behodler.ethVolume += inputVolume
    updateBehodlerDayVolumeETH(event, inputVolume)
  } else if(outputVolume > ZERO_BD){
    token0.ethVolume += outputVolume
    token1.ethVolume += outputVolume

    behodler.ethVolume += outputVolume
    updateBehodlerDayVolumeETH(event, outputVolume)
  }

  // Do the same thing for USD
  inputVolume = inputAmount*<BigDecimal>token0.usd
  outputVolume = outputAmount*<BigDecimal>token1.usd

  if(inputVolume > ZERO_BD && outputVolume > ZERO_BD){
    // volume amounts should theoretically be the same, but in practice won't be
    // we average to get a better approximation to the actual value
    token0.usdVolume += (inputVolume + outputVolume) / TWO_BD
    token1.usdVolume += (inputVolume + outputVolume) / TWO_BD

    behodler.usdVolume += (inputVolume + outputVolume) / TWO_BD
    updateBehodlerDayVolumeUSD(event, ((inputVolume + outputVolume) / TWO_BD))

  } else if(inputVolume > ZERO_BD){
    // this section uses a single volume value in case one token doesn't have a usd value yet
    token0.usdVolume += inputVolume
    token1.usdVolume += inputVolume

    behodler.usdVolume += inputVolume
    updateBehodlerDayVolumeUSD(event, inputVolume)
  } else if(outputVolume > ZERO_BD){
    token0.usdVolume += outputVolume
    token1.usdVolume += outputVolume

    behodler.usdVolume += outputVolume
    updateBehodlerDayVolumeUSD(event, outputVolume)
  }

  token0.save()
  token1.save()

  behodler.save()
}

/**
 * Update price for a token in ether, if possible.
 *
 * Will update price for a token if the other is ETH or has a more recent
 * update block for it's price. Also records the block number for the price update.
 */
function updateETHPrice(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal, block: ethereum.Block): void {
  if (inputAmount > ZERO_BD && outputAmount > ZERO_BD) {
    // is the first token ETH?
    if(isETH(token0)){
      // yes, update the other token
      token1.eth = inputAmount / outputAmount
      token1.ethTimestamp = block.timestamp
      token1.ethBlock = block.number

      token1.save()
    } else if(isETH(token1)){
      // second token is ETH, update first
      token0.eth = outputAmount / inputAmount
      token0.ethTimestamp = block.timestamp
      token0.ethBlock = block.number

      token0.save()
    } else if(token0.ethBlock !== null || token1.ethBlock !== null){
      // neither is ETH, check last update block

      // propagate eth price between tokens from more recent blocks
      if(<BigInt>token0.ethBlock > <BigInt>token1.ethBlock) {
        token1.eth = (token0.eth *  inputAmount) / outputAmount
        token1.ethBlock = token0.ethBlock
        token1.ethTimestamp = token0.ethTimestamp

        token1.save()

      } else if(<BigInt>token1.ethBlock > <BigInt>token0.ethBlock) {
        token0.eth = (token1.eth * outputAmount) / inputAmount
        token0.ethBlock = token1.ethBlock
        token0.ethTimestamp = token1.ethTimestamp

        token0.save()
      }
    }
  }
}

/**
 * Update price for a token in USD, if possible.
 *
 * Will update price for a token if the other is a USD stablecoin or has a
 * more recent update block for it's price. Also records the block number
 * for the price update.
 */
function updateUSDPrice(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal, block: ethereum.Block): void {

  // is the first token USD?
  if(isUSD(token0)){
    // yes, update second token
    token1.usd = inputAmount / outputAmount
    token1.usdTimestamp = block.timestamp
    token1.usdBlock = block.number

    token1.save()
  } else if(isUSD(token1)){
    // second token is USD, update first
    token0.usd = outputAmount / inputAmount
    token0.usdTimestamp = block.timestamp
    token0.usdBlock = block.number

    token0.save()
  } else if(token0.usdBlock !== null || token1.usdBlock !== null){
    // neither is USD, check last update block

    // propagate usd price between tokens from more recent blocks
    if(<BigInt>token0.usdBlock > <BigInt>token1.usdBlock) {
      token1.usd = (token0.usd * inputAmount) / outputAmount
      token1.usdBlock = token0.usdBlock
      token1.usdTimestamp = token0.usdTimestamp

      token1.save()

    } else if(<BigInt>token1.usdBlock > <BigInt>token0.usdBlock) {
      token0.usd = (token1.usd * outputAmount) / inputAmount
      token0.usdBlock = token1.usdBlock
      token0.usdTimestamp = token1.usdTimestamp

      token0.save()
    }
  }
}
