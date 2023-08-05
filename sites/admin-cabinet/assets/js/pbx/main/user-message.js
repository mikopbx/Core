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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJtc2dfRXJyb3JIZWFkZXIiLCJhZnRlciIsInNjcm9sbFRvTWVzc2FnZXMiLCJzaG93V2FybmluZyIsIm1zZ19XYXJuaW5nSGVhZGVyIiwic2hvd0luZm9ybWF0aW9uIiwibXNnX2luZm9IZWFkZXIiLCJzaG93TXVsdGlTdHJpbmciLCJyZW1vdmUiLCJtZXNzYWdlc0FycmF5IiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJwb3AiLCJlcnJvciIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiam9pbiIsImNvbnRlbnQiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEg7O0FBT2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFaZ0IseUJBWUZDLElBWkUsRUFZSTtBQUNoQixRQUFJLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjRixJQUFkLEtBQXVCLFFBQU9BLElBQVAsTUFBZ0IsUUFBeEMsS0FDR0cs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TUFrQk87QUFDSCxVQUFJTSxPQUFPLEdBQUcsRUFBZDtBQUNBbEMsTUFBQUEsQ0FBQyxDQUFDMEIsSUFBRixDQUFPRCxhQUFQLEVBQXNCLFVBQUNFLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNwQyxZQUFJSSxRQUFRLEdBQUdKLEtBQWY7O0FBQ0EsWUFBSUcsZUFBZSxLQUFLSCxLQUF4QixFQUErQjtBQUMzQixjQUFJekIsS0FBSyxDQUFDQyxPQUFOLENBQWM0QixRQUFkLENBQUosRUFBNkI7QUFDekJBLFlBQUFBLFFBQVEsR0FBR0EsUUFBUSxDQUFDQyxJQUFULENBQWMsTUFBZCxDQUFYO0FBQ0g7O0FBQ0RDLFVBQUFBLE9BQU8sYUFBTUEsT0FBTixpQkFBb0JGLFFBQXBCLENBQVA7QUFDSDs7QUFDREQsUUFBQUEsZUFBZSxHQUFHSCxLQUFsQjtBQUNILE9BVEQ7QUFVQTlCLE1BQUFBLFdBQVcsQ0FBQ3FCLFdBQVosQ0FBd0JlLE9BQXhCLEVBQWlDdEIsTUFBakMsRUFBeUNDLGFBQXpDO0FBQ0g7QUFDSixHQTdKZTs7QUErSmhCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxnQkFsS2dCLDhCQWtLRztBQUNmbEIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQm1DLE9BQWhCLENBQXdCO0FBQ3BCQyxNQUFBQSxTQUFTLEVBQUV0QyxXQUFXLENBQUNDLGdCQUFaLENBQTZCc0MsTUFBN0IsR0FBc0NDLEdBQXRDLEdBQTRDO0FBRG5DLEtBQXhCLEVBRUcsSUFGSDtBQUdIO0FBdEtlLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVc2VyTWVzc2FnZSBvYmplY3QgZm9yIG1hbmFnaW5nIHVzZXIgbWVzc2FnZXMuXG4gKiBAbW9kdWxlIFVzZXJNZXNzYWdlXG4gKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBBSkFYIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhamF4TWVzc2FnZXNEaXY6ICQoJyNhamF4LW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgaW5wdXQgdGV4dCB0byBwbGFpbiB0ZXh0IGlmIGl0IGlzIGFuIG9iamVjdCBvciBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IHRleHQgLSBUaGUgdGV4dCB0byBiZSBjb252ZXJ0ZWQuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbnZlcnRlZCBwbGFpbiB0ZXh0LlxuICAgICAqL1xuICAgIGNvbnZlcnRUb1RleHQodGV4dCkge1xuICAgICAgICBpZiAoKEFycmF5LmlzQXJyYXkodGV4dCkgfHwgdHlwZW9mIHRleHQgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXModGV4dCkubGVuZ3RoID4gMFxuICAgICAgICAgICAgJiYgdGV4dC5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHRleHQubWVzc2FnZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbD1mYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGVycm9yIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX0Vycm9ySGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dXYXJuaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsPWZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX1dhcm5pbmdIZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+YDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcbiAgICAgICAgaWYgKCFkaXNhYmxlU2Nyb2xsKXtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dJbmZvcm1hdGlvbihtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGluZm8gaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImluZm8gaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19pbmZvSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIG11bHRpcGxlIG1lc3NhZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIG11bHRpcGxlIG1lc3NhZ2VzLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93TXVsdGlTdHJpbmcobWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGw9ZmFsc2UpIHtcbiAgICAgICAgbGV0IG1lc3NhZ2VzID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICBpZiAoIW1lc3NhZ2VzKSByZXR1cm47XG5cbiAgICAgICAgLy8gUmVtb3ZlIGVtcHR5IHZhbHVlc1xuICAgICAgICBsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuICAgICAgICBpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNBcnJheS5wb3AoaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG1lc3NhZ2VzQXJyYXlbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSB7ZXJyb3I6IG1lc3NhZ2VzfTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG4gICAgICAgIGlmIChtZXNzYWdlc0FycmF5Lmxlbmd0aCA9PT0gMSB8fCBPYmplY3Qua2V5cyhtZXNzYWdlc0FycmF5KS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gJ2luZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKGNvbnRlbnQsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2Nyb2xscyB0byB0aGUgbWVzc2FnZXMgY29udGFpbmVyLlxuICAgICAqL1xuICAgIHNjcm9sbFRvTWVzc2FnZXMoKSB7XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcbiAgICAgICAgICAgIHNjcm9sbFRvcDogVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5vZmZzZXQoKS50b3AgLSA1MCxcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgfSxcbn07XG4iXX0=