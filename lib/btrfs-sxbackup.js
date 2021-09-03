import { execSync } from 'child_process'

import { logger } from './logger.js'

/**
 * Executes btrfs-sxbackup info action on given identifier.
 *
 * @param {string} path - backup path (source or destination)
 */

export const info = function (path) {
  const cmd = `btrfs-sxbackup info ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  const output = execSync(cmd).toString()
  if (output.search('ERROR') !== -1) {
    // throw new Error(output)
    return false
  }
  const outputParsed = output.matchAll(/^\s{3}(?<key>.+?)\s\s+(?<value>.+(?:\n {26}\w.+$)*)$/mg)
  // console.log(output.toString())
  // console.log(...outputParsed)
  const result = {}
  for (const item of outputParsed) {
    result[item.groups.key] = item.groups.value.replace(/^ {26}/gm, '')
  }
  return result
}

/**
 * Executes btrfs-sxbackup run action on given identifier.
 *
 * @param {string} path - backup path (source or destination)
 * @returns {string} - name of created subvolume
 */

export const run = function (path) {
  // We must pass destination to make ssh backup transfer works too
  const cmd = `btrfs-sxbackup run ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  const output = execSync(cmd)

  const outputParsed = output.toString().match(/(?<name>[^\s]+) created successfully/)

  if (!outputParsed.groups.name) {
    throw new Error('Missing success result')
  }

  return outputParsed.groups.name
}

/**
 * Executes btrfs-sxbackup purge action on given identifier.
 *
 * @param {string} path - backup path (source or destination)
 * @returns {true} - on success
 */

export const purge = function (path) {
  const cmd = `btrfs-sxbackup purge ${path}`
  logger.debug(`Executing cmd: ${cmd}`)
  execSync(cmd)
  return true
}

/**
 * Configuring the backup job.
 *
 * @param {object} job - job object
 * @param {string} action - init | update
 * @returns {true} - on success
 */
export const configure = function (job, action) {
  if (['init', 'update'].indexOf(action) === -1) {
    throw new Error('action argument must be only "init" or "update"')
  }
  const cmd = `btrfs-sxbackup ${action} -sr "${job.sourceRetention}" -dr "${job.destinationRetention}" ${job.source} ${job.destination}`
  logger.debug(`Executing cmd: ${cmd}`)
  // console.log(cmd)
  try {
    execSync(cmd)
  } catch (e) {
    throw new Error('Execution failed: ' + e.output.toString())
  }
  return true
}
