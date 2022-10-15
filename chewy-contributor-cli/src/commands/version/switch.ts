import {Command, Flags} from '@oclif/core'
import {ArgInput} from '@oclif/core/lib/interfaces'

export default class Switch extends Command {
  static description = 'Switch to work on a given version'

  static examples = [
    `
chewy-cc version switch v0.1.0
`,
  ]

  static flags = {}

  static args = [
    {
      name: 'version',
      description: 'The Chewy version you would like to work on.',
      required: true,
    },
  ]

  async run(): Promise<void> {
    const {args: {version}} = await this.parse(Switch)
    this.log('Version: ', version)
  }
}
