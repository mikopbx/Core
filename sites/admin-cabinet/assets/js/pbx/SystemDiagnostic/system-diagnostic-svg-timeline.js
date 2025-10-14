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
   * Full available range (entire log file)
   * @type {object}
   */
  fullRange: {
    start: null,
    end: null
  },

  /**
   * Visible range on timeline (controlled by period buttons and zoom)
   * @type {object}
   */
  visibleRange: {
    start: null,
    end: null
  },

  /**
   * Selected range for data loading (always 1/4 of visibleRange, centered)
   * @type {object}
   */
  selectedRange: {
    start: null,
    end: null
  },

  /**
   * Server timezone offset in seconds
   * @type {number}
   */
  serverTimezoneOffset: 0,

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
    startSelectedStart: 0,
    startSelectedEnd: 0
  },

  /**
   * Initialize timeline (Yandex Cloud LogViewer style)
   * @param {string|HTMLElement} container - Container selector or element
   * @param {object} timeRange - Full time range with start and end timestamps
   */
  initialize: function initialize(container, timeRange) {
    var _this = this;

    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      console.error('Timeline container not found');
      return;
    } // Store full range (entire log file)


    this.fullRange.start = timeRange.start;
    this.fullRange.end = timeRange.end; // Ensure minimum duration to prevent division by zero

    var MIN_DURATION = 60; // 1 minute minimum

    if (this.fullRange.end - this.fullRange.start < MIN_DURATION) {
      // Expand range symmetrically around the single timestamp
      var center = this.fullRange.start;
      this.fullRange.start = center - MIN_DURATION / 2;
      this.fullRange.end = center + MIN_DURATION / 2;
    }

    this.dimensions.width = this.container.offsetWidth; // Determine initial visible range based on total duration (use adjusted fullRange)

    var totalDuration = this.fullRange.end - this.fullRange.start;
    var initialVisibleDuration;

    if (totalDuration > 86400 * 7) {
      // If logs span more than 7 days, show last 24 hours as visible
      initialVisibleDuration = 86400; // 24 hours
    } else if (totalDuration > 86400) {
      // If logs span 1-7 days, show last 12 hours
      initialVisibleDuration = 43200; // 12 hours
    } else if (totalDuration > 3600 * 6) {
      // If logs span 6-24 hours, show last 6 hours
      initialVisibleDuration = 21600; // 6 hours
    } else {
      // For shorter logs, show entire range
      initialVisibleDuration = totalDuration;
    } // Set visible range (what user sees on timeline) - use adjusted fullRange


    this.visibleRange.end = this.fullRange.end;
    this.visibleRange.start = Math.max(this.fullRange.end - initialVisibleDuration, this.fullRange.start); // Calculate selected range as 1/4 of visible range, centered

    this.calculateCenteredSelection(); // Create SVG structure

    this.createSVG();
    this.render();
    this.attachEvents(); // Handle window resize

    window.addEventListener('resize', function () {
      return _this.handleResize();
    });
  },

  /**
   * Calculate centered selection (1/4 of visible range, positioned at center)
   */
  calculateCenteredSelection: function calculateCenteredSelection() {
    var visibleDuration = this.visibleRange.end - this.visibleRange.start;
    var selectedDuration = visibleDuration / 4;
    var visibleCenter = this.visibleRange.start + visibleDuration / 2;
    this.selectedRange.start = visibleCenter - selectedDuration / 2;
    this.selectedRange.end = visibleCenter + selectedDuration / 2; // Ensure selected range stays within visible range

    if (this.selectedRange.start < this.visibleRange.start) {
      this.selectedRange.start = this.visibleRange.start;
      this.selectedRange.end = this.visibleRange.start + selectedDuration;
    }

    if (this.selectedRange.end > this.visibleRange.end) {
      this.selectedRange.end = this.visibleRange.end;
      this.selectedRange.start = this.visibleRange.end - selectedDuration;
    }
  },

  /**
   * Calculate adaptive time step based on range duration and available width
   * Ensures labels are not closer than 2cm (~75px at standard DPI)
   *
   * @param {number} duration - Duration in seconds
   * @param {number} availableWidth - Available width in pixels
   * @returns {object} Step configuration {value, label, format}
   */
  calculateAdaptiveStep: function calculateAdaptiveStep(duration, availableWidth) {
    // Time steps in seconds with labels (from smallest to largest)
    var steps = [{
      value: 1,
      label: '1 sec',
      format: 'HH:MM:SS'
    }, // 1 second
    {
      value: 5,
      label: '5 sec',
      format: 'HH:MM:SS'
    }, // 5 seconds
    {
      value: 10,
      label: '10 sec',
      format: 'HH:MM:SS'
    }, // 10 seconds
    {
      value: 30,
      label: '30 sec',
      format: 'HH:MM:SS'
    }, // 30 seconds
    {
      value: 60,
      label: '1 min',
      format: 'HH:MM'
    }, // 1 minute
    {
      value: 300,
      label: '5 min',
      format: 'HH:MM'
    }, // 5 minutes
    {
      value: 600,
      label: '10 min',
      format: 'HH:MM'
    }, // 10 minutes
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
      value: 10800,
      label: '3 hours',
      format: 'HH:MM'
    }, // 3 hours
    {
      value: 21600,
      label: '6 hours',
      format: 'HH:MM'
    }, // 6 hours
    {
      value: 43200,
      label: '12 hours',
      format: 'HH:MM'
    }, // 12 hours
    {
      value: 86400,
      label: '1 day',
      format: 'MM-DD'
    }, // 1 day
    {
      value: 259200,
      label: '3 days',
      format: 'MM-DD'
    }, // 3 days
    {
      value: 604800,
      label: '1 week',
      format: 'MM-DD'
    }, // 7 days
    {
      value: 2592000,
      label: '1 month',
      format: 'MM-DD'
    } // 30 days
    ]; // Minimum spacing between labels: 2cm ≈ 75px (at 96 DPI)
    // Using 80px to be safe and account for label width

    var minSpacingPx = 80; // Calculate maximum number of labels that fit with minimum spacing

    var maxLabels = Math.floor(availableWidth / minSpacingPx); // Ensure at least 2 labels, but not more than available space allows

    var targetMinLabels = Math.max(2, Math.min(4, maxLabels));
    var targetMaxLabels = Math.max(targetMinLabels, maxLabels); // Find step that produces appropriate number of labels

    for (var i = 0; i < steps.length; i++) {
      var numLabels = Math.floor(duration / steps[i].value); // Check if this step produces acceptable number of labels

      if (numLabels >= targetMinLabels && numLabels <= targetMaxLabels) {
        return steps[i];
      }
    } // If no perfect match, find closest match


    var bestStep = steps[0];
    var bestDiff = Infinity;

    for (var _i = 0; _i < steps.length; _i++) {
      var _numLabels = Math.floor(duration / steps[_i].value); // For very short durations, prefer step that produces at least 2 labels


      if (duration < steps[0].value * targetMinLabels) {
        if (_numLabels >= 2) {
          return steps[_i];
        }

        continue;
      } // Calculate difference from ideal range


      var diff = void 0;

      if (_numLabels < targetMinLabels) {
        diff = (targetMinLabels - _numLabels) * 2; // Penalize too few labels more
      } else if (_numLabels > targetMaxLabels) {
        diff = _numLabels - targetMaxLabels; // Penalize too many labels
      } else {
        diff = 0; // Within acceptable range
      }

      if (diff < bestDiff) {
        bestDiff = diff;
        bestStep = steps[_i];
      }
    }

    return bestStep;
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

    this.drawNowLine(); // Draw selection range (foreground layer)

    this.drawSelection(); // Draw data boundaries last (top layer) - red lines marking actual log data
    // Must be drawn AFTER selection to avoid being covered by blue rect

    this.drawDataBoundaries();
  },

  /**
   * Draw timeline ticks and labels
   * Uses VISIBLE range for adaptive scaling (Yandex Cloud style)
   */
  drawTicks: function drawTicks() {
    var _this$dimensions = this.dimensions,
        width = _this$dimensions.width,
        height = _this$dimensions.height,
        padding = _this$dimensions.padding;
    var availableWidth = width - padding * 2; // Use visible range for both positioning and step calculation

    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Safety check: prevent division by zero

    if (visibleDuration <= 0) {
      console.warn('SVGTimeline: visibleDuration is zero or negative, skipping tick drawing');
      return;
    } // Get adaptive step based on VISIBLE duration and available width


    var step = this.calculateAdaptiveStep(visibleDuration, availableWidth); // Round visible range to nearest step interval

    var roundedStart = Math.floor(this.visibleRange.start / step.value) * step.value; // Store major tick positions for collision detection

    var majorTickPositions = new Set(); // Draw major ticks at discrete intervals within visible range

    var timestamp = roundedStart;

    while (timestamp <= this.visibleRange.end) {
      if (timestamp >= this.visibleRange.start) {
        // Calculate position relative to VISIBLE range (not full range!)
        var x = padding + (timestamp - this.visibleRange.start) / visibleDuration * availableWidth;
        majorTickPositions.add(Math.round(timestamp)); // Major tick - bottom (compact)

        this.drawTick(x, height - 6, 4, '#767676'); // Label - centered vertically (compact) with format from step

        this.drawLabel(x, height / 2 + 3, this.formatTime(timestamp, step.format));
      }

      timestamp += step.value;
    } // Draw minor ticks between major ones (5 per interval)


    var minorTimestamp = roundedStart;
    var minorStep = step.value / 5;

    while (minorTimestamp <= this.visibleRange.end) {
      if (minorTimestamp >= this.visibleRange.start) {
        // Check if this is not a major tick position
        var roundedMinorTimestamp = Math.round(minorTimestamp);

        if (!majorTickPositions.has(roundedMinorTimestamp)) {
          // Calculate position relative to VISIBLE range
          var _x = padding + (minorTimestamp - this.visibleRange.start) / visibleDuration * availableWidth; // Minor tick - shorter and lighter


          this.drawTick(_x, height - 5, 2, '#d4d4d5');
        }
      }

      minorTimestamp += minorStep;
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
    var fontSize = 11; // Use monospace width for time labels (seconds format is longer)

    var charWidth = text.includes(':') ? 6.5 : 6; // Wider for time formats

    return {
      width: text.length * charWidth,
      height: fontSize + 2
    };
  },

  /**
   * Draw selection range (relative to visible range)
   */
  drawSelection: function drawSelection() {
    var visibleDuration = this.visibleRange.end - this.visibleRange.start;
    var _this$dimensions2 = this.dimensions,
        width = _this$dimensions2.width,
        padding = _this$dimensions2.padding;
    var availableWidth = width - padding * 2; // Safety check: prevent division by zero

    if (visibleDuration <= 0) {
      console.warn('SVGTimeline: visibleDuration is zero or negative, skipping selection drawing');
      return;
    } // Calculate position relative to VISIBLE range


    var leftPercent = (this.selectedRange.start - this.visibleRange.start) / visibleDuration * 100;
    var rightPercent = (this.selectedRange.end - this.visibleRange.start) / visibleDuration * 100;
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
   * Draw "Now" line (relative to visible range)
   */
  drawNowLine: function drawNowLine() {
    var now = Math.floor(Date.now() / 1000); // Only draw if "now" is within visible range

    if (now < this.visibleRange.start || now > this.visibleRange.end) return;
    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Safety check: prevent division by zero

    if (visibleDuration <= 0) {
      console.warn('SVGTimeline: visibleDuration is zero or negative, skipping now line drawing');
      return;
    }

    var _this$dimensions3 = this.dimensions,
        width = _this$dimensions3.width,
        padding = _this$dimensions3.padding;
    var availableWidth = width - padding * 2; // Calculate position relative to VISIBLE range

    var x = padding + (now - this.visibleRange.start) / visibleDuration * availableWidth;
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', this.dimensions.height);
    line.setAttribute('class', 'timeline-now');
    this.svg.appendChild(line);
  },

  /**
   * Draw data boundaries (red lines marking actual log data range)
   * Shows where actual data starts and ends within the visible range
   */
  drawDataBoundaries: function drawDataBoundaries() {
    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Safety check: prevent division by zero

    if (visibleDuration <= 0) {
      return;
    }

    var _this$dimensions4 = this.dimensions,
        width = _this$dimensions4.width,
        height = _this$dimensions4.height,
        padding = _this$dimensions4.padding;
    var availableWidth = width - padding * 2; // Draw start boundary (left red line)
    // If fullRange.start is before visibleRange.start, draw at left edge
    // If fullRange.start is within visible range, draw at its position
    // If fullRange.start is after visibleRange.end, don't draw

    if (this.fullRange.start <= this.visibleRange.end) {
      var xStart;

      if (this.fullRange.start < this.visibleRange.start) {
        // Data starts before visible range - draw at left edge
        xStart = padding;
      } else {
        // Data starts within visible range - draw at its position
        xStart = padding + (this.fullRange.start - this.visibleRange.start) / visibleDuration * availableWidth;
      }

      var lineStart = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineStart.setAttribute('x1', xStart);
      lineStart.setAttribute('y1', 0);
      lineStart.setAttribute('x2', xStart);
      lineStart.setAttribute('y2', height);
      lineStart.setAttribute('stroke', '#db2828');
      lineStart.setAttribute('stroke-width', '3');
      lineStart.setAttribute('stroke-dasharray', '5,3');
      lineStart.setAttribute('opacity', '0.8');
      this.svg.appendChild(lineStart);
    } // Draw end boundary (right red line)
    // If fullRange.end is after visibleRange.end, draw at right edge
    // If fullRange.end is within visible range, draw at its position
    // If fullRange.end is before visibleRange.start, don't draw


    if (this.fullRange.end >= this.visibleRange.start) {
      var xEnd;

      if (this.fullRange.end > this.visibleRange.end) {
        // Data ends after visible range - draw at right edge
        xEnd = padding + availableWidth;
      } else {
        // Data ends within visible range - draw at its position
        xEnd = padding + (this.fullRange.end - this.visibleRange.start) / visibleDuration * availableWidth;
      }

      var lineEnd = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineEnd.setAttribute('x1', xEnd);
      lineEnd.setAttribute('y1', 0);
      lineEnd.setAttribute('x2', xEnd);
      lineEnd.setAttribute('y2', height);
      lineEnd.setAttribute('stroke', '#db2828');
      lineEnd.setAttribute('stroke-width', '3');
      lineEnd.setAttribute('stroke-dasharray', '5,3');
      lineEnd.setAttribute('opacity', '0.8');
      this.svg.appendChild(lineEnd);
    }
  },

  /**
   * Format timestamp to time string (server time)
   * @param {number} timestamp - Unix timestamp in UTC
   * @param {string} format - Format type: 'HH:MM:SS', 'HH:MM', or 'MM-DD'
   * @returns {string} Formatted time/date in server timezone
   */
  formatTime: function formatTime(timestamp) {
    var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'HH:MM';
    // Create date from UTC timestamp, then add server offset to get milliseconds
    // serverTimezoneOffset is in seconds, timestamp is in seconds
    var serverTimeMs = (timestamp + this.serverTimezoneOffset) * 1000;
    var date = new Date(serverTimeMs);

    if (format === 'MM-DD') {
      // Format as month-day for long ranges
      var month = String(date.getUTCMonth() + 1).padStart(2, '0');
      var day = String(date.getUTCDate()).padStart(2, '0');
      return "".concat(month, "-").concat(day);
    } else if (format === 'HH:MM:SS') {
      // Format as time with seconds for very short ranges
      var hours = String(date.getUTCHours()).padStart(2, '0');
      var minutes = String(date.getUTCMinutes()).padStart(2, '0');
      var seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return "".concat(hours, ":").concat(minutes, ":").concat(seconds);
    } else {
      // Format as time (HH:MM) for shorter ranges
      var _hours = String(date.getUTCHours()).padStart(2, '0');

      var _minutes = String(date.getUTCMinutes()).padStart(2, '0');

      return "".concat(_hours, ":").concat(_minutes);
    }
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
    this.dragging.startSelectedStart = this.selectedRange.start;
    this.dragging.startSelectedEnd = this.selectedRange.end;
    var rect = this.container.getBoundingClientRect();
    this.dragging.containerLeft = rect.left;
    this.dragging.containerWidth = rect.width;
    e.preventDefault();
  },

  /**
   * Handle mouse move (Yandex Cloud LogViewer style)
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove: function handleMouseMove(e) {
    if (!this.dragging.active) return;
    var deltaX = e.clientX - this.dragging.startX;
    var padding = this.dimensions.padding;
    var availableWidth = this.dragging.containerWidth - padding * 2;
    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Safety check: prevent division by zero

    if (visibleDuration <= 0 || availableWidth <= 0) {
      console.warn('SVGTimeline: Invalid dimensions for mouse move calculation');
      return;
    } // Calculate time delta relative to VISIBLE range


    var deltaTime = deltaX / availableWidth * visibleDuration;

    if (this.dragging.handle === 'left') {
      // Resizing from left - allow free movement
      var newStart = this.dragging.startSelectedStart + deltaTime; // Only enforce minimum width of 60 seconds

      newStart = Math.min(newStart, this.selectedRange.end - 60);
      this.selectedRange.start = newStart;
    } else if (this.dragging.handle === 'right') {
      // Resizing from right - allow free movement
      var newEnd = this.dragging.startSelectedEnd + deltaTime; // Only enforce minimum width of 60 seconds

      newEnd = Math.max(newEnd, this.selectedRange.start + 60);
      this.selectedRange.end = newEnd;
    } else if (this.dragging.handle === 'range') {
      // Dragging entire range - allow free movement
      var _newStart = this.dragging.startSelectedStart + deltaTime;

      var _newEnd = this.dragging.startSelectedEnd + deltaTime; // No bounds checking - allow dragging anywhere


      this.selectedRange.start = _newStart;
      this.selectedRange.end = _newEnd;
    }

    this.render();
  },

  /**
   * Handle mouse up (Yandex Cloud LogViewer style)
   * After drag: preserve user's manual selection and adjust visible range
   */
  handleMouseUp: function handleMouseUp() {
    if (this.dragging.active) {
      var wasResizing = this.dragging.handle === 'left' || this.dragging.handle === 'right';
      var wasDragging = this.dragging.handle === 'range';
      this.dragging.active = false;
      this.dragging.handle = null;
      var handleType = wasResizing ? this.dragging.handle === 'left' ? 'left' : 'right' : 'range';
      console.debug('🖱️ SVGTimeline.handleMouseUp() - ' + (wasResizing ? 'resize' : 'drag') + ' handle: ' + handleType);

      if (wasResizing) {
        // User resized selection → adjust visible range to be 4x selection
        // PRESERVE user's manual selection (do NOT recalculate it!)
        var selectedDuration = this.selectedRange.end - this.selectedRange.start;
        var newVisibleDuration = selectedDuration * 4;
        var selectedCenter = this.selectedRange.start + selectedDuration / 2; // Calculate new visible range centered on selection
        // NOTE: Allow visibleRange to extend BEYOND fullRange to maintain 1/4 ratio

        var newVisibleStart = selectedCenter - newVisibleDuration / 2;
        var newVisibleEnd = selectedCenter + newVisibleDuration / 2;
        this.visibleRange.start = newVisibleStart;
        this.visibleRange.end = newVisibleEnd;
        console.debug('↔️ User RESIZED selection: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' (' + Math.round(selectedDuration) + 's)');
        console.debug('   Calculated visibleRange (4x): ' + this.formatTime(newVisibleStart, 'HH:MM:SS') + ' → ' + this.formatTime(newVisibleEnd, 'HH:MM:SS') + ' (' + Math.round(newVisibleDuration) + 's)');
        console.debug('   Extends beyond fullRange? before=' + (newVisibleStart < this.fullRange.start) + ' after=' + (newVisibleEnd > this.fullRange.end));
        console.debug('   fullRange bounds: ' + this.formatTime(this.fullRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.fullRange.end, 'HH:MM:SS')); // Do NOT call calculateCenteredSelection() here!
        // The user's manual selection (e.g., 9:45-9:50) must be preserved
        // Deactivate all period buttons

        if (typeof $ !== 'undefined') {
          $('.period-btn').removeClass('active');
        }
      } else if (wasDragging) {
        // User dragged selection → shift visible range to keep selection centered
        // PRESERVE user's manual selection (do NOT recalculate it!)
        var _selectedCenter = this.selectedRange.start + (this.selectedRange.end - this.selectedRange.start) / 2;

        var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Calculate new visible range to keep selection at center
        // NOTE: Allow visibleRange to extend BEYOND fullRange

        var _newVisibleStart = _selectedCenter - visibleDuration / 2;

        var _newVisibleEnd = _selectedCenter + visibleDuration / 2;

        this.visibleRange.start = _newVisibleStart;
        this.visibleRange.end = _newVisibleEnd;
        console.debug('↔️ User DRAGGED selection: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS'));
        console.debug('   Shifted visibleRange: ' + this.formatTime(_newVisibleStart, 'HH:MM:SS') + ' → ' + this.formatTime(_newVisibleEnd, 'HH:MM:SS')); // Do NOT call calculateCenteredSelection() here!
        // The user's manual selection must be preserved
      } // Render with new ranges


      this.render(); // DEBUG: Show final state after render

      console.debug('📊 FINAL state after mouse interaction:');
      console.debug('   fullRange: ' + this.formatTime(this.fullRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.fullRange.end, 'HH:MM:SS') + ' (' + Math.round(this.fullRange.end - this.fullRange.start) + 's)');
      console.debug('   visibleRange: ' + this.formatTime(this.visibleRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.visibleRange.end, 'HH:MM:SS') + ' (' + Math.round(this.visibleRange.end - this.visibleRange.start) + 's)' + ' extends: before=' + (this.visibleRange.start < this.fullRange.start) + ' after=' + (this.visibleRange.end > this.fullRange.end));
      console.debug('   selectedRange: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' (' + Math.round(this.selectedRange.end - this.selectedRange.start) + 's)' + ' ratio=' + ((this.selectedRange.end - this.selectedRange.start) / (this.visibleRange.end - this.visibleRange.start) * 100).toFixed(1) + '%'); // DEBUG: Show what we're sending to backend

      console.debug('📤 SENDING to backend: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' (' + Math.round(this.selectedRange.end - this.selectedRange.start) + 's)' + ' [timestamps: ' + Math.round(this.selectedRange.start) + ' - ' + Math.round(this.selectedRange.end) + ']'); // Trigger callback to load data with user's ACTUAL selected range

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
   * Apply period from quick-period-buttons (Yandex Cloud style)
   * Sets visible range and auto-centers selection
   * @param {number} periodSeconds - Period in seconds (e.g., 3600 for 1h)
   */
  applyPeriod: function applyPeriod(periodSeconds) {
    var period = parseInt(periodSeconds);
    var periodLabel = period >= 86400 ? period / 86400 + 'd' : period >= 3600 ? period / 3600 + 'h' : period / 60 + 'm';
    console.debug('⏱️ User clicked period button: ' + periodLabel + ' (' + period + 's)'); // Set visible range to last N seconds

    this.visibleRange.end = this.fullRange.end;
    this.visibleRange.start = Math.max(this.fullRange.end - period, this.fullRange.start); // Auto-center selection (1/4 of visible range)

    this.calculateCenteredSelection();
    console.debug('📐 Period applied, visibleRange: ' + this.formatTime(this.visibleRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.visibleRange.end, 'HH:MM:SS'));
    console.debug('   Auto-centered selection (1/4): ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS')); // Render

    this.render();
    console.debug('📊 FINAL state after period button:');
    console.debug('   fullRange: ' + this.formatTime(this.fullRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.fullRange.end, 'HH:MM:SS'));
    console.debug('   visibleRange: ' + this.formatTime(this.visibleRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.visibleRange.end, 'HH:MM:SS'));
    console.debug('   selectedRange: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' ratio=' + ((this.selectedRange.end - this.selectedRange.start) / (this.visibleRange.end - this.visibleRange.start) * 100).toFixed(1) + '%');
    console.debug('📤 SENDING to backend (period button): ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' [timestamps: ' + Math.round(this.selectedRange.start) + ' - ' + Math.round(this.selectedRange.end) + ']'); // Trigger callback to load data

    if (this.onRangeChange) {
      this.onRangeChange(Math.round(this.selectedRange.start), Math.round(this.selectedRange.end));
    }
  },

  /**
   * Set selected range (deprecated - use applyPeriod instead)
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
   * Synchronously updates both visible range and selected range to maintain 1/4 ratio
   * @param {number} start - Actual start timestamp
   * @param {number} end - Actual end timestamp
   */
  updateSelectedRange: function updateSelectedRange(start, end) {
    console.debug('📥 RECEIVED from backend: ' + this.formatTime(start, 'HH:MM:SS') + ' → ' + this.formatTime(end, 'HH:MM:SS') + ' (' + Math.round(end - start) + 's)' + ' [timestamps: ' + start + ' - ' + end + ']'); // Ensure minimum duration to prevent division by zero

    var MIN_DURATION = 60; // 1 minute minimum

    if (end - start < MIN_DURATION) {
      console.debug('⚠️ Duration too short, expanding to MIN_DURATION', {
        original: Math.round(end - start) + 's',
        expanded: MIN_DURATION + 's'
      }); // Expand range symmetrically around the single timestamp

      var center = start;
      start = center - MIN_DURATION / 2;
      end = center + MIN_DURATION / 2;
    } // Set selected range to actual loaded data


    this.selectedRange.start = start;
    this.selectedRange.end = end; // Calculate new visible range as 4x of selected range

    var selectedDuration = end - start;
    var newVisibleDuration = selectedDuration * 4;
    var selectedCenter = start + selectedDuration / 2; // Center visible range around selected range
    // NOTE: visibleRange can extend BEYOND fullRange to maintain 1/4 ratio
    // This creates empty space around the actual data

    var newVisibleStart = selectedCenter - newVisibleDuration / 2;
    var newVisibleEnd = selectedCenter + newVisibleDuration / 2; // Update visible range (no bounds check - allow extending beyond fullRange)

    this.visibleRange.start = newVisibleStart;
    this.visibleRange.end = newVisibleEnd;
    console.debug('🔄 Backend data synced, selectedRange: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' (' + Math.round(selectedDuration) + 's)');
    console.debug('   Calculated visibleRange (4x): ' + this.formatTime(newVisibleStart, 'HH:MM:SS') + ' → ' + this.formatTime(newVisibleEnd, 'HH:MM:SS') + ' (' + Math.round(newVisibleDuration) + 's)');
    console.debug('   Extends beyond fullRange? before=' + (newVisibleStart < this.fullRange.start) + ' after=' + (newVisibleEnd > this.fullRange.end)); // Note: Do NOT recalculate selectedRange here!
    // selectedRange is already set from backend's actual data (lines 493-494)
    // and should remain fixed to match the real loaded data range
    // Render with new ranges

    this.render();
    console.debug('📊 FINAL state after backend sync:');
    console.debug('   fullRange: ' + this.formatTime(this.fullRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.fullRange.end, 'HH:MM:SS'));
    console.debug('   visibleRange: ' + this.formatTime(this.visibleRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.visibleRange.end, 'HH:MM:SS') + ' extends: before=' + (this.visibleRange.start < this.fullRange.start) + ' after=' + (this.visibleRange.end > this.fullRange.end));
    console.debug('   selectedRange: ' + this.formatTime(this.selectedRange.start, 'HH:MM:SS') + ' → ' + this.formatTime(this.selectedRange.end, 'HH:MM:SS') + ' ratio=' + ((this.selectedRange.end - this.selectedRange.start) / (this.visibleRange.end - this.visibleRange.start) * 100).toFixed(1) + '%'); // Note: Does NOT trigger onRangeChange callback
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXN2Zy10aW1lbGluZS5qcyJdLCJuYW1lcyI6WyJTVkdUaW1lbGluZSIsImNvbnRhaW5lciIsInN2ZyIsImZ1bGxSYW5nZSIsInN0YXJ0IiwiZW5kIiwidmlzaWJsZVJhbmdlIiwic2VsZWN0ZWRSYW5nZSIsInNlcnZlclRpbWV6b25lT2Zmc2V0IiwiZGltZW5zaW9ucyIsIndpZHRoIiwiaGVpZ2h0IiwicGFkZGluZyIsImRyYWdnaW5nIiwiYWN0aXZlIiwiaGFuZGxlIiwic3RhcnRYIiwic3RhcnRTZWxlY3RlZFN0YXJ0Iiwic3RhcnRTZWxlY3RlZEVuZCIsImluaXRpYWxpemUiLCJ0aW1lUmFuZ2UiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJjb25zb2xlIiwiZXJyb3IiLCJNSU5fRFVSQVRJT04iLCJjZW50ZXIiLCJvZmZzZXRXaWR0aCIsInRvdGFsRHVyYXRpb24iLCJpbml0aWFsVmlzaWJsZUR1cmF0aW9uIiwiTWF0aCIsIm1heCIsImNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uIiwiY3JlYXRlU1ZHIiwicmVuZGVyIiwiYXR0YWNoRXZlbnRzIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImhhbmRsZVJlc2l6ZSIsInZpc2libGVEdXJhdGlvbiIsInNlbGVjdGVkRHVyYXRpb24iLCJ2aXNpYmxlQ2VudGVyIiwiY2FsY3VsYXRlQWRhcHRpdmVTdGVwIiwiZHVyYXRpb24iLCJhdmFpbGFibGVXaWR0aCIsInN0ZXBzIiwidmFsdWUiLCJsYWJlbCIsImZvcm1hdCIsIm1pblNwYWNpbmdQeCIsIm1heExhYmVscyIsImZsb29yIiwidGFyZ2V0TWluTGFiZWxzIiwibWluIiwidGFyZ2V0TWF4TGFiZWxzIiwiaSIsImxlbmd0aCIsIm51bUxhYmVscyIsImJlc3RTdGVwIiwiYmVzdERpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJjcmVhdGVFbGVtZW50TlMiLCJzZXRBdHRyaWJ1dGUiLCJpbm5lckhUTUwiLCJhcHBlbmRDaGlsZCIsImRyYXdUaWNrcyIsImRyYXdOb3dMaW5lIiwiZHJhd1NlbGVjdGlvbiIsImRyYXdEYXRhQm91bmRhcmllcyIsIndhcm4iLCJzdGVwIiwicm91bmRlZFN0YXJ0IiwibWFqb3JUaWNrUG9zaXRpb25zIiwiU2V0IiwidGltZXN0YW1wIiwieCIsImFkZCIsInJvdW5kIiwiZHJhd1RpY2siLCJkcmF3TGFiZWwiLCJmb3JtYXRUaW1lIiwibWlub3JUaW1lc3RhbXAiLCJtaW5vclN0ZXAiLCJyb3VuZGVkTWlub3JUaW1lc3RhbXAiLCJoYXMiLCJ5IiwiY29sb3IiLCJsaW5lIiwidGV4dCIsImJib3giLCJnZXRUZXh0QkJveCIsImJnIiwidGV4dENvbnRlbnQiLCJmb250U2l6ZSIsImNoYXJXaWR0aCIsImluY2x1ZGVzIiwibGVmdFBlcmNlbnQiLCJyaWdodFBlcmNlbnQiLCJ3aWR0aFBlcmNlbnQiLCJ3IiwicmVjdCIsImRyYXdIYW5kbGUiLCJwb3NpdGlvbiIsIm5vdyIsIkRhdGUiLCJ4U3RhcnQiLCJsaW5lU3RhcnQiLCJ4RW5kIiwibGluZUVuZCIsInNlcnZlclRpbWVNcyIsImRhdGUiLCJtb250aCIsIlN0cmluZyIsImdldFVUQ01vbnRoIiwicGFkU3RhcnQiLCJkYXkiLCJnZXRVVENEYXRlIiwiaG91cnMiLCJnZXRVVENIb3VycyIsIm1pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwic2Vjb25kcyIsImdldFVUQ1NlY29uZHMiLCJlIiwiaGFuZGxlTW91c2VEb3duIiwiaGFuZGxlTW91c2VNb3ZlIiwiaGFuZGxlTW91c2VVcCIsInRhcmdldCIsImdldEF0dHJpYnV0ZSIsImNsaWVudFgiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJjb250YWluZXJMZWZ0IiwibGVmdCIsImNvbnRhaW5lcldpZHRoIiwicHJldmVudERlZmF1bHQiLCJkZWx0YVgiLCJkZWx0YVRpbWUiLCJuZXdTdGFydCIsIm5ld0VuZCIsIndhc1Jlc2l6aW5nIiwid2FzRHJhZ2dpbmciLCJoYW5kbGVUeXBlIiwiZGVidWciLCJuZXdWaXNpYmxlRHVyYXRpb24iLCJzZWxlY3RlZENlbnRlciIsIm5ld1Zpc2libGVTdGFydCIsIm5ld1Zpc2libGVFbmQiLCIkIiwicmVtb3ZlQ2xhc3MiLCJ0b0ZpeGVkIiwib25SYW5nZUNoYW5nZSIsImFwcGx5UGVyaW9kIiwicGVyaW9kU2Vjb25kcyIsInBlcmlvZCIsInBhcnNlSW50IiwicGVyaW9kTGFiZWwiLCJzZXRSYW5nZSIsInVwZGF0ZVNlbGVjdGVkUmFuZ2UiLCJvcmlnaW5hbCIsImV4cGFuZGVkIiwiZGVzdHJveSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFMSzs7QUFPaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsR0FBRyxFQUFFLElBWFc7O0FBYWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxLQUFLLEVBQUUsSUFEQTtBQUVQQyxJQUFBQSxHQUFHLEVBQUU7QUFGRSxHQWpCSzs7QUFzQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRTtBQUNWRixJQUFBQSxLQUFLLEVBQUUsSUFERztBQUVWQyxJQUFBQSxHQUFHLEVBQUU7QUFGSyxHQTFCRTs7QUErQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGFBQWEsRUFBRTtBQUNYSCxJQUFBQSxLQUFLLEVBQUUsSUFESTtBQUVYQyxJQUFBQSxHQUFHLEVBQUU7QUFGTSxHQW5DQzs7QUF3Q2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLG9CQUFvQixFQUFFLENBNUNOOztBQThDaEI7QUFD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ZixHQUEyQixFQUEzQjtBQUNIO0FBQ0o7QUF6N0JlLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBTVkcgVGltZWxpbmUgY29tcG9uZW50IGZvciBsb2cgbmF2aWdhdGlvblxuICogR3JhZmFuYS1zdHlsZSB0aW1lbGluZSB3aXRoIHJhbmdlIHNlbGVjdGlvblxuICpcbiAqIEBtb2R1bGUgU1ZHVGltZWxpbmVcbiAqL1xuY29uc3QgU1ZHVGltZWxpbmUgPSB7XG4gICAgLyoqXG4gICAgICogQ29udGFpbmVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU1ZHIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7U1ZHRWxlbWVudH1cbiAgICAgKi9cbiAgICBzdmc6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGdWxsIGF2YWlsYWJsZSByYW5nZSAoZW50aXJlIGxvZyBmaWxlKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZnVsbFJhbmdlOiB7XG4gICAgICAgIHN0YXJ0OiBudWxsLFxuICAgICAgICBlbmQ6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlzaWJsZSByYW5nZSBvbiB0aW1lbGluZSAoY29udHJvbGxlZCBieSBwZXJpb2QgYnV0dG9ucyBhbmQgem9vbSlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZpc2libGVSYW5nZToge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbGVjdGVkIHJhbmdlIGZvciBkYXRhIGxvYWRpbmcgKGFsd2F5cyAxLzQgb2YgdmlzaWJsZVJhbmdlLCBjZW50ZXJlZClcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNlbGVjdGVkUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0IGluIHNlY29uZHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHNlcnZlclRpbWV6b25lT2Zmc2V0OiAwLFxuXG4gICAgLyoqXG4gICAgICogRGltZW5zaW9ucyAtIGNvbXBhY3QgdmVyc2lvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGltZW5zaW9uczoge1xuICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgaGVpZ2h0OiAyNCxcbiAgICAgICAgcGFkZGluZzogOFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmFnZ2luZyBzdGF0ZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZHJhZ2dpbmc6IHtcbiAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgaGFuZGxlOiBudWxsLCAvLyAnbGVmdCcsICdyaWdodCcsICdyYW5nZSdcbiAgICAgICAgc3RhcnRYOiAwLFxuICAgICAgICBzdGFydFNlbGVjdGVkU3RhcnQ6IDAsXG4gICAgICAgIHN0YXJ0U2VsZWN0ZWRFbmQ6IDBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gQ29udGFpbmVyIHNlbGVjdG9yIG9yIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlIC0gRnVsbCB0aW1lIHJhbmdlIHdpdGggc3RhcnQgYW5kIGVuZCB0aW1lc3RhbXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjb250YWluZXIsIHRpbWVSYW5nZSkge1xuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoY29udGFpbmVyKVxuICAgICAgICAgICAgOiBjb250YWluZXI7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVGltZWxpbmUgY29udGFpbmVyIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgZnVsbCByYW5nZSAoZW50aXJlIGxvZyBmaWxlKVxuICAgICAgICB0aGlzLmZ1bGxSYW5nZS5zdGFydCA9IHRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgdGhpcy5mdWxsUmFuZ2UuZW5kID0gdGltZVJhbmdlLmVuZDtcblxuICAgICAgICAvLyBFbnN1cmUgbWluaW11bSBkdXJhdGlvbiB0byBwcmV2ZW50IGRpdmlzaW9uIGJ5IHplcm9cbiAgICAgICAgY29uc3QgTUlOX0RVUkFUSU9OID0gNjA7IC8vIDEgbWludXRlIG1pbmltdW1cbiAgICAgICAgaWYgKHRoaXMuZnVsbFJhbmdlLmVuZCAtIHRoaXMuZnVsbFJhbmdlLnN0YXJ0IDwgTUlOX0RVUkFUSU9OKSB7XG4gICAgICAgICAgICAvLyBFeHBhbmQgcmFuZ2Ugc3ltbWV0cmljYWxseSBhcm91bmQgdGhlIHNpbmdsZSB0aW1lc3RhbXBcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IHRoaXMuZnVsbFJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQgPSBjZW50ZXIgLSAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgICAgICB0aGlzLmZ1bGxSYW5nZS5lbmQgPSBjZW50ZXIgKyAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMud2lkdGggPSB0aGlzLmNvbnRhaW5lci5vZmZzZXRXaWR0aDtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaW5pdGlhbCB2aXNpYmxlIHJhbmdlIGJhc2VkIG9uIHRvdGFsIGR1cmF0aW9uICh1c2UgYWRqdXN0ZWQgZnVsbFJhbmdlKVxuICAgICAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gdGhpcy5mdWxsUmFuZ2UuZW5kIC0gdGhpcy5mdWxsUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGxldCBpbml0aWFsVmlzaWJsZUR1cmF0aW9uO1xuXG4gICAgICAgIGlmICh0b3RhbER1cmF0aW9uID4gODY0MDAgKiA3KSB7XG4gICAgICAgICAgICAvLyBJZiBsb2dzIHNwYW4gbW9yZSB0aGFuIDcgZGF5cywgc2hvdyBsYXN0IDI0IGhvdXJzIGFzIHZpc2libGVcbiAgICAgICAgICAgIGluaXRpYWxWaXNpYmxlRHVyYXRpb24gPSA4NjQwMDsgLy8gMjQgaG91cnNcbiAgICAgICAgfSBlbHNlIGlmICh0b3RhbER1cmF0aW9uID4gODY0MDApIHtcbiAgICAgICAgICAgIC8vIElmIGxvZ3Mgc3BhbiAxLTcgZGF5cywgc2hvdyBsYXN0IDEyIGhvdXJzXG4gICAgICAgICAgICBpbml0aWFsVmlzaWJsZUR1cmF0aW9uID0gNDMyMDA7IC8vIDEyIGhvdXJzXG4gICAgICAgIH0gZWxzZSBpZiAodG90YWxEdXJhdGlvbiA+IDM2MDAgKiA2KSB7XG4gICAgICAgICAgICAvLyBJZiBsb2dzIHNwYW4gNi0yNCBob3Vycywgc2hvdyBsYXN0IDYgaG91cnNcbiAgICAgICAgICAgIGluaXRpYWxWaXNpYmxlRHVyYXRpb24gPSAyMTYwMDsgLy8gNiBob3Vyc1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIHNob3J0ZXIgbG9ncywgc2hvdyBlbnRpcmUgcmFuZ2VcbiAgICAgICAgICAgIGluaXRpYWxWaXNpYmxlRHVyYXRpb24gPSB0b3RhbER1cmF0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHZpc2libGUgcmFuZ2UgKHdoYXQgdXNlciBzZWVzIG9uIHRpbWVsaW5lKSAtIHVzZSBhZGp1c3RlZCBmdWxsUmFuZ2VcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gdGhpcy5mdWxsUmFuZ2UuZW5kO1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IE1hdGgubWF4KHRoaXMuZnVsbFJhbmdlLmVuZCAtIGluaXRpYWxWaXNpYmxlRHVyYXRpb24sIHRoaXMuZnVsbFJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgc2VsZWN0ZWQgcmFuZ2UgYXMgMS80IG9mIHZpc2libGUgcmFuZ2UsIGNlbnRlcmVkXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKTtcblxuICAgICAgICAvLyBDcmVhdGUgU1ZHIHN0cnVjdHVyZVxuICAgICAgICB0aGlzLmNyZWF0ZVNWRygpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB0aGlzLmF0dGFjaEV2ZW50cygpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB3aW5kb3cgcmVzaXplXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiB0aGlzLmhhbmRsZVJlc2l6ZSgpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGNlbnRlcmVkIHNlbGVjdGlvbiAoMS80IG9mIHZpc2libGUgcmFuZ2UsIHBvc2l0aW9uZWQgYXQgY2VudGVyKVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWREdXJhdGlvbiA9IHZpc2libGVEdXJhdGlvbiAvIDQ7XG4gICAgICAgIGNvbnN0IHZpc2libGVDZW50ZXIgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCArICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB2aXNpYmxlQ2VudGVyIC0gKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHZpc2libGVDZW50ZXIgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIEVuc3VyZSBzZWxlY3RlZCByYW5nZSBzdGF5cyB3aXRoaW4gdmlzaWJsZSByYW5nZVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0IDwgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ICsgc2VsZWN0ZWREdXJhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA+IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZDtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHNlbGVjdGVkRHVyYXRpb247XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGFkYXB0aXZlIHRpbWUgc3RlcCBiYXNlZCBvbiByYW5nZSBkdXJhdGlvbiBhbmQgYXZhaWxhYmxlIHdpZHRoXG4gICAgICogRW5zdXJlcyBsYWJlbHMgYXJlIG5vdCBjbG9zZXIgdGhhbiAyY20gKH43NXB4IGF0IHN0YW5kYXJkIERQSSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiAtIER1cmF0aW9uIGluIHNlY29uZHNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXZhaWxhYmxlV2lkdGggLSBBdmFpbGFibGUgd2lkdGggaW4gcGl4ZWxzXG4gICAgICogQHJldHVybnMge29iamVjdH0gU3RlcCBjb25maWd1cmF0aW9uIHt2YWx1ZSwgbGFiZWwsIGZvcm1hdH1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVBZGFwdGl2ZVN0ZXAoZHVyYXRpb24sIGF2YWlsYWJsZVdpZHRoKSB7XG4gICAgICAgIC8vIFRpbWUgc3RlcHMgaW4gc2Vjb25kcyB3aXRoIGxhYmVscyAoZnJvbSBzbWFsbGVzdCB0byBsYXJnZXN0KVxuICAgICAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6IDEsIGxhYmVsOiAnMSBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAgIC8vIDEgc2Vjb25kXG4gICAgICAgICAgICB7IHZhbHVlOiA1LCBsYWJlbDogJzUgc2VjJywgZm9ybWF0OiAnSEg6TU06U1MnIH0sICAgICAgICAvLyA1IHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDEwLCBsYWJlbDogJzEwIHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgIC8vIDEwIHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDMwLCBsYWJlbDogJzMwIHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgIC8vIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwLCBsYWJlbDogJzEgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAgIC8vIDEgbWludXRlXG4gICAgICAgICAgICB7IHZhbHVlOiAzMDAsIGxhYmVsOiAnNSBtaW4nLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgICAgICAvLyA1IG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwMCwgbGFiZWw6ICcxMCBtaW4nLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgICAgIC8vIDEwIG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDE4MDAsIGxhYmVsOiAnMzAgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgIC8vIDMwIG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDM2MDAsIGxhYmVsOiAnMSBob3VyJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgIC8vIDEgaG91clxuICAgICAgICAgICAgeyB2YWx1ZTogMTA4MDAsIGxhYmVsOiAnMyBob3VycycsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgLy8gMyBob3Vyc1xuICAgICAgICAgICAgeyB2YWx1ZTogMjE2MDAsIGxhYmVsOiAnNiBob3VycycsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgeyB2YWx1ZTogNDMyMDAsIGxhYmVsOiAnMTIgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgLy8gMTIgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDg2NDAwLCBsYWJlbDogJzEgZGF5JywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAgIC8vIDEgZGF5XG4gICAgICAgICAgICB7IHZhbHVlOiAyNTkyMDAsIGxhYmVsOiAnMyBkYXlzJywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAvLyAzIGRheXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwNDgwMCwgbGFiZWw6ICcxIHdlZWsnLCBmb3JtYXQ6ICdNTS1ERCcgfSwgICAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgeyB2YWx1ZTogMjU5MjAwMCwgbGFiZWw6ICcxIG1vbnRoJywgZm9ybWF0OiAnTU0tREQnIH0gICAgLy8gMzAgZGF5c1xuICAgICAgICBdO1xuXG4gICAgICAgIC8vIE1pbmltdW0gc3BhY2luZyBiZXR3ZWVuIGxhYmVsczogMmNtIOKJiCA3NXB4IChhdCA5NiBEUEkpXG4gICAgICAgIC8vIFVzaW5nIDgwcHggdG8gYmUgc2FmZSBhbmQgYWNjb3VudCBmb3IgbGFiZWwgd2lkdGhcbiAgICAgICAgY29uc3QgbWluU3BhY2luZ1B4ID0gODA7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG1heGltdW0gbnVtYmVyIG9mIGxhYmVscyB0aGF0IGZpdCB3aXRoIG1pbmltdW0gc3BhY2luZ1xuICAgICAgICBjb25zdCBtYXhMYWJlbHMgPSBNYXRoLmZsb29yKGF2YWlsYWJsZVdpZHRoIC8gbWluU3BhY2luZ1B4KTtcblxuICAgICAgICAvLyBFbnN1cmUgYXQgbGVhc3QgMiBsYWJlbHMsIGJ1dCBub3QgbW9yZSB0aGFuIGF2YWlsYWJsZSBzcGFjZSBhbGxvd3NcbiAgICAgICAgY29uc3QgdGFyZ2V0TWluTGFiZWxzID0gTWF0aC5tYXgoMiwgTWF0aC5taW4oNCwgbWF4TGFiZWxzKSk7XG4gICAgICAgIGNvbnN0IHRhcmdldE1heExhYmVscyA9IE1hdGgubWF4KHRhcmdldE1pbkxhYmVscywgbWF4TGFiZWxzKTtcblxuICAgICAgICAvLyBGaW5kIHN0ZXAgdGhhdCBwcm9kdWNlcyBhcHByb3ByaWF0ZSBudW1iZXIgb2YgbGFiZWxzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG51bUxhYmVscyA9IE1hdGguZmxvb3IoZHVyYXRpb24gLyBzdGVwc1tpXS52YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgc3RlcCBwcm9kdWNlcyBhY2NlcHRhYmxlIG51bWJlciBvZiBsYWJlbHNcbiAgICAgICAgICAgIGlmIChudW1MYWJlbHMgPj0gdGFyZ2V0TWluTGFiZWxzICYmIG51bUxhYmVscyA8PSB0YXJnZXRNYXhMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RlcHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBubyBwZXJmZWN0IG1hdGNoLCBmaW5kIGNsb3Nlc3QgbWF0Y2hcbiAgICAgICAgbGV0IGJlc3RTdGVwID0gc3RlcHNbMF07XG4gICAgICAgIGxldCBiZXN0RGlmZiA9IEluZmluaXR5O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG51bUxhYmVscyA9IE1hdGguZmxvb3IoZHVyYXRpb24gLyBzdGVwc1tpXS52YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIEZvciB2ZXJ5IHNob3J0IGR1cmF0aW9ucywgcHJlZmVyIHN0ZXAgdGhhdCBwcm9kdWNlcyBhdCBsZWFzdCAyIGxhYmVsc1xuICAgICAgICAgICAgaWYgKGR1cmF0aW9uIDwgc3RlcHNbMF0udmFsdWUgKiB0YXJnZXRNaW5MYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVtTGFiZWxzID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ZXBzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGRpZmZlcmVuY2UgZnJvbSBpZGVhbCByYW5nZVxuICAgICAgICAgICAgbGV0IGRpZmY7XG4gICAgICAgICAgICBpZiAobnVtTGFiZWxzIDwgdGFyZ2V0TWluTGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9ICh0YXJnZXRNaW5MYWJlbHMgLSBudW1MYWJlbHMpICogMjsgLy8gUGVuYWxpemUgdG9vIGZldyBsYWJlbHMgbW9yZVxuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1MYWJlbHMgPiB0YXJnZXRNYXhMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gbnVtTGFiZWxzIC0gdGFyZ2V0TWF4TGFiZWxzOyAvLyBQZW5hbGl6ZSB0b28gbWFueSBsYWJlbHNcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IDA7IC8vIFdpdGhpbiBhY2NlcHRhYmxlIHJhbmdlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaWZmIDwgYmVzdERpZmYpIHtcbiAgICAgICAgICAgICAgICBiZXN0RGlmZiA9IGRpZmY7XG4gICAgICAgICAgICAgICAgYmVzdFN0ZXAgPSBzdGVwc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBiZXN0U3RlcDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFNWRyBlbGVtZW50XG4gICAgICovXG4gICAgY3JlYXRlU1ZHKCkge1xuICAgICAgICBjb25zdCBzdmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1zdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcblxuICAgICAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQoc3ZnKTtcbiAgICAgICAgdGhpcy5zdmcgPSBzdmc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aW1lbGluZVxuICAgICAqL1xuICAgIHJlbmRlcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLnN2ZykgcmV0dXJuO1xuXG4gICAgICAgIC8vIENsZWFyIFNWR1xuICAgICAgICB0aGlzLnN2Zy5pbm5lckhUTUwgPSAnJztcblxuICAgICAgICAvLyBVcGRhdGUgd2lkdGhcbiAgICAgICAgdGhpcy5kaW1lbnNpb25zLndpZHRoID0gdGhpcy5jb250YWluZXIub2Zmc2V0V2lkdGg7XG5cbiAgICAgICAgLy8gRHJhdyB0aWNrcyBhbmQgbGFiZWxzIGZpcnN0IChiYWNrZ3JvdW5kIGxheWVyKVxuICAgICAgICB0aGlzLmRyYXdUaWNrcygpO1xuXG4gICAgICAgIC8vIERyYXcgXCJOb3dcIiBsaW5lIChtaWRkbGUgbGF5ZXIpXG4gICAgICAgIHRoaXMuZHJhd05vd0xpbmUoKTtcblxuICAgICAgICAvLyBEcmF3IHNlbGVjdGlvbiByYW5nZSAoZm9yZWdyb3VuZCBsYXllcilcbiAgICAgICAgdGhpcy5kcmF3U2VsZWN0aW9uKCk7XG5cbiAgICAgICAgLy8gRHJhdyBkYXRhIGJvdW5kYXJpZXMgbGFzdCAodG9wIGxheWVyKSAtIHJlZCBsaW5lcyBtYXJraW5nIGFjdHVhbCBsb2cgZGF0YVxuICAgICAgICAvLyBNdXN0IGJlIGRyYXduIEFGVEVSIHNlbGVjdGlvbiB0byBhdm9pZCBiZWluZyBjb3ZlcmVkIGJ5IGJsdWUgcmVjdFxuICAgICAgICB0aGlzLmRyYXdEYXRhQm91bmRhcmllcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHRpbWVsaW5lIHRpY2tzIGFuZCBsYWJlbHNcbiAgICAgKiBVc2VzIFZJU0lCTEUgcmFuZ2UgZm9yIGFkYXB0aXZlIHNjYWxpbmcgKFlhbmRleCBDbG91ZCBzdHlsZSlcbiAgICAgKi9cbiAgICBkcmF3VGlja3MoKSB7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBVc2UgdmlzaWJsZSByYW5nZSBmb3IgYm90aCBwb3NpdGlvbmluZyBhbmQgc3RlcCBjYWxjdWxhdGlvblxuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU1ZHVGltZWxpbmU6IHZpc2libGVEdXJhdGlvbiBpcyB6ZXJvIG9yIG5lZ2F0aXZlLCBza2lwcGluZyB0aWNrIGRyYXdpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBhZGFwdGl2ZSBzdGVwIGJhc2VkIG9uIFZJU0lCTEUgZHVyYXRpb24gYW5kIGF2YWlsYWJsZSB3aWR0aFxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5jYWxjdWxhdGVBZGFwdGl2ZVN0ZXAodmlzaWJsZUR1cmF0aW9uLCBhdmFpbGFibGVXaWR0aCk7XG5cbiAgICAgICAgLy8gUm91bmQgdmlzaWJsZSByYW5nZSB0byBuZWFyZXN0IHN0ZXAgaW50ZXJ2YWxcbiAgICAgICAgY29uc3Qgcm91bmRlZFN0YXJ0ID0gTWF0aC5mbG9vcih0aGlzLnZpc2libGVSYW5nZS5zdGFydCAvIHN0ZXAudmFsdWUpICogc3RlcC52YWx1ZTtcblxuICAgICAgICAvLyBTdG9yZSBtYWpvciB0aWNrIHBvc2l0aW9ucyBmb3IgY29sbGlzaW9uIGRldGVjdGlvblxuICAgICAgICBjb25zdCBtYWpvclRpY2tQb3NpdGlvbnMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgLy8gRHJhdyBtYWpvciB0aWNrcyBhdCBkaXNjcmV0ZSBpbnRlcnZhbHMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgbGV0IHRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgd2hpbGUgKHRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmICh0aW1lc3RhbXAgPj0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgcG9zaXRpb24gcmVsYXRpdmUgdG8gVklTSUJMRSByYW5nZSAobm90IGZ1bGwgcmFuZ2UhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKCh0aW1lc3RhbXAgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAgICAgbWFqb3JUaWNrUG9zaXRpb25zLmFkZChNYXRoLnJvdW5kKHRpbWVzdGFtcCkpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFqb3IgdGljayAtIGJvdHRvbSAoY29tcGFjdClcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDYsIDQsICcjNzY3Njc2Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbCAtIGNlbnRlcmVkIHZlcnRpY2FsbHkgKGNvbXBhY3QpIHdpdGggZm9ybWF0IGZyb20gc3RlcFxuICAgICAgICAgICAgICAgIHRoaXMuZHJhd0xhYmVsKHgsIGhlaWdodCAvIDIgKyAzLCB0aGlzLmZvcm1hdFRpbWUodGltZXN0YW1wLCBzdGVwLmZvcm1hdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXN0YW1wICs9IHN0ZXAudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEcmF3IG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3Igb25lcyAoNSBwZXIgaW50ZXJ2YWwpXG4gICAgICAgIGxldCBtaW5vclRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgY29uc3QgbWlub3JTdGVwID0gc3RlcC52YWx1ZSAvIDU7XG4gICAgICAgIHdoaWxlIChtaW5vclRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmIChtaW5vclRpbWVzdGFtcCA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgbm90IGEgbWFqb3IgdGljayBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdW5kZWRNaW5vclRpbWVzdGFtcCA9IE1hdGgucm91bmQobWlub3JUaW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIGlmICghbWFqb3JUaWNrUG9zaXRpb25zLmhhcyhyb3VuZGVkTWlub3JUaW1lc3RhbXApKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKChtaW5vclRpbWVzdGFtcCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWlub3IgdGljayAtIHNob3J0ZXIgYW5kIGxpZ2h0ZXJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmF3VGljayh4LCBoZWlnaHQgLSA1LCAyLCAnI2Q0ZDRkNScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pbm9yVGltZXN0YW1wICs9IG1pbm9yU3RlcDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgc2luZ2xlIHRpY2tcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0geSAtIFkgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGljayBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3IgLSBUaWNrIGNvbG9yXG4gICAgICovXG4gICAgZHJhd1RpY2soeCwgeSwgaGVpZ2h0LCBjb2xvcikge1xuICAgICAgICBjb25zdCBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTEnLCB5KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkgKyBoZWlnaHQpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywgY29sb3IpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZSBsYWJlbFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gWSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gTGFiZWwgdGV4dFxuICAgICAqL1xuICAgIGRyYXdMYWJlbCh4LCB5LCB0ZXh0KSB7XG4gICAgICAgIC8vIENyZWF0ZSB3aGl0ZSBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3IgbGFiZWxcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0VGV4dEJCb3godGV4dCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSAzO1xuXG4gICAgICAgIGNvbnN0IGJnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneCcsIHggLSAoYmJveC53aWR0aCAvIDIpIC0gcGFkZGluZyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneScsIHkgLSBiYm94LmhlaWdodCArIDIpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgYmJveC53aWR0aCArIChwYWRkaW5nICogMikpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCdmaWxsJywgJyNmYWZhZmEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQoYmcpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZXh0IGxhYmVsXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICd0ZXh0Jyk7XG4gICAgICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1sYWJlbCcpO1xuICAgICAgICBsYWJlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHRoaXMuc3ZnLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJveGltYXRlIGJvdW5kaW5nIGJveCBmb3IgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCBjb250ZW50XG4gICAgICogQHJldHVybnMge29iamVjdH0gQm91bmRpbmcgYm94IHt3aWR0aCwgaGVpZ2h0fVxuICAgICAqL1xuICAgIGdldFRleHRCQm94KHRleHQpIHtcbiAgICAgICAgLy8gQXBwcm94aW1hdGUgc2l6ZSBiYXNlZCBvbiBmb250IHNpemUgYW5kIGNoYXJhY3RlciBjb3VudFxuICAgICAgICBjb25zdCBmb250U2l6ZSA9IDExO1xuICAgICAgICAvLyBVc2UgbW9ub3NwYWNlIHdpZHRoIGZvciB0aW1lIGxhYmVscyAoc2Vjb25kcyBmb3JtYXQgaXMgbG9uZ2VyKVxuICAgICAgICBjb25zdCBjaGFyV2lkdGggPSB0ZXh0LmluY2x1ZGVzKCc6JykgPyA2LjUgOiA2OyAvLyBXaWRlciBmb3IgdGltZSBmb3JtYXRzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogdGV4dC5sZW5ndGggKiBjaGFyV2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGZvbnRTaXplICsgMlxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHNlbGVjdGlvbiByYW5nZSAocmVsYXRpdmUgdG8gdmlzaWJsZSByYW5nZSlcbiAgICAgKi9cbiAgICBkcmF3U2VsZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU1ZHVGltZWxpbmU6IHZpc2libGVEdXJhdGlvbiBpcyB6ZXJvIG9yIG5lZ2F0aXZlLCBza2lwcGluZyBzZWxlY3Rpb24gZHJhd2luZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIFZJU0lCTEUgcmFuZ2VcbiAgICAgICAgY29uc3QgbGVmdFBlcmNlbnQgPSAoKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiAxMDA7XG4gICAgICAgIGNvbnN0IHJpZ2h0UGVyY2VudCA9ICgodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiAxMDA7XG4gICAgICAgIGNvbnN0IHdpZHRoUGVyY2VudCA9IHJpZ2h0UGVyY2VudCAtIGxlZnRQZXJjZW50O1xuXG4gICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKGxlZnRQZXJjZW50IC8gMTAwKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICBjb25zdCB3ID0gKHdpZHRoUGVyY2VudCAvIDEwMCkgKiBhdmFpbGFibGVXaWR0aDtcblxuICAgICAgICAvLyBTZWxlY3Rpb24gYmFja2dyb3VuZFxuICAgICAgICBjb25zdCByZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1zZWxlY3Rpb24nKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJywgJ3JhbmdlJyk7XG4gICAgICAgIHRoaXMuc3ZnLmFwcGVuZENoaWxkKHJlY3QpO1xuXG4gICAgICAgIC8vIExlZnQgaGFuZGxlXG4gICAgICAgIHRoaXMuZHJhd0hhbmRsZSh4LCAnbGVmdCcpO1xuXG4gICAgICAgIC8vIFJpZ2h0IGhhbmRsZVxuICAgICAgICB0aGlzLmRyYXdIYW5kbGUoeCArIHcsICdyaWdodCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHNlbGVjdGlvbiBoYW5kbGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcG9zaXRpb24gLSAnbGVmdCcgb3IgJ3JpZ2h0J1xuICAgICAqL1xuICAgIGRyYXdIYW5kbGUoeCwgcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3gnLCB4IC0gMyk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCA2KTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWhhbmRsZScpO1xuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCdkYXRhLWhhbmRsZScsIHBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQoaGFuZGxlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBcIk5vd1wiIGxpbmUgKHJlbGF0aXZlIHRvIHZpc2libGUgcmFuZ2UpXG4gICAgICovXG4gICAgZHJhd05vd0xpbmUoKSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuXG4gICAgICAgIC8vIE9ubHkgZHJhdyBpZiBcIm5vd1wiIGlzIHdpdGhpbiB2aXNpYmxlIHJhbmdlXG4gICAgICAgIGlmIChub3cgPCB0aGlzLnZpc2libGVSYW5nZS5zdGFydCB8fCBub3cgPiB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU1ZHVGltZWxpbmU6IHZpc2libGVEdXJhdGlvbiBpcyB6ZXJvIG9yIG5lZ2F0aXZlLCBza2lwcGluZyBub3cgbGluZSBkcmF3aW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHdpZHRoLCBwYWRkaW5nIH0gPSB0aGlzLmRpbWVuc2lvbnM7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVdpZHRoID0gd2lkdGggLSAocGFkZGluZyAqIDIpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKChub3cgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG5cbiAgICAgICAgY29uc3QgbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnbGluZScpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneDEnLCB4KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTInLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLW5vdycpO1xuICAgICAgICB0aGlzLnN2Zy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBkYXRhIGJvdW5kYXJpZXMgKHJlZCBsaW5lcyBtYXJraW5nIGFjdHVhbCBsb2cgZGF0YSByYW5nZSlcbiAgICAgKiBTaG93cyB3aGVyZSBhY3R1YWwgZGF0YSBzdGFydHMgYW5kIGVuZHMgd2l0aGluIHRoZSB2aXNpYmxlIHJhbmdlXG4gICAgICovXG4gICAgZHJhd0RhdGFCb3VuZGFyaWVzKCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBEcmF3IHN0YXJ0IGJvdW5kYXJ5IChsZWZ0IHJlZCBsaW5lKVxuICAgICAgICAvLyBJZiBmdWxsUmFuZ2Uuc3RhcnQgaXMgYmVmb3JlIHZpc2libGVSYW5nZS5zdGFydCwgZHJhdyBhdCBsZWZ0IGVkZ2VcbiAgICAgICAgLy8gSWYgZnVsbFJhbmdlLnN0YXJ0IGlzIHdpdGhpbiB2aXNpYmxlIHJhbmdlLCBkcmF3IGF0IGl0cyBwb3NpdGlvblxuICAgICAgICAvLyBJZiBmdWxsUmFuZ2Uuc3RhcnQgaXMgYWZ0ZXIgdmlzaWJsZVJhbmdlLmVuZCwgZG9uJ3QgZHJhd1xuICAgICAgICBpZiAodGhpcy5mdWxsUmFuZ2Uuc3RhcnQgPD0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICBsZXQgeFN0YXJ0O1xuICAgICAgICAgICAgaWYgKHRoaXMuZnVsbFJhbmdlLnN0YXJ0IDwgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIHN0YXJ0cyBiZWZvcmUgdmlzaWJsZSByYW5nZSAtIGRyYXcgYXQgbGVmdCBlZGdlXG4gICAgICAgICAgICAgICAgeFN0YXJ0ID0gcGFkZGluZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0YSBzdGFydHMgd2l0aGluIHZpc2libGUgcmFuZ2UgLSBkcmF3IGF0IGl0cyBwb3NpdGlvblxuICAgICAgICAgICAgICAgIHhTdGFydCA9IHBhZGRpbmcgKyAoKHRoaXMuZnVsbFJhbmdlLnN0YXJ0IC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsaW5lU3RhcnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgICAgIGxpbmVTdGFydC5zZXRBdHRyaWJ1dGUoJ3gxJywgeFN0YXJ0KTtcbiAgICAgICAgICAgIGxpbmVTdGFydC5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgICAgICBsaW5lU3RhcnQuc2V0QXR0cmlidXRlKCd4MicsIHhTdGFydCk7XG4gICAgICAgICAgICBsaW5lU3RhcnQuc2V0QXR0cmlidXRlKCd5MicsIGhlaWdodCk7XG4gICAgICAgICAgICBsaW5lU3RhcnQuc2V0QXR0cmlidXRlKCdzdHJva2UnLCAnI2RiMjgyOCcpO1xuICAgICAgICAgICAgbGluZVN0YXJ0LnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzMnKTtcbiAgICAgICAgICAgIGxpbmVTdGFydC5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS1kYXNoYXJyYXknLCAnNSwzJyk7XG4gICAgICAgICAgICBsaW5lU3RhcnQuc2V0QXR0cmlidXRlKCdvcGFjaXR5JywgJzAuOCcpO1xuICAgICAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQobGluZVN0YXJ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERyYXcgZW5kIGJvdW5kYXJ5IChyaWdodCByZWQgbGluZSlcbiAgICAgICAgLy8gSWYgZnVsbFJhbmdlLmVuZCBpcyBhZnRlciB2aXNpYmxlUmFuZ2UuZW5kLCBkcmF3IGF0IHJpZ2h0IGVkZ2VcbiAgICAgICAgLy8gSWYgZnVsbFJhbmdlLmVuZCBpcyB3aXRoaW4gdmlzaWJsZSByYW5nZSwgZHJhdyBhdCBpdHMgcG9zaXRpb25cbiAgICAgICAgLy8gSWYgZnVsbFJhbmdlLmVuZCBpcyBiZWZvcmUgdmlzaWJsZVJhbmdlLnN0YXJ0LCBkb24ndCBkcmF3XG4gICAgICAgIGlmICh0aGlzLmZ1bGxSYW5nZS5lbmQgPj0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgIGxldCB4RW5kO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnVsbFJhbmdlLmVuZCA+IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgZW5kcyBhZnRlciB2aXNpYmxlIHJhbmdlIC0gZHJhdyBhdCByaWdodCBlZGdlXG4gICAgICAgICAgICAgICAgeEVuZCA9IHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0YSBlbmRzIHdpdGhpbiB2aXNpYmxlIHJhbmdlIC0gZHJhdyBhdCBpdHMgcG9zaXRpb25cbiAgICAgICAgICAgICAgICB4RW5kID0gcGFkZGluZyArICgodGhpcy5mdWxsUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsaW5lRW5kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgICAgICBsaW5lRW5kLnNldEF0dHJpYnV0ZSgneDEnLCB4RW5kKTtcbiAgICAgICAgICAgIGxpbmVFbmQuc2V0QXR0cmlidXRlKCd5MScsIDApO1xuICAgICAgICAgICAgbGluZUVuZC5zZXRBdHRyaWJ1dGUoJ3gyJywgeEVuZCk7XG4gICAgICAgICAgICBsaW5lRW5kLnNldEF0dHJpYnV0ZSgneTInLCBoZWlnaHQpO1xuICAgICAgICAgICAgbGluZUVuZC5zZXRBdHRyaWJ1dGUoJ3N0cm9rZScsICcjZGIyODI4Jyk7XG4gICAgICAgICAgICBsaW5lRW5kLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzMnKTtcbiAgICAgICAgICAgIGxpbmVFbmQuc2V0QXR0cmlidXRlKCdzdHJva2UtZGFzaGFycmF5JywgJzUsMycpO1xuICAgICAgICAgICAgbGluZUVuZC5zZXRBdHRyaWJ1dGUoJ29wYWNpdHknLCAnMC44Jyk7XG4gICAgICAgICAgICB0aGlzLnN2Zy5hcHBlbmRDaGlsZChsaW5lRW5kKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZXN0YW1wIHRvIHRpbWUgc3RyaW5nIChzZXJ2ZXIgdGltZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gVVRDXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIEZvcm1hdCB0eXBlOiAnSEg6TU06U1MnLCAnSEg6TU0nLCBvciAnTU0tREQnXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHRpbWUvZGF0ZSBpbiBzZXJ2ZXIgdGltZXpvbmVcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKHRpbWVzdGFtcCwgZm9ybWF0ID0gJ0hIOk1NJykge1xuICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmcm9tIFVUQyB0aW1lc3RhbXAsIHRoZW4gYWRkIHNlcnZlciBvZmZzZXQgdG8gZ2V0IG1pbGxpc2Vjb25kc1xuICAgICAgICAvLyBzZXJ2ZXJUaW1lem9uZU9mZnNldCBpcyBpbiBzZWNvbmRzLCB0aW1lc3RhbXAgaXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZXJ2ZXJUaW1lTXMgPSAodGltZXN0YW1wICsgdGhpcy5zZXJ2ZXJUaW1lem9uZU9mZnNldCkgKiAxMDAwO1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoc2VydmVyVGltZU1zKTtcblxuICAgICAgICBpZiAoZm9ybWF0ID09PSAnTU0tREQnKSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgYXMgbW9udGgtZGF5IGZvciBsb25nIHJhbmdlc1xuICAgICAgICAgICAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRVVENNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldFVUQ0RhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIHJldHVybiBgJHttb250aH0tJHtkYXl9YDtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQgPT09ICdISDpNTTpTUycpIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBhcyB0aW1lIHdpdGggc2Vjb25kcyBmb3IgdmVyeSBzaG9ydCByYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZGF0ZS5nZXRVVENNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBzZWNvbmRzID0gU3RyaW5nKGRhdGUuZ2V0VVRDU2Vjb25kcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9OiR7c2Vjb25kc31gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGFzIHRpbWUgKEhIOk1NKSBmb3Igc2hvcnRlciByYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZGF0ZS5nZXRVVENNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc31gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBtb3VzZSBldmVudHNcbiAgICAgKi9cbiAgICBhdHRhY2hFdmVudHMoKSB7XG4gICAgICAgIHRoaXMuc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIChlKSA9PiB0aGlzLmhhbmRsZU1vdXNlRG93bihlKSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChlKSA9PiB0aGlzLmhhbmRsZU1vdXNlTW92ZShlKSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoKSA9PiB0aGlzLmhhbmRsZU1vdXNlVXAoKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBtb3VzZSBkb3duXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVNb3VzZURvd24oZSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS1oYW5kbGUnKTtcblxuICAgICAgICBpZiAoIWhhbmRsZSkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5oYW5kbGUgPSBoYW5kbGU7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuc3RhcnRYID0gZS5jbGllbnRYO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRTdGFydCA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydDtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkRW5kID0gdGhpcy5zZWxlY3RlZFJhbmdlLmVuZDtcblxuICAgICAgICBjb25zdCByZWN0ID0gdGhpcy5jb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyTGVmdCA9IHJlY3QubGVmdDtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5jb250YWluZXJXaWR0aCA9IHJlY3Qud2lkdGg7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgbW92ZSAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge01vdXNlRXZlbnR9IGUgLSBNb3VzZSBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZU1vdXNlTW92ZShlKSB7XG4gICAgICAgIGlmICghdGhpcy5kcmFnZ2luZy5hY3RpdmUpIHJldHVybjtcblxuICAgICAgICBjb25zdCBkZWx0YVggPSBlLmNsaWVudFggLSB0aGlzLmRyYWdnaW5nLnN0YXJ0WDtcbiAgICAgICAgY29uc3QgeyBwYWRkaW5nIH0gPSB0aGlzLmRpbWVuc2lvbnM7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVdpZHRoID0gdGhpcy5kcmFnZ2luZy5jb250YWluZXJXaWR0aCAtIChwYWRkaW5nICogMik7XG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgIC8vIFNhZmV0eSBjaGVjazogcHJldmVudCBkaXZpc2lvbiBieSB6ZXJvXG4gICAgICAgIGlmICh2aXNpYmxlRHVyYXRpb24gPD0gMCB8fCBhdmFpbGFibGVXaWR0aCA8PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1NWR1RpbWVsaW5lOiBJbnZhbGlkIGRpbWVuc2lvbnMgZm9yIG1vdXNlIG1vdmUgY2FsY3VsYXRpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGRlbHRhIHJlbGF0aXZlIHRvIFZJU0lCTEUgcmFuZ2VcbiAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gKGRlbHRhWCAvIGF2YWlsYWJsZVdpZHRoKSAqIHZpc2libGVEdXJhdGlvbjtcblxuICAgICAgICBpZiAodGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgLy8gUmVzaXppbmcgZnJvbSBsZWZ0IC0gYWxsb3cgZnJlZSBtb3ZlbWVudFxuICAgICAgICAgICAgbGV0IG5ld1N0YXJ0ID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkU3RhcnQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICAvLyBPbmx5IGVuZm9yY2UgbWluaW11bSB3aWR0aCBvZiA2MCBzZWNvbmRzXG4gICAgICAgICAgICBuZXdTdGFydCA9IE1hdGgubWluKG5ld1N0YXJ0LCB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gNjApO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gbmV3U3RhcnQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgIC8vIFJlc2l6aW5nIGZyb20gcmlnaHQgLSBhbGxvdyBmcmVlIG1vdmVtZW50XG4gICAgICAgICAgICBsZXQgbmV3RW5kID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkRW5kICsgZGVsdGFUaW1lO1xuICAgICAgICAgICAgLy8gT25seSBlbmZvcmNlIG1pbmltdW0gd2lkdGggb2YgNjAgc2Vjb25kc1xuICAgICAgICAgICAgbmV3RW5kID0gTWF0aC5tYXgobmV3RW5kLCB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgKyA2MCk7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gbmV3RW5kO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmFuZ2UnKSB7XG4gICAgICAgICAgICAvLyBEcmFnZ2luZyBlbnRpcmUgcmFuZ2UgLSBhbGxvdyBmcmVlIG1vdmVtZW50XG4gICAgICAgICAgICBsZXQgbmV3U3RhcnQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRTdGFydCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIGxldCBuZXdFbmQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRFbmQgKyBkZWx0YVRpbWU7XG5cbiAgICAgICAgICAgIC8vIE5vIGJvdW5kcyBjaGVja2luZyAtIGFsbG93IGRyYWdnaW5nIGFueXdoZXJlXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSBuZXdTdGFydDtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBuZXdFbmQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgdXAgKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQWZ0ZXIgZHJhZzogcHJlc2VydmUgdXNlcidzIG1hbnVhbCBzZWxlY3Rpb24gYW5kIGFkanVzdCB2aXNpYmxlIHJhbmdlXG4gICAgICovXG4gICAgaGFuZGxlTW91c2VVcCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcuYWN0aXZlKSB7XG4gICAgICAgICAgICBjb25zdCB3YXNSZXNpemluZyA9IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAnbGVmdCcgfHwgdGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdyaWdodCc7XG4gICAgICAgICAgICBjb25zdCB3YXNEcmFnZ2luZyA9IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmFuZ2UnO1xuXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5kcmFnZ2luZy5oYW5kbGUgPSBudWxsO1xuXG4gICAgICAgICAgICBjb25zdCBoYW5kbGVUeXBlID0gd2FzUmVzaXppbmcgPyAodGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICdyaWdodCcpIDogJ3JhbmdlJztcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ/CflrHvuI8gU1ZHVGltZWxpbmUuaGFuZGxlTW91c2VVcCgpIC0gJyArICh3YXNSZXNpemluZyA/ICdyZXNpemUnIDogJ2RyYWcnKSArICcgaGFuZGxlOiAnICsgaGFuZGxlVHlwZSk7XG5cbiAgICAgICAgICAgIGlmICh3YXNSZXNpemluZykge1xuICAgICAgICAgICAgICAgIC8vIFVzZXIgcmVzaXplZCBzZWxlY3Rpb24g4oaSIGFkanVzdCB2aXNpYmxlIHJhbmdlIHRvIGJlIDR4IHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIC8vIFBSRVNFUlZFIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIChkbyBOT1QgcmVjYWxjdWxhdGUgaXQhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVEdXJhdGlvbiA9IHNlbGVjdGVkRHVyYXRpb24gKiA0O1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgdmlzaWJsZSByYW5nZSBjZW50ZXJlZCBvbiBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBOT1RFOiBBbGxvdyB2aXNpYmxlUmFuZ2UgdG8gZXh0ZW5kIEJFWU9ORCBmdWxsUmFuZ2UgdG8gbWFpbnRhaW4gMS80IHJhdGlvXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmlzaWJsZVN0YXJ0ID0gc2VsZWN0ZWRDZW50ZXIgLSAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmlzaWJsZUVuZCA9IHNlbGVjdGVkQ2VudGVyICsgKG5ld1Zpc2libGVEdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gbmV3VmlzaWJsZUVuZDtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ+KGlO+4jyBVc2VyIFJFU0laRUQgc2VsZWN0aW9uOiAnICtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICAgICAgICAgJyAoJyArIE1hdGgucm91bmQoc2VsZWN0ZWREdXJhdGlvbikgKyAncyknKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBDYWxjdWxhdGVkIHZpc2libGVSYW5nZSAoNHgpOiAnICtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKG5ld1Zpc2libGVTdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKG5ld1Zpc2libGVFbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICAgICAgICAgJyAoJyArIE1hdGgucm91bmQobmV3VmlzaWJsZUR1cmF0aW9uKSArICdzKScpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJyAgIEV4dGVuZHMgYmV5b25kIGZ1bGxSYW5nZT8gYmVmb3JlPScgK1xuICAgICAgICAgICAgICAgICAgICAobmV3VmlzaWJsZVN0YXJ0IDwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpICtcbiAgICAgICAgICAgICAgICAgICAgJyBhZnRlcj0nICsgKG5ld1Zpc2libGVFbmQgPiB0aGlzLmZ1bGxSYW5nZS5lbmQpKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBmdWxsUmFuZ2UgYm91bmRzOiAnICtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuZnVsbFJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5mdWxsUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEbyBOT1QgY2FsbCBjYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpIGhlcmUhXG4gICAgICAgICAgICAgICAgLy8gVGhlIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIChlLmcuLCA5OjQ1LTk6NTApIG11c3QgYmUgcHJlc2VydmVkXG5cbiAgICAgICAgICAgICAgICAvLyBEZWFjdGl2YXRlIGFsbCBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgJCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdhc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciBkcmFnZ2VkIHNlbGVjdGlvbiDihpIgc2hpZnQgdmlzaWJsZSByYW5nZSB0byBrZWVwIHNlbGVjdGlvbiBjZW50ZXJlZFxuICAgICAgICAgICAgICAgIC8vIFBSRVNFUlZFIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIChkbyBOT1QgcmVjYWxjdWxhdGUgaXQhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIHRvIGtlZXAgc2VsZWN0aW9uIGF0IGNlbnRlclxuICAgICAgICAgICAgICAgIC8vIE5PVEU6IEFsbG93IHZpc2libGVSYW5nZSB0byBleHRlbmQgQkVZT05EIGZ1bGxSYW5nZVxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVTdGFydCA9IHNlbGVjdGVkQ2VudGVyIC0gKHZpc2libGVEdXJhdGlvbiAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3VmlzaWJsZVN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCfihpTvuI8gVXNlciBEUkFHR0VEIHNlbGVjdGlvbjogJyArXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQsICdISDpNTTpTUycpICsgJyDihpIgJyArXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnICAgU2hpZnRlZCB2aXNpYmxlUmFuZ2U6ICcgK1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUobmV3VmlzaWJsZVN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUobmV3VmlzaWJsZUVuZCwgJ0hIOk1NOlNTJykpO1xuXG4gICAgICAgICAgICAgICAgLy8gRG8gTk9UIGNhbGwgY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKSBoZXJlIVxuICAgICAgICAgICAgICAgIC8vIFRoZSB1c2VyJ3MgbWFudWFsIHNlbGVjdGlvbiBtdXN0IGJlIHByZXNlcnZlZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZW5kZXIgd2l0aCBuZXcgcmFuZ2VzXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgICAgICAvLyBERUJVRzogU2hvdyBmaW5hbCBzdGF0ZSBhZnRlciByZW5kZXJcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ/Cfk4ogRklOQUwgc3RhdGUgYWZ0ZXIgbW91c2UgaW50ZXJhY3Rpb246Jyk7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBmdWxsUmFuZ2U6ICcgK1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLmZ1bGxSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5mdWxsUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSArXG4gICAgICAgICAgICAgICAgJyAoJyArIE1hdGgucm91bmQodGhpcy5mdWxsUmFuZ2UuZW5kIC0gdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpICsgJ3MpJyk7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCcgICB2aXNpYmxlUmFuZ2U6ICcgK1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnZpc2libGVSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy52aXNpYmxlUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSArXG4gICAgICAgICAgICAgICAgJyAoJyArIE1hdGgucm91bmQodGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpICsgJ3MpJyArXG4gICAgICAgICAgICAgICAgJyBleHRlbmRzOiBiZWZvcmU9JyArICh0aGlzLnZpc2libGVSYW5nZS5zdGFydCA8IHRoaXMuZnVsbFJhbmdlLnN0YXJ0KSArXG4gICAgICAgICAgICAgICAgJyBhZnRlcj0nICsgKHRoaXMudmlzaWJsZVJhbmdlLmVuZCA+IHRoaXMuZnVsbFJhbmdlLmVuZCkpO1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnICAgc2VsZWN0ZWRSYW5nZTogJyArXG4gICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCwgJ0hIOk1NOlNTJykgK1xuICAgICAgICAgICAgICAgICcgKCcgKyBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQpICsgJ3MpJyArXG4gICAgICAgICAgICAgICAgJyByYXRpbz0nICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSAvICh0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgKiAxMDApLnRvRml4ZWQoMSkgKyAnJScpO1xuXG4gICAgICAgICAgICAvLyBERUJVRzogU2hvdyB3aGF0IHdlJ3JlIHNlbmRpbmcgdG8gYmFja2VuZFxuICAgICAgICAgICAgY29uc29sZS5kZWJ1Zygn8J+TpCBTRU5ESU5HIHRvIGJhY2tlbmQ6ICcgK1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQsICdISDpNTTpTUycpICsgJyDihpIgJyArXG4gICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICAgICAnICgnICsgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSArICdzKScgK1xuICAgICAgICAgICAgICAgICcgW3RpbWVzdGFtcHM6ICcgKyBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCkgKyAnIC0gJyArIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCkgKyAnXScpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNhbGxiYWNrIHRvIGxvYWQgZGF0YSB3aXRoIHVzZXIncyBBQ1RVQUwgc2VsZWN0ZWQgcmFuZ2VcbiAgICAgICAgICAgIGlmICh0aGlzLm9uUmFuZ2VDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uUmFuZ2VDaGFuZ2UoXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHdpbmRvdyByZXNpemVcbiAgICAgKi9cbiAgICBoYW5kbGVSZXNpemUoKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHBlcmlvZCBmcm9tIHF1aWNrLXBlcmlvZC1idXR0b25zIChZYW5kZXggQ2xvdWQgc3R5bGUpXG4gICAgICogU2V0cyB2aXNpYmxlIHJhbmdlIGFuZCBhdXRvLWNlbnRlcnMgc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZFNlY29uZHMgLSBQZXJpb2QgaW4gc2Vjb25kcyAoZS5nLiwgMzYwMCBmb3IgMWgpXG4gICAgICovXG4gICAgYXBwbHlQZXJpb2QocGVyaW9kU2Vjb25kcykge1xuICAgICAgICBjb25zdCBwZXJpb2QgPSBwYXJzZUludChwZXJpb2RTZWNvbmRzKTtcblxuICAgICAgICBjb25zdCBwZXJpb2RMYWJlbCA9IHBlcmlvZCA+PSA4NjQwMCA/IChwZXJpb2QgLyA4NjQwMCkgKyAnZCcgOiBwZXJpb2QgPj0gMzYwMCA/IChwZXJpb2QgLyAzNjAwKSArICdoJyA6IChwZXJpb2QgLyA2MCkgKyAnbSc7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ+KPse+4jyBVc2VyIGNsaWNrZWQgcGVyaW9kIGJ1dHRvbjogJyArIHBlcmlvZExhYmVsICsgJyAoJyArIHBlcmlvZCArICdzKScpO1xuXG4gICAgICAgIC8vIFNldCB2aXNpYmxlIHJhbmdlIHRvIGxhc3QgTiBzZWNvbmRzXG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IHRoaXMuZnVsbFJhbmdlLmVuZDtcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBNYXRoLm1heCh0aGlzLmZ1bGxSYW5nZS5lbmQgLSBwZXJpb2QsIHRoaXMuZnVsbFJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAvLyBBdXRvLWNlbnRlciBzZWxlY3Rpb24gKDEvNCBvZiB2aXNpYmxlIHJhbmdlKVxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgY29uc29sZS5kZWJ1Zygn8J+TkCBQZXJpb2QgYXBwbGllZCwgdmlzaWJsZVJhbmdlOiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnZpc2libGVSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnZpc2libGVSYW5nZS5lbmQsICdISDpNTTpTUycpKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnICAgQXV0by1jZW50ZXJlZCBzZWxlY3Rpb24gKDEvNCk6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSk7XG5cbiAgICAgICAgLy8gUmVuZGVyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgY29uc29sZS5kZWJ1Zygn8J+TiiBGSU5BTCBzdGF0ZSBhZnRlciBwZXJpb2QgYnV0dG9uOicpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBmdWxsUmFuZ2U6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuZnVsbFJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuZnVsbFJhbmdlLmVuZCwgJ0hIOk1NOlNTJykpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCcgICB2aXNpYmxlUmFuZ2U6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMudmlzaWJsZVJhbmdlLmVuZCwgJ0hIOk1NOlNTJykpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBzZWxlY3RlZFJhbmdlOiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQsICdISDpNTTpTUycpICsgJyDihpIgJyArXG4gICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCwgJ0hIOk1NOlNTJykgK1xuICAgICAgICAgICAgJyByYXRpbz0nICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSAvICh0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgKiAxMDApLnRvRml4ZWQoMSkgKyAnJScpO1xuXG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ/Cfk6QgU0VORElORyB0byBiYWNrZW5kIChwZXJpb2QgYnV0dG9uKTogJyArXG4gICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICcgW3RpbWVzdGFtcHM6ICcgKyBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCkgKyAnIC0gJyArIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCkgKyAnXScpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2FsbGJhY2sgdG8gbG9hZCBkYXRhXG4gICAgICAgIGlmICh0aGlzLm9uUmFuZ2VDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMub25SYW5nZUNoYW5nZShcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCksXG4gICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgc2VsZWN0ZWQgcmFuZ2UgKGRlcHJlY2F0ZWQgLSB1c2UgYXBwbHlQZXJpb2QgaW5zdGVhZClcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIHNldFJhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGEgKHdpdGhvdXQgdHJpZ2dlcmluZyBvblJhbmdlQ2hhbmdlKVxuICAgICAqIFVzZWQgd2hlbiBiYWNrZW5kIHJldHVybnMgZGlmZmVyZW50IHJhbmdlIGR1ZSB0byA1MDAwIGxpbmUgbGltaXRcbiAgICAgKiBTeW5jaHJvbm91c2x5IHVwZGF0ZXMgYm90aCB2aXNpYmxlIHJhbmdlIGFuZCBzZWxlY3RlZCByYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBBY3R1YWwgc3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEFjdHVhbCBlbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgdXBkYXRlU2VsZWN0ZWRSYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ/Cfk6UgUkVDRUlWRUQgZnJvbSBiYWNrZW5kOiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZShzdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZShlbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICcgKCcgKyBNYXRoLnJvdW5kKGVuZCAtIHN0YXJ0KSArICdzKScgK1xuICAgICAgICAgICAgJyBbdGltZXN0YW1wczogJyArIHN0YXJ0ICsgJyAtICcgKyBlbmQgKyAnXScpO1xuXG4gICAgICAgIC8vIEVuc3VyZSBtaW5pbXVtIGR1cmF0aW9uIHRvIHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBjb25zdCBNSU5fRFVSQVRJT04gPSA2MDsgLy8gMSBtaW51dGUgbWluaW11bVxuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ+KaoO+4jyBEdXJhdGlvbiB0b28gc2hvcnQsIGV4cGFuZGluZyB0byBNSU5fRFVSQVRJT04nLCB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWw6IE1hdGgucm91bmQoZW5kIC0gc3RhcnQpICsgJ3MnLFxuICAgICAgICAgICAgICAgIGV4cGFuZGVkOiBNSU5fRFVSQVRJT04gKyAncydcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBFeHBhbmQgcmFuZ2Ugc3ltbWV0cmljYWxseSBhcm91bmQgdGhlIHNpbmdsZSB0aW1lc3RhbXBcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IHN0YXJ0O1xuICAgICAgICAgICAgc3RhcnQgPSBjZW50ZXIgLSAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgICAgICBlbmQgPSBjZW50ZXIgKyAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgcmFuZ2UgdG8gYWN0dWFsIGxvYWRlZCBkYXRhXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gZW5kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgdmlzaWJsZSByYW5nZSBhcyA0eCBvZiBzZWxlY3RlZCByYW5nZVxuICAgICAgICBjb25zdCBzZWxlY3RlZER1cmF0aW9uID0gZW5kIC0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IG5ld1Zpc2libGVEdXJhdGlvbiA9IHNlbGVjdGVkRHVyYXRpb24gKiA0O1xuICAgICAgICBjb25zdCBzZWxlY3RlZENlbnRlciA9IHN0YXJ0ICsgKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBDZW50ZXIgdmlzaWJsZSByYW5nZSBhcm91bmQgc2VsZWN0ZWQgcmFuZ2VcbiAgICAgICAgLy8gTk9URTogdmlzaWJsZVJhbmdlIGNhbiBleHRlbmQgQkVZT05EIGZ1bGxSYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgICAgLy8gVGhpcyBjcmVhdGVzIGVtcHR5IHNwYWNlIGFyb3VuZCB0aGUgYWN0dWFsIGRhdGFcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZVN0YXJ0ID0gc2VsZWN0ZWRDZW50ZXIgLSAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG4gICAgICAgIGNvbnN0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBVcGRhdGUgdmlzaWJsZSByYW5nZSAobm8gYm91bmRzIGNoZWNrIC0gYWxsb3cgZXh0ZW5kaW5nIGJleW9uZCBmdWxsUmFuZ2UpXG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3VmlzaWJsZVN0YXJ0O1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBuZXdWaXNpYmxlRW5kO1xuXG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ/CflIQgQmFja2VuZCBkYXRhIHN5bmNlZCwgc2VsZWN0ZWRSYW5nZTogJyArXG4gICAgICAgICAgICB0aGlzLmZvcm1hdFRpbWUodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQsICdISDpNTTpTUycpICtcbiAgICAgICAgICAgICcgKCcgKyBNYXRoLnJvdW5kKHNlbGVjdGVkRHVyYXRpb24pICsgJ3MpJyk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJyAgIENhbGN1bGF0ZWQgdmlzaWJsZVJhbmdlICg0eCk6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKG5ld1Zpc2libGVTdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZShuZXdWaXNpYmxlRW5kLCAnSEg6TU06U1MnKSArXG4gICAgICAgICAgICAnICgnICsgTWF0aC5yb3VuZChuZXdWaXNpYmxlRHVyYXRpb24pICsgJ3MpJyk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJyAgIEV4dGVuZHMgYmV5b25kIGZ1bGxSYW5nZT8gYmVmb3JlPScgK1xuICAgICAgICAgICAgKG5ld1Zpc2libGVTdGFydCA8IHRoaXMuZnVsbFJhbmdlLnN0YXJ0KSArXG4gICAgICAgICAgICAnIGFmdGVyPScgKyAobmV3VmlzaWJsZUVuZCA+IHRoaXMuZnVsbFJhbmdlLmVuZCkpO1xuXG4gICAgICAgIC8vIE5vdGU6IERvIE5PVCByZWNhbGN1bGF0ZSBzZWxlY3RlZFJhbmdlIGhlcmUhXG4gICAgICAgIC8vIHNlbGVjdGVkUmFuZ2UgaXMgYWxyZWFkeSBzZXQgZnJvbSBiYWNrZW5kJ3MgYWN0dWFsIGRhdGEgKGxpbmVzIDQ5My00OTQpXG4gICAgICAgIC8vIGFuZCBzaG91bGQgcmVtYWluIGZpeGVkIHRvIG1hdGNoIHRoZSByZWFsIGxvYWRlZCBkYXRhIHJhbmdlXG5cbiAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ/Cfk4ogRklOQUwgc3RhdGUgYWZ0ZXIgYmFja2VuZCBzeW5jOicpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCcgICBmdWxsUmFuZ2U6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuZnVsbFJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuZnVsbFJhbmdlLmVuZCwgJ0hIOk1NOlNTJykpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCcgICB2aXNpYmxlUmFuZ2U6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0LCAnSEg6TU06U1MnKSArICcg4oaSICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMudmlzaWJsZVJhbmdlLmVuZCwgJ0hIOk1NOlNTJykgK1xuICAgICAgICAgICAgJyBleHRlbmRzOiBiZWZvcmU9JyArICh0aGlzLnZpc2libGVSYW5nZS5zdGFydCA8IHRoaXMuZnVsbFJhbmdlLnN0YXJ0KSArXG4gICAgICAgICAgICAnIGFmdGVyPScgKyAodGhpcy52aXNpYmxlUmFuZ2UuZW5kID4gdGhpcy5mdWxsUmFuZ2UuZW5kKSk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJyAgIHNlbGVjdGVkUmFuZ2U6ICcgK1xuICAgICAgICAgICAgdGhpcy5mb3JtYXRUaW1lKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCwgJ0hIOk1NOlNTJykgKyAnIOKGkiAnICtcbiAgICAgICAgICAgIHRoaXMuZm9ybWF0VGltZSh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kLCAnSEg6TU06U1MnKSArXG4gICAgICAgICAgICAnIHJhdGlvPScgKyAoKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQpIC8gKHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAqIDEwMCkudG9GaXhlZCgxKSArICclJyk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9lcyBOT1QgdHJpZ2dlciBvblJhbmdlQ2hhbmdlIGNhbGxiYWNrXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIHdoZW4gcmFuZ2UgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgb25SYW5nZUNoYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB0aW1lbGluZVxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIl19