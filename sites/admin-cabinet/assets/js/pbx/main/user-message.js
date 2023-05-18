"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dXYXJuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInNob3dNdWx0aVN0cmluZyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ25CQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREE7QUFFbkJDLEVBQUFBLGFBRm1CLHlCQUVMQyxJQUZLLEVBRUE7QUFDbEIsUUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsSUFBZCxLQUF1QixRQUFPQSxJQUFQLE1BQWdCLFFBQXhDLEtBQ0FHLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixJQUFaLEVBQWtCSyxNQUFsQixHQUEyQixDQUQzQixJQUVBTCxJQUFJLENBQUNNLFFBQUwsS0FBa0JDLFNB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QUFBQSxXQUFXLENBQUNzQixlQUFaLENBQTRCVyxRQUE1QixFQUFzQ25CLE1BQXRDO0FBQ0EsU0FGTSxNQUVBO0FBQ05kLFVBQUFBLFdBQVcsQ0FBQ29CLFdBQVosQ0FBd0JhLFFBQXhCLEVBQWtDbkIsTUFBbEM7QUFDQTs7QUFDRGtCLFFBQUFBLGVBQWUsR0FBR0gsS0FBbEI7QUFDQSxPQWhCRDtBQWlCQSxLQWxCRCxNQWtCTztBQUNOLFVBQUlNLE9BQU8sR0FBRyxFQUFkO0FBQ0FqQyxNQUFBQSxDQUFDLENBQUN5QixJQUFGLENBQU9ELGFBQVAsRUFBc0IsVUFBQ0UsS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQ3ZDLFlBQUlJLFFBQVEsR0FBR0osS0FBZjs7QUFDQSxZQUFJRyxlQUFlLEtBQUtILEtBQXhCLEVBQStCO0FBQzlCLGNBQUl4QixLQUFLLENBQUNDLE9BQU4sQ0FBYzJCLFFBQWQsQ0FBSixFQUE2QjtBQUM1QkEsWUFBQUEsUUFBUSxHQUFHQSxRQUFRLENBQUNDLElBQVQsQ0FBYyxNQUFkLENBQVg7QUFDQTs7QUFDREMsVUFBQUEsT0FBTyxhQUFNQSxPQUFOLGlCQUFvQkYsUUFBcEIsQ0FBUDtBQUNBOztBQUNERCxRQUFBQSxlQUFlLEdBQUdILEtBQWxCO0FBQ0EsT0FURDtBQVVBN0IsTUFBQUEsV0FBVyxDQUFDb0IsV0FBWixDQUF3QmUsT0FBeEIsRUFBaUNyQixNQUFqQztBQUNBO0FBQ0QsR0F4R2tCO0FBeUduQkssRUFBQUEsZ0JBekdtQiw4QkF5R0E7QUFDbEJqQixJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCa0MsT0FBaEIsQ0FBd0I7QUFDdkJDLE1BQUFBLFNBQVMsRUFBRXJDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJxQyxNQUE3QixHQUFzQ0MsR0FBdEMsR0FBMEM7QUFEOUIsS0FBeEIsRUFFRyxJQUZIO0FBR0E7QUE3R2tCLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlICovXG5jb25zdCBVc2VyTWVzc2FnZSA9IHtcblx0JGFqYXhNZXNzYWdlc0RpdjogJCgnI2FqYXgtbWVzc2FnZXMnKSxcblx0Y29udmVydFRvVGV4dCh0ZXh0KXtcblx0XHRpZiAoKEFycmF5LmlzQXJyYXkodGV4dCkgfHwgdHlwZW9mIHRleHQgPT09ICdvYmplY3QnKVxuXHRcdFx0JiYgT2JqZWN0LmtleXModGV4dCkubGVuZ3RoID4gMFxuXHRcdFx0JiYgdGV4dC5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gdGV4dC5tZXNzYWdlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRleHQ7XG5cdFx0fVxuXHR9LFxuXHRzaG93RXJyb3IobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfRXJyb3JIZWFkZXJ9PC9kaXY+YFxuXHRcdH1cblx0XHRodG1sICs9IGA8cD4ke3RleHR9PC9wPjwvZGl2PmA7XG5cdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcblx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdH0sXG5cdHNob3dXYXJuaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG5cdFx0Y29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG5cdFx0bGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfV2FybmluZ0hlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG5cdFx0Y29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG5cdFx0bGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfaW5mb0hlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd011bHRpU3RyaW5nKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG5cdFx0bGV0IG1lc3NhZ2VzID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHQkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0aWYgKCFtZXNzYWdlcykgcmV0dXJuO1xuXG5cdFx0Ly8gUmVtb3ZlIGVtcHR5IHZhbHVlc1xuXHRcdGxldCBtZXNzYWdlc0FycmF5ID0gW107XG5cdFx0aWYgKChBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSB8fCB0eXBlb2YgbWVzc2FnZXMgPT09ICdvYmplY3QnKVxuXHRcdFx0JiYgT2JqZWN0LmtleXMobWVzc2FnZXMpLmxlbmd0aCA+IDApIHtcblx0XHRcdG1lc3NhZ2VzQXJyYXkgPSBtZXNzYWdlcztcblx0XHRcdCQuZWFjaChtZXNzYWdlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRpZiAoIXZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZXNBcnJheSkpe1xuXHRcdFx0XHRcdFx0bWVzc2FnZXNBcnJheS5wb3AoaW5kZXgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRkZWxldGUgbWVzc2FnZXNBcnJheVtpbmRleF07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpICYmIG1lc3NhZ2VzKSB7XG5cdFx0XHRtZXNzYWdlc0FycmF5ID0geyBlcnJvcjogbWVzc2FnZXMgfTtcblx0XHR9XG5cdFx0bGV0IHByZXZpb3VzTWVzc2FnZSA9ICcnO1xuXHRcdGlmIChtZXNzYWdlc0FycmF5Lmxlbmd0aCA9PT0gMSB8fCBPYmplY3Qua2V5cyhtZXNzYWdlc0FycmF5KS5sZW5ndGggPT09IDEpIHtcblx0XHRcdCQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcblx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93V2FybmluZyhuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgY29udGVudCA9ICcnO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoY29udGVudCwgaGVhZGVyKTtcblx0XHR9XG5cdH0sXG5cdHNjcm9sbFRvTWVzc2FnZXMoKSB7XG5cdFx0JCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0c2Nyb2xsVG9wOiBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2Lm9mZnNldCgpLnRvcC01MCxcblx0XHR9LCAyMDAwKTtcblx0fSxcbn07XG4iXX0=