"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global globalTranslate */

/**
 * UserMessage object for managing user messages.
 * @module UserMessage
 */
var UserMessage = {
  /**
   * jQuery object for the AJAX messages container.
   * @type {jQuery}
   */
  $ajaxMessagesDiv: $('#ajax-messages'),

  /**
   * Convert text data to a more user-friendly format.
   * Replaces newline characters with HTML line break tags.
   *
   * @param {string|Array|Object} data - The input text data.
   * @returns {string} The converted text.
   */
  convertToText: function convertToText(data) {
    if (Array.isArray(data)) {
      // For arrays, recursively transform each element
      var transformedArray = data.map(function (item) {
        return UserMessage.convertToText(item);
      });
      return transformedArray.join('<br>');
    } else if (_typeof(data) === 'object' && data !== null) {
      // For objects, recursively transform each value
      var transformedObject = Object.entries(data).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        return "".concat(UserMessage.convertToText(value));
      });
      return "".concat(transformedObject.join('<br>'));
    } else {
      // For other data types, simply return as string
      return String(data).replace(/\n/g, '<br>');
    }
  },

  /**
   * Shows an error message.
   * @param {string|object|array} message - The error message.
   * @param {string} [header=''] - The header of the error message.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showError: function showError(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var disableScroll = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui error icon message ajax">';
    html += '<i class="exclamation icon"></i>';
    html += '<div class="content">'; // Check if the message already contains a UI header (constraint violation messages)

    var hasEmbeddedHeader = text.includes('<div class="ui header">');

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else if (!hasEmbeddedHeader) {
      // Only add default error header if message doesn't already contain a header
      html += "<div class=\"header\">".concat(globalTranslate.msg_ErrorHeader, "</div>");
    }

    html += "<p>".concat(text, "</p>");
    html += '</div></div>';
    UserMessage.$ajaxMessagesDiv.after(html);

    if (!disableScroll) {
      UserMessage.scrollToMessages();
    }
  },

  /**
   * Shows a license error with management link message.
   * @param {string|object|array} messages - The warning message.
   * @param {string} [header=''] - The header of the warning message.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showLicenseError: function showLicenseError(header, messages, disableScroll) {
    var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"").concat(Config.keyManagementUrl, "\" target=\"_blank\">").concat(Config.keyManagementSite, "</a>");

    if (Array.isArray(messages.error)) {
      messages.error.push(manageLink);
    } else if (Array.isArray(messages.license)) {
      messages.license.push(manageLink);
    } else if (Array.isArray(messages)) {
      messages.push(manageLink);
    }

    UserMessage.showMultiString(messages, header, disableScroll);
  },

  /**
   * Shows a warning message.
   * @param {string|object|array} message - The warning message.
   * @param {string} [header=''] - The header of the warning message.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showWarning: function showWarning(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var disableScroll = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui warning icon message ajax">';
    html += '<i class="warning icon"></i>';
    html += '<div class="content">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
      html += "<div class=\"header\">".concat(globalTranslate.msg_WarningHeader, "</div>");
    }

    html += "<p>".concat(text, "</p>");
    html += '</div></div>';
    UserMessage.$ajaxMessagesDiv.after(html);

    if (!disableScroll) {
      UserMessage.scrollToMessages();
    }
  },

  /**
   * Shows an information message.
   * @param {string|object|array} message - The information message.
   * @param {string} [header=''] - The header of the information message.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showInformation: function showInformation(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var disableScroll = arguments.length > 2 ? arguments[2] : undefined;
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui info icon message ajax">';
    html += '<i class="info icon"></i>';
    html += '<div class="content">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
      html += "<div class=\"header\">".concat(globalTranslate.msg_infoHeader, "</div>");
    }

    html += "<p>".concat(text, "</p>");
    html += '</div></div>';
    UserMessage.$ajaxMessagesDiv.after(html);

    if (!disableScroll) {
      UserMessage.scrollToMessages();
    }
  },

  /**
   * Shows multiple messages.
   * @param {string|object|array} messages - The multiple messages.
   * @param {string} [header=''] - The header of the multiple messages.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showMultiString: function showMultiString(messages) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var disableScroll = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    $('.ui.message.ajax').remove();

    if (!messages) {
      return;
    } // Remove empty values


    var messagesArray = [];

    if ((Array.isArray(messages) || _typeof(messages) === 'object') && Object.keys(messages).length > 0) {
      messagesArray = messages;
      $.each(messages, function (index, value) {
        if (!value) {
          if (Array.isArray(messagesArray)) {
            messagesArray.pop(index);
          } else {
            delete messagesArray[index];
          }
        }
      });
    } else if (!Array.isArray(messages) && messages) {
      messagesArray = {
        error: messages
      };
    }

    var previousMessage = '';

    if (messagesArray.length === 1 || Object.keys(messagesArray).length === 1) {
      $.each(messagesArray, function (index, value) {
        if (previousMessage === value) {
          return;
        }

        var newValue = value;

        if (Array.isArray(newValue)) {
          newValue = newValue.join('<br>');
        }

        if (index === 'error') {
          UserMessage.showError(newValue, header, disableScroll);
        } else if (index === 'info') {
          UserMessage.showInformation(newValue, header, disableScroll);
        } else {
          UserMessage.showWarning(newValue, header, disableScroll);
        }

        previousMessage = value;
      });
    } else {
      var content = '';
      $.each(messagesArray, function (index, value) {
        var newValue = value;

        if (previousMessage !== value) {
          if (Array.isArray(newValue)) {
            newValue = newValue.join('<br>');
          }

          content = "".concat(content, "<br>").concat(newValue);
        }

        previousMessage = value;
      });

      if (content.length > 0) {
        UserMessage.showWarning(content, header, disableScroll);
      }
    }
  },

  /**
   * Scrolls to the messages container.
   */
  scrollToMessages: function scrollToMessages() {
    $('html, body').animate({
      scrollTop: UserMessage.$ajaxMessagesDiv.offset().top - 50
    }, 2000);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsImRhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJ0cmFuc2Zvcm1lZEFycmF5IiwibWFwIiwiaXRlbSIsImpvaW4iLCJ0cmFuc2Zvcm1lZE9iamVjdCIsIk9iamVjdCIsImVudHJpZXMiLCJrZXkiLCJ2YWx1ZSIsIlN0cmluZyIsInJlcGxhY2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsInRleHQiLCJodG1sIiwiaGFzRW1iZWRkZWRIZWFkZXIiLCJpbmNsdWRlcyIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dMaWNlbnNlRXJyb3IiLCJtZXNzYWdlcyIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsImVycm9yIiwicHVzaCIsImxpY2Vuc2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93V2FybmluZyIsIm1zZ19XYXJuaW5nSGVhZGVyIiwic2hvd0luZm9ybWF0aW9uIiwibXNnX2luZm9IZWFkZXIiLCJyZW1vdmUiLCJtZXNzYWdlc0FycmF5Iiwia2V5cyIsImxlbmd0aCIsImVhY2giLCJpbmRleCIsInBvcCIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FB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VyxDQUFDeUMsV0FBWixDQUF3QmEsT0FBeEIsRUFBaUNsQyxNQUFqQyxFQUF5Q0MsYUFBekM7QUFDSDtBQUNKO0FBQ0osR0E5TGU7O0FBZ01oQjtBQUNKO0FBQ0E7QUFDSVEsRUFBQUEsZ0JBbk1nQiw4QkFtTUc7QUFDZjNCLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0JxRCxPQUFoQixDQUF3QjtBQUNwQkMsTUFBQUEsU0FBUyxFQUFFeEQsV0FBVyxDQUFDQyxnQkFBWixDQUE2QndELE1BQTdCLEdBQXNDQyxHQUF0QyxHQUE0QztBQURuQyxLQUF4QixFQUVHLElBRkg7QUFHSDtBQXZNZSxDQUFwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVXNlck1lc3NhZ2Ugb2JqZWN0IGZvciBtYW5hZ2luZyB1c2VyIG1lc3NhZ2VzLlxuICogQG1vZHVsZSBVc2VyTWVzc2FnZVxuICovXG5jb25zdCBVc2VyTWVzc2FnZSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgQUpBWCBtZXNzYWdlcyBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0ZXh0IGRhdGEgdG8gYSBtb3JlIHVzZXItZnJpZW5kbHkgZm9ybWF0LlxuICAgICAqIFJlcGxhY2VzIG5ld2xpbmUgY2hhcmFjdGVycyB3aXRoIEhUTUwgbGluZSBicmVhayB0YWdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8QXJyYXl8T2JqZWN0fSBkYXRhIC0gVGhlIGlucHV0IHRleHQgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29udmVydGVkIHRleHQuXG4gICAgICovXG4gICAgY29udmVydFRvVGV4dChkYXRhKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAvLyBGb3IgYXJyYXlzLCByZWN1cnNpdmVseSB0cmFuc2Zvcm0gZWFjaCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZEFycmF5ID0gZGF0YS5tYXAoaXRlbSA9PiBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KGl0ZW0pKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1lZEFycmF5LmpvaW4oJzxicj4nKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gRm9yIG9iamVjdHMsIHJlY3Vyc2l2ZWx5IHRyYW5zZm9ybSBlYWNoIHZhbHVlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZE9iamVjdCA9IE9iamVjdC5lbnRyaWVzKGRhdGEpLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgJHtVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHZhbHVlKX1gKTtcbiAgICAgICAgICAgIHJldHVybiBgJHt0cmFuc2Zvcm1lZE9iamVjdC5qb2luKCc8YnI+Jyl9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBvdGhlciBkYXRhIHR5cGVzLCBzaW1wbHkgcmV0dXJuIGFzIHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbCA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZXJyb3IgaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIGljb25cIj48L2k+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1lc3NhZ2UgYWxyZWFkeSBjb250YWlucyBhIFVJIGhlYWRlciAoY29uc3RyYWludCB2aW9sYXRpb24gbWVzc2FnZXMpXG4gICAgICAgIGNvbnN0IGhhc0VtYmVkZGVkSGVhZGVyID0gdGV4dC5pbmNsdWRlcygnPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSBpZiAoIWhhc0VtYmVkZGVkSGVhZGVyKSB7XG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBkZWZhdWx0IGVycm9yIGhlYWRlciBpZiBtZXNzYWdlIGRvZXNuJ3QgYWxyZWFkeSBjb250YWluIGEgaGVhZGVyXG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX0Vycm9ySGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIGxpY2Vuc2UgZXJyb3Igd2l0aCBtYW5hZ2VtZW50IGxpbmsgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2VzIC0gVGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlRXJyb3IoaGVhZGVyLCBtZXNzYWdlcywgZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICBjb25zdCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtDb25maWcua2V5TWFuYWdlbWVudFNpdGV9PC9hPmA7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSkge1xuICAgICAgICAgICAgbWVzc2FnZXMuZXJyb3IucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmxpY2Vuc2UpKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5saWNlbnNlLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlcykpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH1cbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmcobWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGFuIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaW5mbyBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX2luZm9IZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+YDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcbiAgICAgICAgaWYgKCFkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlcyAtIFRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbCA9IGZhbHNlKSB7XG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIGVtcHR5IHZhbHVlc1xuICAgICAgICBsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuICAgICAgICBpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNBcnJheS5wb3AoaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG1lc3NhZ2VzQXJyYXlbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSB7ZXJyb3I6IG1lc3NhZ2VzfTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG4gICAgICAgIGlmIChtZXNzYWdlc0FycmF5Lmxlbmd0aCA9PT0gMSB8fCBPYmplY3Qua2V5cyhtZXNzYWdlc0FycmF5KS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gJ2luZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aD4wKXtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgdG8gdGhlIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBzY3JvbGxUb01lc3NhZ2VzKCkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG59O1xuIl19