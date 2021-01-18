var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * Light-weight helpers for handling JavaScript Errors in node.js and the
 * browser.
 */
var OError = /** @class */ (function (_super) {
    __extends(OError, _super);
    /**
     * @param {string} message as for built-in Error
     * @param {Object} [info] extra data to attach to the error
     * @param {Error} [cause] the internal error that caused this error
     */
    function OError(message, info, cause) {
        var _this = _super.call(this, message) || this;
        _this.name = _this.constructor.name;
        if (info)
            _this.info = info;
        if (cause)
            _this.cause = cause;
        /** @private @type {Array<TaggedError> | undefined} */
        _this._oErrorTags; // eslint-disable-line
        return _this;
    }
    /**
     * Set the extra info object for this error.
     *
     * @param {Object} info extra data to attach to the error
     * @return {this}
     */
    OError.prototype.withInfo = function (info) {
        this.info = info;
        return this;
    };
    /**
     * Wrap the given error, which caused this error.
     *
     * @param {Error} cause the internal error that caused this error
     * @return {this}
     */
    OError.prototype.withCause = function (cause) {
        this.cause = cause;
        return this;
    };
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
     * @example <caption>A possible error in a callback</caption>
     * function cleanup(callback) {
     *   fs.unlink('/tmp/scratch', (err) => callback(err && OError.tag(err)))
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
    OError.tag = function (error, message, info) {
        var oError = /** @type{OError} */ (error);
        if (!oError._oErrorTags)
            oError._oErrorTags = [];
        var tag;
        if (Error.captureStackTrace) {
            // Hide this function in the stack trace, and avoid capturing it twice.
            tag = /** @type TaggedError */ ({ name: 'TaggedError', message: message, info: info });
            Error.captureStackTrace(tag, OError.tag);
        }
        else {
            tag = new TaggedError(message || '', info);
        }
        if (oError._oErrorTags.length >= OError.maxTags) {
            // Preserve the first tag and add an indicator that we dropped some tags.
            if (oError._oErrorTags[1] === DROPPED_TAGS_ERROR) {
                oError._oErrorTags.splice(2, 1);
            }
            else {
                oError._oErrorTags[1] = DROPPED_TAGS_ERROR;
            }
        }
        oError._oErrorTags.push(tag);
        return error;
    };
    /**
     * The merged info from any `tag`s and causes on the given error.
     *
     * If an info property is repeated, the last one wins.
     *
     * @param {Error | null | undefined} error any error (may or may not be an `OError`)
     * @return {Object}
     */
    OError.getFullInfo = function (error) {
        var info = {};
        if (!error)
            return info;
        var oError = /** @type{OError} */ (error);
        if (oError.cause)
            Object.assign(info, OError.getFullInfo(oError.cause));
        if (typeof oError.info === 'object')
            Object.assign(info, oError.info);
        if (oError._oErrorTags) {
            for (var _i = 0, _a = oError._oErrorTags; _i < _a.length; _i++) {
                var tag = _a[_i];
                Object.assign(info, tag.info);
            }
        }
        return info;
    };
    /**
     * Return the `stack` property from `error`, including the `stack`s for any
     * tagged errors added with `OError.tag` and for any `cause`s.
     *
     * @param {Error | null | undefined} error any error (may or may not be an `OError`)
     * @return {string}
     */
    OError.getFullStack = function (error) {
        if (!error)
            return '';
        var oError = /** @type{OError} */ (error);
        var stack = oError.stack || '(no stack)';
        if (Array.isArray(oError._oErrorTags) && oError._oErrorTags.length) {
            stack += "\n" + oError._oErrorTags.map(function (tag) { return tag.stack; }).join('\n');
        }
        var causeStack = oError.cause && OError.getFullStack(oError.cause);
        if (causeStack) {
            stack += '\ncaused by:\n' + indent(causeStack);
        }
        return stack;
    };
    return OError;
}(Error));
/**
 * Maximum number of tags to apply to any one error instance. This is to avoid
 * a resource leak in the (hopefully unlikely) case that a singleton error
 * instance is returned to many callbacks. If tags have been dropped, the full
 * stack trace will include a placeholder tag `... dropped tags`.
 *
 * Defaults to 100. Must be at least 1.
 *
 * @type {Number}
 */
OError.maxTags = 100;
/**
 * Used to record a stack trace every time we tag info onto an Error.
 *
 * @private
 * @extends OError
 */
var TaggedError = /** @class */ (function (_super) {
    __extends(TaggedError, _super);
    function TaggedError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TaggedError;
}(OError));
var DROPPED_TAGS_ERROR = /** @type{TaggedError} */ ({
    name: 'TaggedError',
    message: '... dropped tags',
    stack: 'TaggedError: ... dropped tags',
});
/**
 * @private
 * @param {string} string
 * @return {string}
 */
function indent(string) {
    return string.replace(/^/gm, '    ');
}
module.exports = OError;
