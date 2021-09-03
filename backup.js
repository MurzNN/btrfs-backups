#!/usr/bin/env node

import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { performance } from 'perf_hooks'
import { serializeError } from 'serialize-error'
import * as diskusage from 'diskusage'
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
 * @param {string} jobId - job name, matching to config file key
 */

const backupDo = function (jobId) {
  const job = makeJobObject(jobId)
  let op
  const timings = {}
  try {
    timings.start = performance.now()

    op = 'run'
    const subvolume = sxbackup.run(job.destination)
    timings[op] = performance.now()

    op = 'statistics'
    const destinationDu = diskusage.checkSync(job.destination)
    const subvolumesDu = btrfs.subvolumesDu(job.destination)
    const subvolumeStat = {
      used: subvolumesDu.subvolumes[subvolume].total,
      exclusive: subvolumesDu.subvolumes[subvolume].exclusive,
      exclusiveTotal: subvolumesDu.exclusive,
      total: destinationDu.total,
      free: destinationDu.available
    }
    timings[op] = performance.now()

    op = 'checkDestination'
    const checkStat = btrfs.check(job.destination)
    timings[op] = performance.now()

    logger.info({
      function: 'backupDo',
      jobId,
      job,
      checkStat,
      subvolumeStat,
      duration: timingsToSpans(timings)
    }, `Backup job ${jobId} finished`)
  } catch (e) {
    logger.error({
      function: 'backupDo',
      jobId,
      job,
      stage: op,
      exception: serializeError(e)
    }, `Backup job ${jobId} failed on stage '${op}'`)
  }
}

/**
 * Configures a backup job (creates new or updates config).
 *
 * @param {string} jobId - job name, matching to config file key
 */

export const backupConfigure = function (jobId) {
  const job = makeJobObject(jobId)
  const action = sxbackup.info(job.destination) === false
    ? 'init'
    : 'update'
  sxbackup.configure(job, action)
  logger.info({
    function: 'backupConfigure',
    jobId,
    job
  }, `Backup job ${jobId} configured`)
}

/**
 * Generate the full job object from config by id
 *
 * @param {string} jobId - job identifier
 */
const makeJobObject = function (jobId) {
  return {
    ...config.jobDefaults,
    ...config.jobs[jobId]
  }
}

/**
 * Launches the configure job for all configured backup jobs.
 *
 * @param {string} argv - cli arguments
 */

const doConfiguration = function (argv = {}) {
  logger.info('Update backup jobs started')
  for (const jobId in config.jobs) {
    backupConfigure(jobId)
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
  for (const jobId in config.jobs) {
    backupDo(jobId)
  }
  logger.info('Backup process finished')
}

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .command('configure', 'Configure (create and update) backup jobs', () => {}, (argv) => {
    doConfiguration(argv)
  })
  .command('backup', 'Execute backup jobs', () => {}, (argv) => {
    doBackups(argv)
  })
  .demandCommand(1)
  .argv
