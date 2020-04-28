/**
 * Light-weight helpers for handling JavaScript Errors in node.js and the
 * browser. {@see README.md}
 */
class OError extends Error {
  /**
   * @param {string} message as for built-in Error
   * @param {Object} [info] extra data to attach to the error
   * @param {Error} [cause]
   */
  constructor(message, info, cause) {
    super(message)
    this.name = this.constructor.name
    if (info) this.info = info
    if (cause) this.cause = cause

    /** @type {Array<TaggedError>} */
    this._oErrorTags // eslint-disable-line
  }

  /**
   * Set the extra info object for this error.
   *
   * @param {Object | null | undefined} info
   * @return {this}
   */
  withInfo(info) {
    this.info = info
    return this
  }

  /**
   * Wrap the given error, which caused this error.
   *
   * @param {Error} cause
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
   * @param {Error} error
   * @param {string} [message]
   * @param {Object} [info]
   * @return {Error} the modified `error` argument
   */
  static tag(error, message, info) {
    const oError = /** @type{OError} */ (error)

    if (!oError._oErrorTags) oError._oErrorTags = []

    const tag = new TaggedError(message, info)

    // Hide this function in the stack trace.
    if (Error.captureStackTrace) Error.captureStackTrace(tag, OError.tag)

    oError._oErrorTags.push(tag)

    return error
  }

  /**
   * The merged info from any `tag`s on the given error.
   *
   * If an info property is repeated, the last one wins.
   *
   * @param {Error} error
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
   * @param {Error | null | undefined} error
   * @return {string}
   */
  static getFullStack(error) {
    if (!error) return ''

    const oError = /** @type{OError} */ (error)

    let stack = oError.stack

    if (oError._oErrorTags) {
      for (const tag of oError._oErrorTags) {
        stack += `\n${tag.stack}`
      }
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

function indent(string) {
  return string.replace(/^/gm, '    ')
}

module.exports = OError
