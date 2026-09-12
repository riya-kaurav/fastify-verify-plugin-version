'use strict'

const fp = require('fastify-plugin')
const semver = require('semver')

// Same regex Fastify core uses internally (lib/plugin-utils.js) to detect
// whether the running Fastify version is a release candidate / pre-release.
const rcRegex = /-(?:rc|pre|alpha).+$/u

/**
 * Reads the `fastify` version-range metadata off a plugin function, the same
 * way Fastify core does internally. This metadata is attached by the
 * `fastify-plugin` (fp) wrapper when a plugin declares:
 *
 *   fp(plugin, { fastify: '4.x' })
 */
function getRequiredVersion (pluginFn) {
  const meta = pluginFn[Symbol.for('plugin-meta')]
  return meta?.fastify ?? null
}

/**
 * Checks whether a plugin's declared required Fastify version is compatible
 * with the currently running Fastify version — WITHOUT throwing.
 *
 * Mirrors the logic in Fastify core's `checkVersion()` (lib/plugin-utils.js),
 * which throws `FST_ERR_PLUGIN_VERSION_MISMATCH` on a mismatch. This function
 * returns a boolean instead, so it can be used to check compatibility before
 * calling `fastify.register()`.
 *
 * @param {Function} pluginFn - the plugin function (normally wrapped with `fp()`)
 * @param {string} currentVersion - the running Fastify version (`fastify.version`)
 * @returns {boolean} true if compatible (or if the plugin declares no requirement)
 */
function isVersionCompatible (pluginFn, currentVersion) {
  const requiredVersion = getRequiredVersion(pluginFn)

  // No declared requirement means the plugin doesn't care about the Fastify
  // version — treat it as compatible, same as core does (it just returns
  // early without checking).
  if (requiredVersion == null) {
    return true
  }

  const isRunningRc = rcRegex.test(currentVersion)

  if (isRunningRc && semver.gt(currentVersion, semver.coerce(requiredVersion)) === true) {
    // Mirrors core's RC leniency: during a Fastify release-candidate phase,
    // plugins targeting the prior stable release are still considered
    // compatible, to reduce the testing burden on plugin authors.
    return true
  }

  return semver.satisfies(currentVersion, requiredVersion, { includePrerelease: isRunningRc })
}

function verifyPluginVersionPlugin (fastify, _opts, done) {
  fastify.decorate('verifyPlugin', function (pluginFn) {
    return isVersionCompatible(pluginFn, this.version)
  })

  done()
}

module.exports = fp(verifyPluginVersionPlugin, {
  fastify: '5.x || 6.x',
  name: 'fastify-verify-plugin-version'
})

module.exports.isVersionCompatible = isVersionCompatible
