const path = require('path')
const fs = require('fs')
const appRoot = require('app-root-path')
const YAML = require('yaml')
const _ = require('lodash')
const chalk = require('chalk')

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
            contentType: { type: 'string' },
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
        inlineDocs: { type: 'boolean', default: false },
        useExamples: { type: 'boolean', default: false },
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

  generateJsonSchema(schema) {
    let model = {
      type: schema.type,
      properties: {},
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

        const condition = this.serverless.service.custom.lucky.useExamples

        if (condition) {
          model.example = {}

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

      if (!validator) {
        continue
      }

      const validatorsBasePath = path.resolve(
        appRoot.toString(),
        this.serverless.service.custom.lucky.validatorsBasePath
      )

      const validatorModulePath = require(path.resolve(
        appRoot.toString(),
        validatorsBasePath,
        validator.schema
      ))

      const outputPath = this.serverless.service.custom.lucky.outputPath
      const jsonSchema = this.generateJsonSchema(validatorModulePath)
      const uniqueFolders = [...new Set(httpApi.lucky.folders)]

      for (let folder of uniqueFolders) {
        let outputFilePath = path.resolve(
          appRoot.toString(),
          outputPath,
          folder,
          this.generateFileName(httpApi.method)
        )
        const destinationFolder = path.resolve(
          appRoot.toString(),
          outputPath,
          folder
        )
        if (
          this.serverless.service.custom.documentation &&
          this.serverless.service.custom.documentation.models
        ) {
          const schemaPath = path.resolve(
            appRoot.toString(),
            outputPath,
            folder,
            this.generateFileName(httpApi.method)
          )
          console.log(httpApi)
          const modelObject = {
            name: _.camelCase(httpFunction),
            contentType: httpApi.lucky.contentType
              ? httpApi.lucky.contentType
              : 'application/json',
            description: '',
            schema: `\${file(${schemaPath.replace(
              `${appRoot.toString()}/`,
              ''
            )})}`,
          }
          const serverlessConfigFile = fs.readFileSync(
            path.resolve(appRoot.toString(), 'serverless.yml'),
            'utf-8'
          )

          const serverlessYaml = YAML.parse(serverlessConfigFile)
          if (
            this.serverless.service.custom.lucky.inlineDocs &&
            JSON.stringify(serverlessYaml.custom.documentation.models) === '{}'
          ) {
            serverlessYaml.custom.documentation.models = []
            serverlessYaml.custom.documentation.models.push(modelObject)
            fs.writeFile(
              path.resolve(appRoot.toString(), 'serverless.yml'),
              YAML.stringify(serverlessYaml),
              'utf8'
            )
          } else if (
            this.serverless.service.custom.lucky.inlineDocs &&
            !_.find(serverlessYaml.custom.documentation.models, modelObject)
          ) {
            serverlessYaml.custom.documentation.models.push(modelObject)
            fs.writeFile(
              path.resolve(appRoot.toString(), 'serverless.yml'),
              YAML.stringify(serverlessYaml),
              'utf8'
            )
          }

          if (!this.serverless.service.custom.lucky.inlineDocs) {
            const regex = /(?<=\()(.*)(?=\))/g

            const docRelativePath =
              serverlessYaml.custom.documentation.match(regex)
            let docFile = fs.readFileSync(
              path.resolve(appRoot.toString(), docRelativePath[0]),
              'utf-8'
            )
            const documentationYaml = YAML.parse(docFile)
            if (!_.find(documentationYaml.documentation.models, modelObject)) {
              documentationYaml.documentation.models.push(modelObject)

              fs.writeFile(
                path.resolve(appRoot.toString(), docRelativePath[0]),
                YAML.stringify(documentationYaml),
                'utf8'
              )
            }
          }

          
          if (!fs.existsSync(outputFilePath) && fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder, { recursive: true })
            fs.writeFile(
              outputFilePath,
              JSON.stringify(jsonSchema, null, 4),
              'utf8'
            )
            this.log.notice(
              chalk.greenBright(
                `Lucky on ${httpFunction}: schema created in ${outputFilePath}`
              )
            )
          } else {
            this.log.notice(chalk.yellow(`Lucky: No updates needed for now.`))
          }
        } else {
          this.log.error(
            'Failed: Please, define a valid documentation property in `serverless.yml`'
          )
        }
      }
    }
  }
}

module.exports = ServerlessLucky