import {Command, Flags} from '@oclif/core'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'
import {GitProcess} from 'dugite'
import {findRoot} from '../../lib/context/find-root'
import {findSubmodulePaths} from '../../lib/context/find-submodule-paths'

interface CommitOptions {
  message: string;
  all: boolean;
}

const commit = async (path: string, {message, all}: CommitOptions) => {
  console.log('About to commit', path)

  if (all) {
    console.log('Add all first...', path)
    await GitProcess.exec(['add', '.'], path)
    console.log('Successfully added all...', path)
  }

  console.log('Actualy running commit...', path)
  const result = await GitProcess.exec(['commit', '-m', message], path)

  if (result.exitCode !== 0 && !result.stdout.includes('nothing to commit')) {
    console.log('Commit failed...', path, result)
    throw new Error(result.stderr)
  }

  const root = await findRoot()
  const dirname = root === path ? '/' : path.replace(root, '')

  console.log(`✅ Successfully committed ${chalk.bold.green(dirname)}`)
}

export default class Commit extends Command {
  static description =
    'Commit current work across all submodules.';

  static examples = [
    `
chewy-cc git commit --all
`,
  ];

  static flags = {
    all: Flags.boolean({
      char: 'A',
      default: false,
      description: 'Stage all changes before committing.',
    }),
  };

  static args = [
    {
      name: 'message',
      description: 'A commit message.',
      required: true,
    },
  ];

  async run(): Promise<void> {
    const parsed = await this.parse(Commit)
    const {
      flags: {all = false},
      args,
    } = parsed
    const message = args[0] as string

    const rootPath = await findRoot()

    const submodules = await findSubmodulePaths()

    await Promise.all(
      submodules.map(path => commit(path, {message, all})),
    )
    await commit(rootPath, {message, all})
  }
}
