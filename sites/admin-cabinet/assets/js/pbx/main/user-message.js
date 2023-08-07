"use strict";

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
   * Converts the input text to plain text if it is an object or an array.
   * @param {string|object|array} text - The text to be converted.
   * @returns {string} The converted plain text.
   */
  convertToText: function convertToText(text) {
    if ((Array.isArray(text) || _typeof(text) === 'object') && Object.keys(text).length > 0 && text.messages !== undefined) {
      return text.messages;
    } else {
      return text;
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
   * @param {string|object|array} message - The multiple messages.
   * @param {string} [header=''] - The header of the multiple messages.
   * @param disableScroll - If true, then the message will not be scrolled to.
   */
  showMultiString: function showMultiString(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var disableScroll = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var messages = UserMessage.convertToText(message);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJtc2dfRXJyb3JIZWFkZXIiLCJhZnRlciIsInNjcm9sbFRvTWVzc2FnZXMiLCJzaG93TGljZW5zZUVycm9yIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsImtleU1hbmFnZW1lbnRTaXRlIiwiZXJyb3IiLCJwdXNoIiwic2hvd011bHRpU3RyaW5nIiwic2hvd1dhcm5pbmciLCJtc2dfV2FybmluZ0hlYWRlciIsInNob3dJbmZvcm1hdGlvbiIsIm1zZ19pbmZvSGVhZGVyIiwicmVtb3ZlIiwibWVzc2FnZXNBcnJheSIsImVhY2giLCJpbmRleCIsInZhbHVlIiwicG9wIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMSDs7QUFPaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxF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QUNIOztBQUNEQyxVQUFBQSxPQUFPLGFBQU1BLE9BQU4saUJBQW9CRixRQUFwQixDQUFQO0FBQ0g7O0FBQ0RELFFBQUFBLGVBQWUsR0FBR0YsS0FBbEI7QUFDSCxPQVREO0FBVUF0QyxNQUFBQSxXQUFXLENBQUM4QixXQUFaLENBQXdCYSxPQUF4QixFQUFpQzdCLE1BQWpDLEVBQXlDQyxhQUF6QztBQUNIO0FBQ0osR0E3S2U7O0FBK0toQjtBQUNKO0FBQ0E7QUFDSUssRUFBQUEsZ0JBbExnQiw4QkFrTEc7QUFDZmxCLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0IwQyxPQUFoQixDQUF3QjtBQUNwQkMsTUFBQUEsU0FBUyxFQUFFN0MsV0FBVyxDQUFDQyxnQkFBWixDQUE2QjZDLE1BQTdCLEdBQXNDQyxHQUF0QyxHQUE0QztBQURuQyxLQUF4QixFQUVHLElBRkg7QUFHSDtBQXRMZSxDQUFwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVXNlck1lc3NhZ2Ugb2JqZWN0IGZvciBtYW5hZ2luZyB1c2VyIG1lc3NhZ2VzLlxuICogQG1vZHVsZSBVc2VyTWVzc2FnZVxuICovXG5jb25zdCBVc2VyTWVzc2FnZSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgQUpBWCBtZXNzYWdlcyBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdGhlIGlucHV0IHRleHQgdG8gcGxhaW4gdGV4dCBpZiBpdCBpcyBhbiBvYmplY3Qgb3IgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSB0ZXh0IC0gVGhlIHRleHQgdG8gYmUgY29udmVydGVkLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb252ZXJ0ZWQgcGxhaW4gdGV4dC5cbiAgICAgKi9cbiAgICBjb252ZXJ0VG9UZXh0KHRleHQpIHtcbiAgICAgICAgaWYgKChBcnJheS5pc0FycmF5KHRleHQpIHx8IHR5cGVvZiB0ZXh0ID09PSAnb2JqZWN0JylcbiAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKHRleHQpLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIHRleHQubWVzc2FnZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0Lm1lc3NhZ2VzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGw9ZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBlcnJvciBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19FcnJvckhlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgbGljZW5zZSBlcnJvciB3aXRoIG1hbmFnZW1lbnQgbGluayBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZXMgLSBUaGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VFcnJvcihoZWFkZXIsIG1lc3NhZ2VzLCBkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgIGNvbnN0IG1hbmFnZUxpbmsgPSBgPGJyPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19NYW5hZ2VMaWNlbnNlfSA8YSBocmVmPVwiJHtDb25maWcua2V5TWFuYWdlbWVudFVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke0NvbmZpZy5rZXlNYW5hZ2VtZW50U2l0ZX08L2E+YDtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpKXtcbiAgICAgICAgICAgIG1lc3NhZ2VzLmVycm9yLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlcykpe1xuICAgICAgICAgICAgbWVzc2FnZXMucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgfVxuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93V2FybmluZyhtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbD1mYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYW4gaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93SW5mb3JtYXRpb24obWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBpbmZvIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpbmZvIGljb25cIj48L2k+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBpZiAoaGVhZGVyICE9PSAnJykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfaW5mb0hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG11bHRpcGxlIG1lc3NhZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd011bHRpU3RyaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsPWZhbHNlKSB7XG4gICAgICAgIGxldCBtZXNzYWdlcyA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlcykgcmV0dXJuO1xuXG4gICAgICAgIC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcbiAgICAgICAgbGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcbiAgICAgICAgaWYgKChBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSB8fCB0eXBlb2YgbWVzc2FnZXMgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSBtZXNzYWdlcztcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkucG9wKGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpICYmIG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlc0FycmF5ID0ge2Vycm9yOiBtZXNzYWdlc307XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByZXZpb3VzTWVzc2FnZSA9ICcnO1xuICAgICAgICBpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IG5ld1ZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG5ld1ZhbHVlLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcobmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGVudCA9ICcnO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNNZXNzYWdlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgJHtjb250ZW50fTxicj4ke25ld1ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgdG8gdGhlIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBzY3JvbGxUb01lc3NhZ2VzKCkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG59O1xuIl19