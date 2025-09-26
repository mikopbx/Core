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
    checkAvailability: ':available'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvdXNlcnMtYXBpLmpzIl0sIm5hbWVzIjpbIlVzZXJzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJPYmplY3QiLCJhc3NpZ24iLCJvbGRFbWFpbCIsIm5ld0VtYWlsIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwibGVuZ3RoIiwiJCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZW1haWwiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc0VtYWlsQWxyZWFkeVJlZ2lzdGVyZWRGb3JPdGhlclVzZXIiLCJ1bmRlZmluZWQiLCJodG1sIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUM5QkMsRUFBQUEsUUFBUSxFQUFFLHVCQURvQjtBQUU5QkMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLGlCQUFpQixFQUFFO0FBRFI7QUFGZSxDQUFqQixDQUFqQixDLENBT0E7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjTixRQUFkLEVBQXdCO0FBQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLGlCQVJvQiw2QkFRRkcsUUFSRSxFQVFRQyxRQVJSLEVBUXVEO0FBQUEsUUFBckNDLFlBQXFDLHVFQUF0QixPQUFzQjtBQUFBLFFBQWJDLE1BQWEsdUVBQUosRUFBSTs7QUFDdkUsUUFBSUgsUUFBUSxLQUFLQyxRQUFiLElBQXlCQSxRQUFRLENBQUNHLE1BQVQsS0FBb0IsQ0FBakQsRUFBb0Q7QUFDaERDLE1BQUFBLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0FGLE1BQUFBLENBQUMsWUFBS0gsWUFBTCxZQUFELENBQTRCTSxRQUE1QixDQUFxQyxRQUFyQztBQUNBO0FBQ0gsS0FMc0UsQ0FPdkU7OztBQUNBLFNBQUtDLGdCQUFMLENBQXNCLG1CQUF0QixFQUEyQztBQUFFQyxNQUFBQSxLQUFLLEVBQUVUO0FBQVQsS0FBM0MsRUFBZ0UsVUFBQ1UsUUFBRCxFQUFjO0FBQzFFLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDRSxJQUFULENBQWMsV0FBZCxNQUErQixJQUF0RCxFQUE0RDtBQUN4RFIsUUFBQUEsQ0FBQyxxQkFBY0gsWUFBZCxFQUFELENBQStCSSxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQUYsUUFBQUEsQ0FBQyxZQUFLSCxZQUFMLFlBQUQsQ0FBNEJNLFFBQTVCLENBQXFDLFFBQXJDO0FBQ0gsT0FIRCxNQUdPLElBQUlMLE1BQU0sQ0FBQ0MsTUFBUCxHQUFnQixDQUFoQixJQUFxQk8sUUFBUSxDQUFDRSxJQUFULENBQWMsUUFBZCxNQUE0QlYsTUFBckQsRUFBNkQ7QUFDaEVFLFFBQUFBLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0FGLFFBQUFBLENBQUMsWUFBS0gsWUFBTCxZQUFELENBQTRCTSxRQUE1QixDQUFxQyxRQUFyQztBQUNILE9BSE0sTUFHQTtBQUNISCxRQUFBQSxDQUFDLHFCQUFjSCxZQUFkLEVBQUQsQ0FBK0JJLE1BQS9CLEdBQXdDRSxRQUF4QyxDQUFpRCxPQUFqRDtBQUNBLFlBQUlNLE9BQU8sYUFBTUMsZUFBZSxDQUFDQyx5Q0FBdEIsV0FBWDs7QUFDQSxZQUFJRCxlQUFlLENBQUNKLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUFmLEtBQWdESSxTQUFwRCxFQUErRDtBQUMzREgsVUFBQUEsT0FBTyxHQUFHQyxlQUFlLENBQUNKLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUF6QjtBQUNILFNBRkQsTUFFTztBQUNIQyxVQUFBQSxPQUFPLElBQUlILFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFdBQWQsQ0FBWDtBQUNIOztBQUNEUixRQUFBQSxDQUFDLFlBQUtILFlBQUwsWUFBRCxDQUE0QkssV0FBNUIsQ0FBd0MsUUFBeEMsRUFBa0RXLElBQWxELENBQXVESixPQUF2RDtBQUNIO0FBQ0osS0FqQkQ7QUFrQkg7QUFsQ21CLENBQXhCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaUNsaWVudCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsICQgKi9cblxuLyoqXG4gKiBVc2Vyc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgdXNlcnMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciB1c2VycyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiAgXG4gKiBAY2xhc3MgVXNlcnNBUElcbiAqL1xuY29uc3QgVXNlcnNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My91c2VycycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBjaGVja0F2YWlsYWJpbGl0eTogJzphdmFpbGFibGUnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyBmb3IgY29tcGF0aWJpbGl0eSBhbmQgZWFzaWVyIHVzZVxuT2JqZWN0LmFzc2lnbihVc2Vyc0FQSSwge1xuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGVtYWlsIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkRW1haWwgLSBUaGUgb3JpZ2luYWwgZW1haWwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0VtYWlsIC0gVGhlIG5ldyBlbWFpbCB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZEVtYWlsLCBuZXdFbWFpbCwgY3NzQ2xhc3NOYW1lID0gJ2VtYWlsJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZEVtYWlsID09PSBuZXdFbWFpbCB8fCBuZXdFbWFpbC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgbmV3IEFQSSBhcHByb2FjaCB3aXRoIGNhbGxDdXN0b21NZXRob2RcbiAgICAgICAgdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdjaGVja0F2YWlsYWJpbGl0eScsIHsgZW1haWw6IG5ld0VtYWlsIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS5kYXRhWyd1c2VySWQnXSA9PT0gdXNlcklkKSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9UaGlzRW1haWxBbHJlYWR5UmVnaXN0ZXJlZEZvck90aGVyVXNlcn06Jm5ic3BgO1xuICAgICAgICAgICAgICAgIGlmIChnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSByZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTsiXX0=