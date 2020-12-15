"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
  convertToText: function () {
    function convertToText(text) {
      if ((Array.isArray(text) || _typeof(text) === 'object') && Object.keys(text).length > 0 && text.messages !== undefined) {
        return text.messages;
      } else {
        return text;
      }
    }

    return convertToText;
  }(),
  showError: function () {
    function showError(message) {
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
    }

    return showError;
  }(),
  showWraning: function () {
    function showWraning(message) {
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
    }

    return showWraning;
  }(),
  showInformation: function () {
    function showInformation(message) {
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
    }

    return showInformation;
  }(),
  showMultiString: function () {
    function showMultiString(message) {
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
            UserMessage.showWraning(newValue, header);
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
        UserMessage.showWraning(content, header);
      }
    }

    return showMultiString;
  }(),
  scrollToMessages: function () {
    function scrollToMessages() {
      $('html, body').animate({
        scrollTop: UserMessage.$ajaxMessagesDiv.offset().top - 50
      }, 2000);
    }

    return scrollToMessages;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dXcmFuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInNob3dNdWx0aVN0cmluZyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ25CQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREE7QUFFbkJDLEVBQUFBLGFBRm1CO0FBQUEsMkJBRUxDLElBRkssRUFFQTtBQUNsQixVQUFJLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjRixJQUFkLEtBQXVCLFFBQU9BLElBQVAsTUFBZ0IsUUFBeEMsS0FDQUcsTUFBTSxDQUFDQyxJQUFQLENBQVlKLElBQVosRUFBa0JLLE1BQWxCLEdBQTJCLENBRDNCLElBRUFMLElBQUksQ0FBQ00sUUFBTCxLQUFrQkMsU0FGdEIsRUFHRTtBQUNELGVBQU9QLElBQUksQ0FBQ00sUUFBWjtBQUNBLE9BTEQsTUFLTztBQUNOLGVB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IGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuY29uc3QgVXNlck1lc3NhZ2UgPSB7XG5cdCRhamF4TWVzc2FnZXNEaXY6ICQoJyNhamF4LW1lc3NhZ2VzJyksXG5cdGNvbnZlcnRUb1RleHQodGV4dCl7XG5cdFx0aWYgKChBcnJheS5pc0FycmF5KHRleHQpIHx8IHR5cGVvZiB0ZXh0ID09PSAnb2JqZWN0Jylcblx0XHRcdCYmIE9iamVjdC5rZXlzKHRleHQpLmxlbmd0aCA+IDBcblx0XHRcdCYmIHRleHQubWVzc2FnZXMgIT09IHVuZGVmaW5lZFxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHRleHQubWVzc2FnZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0ZXh0O1xuXHRcdH1cblx0fSxcblx0c2hvd0Vycm9yKG1lc3NhZ2UsIGhlYWRlciA9ICcnKSB7XG5cdFx0Y29uc3QgdGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG5cdFx0bGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPic7XG5cdFx0aWYgKGhlYWRlciE9PScnKXtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcblx0XHR9IGVsc2Uge1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX0Vycm9ySGVhZGVyfTwvZGl2PmBcblx0XHR9XG5cdFx0aHRtbCArPSBgPHA+JHt0ZXh0fTwvcD48L2Rpdj5gO1xuXHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG5cdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHR9LFxuXHRzaG93V3JhbmluZyhtZXNzYWdlLCBoZWFkZXIgPSAnJykge1xuXHRcdGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2UgYWpheFwiPic7XG5cdFx0aWYgKGhlYWRlciE9PScnKXtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcblx0XHR9IGVsc2Uge1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX1dhcm5pbmdIZWFkZXJ9PC9kaXY+YFxuXHRcdH1cblx0XHRodG1sICs9IGA8cD4ke3RleHR9PC9wPjwvZGl2PmA7XG5cdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcblx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdH0sXG5cdHNob3dJbmZvcm1hdGlvbihtZXNzYWdlLCBoZWFkZXIgPSAnJykge1xuXHRcdGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgYWpheFwiPic7XG5cdFx0aWYgKGhlYWRlciE9PScnKXtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PmBcblx0XHR9IGVsc2Uge1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubXNnX2luZm9IZWFkZXJ9PC9kaXY+YFxuXHRcdH1cblx0XHRodG1sICs9IGA8cD4ke3RleHR9PC9wPjwvZGl2PmA7XG5cdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcblx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdH0sXG5cdHNob3dNdWx0aVN0cmluZyhtZXNzYWdlLCBoZWFkZXIgPSAnJykge1xuXHRcdGxldCBtZXNzYWdlcyA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZSk7XG5cdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdGlmICghbWVzc2FnZXMpIHJldHVybjtcblxuXHRcdC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcblx0XHRsZXQgbWVzc2FnZXNBcnJheSA9IFtdO1xuXHRcdGlmICgoQXJyYXkuaXNBcnJheShtZXNzYWdlcykgfHwgdHlwZW9mIG1lc3NhZ2VzID09PSAnb2JqZWN0Jylcblx0XHRcdCYmIE9iamVjdC5rZXlzKG1lc3NhZ2VzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRtZXNzYWdlc0FycmF5ID0gbWVzc2FnZXM7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXMsIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0aWYgKCF2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2VzQXJyYXkpKXtcblx0XHRcdFx0XHRcdG1lc3NhZ2VzQXJyYXkucG9wKGluZGV4KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2VzQXJyYXlbaW5kZXhdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2VzKSAmJiBtZXNzYWdlcykge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IHsgZXJyb3I6IG1lc3NhZ2VzIH07XG5cdFx0fVxuXHRcdGxldCBwcmV2aW91c01lc3NhZ2UgPSAnJztcblx0XHRpZiAobWVzc2FnZXNBcnJheS5sZW5ndGggPT09IDEgfHwgT2JqZWN0LmtleXMobWVzc2FnZXNBcnJheSkubGVuZ3RoID09PSAxKSB7XG5cdFx0XHQkLmVhY2gobWVzc2FnZXNBcnJheSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRpZiAocHJldmlvdXNNZXNzYWdlID09PSB2YWx1ZSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsZXQgbmV3VmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0bmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluZGV4ID09PSAnaW5mbycpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd1dyYW5pbmcobmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGV0IGNvbnRlbnQgPSAnJztcblx0XHRcdCQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRpZiAocHJldmlvdXNNZXNzYWdlICE9PSB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuXHRcdFx0XHRcdFx0bmV3VmFsdWUgPSBuZXdWYWx1ZS5qb2luKCc8YnI+Jyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnRlbnQgPSBgJHtjb250ZW50fTxicj4ke25ld1ZhbHVlfWA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dXcmFuaW5nKGNvbnRlbnQsIGhlYWRlcik7XG5cdFx0fVxuXHR9LFxuXHRzY3JvbGxUb01lc3NhZ2VzKCkge1xuXHRcdCQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcblx0XHRcdHNjcm9sbFRvcDogVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5vZmZzZXQoKS50b3AtNTAsXG5cdFx0fSwgMjAwMCk7XG5cdH0sXG59O1xuIl19