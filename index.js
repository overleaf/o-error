/**
 * Light-weight helpers for handling JavaScript Errors in node.js and the
 * browser.
 */
class OError extends Error {
  /**
   * @param {string} message as for built-in Error
   * @param {Object} [info] extra data to attach to the error
   * @param {Error} [cause] the internal error that caused this error
   */
  constructor(message, info, cause) {
    super(message)
    this.name = this.constructor.name
    if (info) this.info = info
    if (cause) this.cause = cause
    /** @private @type {Array<TaggedError> | undefined} */
    this._oErrorTags // eslint-disable-line
  }

  /**
   * Set the extra info object for this error.
   *
   * @param {Object} info extra data to attach to the error
   * @return {this}
   */
  withInfo(info) {
    this.info = info
    return this
  }

  /**
   * Wrap the given error, which caused this error.
   *
   * @param {Error} cause the internal error that caused this error
   * @return {this}
   */
  withCause(cause) {
    this.cause = cause
    return this
  }

  /**
   * Tag debugging information onto any error (whether an OError or not) and
   * return it.
   *
   * @example <caption>An error in a callback</caption>
   * function findUser(name, callback) {
   *   fs.readFile('/etc/passwd', (err, data) => {
   *     if (err) return callback(OError.tag(err, 'failed to read passwd'))
   *     // ...
   *   })
   * }
   *
   * @example <caption>An error with async/await</caption>
   * async function cleanup() {
   *   try {
   *     await fs.promises.unlink('/tmp/scratch')
   *   } catch (err) {
   *     throw OError.tag(err, 'failed to remove scratch file')
   *   }
   * }
   *
   * @param {Error} error the error to tag
   * @param {string} [message] message with which to tag `error`
   * @param {Object} [info] extra data with wich to tag `error`
   * @return {Error} the modified `error` argument
   */
  static tag(error, message, info) {
    return OError._tag(error, message, info, OError.tag)
  }

  /**
   * Like {@link OError.tag}, but if the error is absent, do nothing. This is
   * useful if a callback is just passing an error up the chain without
   * checking it.
   *
   * @example <caption>A possible error in a callback</caption>
   * function cleanup(callback) {
   *   fs.unlink('/tmp/scratch', (err) => callback(OError.tagIfExists(err)))
   * }
   *
   * @param {Error | null | undefined} error the error (if any) to tag
   * @param {string} [message] message with which to tag `error`
   * @param {Object} [info] extra data with wich to tag `error`
   * @return {Error | null | undefined} the modified `error` argument
   */
  static tagIfExists(error, message, info) {
    if (!error) return error
    return OError._tag(error, message, info, OError.tagIfExists)
  }

  /**
   * @private
   * @param {Error} error
   * @param {string | null | undefined} message
   * @param {any} info
   * @param {function} caller
   */
  static _tag(error, message, info, caller) {
    const oError = /** @type{OError} */ (error)

    if (!oError._oErrorTags) oError._oErrorTags = []

    let tag
    if (Error.captureStackTrace) {
      // Hide this function in the stack trace, and avoid capturing it twice.
      tag = /** @type TaggedError */ ({ name: 'TaggedError', message, info })
      Error.captureStackTrace(tag, caller)
    } else {
      tag = new TaggedError(message || '', info)
    }

    oError._oErrorTags.push(tag)

    return error
  }

  /**
   * The merged info from any `tag`s on the given error.
   *
   * If an info property is repeated, the last one wins.
   *
   * @param {Error | null | undefined} error any errror (may or may not be an `OError`)
   * @return {Object}
   */
  static getFullInfo(error) {
    const info = {}

    if (!error) return info

    const oError = /** @type{OError} */ (error)

    if (typeof oError.info === 'object') Object.assign(info, oError.info)

    if (oError._oErrorTags) {
      for (const tag of oError._oErrorTags) {
        Object.assign(info, tag.info)
      }
    }

    return info
  }

  /**
   * Return the `stack` property from `error`, including the `stack`s for any
   * tagged errors added with `OError.tag` and for any `cause`s.
   *
   * @param {Error | null | undefined} error any error (may or may not be an `OError`)
   * @return {string}
   */
  static getFullStack(error) {
    if (!error) return ''

    const oError = /** @type{OError} */ (error)

    let stack = oError.stack || '(no stack)'

    if (Array.isArray(oError._oErrorTags) && oError._oErrorTags.length) {
      stack += `\n${oError._oErrorTags.map((tag) => tag.stack).join('\n')}`
    }

    const causeStack = oError.cause && OError.getFullStack(oError.cause)
    if (causeStack) {
      stack += '\ncaused by:\n' + indent(causeStack)
    }

    return stack
  }
}

/**
 * Used to record a stack trace every time we tag info onto an Error.
 *
 * @private
 * @extends OError
 */
class TaggedError extends OError {}

/**
 * @private
 * @param {string} string
 * @return {string}
 */
function indent(string) {
  return string.replace(/^/gm, '    ')
}

module.exports = OError
