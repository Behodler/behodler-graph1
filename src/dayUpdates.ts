/* eslint-disable prefer-const */
import { BigDecimal } from '@graphprotocol/graph-ts'
import {
  LiquidityAdded as LiquidityAddedEvent,
  LiquidityWithdrawn as LiquidityWithdrawnEvent,
  Swap as SwapEvent,
} from "../generated/Behodler/Behodler"
import {
  Behodler as BehodlerEntity,
  BehodlerDayData
} from "../generated/schema"
import { getBehodlerSingleton } from "./token"
import { ZERO_BD } from "./math"

/**
 * Update added liquidity
 */
export function updateDayLiquidityAdded(event: LiquidityAddedEvent): BehodlerDayData {
  let behodler = BehodlerEntity.load('1')
  
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let behodlerDayData = BehodlerDayData.load(dayID.toString())
  if (behodlerDayData === null) {
    behodlerDayData = new BehodlerDayData(dayID.toString())
    behodlerDayData.date = dayStartTimestamp
    behodlerDayData.dailyVolumeUSD = ZERO_BD
    behodlerDayData.dailyVolumeETH = ZERO_BD
    behodlerDayData.totalVolumeUSD = ZERO_BD
    behodlerDayData.totalVolumeETH = ZERO_BD
    behodlerDayData.totalLiquidityUSD = ZERO_BD
    behodlerDayData.totalLiquidityETH = ZERO_BD
  }

  behodlerDayData.totalLiquidityUSD = behodler.usdLiquidity
  behodlerDayData.totalLiquidityETH = behodler.ethLiquidity
  behodlerDayData.save()

  return behodlerDayData as BehodlerDayData
}

/**
 * Update added liquidity
 */
export function updateDayLiquidityWithdrawn(event: LiquidityWithdrawnEvent): BehodlerDayData {
  let behodler = BehodlerEntity.load('1')
  
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let behodlerDayData = BehodlerDayData.load(dayID.toString())
  if (behodlerDayData === null) {
    behodlerDayData = new BehodlerDayData(dayID.toString())
    behodlerDayData.date = dayStartTimestamp
    behodlerDayData.dailyVolumeUSD = ZERO_BD
    behodlerDayData.dailyVolumeETH = ZERO_BD
    behodlerDayData.totalVolumeUSD = ZERO_BD
    behodlerDayData.totalVolumeETH = ZERO_BD
    behodlerDayData.totalLiquidityUSD = ZERO_BD
    behodlerDayData.totalLiquidityETH = ZERO_BD
  }

  behodlerDayData.totalLiquidityUSD = behodler.usdLiquidity
  behodlerDayData.totalLiquidityETH = behodler.ethLiquidity
  behodlerDayData.save()

  return behodlerDayData as BehodlerDayData
}

/**
 * Update daily ETH volume
 */
export function updateBehodlerDayVolumeETH(event: SwapEvent, volumeETH: BigDecimal): BehodlerDayData {
  let behodler = BehodlerEntity.load('1')
  
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let behodlerDayData = BehodlerDayData.load(dayID.toString())
  if (behodlerDayData === null) {
    behodlerDayData = new BehodlerDayData(dayID.toString())
    behodlerDayData.date = dayStartTimestamp
    behodlerDayData.dailyVolumeUSD = ZERO_BD
    behodlerDayData.dailyVolumeETH = ZERO_BD
    behodlerDayData.totalVolumeUSD = ZERO_BD
    behodlerDayData.totalVolumeETH = ZERO_BD
    behodlerDayData.totalLiquidityUSD = ZERO_BD
    behodlerDayData.totalLiquidityETH = ZERO_BD
  }

  behodlerDayData.dailyVolumeETH = behodlerDayData.dailyVolumeETH.plus(volumeETH)
  behodlerDayData.totalVolumeETH = behodler.ethVolume
  behodlerDayData.save()

  return behodlerDayData as BehodlerDayData
}

/**
 * Update daily USD volume
 */
export function updateBehodlerDayVolumeUSD(event: SwapEvent, volumeUSD: BigDecimal): BehodlerDayData {
  let behodler = BehodlerEntity.load('1')
  
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let behodlerDayData = BehodlerDayData.load(dayID.toString())
  if (behodlerDayData === null) {
    behodlerDayData = new BehodlerDayData(dayID.toString())
    behodlerDayData.date = dayStartTimestamp
    behodlerDayData.dailyVolumeUSD = ZERO_BD
    behodlerDayData.dailyVolumeETH = ZERO_BD
    behodlerDayData.totalVolumeUSD = ZERO_BD
    behodlerDayData.totalVolumeETH = ZERO_BD
    behodlerDayData.totalLiquidityUSD = ZERO_BD
    behodlerDayData.totalLiquidityETH = ZERO_BD
  }

  behodlerDayData.dailyVolumeUSD = behodlerDayData.dailyVolumeUSD.plus(volumeUSD)
  behodlerDayData.totalVolumeUSD = behodler.usdVolume
  behodlerDayData.save()

  return behodlerDayData as BehodlerDayData
}