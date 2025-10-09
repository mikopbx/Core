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
    var date = new Date((timestamp + this.serverTimezoneOffset) * 1000);
    var year = date.getUTCFullYear();
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var day = String(date.getUTCDate()).padStart(2, '0');
    var hours = String(date.getUTCHours()).padStart(2, '0');
    var minutes = String(date.getUTCMinutes()).padStart(2, '0');
    var seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day, " ").concat(hours, ":").concat(minutes, ":").concat(seconds);
  },

  /**
   * Format timestamp to short time string for slider labels (server time)
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted time string (HH:MM or DD HH:MM)
   */
  formatTimestampShort: function formatTimestampShort(timestamp) {
    var date = new Date((timestamp + this.serverTimezoneOffset) * 1000);
    var day = String(date.getUTCDate()).padStart(2, '0');
    var hours = String(date.getUTCHours()).padStart(2, '0');
    var minutes = String(date.getUTCMinutes()).padStart(2, '0'); // Calculate time range duration

    var timeRangeDuration = this.timeRange.end - this.timeRange.start; // If range is more than 1 day, show day + time, otherwise just time

    if (timeRangeDuration > 86400) {
      return "".concat(day, " ").concat(hours, ":").concat(minutes);
    } else {
      return "".concat(hours, ":").concat(minutes);
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXRpbWUtc2xpZGVyLmpzIl0sIm5hbWVzIjpbIlRpbWVTbGlkZXIiLCIkY29udGFpbmVyIiwiJHNsaWRlciIsInRpbWVSYW5nZSIsInNlcnZlclRpbWV6b25lT2Zmc2V0IiwiY3VycmVudFdpbmRvdyIsInN0YXJ0IiwiZW5kIiwiZGVib3VuY2VUaW1lciIsImRlYm91bmNlRGVsYXkiLCJpbml0aWFsaXplIiwiY29udGFpbmVyIiwiJCIsImNyZWF0ZVNsaWRlclN0cnVjdHVyZSIsImluaXRpYWxpemVTbGlkZXIiLCJvbmVIb3VyIiwiaW5pdGlhbFN0YXJ0IiwiTWF0aCIsIm1heCIsInNldFRpbWVXaW5kb3ciLCJodG1sIiwiZmluZCIsInNsaWRlciIsIm1pbiIsInN0ZXAiLCJvbkNoYW5nZSIsIl8iLCJ0aHVtYlZhbCIsInNlY29uZFRodW1iVmFsIiwiaGFuZGxlU2xpZGVyQ2hhbmdlIiwib25Nb3ZlIiwiaGFuZGxlU2xpZGVyTW92ZSIsImluaXRpYWxpemVUb29sdGlwcyIsImFkZFRpbWVMYWJlbHMiLCIkbGFiZWxzQ29udGFpbmVyIiwidGltZVJhbmdlRHVyYXRpb24iLCJudW1iZXJPZkxhYmVscyIsImxhYmVsU3RlcCIsImkiLCJ0aW1lc3RhbXAiLCJyb3VuZCIsInBvc2l0aW9uIiwiJGxhYmVsIiwiY3NzIiwibGVmdCIsInRleHQiLCJmb3JtYXRUaW1lc3RhbXBTaG9ydCIsImFwcGVuZCIsInVwZGF0ZVRvb2x0aXBQb3NpdGlvbnMiLCJ1cGRhdGVUb29sdGlwQ29udGVudCIsIiRzdGFydFRvb2x0aXAiLCIkZW5kVG9vbHRpcCIsIiRzdGFydFRodW1iIiwiJGVuZFRodW1iIiwibGVuZ3RoIiwic3RhcnRMZWZ0IiwiZGlzcGxheSIsImVuZExlZnQiLCJmb3JtYXRUaW1lc3RhbXAiLCJwYXJzZUludCIsImRlYm91bmNlZFdpbmRvd0NoYW5nZSIsInRyaWdnZXJDYWxsYmFjayIsIm9uV2luZG93Q2hhbmdlIiwiZGF0ZSIsIkRhdGUiLCJ5ZWFyIiwiZ2V0VVRDRnVsbFllYXIiLCJtb250aCIsIlN0cmluZyIsImdldFVUQ01vbnRoIiwicGFkU3RhcnQiLCJkYXkiLCJnZXRVVENEYXRlIiwiaG91cnMiLCJnZXRVVENIb3VycyIsIm1pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwic2Vjb25kcyIsImdldFVUQ1NlY29uZHMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiZGVzdHJveSIsImVtcHR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFMRzs7QUFPZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsSUFYTTs7QUFhZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFqQkk7O0FBbUJmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFLENBdkJQOztBQXlCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsS0FBSyxFQUFFLElBREk7QUFFWEMsSUFBQUEsR0FBRyxFQUFFO0FBRk0sR0E3QkE7O0FBa0NmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQXRDQTs7QUF3Q2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEdBNUNBOztBQThDZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBbkRlLHNCQW1ESkMsU0FuREksRUFtRE9SLFNBbkRQLEVBbURrQjtBQUM3QixTQUFLRixVQUFMLEdBQWtCVyxDQUFD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SDtBQUNKLEtBUDhCLEVBTzVCLEtBQUtFLGFBUHVCLENBQS9CO0FBUUgsR0EzVGM7O0FBNlRmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lxRCxFQUFBQSxjQWpVZSw0QkFpVUUsQ0FDYjtBQUNBO0FBQ0gsR0FwVWM7O0FBc1VmO0FBQ0o7QUFDQTtBQUNJbUIsRUFBQUEsT0F6VWUscUJBeVVMO0FBQ04sUUFBSSxLQUFLL0UsT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWFvRCxNQUFqQyxFQUF5QztBQUNyQyxXQUFLcEQsT0FBTCxDQUFhb0IsTUFBYixDQUFvQixTQUFwQjtBQUNBLFdBQUtwQixPQUFMLEdBQWUsSUFBZjtBQUNIOztBQUVELFFBQUksS0FBS00sYUFBVCxFQUF3QjtBQUNwQnVFLE1BQUFBLFlBQVksQ0FBQyxLQUFLdkUsYUFBTixDQUFaO0FBQ0EsV0FBS0EsYUFBTCxHQUFxQixJQUFyQjtBQUNIOztBQUVELFFBQUksS0FBS1AsVUFBVCxFQUFxQjtBQUNqQixXQUFLQSxVQUFMLENBQWdCaUYsS0FBaEI7QUFDSDtBQUNKO0FBdlZjLENBQW5CIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBUaW1lIHNsaWRlciBjb21wb25lbnQgZm9yIGxvZyBuYXZpZ2F0aW9uXG4gKiBQcm92aWRlcyB2aXN1YWwgdGltZSByYW5nZSBzZWxlY3Rpb24gZm9yIGxvZyB2aWV3aW5nXG4gKiBVc2VzIEZvbWFudGljIFVJIFNsaWRlciBtb2R1bGVcbiAqXG4gKiBAbW9kdWxlIFRpbWVTbGlkZXJcbiAqL1xuY29uc3QgVGltZVNsaWRlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgY29udGFpbmVyIGZvciB0aGUgc2xpZGVyXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IHNsaWRlciBlbGVtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2xpZGVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGltZSByYW5nZSBib3VuZGFyaWVzIChzdGFydCBhbmQgZW5kIHRpbWVzdGFtcHMpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB0aW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0IGluIHNlY29uZHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHNlcnZlclRpbWV6b25lT2Zmc2V0OiAwLFxuXG4gICAgLyoqXG4gICAgICogQ3VycmVudCBzZWxlY3RlZCB0aW1lIHdpbmRvd1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgY3VycmVudFdpbmRvdzoge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlYm91bmNlIHRpbWVyIGZvciBzbGlkZXIgY2hhbmdlc1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZGVib3VuY2VUaW1lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIERlYm91bmNlIGRlbGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZGVib3VuY2VEZWxheTogNTAwLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lIHNsaWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gY29udGFpbmVyIC0gQ29udGFpbmVyIHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlIC0gVGltZSByYW5nZSB3aXRoIHN0YXJ0IGFuZCBlbmQgdGltZXN0YW1wc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoY29udGFpbmVyLCB0aW1lUmFuZ2UpIHtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyID0gJChjb250YWluZXIpO1xuICAgICAgICB0aGlzLnRpbWVSYW5nZSA9IHRpbWVSYW5nZTtcblxuICAgICAgICAvLyBDcmVhdGUgc2xpZGVyIEhUTUwgc3RydWN0dXJlXG4gICAgICAgIHRoaXMuY3JlYXRlU2xpZGVyU3RydWN0dXJlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSBTbGlkZXJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2xpZGVyKCk7XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgd2luZG93IChsYXN0IGhvdXIgYnkgZGVmYXVsdClcbiAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgIGNvbnN0IGluaXRpYWxTdGFydCA9IE1hdGgubWF4KHRpbWVSYW5nZS5lbmQgLSBvbmVIb3VyLCB0aW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICB0aGlzLnNldFRpbWVXaW5kb3coaW5pdGlhbFN0YXJ0LCB0aW1lUmFuZ2UuZW5kLCBmYWxzZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBIVE1MIHN0cnVjdHVyZSBmb3IgdGhlIHNsaWRlclxuICAgICAqL1xuICAgIGNyZWF0ZVNsaWRlclN0cnVjdHVyZSgpIHtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNsaWRlci13cmFwcGVyXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHJhbmdlIHNsaWRlclwiIGlkPVwidGltZS1yYW5nZS1zbGlkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic2xpZGVyLXRvb2x0aXBzXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzbGlkZXItdG9vbHRpcCBzdGFydC10b29sdGlwXCIgaWQ9XCJzdGFydC10b29sdGlwXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzbGlkZXItdG9vbHRpcCBlbmQtdG9vbHRpcFwiIGlkPVwiZW5kLXRvb2x0aXBcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSBTbGlkZXIgY29tcG9uZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcigpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVyID0gdGhpcy4kY29udGFpbmVyLmZpbmQoJyN0aW1lLXJhbmdlLXNsaWRlcicpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9tYW50aWMgVUkgc2xpZGVyIHdpdGhvdXQgYXV0b21hdGljIGxhYmVsc1xuICAgICAgICB0aGlzLiRzbGlkZXIuc2xpZGVyKHtcbiAgICAgICAgICAgIG1pbjogdGhpcy50aW1lUmFuZ2Uuc3RhcnQsXG4gICAgICAgICAgICBtYXg6IHRoaXMudGltZVJhbmdlLmVuZCxcbiAgICAgICAgICAgIHN0YXJ0OiB0aGlzLnRpbWVSYW5nZS5zdGFydCxcbiAgICAgICAgICAgIGVuZDogdGhpcy50aW1lUmFuZ2UuZW5kLFxuICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoXywgdGh1bWJWYWwsIHNlY29uZFRodW1iVmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbGVkIHdoZW4gc2xpZGVyIHZhbHVlIGNoYW5nZXNcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNsaWRlckNoYW5nZSh0aHVtYlZhbCwgc2Vjb25kVGh1bWJWYWwpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTW92ZTogKF8sIHRodW1iVmFsLCBzZWNvbmRUaHVtYlZhbCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENhbGxlZCB3aGlsZSBkcmFnZ2luZ1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2xpZGVyTW92ZSh0aHVtYlZhbCwgc2Vjb25kVGh1bWJWYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGN1c3RvbSB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdGltZSBsYWJlbHNcbiAgICAgICAgdGhpcy5hZGRUaW1lTGFiZWxzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjdXN0b20gdGltZSBsYWJlbHMgdG8gdGhlIHNsaWRlclxuICAgICAqL1xuICAgIGFkZFRpbWVMYWJlbHMoKSB7XG4gICAgICAgIGNvbnN0ICRsYWJlbHNDb250YWluZXIgPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGNsYXNzOiAndGltZS1sYWJlbHMtY29udGFpbmVyJ1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB0aW1lUmFuZ2VEdXJhdGlvbiA9IHRoaXMudGltZVJhbmdlLmVuZCAtIHRoaXMudGltZVJhbmdlLnN0YXJ0O1xuICAgICAgICBjb25zdCBudW1iZXJPZkxhYmVscyA9IDY7IC8vIEZpeGVkIG51bWJlciBvZiBsYWJlbHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgc3RlcCBmb3IgbGFiZWxzXG4gICAgICAgIGNvbnN0IGxhYmVsU3RlcCA9IHRpbWVSYW5nZUR1cmF0aW9uIC8gKG51bWJlck9mTGFiZWxzIC0gMSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGxhYmVsc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mTGFiZWxzOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IE1hdGgucm91bmQodGhpcy50aW1lUmFuZ2Uuc3RhcnQgKyAobGFiZWxTdGVwICogaSkpO1xuICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSAoaSAvIChudW1iZXJPZkxhYmVscyAtIDEpKSAqIDEwMDsgLy8gUG9zaXRpb24gaW4gcGVyY2VudGFnZVxuXG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3RpbWUtbGFiZWwtbWFyaycsXG4gICAgICAgICAgICAgICAgY3NzOiB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGAke3Bvc2l0aW9ufSVgXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0ZXh0OiB0aGlzLmZvcm1hdFRpbWVzdGFtcFNob3J0KHRpbWVzdGFtcClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkbGFiZWxzQ29udGFpbmVyLmFwcGVuZCgkbGFiZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwZW5kIGxhYmVscyBjb250YWluZXIgdG8gc2xpZGVyIHdyYXBwZXJcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmZpbmQoJy5zbGlkZXItd3JhcHBlcicpLmFwcGVuZCgkbGFiZWxzQ29udGFpbmVyKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjdXN0b20gdG9vbHRpcHMgd2l0aCBmb3JtYXR0aW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcCBwb3NpdGlvbnMgaW5pdGlhbGx5XG4gICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcFBvc2l0aW9ucygpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgdGhpcy51cGRhdGVUb29sdGlwQ29udGVudCh0aGlzLnRpbWVSYW5nZS5zdGFydCwgdGhpcy50aW1lUmFuZ2UuZW5kKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGN1c3RvbSB0b29sdGlwIHBvc2l0aW9ucyBiYXNlZCBvbiB0aHVtYiBwb3NpdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVUb29sdGlwUG9zaXRpb25zKCkge1xuICAgICAgICBjb25zdCAkc3RhcnRUb29sdGlwID0gJCgnI3N0YXJ0LXRvb2x0aXAnKTtcbiAgICAgICAgY29uc3QgJGVuZFRvb2x0aXAgPSAkKCcjZW5kLXRvb2x0aXAnKTtcbiAgICAgICAgY29uc3QgJHN0YXJ0VGh1bWIgPSB0aGlzLiRzbGlkZXIuZmluZCgnLnRodW1iOmZpcnN0Jyk7XG4gICAgICAgIGNvbnN0ICRlbmRUaHVtYiA9IHRoaXMuJHNsaWRlci5maW5kKCcudGh1bWI6bGFzdCcpO1xuXG4gICAgICAgIGlmICgkc3RhcnRUaHVtYi5sZW5ndGggJiYgJHN0YXJ0VG9vbHRpcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0TGVmdCA9ICRzdGFydFRodW1iLnBvc2l0aW9uKCkubGVmdDtcbiAgICAgICAgICAgICRzdGFydFRvb2x0aXAuY3NzKHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBgJHtzdGFydExlZnR9cHhgLFxuICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdibG9jaydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCRlbmRUaHVtYi5sZW5ndGggJiYgJGVuZFRvb2x0aXAubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBlbmRMZWZ0ID0gJGVuZFRodW1iLnBvc2l0aW9uKCkubGVmdDtcbiAgICAgICAgICAgICRlbmRUb29sdGlwLmNzcyh7XG4gICAgICAgICAgICAgICAgbGVmdDogYCR7ZW5kTGVmdH1weGAsXG4gICAgICAgICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGN1c3RvbSB0b29sdGlwIGNvbnRlbnQgd2l0aCBmb3JtYXR0ZWQgdGltZXN0YW1wc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgdXBkYXRlVG9vbHRpcENvbnRlbnQoc3RhcnQsIGVuZCkge1xuICAgICAgICBjb25zdCAkc3RhcnRUb29sdGlwID0gJCgnI3N0YXJ0LXRvb2x0aXAnKTtcbiAgICAgICAgY29uc3QgJGVuZFRvb2x0aXAgPSAkKCcjZW5kLXRvb2x0aXAnKTtcblxuICAgICAgICBpZiAoJHN0YXJ0VG9vbHRpcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRzdGFydFRvb2x0aXAudGV4dCh0aGlzLmZvcm1hdFRpbWVzdGFtcChzdGFydCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCRlbmRUb29sdGlwLmxlbmd0aCkge1xuICAgICAgICAgICAgJGVuZFRvb2x0aXAudGV4dCh0aGlzLmZvcm1hdFRpbWVzdGFtcChlbmQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBwb3NpdGlvbnMgYWZ0ZXIgY29udGVudCBjaGFuZ2VcbiAgICAgICAgdGhpcy51cGRhdGVUb29sdGlwUG9zaXRpb25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzbGlkZXIgbW92ZSBldmVudHMgKHVwZGF0ZSB0b29sdGlwcyBpbiByZWFsLXRpbWUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRodW1iVmFsIC0gRmlyc3QgdGh1bWIgdmFsdWUgKHN0YXJ0KVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRUaHVtYlZhbCAtIFNlY29uZCB0aHVtYiB2YWx1ZSAoZW5kKVxuICAgICAqL1xuICAgIGhhbmRsZVNsaWRlck1vdmUodGh1bWJWYWwsIHNlY29uZFRodW1iVmFsKSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwcyBkdXJpbmcgc2xpZGVyIG1vdmVtZW50XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gcGFyc2VJbnQodGh1bWJWYWwpO1xuICAgICAgICBjb25zdCBlbmQgPSBwYXJzZUludChzZWNvbmRUaHVtYlZhbCk7XG4gICAgICAgIHRoaXMudXBkYXRlVG9vbHRpcENvbnRlbnQoc3RhcnQsIGVuZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzbGlkZXIgY2hhbmdlIGV2ZW50cyAoYWZ0ZXIgdXNlciBzdG9wcyBkcmFnZ2luZylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGh1bWJWYWwgLSBGaXJzdCB0aHVtYiB2YWx1ZSAoc3RhcnQpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZFRodW1iVmFsIC0gU2Vjb25kIHRodW1iIHZhbHVlIChlbmQpXG4gICAgICovXG4gICAgaGFuZGxlU2xpZGVyQ2hhbmdlKHRodW1iVmFsLCBzZWNvbmRUaHVtYlZhbCkge1xuICAgICAgICBjb25zdCBzdGFydCA9IHBhcnNlSW50KHRodW1iVmFsKTtcbiAgICAgICAgY29uc3QgZW5kID0gcGFyc2VJbnQoc2Vjb25kVGh1bWJWYWwpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwc1xuICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBDb250ZW50KHN0YXJ0LCBlbmQpO1xuXG4gICAgICAgIC8vIERlYm91bmNlIHRoZSBjYWxsYmFjayB0byBhdm9pZCB0b28gbWFueSBBUEkgY2FsbHNcbiAgICAgICAgdGhpcy5kZWJvdW5jZWRXaW5kb3dDaGFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCB0aW1lIHdpbmRvdyBwcm9ncmFtbWF0aWNhbGx5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHRyaWdnZXJDYWxsYmFjayAtIFdoZXRoZXIgdG8gdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFja1xuICAgICAqL1xuICAgIHNldFRpbWVXaW5kb3coc3RhcnQsIGVuZCwgdHJpZ2dlckNhbGxiYWNrID0gdHJ1ZSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRXaW5kb3cuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgdGhpcy5jdXJyZW50V2luZG93LmVuZCA9IGVuZDtcblxuICAgICAgICAvLyBVcGRhdGUgc2xpZGVyIHBvc2l0aW9uXG4gICAgICAgIGlmICh0aGlzLiRzbGlkZXIgJiYgdGhpcy4kc2xpZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy4kc2xpZGVyLnNsaWRlcignc2V0IHJhbmdlVmFsdWUnLCBzdGFydCwgZW5kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwc1xuICAgICAgICB0aGlzLnVwZGF0ZVRvb2x0aXBDb250ZW50KHN0YXJ0LCBlbmQpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2FsbGJhY2sgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmICh0cmlnZ2VyQ2FsbGJhY2sgJiYgdGhpcy5vbldpbmRvd0NoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5vbldpbmRvd0NoYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZXN0YW1wIHRvIHJlYWRhYmxlIGRhdGUvdGltZSBzdHJpbmcgKHNlcnZlciB0aW1lKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBkYXRlL3RpbWUgc3RyaW5nIChZWVlZLU1NLUREIEhIOk1NOlNTKVxuICAgICAqL1xuICAgIGZvcm1hdFRpbWVzdGFtcCh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCh0aW1lc3RhbXAgKyB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0KSAqIDEwMDApO1xuICAgICAgICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldFVUQ01vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXRVVENEYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IFN0cmluZyhkYXRlLmdldFVUQ01pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3Qgc2Vjb25kcyA9IFN0cmluZyhkYXRlLmdldFVUQ1NlY29uZHMoKSkucGFkU3RhcnQoMiwgJzAnKTtcblxuICAgICAgICByZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9ICR7aG91cnN9OiR7bWludXRlc306JHtzZWNvbmRzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lc3RhbXAgdG8gc2hvcnQgdGltZSBzdHJpbmcgZm9yIHNsaWRlciBsYWJlbHMgKHNlcnZlciB0aW1lKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCB0aW1lIHN0cmluZyAoSEg6TU0gb3IgREQgSEg6TU0pXG4gICAgICovXG4gICAgZm9ybWF0VGltZXN0YW1wU2hvcnQodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgodGltZXN0YW1wICsgdGhpcy5zZXJ2ZXJUaW1lem9uZU9mZnNldCkgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0VVRDRGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkYXRlLmdldFVUQ0hvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZGF0ZS5nZXRVVENNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgcmFuZ2UgZHVyYXRpb25cbiAgICAgICAgY29uc3QgdGltZVJhbmdlRHVyYXRpb24gPSB0aGlzLnRpbWVSYW5nZS5lbmQgLSB0aGlzLnRpbWVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBJZiByYW5nZSBpcyBtb3JlIHRoYW4gMSBkYXksIHNob3cgZGF5ICsgdGltZSwgb3RoZXJ3aXNlIGp1c3QgdGltZVxuICAgICAgICBpZiAodGltZVJhbmdlRHVyYXRpb24gPiA4NjQwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheX0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc31gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlYm91bmNlZCB3aW5kb3cgY2hhbmdlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIGRlYm91bmNlZFdpbmRvd0NoYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLmRlYm91bmNlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlYm91bmNlVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IG5ldyB0aW1lclxuICAgICAgICB0aGlzLmRlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFdpbmRvdy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50V2luZG93LmVuZCA9IGVuZDtcblxuICAgICAgICAgICAgaWYgKHRoaXMub25XaW5kb3dDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uV2luZG93Q2hhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzLmRlYm91bmNlRGVsYXkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRpbWUgd2luZG93IGNoYW5nZXNcbiAgICAgKiBUaGlzIHNob3VsZCBiZSBvdmVycmlkZGVuIGJ5IHRoZSBwYXJlbnQgbW9kdWxlXG4gICAgICovXG4gICAgb25XaW5kb3dDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW4gYnkgcGFyZW50IG1vZHVsZVxuICAgICAgICAvLyBXaWxsIHJlY2VpdmUgKHN0YXJ0LCBlbmQpIHBhcmFtZXRlcnMgd2hlbiBjYWxsZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBzbGlkZXIgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy4kc2xpZGVyICYmIHRoaXMuJHNsaWRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuJHNsaWRlci5zbGlkZXIoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIHRoaXMuJHNsaWRlciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5kZWJvdW5jZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5kZWJvdW5jZVRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMuZGVib3VuY2VUaW1lciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy4kY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0aGlzLiRjb250YWluZXIuZW1wdHkoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iXX0=