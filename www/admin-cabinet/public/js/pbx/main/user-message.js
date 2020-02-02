"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
var UserMessage = {
  $ajaxMessagesDiv: $('#ajax-messages'),
  showError: function () {
    function showError(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'error',
        displayTime: 0,
        message: text,
        title: header,
        compact: false
      });
    }

    return showError;
  }(),
  showWraning: function () {
    function showWraning(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'warning',
        displayTime: 0,
        message: text,
        title: header,
        compact: false
      });
    }

    return showWraning;
  }(),
  showInformation: function () {
    function showInformation(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('body').toast({
        "class": 'success',
        displayTime: 5000,
        message: text,
        title: header,
        compact: false
      });
    }

    return showInformation;
  }(),
  showMultiString: function () {
    function showMultiString(messages) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('.ui.message.ajax').remove();
      if (!messages) return; // Remove empty values

      var messagesArray;

      if ((Array.isArray(messages) || _typeof(messages) === 'object') && Object.keys(messages).length > 0) {
        messagesArray = messages;
        $.each(messages, function (index, value) {
          if (!value) {
            messagesArray.pop(index);
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

          if (newValue.length > 100) {
            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(newValue, "</div>"));
            UserMessage.scrollToMessages();
          } else if (index === 'error') {
            UserMessage.showError(newValue, header);
          } else if (index === 'warning') {
            UserMessage.showWraning(newValue, header);
          } else {
            UserMessage.showInformation(newValue, header);
          }

          previousMessage = value;
        });
      } else {
        $.each(messagesArray, function (index, value) {
          var newValue = value;

          if (previousMessage !== value) {
            if (Array.isArray(newValue)) {
              newValue = newValue.join('<br>');
            }

            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(newValue, "</div>"));
            UserMessage.scrollToMessages();
          }

          previousMessage = value;
        });
      }
    }

    return showMultiString;
  }(),
  scrollToMessages: function () {
    function scrollToMessages() {
      $('html, body').animate({
        scrollTop: UserMessage.$ajaxMessagesDiv.offset().top
      }, 2000);
    }

    return scrollToMessages;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwic2hvd0Vycm9yIiwidGV4dCIsImhlYWRlciIsInRvYXN0IiwiZGlzcGxheVRpbWUiLCJtZXNzYWdlIiwidGl0bGUiLCJjb21wYWN0Iiwic2hvd1dyYW5pbmciLCJzaG93SW5mb3JtYXRpb24iLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJwb3AiLCJlcnJvciIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiam9pbiIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7OztBQVFBLElBQU1BLFdBQVcsR0FBRztBQUNuQkMsRUFBQUEsZ0JBQWdCLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURBO0FBRW5CQyxFQUFBQSxTQUZtQjtBQUFBLHVCQUVUQyxJQUZTLEVBRVU7QUFBQSxVQUFiQyxNQUFhLHVFQUFKLEVBQUk7QUFDNUJILE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FDRUksS0FERixDQUNRO0FBQ04saUJBQU8sT0FERDtBQUVOQyxRQUFBQSxXQUFXLEVBQUUsQ0FGUDtBQUdOQyxRQUFBQSxPQUFPLEVBQUVKLElBSEg7QUFJTkssUUFBQUEsS0FBSyxFQUFFSixNQUpEO0FBS05LLFFBQUFBLE9BQU8sRUFBRTtBQUxILE9BRFI7QUFRQTs7QUFYa0I7QUFBQTtBQVluQkMsRUFBQUEsV0FabUI7QUFBQSx5QkFZUFAsSUFaTyxFQVlZO0FBQUEsVUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQzlCSCxNQUFBQSxDQUFDLENBQUMs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WixDQUF3QmlCLFFBQXhCLEVBQWtDdkIsTUFBbEM7QUFDQSxXQUZNLE1BRUE7QUFDTkwsWUFBQUEsV0FBVyxDQUFDWSxlQUFaLENBQTRCZ0IsUUFBNUIsRUFBc0N2QixNQUF0QztBQUNBOztBQUNEc0IsVUFBQUEsZUFBZSxHQUFHSCxLQUFsQjtBQUNBLFNBbkJEO0FBb0JBLE9BckJELE1BcUJPO0FBQ050QixRQUFBQSxDQUFDLENBQUNvQixJQUFGLENBQU9OLGFBQVAsRUFBc0IsVUFBQ08sS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQ3ZDLGNBQUlJLFFBQVEsR0FBR0osS0FBZjs7QUFDQSxjQUFJRyxlQUFlLEtBQUtILEtBQXhCLEVBQStCO0FBQzlCLGdCQUFJUCxLQUFLLENBQUNDLE9BQU4sQ0FBY1UsUUFBZCxDQUFKLEVBQTZCO0FBQzVCQSxjQUFBQSxRQUFRLEdBQUdBLFFBQVEsQ0FBQ0MsSUFBVCxDQUFjLE1BQWQsQ0FBWDtBQUNBOztBQUNEN0IsWUFBQUEsV0FBVyxDQUFDQyxnQkFBWixDQUNFNkIsS0FERiwyQkFDMEJQLEtBRDFCLDZCQUNpREssUUFEakQ7QUFFQTVCLFlBQUFBLFdBQVcsQ0FBQytCLGdCQUFaO0FBQ0E7O0FBQ0RKLFVBQUFBLGVBQWUsR0FBR0gsS0FBbEI7QUFDQSxTQVhEO0FBWUE7QUFDRDs7QUFyRmtCO0FBQUE7QUFzRm5CTyxFQUFBQSxnQkF0Rm1CO0FBQUEsZ0NBc0ZBO0FBQ2xCN0IsTUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQjhCLE9BQWhCLENBQXdCO0FBQ3ZCQyxRQUFBQSxTQUFTLEVBQUVqQyxXQUFXLENBQUNDLGdCQUFaLENBQTZCaUMsTUFBN0IsR0FBc0NDO0FBRDFCLE9BQXhCLEVBRUcsSUFGSDtBQUdBOztBQTFGa0I7QUFBQTtBQUFBLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuXHQkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXHRzaG93RXJyb3IodGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnZXJyb3InLFxuXHRcdFx0XHRkaXNwbGF5VGltZTogMCxcblx0XHRcdFx0bWVzc2FnZTogdGV4dCxcblx0XHRcdFx0dGl0bGU6IGhlYWRlcixcblx0XHRcdFx0Y29tcGFjdDogZmFsc2UsXG5cdFx0XHR9KTtcblx0fSxcblx0c2hvd1dyYW5pbmcodGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnd2FybmluZycsXG5cdFx0XHRcdGRpc3BsYXlUaW1lOiAwLFxuXHRcdFx0XHRtZXNzYWdlOiB0ZXh0LFxuXHRcdFx0XHR0aXRsZTogaGVhZGVyLFxuXHRcdFx0XHRjb21wYWN0OiBmYWxzZSxcblx0XHRcdH0pO1xuXHR9LFxuXHRzaG93SW5mb3JtYXRpb24odGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHQkKCdib2R5Jylcblx0XHRcdC50b2FzdCh7XG5cdFx0XHRcdGNsYXNzOiAnc3VjY2VzcycsXG5cdFx0XHRcdGRpc3BsYXlUaW1lOiA1MDAwLFxuXHRcdFx0XHRtZXNzYWdlOiB0ZXh0LFxuXHRcdFx0XHR0aXRsZTogaGVhZGVyLFxuXHRcdFx0XHRjb21wYWN0OiBmYWxzZSxcblx0XHRcdH0pO1xuXHR9LFxuXHRzaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGhlYWRlciA9ICcnKSB7XG5cdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdGlmICghbWVzc2FnZXMpIHJldHVybjtcblxuXHRcdC8vIFJlbW92ZSBlbXB0eSB2YWx1ZXNcblx0XHRsZXQgbWVzc2FnZXNBcnJheTtcblx0XHRpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmICghdmFsdWUpIHtcblx0XHRcdFx0XHRtZXNzYWdlc0FycmF5LnBvcChpbmRleCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZXMpICYmIG1lc3NhZ2VzKSB7XG5cdFx0XHRtZXNzYWdlc0FycmF5ID0geyBlcnJvcjogbWVzc2FnZXMgfTtcblx0XHR9XG5cdFx0bGV0IHByZXZpb3VzTWVzc2FnZSA9ICcnO1xuXHRcdGlmIChtZXNzYWdlc0FycmF5Lmxlbmd0aCA9PT0gMSB8fCBPYmplY3Qua2V5cyhtZXNzYWdlc0FycmF5KS5sZW5ndGggPT09IDEpIHtcblx0XHRcdCQuZWFjaChtZXNzYWdlc0FycmF5LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBuZXdWYWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShuZXdWYWx1ZSkpIHtcblx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobmV3VmFsdWUubGVuZ3RoID4gMTAwKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7bmV3VmFsdWV9PC9kaXY+YCk7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG5ld1ZhbHVlLCBoZWFkZXIpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluZGV4ID09PSAnd2FybmluZycpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93V3JhbmluZyhuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0RpdlxuXHRcdFx0XHRcdFx0LmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHtuZXdWYWx1ZX08L2Rpdj5gKTtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHJldmlvdXNNZXNzYWdlID0gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHNjcm9sbFRvTWVzc2FnZXMoKSB7XG5cdFx0JCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0c2Nyb2xsVG9wOiBVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2Lm9mZnNldCgpLnRvcCxcblx0XHR9LCAyMDAwKTtcblx0fSxcbn07XG4iXX0=