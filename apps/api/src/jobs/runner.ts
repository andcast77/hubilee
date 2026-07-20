import cron from 'node-cron'
import { runInventoryAlertJob } from './inventory-alert.job.js'
import { runScheduledReportJob } from './scheduled-report.job.js'
import { runInvoiceReminderJob } from './invoice-reminder.job.js'
import { runBackupJob } from './backup.job.js'
import { runTechReminderJob } from './tech-reminder.job.js'
import { runDataRetentionJob } from './data-retention.job.js'

type ScheduledTask = ReturnType<typeof cron.schedule>

const activeTasks: ScheduledTask[] = []

function registerJob(expression: string, name: string, fn: () => Promise<void>): void {
  const task = cron.schedule(expression, () => {
    console.log(`[job-runner] Starting: ${name}`)
    fn()
      .then(() => console.log(`[job-runner] Completed: ${name}`))
      .catch((err: unknown) => console.error(`[job-runner] Failed: ${name}`, err))
  })
  activeTasks.push(task)
}

export function startJobRunner(): void {
  // Inventory alert — daily 06:00 safety net; inline check happens on stock movement
  registerJob('0 6 * * *', 'inventory-alert', runInventoryAlertJob)

  // Scheduled report — daily at 23:59 + weekly on Monday at 08:00
  registerJob('59 23 * * *', 'scheduled-report-daily', () => runScheduledReportJob('daily'))
  registerJob('0 8 * * 1', 'scheduled-report-weekly', () => runScheduledReportJob('weekly'))

  // Work-order due-date reminder — daily at 09:00 (idempotent per company per day)
  registerJob('0 9 * * *', 'invoice-reminder', runInvoiceReminderJob)

  // Auto-backup — daily at 02:00 AM
  registerJob('0 2 * * *', 'backup', runBackupJob)

  // Tech daily reminder — 08:00 every day
  registerJob('0 8 * * *', 'tech-reminder', runTechReminderJob)

  // Data retention — daily at 03:00 AM (off-peak; cleans expired sessions + old logs)
  registerJob('0 3 * * *', 'data-retention', runDataRetentionJob)

  console.log(`[job-runner] ${activeTasks.length} cron jobs registered`)
}

export function stopJobRunner(): void {
  for (const task of activeTasks) {
    task.stop()
  }
  activeTasks.length = 0
  console.log('[job-runner] All cron jobs stopped')
}
