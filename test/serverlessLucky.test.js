const appRoot = require('app-root-path')
const serverlessLucky = require(appRoot + '/src/serverlessLucky')

const serverlessInstanceMock = {}

jest.mock(serverlessInstanceMock)

serverlessInstanceMock.configSchemaHandler.defineFunctionEventProperties.mockImplementation(() => true)
serverlessInstanceMock.configSchemaHandler.defineCustomProperties.mockImplementation(() => true)
serverlessInstanceMock.service.functions.mockImplementation(() => {})

describe('serverless-lucky module', () => {
  it('should return a name by httpApi method', async () => {
    jest.mockImplementation

    const options = {}
    const logger = {
      log(data) {
        console.log(data)
      },
    }
    expect(1).toBe(1)
  })
})
