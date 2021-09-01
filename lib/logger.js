import { pino } from 'pino'
import dotenv from 'dotenv'

dotenv.config()

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'debug',
  redact: {
    paths: ['hostname', 'pid'],
    remove: true
  },
  formatters: {
    level: (label) => {
      return { level: label }
    }
  }
})
