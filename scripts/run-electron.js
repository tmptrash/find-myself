import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import electronPath from 'electron'

//
// macOS (14+) refuses to bring an app to the front when it asks for that
// itself, so a window spawned straight from a terminal opened behind it and
// the keyboard was dead until the player clicked the game. Launching through
// LaunchServices ("open") from the active terminal activates it like a
// Finder launch. Other platforms start the binary directly.
//
const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAC_PLATFORM = 'darwin'
const MAC_OPEN_BIN = '/usr/bin/open'
const MAC_BUNDLE_SUFFIX = '.app'
const extraArgs = process.argv.slice(2)

const child = process.platform === MAC_PLATFORM
  ? spawn(MAC_OPEN_BIN, ['-W', '-n', '-a', macBundlePath(electronPath), '--args', PROJECT_DIR, ...extraArgs], { stdio: 'inherit' })
  : spawn(electronPath, [PROJECT_DIR, ...extraArgs], { stdio: 'inherit' })
child.on('exit', code => process.exit(code ?? 0))

function macBundlePath(binPath) {
  const end = binPath.indexOf(MAC_BUNDLE_SUFFIX + '/')
  return end < 0 ? binPath : binPath.slice(0, end + MAC_BUNDLE_SUFFIX.length)
}
