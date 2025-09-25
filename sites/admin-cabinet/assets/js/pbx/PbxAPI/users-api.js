"use strict";

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

/* global PbxApiClient, PbxApi, globalTranslate, $ */

/**
 * UsersAPI - REST API v3 client for users management
 *
 * Provides a clean interface for users operations using the new RESTful API.
 *  
 * @class UsersAPI
 */
var UsersAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/users',
  customMethods: {
    checkAvailability: ':checkAvailability'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(UsersAPI, {
  /**
   * Checks if the new email is available.
   * @param {string} oldEmail - The original email.
   * @param {string} newEmail - The new email to check.
   * @param {string} cssClassName - The CSS class name for the input element.
   * @param {string} userId - The ID of the user associated with the extension.
   */
  checkAvailability: function checkAvailability(oldEmail, newEmail) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'email';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldEmail === newEmail || newEmail.length === 0) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    } // Use new API approach with callCustomMethod


    this.callCustomMethod('checkAvailability', {
      email: newEmail
    }, function (response) {
      if (response.result && response.data['available'] === true) {
        $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
        $("#".concat(cssClassName, "-error")).addClass('hidden');
      } else if (userId.length > 0 && response.data['userId'] === userId) {
        $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
        $("#".concat(cssClassName, "-error")).addClass('hidden');
      } else {
        $(".ui.input.".concat(cssClassName)).parent().addClass('error');
        var message = "".concat(globalTranslate.ex_ThisEmailAlreadyRegisteredForOtherUser, ":&nbsp");

        if (globalTranslate[response.data['represent']] !== undefined) {
          message = globalTranslate[response.data['represent']];
        } else {
          message += response.data['represent'];
        }

        $("#".concat(cssClassName, "-error")).removeClass('hidden').html(message);
      }
    });
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvdXNlcnMtYXBpLmpzIl0sIm5hbWVzIjpbIlVzZXJzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJPYmplY3QiLCJhc3NpZ24iLCJvbGRFbWFpbCIsIm5ld0VtYWlsIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwibGVuZ3RoIiwiJCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZW1haWwiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc0VtYWlsQWxyZWFkeVJlZ2lzdGVyZWRGb3JPdGhlclVzZXIiLCJ1bmRlZmluZWQiLCJodG1sIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM5QkMsRUFBQUEsUUFBUSxFQUFFLHVCQURvQjtBQUU5QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLGlCQUFpQixFQUFFO0FBRFI7QUFGZSxDQUFqQixDQUFqQixDLENBT0E7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjTixRQUFkLEVBQXdCO0FBQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLGlCQVJvQiw2QkFRRkcsUUFSRSxFQVFRQyxRQVJSLEVBUXVEO0FBQUEsUUFBckNDLFlBQXFDLHVFQUF0QixPQUFzQjtBQUFBLFFBQWJDLE1BQWEsdUVBQUosRUFBSTs7QUFDdkUsUUFBSUgsUUFBUSxLQUFLQyxRQUFiLElBQXlCQSxRQUFRLENBQUNHLE1BQVQsS0FBb0IsQ0FBakQsRUFBb0Q7QUFDaERDLE1BQUFBLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0FGLE1BQUFBLENBQUMsWUFBS0gsWUFBTCxZQUFELENBQTRCTSxRQUE1QixDQUFxQyxRQUFyQztBQUNBO0FBQ0gsS0FMc0UsQ0FPdkU7OztBQUNBLFNBQUtDLGdCQUFMLENBQXNCLG1CQUF0QixFQUEyQztBQUFFQyxNQUFBQSxLQUFLLEVBQUVUO0FBQVQsS0FBM0MsRUFBZ0UsVUFBQ1UsUUFBRCxFQUFjO0FBQzFFLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDRSxJQUFULENBQWMsV0FBZCxNQUErQixJQUF0RCxFQUE0RDtBQUN4RFIsUUFBQUEsQ0FBQyxxQkFBY0gsWUFBZCxFQUFELENBQStCSSxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQUYsUUFBQUEsQ0FBQyxZQUFLSCxZQUFMLFlBQUQsQ0FBNEJNLFFBQTVCLENBQXFDLFFBQXJDO0FBQ0gsT0FIRCxNQUdPLElBQUlMLE1BQU0sQ0FBQ0MsTUFBUCxHQUFnQixDQUFoQixJQUFxQk8sUUFBUSxDQUFDRSxJQUFULENBQWMsUUFBZCxNQUE0QlYsTUFBckQsRUFBNkQ7QUFDaEVFLFFBQUFBLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0FGLFFBQUFBLENBQUMsWUFBS0gsWUFBTCxZQUFELENBQTRCTSxRQUE1QixDQUFxQyxRQUFyQztBQUNILE9BSE0sTUFHQTtBQUNISCxRQUFBQSxDQUFDLHFCQUFjSCxZQUFkLEVBQUQsQ0FBK0JJLE1BQS9CLEdBQXdDRSxRQUF4QyxDQUFpRCxPQUFqRDtBQUNBLFlBQUlNLE9BQU8sYUFBTUMsZUFBZSxDQUFDQyx5Q0FBdEIsV0FBWDs7QUFDQSxZQUFJRCxlQUFlLENBQUNKLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUFmLEtBQWdESSxTQUFwRCxFQUErRDtBQUMzREgsVUFBQUEsT0FBTyxHQUFHQyxlQUFlLENBQUNKLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUF6QjtBQUNILFNBRkQsTUFFTztBQUNIQyxVQUFBQSxPQUFPLElBQUlILFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBWDtBQUNIOztBQUNEUixRQUFBQSxDQUFDLFlBQUtILFlBQUwsWUFBRCxDQUE0QkssV0FBNUIsQ0FBd0MsUUFBeEMsRUFBa0RXLElBQWxELENBQXVESixPQUF2RDtBQUNIO0FBQ0osS0FqQkQ7QUFrQkg7QUFsQ21CLENBQXhCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsICQgKi9cblxuLyoqXG4gKiBVc2Vyc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgdXNlcnMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciB1c2VycyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiAgXG4gKiBAY2xhc3MgVXNlcnNBUElcbiAqL1xuY29uc3QgVXNlcnNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My91c2VycycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBjaGVja0F2YWlsYWJpbGl0eTogJzpjaGVja0F2YWlsYWJpbGl0eSdcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBhbGlhc2VzIGZvciBjb21wYXRpYmlsaXR5IGFuZCBlYXNpZXIgdXNlXG5PYmplY3QuYXNzaWduKFVzZXJzQVBJLCB7XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZW1haWwgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGRFbWFpbCAtIFRoZSBvcmlnaW5hbCBlbWFpbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3RW1haWwgLSBUaGUgbmV3IGVtYWlsIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkRW1haWwsIG5ld0VtYWlsLCBjc3NDbGFzc05hbWUgPSAnZW1haWwnLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkRW1haWwgPT09IG5ld0VtYWlsIHx8IG5ld0VtYWlsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBuZXcgQVBJIGFwcHJvYWNoIHdpdGggY2FsbEN1c3RvbU1ldGhvZFxuICAgICAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2NoZWNrQXZhaWxhYmlsaXR5JywgeyBlbWFpbDogbmV3RW1haWwgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGFbJ2F2YWlsYWJsZSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddID09PSB1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNFbWFpbEFscmVhZHlSZWdpc3RlcmVkRm9yT3RoZXJVc2VyfTombmJzcGA7XG4gICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0pOyJdfQ==