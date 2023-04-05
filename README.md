# Lucky - Generate a JSON Schema from Yup Validators

<p>
  <a href="https://www.serverless.com">
    <img src="http://public.serverless.com/badges/v3.svg">
  </a>
  <a href="https://www.npmjs.com/package/serverless-openapi-documenter">
    <img src="https://img.shields.io/npm/v/serverless-openapi-documenter.svg?style=flat-square">
  </a>
  <a href="https://github.com/JaredCE/serverless-openapi-documenter/actions/workflows/node.yml">
    <img src="https://github.com/JaredCE/serverless-openapi-documenter/actions/workflows/node.yml/badge.svg">
  </a>
</p>



This will generate an JSON Schema files from Yup Validators.

## Install

This plugin works for Serverless 2.x and up and only supports node.js 14 and up.

To add this plugin to your package.json:

**Using npm:**
```bash
npm install --save-dev serverless-lucky
```

Next you need to add the plugin to the `plugins` section of your `serverless.yml` file.

```yml
plugins:
  - serverless-lucky
```

## Adding documentation to serverless

To Run: `serverless lucky`

## License

MIT