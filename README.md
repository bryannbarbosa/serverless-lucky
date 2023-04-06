
# serverless-lucky - Generates a JSON Schema from Yup Validators

  

Lucky is a serverless plugin that generates JSON Schema's from Yup Validators Schemas.
You can transform a **Yup Validator** into a **JSON Schema**:

**Validator**
```
const { object, string, number } = require('yup')
const userValidation = object().shape({ email: string(), age: number() })

module.exports = userValidation
```
**JSON Schema**
```
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "example": ""},
    "age": { "type": "number", "example": 10 }
  },
  "example": {}
}
```


## How it works

Lucky generates many JSON Schema's from a specific path with Yup Validators, you can set the path for validators and get the output JSON files.

## Installation

Install via npm in the root of your serverless service:

    npm install serverless-lucky --save-dev
You can also install via yarn:

    yarn add serverless-lucky -D

Add the plugin to the `plugins` section in your serverless `serverless.yml`:

```yaml
plugins:
  - serverless-lucky
```
## Configuration

Lucky configurations must be defined under `custom.lucky` in the `serverless.yml` file before they can be used in the functions' configs:

```yaml
custom:
  lucky:
    validatorsBasePath: src/validations # Specify your validator's location.
    outputPath: docs/models # Specify where you want to generate the output files.

# Note: Paths are relative to the root app folder.
```
Then, in your function, specify the ```httpApi.lucky```

```yaml
functions:
  get-hello-world:
    handler: helloWorld/get.handler
    events:
      - httpApi:
          method: get
          path: /hello
          lucky:
            schema: hello/getValidator.js # Yup Validator File
            folders: ['hello', 'hello/new'] # Output Folders [Relative to OutputPath]

# Note: Folder's array only use unique values.
```

## Generate JSON Schema's
To run, execute the command: `sls lucky`, the following message will be showed, if successful: 

```
Lucky task: schema created in .../docs/models/hello/get.json
```
Another message will be followed about the same file in another folder, according to array's folder:
```
Lucky task: schema created in .../docs/models/hello/new/get.json
```

## Use folders to create groups

One interesting concept in Lucky is that you also can use folders to create groups and organize the output schema files, specifying the same folder by different functions.

```yaml
functions:
  get-hello-world:
    handler: helloWorld/get.handler
    events:
      - httpApi:
          method: get # Output file name
          path: /hello
          lucky:
            schema: hello/getValidator.js # Yup Validator File
            folders: ['hello'] # Same folder or 'group' as create-hello-world
   create-hello-world:
    handler: helloWorld/post.handler
    events:
      - httpApi:
          method: post # Output files names are the method of a function
          path: /hello
          lucky:
            schema: hello/createValidator.js # Yup Validator File
            folders: ['hello'] # Same folder or 'group' as get-hello-world

# Note: It will create 2 files, post.json and get.json, located in 'docs/models/hello' folder, according to outputPath.
```

## License

  

MIT