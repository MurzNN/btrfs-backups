#!/usr/bin/env node

import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { performance } from 'perf_hooks'
import { serializeError } from 'serialize-error'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { logger } from './lib/logger.js'
import { timingsToSpans } from './lib/utils.js'
import * as sxbackup from './lib/btrfs-sxbackup.js'
import * as btrfs from './lib/btrfs.js'

const configFile = 'config.yaml'

/* Loading the config file */
let config
try {
  const fileContents = fs.readFileSync(new URL(configFile, import.meta.url), 'utf8')
  config = yaml.load(fileContents)
} catch (e) {
  console.log(e)
  logger.error(serializeError(e), 'Probjems with loading config file \'config.yaml\'')
  process.exit(1)
}

/**
 * Does a single backup job.
 *
 * @param {string} job - job name, matching to config file key
 */

const backupDo = function (job) {
  let op
  const timings = {}
  try {
    timings.start = performance.now()
    op = 'info'
    const info = sxbackup.info(job)
    timings[op] = performance.now()

    op = 'run'
    sxbackup.run(info['Source URL'])
    timings[op] = performance.now()

    op = 'check'
    const checkStat = btrfs.check(info['Destination URL'])
    timings[op] = performance.now()
    const stat = {
      ...checkStat,
      timings: timingsToSpans(timings)
    }
    logger.info({
      function: 'backupDo',
      job,
      ...stat
    }, `Backup job ${job} finished`)
  } catch (e) {
    logger.error({
      function: 'backupDo',
      job: job,
      stage: op,
      exception: serializeError(e)
    }, `Backup job ${job} failed on stage '${op}'`)
  }
}

/**
 * Configures a backup job (creates new or updates config).
 *
 * @param {string} job - job name, matching to config file key
 */

export const backupConfigure = function (job) {
  const action = sxbackup.info(job) === false
    ? 'init'
    : 'update'
  sxbackup.configure(
    action,
    job,
    config.jobs[job].destination,
    job.retention?.source ?? config.retentionDefault.source,
    job.retention?.destination ?? config.retentionDefault.destination
  )
  logger.info({
    function: 'backupConfigure',
    source: job,
    destination: config.jobs[job].destination,
    sr: job.retention?.source ?? config.retentionDefault.source,
    dr: job.retention?.destination ?? config.retentionDefault.destination
  }, `Backup job ${job} configured`)
}

/**
 * Launches the configure job for all configured backup jobs.
 *
 * @param {string} argv - cli arguments
 */

const doConfigure = function (argv = {}) {
  logger.info('Update backup jobs started')
  for (const job in config.jobs) {
    backupConfigure(job)
  }
  logger.info('Update backup jobs finished')
}

/**
 * Launches the backup job for all configured backup jobs.
 *
 * @param {string} argv - cli arguments
 */

const doBackups = function (argv = {}) {
  logger.info('Backup process started')
  for (const job in config.jobs) {
    backupDo(job)
  }
  logger.info('Backup process finished')
}

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .command('configure', 'Configure (create and update) backup jobs', () => {}, (argv) => {
    doConfigure(argv)
  })
  .command('backup', 'Execute backup jobs', () => {}, (argv) => {
    doBackups(argv)
  })
  .demandCommand(1)
  .argv
