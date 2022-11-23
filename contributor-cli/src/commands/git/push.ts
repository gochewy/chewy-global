import {Command, Flags} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

interface PushOptions {
  setUpstream: boolean;
  branch: string;
}

const push = async (path: string, {setUpstream, branch}: PushOptions) => {
  console.log('About to push', path)
  const result = await (setUpstream ?
    GitProcess.exec(['push', '--set-upstream', 'origin', branch], path) :
    GitProcess.exec(['push'], path))

  if (result.exitCode !== 0) {
    throw new Error(result.stderr)
  }

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  console.log(`✅ Successfully pushed ${chalk.bold.green(dirname)}`)
}

export default class Push extends Command {
  static description =
    'Push work on a given version (assumes everything has been properly committed)';

  static examples = [
    `
chewy-cc version push --set-upstream
`,
  ];

  static flags = {
    setUpstream: Flags.boolean(),
  };

  static args = [];

  async run(): Promise<void> {
    const parsed = await this.parse(Push)
    const {
      flags: {setUpstream = false},
    } = parsed

    const rootPath = await findRoot()

    const branch = (
      await GitProcess.exec(['branch', '--show-current'], rootPath)
    ).stdout.replace('\n', '')

    const submodules = await findSubmodulePaths()

    await Promise.all(
      submodules.map(path => push(path, {setUpstream, branch})),
    )
    await push(rootPath, {setUpstream, branch})
  }
}
