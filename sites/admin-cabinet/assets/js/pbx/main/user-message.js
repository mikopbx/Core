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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsImRhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJ0cmFuc2Zvcm1lZEFycmF5IiwibWFwIiwiaXRlbSIsImpvaW4iLCJ0cmFuc2Zvcm1lZE9iamVjdCIsIk9iamVjdCIsImVudHJpZXMiLCJrZXkiLCJ2YWx1ZSIsIlN0cmluZyIsInJlcGxhY2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiZGlzYWJsZVNjcm9sbCIsInRleHQiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwibXNnX0Vycm9ySGVhZGVyIiwiYWZ0ZXIiLCJzY3JvbGxUb01lc3NhZ2VzIiwic2hvd0xpY2Vuc2VFcnJvciIsIm1lc3NhZ2VzIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsImtleU1hbmFnZW1lbnRTaXRlIiwiZXJyb3IiLCJwdXNoIiwibGljZW5zZSIsInNob3dNdWx0aVN0cmluZyIsInNob3dXYXJuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJrZXlzIiwibGVuZ3RoIiwiZWFjaCIsImluZGV4IiwicG9wIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJjb250ZW50IiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdB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QUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQm1ELE9BQWhCLENBQXdCO0FBQ3BCQyxNQUFBQSxTQUFTLEVBQUV0RCxXQUFXLENBQUNDLGdCQUFaLENBQTZCc0QsTUFBN0IsR0FBc0NDLEdBQXRDLEdBQTRDO0FBRG5DLEtBQXhCLEVBRUcsSUFGSDtBQUdIO0FBak1lLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVc2VyTWVzc2FnZSBvYmplY3QgZm9yIG1hbmFnaW5nIHVzZXIgbWVzc2FnZXMuXG4gKiBAbW9kdWxlIFVzZXJNZXNzYWdlXG4gKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBBSkFYIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhamF4TWVzc2FnZXNEaXY6ICQoJyNhamF4LW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRleHQgZGF0YSB0byBhIG1vcmUgdXNlci1mcmllbmRseSBmb3JtYXQuXG4gICAgICogUmVwbGFjZXMgbmV3bGluZSBjaGFyYWN0ZXJzIHdpdGggSFRNTCBsaW5lIGJyZWFrIHRhZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xBcnJheXxPYmplY3R9IGRhdGEgLSBUaGUgaW5wdXQgdGV4dCBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb252ZXJ0ZWQgdGV4dC5cbiAgICAgKi9cbiAgICBjb252ZXJ0VG9UZXh0KGRhdGEpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIC8vIEZvciBhcnJheXMsIHJlY3Vyc2l2ZWx5IHRyYW5zZm9ybSBlYWNoIGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkQXJyYXkgPSBkYXRhLm1hcChpdGVtID0+IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQoaXRlbSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybWVkQXJyYXkuam9pbignPGJyPicpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGb3Igb2JqZWN0cywgcmVjdXJzaXZlbHkgdHJhbnNmb3JtIGVhY2ggdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkT2JqZWN0ID0gT2JqZWN0LmVudHJpZXMoZGF0YSkubWFwKChba2V5LCB2YWx1ZV0pID0+IGAke1VzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQodmFsdWUpfWApO1xuICAgICAgICAgICAgcmV0dXJuIGAke3RyYW5zZm9ybWVkT2JqZWN0LmpvaW4oJzxicj4nKX1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIG90aGVyIGRhdGEgdHlwZXMsIHNpbXBseSByZXR1cm4gYXMgc3RyaW5nXG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd0Vycm9yKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBlcnJvciBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19FcnJvckhlYWRlcn08L2Rpdj5gXG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSBgPHA+JHt0ZXh0fTwvcD5gO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuICAgICAgICBpZiAoIWRpc2FibGVTY3JvbGwpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIGxpY2Vuc2UgZXJyb3Igd2l0aCBtYW5hZ2VtZW50IGxpbmsgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2VzIC0gVGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIGRpc2FibGVTY3JvbGwgLSBJZiB0cnVlLCB0aGVuIHRoZSBtZXNzYWdlIHdpbGwgbm90IGJlIHNjcm9sbGVkIHRvLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlRXJyb3IoaGVhZGVyLCBtZXNzYWdlcywgZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICBjb25zdCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtDb25maWcua2V5TWFuYWdlbWVudFNpdGV9PC9hPmA7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSkge1xuICAgICAgICAgICAgbWVzc2FnZXMuZXJyb3IucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmxpY2Vuc2UpKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5saWNlbnNlLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlcykpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH1cbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbaGVhZGVyPScnXSAtIFRoZSBoZWFkZXIgb2YgdGhlIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmcobWVzc2FnZSwgaGVhZGVyID0gJycsIGRpc2FibGVTY3JvbGwgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgaWNvbiBtZXNzYWdlIGFqYXhcIj4nO1xuICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIGlmIChoZWFkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA8cD4ke3RleHR9PC9wPmA7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG4gICAgICAgIGlmICghZGlzYWJsZVNjcm9sbCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGFuIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlIC0gVGhlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtoZWFkZXI9JyddIC0gVGhlIGhlYWRlciBvZiB0aGUgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UsIGhlYWRlciA9ICcnLCBkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2UgYWpheFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaW5mbyBpY29uXCI+PC9pPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgaWYgKGhlYWRlciAhPT0gJycpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX2luZm9IZWFkZXJ9PC9kaXY+YFxuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+YDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcbiAgICAgICAgaWYgKCFkaXNhYmxlU2Nyb2xsKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgbXVsdGlwbGUgbWVzc2FnZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBtZXNzYWdlcyAtIFRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW2hlYWRlcj0nJ10gLSBUaGUgaGVhZGVyIG9mIHRoZSBtdWx0aXBsZSBtZXNzYWdlcy5cbiAgICAgKiBAcGFyYW0gZGlzYWJsZVNjcm9sbCAtIElmIHRydWUsIHRoZW4gdGhlIG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2Nyb2xsZWQgdG8uXG4gICAgICovXG4gICAgc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIgPSAnJywgZGlzYWJsZVNjcm9sbCA9IGZhbHNlKSB7XG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIGVtcHR5IHZhbHVlc1xuICAgICAgICBsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuICAgICAgICBpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuICAgICAgICAgICAgJC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNBcnJheS5wb3AoaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG1lc3NhZ2VzQXJyYXlbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzQXJyYXkgPSB7ZXJyb3I6IG1lc3NhZ2VzfTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG4gICAgICAgIGlmIChtZXNzYWdlc0FycmF5Lmxlbmd0aCA9PT0gMSB8fCBPYmplY3Qua2V5cyhtZXNzYWdlc0FycmF5KS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlciwgZGlzYWJsZVNjcm9sbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gJ2luZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhuZXdWYWx1ZSwgaGVhZGVyLCBkaXNhYmxlU2Nyb2xsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aD4wKXtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIsIGRpc2FibGVTY3JvbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgdG8gdGhlIG1lc3NhZ2VzIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBzY3JvbGxUb01lc3NhZ2VzKCkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG59O1xuIl19