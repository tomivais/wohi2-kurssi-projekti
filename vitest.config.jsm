import { defineConfig } from 'vitest/config'

module.exports = defineConfig({
    test:{
        environment: "node",
        globals: true,
        coverage:{
            provider:"v8",
            reporter:["text", "html"],
             exclude:["src/generated/**","src/index.js"]
        }
    }
})