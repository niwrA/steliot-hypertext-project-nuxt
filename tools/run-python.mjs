import { spawnSync } from 'node:child_process'

const scriptArguments = process.argv.slice(2)
if (!scriptArguments.length) {
  console.error('Usage: node tools/run-python.mjs <script> [...arguments]')
  process.exit(2)
}

const candidates = process.platform === 'win32'
  ? [['py', '-3'], ['python'], ['python3']]
  : [['python3'], ['python']]

for (const [command, ...prefix] of candidates) {
  const result = spawnSync(command, [...prefix, ...scriptArguments], { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') continue
  if (result.error) {
    console.error(`Unable to start ${command}: ${result.error.message}`)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

console.error('Python 3 was not found. Install Python 3 and ensure py, python3, or python is available on PATH.')
process.exit(1)
