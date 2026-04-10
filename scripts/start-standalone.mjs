import { spawn } from 'node:child_process'
import process from 'node:process'

const child = spawn(process.execPath, ['server.js'], {
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
