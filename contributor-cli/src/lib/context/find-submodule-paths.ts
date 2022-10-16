import {GitProcess} from 'dugite'
import {findRoot} from './find-root'

/**
 * Find paths for all submodules in the global repo.
 * @returns
 */
export const findSubmodulePaths = async () => {
  const root = await findRoot()
  const result = await GitProcess.exec(['submodule', 'foreach', 'pwd'], root)

  if (result.exitCode !== 0) {
    throw new Error('Something went wrong reading submodules... ' + result.stderr)
  }

  return result.stdout.split('\n').filter(line => line.includes(root))
}
