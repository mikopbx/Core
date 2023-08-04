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
   */
  showError: function showError(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
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
    UserMessage.scrollToMessages();
  },

  /**
   * Shows a warning message.
   * @param {string|object|array} message - The warning message.
   * @param {string} [header=''] - The header of the warning message.
   */
  showWarning: function showWarning(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
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
    UserMessage.scrollToMessages();
  },

  /**
   * Shows an information message.
   * @param {string|object|array} message - The information message.
   * @param {string} [header=''] - The header of the information message.
   */
  showInformation: function showInformation(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
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
    UserMessage.scrollToMessages();
  },

  /**
   * Shows multiple messages.
   * @param {string|object|array} message - The multiple messages.
   * @param {string} [header=''] - The header of the multiple messages.
   */
  showMultiString: function showMultiString(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
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
          UserMessage.showError(newValue, header);
        } else if (index === 'info') {
          UserMessage.showInformation(newValue, header);
        } else {
          UserMessage.showWarning(newValue, header);
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
      UserMessage.showWarning(content, header);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dXYXJuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInNob3dNdWx0aVN0cmluZyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMSDs7QUFPaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQVpnQix5QkFZRkMsSUFaRSxFQVlJO0FBQ2hCLFFBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNGLElBQWQsS0FBdUIsUUFBT0EsSUFBUCxNQUFnQixRQUF4QyxLQUNHRyxNQUFNLENBQUNDLElBQVAsQ0FBWUosSUFBWixFQUFrQkssTUFBbEIsR0FBMkIsQ0FEOUIsSUFFR0wsSUFBSSxDQUFDTSxRQUFMLEtBQWtCQyxTQUZ6QixFQUdFO0FBQ0UsYUFBT1AsSUFBSSxDQUFDTSxRQUFaO0FBQ0gsS0FMRCxNQUtPO0FBQ0gsYUFBT04sSUFBUDtBQUNIO0FBQ0osR0FyQmU7O0FBdUJoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLFNBNUJnQixxQkE0Qk5DLE9BNUJNLEVBNEJnQjtBQUFBLFFBQWJDLE1BQWEsdUVBQUosRUFBSTtBQUM1QixRQUFNVixJQUFJLEdBQUdKLFdBQVcsQ0FBQ0csYUFBWixDQUEwQlUsT0FBMUIsQ0FBYjtBQUNBLFFBQUlFLElBQUksR0FBRywwQ0FBWDtBQUNBQSxJQUFBQSxJQUFJLElBQUksa0NBQVI7QUFDQUEsSUFBQUEsSUFBSSxJQUFJLHVCQUFSOztBQUNBLFFBQUlELE1BQU0sS0FBSyxFQUFmLEVBQW1CO0FBQ2ZDLE1BQUFBLElBQUksb0NBQTJCRCxNQUEzQixXQUFKO0FBQ0gsS0FGRCxNQUVPO0FBQ0hDLE1BQUFBLElBQUksb0NBQTJCQyxlQUFlLENBQUNDLGVBQTNDLFdBQUo7QUFDSDs7QUFDREYsSUFBQUEsSUFBSSxpQkFBVVgsSUFBVixTQUFKO0FBQ0FXLElBQUFBLElBQUksSUFBSSxjQUFSO0FBQ0FmLElBQUFBLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJpQixLQUE3QixDQUFtQ0gsSUFBbkM7QUFDQWYsSUFBQUEsV0FBVyxDQUFDbUIsZ0JBQVo7QUFDSCxHQTFDZTs7QUE0Q2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FqRGdCLHVCQWlESlAsT0FqREksRUFpRGtCO0FBQUEsUUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQzlCLFFBQU1WLElBQUksR0FBR0osV0FBVyxDQUFDRyxhQUFaLENBQTBCVSxPQUExQixDQUFiO0FBQ0EsUUFBSUUsSUFBSSxHQUFHLDRDQUFYO0FBQ0FBLElBQUFBLElBQUksSUFBSSw4QkFBUjtBQUNBQSxJQUFBQSxJQUFJLElBQUksdUJBQVI7O0FBQ0EsUUFBSUQsTUFBTSxLQUFLLEVBQWYsRUFBbUI7QUFDZkMsTUFBQUEsSUFBSSxvQ0FBMkJELE1BQTNCLFdBQUo7QUFDSCxLQUZELE1BRU87QUFDSEMsTUFBQUEsSUFBSSxvQ0FBMkJDLGVBQWUsQ0FBQ0ssaUJBQTNDLFdBQUo7QUFDSDs7QUFDRE4sSUFBQUEsSUFBSSxpQkFBVVgsSUFBVixTQUFKO0FBQ0FXLElBQUFBLElBQUksSUFBSSxjQUFSO0FBQ0FmLElBQUFBLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJpQixLQUE3QixDQUFtQ0gsSUFBbkM7QUFDQWYsSUFBQUEsV0FBVyxDQUFDbUIsZ0JBQVo7QUFDSCxHQS9EZTs7QUFpRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUF0RWdCLDJCQXNFQVQsT0F0RUEsRUFzRXNCO0FBQUEsUUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQ2xDLFFBQU1WLElBQUksR0FBR0osV0FBVyxDQUFDRyxhQUFaLENBQTBCVSxPQUExQixDQUFiO0FBQ0EsUUFBSUUsSUFBSSxHQUFHLHlDQUFYO0FBQ0FBLElBQUFBLElBQUksSUFBSSwyQkFBUjtBQUNBQSxJQUFBQSxJQUFJLElBQUksdUJBQVI7O0FBQ0EsUUFBSUQsTUFBTSxLQUFLLEVBQWYsRUFBbUI7QUFDZkMsTUFBQUEsSUFBSSxvQ0FBMkJELE1BQTNCLFdBQUo7QUFDSCxLQUZELE1BRU87QUFDSEMsTUFBQUEsSUFBSSxvQ0FBMkJDLGVBQWUsQ0FBQ08sY0FBM0MsV0FBSjtBQUNIOztBQUNEUixJQUFBQSxJQUFJLGlCQUFVWCxJQUFWLFNBQUo7QUFDQVcsSUFBQUEsSUFBSSxJQUFJLGNBQVI7QUFDQWYsSUFBQUEsV0FBVyxDQUFDQyxnQkFBWixDQUE2QmlCLEtBQTdCLENBQW1DSCxJQUFuQztBQUNBZixJQUFBQSxXQUFXLENBQUNtQixnQkFBWjtBQUNILEdBcEZlOztBQXNGaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxlQTNGZ0IsMkJBMkZBWCxPQTNGQSxFQTJGc0I7QUFBQSxRQUFiQyxNQUFhLHVFQUFKLEVBQUk7QUFDbEMsUUFBSUosUUFBUSxHQUFHVixXQUFXLENBQUNHLGFBQVosQ0FBMEJVLE9BQTFCLENBQWY7QUFDQVgsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J1QixNQUF0QjtBQUNBLFFBQUksQ0FBQ2YsUUFBTCxFQUFlLE9BSG1CLENBS2xDOztBQUNBLFFBQUlnQixhQUFhLEdBQUcsRUFBcEI7O0FBQ0EsUUFBSSxDQUFDckIsS0FBSyxDQUFDQyxPQUFOLENBQWNJLFFBQWQsS0FBMkIsUUFBT0EsUUFBUCxNQUFvQixRQUFoRCxLQUNHSCxNQUFNLENBQUNDLElBQVAsQ0FBWUUsUUFBWixFQUFzQkQsTUFBdEIsR0FBK0IsQ0FEdEMsRUFDeUM7QUFDckNpQixNQUFBQSxhQUFhLEdBQUdoQixRQUFoQjtBQUNBUixNQUFBQSxDQUFDLENBQUN5QixJQUFGLENBQU9qQixRQUFQLEVBQWlCLFVBQUNrQixLQUFELEVBQVFDLEtBQVIsRUFBa0I7QUFDL0IsWUFBSSxDQUFDQSxLQUFMLEVBQVk7QUFDUixjQUFJeEIsS0FBSyxDQUFDQyxPQUFOLENBQWNvQixhQUFkLENBQUosRUFBa0M7QUFDOUJBLFlBQUFBLGFBQWEsQ0FBQ0ksR0FBZCxDQUFrQkYsS0FBbEI7QUFDSCxXQUZELE1BRU87QUFDSCxtQkFBT0YsYUFBYSxDQUFDRSxLQUFELENBQXBCO0FBQ0g7QUFFSjtBQUNKLE9BVEQ7QUFVSCxLQWJELE1BYU8sSUFBSSxDQUFDdkIsS0FBSyxDQUFDQyxPQUFOLENBQWNJLFFBQWQsQ0FBRCxJQUE0QkEsUUFBaEMsRUFBMEM7QUFDN0NnQixNQUFBQSxhQUFhLEdBQUc7QUFBQ0ssUUFBQUEsS0FBSyxFQUFFckI7QUFBUixPQUFoQjtBQUNIOztBQUNELFFBQUlzQixlQUFlLEdBQUcsRUFBdEI7O0FBQ0EsUUFBSU4sYUFBYSxDQUFDakIsTUFBZCxLQUF5QixDQUF6QixJQUE4QkYsTUFBTSxDQUFDQyxJQUFQLENBQVlrQixhQUFaLEVBQTJCakIsTUFBM0IsS0FBc0MsQ0FBeEUsRUFBMkU7QUFDdkVQLE1BQUFBLENBQUMsQ0FBQ3lCLElBQUYsQ0FBT0QsYUFBUCxFQUFzQixVQUFDRSxLQUFELEVBQVFDLEtBQVIsRUFBa0I7QUFDcEMsWUFBSUcsZUFBZSxLQUFLSCxLQUF4QixFQUErQjtBQUMzQjtBQUNIOztBQUNELFlBQUlJLFFBQVEsR0FBR0osS0FBZjs7QUFDQSxZQUFJeEIsS0FBSyxDQUFDQyxPQUFOLENBQWMyQixRQUFkLENBQUosRUFBNkI7QUFDekJBLFVBQUFBLFFBQVEsR0FBR0EsUUFBUSxDQUFDQyxJQUFULENBQWMsTUFBZCxDQUFYO0FBQ0g7O0FBQ0QsWUFBSU4sS0FBSyxLQUFLLE9BQWQsRUFBdUI7QUFDbkI1QixVQUFBQSxXQUFXLENBQUNZLFNBQVosQ0FBc0JxQixRQUF0QixFQUFnQ25CLE1BQWhDO0FBQ0gsU0FGRCxNQUVPLElBQUljLEtBQUssS0FBSyxNQUFkLEVBQXNCO0FBQ3pCNUIsVUFBQUEsV0FBVyxDQUFDc0IsZUFBWixDQUE0QlcsUUFBNUIsRUFBc0NuQixNQUF0QztBQUNILFNBRk0sTUFFQTtBQUNIZCxVQUFBQSxXQUFXLENBQUNvQixXQUFaLENBQXdCYSxRQUF4QixFQUFrQ25CLE1BQWxDO0FBQ0g7O0FBQ0RrQixRQUFBQSxlQUFlLEdBQUdILEtBQWxCO0FBQ0gsT0FoQkQ7QUFpQkgsS0FsQkQsTUFrQk87QUFDSCxVQUFJTSxPQUFPLEdBQUcsRUFBZDtBQUNBakMsTUFBQUEsQ0FBQyxDQUFDeUIsSUFBRixDQUFPRCxhQUFQLEVBQXNCLFVBQUNFLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNwQyxZQUFJSSxRQUFRLEdBQUdKLEtBQWY7O0FBQ0EsWUFBSUcsZUFBZSxLQUFLSCxLQUF4QixFQUErQjtBQUMzQixjQUFJeEIsS0FBSyxDQUFDQyxPQUFOLENBQWMyQixRQUFkLENBQUosRUFBNkI7QUFDekJBLFlBQUFBLFFBQVEsR0FBR0EsUUFBUSxDQUFDQyxJQUFULENBQWMsTUFBZCxDQUFYO0FBQ0g7O0FBQ0RDLFVBQUFBLE9BQU8sYUFBTUEsT0FBTixpQkFBb0JGLFFBQXBCLENBQVA7QUFDSDs7QUFDREQsUUFBQUEsZUFBZSxHQUFHSCxLQUFsQjtBQUNILE9BVEQ7QUFVQTdCLE1BQUFBLFdBQVcsQ0FBQ29CLFdBQVosQ0FBd0JlLE9BQXhCLEVBQWlDckIsTUFBakM7QUFDSDtBQUNKLEdBbkplOztBQXFKaEI7QUFDSjtBQUNBO0FBQ0lLLEVBQUFBLGdCQXhKZ0IsOEJBd0pHO0FBQ2ZqQixJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCa0MsT0FBaEIsQ0FBd0I7QUFDcEJDLE1BQUFBLFNBQVMsRUFBRXJDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJxQyxNQUE3QixHQUFzQ0MsR0FBdEMsR0FBNEM7QUFEbkMsS0FBeEIsRUFFRyxJQUZIO0FBR0g7QUE1SmUsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFVzZXJNZXNzYWdlIG9iamVjdCBmb3IgbWFuYWdpbmcgdXNlciBtZXNzYWdlcy5cbiAqIEBtb2R1bGUgVXNlck1lc3NhZ2VcbiAqL1xuY29uc3QgVXNlck1lc3NhZ2UgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIEFKQVggbWVzc2FnZXMgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFqYXhNZXNzYWdlc0RpdjogJCgnI2FqYXgtbWVzc2FnZXMnKSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBpbnB1dCB0ZXh0IHRvIHBsYWluIHRleHQgaWYgaXQgaXMgYW4gb2JqZWN0IG9yIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gdGV4dCAtIFRoZSB0ZXh0IHRvIGJlIGNvbnZlcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29udmVydGVkIHBsYWluIHRleHQuXG4gICAgICovXG4gICAgY29udmVydFRvVGV4dCh0ZXh0KSB7XG4gICAgICAgIGlmICgoQXJyYXkuaXNBcnJheSh0ZXh0KSB8fCB0eXBlb2YgdGV4dCA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyh0ZXh0KS5sZW5ndGggPiAwXG4gICAgICAgICAgICAmJiB0ZXh0Lm1lc3NhZ2VzICE9PSB1bmRlZmluZWRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGV4dC5tZXNzYWdlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBlcnJvciBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19FcnJvckhlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dXYXJuaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX1dhcm5pbmdIZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+YDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaW5mbyBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX2luZm9IZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+YDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICovXG4gICAgc2hvd011bHRpU3RyaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG4gICAgICAgIGxldCBtZXNzYWdlcyA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlcykgcmV0dXJuO1xuXG4gICAgICAgIC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcbiAgICAgICAgbGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcbiAgICAgICAgaWYgKChBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSB8fCB0eXBlb2YgbWVzc2FnZXMgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSBtZXNzYWdlcztcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkucG9wKGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpICYmIG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlc0FycmF5ID0ge2Vycm9yOiBtZXNzYWdlc307XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByZXZpb3VzTWVzc2FnZSA9ICcnO1xuICAgICAgICBpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IG5ld1ZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG5ld1ZhbHVlLCBoZWFkZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obmV3VmFsdWUsIGhlYWRlcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcobmV3VmFsdWUsIGhlYWRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGVudCA9ICcnO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNNZXNzYWdlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgJHtjb250ZW50fTxicj4ke25ld1ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgdG8gdGhlIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBzY3JvbGxUb01lc3NhZ2VzKCkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG59O1xuIl19