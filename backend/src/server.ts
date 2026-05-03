import { createApp } from './app.js'
import { env } from './config/env.js'
import { logInfo } from './lib/logger.js'
import { startSessionReminders } from './lib/sessionReminders.js'

const app = createApp()

app.listen(env.PORT, () => {
  logInfo('Backend server started', {
    port: env.PORT,
    env: env.NODE_ENV,
  })
  startSessionReminders()
})
