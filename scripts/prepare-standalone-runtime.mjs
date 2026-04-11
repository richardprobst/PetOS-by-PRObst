import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

const { prepareStandaloneRuntime } = require('../server/runtime/standalone-runtime.js')

const paths = prepareStandaloneRuntime(process.cwd())

console.log(
  JSON.stringify(
    {
      generatedEntrypoint: paths.generatedEntrypoint,
      helperDestination: paths.helperDestination,
      standaloneEntrypoint: paths.standaloneEntrypoint,
      vendorDestination: paths.vendorDestination,
    },
    null,
    2,
  ),
)
