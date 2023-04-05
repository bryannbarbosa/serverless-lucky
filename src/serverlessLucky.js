const path = require('path')
const fs = require('fs')

class ServerlessLucky {
  constructor(serverless, options, { log }) {
    this.serverless = serverless
    this.options = options
    this.commands = {
      lucky: {
        usage: 'Generates a JSON Schema from a Yup Validator',
        lifecycleEvents: ['run'],
      },
    }

    this.log = log

    this.hooks = {
      'lucky:run': () => this.run(),
    }

    this.eventPropertiesSchema = {
      type: 'object',
      properties: {
        lucky: {
          type: 'object',
          properties: {
            schema: { type: 'string' },
            folders: { type: 'array' },
          },
          additionalProperties: false,
          required: ['schema', 'folders'],
        },
      },
    }

    this.customPropertiesSchema = {
      type: 'object',
      properties: {
        validatorsBasePath: { type: 'string' },
        outputPath: { type: 'string' },
      },
      required: ['lucky'],
      additionalProperties: false,
    }

    serverless.configSchemaHandler.defineFunctionEventProperties(
      'aws',
      'httpApi',
      this.eventPropertiesSchema
    )

    serverless.configSchemaHandler.defineCustomProperties(
      this.customPropertiesSchema
    )
  }

  getAppRootDir() {
    let currentDir = __dirname
    while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
      currentDir = path.join(currentDir, '..')
    }
    return currentDir
  }

  generateJsonSchema(schema) {
    let model = {
      type: schema.type,
      properties: {},
      example: {},
    }

    if (!schema.spec.optional) {
      model.required = true
    }

    for (let field of Object.keys(schema.fields)) {
      if (schema.fields[field].type === 'object') {
        model.properties[field] = this.generateJsonSchema(schema.fields[field])
      } else {
        model.properties[field] = { type: schema.fields[field].type }
        if (!schema.fields[field].spec.optional) {
          model.properties[field].required = true
        }
        switch (schema.fields[field].type) {
          case 'string':
            model.properties[field].example = ''
            break
          case 'array':
            model.properties[field].example = []
            break
          case 'number':
            model.properties[field].example = 10
            break
          case 'date':
            model.properties[field].example = new Date().toISOString()
            break
        }
      }
    }

    return model
  }

  generateFileName(httpMethod) {
    return `${httpMethod}.json`
  }

  run() {
    for (let httpFunction of Object.keys(this.serverless.service.functions)) {
      const httpApi =
        this.serverless.service.functions[httpFunction].events[0].httpApi
      const pluginField = Object.keys(this.eventPropertiesSchema.properties)
      const validator = httpApi[pluginField]
      const validatorsBasePath = path.resolve(
        this.getAppRootDir(),
        this.serverless.service.custom.lucky.validatorsBasePath
      )

      if (validator) {
        const validatorModulePath = require(path.resolve(
          validatorsBasePath,
          validator.schema
        ))

        const outputPath = this.serverless.service.custom.lucky.outputPath
        const jsonSchema = this.generateJsonSchema(validatorModulePath)
        const uniqueFolders = [...new Set(httpApi.lucky.folders)]

        for (let folder of uniqueFolders) {
          let outputFilePath = path.resolve(
            this.getAppRootDir(),
            outputPath,
            folder,
            this.generateFileName(httpApi.method)
          )
          const destinationFolder = path.resolve(
            this.getAppRootDir(),
            outputPath,
            folder
          )

          if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder, { recursive: true })
          }
          fs.writeFile(
            outputFilePath,
            JSON.stringify(jsonSchema, null, 4),
            'utf8',
            (err) => {
              if (err) {
                const error = new Error('Error in writing output file.')
                throw error
              }
            }
          )
          this.log.success(`Lucky task: schema created in ${outputFilePath}`)
        }
      }
    }
  }
}

module.exports = ServerlessLucky