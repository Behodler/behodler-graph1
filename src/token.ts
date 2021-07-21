// code adapted from uniswap

import {
  Address,
  BigInt,
} from "@graphprotocol/graph-ts"
import { ERC20 } from '../generated/Behodler/ERC20'
import { ERC20SymbolBytes } from '../generated/Behodler/ERC20SymbolBytes'
import { ERC20NameBytes } from '../generated/Behodler/ERC20NameBytes'

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
    let tokenMaker = new StaticToken(
      Address.fromString('0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'),
      'MKR',
      'Maker',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(tokenMaker)

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
