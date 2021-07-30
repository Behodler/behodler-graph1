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
  Swap as SwapEvent
} from "../generated/schema"
import { getToken, isETH, isUSD } from "./token"
import { convertToDecimal, ZERO_BD, ZERO_BI } from "./math"

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

  /*
  address sender,
  address inputToken,
  address outputToken,
  uint256 inputValue,
  uint256 outputValue
  */


}

function updateETHPrice(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal, block: ethereum.Block): void {
  if(isETH(token0)){
    token1.eth = inputAmount / outputAmount
    token1.ethtimestamp = block.timestamp
    token1.ethblock = block.number

    token1.save()
  } else if(isETH(token1)){
    token0.eth = outputAmount / inputAmount
    token0.ethtimestamp = block.timestamp
    token0.ethblock = block.number

    token0.save()
  } else if(token0.ethblock !== null || token1.ethblock !== null){

    // propagate eth price between tokens from more recent blocks
    if(<BigInt>token0.ethblock > <BigInt>token1.ethblock) {
      token1.eth = (token0.eth *  inputAmount) / outputAmount
      token1.ethblock = token0.ethblock
      token1.ethtimestamp = token0.ethtimestamp

      token1.save()

    } else if(<BigInt>token1.ethblock > <BigInt>token0.ethblock) {
      token0.eth = (token1.eth * outputAmount) / inputAmount
      token0.ethblock = token1.ethblock
      token0.ethtimestamp = token1.ethtimestamp

      token0.save()
    }
  }
}

function updateUSDPrice(token0: Token, token1: Token, inputAmount: BigDecimal, outputAmount: BigDecimal, block: ethereum.Block): void {
  if(isUSD(token0)){
    token1.usd = inputAmount / outputAmount
    token1.usdtimestamp = block.timestamp
    token1.usdblock = block.number

    token1.save()
  } else if(isUSD(token1)){
    token0.usd = outputAmount / inputAmount
    token0.usdtimestamp = block.timestamp
    token0.usdblock = block.number

    token0.save()
  } else if(token0.usdblock !== null || token1.usdblock !== null){

    // propagate eth price between tokens from more recent blocks
    if(<BigInt>token0.usdblock > <BigInt>token1.usdblock) {
      token1.usd = (token0.usd * inputAmount) / outputAmount
      token1.usdblock = token0.usdblock
      token1.usdtimestamp = token0.usdtimestamp

      token1.save()

    } else if(<BigInt>token1.usdblock > <BigInt>token0.usdblock) {
      token0.usd = (token1.usd * outputAmount) / inputAmount
      token0.usdblock = token1.usdblock
      token0.usdtimestamp = token1.usdtimestamp

      token0.save()
    }
  }
}

export function handleTransfer(event: Transfer): void {}
