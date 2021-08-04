// code adapted from uniswap
import { log, BigInt, BigDecimal} from '@graphprotocol/graph-ts'
import {
  Address,
  BigInt,
} from "@graphprotocol/graph-ts"
import { ERC20 } from '../generated/Behodler/ERC20'
import { ERC20SymbolBytes } from '../generated/Behodler/ERC20SymbolBytes'
import { ERC20NameBytes } from '../generated/Behodler/ERC20NameBytes'
import { Token } from "../generated/schema"
import { convertToDecimal, ZERO_BD, ZERO_BI, ONE_BD } from "./math"



export const WETH10_ADDRESS = "0x4f5704d9d2cbccaf11e70b34048d41a0d572993f"
export const WETH_ADDRESS   = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
export const DAI_ADDRESS    = "0x6b175474e89094c44da98b954eedeac495271d0f"

export function isETH(token: Token): boolean {
  return token.id == WETH10_ADDRESS || token.id == WETH_ADDRESS
}

export function isUSD(token: Token) : boolean {
  return token.id == DAI_ADDRESS
}

export function getToken(tokenAddress: Address): Token | null {

  // try loading an existing token
  let token = Token.load(tokenAddress.toHexString())

  // new token?
  if (token === null) {
    // yes, fetch info and create new token
    token = new Token(tokenAddress.toHexString())
    token.symbol = fetchTokenSymbol(tokenAddress)
    token.name = fetchTokenName(tokenAddress)
    token.totalSupply = fetchTokenTotalSupply(tokenAddress)
    let decimals = fetchTokenDecimals(tokenAddress)

    if (decimals === null) {
      log.debug('BUG: the decimal on token 0 was null', [])
      return null
    }

    token.decimals = decimals
    if(isETH(<Token>token)){
      token.eth = ONE_BD
    } else {
      token.eth = ZERO_BD
    }
    token.ethTimestamp = ZERO_BI
    token.ethBlock = ZERO_BI

    if(isUSD(<Token>token)){
      token.usd = ONE_BD
    } else {
      token.usd = ZERO_BD
    }
    token.usdTimestamp = ZERO_BI
    token.usdBlock = ZERO_BI


    token.volume = ZERO_BD
    token.usdVolume = ZERO_BD
    token.ethVolume = ZERO_BD

    /*
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token0.txCount = ZERO_BI
    */

    token.save()
  }

  return token

}


// Store information about tokens that may not be available through other means
export class StaticToken {
  address : Address
  symbol: string
  name: string
  decimals: BigInt

  // Create a Static Token
  constructor(address: Address, symbol: string, name: string, decimals: BigInt) {
    this.address = address
    this.symbol = symbol
    this.name = name
    this.decimals = decimals
  }

  // Get all tokens with a static defintion
  static getStaticDefinitions(): Array<StaticToken> {
    let staticDefinitions = new Array<StaticToken>(1)

    // Maker
    let token = new StaticToken(
      Address.fromString('0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'),
      'MKR',
      'Maker',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(token)

    // Kleros
    token = new StaticToken(
      Address.fromString('0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d'),
      'PNK',
      'Kleros', // contract returns 'Pinakion'
      BigInt.fromI32(18)
    )
    staticDefinitions.push(token)

    return staticDefinitions
  }

  // Helper for hardcoded tokens
  static fromAddress(tokenAddress: Address) : StaticToken | null {
    let staticDefinitions = this.getStaticDefinitions()
    let tokenAddressHex = tokenAddress.toHexString()

    // Search the definition using the address
    for (let i = 0; i < staticDefinitions.length; i++) {
      let staticDefinition = staticDefinitions[i]
      if(staticDefinition.address.toHexString() == tokenAddressHex) {
        return staticDefinition
      }
    }

    // If not found, return null
    return null
  }

}


export function isNullValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  // static definitions overrides
  let staticDefinition = StaticToken.fromAddress(tokenAddress)
  if(staticDefinition != null) {
    return (staticDefinition as StaticToken).symbol
  }

  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
  // static definitions overrides
  let staticDefinition = StaticToken.fromAddress(tokenAddress)
  if(staticDefinition != null) {
    return (staticDefinition as StaticToken).name
  }

  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let totalSupplyValue = null
  let totalSupplyResult = contract.try_totalSupply()
  if (!totalSupplyResult.reverted) {
    totalSupplyValue = totalSupplyResult as i32
  }
  return BigInt.fromI32(totalSupplyValue as i32)
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  // static definitions overrides
  let staticDefinition = StaticToken.fromAddress(tokenAddress)
  if(staticDefinition != null) {
    return (staticDefinition as StaticToken).decimals
  }

  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = null
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return BigInt.fromI32(decimalValue as i32)
}
