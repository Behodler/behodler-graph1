import { log, BigInt, BigDecimal, ethereum} from '@graphprotocol/graph-ts'
import {
  Behodler,
  Approval,
  Burn,
  LiquidityAdded,
  LiquidityWithdrawn,
  Mint,
  OwnershipTransferred,
  Swap,
  Transfer
} from "../generated/Behodler/Behodler"
import {
  Token,
  Swap as SwapEvent,
  Behodler as BehodlerEntity
} from "../generated/schema"
import { getToken, isETH, isUSD } from "./token"
import { convertToDecimal, ZERO_BD, ZERO_BI, TWO_BD } from "./math"

let DEFAULT_DECIMAL = BigInt.fromI32(18)

/*
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

export function handleApproval(event: Approval): void {}

export function handleBurn(event: Burn): void {}

export function handleLiquidityAdded(event: LiquidityAdded): void {}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawn): void {}

export function handleMint(event: Mint): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleSwap(event: Swap): void {

  let swap = new SwapEvent(event.transaction.hash.toHexString())

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

  updateVolume(<Token>token0, <Token>token1, inputAmount, outputAmount)

  /*
  address sender,
  address inputToken,
  address outputToken,
  uint256 inputValue,
  uint256 outputValue
  */


}

/**
 * Update the volume information for both tokens based on a swap.
 */
function updateVolume(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal): void {

  let behodler = BehodlerEntity.load('1')

  if(behodler == null){
    behodler = new BehodlerEntity('1')
    behodler.ethVolume = ZERO_BD
    behodler.usdVolume = ZERO_BD
    behodler.ethLiquidity = ZERO_BD
    behodler.usdLiquidity = ZERO_BD
  }

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

  } else if(inputVolume > ZERO_BD){
    // this section does something useful in case one token doesn't have an eth value yet
    token0.ethVolume += inputVolume
    token1.ethVolume += inputVolume

    behodler.ethVolume += inputVolume
  } else if(outputVolume > ZERO_BD){
    token0.ethVolume += outputVolume
    token1.ethVolume += outputVolume

    behodler.ethVolume += outputVolume
  }

  inputVolume = inputAmount*<BigDecimal>token0.usd
  outputVolume = outputAmount*<BigDecimal>token1.usd

  if(inputVolume > ZERO_BD && outputVolume > ZERO_BD){
    // volume amounts should theoretically be the same, but in practice won't be
    // we average to get a better approximation to the actual value
    token0.usdVolume += (inputVolume + outputVolume) / TWO_BD
    token1.usdVolume += (inputVolume + outputVolume) / TWO_BD

    behodler.usdVolume += (inputVolume + outputVolume) / TWO_BD

  } else if(inputVolume > ZERO_BD){
    token0.usdVolume += inputVolume
    token1.usdVolume += inputVolume

    behodler.usdVolume += inputVolume
  } else if(outputVolume > ZERO_BD){
    token0.usdVolume += outputVolume
    token1.usdVolume += outputVolume

    behodler.usdVolume += outputVolume
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

export function handleTransfer(event: Transfer): void {}
