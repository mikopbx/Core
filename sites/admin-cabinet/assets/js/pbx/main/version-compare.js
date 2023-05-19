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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3ZlcnNpb24tY29tcGFyZS5qcyJdLCJuYW1lcyI6WyJ2ZXJzaW9uQ29tcGFyZSIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJsZW5ndGgiLCJwdXNoIiwibWFwIiwibWF0Y2giLCJleGVjIiwiTnVtYmVyIiwicmVwbGFjZSIsImNoYXJDb2RlQXQiLCJpbmRleCIsImkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLFNBQVNBLGNBQVQsQ0FBd0JDLEVBQXhCLEVBQTRCQyxFQUE1QixFQUFnQ0MsT0FBaEMsRUFBeUM7QUFDeEMsTUFBTUMsZUFBZSxHQUFJRCxPQUFPLElBQUlBLE9BQU8sQ0FBQ0MsZUFBcEIsSUFBd0MsS0FBaEU7QUFBQSxNQUNDQyxVQUFVLEdBQUlGLE9BQU8sSUFBSUEsT0FBTyxDQUFDRSxVQUFwQixJQUFtQyxJQURqRDtBQUdBLE1BQUlDLE9BQU8sR0FBRyxDQUFDTCxFQUFFLElBQUksR0FBUCxFQUFZTSxLQUFaLENBQWtCLEdBQWxCLENBQWQ7QUFBQSxNQUNDQyxPQUFPLEdBQUcsQ0FBQ04sRUFBRSxJQUFJLEdBQVAsRUFBWUssS0FBWixDQUFrQixHQUFsQixDQURYOztBQUdBLFdBQVNFLFdBQVQsQ0FBcUJDLENBQXJCLEVBQXdCO0FBQ3ZCLFdBQU8sQ0FBQ04sZUFBZSxHQUFHLGtCQUFILEdBQXdCLGtCQUF4QyxFQUE0RE8sSUFBNUQsQ0FBaUVELENBQWpFLENBQVA7QUFDQTs7QUFFRCxNQUFJLENBQUNKLE9BQU8sQ0FBQ00sS0FBUixDQUFjSCxXQUFkLENBQUQsSUFBK0IsQ0FBQ0QsT0FBTyxDQUFDSSxLQUFSLENBQWNILFdBQWQsQ0FBcEMsRUFBZ0U7QUFDL0QsV0FBT0ksR0FBUDtBQUNBOztBQUVELE1BQUlSLFVBQUosRUFBZ0I7QUFDZixXQUFPQyxPQUFPLENBQUNRLE1BQVIsR0FBaUJOLE9BQU8sQ0FBQ00sTUFBaEM7QUFBd0NSLE1BQUFBLE9BQU8sQ0FBQ1MsSUFBUixDQUFhLEdBQWI7QUFBeEM7O0FBQ0EsV0FBT1AsT0FBTyxDQUFDTSxNQUFSLEdBQWlCUixPQUFPLENBQUNRLE1BQWhDO0FBQXdDTixNQUFBQSxPQUFPLENBQUNPLElBQVIsQ0FBYSxHQUFiO0FBQXhDO0FBQ0E7O0FBRUQsTUFBSSxDQUFDWCxlQUFMLEVBQXNCO0FBQ3JCRSxJQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ1UsR0FBUixDQUFZLFVBQVNOLENBQVQsRUFBVztBQUNoQyxVQUFNTyxLQUFLLEdBQUksWUFBRCxDQUFlQyxJQUFmLENBQW9CUixDQUFwQixDQUFkO0FBQ0EsYUFBT1MsTUFBTSxDQUFDRixLQUFLLEdBQUdQLENBQUMsQ0FBQ1UsT0FBRixDQUFVSCxLQUFLLENBQUMsQ0FBRCxDQUFmLEVBQW9CLE1BQU1QLENBQUMsQ0FBQ1csVUFBRixDQUFhSixLQUFLLENBQUNLLEtBQW5CLENBQTFCLENBQUgsR0FBd0RaLENBQTlELENBQWI7QUFDQSxLQUhTLENBQVY7QUFJQUYsSUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUNRLEdBQVIsQ0FBWSxVQUFTTixDQUFULEVBQVc7QUFDaEMsVUFBTU8sS0FBSyxHQUFJLFlBQUQsQ0FBZUMsSUFBZixDQUFvQlIsQ0FBcEIsQ0FBZDtBQUNBLGFBQU9TLE1BQU0sQ0FBQ0YsS0FBSyxHQUFHUCxDQUFDLENBQUNVLE9BQUYsQ0FBVUgsS0FBSyxDQUFDLENBQUQsQ0FBZixFQUFvQixNQUFNUCxDQUFDLENBQUNXLFVBQUYsQ0FBYUosS0FBSyxDQUFDSyxLQUFuQixDQUExQixDQUFILEdBQXdEWixDQUE5RCxDQUFiO0FBQ0EsS0FIUyxDQUFWO0FBSUE7O0FBRUQsT0FBSyxJQUFJYSxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHakIsT0FBTyxDQUFDUSxNQUE1QixFQUFvQyxFQUFFUyxDQUF0QyxFQUF5QztBQUN4QyxRQUFJZixPQUFPLENBQUNNLE1BQVIsS0FBbUJTLENBQXZCLEVBQTBCO0FBQ3pCLGFBQU8sQ0FBUDtBQUNBOztBQUVELFFBQUlqQixPQUFPLENBQUNpQixDQUFELENBQVAsS0FBZWYsT0FBTyxDQUFDZSxDQUFELENBQTFCLEVBQStCO0FBQzlCO0FBQ0EsS0FGRCxNQUdLLElBQUlqQixPQUFPLENBQUNpQixDQUFELENBQVAsR0FBYWYsT0FBTyxDQUFDZSxDQUFELENBQXhCLEVBQTZCO0FBQ2pDLGFBQU8sQ0FBUDtBQUNBLEtBRkksTUFHQTtBQUNKLGFBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxNQUFJakIsT0FBTyxDQUFDUSxNQUFSLEtBQW1CTixPQUFPLENBQUNNLE1BQS9CLEVBQXVDO0FBQ3RDLFdBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsU0FBTyxDQUFQO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIENvbXBhcmVzIHR3byBzb2Z0d2FyZSB2ZXJzaW9uIG51bWJlcnMgKGUuZy4gXCIxLjcuMVwiIG9yIFwiMS4yYlwiKS5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdhcyBib3JuIGluIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzY4MzI3MjEuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHYxIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGJlIGNvbXBhcmVkLlxuICogQHBhcmFtIHtzdHJpbmd9IHYyIFRoZSBzZWNvbmQgdmVyc2lvbiB0byBiZSBjb21wYXJlZC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgZmxhZ3MgdGhhdCBhZmZlY3QgY29tcGFyaXNvbiBiZWhhdmlvcjpcbiAqIGxleGljb2dyYXBoaWNhbDogKHRydWUvW2ZhbHNlXSkgY29tcGFyZXMgZWFjaCBwYXJ0IG9mIHRoZSB2ZXJzaW9uIHN0cmluZ3MgbGV4aWNvZ3JhcGhpY2FsbHkgaW5zdGVhZCBvZiBuYXR1cmFsbHk7XG4gKiAgICAgICAgICAgICAgICAgIHRoaXMgYWxsb3dzIHN1ZmZpeGVzIHN1Y2ggYXMgXCJiXCIgb3IgXCJkZXZcIiBidXQgd2lsbCBjYXVzZSBcIjEuMTBcIiB0byBiZSBjb25zaWRlcmVkIHNtYWxsZXIgdGhhbiBcIjEuMlwiLlxuICogemVyb0V4dGVuZDogKFt0cnVlXS9mYWxzZSkgY2hhbmdlcyB0aGUgcmVzdWx0IGlmIG9uZSB2ZXJzaW9uIHN0cmluZyBoYXMgbGVzcyBwYXJ0cyB0aGFuIHRoZSBvdGhlci4gSW5cbiAqICAgICAgICAgICAgIHRoaXMgY2FzZSB0aGUgc2hvcnRlciBzdHJpbmcgd2lsbCBiZSBwYWRkZWQgd2l0aCBcInplcm9cIiBwYXJ0cyBpbnN0ZWFkIG9mIGJlaW5nIGNvbnNpZGVyZWQgc21hbGxlci5cbiAqXG4gKiBAcmV0dXJucyB7bnVtYmVyfE5hTn1cbiAqIC0gMCBpZiB0aGUgdmVyc2lvbnMgYXJlIGVxdWFsXG4gKiAtIGEgbmVnYXRpdmUgaW50ZWdlciBpZmYgdjEgPCB2MlxuICogLSBhIHBvc2l0aXZlIGludGVnZXIgaWZmIHYxID4gdjJcbiAqIC0gTmFOIGlmIGVpdGhlciB2ZXJzaW9uIHN0cmluZyBpcyBpbiB0aGUgd3JvbmcgZm9ybWF0XG4gKi9cblxuZnVuY3Rpb24gdmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG5cdGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IChvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsKSB8fCBmYWxzZSxcblx0XHR6ZXJvRXh0ZW5kID0gKG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kKSB8fCB0cnVlO1xuXG5cdGxldCB2MXBhcnRzID0gKHYxIHx8IFwiMFwiKS5zcGxpdCgnLicpLFxuXHRcdHYycGFydHMgPSAodjIgfHwgXCIwXCIpLnNwbGl0KCcuJyk7XG5cblx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtes6xw59dKiQvIDogL15cXGQrW0EtWmEtes6xw59dPyQvKS50ZXN0KHgpO1xuXHR9XG5cblx0aWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcblx0XHRyZXR1cm4gTmFOO1xuXHR9XG5cblx0aWYgKHplcm9FeHRlbmQpIHtcblx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKFwiMFwiKTtcblx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKFwiMFwiKTtcblx0fVxuXG5cdGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG5cdFx0djFwYXJ0cyA9IHYxcGFydHMubWFwKGZ1bmN0aW9uKHgpe1xuXHRcdFx0Y29uc3QgbWF0Y2ggPSAoL1tBLVphLXrOscOfXS8pLmV4ZWMoeCk7XG5cdFx0XHRyZXR1cm4gTnVtYmVyKG1hdGNoID8geC5yZXBsYWNlKG1hdGNoWzBdLCBcIi5cIiArIHguY2hhckNvZGVBdChtYXRjaC5pbmRleCkpOngpO1xuXHRcdH0pO1xuXHRcdHYycGFydHMgPSB2MnBhcnRzLm1hcChmdW5jdGlvbih4KXtcblx0XHRcdGNvbnN0IG1hdGNoID0gKC9bQS1aYS16zrHDn10vKS5leGVjKHgpO1xuXHRcdFx0cmV0dXJuIE51bWJlcihtYXRjaCA/IHgucmVwbGFjZShtYXRjaFswXSwgXCIuXCIgKyB4LmNoYXJDb2RlQXQobWF0Y2guaW5kZXgpKTp4KTtcblx0XHR9KTtcblx0fVxuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7ICsraSkge1xuXHRcdGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuXHRcdFx0cmV0dXJuIDE7XG5cdFx0fVxuXG5cdFx0aWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblx0XHRlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0cmV0dXJuIDE7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxuXG5cdGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gLTE7XG5cdH1cblxuXHRyZXR1cm4gMDtcbn0iXX0=