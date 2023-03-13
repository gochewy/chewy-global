import {expect, test} from '@oclif/test'

describe('component/update-commands', () => {
  test
  .stdout()
  .command(['component/update-commands'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['component/update-commands', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
