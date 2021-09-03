import { execSync } from 'child_process'

import { logger } from './logger.js'

/**
 * Parses statistics of `btrfs fi df` function.
 *
 * @param {string} path - path to btrfs volume
 * @returns {object} - parsed statistics
 */

export function du (path) {
  const cmd = `btrfs fi df -b ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  const output = execSync(cmd)
  const outputParsed = output.toString().matchAll(/(?<type>.*), (?<raid>.*): total=(?<total>.*), used=(?<used>.*)/mg)
  const result = {}
  for (const line of outputParsed) {
    result[line.groups.type] = {
      raid: line.groups.raid,
      total: line.groups.total,
      used: line.groups.used
    }
  }
  return result
}

/**
 * Checks btrfs filesystem status.
 *
 * @param {string} url - url to btrfs volume
 * @returns {object} - detailed statistic of checking
 */

export const check = function (url) {
  const du = this.du(url)
  const result = {
    status: true
  }
  const errors = []
  for (const dataType in du) {
    if (dataType !== 'GlobalReserve' && du[dataType].raid !== 'RAID1') {
      errors.push(`${dataType} is not on RAID1`)
    }
    // @todo Wrong info, rework to df
    // const usage = (du[dataType].used / du[dataType].total)
    // if (usage > 0.8) {
    //   errors.push(`${dataType} lacking of free space (` + Math.round(usage * 100) + '% used)')
    // }
  }
  const subvolumesDu = this.subvolumesDu(url)
  if (this.errorsCheck(url) !== true) {
    errors.push('BTRFS volume errors detected')
  }

  if (errors.length) {
    result.status = false
    result.errors = errors
  }

  result.snapshotsCount = Object.keys(subvolumesDu.subvolumes).length

  result.size = {
    total: du.Data.total,
    used: du.Data.used,
    exclusive: subvolumesDu.exclusive
  }
  return result
}

/**
 * Checks the disk usage of subvolumes.
 *
 * @param {string} path - path to btrfs volume
 * @returns {object} - detailed statistic of checking
 */

export function subvolumesDu (path) {
  const cmd = `btrfs-du -b ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  const output = execSync(cmd)
  const { groups: { exclusive } } = output.toString().match(/Total exclusive data\s+(?<exclusive>.+)/)
  const result = {
    exclusive: exclusive,
    subvolumes: {}
  }
  const subvolumes = output.toString().matchAll(/^(?<subvolume>[^\s]+)\s+(?<total>\d+)\s+(?<exclusive>\d+)\s+(?<id>\d+)\s*$/gm)
  for (const line of subvolumes) {
    result.subvolumes[line.groups.subvolume] = {
      total: line.groups.total,
      exclusive: line.groups.exclusive
    }
  }
  return result
}

/**
 * Checks the btrfs device for cached errors.
 *
 * @param {string} path - path to btrfs volume
 * @throws {Error} when `btrfs device stats -c` returns error code 1
 * @returns {true} - if no errors detected
 */

export function errorsCheck (path) {
  const cmd = `btrfs device stats -c ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  try {
    execSync(cmd)
  } catch (e) {
    throw new Error('Errors detected: ' + e.output.toString())
  }
  return true
}
