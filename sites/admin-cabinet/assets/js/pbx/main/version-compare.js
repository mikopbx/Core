"use strict";

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

/**
 * Compares two software version numbers (e.g. "1.7.1" or "1.2b").
 *
 * This function was born in http://stackoverflow.com/a/6832721.
 *
 * @param {string} v1 The first version to be compared.
 * @param {string} v2 The second version to be compared.
 * @param {object} [options] Optional flags that affect comparison behavior:
 * lexicographical: (true/[false]) compares each part of the version strings lexicographically instead of naturally;
 *                  this allows suffixes such as "b" or "dev" but will cause "1.10" to be considered smaller than "1.2".
 * zeroExtend: ([true]/false) changes the result if one version string has less parts than the other. In
 *             this case the shorter string will be padded with "zero" parts instead of being considered smaller.
 *
 * @returns {number|NaN}
 * - 0 if the versions are equal
 * - a negative integer iff v1 < v2
 * - a positive integer iff v1 > v2
 * - NaN if either version string is in the wrong format
 */
function versionCompare(v1, v2, options) {
  var lexicographical = options && options.lexicographical || false,
      zeroExtend = options && options.zeroExtend || true;
  var v1parts = (v1 || "0").split('.'),
      v2parts = (v2 || "0").split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-zαß]*$/ : /^\d+[A-Za-zαß]?$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) {
      v1parts.push("0");
    }

    while (v2parts.length < v1parts.length) {
      v2parts.push("0");
    }
  }

  if (!lexicographical) {
    v1parts = v1parts.map(function (x) {
      var match = /[A-Za-zαß]/.exec(x);
      return Number(match ? x.replace(match[0], "." + x.charCodeAt(match.index)) : x);
    });
    v2parts = v2parts.map(function (x) {
      var match = /[A-Za-zαß]/.exec(x);
      return Number(match ? x.replace(match[0], "." + x.charCodeAt(match.index)) : x);
    });
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length === i) {
      return 1;
    }

    if (v1parts[i] === v2parts[i]) {
      continue;
    } else if (v1parts[i] > v2parts[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  if (v1parts.length !== v2parts.length) {
    return -1;
  }

  return 0;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3ZlcnNpb24tY29tcGFyZS5qcyJdLCJuYW1lcyI6WyJ2ZXJzaW9uQ29tcGFyZSIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJsZW5ndGgiLCJwdXNoIiwibWFwIiwibWF0Y2giLCJleGVjIiwiTnVtYmVyIiwicmVwbGFjZSIsImNoYXJDb2RlQXQiLCJpbmRleCIsImkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLFNBQVNBLGNBQVQsQ0FBd0JDLEVBQXhCLEVBQTRCQyxFQUE1QixFQUFnQ0MsT0FBaEMsRUFBeUM7QUFDeEMsTUFBTUMsZUFBZSxHQUFJRCxPQUFPLElBQUlBLE9BQU8sQ0FBQ0MsZUFBcEIsSUFBd0MsS0FBaEU7QUFBQSxNQUNDQyxVQUFVLEdBQUlGLE9BQU8sSUFBSUEsT0FBTyxDQUFDRSxVQUFwQixJQUFtQyxJQURqRDtBQUdBLE1BQUlDLE9BQU8sR0FBRyxDQUFDTCxFQUFFLElBQUksR0FBUCxFQUFZTSxLQUFaLENBQWtCLEdBQWxCLENBQWQ7QUFBQSxNQUNDQyxPQUFPLEdBQUcsQ0FBQ04sRUFBRSxJQUFJLEdBQVAsRUFBWUssS0FBWixDQUFrQixHQUFsQixDQURYOztBQUdBLFdBQVNFLFdBQVQsQ0FBcUJDLENBQXJCLEVBQXdCO0FBQ3ZCLFdBQU8sQ0FBQ04sZUFBZSxHQUFHLGtCQUFILEdBQXdCLGtCQUF4QyxFQUE0RE8sSUFBNUQsQ0FBaUVELENBQWpFLENBQVA7QUFDQTs7QUFFRCxNQUFJLENBQUNKLE9BQU8sQ0FBQ00sS0FBUixDQUFjSCxXQUFkLENBQUQsSUFBK0IsQ0FBQ0QsT0FBTyxDQUFDSSxLQUFSLENBQWNILFdBQWQsQ0FBcEMsRUFBZ0U7QUFDL0QsV0FBT0ksR0FBUDtBQUNBOztBQUVELE1BQUlSLFVBQUosRUFBZ0I7QUFDZixXQUFPQyxPQUFPLENBQUNRLE1BQVIsR0FBaUJOLE9BQU8sQ0FBQ00sTUFBaEM7QUFBd0NSLE1BQUFBLE9BQU8sQ0FBQ1MsSUFBUixDQUFhLEdBQWI7QUFBeEM7O0FBQ0EsV0FBT1AsT0FBTyxDQUFDTSxNQUFSLEdBQWlCUixPQUFPLENBQUNRLE1BQWhDO0FBQXdDTixNQUFBQSxPQUFPLENBQUNPLElBQVIsQ0FBYSxHQUFiO0FBQXhDO0FBQ0E7O0FBRUQsTUFBSSxDQUFDWCxlQUFMLEVBQXNCO0FBQ3JCRSxJQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ1UsR0FBUixDQUFZLFVBQVNOLENBQVQsRUFBVztBQUNoQyxVQUFNTyxLQUFLLEdBQUksWUFBRCxDQUFlQyxJQUFmLENBQW9CUixDQUFwQixDQUFkO0FBQ0EsYUFBT1MsTUFBTSxDQUFDRixLQUFLLEdBQUdQLENBQUMsQ0FBQ1UsT0FBRixDQUFVSCxLQUFLLENBQUMsQ0FBRCxDQUFmLEVBQW9CLE1BQU1QLENBQUMsQ0FBQ1csVUFBRixDQUFhSixLQUFLLENBQUNLLEtBQW5CLENBQTFCLENBQUgsR0FBd0RaLENBQTlELENBQWI7QUFDQSxLQUhTLENBQVY7QUFJQUYsSUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUNRLEdBQVIsQ0FBWSxVQUFTTixDQUFULEVBQVc7QUFDaEMsVUFBTU8sS0FBSyxHQUFJLFlBQUQsQ0FBZUMsSUFBZixDQUFvQlIsQ0FBcEIsQ0FBZDtBQUNBLGFBQU9TLE1BQU0sQ0FBQ0YsS0FBSyxHQUFHUCxDQUFDLENBQUNVLE9BQUYsQ0FBVUgsS0FBSyxDQUFDLENBQUQsQ0FBZixFQUFvQixNQUFNUCxDQUFDLENBQUNXLFVBQUYsQ0FBYUosS0FBSyxDQUFDSyxLQUFuQixDQUExQixDQUFILEdBQXdEWixDQUE5RCxDQUFiO0FBQ0EsS0FIUyxDQUFWO0FBSUE7O0FBRUQsT0FBSyxJQUFJYSxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHakIsT0FBTyxDQUFDUSxNQUE1QixFQUFvQyxFQUFFUyxDQUF0QyxFQUF5QztBQUN4QyxRQUFJZixPQUFPLENBQUNNLE1BQVIsS0FBbUJTLENBQXZCLEVBQTBCO0FBQ3pCLGFBQU8sQ0FBUDtBQUNBOztBQUVELFFBQUlqQixPQUFPLENBQUNpQixDQUFELENBQVAsS0FBZWYsT0FBTyxDQUFDZSxDQUFELENBQTFCLEVBQStCO0FBQzlCO0FBQ0EsS0FGRCxNQUdLLElBQUlqQixPQUFPLENBQUNpQixDQUFELENBQVAsR0FBYWYsT0FBTyxDQUFDZSxDQUFELENBQXhCLEVBQTZCO0FBQ2pDLGFBQU8sQ0FBUDtBQUNBLEtBRkksTUFHQTtBQUNKLGFBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxNQUFJakIsT0FBTyxDQUFDUSxNQUFSLEtBQW1CTixPQUFPLENBQUNNLE1BQS9CLEVBQXVDO0FBQ3RDLFdBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsU0FBTyxDQUFQO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBDb21wYXJlcyB0d28gc29mdHdhcmUgdmVyc2lvbiBudW1iZXJzIChlLmcuIFwiMS43LjFcIiBvciBcIjEuMmJcIikuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3YXMgYm9ybiBpbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS82ODMyNzIxLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2MSBUaGUgZmlyc3QgdmVyc2lvbiB0byBiZSBjb21wYXJlZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2MiBUaGUgc2Vjb25kIHZlcnNpb24gdG8gYmUgY29tcGFyZWQuXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIE9wdGlvbmFsIGZsYWdzIHRoYXQgYWZmZWN0IGNvbXBhcmlzb24gYmVoYXZpb3I6XG4gKiBsZXhpY29ncmFwaGljYWw6ICh0cnVlL1tmYWxzZV0pIGNvbXBhcmVzIGVhY2ggcGFydCBvZiB0aGUgdmVyc2lvbiBzdHJpbmdzIGxleGljb2dyYXBoaWNhbGx5IGluc3RlYWQgb2YgbmF0dXJhbGx5O1xuICogICAgICAgICAgICAgICAgICB0aGlzIGFsbG93cyBzdWZmaXhlcyBzdWNoIGFzIFwiYlwiIG9yIFwiZGV2XCIgYnV0IHdpbGwgY2F1c2UgXCIxLjEwXCIgdG8gYmUgY29uc2lkZXJlZCBzbWFsbGVyIHRoYW4gXCIxLjJcIi5cbiAqIHplcm9FeHRlbmQ6IChbdHJ1ZV0vZmFsc2UpIGNoYW5nZXMgdGhlIHJlc3VsdCBpZiBvbmUgdmVyc2lvbiBzdHJpbmcgaGFzIGxlc3MgcGFydHMgdGhhbiB0aGUgb3RoZXIuIEluXG4gKiAgICAgICAgICAgICB0aGlzIGNhc2UgdGhlIHNob3J0ZXIgc3RyaW5nIHdpbGwgYmUgcGFkZGVkIHdpdGggXCJ6ZXJvXCIgcGFydHMgaW5zdGVhZCBvZiBiZWluZyBjb25zaWRlcmVkIHNtYWxsZXIuXG4gKlxuICogQHJldHVybnMge251bWJlcnxOYU59XG4gKiAtIDAgaWYgdGhlIHZlcnNpb25zIGFyZSBlcXVhbFxuICogLSBhIG5lZ2F0aXZlIGludGVnZXIgaWZmIHYxIDwgdjJcbiAqIC0gYSBwb3NpdGl2ZSBpbnRlZ2VyIGlmZiB2MSA+IHYyXG4gKiAtIE5hTiBpZiBlaXRoZXIgdmVyc2lvbiBzdHJpbmcgaXMgaW4gdGhlIHdyb25nIGZvcm1hdFxuICovXG5cbmZ1bmN0aW9uIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuXHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSAob3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbCkgfHwgZmFsc2UsXG5cdFx0emVyb0V4dGVuZCA9IChvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZCkgfHwgdHJ1ZTtcblxuXHRsZXQgdjFwYXJ0cyA9ICh2MSB8fCBcIjBcIikuc3BsaXQoJy4nKSxcblx0XHR2MnBhcnRzID0gKHYyIHx8IFwiMFwiKS5zcGxpdCgnLicpO1xuXG5cdGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcblx0XHRyZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXrOscOfXSokLyA6IC9eXFxkK1tBLVphLXrOscOfXT8kLykudGVzdCh4KTtcblx0fVxuXG5cdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0cmV0dXJuIE5hTjtcblx0fVxuXG5cdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0d2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaChcIjBcIik7XG5cdFx0d2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaChcIjBcIik7XG5cdH1cblxuXHRpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuXHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChmdW5jdGlvbih4KXtcblx0XHRcdGNvbnN0IG1hdGNoID0gKC9bQS1aYS16zrHDn10vKS5leGVjKHgpO1xuXHRcdFx0cmV0dXJuIE51bWJlcihtYXRjaCA/IHgucmVwbGFjZShtYXRjaFswXSwgXCIuXCIgKyB4LmNoYXJDb2RlQXQobWF0Y2guaW5kZXgpKTp4KTtcblx0XHR9KTtcblx0XHR2MnBhcnRzID0gdjJwYXJ0cy5tYXAoZnVuY3Rpb24oeCl7XG5cdFx0XHRjb25zdCBtYXRjaCA9ICgvW0EtWmEtes6xw59dLykuZXhlYyh4KTtcblx0XHRcdHJldHVybiBOdW1iZXIobWF0Y2ggPyB4LnJlcGxhY2UobWF0Y2hbMF0sIFwiLlwiICsgeC5jaGFyQ29kZUF0KG1hdGNoLmluZGV4KSk6eCk7XG5cdFx0fSk7XG5cdH1cblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyArK2kpIHtcblx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdHJldHVybiAxO1xuXHRcdH1cblxuXHRcdGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcblx0XHRcdHJldHVybiAxO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdH1cblxuXHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIC0xO1xuXHR9XG5cblx0cmV0dXJuIDA7XG59Il19