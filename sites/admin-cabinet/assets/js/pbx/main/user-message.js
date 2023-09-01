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
    html += '<div class="content">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
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
    if (!messages) return; // Remove empty values

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
      UserMessage.showWarning(content, header, disableScroll);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsImRhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJ0cmFuc2Zvcm1lZEFycmF5IiwibWFwIiwiaXRlbSIsImpvaW4iLCJ0cmFuc2Zvcm1lZE9iamVjdCIsIk9iamVjdCIsImVudHJpZXMiLCJrZXkiLCJ2YWx1ZSIsIlN0cmluZyIsInJlcGxhY2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsInRleHQiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwibXNnX0Vycm9ySGVhZGVyIiwiYWZ0ZXIiLCJzY3JvbGxUb01lc3NhZ2VzIiwic2hvd0xpY2Vuc2VFcnJvciIsIm1lc3NhZ2VzIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsImtleU1hbmFnZW1lbnRTaXRlIiwiZXJyb3IiLCJwdXNoIiwic2hvd011bHRpU3RyaW5nIiwic2hvd1dhcm5pbmciLCJtc2dfV2FybmluZ0hlYWRlciIsInNob3dJbmZvcm1hdGlvbiIsIm1zZ19pbmZvSGVhZGVyIiwicmVtb3ZlIiwibWVzc2FnZXNBcnJheSIsImtleXMiLCJsZW5ndGgiLCJlYWNoIiwiaW5kZXgiLCJwb3AiLCJwcmV2aW91c01lc3NhZ2UiLCJuZXdWYWx1ZSIsImNvbnRlbnQiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNoQjtB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c3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFVzZXJNZXNzYWdlIG9iamVjdCBmb3IgbWFuYWdpbmcgdXNlciBtZXNzYWdlcy5cbiAqIEBtb2R1bGUgVXNlck1lc3NhZ2VcbiAqL1xuY29uc3QgVXNlck1lc3NhZ2UgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIEFKQVggbWVzc2FnZXMgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFqYXhNZXNzYWdlc0RpdjogJCgnI2FqYXgtbWVzc2FnZXMnKSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGV4dCBkYXRhIHRvIGEgbW9yZSB1c2VyLWZyaWVuZGx5IGZvcm1hdC5cbiAgICAgKiBSZXBsYWNlcyBuZXdsaW5lIGNoYXJhY3RlcnMgd2l0aCBIVE1MIGxpbmUgYnJlYWsgdGFncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fE9iamVjdH0gZGF0YSAtIFRoZSBpbnB1dCB0ZXh0IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbnZlcnRlZCB0ZXh0LlxuICAgICAqL1xuICAgIGNvbnZlcnRUb1RleHQoZGF0YSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgLy8gRm9yIGFycmF5cywgcmVjdXJzaXZlbHkgdHJhbnNmb3JtIGVhY2ggZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRBcnJheSA9IGRhdGEubWFwKGl0ZW0gPT4gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChpdGVtKSk7XG4gICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtZWRBcnJheS5qb2luKCc8YnI+Jyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIGRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIEZvciBvYmplY3RzLCByZWN1cnNpdmVseSB0cmFuc2Zvcm0gZWFjaCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRPYmplY3QgPSBPYmplY3QuZW50cmllcyhkYXRhKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7VXNlck1lc3NhZ2UuY29udmVydFRvVGV4dCh2YWx1ZSl9YCk7XG4gICAgICAgICAgICByZXR1cm4gYCR7dHJhbnNmb3JtZWRPYmplY3Quam9pbignPGJyPicpfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igb3RoZXIgZGF0YSB0eXBlcywgc2ltcGx5IHJldHVybiBhcyBzdHJpbmdcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSkucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGVycm9yIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX0Vycm9ySGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgbGljZW5zZSBlcnJvciB3aXRoIG1hbmFnZW1lbnQgbGluayBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZXMgLSBUaGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VFcnJvcihoZWFkZXIsIG1lc3NhZ2VzLCBkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgIGNvbnN0IG1hbmFnZUxpbmsgPSBgPGJyPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19NYW5hZ2VMaWNlbnNlfSA8YSBocmVmPVwiJHtDb25maWcua2V5TWFuYWdlbWVudFVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke0NvbmZpZy5rZXlNYW5hZ2VtZW50U2l0ZX08L2E+YDtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5lcnJvci5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dXYXJuaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBpZiAoaGVhZGVyICE9PSAnJykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfV2FybmluZ0hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dJbmZvcm1hdGlvbihtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGluZm8gaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImluZm8gaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19pbmZvSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG11bHRpcGxlIG1lc3NhZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZXMgLSBUaGUgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwgPSBmYWxzZSkge1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIGlmICghbWVzc2FnZXMpIHJldHVybjtcblxuICAgICAgICAvLyBSZW1vdmUgZW1wdHkgdmFsdWVzXG4gICAgICAgIGxldCBtZXNzYWdlc0FycmF5ID0gW107XG4gICAgICAgIGlmICgoQXJyYXkuaXNBcnJheShtZXNzYWdlcykgfHwgdHlwZW9mIG1lc3NhZ2VzID09PSAnb2JqZWN0JylcbiAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKG1lc3NhZ2VzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBtZXNzYWdlc0FycmF5ID0gbWVzc2FnZXM7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc0FycmF5LnBvcChpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbWVzc2FnZXNBcnJheVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSAmJiBtZXNzYWdlcykge1xuICAgICAgICAgICAgbWVzc2FnZXNBcnJheSA9IHtlcnJvcjogbWVzc2FnZXN9O1xuICAgICAgICB9XG4gICAgICAgIGxldCBwcmV2aW91c01lc3NhZ2UgPSAnJztcbiAgICAgICAgaWYgKG1lc3NhZ2VzQXJyYXkubGVuZ3RoID09PSAxIHx8IE9iamVjdC5rZXlzKG1lc3NhZ2VzQXJyYXkpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNNZXNzYWdlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID09PSAnaW5mbycpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG5ld1ZhbHVlLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKG5ld1ZhbHVlLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IG5ld1ZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzTWVzc2FnZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYCR7Y29udGVudH08YnI+JHtuZXdWYWx1ZX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoY29udGVudCwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTY3JvbGxzIHRvIHRoZSBtZXNzYWdlcyBjb250YWluZXIuXG4gICAgICovXG4gICAgc2Nyb2xsVG9NZXNzYWdlcygpIHtcbiAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICAgICAgc2Nyb2xsVG9wOiBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2Lm9mZnNldCgpLnRvcCAtIDUwLFxuICAgICAgICB9LCAyMDAwKTtcbiAgICB9LFxufTtcbiJdfQ==