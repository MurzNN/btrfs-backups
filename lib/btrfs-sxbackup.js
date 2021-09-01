import { execSync } from 'child_process'

/**
 * Executes btrfs-sxbackup info action on given url.
 *
 * @param {string} url - backup identifier (source or destination)
 */

export const info = function (url) {
  const output = execSync(`btrfs-sxbackup info ${url}`).toString()
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
 * Executes btrfs-sxbackup run action on given url.
 *
 * @param {string} url - backup identifier (source or destination)
 */

export const run = function (url) {
  const output = execSync(`btrfs-sxbackup run ${url}`)

  const outputParsed = output.toString().match(/(?<name>[^\s]+) created successfully/)

  if (!outputParsed.groups.name) {
    throw new Error('Missing success result')
  }

  return outputParsed.groups.name
}

/**
 * Executes btrfs-sxbackup purge action on given url.
 *
 * @param {string} url - backup identifier (source or destination)
 */

export const purge = function (url) {
  execSync(`btrfs-sxbackup purge ${url}`)
}

/**
 * Configuring the backup job.
 *
 * @param {string} action - init | update
 * @param {string} source - source location
 * @param {string} destination - destination location
 * @param {string} sr - source retention rules
 * @param {string} dr - destination retention rules
 */
export const configure = function (action, source, destination, sr, dr) {
  if (['init', 'update'].indexOf(action) === -1) {
    throw new Error('action argument must be only "init" or "update"')
  }
  const cmd = `btrfs-sxbackup ${action} -sr "${sr}" -dr "${dr}" ${source} ${destination}`
  // console.log(cmd)
  try {
    execSync(cmd)
  } catch (e) {
    throw new Error('Execution failed: ' + e.output.toString())
  }
}
