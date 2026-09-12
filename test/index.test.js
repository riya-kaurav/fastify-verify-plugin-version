'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const Fastify = require('fastify')
const fp = require('fastify-plugin')
const verifyPluginVersion = require('../index.js')

// Helper: build a fake plugin function carrying the same hidden metadata
// that `fastify-plugin` (fp) attaches, without needing a real fp-wrapped
// plugin for every test case.
function fakePlugin (requiredVersion) {
  const fn = function (fastify, opts, done) { done() }
  fn[Symbol.for('plugin-meta')] = { fastify: requiredVersion }
  return fn
}

test('decorates the instance with verifyPlugin', async (t) => {
  const fastify = Fastify()
  await fastify.register(verifyPluginVersion)
  assert.strictEqual(typeof fastify.verifyPlugin, 'function')
})

test('returns true when plugin has no version requirement', async (t) => {
  const fastify = Fastify()
  await fastify.register(verifyPluginVersion)

  const plugin = fp(function (fastify, opts, done) { done() })
  assert.strictEqual(fastify.verifyPlugin(plugin), true)
})

test('returns true when the required version range is satisfied', async (t) => {
  const fastify = Fastify()
  await fastify.register(verifyPluginVersion)

  // fastify.version is whatever the installed Fastify version is (devDependency).
  // We build a range that always includes it by using its major version.
  const currentMajor = fastify.version.split('.')[0]
  const plugin = fakePlugin(`${currentMajor}.x`)

  assert.strictEqual(fastify.verifyPlugin(plugin), true)
})

test('returns false when the required version range is NOT satisfied', async (t) => {
  const fastify = Fastify()
  await fastify.register(verifyPluginVersion)

  // A version far in the past that the current Fastify will never satisfy.
  const plugin = fakePlugin('0.0.1')

  assert.strictEqual(fastify.verifyPlugin(plugin), false)
})

test('does NOT throw, unlike fastify.register() with a mismatched plugin', async (t) => {
  const fastify = Fastify()
  await fastify.register(verifyPluginVersion)

  const plugin = fakePlugin('0.0.1')

  assert.doesNotThrow(() => {
    fastify.verifyPlugin(plugin)
  })
})

test('exports isVersionCompatible for standalone use without a Fastify instance', (t) => {
  assert.strictEqual(typeof verifyPluginVersion.isVersionCompatible, 'function')

  const plugin = fakePlugin('1.x')
  assert.strictEqual(verifyPluginVersion.isVersionCompatible(plugin, '1.5.0'), true)
  assert.strictEqual(verifyPluginVersion.isVersionCompatible(plugin, '2.0.0'), false)
})

test('release-candidate leniency: RC version accepts plugin targeting prior stable release', (t) => {
  const plugin = fakePlugin('4.x')
  // Fastify is running 5.0.0-rc.1 (a release candidate for v5), and the
  // plugin still only declares support for v4. Core's checkVersion() allows
  // this during an RC phase to ease plugin-author testing burden — this
  // plugin mirrors that same leniency.
  assert.strictEqual(verifyPluginVersion.isVersionCompatible(plugin, '5.0.0-rc.1'), true)
})
