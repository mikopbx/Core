"use strict";

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
var PasswordScore = {
  scorePassword: function () {
    function scorePassword(pass) {
      var score = 0;

      if (!pass) {
        return score;
      } // award every unique letter until 5 repetitions


      var letters = {};

      for (var i = 0; i < pass.length; i++) {
        letters[pass[i]] = (letters[pass[i]] || 0) + 1;
        score += 5.0 / letters[pass[i]];
      } // bonus points for mixing it up


      var variations = {
        digits: /\d/.test(pass),
        lower: /[a-z]/.test(pass),
        upper: /[A-Z]/.test(pass),
        nonWords: /\W/.test(pass)
      };
      var variationCount = 0;

      for (var check in variations) {
        variationCount += variations[check] === true ? 1 : 0;
      }

      score += (variationCount - 1) * 10;
      return parseInt(score, 10);
    }

    return scorePassword;
  }(),
  checkPassStrength: function () {
    function checkPassStrength(param) {
      var score = PasswordScore.scorePassword(param.pass);
      param.bar.progress({
        percent: Math.min(score, 100),
        showActivity: false
      });
      param.section.show(); // if (score > 80) { return 'strong'; }
      // if (score > 60) { return 'good'; }
      // if (score >= 30) { return 'weak'; }

      return '';
    }

    return checkPassStrength;
  }()
}; // export default PasswordScore;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Bhc3N3b3JkLXNjb3JlLmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkU2NvcmUiLCJzY29yZVBhc3N3b3JkIiwicGFzcyIsInNjb3JlIiwibGV0dGVycyIsImkiLCJsZW5ndGgiLCJ2YXJpYXRpb25zIiwiZGlnaXRzIiwidGVzdCIsImxvd2VyIiwidXBwZXIiLCJub25Xb3JkcyIsInZhcmlhdGlvbkNvdW50IiwiY2hlY2siLCJwYXJzZUludCIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFyYW0iLCJiYXIiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJNYXRoIiwibWluIiwic2hvd0FjdGl2aXR5Iiwic2VjdGlvbiIsInNob3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsYUFEcUI7QUFBQSwyQkFDUEMsSUFETyxFQUNEO0FBQ25CLFVBQUlDLEtBQUssR0FBRyxDQUFaOztBQUNBLFVBQUksQ0FBQ0QsSUFBTCxFQUFXO0FBQ1YsZUFBT0MsS0FBUDtBQUNBLE9BSmtCLENBTW5COzs7QUFDQSxVQUFNQyxPQUFPLEdBQUcsRUFBaEI7O0FBQ0EsV0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSCxJQUFJLENBQUNJLE1BQXpCLEVBQWlDRCxDQUFDLEVBQWxDLEVBQXNDO0FBQ3JDRCxRQUFBQSxPQUFPLENBQUNGLElBQUksQ0FBQ0csQ0FBRCxDQUFMLENBQVAsR0FBbUIsQ0FBQ0QsT0FBTyxDQUFDRixJQUFJLENBQUNHLENBQUQsQ0FBTCxDQUFQLElBQW9CLENBQXJCLElBQTBCLENBQTdDO0FBQ0FGLFFBQUFBLEtBQUssSUFBSSxNQUFNQyxPQUFPLENBQUNGLElBQUksQ0FBQ0csQ0FBRCxDQUFMLENBQXRCO0FBQ0EsT0FYa0IsQ0FhbkI7OztBQUNBLFVBQU1FLFVBQVUsR0FBRztBQUNsQkMsUUFBQUEsTUFBTSxFQUFFLEtBQUtDLElBQUwsQ0FBVVAsSUFBVixDQURVO0FBRWxCUSxRQUFBQSxLQUFLLEVBQUUsUUFBUUQsSUFBUixDQUFhUCxJQUFiLENBRlc7QUFHbEJTLFFBQUFBLEtBQUssRUFBRSxRQUFRRixJQUFSLENBQWFQLElBQWIsQ0FIVztBQUlsQlUsUUFBQUEsUUFBUSxFQUFFLEtBQUtILElBQUwsQ0FBVVAsSUFBVjtBQUpRLE9BQW5CO0FBT0EsVUFBSVcsY0FBYyxHQUFHLENBQXJCOztBQUNBLFdBQUssSUFBTUMsS0FBWCxJQUFvQlAsVUFBcEIsRUFBZ0M7QUFDL0JNLFFBQUFBLGNBQWMsSUFBS04sVUFBVSxDQUFDTyxLQUFELENBQVYsS0FBc0IsSUFBdkIsR0FBK0IsQ0FBL0IsR0FBbUMsQ0FBckQ7QUFDQTs7QUFDRFgsTUFBQUEsS0FBSyxJQUFJLENBQUNVLGNBQWMsR0FBRyxDQUFsQixJQUF1QixFQUFoQztBQUVBLGFBQU9FLFFBQVEsQ0FBQ1osS0FBRCxFQUFRLEVBQVIsQ0FBZjtBQUNBOztBQTdCb0I7QUFBQTtBQThCckJhLEVBQUFBLGlCQTlCcUI7QUFBQSwrQkE4QkhDLEtBOUJHLEVBOEJJO0FBQ3hCLFVBQU1kLEtBQUssR0FBR0gsYUFBYSxDQUFDQyxhQUFkLENBQTRCZ0IsS0FBSyxDQUFDZixJQUFsQyxDQUFkO0FBQ0FlLE1BQUFBLEtBQUssQ0FBQ0MsR0FBTixDQUFVQyxRQUFWLENBQW1CO0FBQ2xCQyxRQUFBQSxPQUFPLEVBQUVDLElBQUksQ0FBQ0MsR0FBTCxDQUFTbkIsS0FBVCxFQUFnQixHQUFoQixDQURTO0FBRWxCb0IsUUFBQUEsWUFBWSxFQUFFO0FBRkksT0FBbkI7QUFJQU4sTUFBQUEsS0FBSyxDQUFDTyxPQUFOLENBQWNDLElBQWQsR0FOd0IsQ0FPeEI7QUFDQTtBQUNBOztBQUNBLGFBQU8sRUFBUDtBQUNBOztBQXpDb0I7QUFBQTtBQUFBLENBQXRCLEMsQ0E2Q0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG5jb25zdCBQYXNzd29yZFNjb3JlID0ge1xuXHRzY29yZVBhc3N3b3JkKHBhc3MpIHtcblx0XHRsZXQgc2NvcmUgPSAwO1xuXHRcdGlmICghcGFzcykge1xuXHRcdFx0cmV0dXJuIHNjb3JlO1xuXHRcdH1cblxuXHRcdC8vIGF3YXJkIGV2ZXJ5IHVuaXF1ZSBsZXR0ZXIgdW50aWwgNSByZXBldGl0aW9uc1xuXHRcdGNvbnN0IGxldHRlcnMgPSB7fTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHBhc3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldHRlcnNbcGFzc1tpXV0gPSAobGV0dGVyc1twYXNzW2ldXSB8fCAwKSArIDE7XG5cdFx0XHRzY29yZSArPSA1LjAgLyBsZXR0ZXJzW3Bhc3NbaV1dO1xuXHRcdH1cblxuXHRcdC8vIGJvbnVzIHBvaW50cyBmb3IgbWl4aW5nIGl0IHVwXG5cdFx0Y29uc3QgdmFyaWF0aW9ucyA9IHtcblx0XHRcdGRpZ2l0czogL1xcZC8udGVzdChwYXNzKSxcblx0XHRcdGxvd2VyOiAvW2Etel0vLnRlc3QocGFzcyksXG5cdFx0XHR1cHBlcjogL1tBLVpdLy50ZXN0KHBhc3MpLFxuXHRcdFx0bm9uV29yZHM6IC9cXFcvLnRlc3QocGFzcyksXG5cdFx0fTtcblxuXHRcdGxldCB2YXJpYXRpb25Db3VudCA9IDA7XG5cdFx0Zm9yIChjb25zdCBjaGVjayBpbiB2YXJpYXRpb25zKSB7XG5cdFx0XHR2YXJpYXRpb25Db3VudCArPSAodmFyaWF0aW9uc1tjaGVja10gPT09IHRydWUpID8gMSA6IDA7XG5cdFx0fVxuXHRcdHNjb3JlICs9ICh2YXJpYXRpb25Db3VudCAtIDEpICogMTA7XG5cblx0XHRyZXR1cm4gcGFyc2VJbnQoc2NvcmUsIDEwKTtcblx0fSxcblx0Y2hlY2tQYXNzU3RyZW5ndGgocGFyYW0pIHtcblx0XHRjb25zdCBzY29yZSA9IFBhc3N3b3JkU2NvcmUuc2NvcmVQYXNzd29yZChwYXJhbS5wYXNzKTtcblx0XHRwYXJhbS5iYXIucHJvZ3Jlc3Moe1xuXHRcdFx0cGVyY2VudDogTWF0aC5taW4oc2NvcmUsIDEwMCksXG5cdFx0XHRzaG93QWN0aXZpdHk6IGZhbHNlLFxuXHRcdH0pO1xuXHRcdHBhcmFtLnNlY3Rpb24uc2hvdygpO1xuXHRcdC8vIGlmIChzY29yZSA+IDgwKSB7IHJldHVybiAnc3Ryb25nJzsgfVxuXHRcdC8vIGlmIChzY29yZSA+IDYwKSB7IHJldHVybiAnZ29vZCc7IH1cblx0XHQvLyBpZiAoc2NvcmUgPj0gMzApIHsgcmV0dXJuICd3ZWFrJzsgfVxuXHRcdHJldHVybiAnJztcblx0fSxcblxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgUGFzc3dvcmRTY29yZTtcbiJdfQ==