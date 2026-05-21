"use strict";

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

/**
 * Time slider component for log navigation
 * Provides visual time range selection for log viewing
 * Uses Fomantic UI Slider module
 *
 * @module TimeSlider
 */
var TimeSlider = {
  /**
   * jQuery container for the slider
   * @type {jQuery}
   */
  $container: null,

  /**
   * jQuery slider element
   * @type {jQuery}
   */
  $slider: null,

  /**
   * Time range boundaries (start and end timestamps)
   * @type {object}
   */
  timeRange: null,

  /**
   * Server timezone offset in seconds
   * @type {number}
   */
  serverTimezoneOffset: 0,

  /**
   * Current selected time window
   * @type {object}
   */
  currentWindow: {
    start: null,
    end: null
  },

  /**
   * Debounce timer for slider changes
   * @type {number}
   */
  debounceTimer: null,

  /**
   * Debounce delay in milliseconds
   * @type {number}
   */
  debounceDelay: 500,

  /**
   * Initialize time slider
   * @param {string|jQuery} container - Container selector or jQuery object
   * @param {object} timeRange - Time range with start and end timestamps
   */
  initialize: function initialize(container, timeRange) {
    this.$container = $(container);
    this.timeRange = timeRange; // Create slider HTML structure

    this.createSliderStructure(); // Initialize Fomantic UI Slider

    this.initializeSlider(); // Set initial window (last hour by default)

    var oneHour = 3600;
    var initialStart = Math.max(timeRange.end - oneHour, timeRange.start);
    this.setTimeWindow(initialStart, timeRange.end, false);
  },

  /**
   * Create HTML structure for the slider
   */
  createSliderStructure: function createSliderStructure() {
    this.$container.html("\n            <div class=\"slider-wrapper\">\n                <div class=\"ui range slider\" id=\"time-range-slider\"></div>\n                <div class=\"slider-tooltips\">\n                    <div class=\"slider-tooltip start-tooltip\" id=\"start-tooltip\"></div>\n                    <div class=\"slider-tooltip end-tooltip\" id=\"end-tooltip\"></div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Initialize Fomantic UI Slider component
   */
  initializeSlider: function initializeSlider() {
    var _this = this;

    this.$slider = this.$container.find('#time-range-slider'); // Initialize Fomantic UI slider without automatic labels

    this.$slider.slider({
      min: this.timeRange.start,
      max: this.timeRange.end,
      start: this.timeRange.start,
      end: this.timeRange.end,
      step: 1,
      onChange: function onChange(_, thumbVal, secondThumbVal) {
        // Called when slider value changes
        _this.handleSliderChange(thumbVal, secondThumbVal);
      },
      onMove: function onMove(_, thumbVal, secondThumbVal) {
        // Called while dragging
        _this.handleSliderMove(thumbVal, secondThumbVal);
      }
    }); // Initialize custom tooltips

    this.initializeTooltips(); // Add custom time labels

    this.addTimeLabels();
  },

  /**
   * Add custom time labels to the slider
   */
  addTimeLabels: function addTimeLabels() {
    var $labelsContainer = $('<div>', {
      "class": 'time-labels-container'
    });
    var timeRangeDuration = this.timeRange.end - this.timeRange.start;
    var numberOfLabels = 6; // Fixed number of labels
    // Calculate step for labels

    var labelStep = timeRangeDuration / (numberOfLabels - 1); // Create labels

    for (var i = 0; i < numberOfLabels; i++) {
      var timestamp = Math.round(this.timeRange.start + labelStep * i);
      var position = i / (numberOfLabels - 1) * 100; // Position in percentage

      var $label = $('<div>', {
        "class": 'time-label-mark',
        css: {
          left: "".concat(position, "%")
        },
        text: this.formatTimestampShort(timestamp)
      });
      $labelsContainer.append($label);
    } // Append labels container to slider wrapper


    this.$container.find('.slider-wrapper').append($labelsContainer);
  },

  /**
   * Initialize custom tooltips with formatting
   */
  initializeTooltips: function initializeTooltips() {
    // Update tooltip positions initially
    this.updateTooltipPositions(); // Update tooltip content

    this.updateTooltipContent(this.timeRange.start, this.timeRange.end);
  },

  /**
   * Update custom tooltip positions based on thumb positions
   */
  updateTooltipPositions: function updateTooltipPositions() {
    var $startTooltip = $('#start-tooltip');
    var $endTooltip = $('#end-tooltip');
    var $startThumb = this.$slider.find('.thumb:first');
    var $endThumb = this.$slider.find('.thumb:last');

    if ($startThumb.length && $startTooltip.length) {
      var startLeft = $startThumb.position().left;
      $startTooltip.css({
        left: "".concat(startLeft, "px"),
        display: 'block'
      });
    }

    if ($endThumb.length && $endTooltip.length) {
      var endLeft = $endThumb.position().left;
      $endTooltip.css({
        left: "".concat(endLeft, "px"),
        display: 'block'
      });
    }
  },

  /**
   * Update custom tooltip content with formatted timestamps
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   */
  updateTooltipContent: function updateTooltipContent(start, end) {
    var $startTooltip = $('#start-tooltip');
    var $endTooltip = $('#end-tooltip');

    if ($startTooltip.length) {
      $startTooltip.text(this.formatTimestamp(start));
    }

    if ($endTooltip.length) {
      $endTooltip.text(this.formatTimestamp(end));
    } // Update positions after content change


    this.updateTooltipPositions();
  },

  /**
   * Handle slider move events (update tooltips in real-time)
   * @param {number} thumbVal - First thumb value (start)
   * @param {number} secondThumbVal - Second thumb value (end)
   */
  handleSliderMove: function handleSliderMove(thumbVal, secondThumbVal) {
    // Update tooltips during slider movement
    var start = parseInt(thumbVal);
    var end = parseInt(secondThumbVal);
    this.updateTooltipContent(start, end);
  },

  /**
   * Handle slider change events (after user stops dragging)
   * @param {number} thumbVal - First thumb value (start)
   * @param {number} secondThumbVal - Second thumb value (end)
   */
  handleSliderChange: function handleSliderChange(thumbVal, secondThumbVal) {
    var start = parseInt(thumbVal);
    var end = parseInt(secondThumbVal); // Update tooltips

    this.updateTooltipContent(start, end); // Debounce the callback to avoid too many API calls

    this.debouncedWindowChange(start, end);
  },

  /**
   * Set time window programmatically
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   * @param {boolean} triggerCallback - Whether to trigger onChange callback
   */
  setTimeWindow: function setTimeWindow(start, end) {
    var triggerCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    this.currentWindow.start = start;
    this.currentWindow.end = end; // Update slider position

    if (this.$slider && this.$slider.length) {
      this.$slider.slider('set rangeValue', start, end);
    } // Update tooltips


    this.updateTooltipContent(start, end); // Trigger callback if requested

    if (triggerCallback && this.onWindowChange) {
      this.onWindowChange(start, end);
    }
  },

  /**
   * Format timestamp to readable date/time string (server time)
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date/time string (YYYY-MM-DD HH:MM:SS)
   */
  formatTimestamp: function formatTimestamp(timestamp) {
    // PbxDateTime mirrors `this.serverTimezoneOffset` once
    // SVGTimeline.setServerTimezoneOffset propagates the value.
    return PbxDateTime.formatServerTime(timestamp, {
      withSeconds: true
    });
  },

  /**
   * Format timestamp to short time string for slider labels (server time)
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted time string (HH:MM or DD HH:MM)
   */
  formatTimestampShort: function formatTimestampShort(timestamp) {
    var full = PbxDateTime.formatServerTime(timestamp); // YYYY-MM-DD HH:MM

    var timeRangeDuration = this.timeRange.end - this.timeRange.start;
    var day = full.slice(8, 10);
    var hhmm = full.slice(11, 16);

    if (timeRangeDuration > 86400) {
      return "".concat(day, " ").concat(hhmm);
    }

    return hhmm;
  },

  /**
   * Debounced window change handler
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   */
  debouncedWindowChange: function debouncedWindowChange(start, end) {
    var _this2 = this;

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    } // Set new timer


    this.debounceTimer = setTimeout(function () {
      _this2.currentWindow.start = start;
      _this2.currentWindow.end = end;

      if (_this2.onWindowChange) {
        _this2.onWindowChange(start, end);
      }
    }, this.debounceDelay);
  },

  /**
   * Callback function when time window changes
   * This should be overridden by the parent module
   */
  onWindowChange: function onWindowChange() {// To be overridden by parent module
    // Will receive (start, end) parameters when called
  },

  /**
   * Destroy slider and cleanup
   */
  destroy: function destroy() {
    if (this.$slider && this.$slider.length) {
      this.$slider.slider('destroy');
      this.$slider = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.$container) {
      this.$container.empty();
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXRpbWUtc2xpZGVyLmpzIl0sIm5hbWVzIjpbIlRpbWVTbGlkZXIiLCIkY29udGFpbmVyIiwiJHNsaWRlciIsInRpbWVSYW5nZSIsInNlcnZlclRpbWV6b25lT2Zmc2V0IiwiY3VycmVudFdpbmRvdyIsInN0YXJ0IiwiZW5kIiwiZGVib3VuY2VUaW1lciIsImRlYm91bmNlRGVsYXkiLCJpbml0aWFsaXplIiwiY29udGFpbmVyIiwiJCIsImNyZWF0ZVNsaWRlclN0cnVjdHVyZSIsImluaXRpYWxpemVTbGlkZXIiLCJvbmVIb3VyIiwiaW5pdGlhbFN0YXJ0IiwiTWF0aCIsIm1heCIsInNldFRpbWVXaW5kb3ciLCJodG1sIiwiZmluZCIsInNsaWRlciIsIm1pbiIsInN0ZXAiLCJvbkNoYW5nZSIsIl8iLCJ0aHVtYlZhbCIsInNlY29uZFRodW1iVmFsIiwiaGFuZGxlU2xpZGVyQ2hhbmdlIiwib25Nb3ZlIiwiaGFuZGxlU2xpZGVyTW92ZSIsImluaXRpYWxpemVUb29sdGlwcyIsImFkZFRpbWVMYWJlbHMiLCIkbGFiZWxzQ29udGFpbmVyIiwidGltZVJhbmdlRHVyYXRpb24iLCJudW1iZXJPZkxhYmVscyIsImxhYmVsU3RlcCIsImkiLCJ0aW1lc3RhbXAiLCJyb3VuZCIsInBvc2l0aW9uIiwiJGxhYmVsIiwiY3NzIiwibGVmdCIsInRleHQiLCJmb3JtYXRUaW1lc3RhbXBTaG9ydCIsImFwcGVuZCIsInVwZGF0ZVRvb2x0aXBQb3NpdGlvbnMiLCJ1cGRhdGVUb29sdGlwQ29udGVudCIsIiRzdGFydFRvb2x0aXAiLCIkZW5kVG9vbHRpcCIsIiRzdGFydFRodW1iIiwiJGVuZFRodW1iIiwibGVuZ3RoIiwic3RhcnRMZWZ0IiwiZGlzcGxheSIsImVuZExlZnQiLCJmb3JtYXRUaW1lc3RhbXAiLCJwYXJzZUludCIsImRlYm91bmNlZFdpbmRvd0NoYW5nZSIsInRyaWdnZXJDYWxsYmFjayIsIm9uV2luZG93Q2hhbmdlIiwiUGJ4RGF0ZVRpbWUiLCJmb3JtYXRTZXJ2ZXJUaW1lIiwid2l0aFNlY29uZHMiLCJmdWxsIiwiZGF5Iiwic2xpY2UiLCJoaG1tIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImRlc3Ryb3kiLCJlbXB0eSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBQ2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBTEc7O0FBT2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBWE07O0FBYWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBakJJOztBQW1CZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRSxDQXZCUDs7QUF5QmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLEtBQUssRUFBRSxJQURJO0FBRVhDLElBQUFBLEdBQUcsRUFBRTtBQUZNLEdBN0JBOztBQWtDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUF0Q0E7O0FBd0NmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxHQTVDQTs7QUE4Q2Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQW5EZSxzQkFtREpDLFNBbkRJLEVBbURPUixTQW5EUCxFQW1Ea0I7QUFDN0IsU0FBS0YsVUFBTCxHQUFrQlcsQ0FBQyxDQUFDRCxTQUFELENBQW5CO0FBQ0EsU0FBS1IsU0FBTCxHQUFpQkEsU0FBakIsQ0FGNkIsQ0FJN0I7O0FBQ0EsU0FBS1UscUJBQUwsR0FMNkIsQ0FPN0I7O0FBQ0EsU0FB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QXRUZSw0QkFzVEUsQ0FDYjtBQUNBO0FBQ0gsR0F6VGM7O0FBMlRmO0FBQ0o7QUFDQTtBQUNJVSxFQUFBQSxPQTlUZSxxQkE4VEw7QUFDTixRQUFJLEtBQUt0RSxPQUFMLElBQWdCLEtBQUtBLE9BQUwsQ0FBYW9ELE1BQWpDLEVBQXlDO0FBQ3JDLFdBQUtwRCxPQUFMLENBQWFvQixNQUFiLENBQW9CLFNBQXBCO0FBQ0EsV0FBS3BCLE9BQUwsR0FBZSxJQUFmO0FBQ0g7O0FBRUQsUUFBSSxLQUFLTSxhQUFULEVBQXdCO0FBQ3BCOEQsTUFBQUEsWUFBWSxDQUFDLEtBQUs5RCxhQUFOLENBQVo7QUFDQSxXQUFLQSxhQUFMLEdBQXFCLElBQXJCO0FBQ0g7O0FBRUQsUUFBSSxLQUFLUCxVQUFULEVBQXFCO0FBQ2pCLFdBQUtBLFVBQUwsQ0FBZ0J3RSxLQUFoQjtBQUNIO0FBQ0o7QUE1VWMsQ0FBbkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIFRpbWUgc2xpZGVyIGNvbXBvbmVudCBmb3IgbG9nIG5hdmlnYXRpb25cbiAqIFByb3ZpZGVzIHZpc3VhbCB0aW1lIHJhbmdlIHNlbGVjdGlvbiBmb3IgbG9nIHZpZXdpbmdcbiAqIFVzZXMgRm9tYW50aWMgVUkgU2xpZGVyIG1vZHVsZVxuICpcbiAqIEBtb2R1bGUgVGltZVNsaWRlclxuICovXG5jb25zdCBUaW1lU2xpZGVyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBjb250YWluZXIgZm9yIHRoZSBzbGlkZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjb250YWluZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgc2xpZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzbGlkZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lIHJhbmdlIGJvdW5kYXJpZXMgKHN0YXJ0IGFuZCBlbmQgdGltZXN0YW1wcylcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHRpbWVSYW5nZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNlcnZlciB0aW1lem9uZSBvZmZzZXQgaW4gc2Vjb25kc1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgc2VydmVyVGltZXpvbmVPZmZzZXQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHNlbGVjdGVkIHRpbWUgd2luZG93XG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBjdXJyZW50V2luZG93OiB7XG4gICAgICAgIHN0YXJ0OiBudWxsLFxuICAgICAgICBlbmQ6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVib3VuY2UgdGltZXIgZm9yIHNsaWRlciBjaGFuZ2VzXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBkZWJvdW5jZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRGVib3VuY2UgZGVsYXkgaW4gbWlsbGlzZWNvbmRzXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBkZWJvdW5jZURlbGF5OiA1MDAsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWUgc2xpZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBjb250YWluZXIgLSBDb250YWluZXIgc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lUmFuZ2UgLSBUaW1lIHJhbmdlIHdpdGggc3RhcnQgYW5kIGVuZCB0aW1lc3RhbXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjb250YWluZXIsIHRpbWVSYW5nZSkge1xuICAgICAgICB0aGlzLiRjb250YWluZXIgPSAkKGNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMudGltZVJhbmdlID0gdGltZVJhbmdlO1xuXG4gICAgICAgIC8vIENyZWF0ZSBzbGlkZXIgSFRNTCBzdHJ1Y3R1cmVcbiAgICAgICAgdGhpcy5jcmVhdGVTbGlkZXJTdHJ1Y3R1cmUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEZvbWFudGljIFVJIFNsaWRlclxuICAgICAgICB0aGlzLmluaXRpYWxpemVTbGlkZXIoKTtcblxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB3aW5kb3cgKGxhc3QgaG91ciBieSBkZWZhdWx0KVxuICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcbiAgICAgICAgY29uc3QgaW5pdGlhbFN0YXJ0ID0gTWF0aC5tYXgodGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgIHRoaXMuc2V0VGltZVdpbmRvdyhpbml0aWFsU3RhcnQsIHRpbWVSYW5nZS5lbmQsIGZhbHNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIEhUTUwgc3RydWN0dXJlIGZvciB0aGUgc2xpZGVyXG4gICAgICovXG4gICAgY3JlYXRlU2xpZGVyU3RydWN0dXJlKCkge1xuICAgICAgICB0aGlzLiRjb250YWluZXIuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic2xpZGVyLXdyYXBwZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcmFuZ2Ugc2xpZGVyXCIgaWQ9XCJ0aW1lLXJhbmdlLXNsaWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzbGlkZXItdG9vbHRpcHNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNsaWRlci10b29sdGlwIHN0YXJ0LXRvb2x0aXBcIiBpZD1cInN0YXJ0LXRvb2x0aXBcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNsaWRlci10b29sdGlwIGVuZC10b29sdGlwXCIgaWQ9XCJlbmQtdG9vbHRpcFwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEZvbWFudGljIFVJIFNsaWRlciBjb21wb25lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2xpZGVyKCkge1xuICAgICAgICB0aGlzLiRzbGlkZXIgPSB0aGlzLiRjb250YWluZXIuZmluZCgnI3RpbWUtcmFuZ2Utc2xpZGVyJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSBzbGlkZXIgd2l0aG91dCBhdXRvbWF0aWMgbGFiZWxzXG4gICAgICAgIHRoaXMuJHNsaWRlci5zbGlkZXIoe1xuICAgICAgICAgICAgbWluOiB0aGlzLnRpbWVSYW5nZS5zdGFydCxcbiAgICAgICAgICAgIG1heDogdGhpcy50aW1lUmFuZ2UuZW5kLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMudGltZVJhbmdlLnN0YXJ0LFxuICAgICAgICAgICAgZW5kOiB0aGlzLnRpbWVSYW5nZS5lbmQsXG4gICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChfLCB0aHVtYlZhbCwgc2Vjb25kVGh1bWJWYWwpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDYWxsZWQgd2hlbiBzbGlkZXIgdmFsdWUgY2hhbmdlc1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2xpZGVyQ2hhbmdlKHRodW1iVmFsLCBzZWNvbmRUaHVtYlZhbCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Nb3ZlOiAoXywgdGh1bWJWYWwsIHNlY29uZFRodW1iVmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbGVkIHdoaWxlIGRyYWdnaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTbGlkZXJNb3ZlKHRodW1iVmFsLCBzZWNvbmRUaHVtYlZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY3VzdG9tIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSB0aW1lIGxhYmVsc1xuICAgICAgICB0aGlzLmFkZFRpbWVMYWJlbHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGN1c3RvbSB0aW1lIGxhYmVscyB0byB0aGUgc2xpZGVyXG4gICAgICovXG4gICAgYWRkVGltZUxhYmVscygpIHtcbiAgICAgICAgY29uc3QgJGxhYmVsc0NvbnRhaW5lciA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgY2xhc3M6ICd0aW1lLWxhYmVscy1jb250YWluZXInXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHRpbWVSYW5nZUR1cmF0aW9uID0gdGhpcy50aW1lUmFuZ2UuZW5kIC0gdGhpcy50aW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGNvbnN0IG51bWJlck9mTGFiZWxzID0gNjsgLy8gRml4ZWQgbnVtYmVyIG9mIGxhYmVsc1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBzdGVwIGZvciBsYWJlbHNcbiAgICAgICAgY29uc3QgbGFiZWxTdGVwID0gdGltZVJhbmdlRHVyYXRpb24gLyAobnVtYmVyT2ZMYWJlbHMgLSAxKTtcblxuICAgICAgICAvLyBDcmVhdGUgbGFiZWxzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtYmVyT2ZMYWJlbHM7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gTWF0aC5yb3VuZCh0aGlzLnRpbWVSYW5nZS5zdGFydCArIChsYWJlbFN0ZXAgKiBpKSk7XG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IChpIC8gKG51bWJlck9mTGFiZWxzIC0gMSkpICogMTAwOyAvLyBQb3NpdGlvbiBpbiBwZXJjZW50YWdlXG5cbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAndGltZS1sYWJlbC1tYXJrJyxcbiAgICAgICAgICAgICAgICBjc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogYCR7cG9zaXRpb259JWBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRleHQ6IHRoaXMuZm9ybWF0VGltZXN0YW1wU2hvcnQodGltZXN0YW1wKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRsYWJlbHNDb250YWluZXIuYXBwZW5kKCRsYWJlbCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBlbmQgbGFiZWxzIGNvbnRhaW5lciB0byBzbGlkZXIgd3JhcHBlclxuICAgICAgICB0aGlzLiRjb250YWluZXIuZmluZCgnLnNsaWRlci13cmFwcGVyJykuYXBwZW5kKCRsYWJlbHNDb250YWluZXIpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGN1c3RvbSB0b29sdGlwcyB3aXRoIGZvcm1hdHRpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHBvc2l0aW9ucyBpbml0aWFsbHlcbiAgICAgICAgdGhpcy51cGRhdGVUb29sdGlwUG9zaXRpb25zKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgY29udGVudFxuICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBDb250ZW50KHRoaXMudGltZVJhbmdlLnN0YXJ0LCB0aGlzLnRpbWVSYW5nZS5lbmQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY3VzdG9tIHRvb2x0aXAgcG9zaXRpb25zIGJhc2VkIG9uIHRodW1iIHBvc2l0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZVRvb2x0aXBQb3NpdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0ICRzdGFydFRvb2x0aXAgPSAkKCcjc3RhcnQtdG9vbHRpcCcpO1xuICAgICAgICBjb25zdCAkZW5kVG9vbHRpcCA9ICQoJyNlbmQtdG9vbHRpcCcpO1xuICAgICAgICBjb25zdCAkc3RhcnRUaHVtYiA9IHRoaXMuJHNsaWRlci5maW5kKCcudGh1bWI6Zmlyc3QnKTtcbiAgICAgICAgY29uc3QgJGVuZFRodW1iID0gdGhpcy4kc2xpZGVyLmZpbmQoJy50aHVtYjpsYXN0Jyk7XG5cbiAgICAgICAgaWYgKCRzdGFydFRodW1iLmxlbmd0aCAmJiAkc3RhcnRUb29sdGlwLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRMZWZ0ID0gJHN0YXJ0VGh1bWIucG9zaXRpb24oKS5sZWZ0O1xuICAgICAgICAgICAgJHN0YXJ0VG9vbHRpcC5jc3Moe1xuICAgICAgICAgICAgICAgIGxlZnQ6IGAke3N0YXJ0TGVmdH1weGAsXG4gICAgICAgICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJGVuZFRodW1iLmxlbmd0aCAmJiAkZW5kVG9vbHRpcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuZExlZnQgPSAkZW5kVGh1bWIucG9zaXRpb24oKS5sZWZ0O1xuICAgICAgICAgICAgJGVuZFRvb2x0aXAuY3NzKHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBgJHtlbmRMZWZ0fXB4YCxcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiAnYmxvY2snXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY3VzdG9tIHRvb2x0aXAgY29udGVudCB3aXRoIGZvcm1hdHRlZCB0aW1lc3RhbXBzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICB1cGRhdGVUb29sdGlwQ29udGVudChzdGFydCwgZW5kKSB7XG4gICAgICAgIGNvbnN0ICRzdGFydFRvb2x0aXAgPSAkKCcjc3RhcnQtdG9vbHRpcCcpO1xuICAgICAgICBjb25zdCAkZW5kVG9vbHRpcCA9ICQoJyNlbmQtdG9vbHRpcCcpO1xuXG4gICAgICAgIGlmICgkc3RhcnRUb29sdGlwLmxlbmd0aCkge1xuICAgICAgICAgICAgJHN0YXJ0VG9vbHRpcC50ZXh0KHRoaXMuZm9ybWF0VGltZXN0YW1wKHN0YXJ0KSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJGVuZFRvb2x0aXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZW5kVG9vbHRpcC50ZXh0KHRoaXMuZm9ybWF0VGltZXN0YW1wKGVuZCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHBvc2l0aW9ucyBhZnRlciBjb250ZW50IGNoYW5nZVxuICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNsaWRlciBtb3ZlIGV2ZW50cyAodXBkYXRlIHRvb2x0aXBzIGluIHJlYWwtdGltZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGh1bWJWYWwgLSBGaXJzdCB0aHVtYiB2YWx1ZSAoc3RhcnQpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZFRodW1iVmFsIC0gU2Vjb25kIHRodW1iIHZhbHVlIChlbmQpXG4gICAgICovXG4gICAgaGFuZGxlU2xpZGVyTW92ZSh0aHVtYlZhbCwgc2Vjb25kVGh1bWJWYWwpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBzIGR1cmluZyBzbGlkZXIgbW92ZW1lbnRcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBwYXJzZUludCh0aHVtYlZhbCk7XG4gICAgICAgIGNvbnN0IGVuZCA9IHBhcnNlSW50KHNlY29uZFRodW1iVmFsKTtcbiAgICAgICAgdGhpcy51cGRhdGVUb29sdGlwQ29udGVudChzdGFydCwgZW5kKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNsaWRlciBjaGFuZ2UgZXZlbnRzIChhZnRlciB1c2VyIHN0b3BzIGRyYWdnaW5nKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aHVtYlZhbCAtIEZpcnN0IHRodW1iIHZhbHVlIChzdGFydClcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2Vjb25kVGh1bWJWYWwgLSBTZWNvbmQgdGh1bWIgdmFsdWUgKGVuZClcbiAgICAgKi9cbiAgICBoYW5kbGVTbGlkZXJDaGFuZ2UodGh1bWJWYWwsIHNlY29uZFRodW1iVmFsKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gcGFyc2VJbnQodGh1bWJWYWwpO1xuICAgICAgICBjb25zdCBlbmQgPSBwYXJzZUludChzZWNvbmRUaHVtYlZhbCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBzXG4gICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcENvbnRlbnQoc3RhcnQsIGVuZCk7XG5cbiAgICAgICAgLy8gRGVib3VuY2UgdGhlIGNhbGxiYWNrIHRvIGF2b2lkIHRvbyBtYW55IEFQSSBjYWxsc1xuICAgICAgICB0aGlzLmRlYm91bmNlZFdpbmRvd0NoYW5nZShzdGFydCwgZW5kKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHRpbWUgd2luZG93IHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdHJpZ2dlckNhbGxiYWNrIC0gV2hldGhlciB0byB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrXG4gICAgICovXG4gICAgc2V0VGltZVdpbmRvdyhzdGFydCwgZW5kLCB0cmlnZ2VyQ2FsbGJhY2sgPSB0cnVlKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFdpbmRvdy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLmN1cnJlbnRXaW5kb3cuZW5kID0gZW5kO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzbGlkZXIgcG9zaXRpb25cbiAgICAgICAgaWYgKHRoaXMuJHNsaWRlciAmJiB0aGlzLiRzbGlkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLiRzbGlkZXIuc2xpZGVyKCdzZXQgcmFuZ2VWYWx1ZScsIHN0YXJ0LCBlbmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBzXG4gICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcENvbnRlbnQoc3RhcnQsIGVuZCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjYWxsYmFjayBpZiByZXF1ZXN0ZWRcbiAgICAgICAgaWYgKHRyaWdnZXJDYWxsYmFjayAmJiB0aGlzLm9uV2luZG93Q2hhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLm9uV2luZG93Q2hhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lc3RhbXAgdG8gcmVhZGFibGUgZGF0ZS90aW1lIHN0cmluZyAoc2VydmVyIHRpbWUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIFVuaXggdGltZXN0YW1wXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIGRhdGUvdGltZSBzdHJpbmcgKFlZWVktTU0tREQgSEg6TU06U1MpXG4gICAgICovXG4gICAgZm9ybWF0VGltZXN0YW1wKHRpbWVzdGFtcCkge1xuICAgICAgICAvLyBQYnhEYXRlVGltZSBtaXJyb3JzIGB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0YCBvbmNlXG4gICAgICAgIC8vIFNWR1RpbWVsaW5lLnNldFNlcnZlclRpbWV6b25lT2Zmc2V0IHByb3BhZ2F0ZXMgdGhlIHZhbHVlLlxuICAgICAgICByZXR1cm4gUGJ4RGF0ZVRpbWUuZm9ybWF0U2VydmVyVGltZSh0aW1lc3RhbXAsIHsgd2l0aFNlY29uZHM6IHRydWUgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lc3RhbXAgdG8gc2hvcnQgdGltZSBzdHJpbmcgZm9yIHNsaWRlciBsYWJlbHMgKHNlcnZlciB0aW1lKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCB0aW1lIHN0cmluZyAoSEg6TU0gb3IgREQgSEg6TU0pXG4gICAgICovXG4gICAgZm9ybWF0VGltZXN0YW1wU2hvcnQodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGZ1bGwgPSBQYnhEYXRlVGltZS5mb3JtYXRTZXJ2ZXJUaW1lKHRpbWVzdGFtcCk7IC8vIFlZWVktTU0tREQgSEg6TU1cbiAgICAgICAgY29uc3QgdGltZVJhbmdlRHVyYXRpb24gPSB0aGlzLnRpbWVSYW5nZS5lbmQgLSB0aGlzLnRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgY29uc3QgZGF5ID0gZnVsbC5zbGljZSg4LCAxMCk7XG4gICAgICAgIGNvbnN0IGhobW0gPSBmdWxsLnNsaWNlKDExLCAxNik7XG5cbiAgICAgICAgaWYgKHRpbWVSYW5nZUR1cmF0aW9uID4gODY0MDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXl9ICR7aGhtbX1gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoaG1tO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWJvdW5jZWQgd2luZG93IGNoYW5nZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBkZWJvdW5jZWRXaW5kb3dDaGFuZ2Uoc3RhcnQsIGVuZCkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy5kZWJvdW5jZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5kZWJvdW5jZVRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBuZXcgdGltZXJcbiAgICAgICAgdGhpcy5kZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRXaW5kb3cuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFdpbmRvdy5lbmQgPSBlbmQ7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm9uV2luZG93Q2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbldpbmRvd0NoYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcy5kZWJvdW5jZURlbGF5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aW1lIHdpbmRvdyBjaGFuZ2VzXG4gICAgICogVGhpcyBzaG91bGQgYmUgb3ZlcnJpZGRlbiBieSB0aGUgcGFyZW50IG1vZHVsZVxuICAgICAqL1xuICAgIG9uV2luZG93Q2hhbmdlKCkge1xuICAgICAgICAvLyBUbyBiZSBvdmVycmlkZGVuIGJ5IHBhcmVudCBtb2R1bGVcbiAgICAgICAgLy8gV2lsbCByZWNlaXZlIChzdGFydCwgZW5kKSBwYXJhbWV0ZXJzIHdoZW4gY2FsbGVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgc2xpZGVyIGFuZCBjbGVhbnVwXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgaWYgKHRoaXMuJHNsaWRlciAmJiB0aGlzLiRzbGlkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLiRzbGlkZXIuc2xpZGVyKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICB0aGlzLiRzbGlkZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZGVib3VuY2VUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VUaW1lcik7XG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuJGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhpcy4kY29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIl19