"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Bhc3N3b3JkLXNjb3JlLmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkU2NvcmUiLCJzY29yZVBhc3N3b3JkIiwicGFzcyIsInNjb3JlIiwibGV0dGVycyIsImkiLCJsZW5ndGgiLCJ2YXJpYXRpb25zIiwiZGlnaXRzIiwidGVzdCIsImxvd2VyIiwidXBwZXIiLCJub25Xb3JkcyIsInZhcmlhdGlvbkNvdW50IiwiY2hlY2siLCJwYXJzZUludCIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFyYW0iLCJiYXIiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJNYXRoIiwibWluIiwic2hvd0FjdGl2aXR5Iiwic2VjdGlvbiIsInNob3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7QUFTQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLGFBRHFCO0FBQUEsMkJBQ1BDLElBRE8sRUFDRDtBQUNuQixVQUFJQyxLQUFLLEdBQUcsQ0FBWjs7QUFDQSxVQUFJLENBQUNELElBQUwsRUFBVztBQUNWLGVBQU9DLEtBQVA7QUFDQSxPQUprQixDQU1uQjs7O0FBQ0EsVUFBTUMsT0FBTyxHQUFHLEVBQWhCOztBQUNBLFdBQUssSUFBSUMsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR0gsSUFBSSxDQUFDSSxNQUF6QixFQUFpQ0QsQ0FBQyxFQUFsQyxFQUFzQztBQUNyQ0QsUUFBQUEsT0FBTyxDQUFDRixJQUFJLENBQUNHLENBQUQsQ0FBTCxDQUFQLEdBQW1CLENBQUNELE9BQU8sQ0FBQ0YsSUFBSSxDQUFDRyxDQUFELENBQUwsQ0FBUCxJQUFvQixDQUFyQixJQUEwQixDQUE3QztBQUNBRixRQUFBQSxLQUFLLElBQUksTUFBTUMsT0FBTyxDQUFDRixJQUFJLENBQUNHLENBQUQsQ0FBTCxDQUF0QjtBQUNBLE9BWGtCLENBYW5COzs7QUFDQSxVQUFNRSxVQUFVLEdBQUc7QUFDbEJDLFFBQUFBLE1BQU0sRUFBRSxLQUFLQyxJQUFMLENBQVVQLElBQVYsQ0FEVTtBQUVsQlEsUUFBQUEsS0FBSyxFQUFFLFFBQVFELElBQVIsQ0FBYVAsSUFBYixDQUZXO0FBR2xCUyxRQUFBQSxLQUFLLEVBQUUsUUFBUUYsSUFBUixDQUFhUCxJQUFiLENBSFc7QUFJbEJVLFFBQUFBLFFBQVEsRUFBRSxLQUFLSCxJQUFMLENBQVVQLElBQVY7QUFKUSxPQUFuQjtBQU9BLFVBQUlXLGNBQWMsR0FBRyxDQUFyQjs7QUFDQSxXQUFLLElBQU1DLEtBQVgsSUFBb0JQLFVBQXBCLEVBQWdDO0FBQy9CTSxRQUFBQSxjQUFjLElBQUtOLFVBQVUsQ0FBQ08sS0FBRCxDQUFWLEtBQXNCLElBQXZCLEdBQStCLENBQS9CLEdBQW1DLENBQXJEO0FBQ0E7O0FBQ0RYLE1BQUFBLEtBQUssSUFBSSxDQUFDVSxjQUFjLEdBQUcsQ0FBbEIsSUFBdUIsRUFBaEM7QUFFQSxhQUFPRSxRQUFRLENBQUNaLEtBQUQsRUFBUSxFQUFSLENBQWY7QUFDQTs7QUE3Qm9CO0FBQUE7QUE4QnJCYSxFQUFBQSxpQkE5QnFCO0FBQUEsK0JBOEJIQyxLQTlCRyxFQThCSTtBQUN4QixVQUFNZCxLQUFLLEdBQUdILGFBQWEsQ0FBQ0MsYUFBZCxDQUE0QmdCLEtBQUssQ0FBQ2YsSUFBbEMsQ0FBZDtBQUNBZSxNQUFBQSxLQUFLLENBQUNDLEdBQU4sQ0FBVUMsUUFBVixDQUFtQjtBQUNsQkMsUUFBQUEsT0FBTyxFQUFFQyxJQUFJLENBQUNDLEdBQUwsQ0FBU25CLEtBQVQsRUFBZ0IsR0FBaEIsQ0FEUztBQUVsQm9CLFFBQUFBLFlBQVksRUFBRTtBQUZJLE9BQW5CO0FBSUFOLE1BQUFBLEtBQUssQ0FBQ08sT0FBTixDQUFjQyxJQUFkLEdBTndCLENBT3hCO0FBQ0E7QUFDQTs7QUFDQSxhQUFPLEVBQVA7QUFDQTs7QUF6Q29CO0FBQUE7QUFBQSxDQUF0QixDLENBNkNBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cblxuY29uc3QgUGFzc3dvcmRTY29yZSA9IHtcblx0c2NvcmVQYXNzd29yZChwYXNzKSB7XG5cdFx0bGV0IHNjb3JlID0gMDtcblx0XHRpZiAoIXBhc3MpIHtcblx0XHRcdHJldHVybiBzY29yZTtcblx0XHR9XG5cblx0XHQvLyBhd2FyZCBldmVyeSB1bmlxdWUgbGV0dGVyIHVudGlsIDUgcmVwZXRpdGlvbnNcblx0XHRjb25zdCBsZXR0ZXJzID0ge307XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBwYXNzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXR0ZXJzW3Bhc3NbaV1dID0gKGxldHRlcnNbcGFzc1tpXV0gfHwgMCkgKyAxO1xuXHRcdFx0c2NvcmUgKz0gNS4wIC8gbGV0dGVyc1twYXNzW2ldXTtcblx0XHR9XG5cblx0XHQvLyBib251cyBwb2ludHMgZm9yIG1peGluZyBpdCB1cFxuXHRcdGNvbnN0IHZhcmlhdGlvbnMgPSB7XG5cdFx0XHRkaWdpdHM6IC9cXGQvLnRlc3QocGFzcyksXG5cdFx0XHRsb3dlcjogL1thLXpdLy50ZXN0KHBhc3MpLFxuXHRcdFx0dXBwZXI6IC9bQS1aXS8udGVzdChwYXNzKSxcblx0XHRcdG5vbldvcmRzOiAvXFxXLy50ZXN0KHBhc3MpLFxuXHRcdH07XG5cblx0XHRsZXQgdmFyaWF0aW9uQ291bnQgPSAwO1xuXHRcdGZvciAoY29uc3QgY2hlY2sgaW4gdmFyaWF0aW9ucykge1xuXHRcdFx0dmFyaWF0aW9uQ291bnQgKz0gKHZhcmlhdGlvbnNbY2hlY2tdID09PSB0cnVlKSA/IDEgOiAwO1xuXHRcdH1cblx0XHRzY29yZSArPSAodmFyaWF0aW9uQ291bnQgLSAxKSAqIDEwO1xuXG5cdFx0cmV0dXJuIHBhcnNlSW50KHNjb3JlLCAxMCk7XG5cdH0sXG5cdGNoZWNrUGFzc1N0cmVuZ3RoKHBhcmFtKSB7XG5cdFx0Y29uc3Qgc2NvcmUgPSBQYXNzd29yZFNjb3JlLnNjb3JlUGFzc3dvcmQocGFyYW0ucGFzcyk7XG5cdFx0cGFyYW0uYmFyLnByb2dyZXNzKHtcblx0XHRcdHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuXHRcdFx0c2hvd0FjdGl2aXR5OiBmYWxzZSxcblx0XHR9KTtcblx0XHRwYXJhbS5zZWN0aW9uLnNob3coKTtcblx0XHQvLyBpZiAoc2NvcmUgPiA4MCkgeyByZXR1cm4gJ3N0cm9uZyc7IH1cblx0XHQvLyBpZiAoc2NvcmUgPiA2MCkgeyByZXR1cm4gJ2dvb2QnOyB9XG5cdFx0Ly8gaWYgKHNjb3JlID49IDMwKSB7IHJldHVybiAnd2Vhayc7IH1cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IFBhc3N3b3JkU2NvcmU7XG4iXX0=