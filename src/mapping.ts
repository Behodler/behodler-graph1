import { log, BigInt, BigDecimal} from '@graphprotocol/graph-ts'
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
import {
  StaticToken,
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply
} from "./token"
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

/*
  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)
*/

  // create the tokens
  let token0 = Token.load(event.params.inputToken.toHexString())
  let token1 = Token.load(event.params.outputToken.toHexString())

  // fetch info if null
  if (token0 === null) {
    token0 = new Token(event.params.inputToken.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.inputToken)
    token0.name = fetchTokenName(event.params.inputToken)
    token0.totalSupply = fetchTokenTotalSupply(event.params.inputToken)
    let decimals = fetchTokenDecimals(event.params.inputToken)

    if (decimals === null) {
      log.debug('BUG: the decimal on token 0 was null', [])
      return
    }

    token0.decimals = decimals
    /*
    token0.derivedETH = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token0.txCount = ZERO_BI
    */

    token0.save()
  }

  if(token1 === null) {
    token1 = new Token(event.params.outputToken.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.outputToken)
    token1.name = fetchTokenName(event.params.outputToken)
    token1.totalSupply = fetchTokenTotalSupply(event.params.outputToken)
    let decimals = fetchTokenDecimals(event.params.outputToken)

    if (decimals === null) {
      log.debug('BUG: the decimal on token 0 was null', [])
      return
    }

    token1.decimals = decimals
    /*
    token1.derivedETH = ZERO_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.untrackedVolumeUSD = ZERO_BD
    token1.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token1.txCount = ZERO_BI
    */
    token1.save()
  }

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
  /*
  address sender,
  address inputToken,
  address outputToken,
  uint256 inputValue,
  uint256 outputValue
  */


}

export function handleTransfer(event: Transfer): void {}
