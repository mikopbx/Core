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
 * SVG Timeline component for log navigation
 * Grafana-style timeline with range selection
 *
 * @module SVGTimeline
 */
var SVGTimeline = {
  /**
   * Container element
   * @type {HTMLElement}
   */
  container: null,

  /**
   * SVG element
   * @type {SVGElement}
   */
  svg: null,

  /**
   * Time range boundaries
   * @type {object}
   */
  timeRange: null,

  /**
   * Server timezone offset in seconds
   * @type {number}
   */
  serverTimezoneOffset: 0,

  /**
   * Current selected range
   * @type {object}
   */
  selectedRange: {
    start: null,
    end: null
  },

  /**
   * Dimensions - compact version
   * @type {object}
   */
  dimensions: {
    width: 0,
    height: 24,
    padding: 8
  },

  /**
   * Dragging state
   * @type {object}
   */
  dragging: {
    active: false,
    handle: null,
    // 'left', 'right', 'range'
    startX: 0,
    startLeft: 0,
    startRight: 0
  },

  /**
   * Initialize timeline
   * @param {string|HTMLElement} container - Container selector or element
   * @param {object} timeRange - Time range with start and end timestamps
   */
  initialize: function initialize(container, timeRange) {
    var _this = this;

    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      console.error('Timeline container not found');
      return;
    }

    this.timeRange = timeRange;
    this.dimensions.width = this.container.offsetWidth; // Set initial selection (last hour)

    var oneHour = 3600;
    this.selectedRange.end = timeRange.end;
    this.selectedRange.start = Math.max(timeRange.end - oneHour, timeRange.start); // Create SVG structure

    this.createSVG();
    this.render();
    this.attachEvents(); // Handle window resize

    window.addEventListener('resize', function () {
      return _this.handleResize();
    });
  },

  /**
   * Calculate adaptive time step based on range duration
   * @param {number} duration - Duration in seconds
   * @returns {object} Step configuration {value, label}
   */
  calculateAdaptiveStep: function calculateAdaptiveStep(duration) {
    // Time steps in seconds with labels
    var steps = [{
      value: 300,
      label: '5 min',
      format: 'HH:MM'
    }, // 5 minutes
    {
      value: 1800,
      label: '30 min',
      format: 'HH:MM'
    }, // 30 minutes
    {
      value: 3600,
      label: '1 hour',
      format: 'HH:MM'
    }, // 1 hour
    {
      value: 43200,
      label: '12 hours',
      format: 'HH:MM'
    }, // 0.5 day
    {
      value: 86400,
      label: '1 day',
      format: 'MM-DD'
    } // 1 day
    ]; // Calculate optimal number of labels (between 4 and 16)

    var targetLabels = 8;

    for (var i = 0; i < steps.length; i++) {
      var numLabels = Math.floor(duration / steps[i].value);

      if (numLabels <= targetLabels * 2 && numLabels >= 2) {
        return steps[i];
      }
    } // For very short durations, use smallest step


    if (duration < steps[0].value * 2) {
      return steps[0];
    } // For very long durations, use largest step


    return steps[steps.length - 1];
  },

  /**
   * Create SVG element
   */
  createSVG: function createSVG() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'timeline-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', this.dimensions.height);
    this.container.innerHTML = '';
    this.container.appendChild(svg);
    this.svg = svg;
  },

  /**
   * Render timeline
   */
  render: function render() {
    if (!this.svg) return; // Clear SVG

    this.svg.innerHTML = ''; // Update width

    this.dimensions.width = this.container.offsetWidth; // Draw ticks and labels first (background layer)

    this.drawTicks(); // Draw "Now" line (middle layer)

    this.drawNowLine(); // Draw selection range last (foreground layer)

    this.drawSelection();
  },

  /**
   * Draw timeline ticks and labels
   */
  drawTicks: function drawTicks() {
    var _this$timeRange = this.timeRange,
        start = _this$timeRange.start,
        end = _this$timeRange.end;
    var duration = end - start;
    var _this$dimensions = this.dimensions,
        width = _this$dimensions.width,
        height = _this$dimensions.height,
        padding = _this$dimensions.padding;
    var availableWidth = width - padding * 2;
    console.log('drawTicks:', {
      start: start,
      end: end,
      duration: duration,
      width: width,
      availableWidth: availableWidth
    }); // Get adaptive step for this time range

    var step = this.calculateAdaptiveStep(duration);
    console.log('Adaptive step:', step); // Round start to nearest step interval

    var roundedStart = Math.floor(start / step.value) * step.value;
    console.log('roundedStart:', roundedStart); // Draw major ticks at discrete intervals

    var timestamp = roundedStart;
    var tickCount = 0;

    while (timestamp <= end) {
      if (timestamp >= start) {
        var x = padding + (timestamp - start) / duration * availableWidth; // Major tick - bottom (compact)

        this.drawTick(x, height - 6, 4, '#767676'); // Label - centered vertically (compact)

        this.drawLabel(x, height / 2 + 3, this.formatTime(timestamp));
        tickCount++;
      }

      timestamp += step.value;
    }

    console.log('Drew', tickCount, 'ticks'); // Draw minor ticks between major ones (5 per interval)

    timestamp = roundedStart;
    var minorStep = step.value / 5;

    while (timestamp <= end) {
      if (timestamp >= start) {
        var _x = padding + (timestamp - start) / duration * availableWidth; // Only draw if not a major tick position (compact)


        if ((timestamp - roundedStart) % step.value !== 0) {
          this.drawTick(_x, height - 5, 2, '#d4d4d5');
        }
      }

      timestamp += minorStep;
    }
  },

  /**
   * Draw a single tick
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} height - Tick height
   * @param {string} color - Tick color
   */
  drawTick: function drawTick(x, y, height, color) {
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y + height);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    this.svg.appendChild(line);
  },

  /**
   * Draw time label
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} text - Label text
   */
  drawLabel: function drawLabel(x, y, text) {
    // Create white background rectangle for label
    var bbox = this.getTextBBox(text);
    var padding = 3;
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', x - bbox.width / 2 - padding);
    bg.setAttribute('y', y - bbox.height + 2);
    bg.setAttribute('width', bbox.width + padding * 2);
    bg.setAttribute('height', bbox.height);
    bg.setAttribute('fill', '#fafafa');
    this.svg.appendChild(bg); // Create text label

    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'timeline-label');
    label.textContent = text;
    this.svg.appendChild(label);
  },

  /**
   * Get approximate bounding box for text
   * @param {string} text - Text content
   * @returns {object} Bounding box {width, height}
   */
  getTextBBox: function getTextBBox(text) {
    // Approximate size based on font size and character count
    var fontSize = 11;
    var charWidth = 6; // Average character width for font-size 11px

    return {
      width: text.length * charWidth,
      height: fontSize + 2
    };
  },

  /**
   * Draw selection range
   */
  drawSelection: function drawSelection() {
    var _this$timeRange2 = this.timeRange,
        start = _this$timeRange2.start,
        end = _this$timeRange2.end;
    var duration = end - start;
    var _this$dimensions2 = this.dimensions,
        width = _this$dimensions2.width,
        padding = _this$dimensions2.padding;
    var availableWidth = width - padding * 2;
    var leftPercent = (this.selectedRange.start - start) / duration * 100;
    var rightPercent = (this.selectedRange.end - start) / duration * 100;
    var widthPercent = rightPercent - leftPercent;
    var x = padding + leftPercent / 100 * availableWidth;
    var w = widthPercent / 100 * availableWidth; // Selection background

    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', w);
    rect.setAttribute('height', this.dimensions.height);
    rect.setAttribute('class', 'timeline-selection');
    rect.setAttribute('data-handle', 'range');
    this.svg.appendChild(rect); // Left handle

    this.drawHandle(x, 'left'); // Right handle

    this.drawHandle(x + w, 'right');
  },

  /**
   * Draw selection handle
   * @param {number} x - X position
   * @param {string} position - 'left' or 'right'
   */
  drawHandle: function drawHandle(x, position) {
    var handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle.setAttribute('x', x - 3);
    handle.setAttribute('y', 0);
    handle.setAttribute('width', 6);
    handle.setAttribute('height', this.dimensions.height);
    handle.setAttribute('class', 'timeline-handle');
    handle.setAttribute('data-handle', position);
    this.svg.appendChild(handle);
  },

  /**
   * Draw "Now" line
   */
  drawNowLine: function drawNowLine() {
    var _this$timeRange3 = this.timeRange,
        start = _this$timeRange3.start,
        end = _this$timeRange3.end;
    var now = Math.floor(Date.now() / 1000);
    if (now < start || now > end) return;
    var duration = end - start;
    var _this$dimensions3 = this.dimensions,
        width = _this$dimensions3.width,
        padding = _this$dimensions3.padding;
    var availableWidth = width - padding * 2;
    var x = padding + (now - start) / duration * availableWidth;
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', this.dimensions.height);
    line.setAttribute('class', 'timeline-now');
    this.svg.appendChild(line);
  },

  /**
   * Format timestamp to time string (server time)
   * @param {number} timestamp - Unix timestamp in UTC
   * @returns {string} Formatted time (HH:MM) in server timezone
   */
  formatTime: function formatTime(timestamp) {
    // Create date from UTC timestamp, then add server offset to get milliseconds
    // serverTimezoneOffset is in seconds, timestamp is in seconds
    var serverTimeMs = (timestamp + this.serverTimezoneOffset) * 1000;
    var date = new Date(serverTimeMs); // Use getUTCHours/Minutes because we've already adjusted the timestamp

    var hours = String(date.getUTCHours()).padStart(2, '0');
    var minutes = String(date.getUTCMinutes()).padStart(2, '0'); // Debug for first call

    if (!this._debugLogged) {
      console.log('formatTime debug:', {
        originalTimestamp: timestamp,
        serverOffsetSeconds: this.serverTimezoneOffset,
        serverOffsetHours: this.serverTimezoneOffset / 3600,
        serverTimeMs: serverTimeMs,
        formatted: "".concat(hours, ":").concat(minutes),
        dateUTC: new Date(timestamp * 1000).toISOString(),
        dateServer: date.toISOString()
      });
      this._debugLogged = true;
    }

    return "".concat(hours, ":").concat(minutes);
  },

  /**
   * Attach mouse events
   */
  attachEvents: function attachEvents() {
    var _this2 = this;

    this.svg.addEventListener('mousedown', function (e) {
      return _this2.handleMouseDown(e);
    });
    document.addEventListener('mousemove', function (e) {
      return _this2.handleMouseMove(e);
    });
    document.addEventListener('mouseup', function () {
      return _this2.handleMouseUp();
    });
  },

  /**
   * Handle mouse down
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown: function handleMouseDown(e) {
    var target = e.target;
    var handle = target.getAttribute('data-handle');
    if (!handle) return;
    this.dragging.active = true;
    this.dragging.handle = handle;
    this.dragging.startX = e.clientX;
    var rect = this.container.getBoundingClientRect();
    this.dragging.containerLeft = rect.left;
    this.dragging.containerWidth = rect.width;
    e.preventDefault();
  },

  /**
   * Handle mouse move
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove: function handleMouseMove(e) {
    if (!this.dragging.active) return;
    var deltaX = e.clientX - this.dragging.startX;
    var padding = this.dimensions.padding;
    var availableWidth = this.dragging.containerWidth - padding * 2;
    var duration = this.timeRange.end - this.timeRange.start;
    var deltaTime = deltaX / availableWidth * duration;

    if (this.dragging.handle === 'left') {
      var newStart = this.selectedRange.start + deltaTime;
      newStart = Math.max(this.timeRange.start, Math.min(newStart, this.selectedRange.end - 60));
      this.selectedRange.start = newStart;
    } else if (this.dragging.handle === 'right') {
      var newEnd = this.selectedRange.end + deltaTime;
      newEnd = Math.min(this.timeRange.end, Math.max(newEnd, this.selectedRange.start + 60));
      this.selectedRange.end = newEnd;
    } else if (this.dragging.handle === 'range') {
      var rangeWidth = this.selectedRange.end - this.selectedRange.start;

      var _newStart = this.selectedRange.start + deltaTime;

      var _newEnd = this.selectedRange.end + deltaTime;

      if (_newStart < this.timeRange.start) {
        _newStart = this.timeRange.start;
        _newEnd = _newStart + rangeWidth;
      } else if (_newEnd > this.timeRange.end) {
        _newEnd = this.timeRange.end;
        _newStart = _newEnd - rangeWidth;
      }

      this.selectedRange.start = _newStart;
      this.selectedRange.end = _newEnd;
    }

    this.dragging.startX = e.clientX;
    this.render();
  },

  /**
   * Handle mouse up
   */
  handleMouseUp: function handleMouseUp() {
    if (this.dragging.active) {
      this.dragging.active = false;
      this.dragging.handle = null; // Trigger callback

      if (this.onRangeChange) {
        this.onRangeChange(Math.round(this.selectedRange.start), Math.round(this.selectedRange.end));
      }
    }
  },

  /**
   * Handle window resize
   */
  handleResize: function handleResize() {
    this.render();
  },

  /**
   * Set selected range
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   */
  setRange: function setRange(start, end) {
    this.selectedRange.start = start;
    this.selectedRange.end = end;
    this.render();
  },

  /**
   * Update selected range to actual loaded data (without triggering onRangeChange)
   * Used when backend returns different range due to 5000 line limit
   * @param {number} start - Actual start timestamp
   * @param {number} end - Actual end timestamp
   */
  updateSelectedRange: function updateSelectedRange(start, end) {
    this.selectedRange.start = start;
    this.selectedRange.end = end;
    this.render(); // Note: Does NOT trigger onRangeChange callback
  },

  /**
   * Callback when range changes
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   */
  onRangeChange: function onRangeChange(start, end) {// To be overridden
  },

  /**
   * Destroy timeline
   */
  destroy: function destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXN2Zy10aW1lbGluZS5qcyJdLCJuYW1lcyI6WyJTVkdUaW1lbGluZSIsImNvbnRhaW5lciIsInN2ZyIsInRpbWVSYW5nZSIsInNlcnZlclRpbWV6b25lT2Zmc2V0Iiwic2VsZWN0ZWRSYW5nZSIsInN0YXJ0IiwiZW5kIiwiZGltZW5zaW9ucyIsIndpZHRoIiwiaGVpZ2h0IiwicGFkZGluZyIsImRyYWdnaW5nIiwiYWN0aXZlIiwiaGFuZGxlIiwic3RhcnRYIiwic3RhcnRMZWZ0Iiwic3RhcnRSaWdodCIsImluaXRpYWxpemUiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJjb25zb2xlIiwiZXJyb3IiLCJvZmZzZXRXaWR0aCIsIm9uZUhvdXIiLCJNYXRoIiwibWF4IiwiY3JlYXRlU1ZHIiwicmVuZGVyIiwiYXR0YWNoRXZlbnRzIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImhhbmRsZVJlc2l6ZSIsImNhbGN1bGF0ZUFkYXB0aXZlU3RlcCIsImR1cmF0aW9uIiwic3RlcHMiLCJ2YWx1ZSIsImxhYmVsIiwiZm9ybWF0IiwidGFyZ2V0TGFiZWxzIiwiaSIsImxlbmd0aCIsIm51bUxhYmVscyIsImZsb29yIiwiY3JlYXRlRWxlbWVudE5TIiwic2V0QXR0cmlidXRlIiwiaW5uZXJIVE1MIiwiYXBwZW5kQ2hpbGQiLCJkcmF3VGlja3MiLCJkcmF3Tm93TGluZSIsImRyYXdTZWxlY3Rpb24iLCJhdmFpbGFibGVXaWR0aCIsImxvZyIsInN0ZXAiLCJyb3VuZGVkU3RhcnQiLCJ0aW1lc3RhbXAiLCJ0aWNrQ291bnQiLCJ4IiwiZHJhd1RpY2siLCJkcmF3TGFiZWwiLCJmb3JtYXRUaW1lIiwibWlub3JTdGVwIiwieSIsImNvbG9yIiwibGluZSIsInRleHQiLCJiYm94IiwiZ2V0VGV4dEJCb3giLCJiZyIsInRleHRDb250ZW50IiwiZm9udFNpemUiLCJjaGFyV2lkdGgiLCJsZWZ0UGVyY2VudCIsInJpZ2h0UGVyY2VudCIsIndpZHRoUGVyY2VudCIsInciLCJyZWN0IiwiZHJhd0hhbmRsZSIsInBvc2l0aW9uIiwibm93IiwiRGF0ZSIsInNlcnZlclRpbWVNcyIsImRhdGUiLCJob3VycyIsIlN0cmluZyIsImdldFVUQ0hvdXJzIiwicGFkU3RhcnQiLCJtaW51dGVzIiwiZ2V0VVRDTWludXRlcyIsIl9kZWJ1Z0xvZ2dlZCIsIm9yaWdpbmFsVGltZXN0YW1wIiwic2VydmVyT2Zmc2V0U2Vjb25kcyIsInNlcnZlck9mZnNldEhvdXJzIiwiZm9ybWF0dGVkIiwiZGF0ZVVUQyIsInRvSVNPU3RyaW5nIiwiZGF0ZVNlcnZlciIsImUiLCJoYW5kbGVNb3VzZURvd24iLCJoYW5kbGVNb3VzZU1vdmUiLCJoYW5kbGVNb3VzZVVwIiwidGFyZ2V0IiwiZ2V0QXR0cmlidXRlIiwiY2xpZW50WCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNvbnRhaW5lckxlZnQiLCJsZWZ0IiwiY29udGFpbmVyV2lkdGgiLCJwcmV2ZW50RGVmYXVsdCIsImRlbHRhWCIsImRlbHRhVGltZSIsIm5ld1N0YXJ0IiwibWluIiwibmV3RW5kIiwicmFuZ2VXaWR0aCIsIm9uUmFuZ2VDaGFuZ2UiLCJyb3VuZCIsInNldFJhbmdlIiwidXBkYXRlU2VsZWN0ZWRSYW5nZSIsImRlc3Ryb3kiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBTEs7O0FBT2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEdBQUcsRUFBRSxJQVhXOztBQWFoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFq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OUIsQ0FESixFQUVJbUIsSUFBSSxDQUFDMkYsS0FBTCxDQUFXLEtBQUsvRyxhQUFMLENBQW1CRSxHQUE5QixDQUZKO0FBSUg7QUFDSjtBQUNKLEdBbmRlOztBQXFkaEI7QUFDSjtBQUNBO0FBQ0l5QixFQUFBQSxZQXhkZ0IsMEJBd2REO0FBQ1gsU0FBS0osTUFBTDtBQUNILEdBMWRlOztBQTRkaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJeUYsRUFBQUEsUUFqZWdCLG9CQWllUC9HLEtBamVPLEVBaWVBQyxHQWplQSxFQWllSztBQUNqQixTQUFLRixhQUFMLENBQW1CQyxLQUFuQixHQUEyQkEsS0FBM0I7QUFDQSxTQUFLRCxhQUFMLENBQW1CRSxHQUFuQixHQUF5QkEsR0FBekI7QUFDQSxTQUFLcUIsTUFBTDtBQUNILEdBcmVlOztBQXVlaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0kwRixFQUFBQSxtQkE3ZWdCLCtCQTZlSWhILEtBN2VKLEVBNmVXQyxHQTdlWCxFQTZlZ0I7QUFDNUIsU0FBS0YsYUFBTCxDQUFtQkMsS0FBbkIsR0FBMkJBLEtBQTNCO0FBQ0EsU0FBS0QsYUFBTCxDQUFtQkUsR0FBbkIsR0FBeUJBLEdBQXpCO0FBQ0EsU0FBS3FCLE1BQUwsR0FINEIsQ0FJNUI7QUFDSCxHQWxmZTs7QUFvZmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXVGLEVBQUFBLGFBemZnQix5QkF5ZkY3RyxLQXpmRSxFQXlmS0MsR0F6ZkwsRUF5ZlUsQ0FDdEI7QUFDSCxHQTNmZTs7QUE2ZmhCO0FBQ0o7QUFDQTtBQUNJZ0gsRUFBQUEsT0FoZ0JnQixxQkFnZ0JOO0FBQ04sUUFBSSxLQUFLdEgsU0FBVCxFQUFvQjtBQUNoQixXQUFLQSxTQUFMLENBQWU2QyxTQUFmLEdBQTJCLEVBQTNCO0FBQ0g7QUFDSjtBQXBnQmUsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIFNWRyBUaW1lbGluZSBjb21wb25lbnQgZm9yIGxvZyBuYXZpZ2F0aW9uXG4gKiBHcmFmYW5hLXN0eWxlIHRpbWVsaW5lIHdpdGggcmFuZ2Ugc2VsZWN0aW9uXG4gKlxuICogQG1vZHVsZSBTVkdUaW1lbGluZVxuICovXG5jb25zdCBTVkdUaW1lbGluZSA9IHtcbiAgICAvKipcbiAgICAgKiBDb250YWluZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBjb250YWluZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTVkcgZWxlbWVudFxuICAgICAqIEB0eXBlIHtTVkdFbGVtZW50fVxuICAgICAqL1xuICAgIHN2ZzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRpbWUgcmFuZ2UgYm91bmRhcmllc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdGltZVJhbmdlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VydmVyIHRpbWV6b25lIG9mZnNldCBpbiBzZWNvbmRzXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBzZXJ2ZXJUaW1lem9uZU9mZnNldDogMCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgc2VsZWN0ZWQgcmFuZ2VcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNlbGVjdGVkUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaW1lbnNpb25zIC0gY29tcGFjdCB2ZXJzaW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkaW1lbnNpb25zOiB7XG4gICAgICAgIHdpZHRoOiAwLFxuICAgICAgICBoZWlnaHQ6IDI0LFxuICAgICAgICBwYWRkaW5nOiA4XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYWdnaW5nIHN0YXRlXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkcmFnZ2luZzoge1xuICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICBoYW5kbGU6IG51bGwsIC8vICdsZWZ0JywgJ3JpZ2h0JywgJ3JhbmdlJ1xuICAgICAgICBzdGFydFg6IDAsXG4gICAgICAgIHN0YXJ0TGVmdDogMCxcbiAgICAgICAgc3RhcnRSaWdodDogMFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVsaW5lXG4gICAgICogQHBhcmFtIHtzdHJpbmd8SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBzZWxlY3RvciBvciBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZSAtIFRpbWUgcmFuZ2Ugd2l0aCBzdGFydCBhbmQgZW5kIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKGNvbnRhaW5lciwgdGltZVJhbmdlKSB7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihjb250YWluZXIpXG4gICAgICAgICAgICA6IGNvbnRhaW5lcjtcblxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUaW1lbGluZSBjb250YWluZXIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRpbWVSYW5nZSA9IHRpbWVSYW5nZTtcbiAgICAgICAgdGhpcy5kaW1lbnNpb25zLndpZHRoID0gdGhpcy5jb250YWluZXIub2Zmc2V0V2lkdGg7XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgc2VsZWN0aW9uIChsYXN0IGhvdXIpXG4gICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gdGltZVJhbmdlLmVuZDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gTWF0aC5tYXgodGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRpbWVSYW5nZS5zdGFydCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIFNWRyBzdHJ1Y3R1cmVcbiAgICAgICAgdGhpcy5jcmVhdGVTVkcoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5hdHRhY2hFdmVudHMoKTtcblxuICAgICAgICAvLyBIYW5kbGUgd2luZG93IHJlc2l6ZVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5oYW5kbGVSZXNpemUoKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBhZGFwdGl2ZSB0aW1lIHN0ZXAgYmFzZWQgb24gcmFuZ2UgZHVyYXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gLSBEdXJhdGlvbiBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge29iamVjdH0gU3RlcCBjb25maWd1cmF0aW9uIHt2YWx1ZSwgbGFiZWx9XG4gICAgICovXG4gICAgY2FsY3VsYXRlQWRhcHRpdmVTdGVwKGR1cmF0aW9uKSB7XG4gICAgICAgIC8vIFRpbWUgc3RlcHMgaW4gc2Vjb25kcyB3aXRoIGxhYmVsc1xuICAgICAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6IDMwMCwgbGFiZWw6ICc1IG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAgLy8gNSBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiAxODAwLCBsYWJlbDogJzMwIG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgIC8vIDMwIG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDM2MDAsIGxhYmVsOiAnMSBob3VyJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgLy8gMSBob3VyXG4gICAgICAgICAgICB7IHZhbHVlOiA0MzIwMCwgbGFiZWw6ICcxMiBob3VycycsIGZvcm1hdDogJ0hIOk1NJyB9LCAgIC8vIDAuNSBkYXlcbiAgICAgICAgICAgIHsgdmFsdWU6IDg2NDAwLCBsYWJlbDogJzEgZGF5JywgZm9ybWF0OiAnTU0tREQnIH0gICAgICAgLy8gMSBkYXlcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgb3B0aW1hbCBudW1iZXIgb2YgbGFiZWxzIChiZXR3ZWVuIDQgYW5kIDE2KVxuICAgICAgICBjb25zdCB0YXJnZXRMYWJlbHMgPSA4O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG51bUxhYmVscyA9IE1hdGguZmxvb3IoZHVyYXRpb24gLyBzdGVwc1tpXS52YWx1ZSk7XG4gICAgICAgICAgICBpZiAobnVtTGFiZWxzIDw9IHRhcmdldExhYmVscyAqIDIgJiYgbnVtTGFiZWxzID49IDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RlcHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgdmVyeSBzaG9ydCBkdXJhdGlvbnMsIHVzZSBzbWFsbGVzdCBzdGVwXG4gICAgICAgIGlmIChkdXJhdGlvbiA8IHN0ZXBzWzBdLnZhbHVlICogMikge1xuICAgICAgICAgICAgcmV0dXJuIHN0ZXBzWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIHZlcnkgbG9uZyBkdXJhdGlvbnMsIHVzZSBsYXJnZXN0IHN0ZXBcbiAgICAgICAgcmV0dXJuIHN0ZXBzW3N0ZXBzLmxlbmd0aCAtIDFdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgU1ZHIGVsZW1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVTVkcoKSB7XG4gICAgICAgIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLXN2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHRoaXMuZGltZW5zaW9ucy5oZWlnaHQpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChzdmcpO1xuICAgICAgICB0aGlzLnN2ZyA9IHN2ZztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRpbWVsaW5lXG4gICAgICovXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuc3ZnKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ2xlYXIgU1ZHXG4gICAgICAgIHRoaXMuc3ZnLmlubmVySFRNTCA9ICcnO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB3aWR0aFxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMud2lkdGggPSB0aGlzLmNvbnRhaW5lci5vZmZzZXRXaWR0aDtcblxuICAgICAgICAvLyBEcmF3IHRpY2tzIGFuZCBsYWJlbHMgZmlyc3QgKGJhY2tncm91bmQgbGF5ZXIpXG4gICAgICAgIHRoaXMuZHJhd1RpY2tzKCk7XG5cbiAgICAgICAgLy8gRHJhdyBcIk5vd1wiIGxpbmUgKG1pZGRsZSBsYXllcilcbiAgICAgICAgdGhpcy5kcmF3Tm93TGluZSgpO1xuXG4gICAgICAgIC8vIERyYXcgc2VsZWN0aW9uIHJhbmdlIGxhc3QgKGZvcmVncm91bmQgbGF5ZXIpXG4gICAgICAgIHRoaXMuZHJhd1NlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHRpbWVsaW5lIHRpY2tzIGFuZCBsYWJlbHNcbiAgICAgKi9cbiAgICBkcmF3VGlja3MoKSB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gdGhpcy50aW1lUmFuZ2U7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZW5kIC0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnZHJhd1RpY2tzOicsIHsgc3RhcnQsIGVuZCwgZHVyYXRpb24sIHdpZHRoLCBhdmFpbGFibGVXaWR0aCB9KTtcblxuICAgICAgICAvLyBHZXQgYWRhcHRpdmUgc3RlcCBmb3IgdGhpcyB0aW1lIHJhbmdlXG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLmNhbGN1bGF0ZUFkYXB0aXZlU3RlcChkdXJhdGlvbik7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBZGFwdGl2ZSBzdGVwOicsIHN0ZXApO1xuXG4gICAgICAgIC8vIFJvdW5kIHN0YXJ0IHRvIG5lYXJlc3Qgc3RlcCBpbnRlcnZhbFxuICAgICAgICBjb25zdCByb3VuZGVkU3RhcnQgPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcC52YWx1ZSkgKiBzdGVwLnZhbHVlO1xuICAgICAgICBjb25zb2xlLmxvZygncm91bmRlZFN0YXJ0OicsIHJvdW5kZWRTdGFydCk7XG5cbiAgICAgICAgLy8gRHJhdyBtYWpvciB0aWNrcyBhdCBkaXNjcmV0ZSBpbnRlcnZhbHNcbiAgICAgICAgbGV0IHRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgbGV0IHRpY2tDb3VudCA9IDA7XG4gICAgICAgIHdoaWxlICh0aW1lc3RhbXAgPD0gZW5kKSB7XG4gICAgICAgICAgICBpZiAodGltZXN0YW1wID49IHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAoKHRpbWVzdGFtcCAtIHN0YXJ0KSAvIGR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFqb3IgdGljayAtIGJvdHRvbSAoY29tcGFjdClcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDYsIDQsICcjNzY3Njc2Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbCAtIGNlbnRlcmVkIHZlcnRpY2FsbHkgKGNvbXBhY3QpXG4gICAgICAgICAgICAgICAgdGhpcy5kcmF3TGFiZWwoeCwgaGVpZ2h0IC8gMiArIDMsIHRoaXMuZm9ybWF0VGltZSh0aW1lc3RhbXApKTtcbiAgICAgICAgICAgICAgICB0aWNrQ291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRpbWVzdGFtcCArPSBzdGVwLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdEcmV3JywgdGlja0NvdW50LCAndGlja3MnKTtcblxuICAgICAgICAvLyBEcmF3IG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3Igb25lcyAoNSBwZXIgaW50ZXJ2YWwpXG4gICAgICAgIHRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgY29uc3QgbWlub3JTdGVwID0gc3RlcC52YWx1ZSAvIDU7XG4gICAgICAgIHdoaWxlICh0aW1lc3RhbXAgPD0gZW5kKSB7XG4gICAgICAgICAgICBpZiAodGltZXN0YW1wID49IHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAoKHRpbWVzdGFtcCAtIHN0YXJ0KSAvIGR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy8gT25seSBkcmF3IGlmIG5vdCBhIG1ham9yIHRpY2sgcG9zaXRpb24gKGNvbXBhY3QpXG4gICAgICAgICAgICAgICAgaWYgKCh0aW1lc3RhbXAgLSByb3VuZGVkU3RhcnQpICUgc3RlcC52YWx1ZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDUsIDIsICcjZDRkNGQ1Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXN0YW1wICs9IG1pbm9yU3RlcDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgc2luZ2xlIHRpY2tcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0geSAtIFkgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGljayBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3IgLSBUaWNrIGNvbG9yXG4gICAgICovXG4gICAgZHJhd1RpY2soeCwgeSwgaGVpZ2h0LCBjb2xvcikge1xuICAgICAgICBjb25zdCBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTEnLCB5KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkgKyBoZWlnaHQpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywgY29sb3IpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZSBsYWJlbFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gWSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gTGFiZWwgdGV4dFxuICAgICAqL1xuICAgIGRyYXdMYWJlbCh4LCB5LCB0ZXh0KSB7XG4gICAgICAgIC8vIENyZWF0ZSB3aGl0ZSBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3IgbGFiZWxcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0VGV4dEJCb3godGV4dCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSAzO1xuXG4gICAgICAgIGNvbnN0IGJnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneCcsIHggLSAoYmJveC53aWR0aCAvIDIpIC0gcGFkZGluZyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneScsIHkgLSBiYm94LmhlaWdodCArIDIpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgYmJveC53aWR0aCArIChwYWRkaW5nICogMikpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCdmaWxsJywgJyNmYWZhZmEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQoYmcpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZXh0IGxhYmVsXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICd0ZXh0Jyk7XG4gICAgICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1sYWJlbCcpO1xuICAgICAgICBsYWJlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHRoaXMuc3ZnLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJveGltYXRlIGJvdW5kaW5nIGJveCBmb3IgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCBjb250ZW50XG4gICAgICogQHJldHVybnMge29iamVjdH0gQm91bmRpbmcgYm94IHt3aWR0aCwgaGVpZ2h0fVxuICAgICAqL1xuICAgIGdldFRleHRCQm94KHRleHQpIHtcbiAgICAgICAgLy8gQXBwcm94aW1hdGUgc2l6ZSBiYXNlZCBvbiBmb250IHNpemUgYW5kIGNoYXJhY3RlciBjb3VudFxuICAgICAgICBjb25zdCBmb250U2l6ZSA9IDExO1xuICAgICAgICBjb25zdCBjaGFyV2lkdGggPSA2OyAvLyBBdmVyYWdlIGNoYXJhY3RlciB3aWR0aCBmb3IgZm9udC1zaXplIDExcHhcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiB0ZXh0Lmxlbmd0aCAqIGNoYXJXaWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogZm9udFNpemUgKyAyXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgc2VsZWN0aW9uIHJhbmdlXG4gICAgICovXG4gICAgZHJhd1NlbGVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSB0aGlzLnRpbWVSYW5nZTtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICBjb25zdCBsZWZ0UGVyY2VudCA9ICgodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0IC0gc3RhcnQpIC8gZHVyYXRpb24pICogMTAwO1xuICAgICAgICBjb25zdCByaWdodFBlcmNlbnQgPSAoKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSBzdGFydCkgLyBkdXJhdGlvbikgKiAxMDA7XG4gICAgICAgIGNvbnN0IHdpZHRoUGVyY2VudCA9IHJpZ2h0UGVyY2VudCAtIGxlZnRQZXJjZW50O1xuXG4gICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKGxlZnRQZXJjZW50IC8gMTAwKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICBjb25zdCB3ID0gKHdpZHRoUGVyY2VudCAvIDEwMCkgKiBhdmFpbGFibGVXaWR0aDtcblxuICAgICAgICAvLyBTZWxlY3Rpb24gYmFja2dyb3VuZFxuICAgICAgICBjb25zdCByZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1zZWxlY3Rpb24nKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJywgJ3JhbmdlJyk7XG4gICAgICAgIHRoaXMuc3ZnLmFwcGVuZENoaWxkKHJlY3QpO1xuXG4gICAgICAgIC8vIExlZnQgaGFuZGxlXG4gICAgICAgIHRoaXMuZHJhd0hhbmRsZSh4LCAnbGVmdCcpO1xuXG4gICAgICAgIC8vIFJpZ2h0IGhhbmRsZVxuICAgICAgICB0aGlzLmRyYXdIYW5kbGUoeCArIHcsICdyaWdodCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHNlbGVjdGlvbiBoYW5kbGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcG9zaXRpb24gLSAnbGVmdCcgb3IgJ3JpZ2h0J1xuICAgICAqL1xuICAgIGRyYXdIYW5kbGUoeCwgcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3gnLCB4IC0gMyk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCA2KTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWhhbmRsZScpO1xuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCdkYXRhLWhhbmRsZScsIHBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQoaGFuZGxlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBcIk5vd1wiIGxpbmVcbiAgICAgKi9cbiAgICBkcmF3Tm93TGluZSgpIHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSB0aGlzLnRpbWVSYW5nZTtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG5cbiAgICAgICAgaWYgKG5vdyA8IHN0YXJ0IHx8IG5vdyA+IGVuZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZW5kIC0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIHBhZGRpbmcgfSA9IHRoaXMuZGltZW5zaW9ucztcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSB3aWR0aCAtIChwYWRkaW5nICogMik7XG5cbiAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAoKG5vdyAtIHN0YXJ0KSAvIGR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuXG4gICAgICAgIGNvbnN0IGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIDApO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneDInLCB4KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1ub3cnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lc3RhbXAgdG8gdGltZSBzdHJpbmcgKHNlcnZlciB0aW1lKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcCBpbiBVVENcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgdGltZSAoSEg6TU0pIGluIHNlcnZlciB0aW1lem9uZVxuICAgICAqL1xuICAgIGZvcm1hdFRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIC8vIENyZWF0ZSBkYXRlIGZyb20gVVRDIHRpbWVzdGFtcCwgdGhlbiBhZGQgc2VydmVyIG9mZnNldCB0byBnZXQgbWlsbGlzZWNvbmRzXG4gICAgICAgIC8vIHNlcnZlclRpbWV6b25lT2Zmc2V0IGlzIGluIHNlY29uZHMsIHRpbWVzdGFtcCBpcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlcnZlclRpbWVNcyA9ICh0aW1lc3RhbXAgKyB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0KSAqIDEwMDA7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShzZXJ2ZXJUaW1lTXMpO1xuXG4gICAgICAgIC8vIFVzZSBnZXRVVENIb3Vycy9NaW51dGVzIGJlY2F1c2Ugd2UndmUgYWxyZWFkeSBhZGp1c3RlZCB0aGUgdGltZXN0YW1wXG4gICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IFN0cmluZyhkYXRlLmdldFVUQ01pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcblxuICAgICAgICAvLyBEZWJ1ZyBmb3IgZmlyc3QgY2FsbFxuICAgICAgICBpZiAoIXRoaXMuX2RlYnVnTG9nZ2VkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZm9ybWF0VGltZSBkZWJ1ZzonLCB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxUaW1lc3RhbXA6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgICAgICBzZXJ2ZXJPZmZzZXRTZWNvbmRzOiB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0LFxuICAgICAgICAgICAgICAgIHNlcnZlck9mZnNldEhvdXJzOiB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0IC8gMzYwMCxcbiAgICAgICAgICAgICAgICBzZXJ2ZXJUaW1lTXM6IHNlcnZlclRpbWVNcyxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWQ6IGAke2hvdXJzfToke21pbnV0ZXN9YCxcbiAgICAgICAgICAgICAgICBkYXRlVVRDOiBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIGRhdGVTZXJ2ZXI6IGRhdGUudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLl9kZWJ1Z0xvZ2dlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggbW91c2UgZXZlbnRzXG4gICAgICovXG4gICAgYXR0YWNoRXZlbnRzKCkge1xuICAgICAgICB0aGlzLnN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCAoZSkgPT4gdGhpcy5oYW5kbGVNb3VzZURvd24oZSkpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4gdGhpcy5oYW5kbGVNb3VzZU1vdmUoZSkpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKCkgPT4gdGhpcy5oYW5kbGVNb3VzZVVwKCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgZG93blxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlTW91c2VEb3duKGUpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICAgIGNvbnN0IGhhbmRsZSA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJyk7XG5cbiAgICAgICAgaWYgKCFoYW5kbGUpIHJldHVybjtcblxuICAgICAgICB0aGlzLmRyYWdnaW5nLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gaGFuZGxlO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLnN0YXJ0WCA9IGUuY2xpZW50WDtcblxuICAgICAgICBjb25zdCByZWN0ID0gdGhpcy5jb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyTGVmdCA9IHJlY3QubGVmdDtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5jb250YWluZXJXaWR0aCA9IHJlY3Qud2lkdGg7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgbW92ZVxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlTW91c2VNb3ZlKGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nLmFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGRlbHRhWCA9IGUuY2xpZW50WCAtIHRoaXMuZHJhZ2dpbmcuc3RhcnRYO1xuICAgICAgICBjb25zdCB7IHBhZGRpbmcgfSA9IHRoaXMuZGltZW5zaW9ucztcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSB0aGlzLmRyYWdnaW5nLmNvbnRhaW5lcldpZHRoIC0gKHBhZGRpbmcgKiAyKTtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLnRpbWVSYW5nZS5lbmQgLSB0aGlzLnRpbWVSYW5nZS5zdGFydDtcblxuICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSAoZGVsdGFYIC8gYXZhaWxhYmxlV2lkdGgpICogZHVyYXRpb247XG5cbiAgICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgIGxldCBuZXdTdGFydCA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIG5ld1N0YXJ0ID0gTWF0aC5tYXgodGhpcy50aW1lUmFuZ2Uuc3RhcnQsIE1hdGgubWluKG5ld1N0YXJ0LCB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gNjApKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IG5ld1N0YXJ0O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICBsZXQgbmV3RW5kID0gdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIG5ld0VuZCA9IE1hdGgubWluKHRoaXMudGltZVJhbmdlLmVuZCwgTWF0aC5tYXgobmV3RW5kLCB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgKyA2MCkpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IG5ld0VuZDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VXaWR0aCA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICBsZXQgbmV3U3RhcnQgPSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICBsZXQgbmV3RW5kID0gdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCArIGRlbHRhVGltZTtcblxuICAgICAgICAgICAgaWYgKG5ld1N0YXJ0IDwgdGhpcy50aW1lUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICBuZXdTdGFydCA9IHRoaXMudGltZVJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgICAgIG5ld0VuZCA9IG5ld1N0YXJ0ICsgcmFuZ2VXaWR0aDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmV3RW5kID4gdGhpcy50aW1lUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICAgICAgbmV3RW5kID0gdGhpcy50aW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgIG5ld1N0YXJ0ID0gbmV3RW5kIC0gcmFuZ2VXaWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gbmV3U3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gbmV3RW5kO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kcmFnZ2luZy5zdGFydFggPSBlLmNsaWVudFg7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBtb3VzZSB1cFxuICAgICAqL1xuICAgIGhhbmRsZU1vdXNlVXAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRyYWdnaW5nLmFjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5kcmFnZ2luZy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKHRoaXMub25SYW5nZUNoYW5nZSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25SYW5nZUNoYW5nZShcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQpLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgd2luZG93IHJlc2l6ZVxuICAgICAqL1xuICAgIGhhbmRsZVJlc2l6ZSgpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHNlbGVjdGVkIHJhbmdlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBzZXRSYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gZW5kO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc2VsZWN0ZWQgcmFuZ2UgdG8gYWN0dWFsIGxvYWRlZCBkYXRhICh3aXRob3V0IHRyaWdnZXJpbmcgb25SYW5nZUNoYW5nZSlcbiAgICAgKiBVc2VkIHdoZW4gYmFja2VuZCByZXR1cm5zIGRpZmZlcmVudCByYW5nZSBkdWUgdG8gNTAwMCBsaW5lIGxpbWl0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gQWN0dWFsIHN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBBY3R1YWwgZW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIHVwZGF0ZVNlbGVjdGVkUmFuZ2Uoc3RhcnQsIGVuZCkge1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IGVuZDtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gTm90ZTogRG9lcyBOT1QgdHJpZ2dlciBvblJhbmdlQ2hhbmdlIGNhbGxiYWNrXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIHdoZW4gcmFuZ2UgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgb25SYW5nZUNoYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB0aW1lbGluZVxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIl19