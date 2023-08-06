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
    messages.push(manageLink);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJtc2dfRXJyb3JIZWFkZXIiLCJhZnRlciIsInNjcm9sbFRvTWVzc2FnZXMiLCJzaG93TGljZW5zZUVycm9yIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsImtleU1hbmFnZW1lbnRTaXRlIiwicHVzaCIsInNob3dNdWx0aVN0cmluZyIsInNob3dXYXJuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMSDs7QUFPaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxF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S2hCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxnQkE5S2dCLDhCQThLRztBQUNmbEIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQjBDLE9BQWhCLENBQXdCO0FBQ3BCQyxNQUFBQSxTQUFTLEVBQUU3QyxXQUFXLENBQUNDLGdCQUFaLENBQTZCNkMsTUFBN0IsR0FBc0NDLEdBQXRDLEdBQTRDO0FBRG5DLEtBQXhCLEVBRUcsSUFGSDtBQUdIO0FBbExlLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVc2VyTWVzc2FnZSBvYmplY3QgZm9yIG1hbmFnaW5nIHVzZXIgbWVzc2FnZXMuXG4gKiBAbW9kdWxlIFVzZXJNZXNzYWdlXG4gKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBBSkFYIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhamF4TWVzc2FnZXNEaXY6ICQoJyNhamF4LW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgaW5wdXQgdGV4dCB0byBwbGFpbiB0ZXh0IGlmIGl0IGlzIGFuIG9iamVjdCBvciBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IHRleHQgLSBUaGUgdGV4dCB0byBiZSBjb252ZXJ0ZWQuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbnZlcnRlZCBwbGFpbiB0ZXh0LlxuICAgICAqL1xuICAgIGNvbnZlcnRUb1RleHQodGV4dCkge1xuICAgICAgICBpZiAoKEFycmF5LmlzQXJyYXkodGV4dCkgfHwgdHlwZW9mIHRleHQgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXModGV4dCkubGVuZ3RoID4gMFxuICAgICAgICAgICAgJiYgdGV4dC5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHRleHQubWVzc2FnZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbD1mYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGVycm9yIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX0Vycm9ySGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBsaWNlbnNlIGVycm9yIHdpdGggbWFuYWdlbWVudCBsaW5rIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlcyAtIFRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUVycm9yKGhlYWRlciwgbWVzc2FnZXMsIGRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICBtZXNzYWdlcy5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93V2FybmluZyhtZXNzYWdlLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbD1mYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYW4gaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBkaXNhYmxlU2Nyb2xsIC0gSWYgdHJ1ZSwgdGhlbiB0aGUgbWVzc2FnZSB3aWxsIG5vdCBiZSBzY3JvbGxlZCB0by5cbiAgICAgKi9cbiAgICBzaG93SW5mb3JtYXRpb24obWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBpbmZvIGljb24gbWVzc2FnZSBhamF4XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpbmZvIGljb25cIj48L2k+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBpZiAoaGVhZGVyICE9PSAnJykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfaW5mb0hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG11bHRpcGxlIG1lc3NhZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gbWVzc2FnZSAtIFRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd011bHRpU3RyaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsPWZhbHNlKSB7XG4gICAgICAgIGxldCBtZXNzYWdlcyA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlcykgcmV0dXJuO1xuXG4gICAgICAgIC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcbiAgICAgICAgbGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcbiAgICAgICAgaWYgKChBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSB8fCB0eXBlb2YgbWVzc2FnZXMgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSBtZXNzYWdlcztcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkucG9wKGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpICYmIG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlc0FycmF5ID0ge2Vycm9yOiBtZXNzYWdlc307XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByZXZpb3VzTWVzc2FnZSA9ICcnO1xuICAgICAgICBpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IG5ld1ZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG5ld1ZhbHVlLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcobmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGVudCA9ICcnO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNNZXNzYWdlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgJHtjb250ZW50fTxicj4ke25ld1ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgdG8gdGhlIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBzY3JvbGxUb01lc3NhZ2VzKCkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG59O1xuIl19