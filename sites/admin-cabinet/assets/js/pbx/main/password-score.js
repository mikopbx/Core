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

/**
 * The PasswordScore object is responsible for calculating passwords scores
 *
 * @module PasswordScore
 */
var PasswordScore = {
  /**
   * Calculates the score for a given password.
   * @param {string} pass - The password to score.
   * @returns {number} The password score.
   */
  scorePassword: function scorePassword(pass) {
    var score = 0;

    if (!pass) {
      return score;
    }

    if (pass.length > 5) {
      score = 2;
    }

    var variations = {
      digits: /\d/.test(pass),
      lower: /[a-z]/.test(pass),
      upper: /[A-Z]/.test(pass),
      nonWords: /\W/.test(pass)
    };

    for (var check in variations) {
      score += variations[check] === true ? 2 : 0;
    }

    return score * 10;
  },

  /**
   * Checks the strength of a password and updates the progress bar and section visibility.
   * @param {object} param - The parameters for checking password strength.
   * @param {string} param.pass - The password to check.
   * @param {jQuery} param.bar - The progress bar element.
   * @param {jQuery} param.section - The section element.
   * @returns {string} An empty string.
   */
  checkPassStrength: function checkPassStrength(param) {
    var score = PasswordScore.scorePassword(param.pass);
    param.bar.progress({
      percent: Math.min(score, 100),
      showActivity: false
    });
    param.section.show();
    return '';
  }
}; // export default PasswordScore;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Bhc3N3b3JkLXNjb3JlLmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkU2NvcmUiLCJzY29yZVBhc3N3b3JkIiwicGFzcyIsInNjb3JlIiwibGVuZ3RoIiwidmFyaWF0aW9ucyIsImRpZ2l0cyIsInRlc3QiLCJsb3dlciIsInVwcGVyIiwibm9uV29yZHMiLCJjaGVjayIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFyYW0iLCJiYXIiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJNYXRoIiwibWluIiwic2hvd0FjdGl2aXR5Iiwic2VjdGlvbiIsInNob3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFQa0IseUJBT0pDLElBUEksRUFPRTtBQUNoQixRQUFJQyxLQUFLLEdBQUcsQ0FBWjs7QUFDQSxRQUFJLENBQUNELElBQUwsRUFBVztBQUNQLGFBQU9DLEtBQVA7QUFDSDs7QUFDRCxRQUFJRCxJQUFJLENBQUNFLE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNqQkQsTUFBQUEsS0FBSyxHQUFHLENBQVI7QUFDSDs7QUFDRCxRQUFNRSxVQUFVLEdBQUc7QUFDZkMsTUFBQUEsTUFBTSxFQUFFLEtBQUtDLElBQUwsQ0FBVUwsSUFBVixDQURPO0FBRWZNLE1BQUFBLEtBQUssRUFBRSxRQUFRRCxJQUFSLENBQWFMLElBQWIsQ0FGUTtBQUdmTyxNQUFBQSxLQUFLLEVBQUUsUUFBUUYsSUFBUixDQUFhTCxJQUFiLENBSFE7QUFJZlEsTUFBQUEsUUFBUSxFQUFFLEtBQUtILElBQUwsQ0FBVUwsSUFBVjtBQUpLLEtBQW5COztBQU1BLFNBQUssSUFBTVMsS0FBWCxJQUFvQk4sVUFBcEIsRUFBZ0M7QUFDNUJGLE1BQUFBLEtBQUssSUFBS0UsVUFBVSxDQUFDTSxLQUFELENBQVYsS0FBc0IsSUFBdkIsR0FBK0IsQ0FBL0IsR0FBbUMsQ0FBNUM7QUFDSDs7QUFDRCxXQUFPUixLQUFLLEdBQUcsRUFBZjtBQUNILEdBekJpQjs7QUEyQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsaUJBbkNrQiw2QkFtQ0FDLEtBbkNBLEVBbUNPO0FBQ3JCLFFBQU1WLEtBQUssR0FBR0gsYUFBYSxDQUFDQyxhQUFkLENBQTRCWSxLQUFLLENBQUNYLElBQWxDLENBQWQ7QUFDQVcsSUFBQUEsS0FBSyxDQUFDQyxHQUFOLENBQVVDLFFBQVYsQ0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFQyxJQUFJLENBQUNDLEdBQUwsQ0FBU2YsS0FBVCxFQUFnQixHQUFoQixDQURNO0FBRWZnQixNQUFBQSxZQUFZLEVBQUU7QUFGQyxLQUFuQjtBQUlBTixJQUFBQSxLQUFLLENBQUNPLE9BQU4sQ0FBY0MsSUFBZDtBQUNBLFdBQU8sRUFBUDtBQUNIO0FBM0NpQixDQUF0QixDLENBOENBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBUaGUgUGFzc3dvcmRTY29yZSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIGNhbGN1bGF0aW5nIHBhc3N3b3JkcyBzY29yZXNcbiAqXG4gKiBAbW9kdWxlIFBhc3N3b3JkU2NvcmVcbiAqL1xuY29uc3QgUGFzc3dvcmRTY29yZSA9IHtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHNjb3JlIGZvciBhIGdpdmVuIHBhc3N3b3JkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzIC0gVGhlIHBhc3N3b3JkIHRvIHNjb3JlLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBwYXNzd29yZCBzY29yZS5cbiAgICAgKi9cbiAgICBzY29yZVBhc3N3b3JkKHBhc3MpIHtcbiAgICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgICAgaWYgKCFwYXNzKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NvcmU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhc3MubGVuZ3RoID4gNSkge1xuICAgICAgICAgICAgc2NvcmUgPSAyO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHZhcmlhdGlvbnMgPSB7XG4gICAgICAgICAgICBkaWdpdHM6IC9cXGQvLnRlc3QocGFzcyksXG4gICAgICAgICAgICBsb3dlcjogL1thLXpdLy50ZXN0KHBhc3MpLFxuICAgICAgICAgICAgdXBwZXI6IC9bQS1aXS8udGVzdChwYXNzKSxcbiAgICAgICAgICAgIG5vbldvcmRzOiAvXFxXLy50ZXN0KHBhc3MpLFxuICAgICAgICB9O1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIGluIHZhcmlhdGlvbnMpIHtcbiAgICAgICAgICAgIHNjb3JlICs9ICh2YXJpYXRpb25zW2NoZWNrXSA9PT0gdHJ1ZSkgPyAyIDogMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NvcmUgKiAxMDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdHJlbmd0aCBvZiBhIHBhc3N3b3JkIGFuZCB1cGRhdGVzIHRoZSBwcm9ncmVzcyBiYXIgYW5kIHNlY3Rpb24gdmlzaWJpbGl0eS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW0gLSBUaGUgcGFyYW1ldGVycyBmb3IgY2hlY2tpbmcgcGFzc3dvcmQgc3RyZW5ndGguXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtLnBhc3MgLSBUaGUgcGFzc3dvcmQgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtqUXVlcnl9IHBhcmFtLmJhciAtIFRoZSBwcm9ncmVzcyBiYXIgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gcGFyYW0uc2VjdGlvbiAtIFRoZSBzZWN0aW9uIGVsZW1lbnQuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQW4gZW1wdHkgc3RyaW5nLlxuICAgICAqL1xuICAgIGNoZWNrUGFzc1N0cmVuZ3RoKHBhcmFtKSB7XG4gICAgICAgIGNvbnN0IHNjb3JlID0gUGFzc3dvcmRTY29yZS5zY29yZVBhc3N3b3JkKHBhcmFtLnBhc3MpO1xuICAgICAgICBwYXJhbS5iYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogTWF0aC5taW4oc2NvcmUsIDEwMCksXG4gICAgICAgICAgICBzaG93QWN0aXZpdHk6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgcGFyYW0uc2VjdGlvbi5zaG93KCk7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgUGFzc3dvcmRTY29yZTtcbiJdfQ==