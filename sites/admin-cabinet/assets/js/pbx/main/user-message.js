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
var UserMessage = {
  $ajaxMessagesDiv: $('#ajax-messages'),
  convertToText: function convertToText(text) {
    if ((Array.isArray(text) || _typeof(text) === 'object') && Object.keys(text).length > 0 && text.messages !== undefined) {
      return text.messages;
    } else {
      return text;
    }
  },
  showError: function showError(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui error message ajax">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
      html += "<div class=\"header\">".concat(globalTranslate.msg_ErrorHeader, "</div>");
    }

    html += "<p>".concat(text, "</p></div>");
    UserMessage.$ajaxMessagesDiv.after(html);
    UserMessage.scrollToMessages();
  },
  showWarning: function showWarning(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui warning message ajax">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
      html += "<div class=\"header\">".concat(globalTranslate.msg_WarningHeader, "</div>");
    }

    html += "<p>".concat(text, "</p></div>");
    UserMessage.$ajaxMessagesDiv.after(html);
    UserMessage.scrollToMessages();
  },
  showInformation: function showInformation(message) {
    var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var text = UserMessage.convertToText(message);
    var html = '<div class="ui info message ajax">';

    if (header !== '') {
      html += "<div class=\"header\">".concat(header, "</div>");
    } else {
      html += "<div class=\"header\">".concat(globalTranslate.msg_infoHeader, "</div>");
    }

    html += "<p>".concat(text, "</p></div>");
    UserMessage.$ajaxMessagesDiv.after(html);
    UserMessage.scrollToMessages();
  },
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
  scrollToMessages: function scrollToMessages() {
    $('html, body').animate({
      scrollTop: UserMessage.$ajaxMessagesDiv.offset().top - 50
    }, 2000);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dXYXJuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInNob3dNdWx0aVN0cmluZyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ25CQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREE7QUFFbkJDLEVBQUFBLGFBRm1CLHlCQUVMQyxJQUZLLEVBRUE7QUFDbEIsUUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsSUFBZCxLQUF1QixRQUFPQSxJQUFQLE1BQWdCLFFBQXhDLEtBQ0FHLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixJQUFaLEVBQWtCSyxNQUFsQixHQUEyQixDQUQzQixJQUVBTCxJQUFJLENBQUNNLFFBQUwsS0FBa0JDLFNB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QUFBQSxXQUFXLENBQUNzQixlQUFaLENBQTRCVyxRQUE1QixFQUFzQ25CLE1BQXRDO0FBQ0EsU0FGTSxNQUVBO0FBQ05kLFVBQUFBLFdBQVcsQ0FBQ29CLFdBQVosQ0FBd0JhLFFBQXhCLEVBQWtDbkIsTUFBbEM7QUFDQTs7QUFDRGtCLFFBQUFBLGVBQWUsR0FBR0gsS0FBbEI7QUFDQSxPQWhCRDtBQWlCQSxLQWxCRCxNQWtCTztBQUNOLFVBQUlNLE9BQU8sR0FBRyxFQUFkO0FBQ0FqQyxNQUFBQSxDQUFDLENBQUN5QixJQUFGLENBQU9ELGFBQVAsRUFBc0IsVUFBQ0UsS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQ3ZDLFlBQUlJLFFBQVEsR0FBR0osS0FBZjs7QUFDQSxZQUFJRyxlQUFlLEtBQUtILEtBQXhCLEVBQStCO0FBQzlCLGNBQUl4QixLQUFLLENBQUNDLE9BQU4sQ0FBYzJCLFFBQWQsQ0FBSixFQUE2QjtBQUM1QkEsWUFBQUEsUUFBUSxHQUFHQSxRQUFRLENBQUNDLElBQVQsQ0FBYyxNQUFkLENBQVg7QUFDQTs7QUFDREMsVUFBQUEsT0FBTyxhQUFNQSxPQUFOLGlCQUFvQkYsUUFBcEIsQ0FBUDtBQUNBOztBQUNERCxRQUFBQSxlQUFlLEdBQUdILEtBQWxCO0FBQ0EsT0FURDtBQVVBN0IsTUFBQUEsV0FBVyxDQUFDb0IsV0FBWixDQUF3QmUsT0FBeEIsRUFBaUNyQixNQUFqQztBQUNBO0FBQ0QsR0F4R2tCO0FBeUduQkssRUFBQUEsZ0JBekdtQiw4QkF5R0E7QUFDbEJqQixJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCa0MsT0FBaEIsQ0FBd0I7QUFDdkJDLE1BQUFBLFNBQVMsRUFBRXJDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJxQyxNQUE3QixHQUFzQ0MsR0FBdEMsR0FBMEM7QUFEOUIsS0FBeEIsRUFFRyxJQUZIO0FBR0E7QUE3R2tCLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuXHQkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXHRjb252ZXJ0VG9UZXh0KHRleHQpe1xuXHRcdGlmICgoQXJyYXkuaXNBcnJheSh0ZXh0KSB8fCB0eXBlb2YgdGV4dCA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyh0ZXh0KS5sZW5ndGggPiAwXG5cdFx0XHQmJiB0ZXh0Lm1lc3NhZ2VzICE9PSB1bmRlZmluZWRcblx0XHQpIHtcblx0XHRcdHJldHVybiB0ZXh0Lm1lc3NhZ2VzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGV4dDtcblx0XHR9XG5cdH0sXG5cdHNob3dFcnJvcihtZXNzYWdlLCBoZWFkZXIgPSAnJykge1xuXHRcdGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19FcnJvckhlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd1dhcm5pbmcobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcblx0XHR9XG5cdFx0aHRtbCArPSBgPHA+JHt0ZXh0fTwvcD48L2Rpdj5gO1xuXHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG5cdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHR9LFxuXHRzaG93SW5mb3JtYXRpb24obWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19pbmZvSGVhZGVyfTwvZGl2PmBcblx0XHR9XG5cdFx0aHRtbCArPSBgPHA+JHt0ZXh0fTwvcD48L2Rpdj5gO1xuXHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG5cdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHR9LFxuXHRzaG93TXVsdGlTdHJpbmcobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRsZXQgbWVzc2FnZXMgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRpZiAoIW1lc3NhZ2VzKSByZXR1cm47XG5cblx0XHQvLyBSZW1vdmUgZW1wdHkgdmFsdWVzXG5cdFx0bGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcblx0XHRpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmICghdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSl7XG5cdFx0XHRcdFx0XHRtZXNzYWdlc0FycmF5LnBvcChpbmRleCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcblx0XHRcdG1lc3NhZ2VzQXJyYXkgPSB7IGVycm9yOiBtZXNzYWdlcyB9O1xuXHRcdH1cblx0XHRsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG5cdFx0aWYgKG1lc3NhZ2VzQXJyYXkubGVuZ3RoID09PSAxIHx8IE9iamVjdC5rZXlzKG1lc3NhZ2VzQXJyYXkpLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0aWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuXHRcdFx0XHRcdG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gJ2luZm8nKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCBjb250ZW50ID0gJyc7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0aWYgKHByZXZpb3VzTWVzc2FnZSAhPT0gdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcblx0XHRcdFx0XHRcdG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb250ZW50ID0gYCR7Y29udGVudH08YnI+JHtuZXdWYWx1ZX1gO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXZpb3VzTWVzc2FnZSA9IHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93V2FybmluZyhjb250ZW50LCBoZWFkZXIpO1xuXHRcdH1cblx0fSxcblx0c2Nyb2xsVG9NZXNzYWdlcygpIHtcblx0XHQkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRzY3JvbGxUb3A6IFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYub2Zmc2V0KCkudG9wLTUwLFxuXHRcdH0sIDIwMDApO1xuXHR9LFxufTtcbiJdfQ==