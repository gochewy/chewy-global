import {GitProcess} from 'dugite'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {cwd} from 'node:process'
import {ROOT_GIT_REPO} from './constants'

/**
 * Navigates up the file system, looking for a dir with the ROOT_GIT_REPO
 * as a remote.
 *
 * @param path
 * @returns
 */
const traverse = async (path: string): Promise<string> => {
  const {stdout, exitCode} = await GitProcess.exec(['remote', '-v'], path)

  if (path === '/') {
    throw new Error('Reached system root without finding project root')
  }

  const gitDir = join(path, '.git')

  let isGitRoot = false

  try {
    readFileSync(gitDir)
  } catch (error: any) {
    const code = (error as {code: 'ENOENT' | 'EISDIR'})?.code
    if (code === 'EISDIR') {
      isGitRoot = true
    }
  }

  if (exitCode === 0 && stdout.includes(ROOT_GIT_REPO) && isGitRoot) {
    return path
  }

  return traverse(dirname(path))
}

export const findRoot = async (): ReturnType<typeof traverse> => traverse(cwd())
