"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global ace, SyslogAPI */

/**
 * Infinite scroll handler for ACE editor log viewer
 * Automatically loads previous/next log chunks when scrolling to boundaries
 *
 * @module InfiniteScroll
 */
var InfiniteScroll = {
  /**
   * ACE editor instance
   * @type {object}
   */
  aceEditor: null,

  /**
   * Loading state flags
   * @type {object}
   */
  loadingState: {
    top: false,
    bottom: false
  },

  /**
   * View state tracking current window and boundaries
   * @type {object}
   */
  viewState: {
    filename: '',
    filter: '',
    currentWindowStart: null,
    // Current visible window start timestamp
    currentWindowEnd: null,
    // Current visible window end timestamp
    totalStart: null,
    // Total log file start timestamp
    totalEnd: null,
    // Total log file end timestamp
    maxLines: 5000,
    // Maximum lines in editor buffer
    chunkSize: 500,
    // Lines to load per chunk
    currentLinesCount: 0 // Current number of lines in editor

  },

  /**
   * Scroll threshold percentage for triggering load
   * @type {number}
   */
  scrollThreshold: 0.1,

  /**
   * Initialize infinite scroll
   * @param {object} editor - ACE editor instance
   */
  initialize: function initialize(editor) {
    this.aceEditor = editor;
    this.attachScrollListener();
  },

  /**
   * Attach scroll event listener to ACE editor
   */
  attachScrollListener: function attachScrollListener() {
    var _this = this;

    if (!this.aceEditor) {
      console.error('ACE editor not initialized');
      return;
    }

    this.aceEditor.getSession().on('changeScrollTop', function (scrollTop) {
      _this.handleScroll(scrollTop);
    });
  },

  /**
   * Handle scroll events
   * @param {number} scrollTop - Current scroll position
   */
  handleScroll: function handleScroll(scrollTop) {
    var renderer = this.aceEditor.renderer;
    var totalHeight = renderer.layerConfig.maxHeight;
    var visibleHeight = renderer.$size.scrollerHeight; // Calculate threshold in pixels

    var threshold = visibleHeight * this.scrollThreshold; // Check if scrolled near top

    if (scrollTop < threshold && !this.loadingState.top) {
      this.loadPreviousChunk();
    } // Check if scrolled near bottom


    if (scrollTop + visibleHeight > totalHeight - threshold && !this.loadingState.bottom) {
      this.loadNextChunk();
    }
  },

  /**
   * Load previous chunk (scrolling up)
   */
  loadPreviousChunk: async function loadPreviousChunk() {
    // Check if we reached the beginning
    if (this.viewState.currentWindowStart <= this.viewState.totalStart) {
      return;
    } // Check if time-based navigation is enabled


    if (!this.viewState.currentWindowStart || !this.viewState.totalStart) {
      return;
    }

    this.loadingState.top = true;
    this.showTopIndicator();

    try {
      // Calculate time window for previous chunk
      var timeWindow = this.calculatePreviousTimeWindow(); // Fetch previous chunk

      var response = await this.fetchLogChunk({
        dateFrom: timeWindow.start,
        dateTo: timeWindow.end
      });

      if (response && response.result && response.data && response.data.content) {
        this.prependContent(response.data.content);
        this.viewState.currentWindowStart = timeWindow.start; // Trim bottom if exceeded max lines

        this.trimBottomIfNeeded();
      }
    } catch (error) {
      console.error('Error loading previous chunk:', error);
    } finally {
      this.hideTopIndicator();
      this.loadingState.top = false;
    }
  },

  /**
   * Load next chunk (scrolling down)
   */
  loadNextChunk: async function loadNextChunk() {
    // Check if we reached the end
    if (this.viewState.currentWindowEnd >= this.viewState.totalEnd) {
      return;
    } // Check if time-based navigation is enabled


    if (!this.viewState.currentWindowEnd || !this.viewState.totalEnd) {
      return;
    }

    this.loadingState.bottom = true;
    this.showBottomIndicator();

    try {
      // Calculate time window for next chunk
      var timeWindow = this.calculateNextTimeWindow(); // Fetch next chunk

      var response = await this.fetchLogChunk({
        dateFrom: timeWindow.start,
        dateTo: timeWindow.end
      });

      if (response && response.result && response.data && response.data.content) {
        this.appendContent(response.data.content);
        this.viewState.currentWindowEnd = timeWindow.end; // Trim top if exceeded max lines

        this.trimTopIfNeeded();
      }
    } catch (error) {
      console.error('Error loading next chunk:', error);
    } finally {
      this.hideBottomIndicator();
      this.loadingState.bottom = false;
    }
  },

  /**
   * Fetch log chunk from server
   * @param {object} params - Additional parameters (dateFrom, dateTo)
   * @returns {Promise} Promise with response data
   */
  fetchLogChunk: function fetchLogChunk(params) {
    var _this2 = this;

    return new Promise(function (resolve, reject) {
      var requestParams = _objectSpread({
        filename: _this2.viewState.filename,
        filter: _this2.viewState.filter,
        lines: _this2.viewState.chunkSize
      }, params);

      SyslogAPI.getLogFromFile(requestParams, function (response) {
        if (response && response.result) {
          resolve(response);
        } else {
          reject(new Error('Failed to fetch log chunk'));
        }
      });
    });
  },

  /**
   * Prepend content to the beginning of editor
   * @param {string} content - Content to prepend
   */
  prependContent: function prependContent(content) {
    if (!content || content.trim() === '') {
      return;
    }

    var currentContent = this.aceEditor.getValue();
    var currentRow = this.aceEditor.getCursorPosition().row;
    var addedLines = content.split('\n');
    var addedRowsCount = addedLines.length; // Combine content

    var newContent = content + '\n' + currentContent; // Update editor value

    this.aceEditor.setValue(newContent, -1); // Restore cursor position (adjusted for added lines)

    this.aceEditor.gotoLine(currentRow + addedRowsCount + 1, 0); // Update lines count

    this.viewState.currentLinesCount += addedRowsCount;
  },

  /**
   * Append content to the end of editor
   * @param {string} content - Content to append
   */
  appendContent: function appendContent(content) {
    if (!content || content.trim() === '') {
      return;
    }

    var currentContent = this.aceEditor.getValue();
    var currentPosition = this.aceEditor.getCursorPosition();
    var addedLines = content.split('\n');
    var addedRowsCount = addedLines.length; // Combine content

    var newContent = currentContent + '\n' + content; // Update editor value

    this.aceEditor.setValue(newContent, -1); // Restore cursor position

    this.aceEditor.gotoLine(currentPosition.row + 1, currentPosition.column); // Update lines count

    this.viewState.currentLinesCount += addedRowsCount;
  },

  /**
   * Trim lines from top if exceeded max lines
   */
  trimTopIfNeeded: function trimTopIfNeeded() {
    if (this.viewState.currentLinesCount <= this.viewState.maxLines) {
      return;
    }

    var linesToRemove = this.viewState.currentLinesCount - this.viewState.maxLines;
    var lines = this.aceEditor.getValue().split('\n');
    var trimmed = lines.slice(linesToRemove).join('\n');
    var currentRow = this.aceEditor.getCursorPosition().row; // Update editor

    this.aceEditor.setValue(trimmed, -1); // Adjust cursor position

    var newRow = Math.max(1, currentRow - linesToRemove);
    this.aceEditor.gotoLine(newRow, 0); // Update lines count

    this.viewState.currentLinesCount = this.viewState.maxLines;
  },

  /**
   * Trim lines from bottom if exceeded max lines
   */
  trimBottomIfNeeded: function trimBottomIfNeeded() {
    if (this.viewState.currentLinesCount <= this.viewState.maxLines) {
      return;
    }

    var lines = this.aceEditor.getValue().split('\n');
    var trimmed = lines.slice(0, this.viewState.maxLines).join('\n');
    var currentPosition = this.aceEditor.getCursorPosition(); // Update editor

    this.aceEditor.setValue(trimmed, -1); // Restore cursor position (should be within bounds)

    this.aceEditor.gotoLine(Math.min(currentPosition.row + 1, this.viewState.maxLines), currentPosition.column); // Update lines count

    this.viewState.currentLinesCount = this.viewState.maxLines;
  },

  /**
   * Calculate time window for previous chunk
   * @returns {object} Time window with start and end timestamps
   */
  calculatePreviousTimeWindow: function calculatePreviousTimeWindow() {
    // Estimate average time per line
    var currentDuration = this.viewState.currentWindowEnd - this.viewState.currentWindowStart;
    var avgTimePerLine = currentDuration / Math.max(this.viewState.currentLinesCount, 1); // Calculate time interval for chunk

    var timeInterval = avgTimePerLine * this.viewState.chunkSize;
    var end = this.viewState.currentWindowStart;
    var start = Math.max(this.viewState.currentWindowStart - timeInterval, this.viewState.totalStart);
    return {
      start: start,
      end: end
    };
  },

  /**
   * Calculate time window for next chunk
   * @returns {object} Time window with start and end timestamps
   */
  calculateNextTimeWindow: function calculateNextTimeWindow() {
    // Estimate average time per line
    var currentDuration = this.viewState.currentWindowEnd - this.viewState.currentWindowStart;
    var avgTimePerLine = currentDuration / Math.max(this.viewState.currentLinesCount, 1); // Calculate time interval for chunk

    var timeInterval = avgTimePerLine * this.viewState.chunkSize;
    var start = this.viewState.currentWindowEnd;
    var end = Math.min(this.viewState.currentWindowEnd + timeInterval, this.viewState.totalEnd);
    return {
      start: start,
      end: end
    };
  },

  /**
   * Show top loading indicator
   */
  showTopIndicator: function showTopIndicator() {
    $('.loading-indicator.top').fadeIn(200);
  },

  /**
   * Hide top loading indicator
   */
  hideTopIndicator: function hideTopIndicator() {
    $('.loading-indicator.top').fadeOut(200);
  },

  /**
   * Show bottom loading indicator
   */
  showBottomIndicator: function showBottomIndicator() {
    $('.loading-indicator.bottom').fadeIn(200);
  },

  /**
   * Hide bottom loading indicator
   */
  hideBottomIndicator: function hideBottomIndicator() {
    $('.loading-indicator.bottom').fadeOut(200);
  },

  /**
   * Reset infinite scroll state
   */
  reset: function reset() {
    this.loadingState.top = false;
    this.loadingState.bottom = false;
    this.viewState.currentWindowStart = null;
    this.viewState.currentWindowEnd = null;
    this.viewState.currentLinesCount = 0;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZmluaXRlLXNjcm9sbC5qcyJdLCJuYW1lcyI6WyJJbmZpbml0ZVNjcm9sbCIsImFjZUVkaXRvciIsImxvYWRpbmdTdGF0ZSIsInRvcCIsImJvdHRvbSIsInZpZXdTdGF0ZSIsImZpbGVuYW1lIiwiZmlsdGVyIiwiY3VycmVudFdpbmRvd1N0YXJ0IiwiY3VycmVudFdpbmRvd0VuZCIsInRvdGFsU3RhcnQiLCJ0b3RhbEVuZCIsIm1heExpbmVzIiwiY2h1bmtTaXplIiwiY3VycmVudExpbmVzQ291bnQiLCJzY3JvbGxUaHJlc2hvbGQiLCJpbml0aWFsaXplIiwiZWRpdG9yIiwiYXR0YWNoU2Nyb2xsTGlzdGVuZXIiLCJjb25zb2xlIiwiZXJyb3IiLCJnZXRTZXNzaW9uIiwib24iLCJzY3JvbGxUb3AiLCJoYW5kbGVTY3JvbGwiLCJyZW5kZXJlciIsInRvdGFsSGVpZ2h0IiwibGF5ZXJDb25maWciLCJtYXhIZWlnaHQiLCJ2aXNpYmxlSGVpZ2h0IiwiJHNpemUiLCJzY3JvbGxlckhlaWdodCIsInRocmVzaG9sZCIsImxvYWRQcmV2aW91c0NodW5rIiwibG9hZE5leHRDaHVuayIsInNob3dUb3BJbmRpY2F0b3IiLCJ0aW1lV2luZG93IiwiY2FsY3VsYXRlUHJldmlvdXNUaW1lV2luZG93IiwicmVzcG9uc2UiLCJmZXRjaExvZ0NodW5rIiwiZGF0ZUZyb20iLCJzdGFydCIsImRhdGVUbyIsImVuZCIsInJlc3VsdCIsImRhdGEiLCJjb250ZW50IiwicHJlcGVuZENvbnRlbnQiLCJ0cmltQm90dG9tSWZOZWVkZWQiLCJoaWRlVG9wSW5kaWNhdG9yIiwic2hvd0JvdHRvbUluZGljYXRvciIsImNhbGN1bGF0ZU5leHRUaW1lV2luZG93IiwiYXBwZW5kQ29udGVudCIsInRyaW1Ub3BJZk5lZWRlZCIsImhpZGVCb3R0b21JbmRpY2F0b3IiLCJwYXJhbXMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInJlcXVlc3RQYXJhbXMiLCJsaW5lcyIsIlN5c2xvZ0FQSSIsImdldExvZ0Zyb21GaWxlIiwiRXJyb3IiLCJ0cmltIiwiY3VycmVudENvbnRlbnQiLCJnZXRWYWx1ZSIsImN1cnJlbnRSb3ciLCJnZXRDdXJzb3JQb3NpdGlvbiIsInJvdyIsImFkZGVkTGluZXMiLCJzcGxpdCIsImFkZGVkUm93c0NvdW50IiwibGVuZ3RoIiwibmV3Q29udGVudCIsInNldFZhbHVlIiwiZ290b0xpbmUiLCJjdXJyZW50UG9zaXRpb24iLCJjb2x1bW4iLCJsaW5lc1RvUmVtb3ZlIiwidHJpbW1lZCIsInNsaWNlIiwiam9pbiIsIm5ld1JvdyIsIk1hdGgiLCJtYXgiLCJtaW4iLCJjdXJyZW50RHVyYXRpb24iLCJhdmdUaW1lUGVyTGluZSIsInRpbWVJbnRlcnZhbCIsIiQiLCJmYWRlSW4iLCJmYWRlT3V0IiwicmVzZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBTFE7O0FBT25CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRTtBQUNWQyxJQUFBQSxHQUFHLEVBQUUsS0FESztBQUVWQyxJQUFBQSxNQUFNLEVBQUU7QUFGRSxHQVhLOztBQWdCbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLFFBQVEsRUFBRSxFQURIO0FBRVBDLElBQUFBLE1BQU0sRUFBRSxFQUZEO0FBR1BDLElBQUFBLGtCQUFrQixFQUFFLElBSGI7QUFHb0I7QUFDM0JDLElBQUFBLGdCQUFnQixFQUFFLElBSlg7QUFJb0I7QUFDM0JDLElB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QlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGFjZSwgU3lzbG9nQVBJICovXG5cbi8qKlxuICogSW5maW5pdGUgc2Nyb2xsIGhhbmRsZXIgZm9yIEFDRSBlZGl0b3IgbG9nIHZpZXdlclxuICogQXV0b21hdGljYWxseSBsb2FkcyBwcmV2aW91cy9uZXh0IGxvZyBjaHVua3Mgd2hlbiBzY3JvbGxpbmcgdG8gYm91bmRhcmllc1xuICpcbiAqIEBtb2R1bGUgSW5maW5pdGVTY3JvbGxcbiAqL1xuY29uc3QgSW5maW5pdGVTY3JvbGwgPSB7XG4gICAgLyoqXG4gICAgICogQUNFIGVkaXRvciBpbnN0YW5jZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgYWNlRWRpdG9yOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogTG9hZGluZyBzdGF0ZSBmbGFnc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgbG9hZGluZ1N0YXRlOiB7XG4gICAgICAgIHRvcDogZmFsc2UsXG4gICAgICAgIGJvdHRvbTogZmFsc2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlldyBzdGF0ZSB0cmFja2luZyBjdXJyZW50IHdpbmRvdyBhbmQgYm91bmRhcmllc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmlld1N0YXRlOiB7XG4gICAgICAgIGZpbGVuYW1lOiAnJyxcbiAgICAgICAgZmlsdGVyOiAnJyxcbiAgICAgICAgY3VycmVudFdpbmRvd1N0YXJ0OiBudWxsLCAgLy8gQ3VycmVudCB2aXNpYmxlIHdpbmRvdyBzdGFydCB0aW1lc3RhbXBcbiAgICAgICAgY3VycmVudFdpbmRvd0VuZDogbnVsbCwgICAgLy8gQ3VycmVudCB2aXNpYmxlIHdpbmRvdyBlbmQgdGltZXN0YW1wXG4gICAgICAgIHRvdGFsU3RhcnQ6IG51bGwsICAgICAgICAgIC8vIFRvdGFsIGxvZyBmaWxlIHN0YXJ0IHRpbWVzdGFtcFxuICAgICAgICB0b3RhbEVuZDogbnVsbCwgICAgICAgICAgICAvLyBUb3RhbCBsb2cgZmlsZSBlbmQgdGltZXN0YW1wXG4gICAgICAgIG1heExpbmVzOiA1MDAwLCAgICAgICAgICAgIC8vIE1heGltdW0gbGluZXMgaW4gZWRpdG9yIGJ1ZmZlclxuICAgICAgICBjaHVua1NpemU6IDUwMCwgICAgICAgICAgICAvLyBMaW5lcyB0byBsb2FkIHBlciBjaHVua1xuICAgICAgICBjdXJyZW50TGluZXNDb3VudDogMCAgICAgICAvLyBDdXJyZW50IG51bWJlciBvZiBsaW5lcyBpbiBlZGl0b3JcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2Nyb2xsIHRocmVzaG9sZCBwZXJjZW50YWdlIGZvciB0cmlnZ2VyaW5nIGxvYWRcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHNjcm9sbFRocmVzaG9sZDogMC4xLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbmZpbml0ZSBzY3JvbGxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdG9yIC0gQUNFIGVkaXRvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoZWRpdG9yKSB7XG4gICAgICAgIHRoaXMuYWNlRWRpdG9yID0gZWRpdG9yO1xuICAgICAgICB0aGlzLmF0dGFjaFNjcm9sbExpc3RlbmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBzY3JvbGwgZXZlbnQgbGlzdGVuZXIgdG8gQUNFIGVkaXRvclxuICAgICAqL1xuICAgIGF0dGFjaFNjcm9sbExpc3RlbmVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuYWNlRWRpdG9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBQ0UgZWRpdG9yIG5vdCBpbml0aWFsaXplZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hY2VFZGl0b3IuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2VTY3JvbGxUb3AnLCAoc2Nyb2xsVG9wKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbChzY3JvbGxUb3ApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNjcm9sbCBldmVudHNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2Nyb2xsVG9wIC0gQ3VycmVudCBzY3JvbGwgcG9zaXRpb25cbiAgICAgKi9cbiAgICBoYW5kbGVTY3JvbGwoc2Nyb2xsVG9wKSB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5hY2VFZGl0b3IucmVuZGVyZXI7XG4gICAgICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gcmVuZGVyZXIubGF5ZXJDb25maWcubWF4SGVpZ2h0O1xuICAgICAgICBjb25zdCB2aXNpYmxlSGVpZ2h0ID0gcmVuZGVyZXIuJHNpemUuc2Nyb2xsZXJIZWlnaHQ7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRocmVzaG9sZCBpbiBwaXhlbHNcbiAgICAgICAgY29uc3QgdGhyZXNob2xkID0gdmlzaWJsZUhlaWdodCAqIHRoaXMuc2Nyb2xsVGhyZXNob2xkO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHNjcm9sbGVkIG5lYXIgdG9wXG4gICAgICAgIGlmIChzY3JvbGxUb3AgPCB0aHJlc2hvbGQgJiYgIXRoaXMubG9hZGluZ1N0YXRlLnRvcCkge1xuICAgICAgICAgICAgdGhpcy5sb2FkUHJldmlvdXNDaHVuaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgc2Nyb2xsZWQgbmVhciBib3R0b21cbiAgICAgICAgaWYgKHNjcm9sbFRvcCArIHZpc2libGVIZWlnaHQgPiB0b3RhbEhlaWdodCAtIHRocmVzaG9sZCAmJiAhdGhpcy5sb2FkaW5nU3RhdGUuYm90dG9tKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWROZXh0Q2h1bmsoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHByZXZpb3VzIGNodW5rIChzY3JvbGxpbmcgdXApXG4gICAgICovXG4gICAgYXN5bmMgbG9hZFByZXZpb3VzQ2h1bmsoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHJlYWNoZWQgdGhlIGJlZ2lubmluZ1xuICAgICAgICBpZiAodGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0IDw9IHRoaXMudmlld1N0YXRlLnRvdGFsU3RhcnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUtYmFzZWQgbmF2aWdhdGlvbiBpcyBlbmFibGVkXG4gICAgICAgIGlmICghdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0IHx8ICF0aGlzLnZpZXdTdGF0ZS50b3RhbFN0YXJ0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRpbmdTdGF0ZS50b3AgPSB0cnVlO1xuICAgICAgICB0aGlzLnNob3dUb3BJbmRpY2F0b3IoKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgd2luZG93IGZvciBwcmV2aW91cyBjaHVua1xuICAgICAgICAgICAgY29uc3QgdGltZVdpbmRvdyA9IHRoaXMuY2FsY3VsYXRlUHJldmlvdXNUaW1lV2luZG93KCk7XG5cbiAgICAgICAgICAgIC8vIEZldGNoIHByZXZpb3VzIGNodW5rXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZmV0Y2hMb2dDaHVuayh7XG4gICAgICAgICAgICAgICAgZGF0ZUZyb206IHRpbWVXaW5kb3cuc3RhcnQsXG4gICAgICAgICAgICAgICAgZGF0ZVRvOiB0aW1lV2luZG93LmVuZFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXBlbmRDb250ZW50KHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0ID0gdGltZVdpbmRvdy5zdGFydDtcblxuICAgICAgICAgICAgICAgIC8vIFRyaW0gYm90dG9tIGlmIGV4Y2VlZGVkIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIHRoaXMudHJpbUJvdHRvbUlmTmVlZGVkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIHByZXZpb3VzIGNodW5rOicsIGVycm9yKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVRvcEluZGljYXRvcigpO1xuICAgICAgICAgICAgdGhpcy5sb2FkaW5nU3RhdGUudG9wID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBuZXh0IGNodW5rIChzY3JvbGxpbmcgZG93bilcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkTmV4dENodW5rKCkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgaWYgKHRoaXMudmlld1N0YXRlLmN1cnJlbnRXaW5kb3dFbmQgPj0gdGhpcy52aWV3U3RhdGUudG90YWxFbmQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUtYmFzZWQgbmF2aWdhdGlvbiBpcyBlbmFibGVkXG4gICAgICAgIGlmICghdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd0VuZCB8fCAhdGhpcy52aWV3U3RhdGUudG90YWxFbmQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9hZGluZ1N0YXRlLmJvdHRvbSA9IHRydWU7XG4gICAgICAgIHRoaXMuc2hvd0JvdHRvbUluZGljYXRvcigpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSB3aW5kb3cgZm9yIG5leHQgY2h1bmtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVXaW5kb3cgPSB0aGlzLmNhbGN1bGF0ZU5leHRUaW1lV2luZG93KCk7XG5cbiAgICAgICAgICAgIC8vIEZldGNoIG5leHQgY2h1bmtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5mZXRjaExvZ0NodW5rKHtcbiAgICAgICAgICAgICAgICBkYXRlRnJvbTogdGltZVdpbmRvdy5zdGFydCxcbiAgICAgICAgICAgICAgICBkYXRlVG86IHRpbWVXaW5kb3cuZW5kXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuY29udGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kQ29udGVudChyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlld1N0YXRlLmN1cnJlbnRXaW5kb3dFbmQgPSB0aW1lV2luZG93LmVuZDtcblxuICAgICAgICAgICAgICAgIC8vIFRyaW0gdG9wIGlmIGV4Y2VlZGVkIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIHRoaXMudHJpbVRvcElmTmVlZGVkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIG5leHQgY2h1bms6JywgZXJyb3IpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5oaWRlQm90dG9tSW5kaWNhdG9yKCk7XG4gICAgICAgICAgICB0aGlzLmxvYWRpbmdTdGF0ZS5ib3R0b20gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBsb2cgY2h1bmsgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIChkYXRlRnJvbSwgZGF0ZVRvKVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAqL1xuICAgIGZldGNoTG9nQ2h1bmsocGFyYW1zKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0UGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLnZpZXdTdGF0ZS5maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXI6IHRoaXMudmlld1N0YXRlLmZpbHRlcixcbiAgICAgICAgICAgICAgICBsaW5lczogdGhpcy52aWV3U3RhdGUuY2h1bmtTaXplLFxuICAgICAgICAgICAgICAgIC4uLnBhcmFtc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHJlcXVlc3RQYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIGZldGNoIGxvZyBjaHVuaycpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBlbmQgY29udGVudCB0byB0aGUgYmVnaW5uaW5nIG9mIGVkaXRvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gQ29udGVudCB0byBwcmVwZW5kXG4gICAgICovXG4gICAgcHJlcGVuZENvbnRlbnQoY29udGVudCkge1xuICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IHRoaXMuYWNlRWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRSb3cgPSB0aGlzLmFjZUVkaXRvci5nZXRDdXJzb3JQb3NpdGlvbigpLnJvdztcbiAgICAgICAgY29uc3QgYWRkZWRMaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBjb25zdCBhZGRlZFJvd3NDb3VudCA9IGFkZGVkTGluZXMubGVuZ3RoO1xuXG4gICAgICAgIC8vIENvbWJpbmUgY29udGVudFxuICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gY29udGVudCArICdcXG4nICsgY3VycmVudENvbnRlbnQ7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVkaXRvciB2YWx1ZVxuICAgICAgICB0aGlzLmFjZUVkaXRvci5zZXRWYWx1ZShuZXdDb250ZW50LCAtMSk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSBjdXJzb3IgcG9zaXRpb24gKGFkanVzdGVkIGZvciBhZGRlZCBsaW5lcylcbiAgICAgICAgdGhpcy5hY2VFZGl0b3IuZ290b0xpbmUoY3VycmVudFJvdyArIGFkZGVkUm93c0NvdW50ICsgMSwgMCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGxpbmVzIGNvdW50XG4gICAgICAgIHRoaXMudmlld1N0YXRlLmN1cnJlbnRMaW5lc0NvdW50ICs9IGFkZGVkUm93c0NvdW50O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBlbmQgY29udGVudCB0byB0aGUgZW5kIG9mIGVkaXRvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gQ29udGVudCB0byBhcHBlbmRcbiAgICAgKi9cbiAgICBhcHBlbmRDb250ZW50KGNvbnRlbnQpIHtcbiAgICAgICAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSB0aGlzLmFjZUVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICBjb25zdCBjdXJyZW50UG9zaXRpb24gPSB0aGlzLmFjZUVkaXRvci5nZXRDdXJzb3JQb3NpdGlvbigpO1xuICAgICAgICBjb25zdCBhZGRlZExpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IGFkZGVkUm93c0NvdW50ID0gYWRkZWRMaW5lcy5sZW5ndGg7XG5cbiAgICAgICAgLy8gQ29tYmluZSBjb250ZW50XG4gICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBjdXJyZW50Q29udGVudCArICdcXG4nICsgY29udGVudDtcblxuICAgICAgICAvLyBVcGRhdGUgZWRpdG9yIHZhbHVlXG4gICAgICAgIHRoaXMuYWNlRWRpdG9yLnNldFZhbHVlKG5ld0NvbnRlbnQsIC0xKTtcblxuICAgICAgICAvLyBSZXN0b3JlIGN1cnNvciBwb3NpdGlvblxuICAgICAgICB0aGlzLmFjZUVkaXRvci5nb3RvTGluZShjdXJyZW50UG9zaXRpb24ucm93ICsgMSwgY3VycmVudFBvc2l0aW9uLmNvbHVtbik7XG5cbiAgICAgICAgLy8gVXBkYXRlIGxpbmVzIGNvdW50XG4gICAgICAgIHRoaXMudmlld1N0YXRlLmN1cnJlbnRMaW5lc0NvdW50ICs9IGFkZGVkUm93c0NvdW50O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmltIGxpbmVzIGZyb20gdG9wIGlmIGV4Y2VlZGVkIG1heCBsaW5lc1xuICAgICAqL1xuICAgIHRyaW1Ub3BJZk5lZWRlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMudmlld1N0YXRlLmN1cnJlbnRMaW5lc0NvdW50IDw9IHRoaXMudmlld1N0YXRlLm1heExpbmVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsaW5lc1RvUmVtb3ZlID0gdGhpcy52aWV3U3RhdGUuY3VycmVudExpbmVzQ291bnQgLSB0aGlzLnZpZXdTdGF0ZS5tYXhMaW5lcztcbiAgICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmFjZUVkaXRvci5nZXRWYWx1ZSgpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmVzLnNsaWNlKGxpbmVzVG9SZW1vdmUpLmpvaW4oJ1xcbicpO1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRSb3cgPSB0aGlzLmFjZUVkaXRvci5nZXRDdXJzb3JQb3NpdGlvbigpLnJvdztcblxuICAgICAgICAvLyBVcGRhdGUgZWRpdG9yXG4gICAgICAgIHRoaXMuYWNlRWRpdG9yLnNldFZhbHVlKHRyaW1tZWQsIC0xKTtcblxuICAgICAgICAvLyBBZGp1c3QgY3Vyc29yIHBvc2l0aW9uXG4gICAgICAgIGNvbnN0IG5ld1JvdyA9IE1hdGgubWF4KDEsIGN1cnJlbnRSb3cgLSBsaW5lc1RvUmVtb3ZlKTtcbiAgICAgICAgdGhpcy5hY2VFZGl0b3IuZ290b0xpbmUobmV3Um93LCAwKTtcblxuICAgICAgICAvLyBVcGRhdGUgbGluZXMgY291bnRcbiAgICAgICAgdGhpcy52aWV3U3RhdGUuY3VycmVudExpbmVzQ291bnQgPSB0aGlzLnZpZXdTdGF0ZS5tYXhMaW5lcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJpbSBsaW5lcyBmcm9tIGJvdHRvbSBpZiBleGNlZWRlZCBtYXggbGluZXNcbiAgICAgKi9cbiAgICB0cmltQm90dG9tSWZOZWVkZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXdTdGF0ZS5jdXJyZW50TGluZXNDb3VudCA8PSB0aGlzLnZpZXdTdGF0ZS5tYXhMaW5lcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmFjZUVkaXRvci5nZXRWYWx1ZSgpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmVzLnNsaWNlKDAsIHRoaXMudmlld1N0YXRlLm1heExpbmVzKS5qb2luKCdcXG4nKTtcblxuICAgICAgICBjb25zdCBjdXJyZW50UG9zaXRpb24gPSB0aGlzLmFjZUVkaXRvci5nZXRDdXJzb3JQb3NpdGlvbigpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlZGl0b3JcbiAgICAgICAgdGhpcy5hY2VFZGl0b3Iuc2V0VmFsdWUodHJpbW1lZCwgLTEpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgY3Vyc29yIHBvc2l0aW9uIChzaG91bGQgYmUgd2l0aGluIGJvdW5kcylcbiAgICAgICAgdGhpcy5hY2VFZGl0b3IuZ290b0xpbmUoXG4gICAgICAgICAgICBNYXRoLm1pbihjdXJyZW50UG9zaXRpb24ucm93ICsgMSwgdGhpcy52aWV3U3RhdGUubWF4TGluZXMpLFxuICAgICAgICAgICAgY3VycmVudFBvc2l0aW9uLmNvbHVtblxuICAgICAgICApO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBsaW5lcyBjb3VudFxuICAgICAgICB0aGlzLnZpZXdTdGF0ZS5jdXJyZW50TGluZXNDb3VudCA9IHRoaXMudmlld1N0YXRlLm1heExpbmVzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGltZSB3aW5kb3cgZm9yIHByZXZpb3VzIGNodW5rXG4gICAgICogQHJldHVybnMge29iamVjdH0gVGltZSB3aW5kb3cgd2l0aCBzdGFydCBhbmQgZW5kIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQcmV2aW91c1RpbWVXaW5kb3coKSB7XG4gICAgICAgIC8vIEVzdGltYXRlIGF2ZXJhZ2UgdGltZSBwZXIgbGluZVxuICAgICAgICBjb25zdCBjdXJyZW50RHVyYXRpb24gPSB0aGlzLnZpZXdTdGF0ZS5jdXJyZW50V2luZG93RW5kIC0gdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0O1xuICAgICAgICBjb25zdCBhdmdUaW1lUGVyTGluZSA9IGN1cnJlbnREdXJhdGlvbiAvIE1hdGgubWF4KHRoaXMudmlld1N0YXRlLmN1cnJlbnRMaW5lc0NvdW50LCAxKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBpbnRlcnZhbCBmb3IgY2h1bmtcbiAgICAgICAgY29uc3QgdGltZUludGVydmFsID0gYXZnVGltZVBlckxpbmUgKiB0aGlzLnZpZXdTdGF0ZS5jaHVua1NpemU7XG5cbiAgICAgICAgY29uc3QgZW5kID0gdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0O1xuICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWF4KFxuICAgICAgICAgICAgdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd1N0YXJ0IC0gdGltZUludGVydmFsLFxuICAgICAgICAgICAgdGhpcy52aWV3U3RhdGUudG90YWxTdGFydFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB7IHN0YXJ0LCBlbmQgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRpbWUgd2luZG93IGZvciBuZXh0IGNodW5rXG4gICAgICogQHJldHVybnMge29iamVjdH0gVGltZSB3aW5kb3cgd2l0aCBzdGFydCBhbmQgZW5kIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVOZXh0VGltZVdpbmRvdygpIHtcbiAgICAgICAgLy8gRXN0aW1hdGUgYXZlcmFnZSB0aW1lIHBlciBsaW5lXG4gICAgICAgIGNvbnN0IGN1cnJlbnREdXJhdGlvbiA9IHRoaXMudmlld1N0YXRlLmN1cnJlbnRXaW5kb3dFbmQgLSB0aGlzLnZpZXdTdGF0ZS5jdXJyZW50V2luZG93U3RhcnQ7XG4gICAgICAgIGNvbnN0IGF2Z1RpbWVQZXJMaW5lID0gY3VycmVudER1cmF0aW9uIC8gTWF0aC5tYXgodGhpcy52aWV3U3RhdGUuY3VycmVudExpbmVzQ291bnQsIDEpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGludGVydmFsIGZvciBjaHVua1xuICAgICAgICBjb25zdCB0aW1lSW50ZXJ2YWwgPSBhdmdUaW1lUGVyTGluZSAqIHRoaXMudmlld1N0YXRlLmNodW5rU2l6ZTtcblxuICAgICAgICBjb25zdCBzdGFydCA9IHRoaXMudmlld1N0YXRlLmN1cnJlbnRXaW5kb3dFbmQ7XG4gICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKFxuICAgICAgICAgICAgdGhpcy52aWV3U3RhdGUuY3VycmVudFdpbmRvd0VuZCArIHRpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIHRoaXMudmlld1N0YXRlLnRvdGFsRW5kXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHsgc3RhcnQsIGVuZCB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHRvcCBsb2FkaW5nIGluZGljYXRvclxuICAgICAqL1xuICAgIHNob3dUb3BJbmRpY2F0b3IoKSB7XG4gICAgICAgICQoJy5sb2FkaW5nLWluZGljYXRvci50b3AnKS5mYWRlSW4oMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSB0b3AgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBoaWRlVG9wSW5kaWNhdG9yKCkge1xuICAgICAgICAkKCcubG9hZGluZy1pbmRpY2F0b3IudG9wJykuZmFkZU91dCgyMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGJvdHRvbSBsb2FkaW5nIGluZGljYXRvclxuICAgICAqL1xuICAgIHNob3dCb3R0b21JbmRpY2F0b3IoKSB7XG4gICAgICAgICQoJy5sb2FkaW5nLWluZGljYXRvci5ib3R0b20nKS5mYWRlSW4oMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBib3R0b20gbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBoaWRlQm90dG9tSW5kaWNhdG9yKCkge1xuICAgICAgICAkKCcubG9hZGluZy1pbmRpY2F0b3IuYm90dG9tJykuZmFkZU91dCgyMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBpbmZpbml0ZSBzY3JvbGwgc3RhdGVcbiAgICAgKi9cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy5sb2FkaW5nU3RhdGUudG9wID0gZmFsc2U7XG4gICAgICAgIHRoaXMubG9hZGluZ1N0YXRlLmJvdHRvbSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnZpZXdTdGF0ZS5jdXJyZW50V2luZG93U3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnZpZXdTdGF0ZS5jdXJyZW50V2luZG93RW5kID0gbnVsbDtcbiAgICAgICAgdGhpcy52aWV3U3RhdGUuY3VycmVudExpbmVzQ291bnQgPSAwO1xuICAgIH1cbn07XG4iXX0=