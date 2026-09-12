# fastify-verify-plugin-version

Check whether a Fastify plugin's required version matches the currently
running Fastify version — **without** calling `fastify.register()` and
catching an error.

## Why

Fastify plugins can declare which Fastify version they need:

```js
const fp = require('fastify-plugin')

const myPlugin = fp(async (fastify) => {
  // ...
}, {
  fastify: '5.x'
})
```

If you register a plugin whose required version doesn't match the running
Fastify version, `fastify.register()` throws `FST_ERR_PLUGIN_VERSION_MISMATCH`.

Sometimes you want to check compatibility **before** registering — for
example, a CLI that loads plugins from user-supplied file paths and wants to
warn about incompatible plugins without actually loading them. This plugin
adds a `verifyPlugin()` method for that.

## Install

```sh
npm install fastify-verify-plugin-version
```

## Usage

```js
const Fastify = require('fastify')
const verifyPluginVersion = require('fastify-verify-plugin-version')

const fastify = Fastify()
await fastify.register(verifyPluginVersion)

const someThirdPartyPlugin = require('some-third-party-plugin')

if (fastify.verifyPlugin(someThirdPartyPlugin)) {
  await fastify.register(someThirdPartyPlugin)
} else {
  console.log('this plugin is not compatible with the running Fastify version')
}
```

You can also use the version-check logic directly, without a Fastify
instance:

```js
const { isVersionCompatible } = require('fastify-verify-plugin-version')

isVersionCompatible(someThirdPartyPlugin, '5.2.0') // true or false
```

## How it works

This mirrors the same version-check logic Fastify core uses internally
(`checkVersion()` in `lib/plugin-utils.js`) — including the leniency applied
during a Fastify release-candidate phase — but returns `true`/`false`
instead of throwing.

## License

MIT
