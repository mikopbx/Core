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
    this.fullRange.end = timeRange.end;
    this.dimensions.width = this.container.offsetWidth; // Determine initial visible range based on total duration

    var totalDuration = timeRange.end - timeRange.start;
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
    } // Set visible range (what user sees on timeline)


    this.visibleRange.end = timeRange.end;
    this.visibleRange.start = Math.max(timeRange.end - initialVisibleDuration, timeRange.start); // Calculate selected range as 1/4 of visible range, centered

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

    this.drawNowLine(); // Draw selection range last (foreground layer)

    this.drawSelection();
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

    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Get adaptive step based on VISIBLE duration and available width

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
    var availableWidth = width - padding * 2; // Calculate position relative to VISIBLE range

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
    var visibleDuration = this.visibleRange.end - this.visibleRange.start;
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
    var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Calculate time delta relative to VISIBLE range

    var deltaTime = deltaX / availableWidth * visibleDuration;

    if (this.dragging.handle === 'left') {
      // Resizing from left - adjust visible range accordingly
      var newStart = this.dragging.startSelectedStart + deltaTime;
      newStart = Math.max(this.fullRange.start, Math.min(newStart, this.selectedRange.end - 60));
      this.selectedRange.start = newStart;
    } else if (this.dragging.handle === 'right') {
      // Resizing from right - adjust visible range accordingly
      var newEnd = this.dragging.startSelectedEnd + deltaTime;
      newEnd = Math.min(this.fullRange.end, Math.max(newEnd, this.selectedRange.start + 60));
      this.selectedRange.end = newEnd;
    } else if (this.dragging.handle === 'range') {
      // Dragging entire range - move it within visible range
      var rangeWidth = this.selectedRange.end - this.selectedRange.start;

      var _newStart = this.dragging.startSelectedStart + deltaTime;

      var _newEnd = this.dragging.startSelectedEnd + deltaTime; // Keep within full range bounds


      if (_newStart < this.fullRange.start) {
        _newStart = this.fullRange.start;
        _newEnd = _newStart + rangeWidth;
      } else if (_newEnd > this.fullRange.end) {
        _newEnd = this.fullRange.end;
        _newStart = _newEnd - rangeWidth;
      }

      this.selectedRange.start = _newStart;
      this.selectedRange.end = _newEnd;
    }

    this.render();
  },

  /**
   * Handle mouse up (Yandex Cloud LogViewer style)
   * After drag: recenter and adjust visible range
   */
  handleMouseUp: function handleMouseUp() {
    if (this.dragging.active) {
      var wasResizing = this.dragging.handle === 'left' || this.dragging.handle === 'right';
      var wasDragging = this.dragging.handle === 'range';
      this.dragging.active = false;
      this.dragging.handle = null;

      if (wasResizing) {
        // User resized selection → adjust visible range to be 4x selection
        // and recenter selection within new visible range
        var selectedDuration = this.selectedRange.end - this.selectedRange.start;
        var newVisibleDuration = selectedDuration * 4;
        var selectedCenter = this.selectedRange.start + selectedDuration / 2; // Calculate new visible range centered on selection

        var newVisibleStart = selectedCenter - newVisibleDuration / 2;
        var newVisibleEnd = selectedCenter + newVisibleDuration / 2; // Keep within full range bounds

        if (newVisibleStart < this.fullRange.start) {
          newVisibleStart = this.fullRange.start;
          newVisibleEnd = Math.min(newVisibleStart + newVisibleDuration, this.fullRange.end);
        }

        if (newVisibleEnd > this.fullRange.end) {
          newVisibleEnd = this.fullRange.end;
          newVisibleStart = Math.max(newVisibleEnd - newVisibleDuration, this.fullRange.start);
        }

        this.visibleRange.start = newVisibleStart;
        this.visibleRange.end = newVisibleEnd; // Recalculate centered selection (1/4 of new visible range)

        this.calculateCenteredSelection(); // Deactivate all period buttons

        if (typeof $ !== 'undefined') {
          $('.period-btn').removeClass('active');
        }
      } else if (wasDragging) {
        // User dragged selection → shift visible range to keep selection centered
        var _selectedCenter = this.selectedRange.start + (this.selectedRange.end - this.selectedRange.start) / 2;

        var visibleDuration = this.visibleRange.end - this.visibleRange.start; // Calculate new visible range to keep selection at center

        var _newVisibleStart = _selectedCenter - visibleDuration / 2;

        var _newVisibleEnd = _selectedCenter + visibleDuration / 2; // Keep within full range bounds


        if (_newVisibleStart < this.fullRange.start) {
          _newVisibleStart = this.fullRange.start;
          _newVisibleEnd = _newVisibleStart + visibleDuration;
        }

        if (_newVisibleEnd > this.fullRange.end) {
          _newVisibleEnd = this.fullRange.end;
          _newVisibleStart = _newVisibleEnd - visibleDuration;
        }

        this.visibleRange.start = _newVisibleStart;
        this.visibleRange.end = _newVisibleEnd; // Recalculate centered selection

        this.calculateCenteredSelection();
      } // Render with new ranges


      this.render(); // Trigger callback to load data

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
    var period = parseInt(periodSeconds); // Set visible range to last N seconds

    this.visibleRange.end = this.fullRange.end;
    this.visibleRange.start = Math.max(this.fullRange.end - period, this.fullRange.start); // Auto-center selection (1/4 of visible range)

    this.calculateCenteredSelection(); // Render

    this.render(); // Trigger callback to load data

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
    // Set selected range to actual loaded data
    this.selectedRange.start = start;
    this.selectedRange.end = end; // Calculate new visible range as 4x of selected range

    var selectedDuration = end - start;
    var newVisibleDuration = selectedDuration * 4;
    var selectedCenter = start + selectedDuration / 2; // Center visible range around selected range

    var newVisibleStart = selectedCenter - newVisibleDuration / 2;
    var newVisibleEnd = selectedCenter + newVisibleDuration / 2; // Keep within full range bounds

    if (newVisibleStart < this.fullRange.start) {
      newVisibleStart = this.fullRange.start;
      newVisibleEnd = Math.min(newVisibleStart + newVisibleDuration, this.fullRange.end);
    }

    if (newVisibleEnd > this.fullRange.end) {
      newVisibleEnd = this.fullRange.end;
      newVisibleStart = Math.max(newVisibleEnd - newVisibleDuration, this.fullRange.start);
    } // Update visible range


    this.visibleRange.start = newVisibleStart;
    this.visibleRange.end = newVisibleEnd; // Recalculate centered selection to ensure 1/4 ratio is maintained

    this.calculateCenteredSelection(); // Render with new ranges

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXN2Zy10aW1lbGluZS5qcyJdLCJuYW1lcyI6WyJTVkdUaW1lbGluZSIsImNvbnRhaW5lciIsInN2ZyIsImZ1bGxSYW5nZSIsInN0YXJ0IiwiZW5kIiwidmlzaWJsZVJhbmdlIiwic2VsZWN0ZWRSYW5nZSIsInNlcnZlclRpbWV6b25lT2Zmc2V0IiwiZGltZW5zaW9ucyIsIndpZHRoIiwiaGVpZ2h0IiwicGFkZGluZyIsImRyYWdnaW5nIiwiYWN0aXZlIiwiaGFuZGxlIiwic3RhcnRYIiwic3RhcnRTZWxlY3RlZFN0YXJ0Iiwic3RhcnRTZWxlY3RlZEVuZCIsImluaXRpYWxpemUiLCJ0aW1lUmFuZ2UiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJjb25zb2xlIiwiZXJyb3IiLCJvZmZzZXRXaWR0aCIsInRvdGFsRHVyYXRpb24iLCJpbml0aWFsVmlzaWJsZUR1cmF0aW9uIiwiTWF0aCIsIm1heCIsImNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uIiwiY3JlYXRlU1ZHIiwicmVuZGVyIiwiYXR0YWNoRXZlbnRzIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImhhbmRsZVJlc2l6ZSIsInZpc2libGVEdXJhdGlvbiIsInNlbGVjdGVkRHVyYXRpb24iLCJ2aXNpYmxlQ2VudGVyIiwiY2FsY3VsYXRlQWRhcHRpdmVTdGVwIiwiZHVyYXRpb24iLCJhdmFpbGFibGVXaWR0aCIsInN0ZXBzIiwidmFsdWUiLCJsYWJlbCIsImZvcm1hdCIsIm1pblNwYWNpbmdQeCIsIm1heExhYmVscyIsImZsb29yIiwidGFyZ2V0TWluTGFiZWxzIiwibWluIiwidGFyZ2V0TWF4TGFiZWxzIiwiaSIsImxlbmd0aCIsIm51bUxhYmVscyIsImJlc3RTdGVwIiwiYmVzdERpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJjcmVhdGVFbGVtZW50TlMiLCJzZXRBdHRyaWJ1dGUiLCJpbm5lckhUTUwiLCJhcHBlbmRDaGlsZCIsImRyYXdUaWNrcyIsImRyYXdOb3dMaW5lIiwiZHJhd1NlbGVjdGlvbiIsInN0ZXAiLCJyb3VuZGVkU3RhcnQiLCJtYWpvclRpY2tQb3NpdGlvbnMiLCJTZXQiLCJ0aW1lc3RhbXAiLCJ4IiwiYWRkIiwicm91bmQiLCJkcmF3VGljayIsImRyYXdMYWJlbCIsImZvcm1hdFRpbWUiLCJtaW5vclRpbWVzdGFtcCIsIm1pbm9yU3RlcCIsInJvdW5kZWRNaW5vclRpbWVzdGFtcCIsImhhcyIsInkiLCJjb2xvciIsImxpbmUiLCJ0ZXh0IiwiYmJveCIsImdldFRleHRCQm94IiwiYmciLCJ0ZXh0Q29udGVudCIsImZvbnRTaXplIiwiY2hhcldpZHRoIiwiaW5jbHVkZXMiLCJsZWZ0UGVyY2VudCIsInJpZ2h0UGVyY2VudCIsIndpZHRoUGVyY2VudCIsInciLCJyZWN0IiwiZHJhd0hhbmRsZSIsInBvc2l0aW9uIiwibm93IiwiRGF0ZSIsInNlcnZlclRpbWVNcyIsImRhdGUiLCJtb250aCIsIlN0cmluZyIsImdldFVUQ01vbnRoIiwicGFkU3RhcnQiLCJkYXkiLCJnZXRVVENEYXRlIiwiaG91cnMiLCJnZXRVVENIb3VycyIsIm1pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwic2Vjb25kcyIsImdldFVUQ1NlY29uZHMiLCJlIiwiaGFuZGxlTW91c2VEb3duIiwiaGFuZGxlTW91c2VNb3ZlIiwiaGFuZGxlTW91c2VVcCIsInRhcmdldCIsImdldEF0dHJpYnV0ZSIsImNsaWVudFgiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJjb250YWluZXJMZWZ0IiwibGVmdCIsImNvbnRhaW5lcldpZHRoIiwicHJldmVudERlZmF1bHQiLCJkZWx0YVgiLCJkZWx0YVRpbWUiLCJuZXdTdGFydCIsIm5ld0VuZCIsInJhbmdlV2lkdGgiLCJ3YXNSZXNpemluZyIsIndhc0RyYWdnaW5nIiwibmV3VmlzaWJsZUR1cmF0aW9uIiwic2VsZWN0ZWRDZW50ZXIiLCJuZXdWaXNpYmxlU3RhcnQiLCJuZXdWaXNpYmxlRW5kIiwiJCIsInJlbW92ZUNsYXNzIiwib25SYW5nZUNoYW5nZSIsImFwcGx5UGVyaW9kIiwicGVyaW9kU2Vjb25kcyIsInBlcmlvZCIsInBhcnNlSW50Iiwic2V0UmFuZ2UiLCJ1cGRhdGVTZWxlY3RlZFJhbmdlIiwiZGVzdHJveSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFMSzs7QUFPaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsR0FBRyxFQUFFLElBWFc7O0FBYWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxLQUFLLEVBQUUsSUFEQTtBQUVQQyxJQUFBQSxHQUFHLEVBQUU7QUFGRSxHQWpCSzs7QUFzQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRTtBQUNWRixJQUFBQSxLQUFLLEVBQUUsSUFERztBQUVWQyxJQUFBQSxHQUFHLEVBQUU7QUFGSyxHQTFCRTs7QUErQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGFBQWEsRUFBRTtBQUNYSCxJQUFBQSxLQUFLLEVBQUUsSUFESTtBQUVYQyxJQUFBQSxHQUFHLEVBQUU7QUFGTSxHQW5DQzs7QUF3Q2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLG9CQUFvQixFQUFFLENBNUNOOztBQThDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFO0FBQ1JDLElBQUFBLEtBQUssRUFBRSxDQURDO0FBRVJDLElBQUFBLE1BQU0sRUFBRSxFQUZBO0FBR1JDLElBQUFBLE9BQU8sRUFBRTtBQUhELEdBbERJOztBQXdEaEI7QUFDSjtBQUNBO0FBQ0E7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bkMsRUFBd0M7QUFDcENxSSxNQUFBQSxhQUFhLEdBQUcsS0FBS3ZJLFNBQUwsQ0FBZUUsR0FBL0I7QUFDQW9JLE1BQUFBLGVBQWUsR0FBRzdHLElBQUksQ0FBQ0MsR0FBTCxDQUFTNkcsYUFBYSxHQUFHSCxrQkFBekIsRUFBNkMsS0FBS3BJLFNBQUwsQ0FBZUMsS0FBNUQsQ0FBbEI7QUFDSCxLQXRCMkIsQ0F3QjVCOzs7QUFDQSxTQUFLRSxZQUFMLENBQWtCRixLQUFsQixHQUEwQnFJLGVBQTFCO0FBQ0EsU0FBS25JLFlBQUwsQ0FBa0JELEdBQWxCLEdBQXdCcUksYUFBeEIsQ0ExQjRCLENBNEI1Qjs7QUFDQSxTQUFLNUcsMEJBQUwsR0E3QjRCLENBK0I1Qjs7QUFDQSxTQUFLRSxNQUFMLEdBaEM0QixDQWtDNUI7QUFDSCxHQWh1QmU7O0FBa3VCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJNkcsRUFBQUEsYUF2dUJnQix5QkF1dUJGekksS0F2dUJFLEVBdXVCS0MsR0F2dUJMLEVBdXVCVSxDQUN0QjtBQUNILEdBenVCZTs7QUEydUJoQjtBQUNKO0FBQ0E7QUFDSStJLEVBQUFBLE9BOXVCZ0IscUJBOHVCTjtBQUNOLFFBQUksS0FBS25KLFNBQVQsRUFBb0I7QUFDaEIsV0FBS0EsU0FBTCxDQUFlNkQsU0FBZixHQUEyQixFQUEzQjtBQUNIO0FBQ0o7QUFsdkJlLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBTVkcgVGltZWxpbmUgY29tcG9uZW50IGZvciBsb2cgbmF2aWdhdGlvblxuICogR3JhZmFuYS1zdHlsZSB0aW1lbGluZSB3aXRoIHJhbmdlIHNlbGVjdGlvblxuICpcbiAqIEBtb2R1bGUgU1ZHVGltZWxpbmVcbiAqL1xuY29uc3QgU1ZHVGltZWxpbmUgPSB7XG4gICAgLyoqXG4gICAgICogQ29udGFpbmVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU1ZHIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7U1ZHRWxlbWVudH1cbiAgICAgKi9cbiAgICBzdmc6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGdWxsIGF2YWlsYWJsZSByYW5nZSAoZW50aXJlIGxvZyBmaWxlKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZnVsbFJhbmdlOiB7XG4gICAgICAgIHN0YXJ0OiBudWxsLFxuICAgICAgICBlbmQ6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlzaWJsZSByYW5nZSBvbiB0aW1lbGluZSAoY29udHJvbGxlZCBieSBwZXJpb2QgYnV0dG9ucyBhbmQgem9vbSlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZpc2libGVSYW5nZToge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbGVjdGVkIHJhbmdlIGZvciBkYXRhIGxvYWRpbmcgKGFsd2F5cyAxLzQgb2YgdmlzaWJsZVJhbmdlLCBjZW50ZXJlZClcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNlbGVjdGVkUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0IGluIHNlY29uZHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHNlcnZlclRpbWV6b25lT2Zmc2V0OiAwLFxuXG4gICAgLyoqXG4gICAgICogRGltZW5zaW9ucyAtIGNvbXBhY3QgdmVyc2lvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGltZW5zaW9uczoge1xuICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgaGVpZ2h0OiAyNCxcbiAgICAgICAgcGFkZGluZzogOFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmFnZ2luZyBzdGF0ZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZHJhZ2dpbmc6IHtcbiAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgaGFuZGxlOiBudWxsLCAvLyAnbGVmdCcsICdyaWdodCcsICdyYW5nZSdcbiAgICAgICAgc3RhcnRYOiAwLFxuICAgICAgICBzdGFydFNlbGVjdGVkU3RhcnQ6IDAsXG4gICAgICAgIHN0YXJ0U2VsZWN0ZWRFbmQ6IDBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gQ29udGFpbmVyIHNlbGVjdG9yIG9yIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlIC0gRnVsbCB0aW1lIHJhbmdlIHdpdGggc3RhcnQgYW5kIGVuZCB0aW1lc3RhbXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjb250YWluZXIsIHRpbWVSYW5nZSkge1xuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoY29udGFpbmVyKVxuICAgICAgICAgICAgOiBjb250YWluZXI7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVGltZWxpbmUgY29udGFpbmVyIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgZnVsbCByYW5nZSAoZW50aXJlIGxvZyBmaWxlKVxuICAgICAgICB0aGlzLmZ1bGxSYW5nZS5zdGFydCA9IHRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgdGhpcy5mdWxsUmFuZ2UuZW5kID0gdGltZVJhbmdlLmVuZDtcbiAgICAgICAgdGhpcy5kaW1lbnNpb25zLndpZHRoID0gdGhpcy5jb250YWluZXIub2Zmc2V0V2lkdGg7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGluaXRpYWwgdmlzaWJsZSByYW5nZSBiYXNlZCBvbiB0b3RhbCBkdXJhdGlvblxuICAgICAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gdGltZVJhbmdlLmVuZCAtIHRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgbGV0IGluaXRpYWxWaXNpYmxlRHVyYXRpb247XG5cbiAgICAgICAgaWYgKHRvdGFsRHVyYXRpb24gPiA4NjQwMCAqIDcpIHtcbiAgICAgICAgICAgIC8vIElmIGxvZ3Mgc3BhbiBtb3JlIHRoYW4gNyBkYXlzLCBzaG93IGxhc3QgMjQgaG91cnMgYXMgdmlzaWJsZVxuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IDg2NDAwOyAvLyAyNCBob3Vyc1xuICAgICAgICB9IGVsc2UgaWYgKHRvdGFsRHVyYXRpb24gPiA4NjQwMCkge1xuICAgICAgICAgICAgLy8gSWYgbG9ncyBzcGFuIDEtNyBkYXlzLCBzaG93IGxhc3QgMTIgaG91cnNcbiAgICAgICAgICAgIGluaXRpYWxWaXNpYmxlRHVyYXRpb24gPSA0MzIwMDsgLy8gMTIgaG91cnNcbiAgICAgICAgfSBlbHNlIGlmICh0b3RhbER1cmF0aW9uID4gMzYwMCAqIDYpIHtcbiAgICAgICAgICAgIC8vIElmIGxvZ3Mgc3BhbiA2LTI0IGhvdXJzLCBzaG93IGxhc3QgNiBob3Vyc1xuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IDIxNjAwOyAvLyA2IGhvdXJzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnRlciBsb2dzLCBzaG93IGVudGlyZSByYW5nZVxuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IHRvdGFsRHVyYXRpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdmlzaWJsZSByYW5nZSAod2hhdCB1c2VyIHNlZXMgb24gdGltZWxpbmUpXG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IHRpbWVSYW5nZS5lbmQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gTWF0aC5tYXgodGltZVJhbmdlLmVuZCAtIGluaXRpYWxWaXNpYmxlRHVyYXRpb24sIHRpbWVSYW5nZS5zdGFydCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHNlbGVjdGVkIHJhbmdlIGFzIDEvNCBvZiB2aXNpYmxlIHJhbmdlLCBjZW50ZXJlZFxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIFNWRyBzdHJ1Y3R1cmVcbiAgICAgICAgdGhpcy5jcmVhdGVTVkcoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5hdHRhY2hFdmVudHMoKTtcblxuICAgICAgICAvLyBIYW5kbGUgd2luZG93IHJlc2l6ZVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5oYW5kbGVSZXNpemUoKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBjZW50ZXJlZCBzZWxlY3Rpb24gKDEvNCBvZiB2aXNpYmxlIHJhbmdlLCBwb3NpdGlvbmVkIGF0IGNlbnRlcilcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgdmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSB2aXNpYmxlRHVyYXRpb24gLyA0O1xuICAgICAgICBjb25zdCB2aXNpYmxlQ2VudGVyID0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgKyAodmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gdmlzaWJsZUNlbnRlciAtIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB2aXNpYmxlQ2VudGVyICsgKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBFbnN1cmUgc2VsZWN0ZWQgcmFuZ2Ugc3RheXMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA8IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCArIHNlbGVjdGVkRHVyYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPiB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB0aGlzLnZpc2libGVSYW5nZS5lbmQ7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSBzZWxlY3RlZER1cmF0aW9uO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBhZGFwdGl2ZSB0aW1lIHN0ZXAgYmFzZWQgb24gcmFuZ2UgZHVyYXRpb24gYW5kIGF2YWlsYWJsZSB3aWR0aFxuICAgICAqIEVuc3VyZXMgbGFiZWxzIGFyZSBub3QgY2xvc2VyIHRoYW4gMmNtICh+NzVweCBhdCBzdGFuZGFyZCBEUEkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gLSBEdXJhdGlvbiBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGF2YWlsYWJsZVdpZHRoIC0gQXZhaWxhYmxlIHdpZHRoIGluIHBpeGVsc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFN0ZXAgY29uZmlndXJhdGlvbiB7dmFsdWUsIGxhYmVsLCBmb3JtYXR9XG4gICAgICovXG4gICAgY2FsY3VsYXRlQWRhcHRpdmVTdGVwKGR1cmF0aW9uLCBhdmFpbGFibGVXaWR0aCkge1xuICAgICAgICAvLyBUaW1lIHN0ZXBzIGluIHNlY29uZHMgd2l0aCBsYWJlbHMgKGZyb20gc21hbGxlc3QgdG8gbGFyZ2VzdClcbiAgICAgICAgY29uc3Qgc3RlcHMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAxLCBsYWJlbDogJzEgc2VjJywgZm9ybWF0OiAnSEg6TU06U1MnIH0sICAgICAgICAvLyAxIHNlY29uZFxuICAgICAgICAgICAgeyB2YWx1ZTogNSwgbGFiZWw6ICc1IHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgICAgLy8gNSBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiAxMCwgbGFiZWw6ICcxMCBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAvLyAxMCBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiAzMCwgbGFiZWw6ICczMCBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAvLyAzMCBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MCwgbGFiZWw6ICcxIG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAgICAvLyAxIG1pbnV0ZVxuICAgICAgICAgICAgeyB2YWx1ZTogMzAwLCBsYWJlbDogJzUgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAgLy8gNSBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MDAsIGxhYmVsOiAnMTAgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAvLyAxMCBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiAxODAwLCBsYWJlbDogJzMwIG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAvLyAzMCBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiAzNjAwLCBsYWJlbDogJzEgaG91cicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAvLyAxIGhvdXJcbiAgICAgICAgICAgIHsgdmFsdWU6IDEwODAwLCBsYWJlbDogJzMgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgIC8vIDMgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDIxNjAwLCBsYWJlbDogJzYgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgIC8vIDYgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDQzMjAwLCBsYWJlbDogJzEyIGhvdXJzJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgIC8vIDEyIGhvdXJzXG4gICAgICAgICAgICB7IHZhbHVlOiA4NjQwMCwgbGFiZWw6ICcxIGRheScsIGZvcm1hdDogJ01NLUREJyB9LCAgICAgICAvLyAxIGRheVxuICAgICAgICAgICAgeyB2YWx1ZTogMjU5MjAwLCBsYWJlbDogJzMgZGF5cycsIGZvcm1hdDogJ01NLUREJyB9LCAgICAgLy8gMyBkYXlzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MDQ4MDAsIGxhYmVsOiAnMSB3ZWVrJywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAvLyA3IGRheXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDI1OTIwMDAsIGxhYmVsOiAnMSBtb250aCcsIGZvcm1hdDogJ01NLUREJyB9ICAgIC8vIDMwIGRheXNcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBNaW5pbXVtIHNwYWNpbmcgYmV0d2VlbiBsYWJlbHM6IDJjbSDiiYggNzVweCAoYXQgOTYgRFBJKVxuICAgICAgICAvLyBVc2luZyA4MHB4IHRvIGJlIHNhZmUgYW5kIGFjY291bnQgZm9yIGxhYmVsIHdpZHRoXG4gICAgICAgIGNvbnN0IG1pblNwYWNpbmdQeCA9IDgwO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBtYXhpbXVtIG51bWJlciBvZiBsYWJlbHMgdGhhdCBmaXQgd2l0aCBtaW5pbXVtIHNwYWNpbmdcbiAgICAgICAgY29uc3QgbWF4TGFiZWxzID0gTWF0aC5mbG9vcihhdmFpbGFibGVXaWR0aCAvIG1pblNwYWNpbmdQeCk7XG5cbiAgICAgICAgLy8gRW5zdXJlIGF0IGxlYXN0IDIgbGFiZWxzLCBidXQgbm90IG1vcmUgdGhhbiBhdmFpbGFibGUgc3BhY2UgYWxsb3dzXG4gICAgICAgIGNvbnN0IHRhcmdldE1pbkxhYmVscyA9IE1hdGgubWF4KDIsIE1hdGgubWluKDQsIG1heExhYmVscykpO1xuICAgICAgICBjb25zdCB0YXJnZXRNYXhMYWJlbHMgPSBNYXRoLm1heCh0YXJnZXRNaW5MYWJlbHMsIG1heExhYmVscyk7XG5cbiAgICAgICAgLy8gRmluZCBzdGVwIHRoYXQgcHJvZHVjZXMgYXBwcm9wcmlhdGUgbnVtYmVyIG9mIGxhYmVsc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBudW1MYWJlbHMgPSBNYXRoLmZsb29yKGR1cmF0aW9uIC8gc3RlcHNbaV0udmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIHN0ZXAgcHJvZHVjZXMgYWNjZXB0YWJsZSBudW1iZXIgb2YgbGFiZWxzXG4gICAgICAgICAgICBpZiAobnVtTGFiZWxzID49IHRhcmdldE1pbkxhYmVscyAmJiBudW1MYWJlbHMgPD0gdGFyZ2V0TWF4TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ZXBzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbm8gcGVyZmVjdCBtYXRjaCwgZmluZCBjbG9zZXN0IG1hdGNoXG4gICAgICAgIGxldCBiZXN0U3RlcCA9IHN0ZXBzWzBdO1xuICAgICAgICBsZXQgYmVzdERpZmYgPSBJbmZpbml0eTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBudW1MYWJlbHMgPSBNYXRoLmZsb29yKGR1cmF0aW9uIC8gc3RlcHNbaV0udmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBGb3IgdmVyeSBzaG9ydCBkdXJhdGlvbnMsIHByZWZlciBzdGVwIHRoYXQgcHJvZHVjZXMgYXQgbGVhc3QgMiBsYWJlbHNcbiAgICAgICAgICAgIGlmIChkdXJhdGlvbiA8IHN0ZXBzWzBdLnZhbHVlICogdGFyZ2V0TWluTGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bUxhYmVscyA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGVwc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBkaWZmZXJlbmNlIGZyb20gaWRlYWwgcmFuZ2VcbiAgICAgICAgICAgIGxldCBkaWZmO1xuICAgICAgICAgICAgaWYgKG51bUxhYmVscyA8IHRhcmdldE1pbkxhYmVscykge1xuICAgICAgICAgICAgICAgIGRpZmYgPSAodGFyZ2V0TWluTGFiZWxzIC0gbnVtTGFiZWxzKSAqIDI7IC8vIFBlbmFsaXplIHRvbyBmZXcgbGFiZWxzIG1vcmVcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtTGFiZWxzID4gdGFyZ2V0TWF4TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IG51bUxhYmVscyAtIHRhcmdldE1heExhYmVsczsgLy8gUGVuYWxpemUgdG9vIG1hbnkgbGFiZWxzXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpZmYgPSAwOyAvLyBXaXRoaW4gYWNjZXB0YWJsZSByYW5nZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlmZiA8IGJlc3REaWZmKSB7XG4gICAgICAgICAgICAgICAgYmVzdERpZmYgPSBkaWZmO1xuICAgICAgICAgICAgICAgIGJlc3RTdGVwID0gc3RlcHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmVzdFN0ZXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBTVkcgZWxlbWVudFxuICAgICAqL1xuICAgIGNyZWF0ZVNWRygpIHtcbiAgICAgICAgY29uc3Qgc3ZnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtc3ZnJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHN2Zyk7XG4gICAgICAgIHRoaXMuc3ZnID0gc3ZnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGltZWxpbmVcbiAgICAgKi9cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGlmICghdGhpcy5zdmcpIHJldHVybjtcblxuICAgICAgICAvLyBDbGVhciBTVkdcbiAgICAgICAgdGhpcy5zdmcuaW5uZXJIVE1MID0gJyc7XG5cbiAgICAgICAgLy8gVXBkYXRlIHdpZHRoXG4gICAgICAgIHRoaXMuZGltZW5zaW9ucy53aWR0aCA9IHRoaXMuY29udGFpbmVyLm9mZnNldFdpZHRoO1xuXG4gICAgICAgIC8vIERyYXcgdGlja3MgYW5kIGxhYmVscyBmaXJzdCAoYmFja2dyb3VuZCBsYXllcilcbiAgICAgICAgdGhpcy5kcmF3VGlja3MoKTtcblxuICAgICAgICAvLyBEcmF3IFwiTm93XCIgbGluZSAobWlkZGxlIGxheWVyKVxuICAgICAgICB0aGlzLmRyYXdOb3dMaW5lKCk7XG5cbiAgICAgICAgLy8gRHJhdyBzZWxlY3Rpb24gcmFuZ2UgbGFzdCAoZm9yZWdyb3VuZCBsYXllcilcbiAgICAgICAgdGhpcy5kcmF3U2VsZWN0aW9uKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZWxpbmUgdGlja3MgYW5kIGxhYmVsc1xuICAgICAqIFVzZXMgVklTSUJMRSByYW5nZSBmb3IgYWRhcHRpdmUgc2NhbGluZyAoWWFuZGV4IENsb3VkIHN0eWxlKVxuICAgICAqL1xuICAgIGRyYXdUaWNrcygpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBwYWRkaW5nIH0gPSB0aGlzLmRpbWVuc2lvbnM7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVdpZHRoID0gd2lkdGggLSAocGFkZGluZyAqIDIpO1xuXG4gICAgICAgIC8vIFVzZSB2aXNpYmxlIHJhbmdlIGZvciBib3RoIHBvc2l0aW9uaW5nIGFuZCBzdGVwIGNhbGN1bGF0aW9uXG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgIC8vIEdldCBhZGFwdGl2ZSBzdGVwIGJhc2VkIG9uIFZJU0lCTEUgZHVyYXRpb24gYW5kIGF2YWlsYWJsZSB3aWR0aFxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5jYWxjdWxhdGVBZGFwdGl2ZVN0ZXAodmlzaWJsZUR1cmF0aW9uLCBhdmFpbGFibGVXaWR0aCk7XG5cbiAgICAgICAgLy8gUm91bmQgdmlzaWJsZSByYW5nZSB0byBuZWFyZXN0IHN0ZXAgaW50ZXJ2YWxcbiAgICAgICAgY29uc3Qgcm91bmRlZFN0YXJ0ID0gTWF0aC5mbG9vcih0aGlzLnZpc2libGVSYW5nZS5zdGFydCAvIHN0ZXAudmFsdWUpICogc3RlcC52YWx1ZTtcblxuICAgICAgICAvLyBTdG9yZSBtYWpvciB0aWNrIHBvc2l0aW9ucyBmb3IgY29sbGlzaW9uIGRldGVjdGlvblxuICAgICAgICBjb25zdCBtYWpvclRpY2tQb3NpdGlvbnMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgLy8gRHJhdyBtYWpvciB0aWNrcyBhdCBkaXNjcmV0ZSBpbnRlcnZhbHMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgbGV0IHRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgd2hpbGUgKHRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmICh0aW1lc3RhbXAgPj0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgcG9zaXRpb24gcmVsYXRpdmUgdG8gVklTSUJMRSByYW5nZSAobm90IGZ1bGwgcmFuZ2UhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKCh0aW1lc3RhbXAgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAgICAgbWFqb3JUaWNrUG9zaXRpb25zLmFkZChNYXRoLnJvdW5kKHRpbWVzdGFtcCkpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFqb3IgdGljayAtIGJvdHRvbSAoY29tcGFjdClcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDYsIDQsICcjNzY3Njc2Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbCAtIGNlbnRlcmVkIHZlcnRpY2FsbHkgKGNvbXBhY3QpIHdpdGggZm9ybWF0IGZyb20gc3RlcFxuICAgICAgICAgICAgICAgIHRoaXMuZHJhd0xhYmVsKHgsIGhlaWdodCAvIDIgKyAzLCB0aGlzLmZvcm1hdFRpbWUodGltZXN0YW1wLCBzdGVwLmZvcm1hdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXN0YW1wICs9IHN0ZXAudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEcmF3IG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3Igb25lcyAoNSBwZXIgaW50ZXJ2YWwpXG4gICAgICAgIGxldCBtaW5vclRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgY29uc3QgbWlub3JTdGVwID0gc3RlcC52YWx1ZSAvIDU7XG4gICAgICAgIHdoaWxlIChtaW5vclRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmIChtaW5vclRpbWVzdGFtcCA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgbm90IGEgbWFqb3IgdGljayBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdW5kZWRNaW5vclRpbWVzdGFtcCA9IE1hdGgucm91bmQobWlub3JUaW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIGlmICghbWFqb3JUaWNrUG9zaXRpb25zLmhhcyhyb3VuZGVkTWlub3JUaW1lc3RhbXApKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKChtaW5vclRpbWVzdGFtcCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWlub3IgdGljayAtIHNob3J0ZXIgYW5kIGxpZ2h0ZXJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmF3VGljayh4LCBoZWlnaHQgLSA1LCAyLCAnI2Q0ZDRkNScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pbm9yVGltZXN0YW1wICs9IG1pbm9yU3RlcDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgc2luZ2xlIHRpY2tcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0geSAtIFkgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGljayBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3IgLSBUaWNrIGNvbG9yXG4gICAgICovXG4gICAgZHJhd1RpY2soeCwgeSwgaGVpZ2h0LCBjb2xvcikge1xuICAgICAgICBjb25zdCBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTEnLCB5KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkgKyBoZWlnaHQpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywgY29sb3IpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZSBsYWJlbFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gWSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gTGFiZWwgdGV4dFxuICAgICAqL1xuICAgIGRyYXdMYWJlbCh4LCB5LCB0ZXh0KSB7XG4gICAgICAgIC8vIENyZWF0ZSB3aGl0ZSBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3IgbGFiZWxcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0VGV4dEJCb3godGV4dCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSAzO1xuXG4gICAgICAgIGNvbnN0IGJnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneCcsIHggLSAoYmJveC53aWR0aCAvIDIpIC0gcGFkZGluZyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneScsIHkgLSBiYm94LmhlaWdodCArIDIpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgYmJveC53aWR0aCArIChwYWRkaW5nICogMikpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCdmaWxsJywgJyNmYWZhZmEnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQoYmcpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZXh0IGxhYmVsXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICd0ZXh0Jyk7XG4gICAgICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1sYWJlbCcpO1xuICAgICAgICBsYWJlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHRoaXMuc3ZnLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJveGltYXRlIGJvdW5kaW5nIGJveCBmb3IgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCBjb250ZW50XG4gICAgICogQHJldHVybnMge29iamVjdH0gQm91bmRpbmcgYm94IHt3aWR0aCwgaGVpZ2h0fVxuICAgICAqL1xuICAgIGdldFRleHRCQm94KHRleHQpIHtcbiAgICAgICAgLy8gQXBwcm94aW1hdGUgc2l6ZSBiYXNlZCBvbiBmb250IHNpemUgYW5kIGNoYXJhY3RlciBjb3VudFxuICAgICAgICBjb25zdCBmb250U2l6ZSA9IDExO1xuICAgICAgICAvLyBVc2UgbW9ub3NwYWNlIHdpZHRoIGZvciB0aW1lIGxhYmVscyAoc2Vjb25kcyBmb3JtYXQgaXMgbG9uZ2VyKVxuICAgICAgICBjb25zdCBjaGFyV2lkdGggPSB0ZXh0LmluY2x1ZGVzKCc6JykgPyA2LjUgOiA2OyAvLyBXaWRlciBmb3IgdGltZSBmb3JtYXRzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogdGV4dC5sZW5ndGggKiBjaGFyV2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGZvbnRTaXplICsgMlxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHNlbGVjdGlvbiByYW5nZSAocmVsYXRpdmUgdG8gdmlzaWJsZSByYW5nZSlcbiAgICAgKi9cbiAgICBkcmF3U2VsZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgcG9zaXRpb24gcmVsYXRpdmUgdG8gVklTSUJMRSByYW5nZVxuICAgICAgICBjb25zdCBsZWZ0UGVyY2VudCA9ICgodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0IC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIDEwMDtcbiAgICAgICAgY29uc3QgcmlnaHRQZXJjZW50ID0gKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIDEwMDtcbiAgICAgICAgY29uc3Qgd2lkdGhQZXJjZW50ID0gcmlnaHRQZXJjZW50IC0gbGVmdFBlcmNlbnQ7XG5cbiAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAobGVmdFBlcmNlbnQgLyAxMDApICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgIGNvbnN0IHcgPSAod2lkdGhQZXJjZW50IC8gMTAwKSAqIGF2YWlsYWJsZVdpZHRoO1xuXG4gICAgICAgIC8vIFNlbGVjdGlvbiBiYWNrZ3JvdW5kXG4gICAgICAgIGNvbnN0IHJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCB4KTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLXNlbGVjdGlvbicpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnZGF0YS1oYW5kbGUnLCAncmFuZ2UnKTtcbiAgICAgICAgdGhpcy5zdmcuYXBwZW5kQ2hpbGQocmVjdCk7XG5cbiAgICAgICAgLy8gTGVmdCBoYW5kbGVcbiAgICAgICAgdGhpcy5kcmF3SGFuZGxlKHgsICdsZWZ0Jyk7XG5cbiAgICAgICAgLy8gUmlnaHQgaGFuZGxlXG4gICAgICAgIHRoaXMuZHJhd0hhbmRsZSh4ICsgdywgJ3JpZ2h0Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgc2VsZWN0aW9uIGhhbmRsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwb3NpdGlvbiAtICdsZWZ0JyBvciAncmlnaHQnXG4gICAgICovXG4gICAgZHJhd0hhbmRsZSh4LCBwb3NpdGlvbikge1xuICAgICAgICBjb25zdCBoYW5kbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgneCcsIHggLSAzKTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCd3aWR0aCcsIDYpO1xuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtaGFuZGxlJyk7XG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJywgcG9zaXRpb24pO1xuICAgICAgICB0aGlzLnN2Zy5hcHBlbmRDaGlsZChoYW5kbGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IFwiTm93XCIgbGluZSAocmVsYXRpdmUgdG8gdmlzaWJsZSByYW5nZSlcbiAgICAgKi9cbiAgICBkcmF3Tm93TGluZSgpIHtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG5cbiAgICAgICAgLy8gT25seSBkcmF3IGlmIFwibm93XCIgaXMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgaWYgKG5vdyA8IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0IHx8IG5vdyA+IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICBjb25zdCB7IHdpZHRoLCBwYWRkaW5nIH0gPSB0aGlzLmRpbWVuc2lvbnM7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVdpZHRoID0gd2lkdGggLSAocGFkZGluZyAqIDIpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKChub3cgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG5cbiAgICAgICAgY29uc3QgbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnbGluZScpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneDEnLCB4KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTInLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLW5vdycpO1xuICAgICAgICB0aGlzLnN2Zy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWVzdGFtcCB0byB0aW1lIHN0cmluZyAoc2VydmVyIHRpbWUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIFVuaXggdGltZXN0YW1wIGluIFVUQ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtYXQgLSBGb3JtYXQgdHlwZTogJ0hIOk1NOlNTJywgJ0hIOk1NJywgb3IgJ01NLUREJ1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCB0aW1lL2RhdGUgaW4gc2VydmVyIHRpbWV6b25lXG4gICAgICovXG4gICAgZm9ybWF0VGltZSh0aW1lc3RhbXAsIGZvcm1hdCA9ICdISDpNTScpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGRhdGUgZnJvbSBVVEMgdGltZXN0YW1wLCB0aGVuIGFkZCBzZXJ2ZXIgb2Zmc2V0IHRvIGdldCBtaWxsaXNlY29uZHNcbiAgICAgICAgLy8gc2VydmVyVGltZXpvbmVPZmZzZXQgaXMgaW4gc2Vjb25kcywgdGltZXN0YW1wIGlzIGluIHNlY29uZHNcbiAgICAgICAgY29uc3Qgc2VydmVyVGltZU1zID0gKHRpbWVzdGFtcCArIHRoaXMuc2VydmVyVGltZXpvbmVPZmZzZXQpICogMTAwMDtcbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHNlcnZlclRpbWVNcyk7XG5cbiAgICAgICAgaWYgKGZvcm1hdCA9PT0gJ01NLUREJykge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGFzIG1vbnRoLWRheSBmb3IgbG9uZyByYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXRVVENEYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICByZXR1cm4gYCR7bW9udGh9LSR7ZGF5fWA7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSAnSEg6TU06U1MnKSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgYXMgdGltZSB3aXRoIHNlY29uZHMgZm9yIHZlcnkgc2hvcnQgcmFuZ2VzXG4gICAgICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkYXRlLmdldFVUQ0hvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBtaW51dGVzID0gU3RyaW5nKGRhdGUuZ2V0VVRDTWludXRlcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3Qgc2Vjb25kcyA9IFN0cmluZyhkYXRlLmdldFVUQ1NlY29uZHMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc306JHttaW51dGVzfToke3NlY29uZHN9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBhcyB0aW1lIChISDpNTSkgZm9yIHNob3J0ZXIgcmFuZ2VzXG4gICAgICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkYXRlLmdldFVUQ0hvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBtaW51dGVzID0gU3RyaW5nKGRhdGUuZ2V0VVRDTWludXRlcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9YDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggbW91c2UgZXZlbnRzXG4gICAgICovXG4gICAgYXR0YWNoRXZlbnRzKCkge1xuICAgICAgICB0aGlzLnN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCAoZSkgPT4gdGhpcy5oYW5kbGVNb3VzZURvd24oZSkpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4gdGhpcy5oYW5kbGVNb3VzZU1vdmUoZSkpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKCkgPT4gdGhpcy5oYW5kbGVNb3VzZVVwKCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgZG93blxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlTW91c2VEb3duKGUpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICAgIGNvbnN0IGhhbmRsZSA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJyk7XG5cbiAgICAgICAgaWYgKCFoYW5kbGUpIHJldHVybjtcblxuICAgICAgICB0aGlzLmRyYWdnaW5nLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gaGFuZGxlO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLnN0YXJ0WCA9IGUuY2xpZW50WDtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkU3RhcnQgPSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZEVuZCA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQ7XG5cbiAgICAgICAgY29uc3QgcmVjdCA9IHRoaXMuY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLmNvbnRhaW5lckxlZnQgPSByZWN0LmxlZnQ7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyV2lkdGggPSByZWN0LndpZHRoO1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1vdXNlIG1vdmUgKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVNb3VzZU1vdmUoZSkge1xuICAgICAgICBpZiAoIXRoaXMuZHJhZ2dpbmcuYWN0aXZlKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgZGVsdGFYID0gZS5jbGllbnRYIC0gdGhpcy5kcmFnZ2luZy5zdGFydFg7XG4gICAgICAgIGNvbnN0IHsgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyV2lkdGggLSAocGFkZGluZyAqIDIpO1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBkZWx0YSByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgIGNvbnN0IGRlbHRhVGltZSA9IChkZWx0YVggLyBhdmFpbGFibGVXaWR0aCkgKiB2aXNpYmxlRHVyYXRpb247XG5cbiAgICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgIC8vIFJlc2l6aW5nIGZyb20gbGVmdCAtIGFkanVzdCB2aXNpYmxlIHJhbmdlIGFjY29yZGluZ2x5XG4gICAgICAgICAgICBsZXQgbmV3U3RhcnQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRTdGFydCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIG5ld1N0YXJ0ID0gTWF0aC5tYXgodGhpcy5mdWxsUmFuZ2Uuc3RhcnQsIE1hdGgubWluKG5ld1N0YXJ0LCB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gNjApKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IG5ld1N0YXJ0O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICAvLyBSZXNpemluZyBmcm9tIHJpZ2h0IC0gYWRqdXN0IHZpc2libGUgcmFuZ2UgYWNjb3JkaW5nbHlcbiAgICAgICAgICAgIGxldCBuZXdFbmQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRFbmQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICBuZXdFbmQgPSBNYXRoLm1pbih0aGlzLmZ1bGxSYW5nZS5lbmQsIE1hdGgubWF4KG5ld0VuZCwgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgNjApKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBuZXdFbmQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgICAgIC8vIERyYWdnaW5nIGVudGlyZSByYW5nZSAtIG1vdmUgaXQgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlV2lkdGggPSB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgbGV0IG5ld1N0YXJ0ID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkU3RhcnQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICBsZXQgbmV3RW5kID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkRW5kICsgZGVsdGFUaW1lO1xuXG4gICAgICAgICAgICAvLyBLZWVwIHdpdGhpbiBmdWxsIHJhbmdlIGJvdW5kc1xuICAgICAgICAgICAgaWYgKG5ld1N0YXJ0IDwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICBuZXdTdGFydCA9IHRoaXMuZnVsbFJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgICAgIG5ld0VuZCA9IG5ld1N0YXJ0ICsgcmFuZ2VXaWR0aDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmV3RW5kID4gdGhpcy5mdWxsUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICAgICAgbmV3RW5kID0gdGhpcy5mdWxsUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgIG5ld1N0YXJ0ID0gbmV3RW5kIC0gcmFuZ2VXaWR0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gbmV3U3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gbmV3RW5kO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1vdXNlIHVwIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEFmdGVyIGRyYWc6IHJlY2VudGVyIGFuZCBhZGp1c3QgdmlzaWJsZSByYW5nZVxuICAgICAqL1xuICAgIGhhbmRsZU1vdXNlVXAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRyYWdnaW5nLmFjdGl2ZSkge1xuICAgICAgICAgICAgY29uc3Qgd2FzUmVzaXppbmcgPSB0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ2xlZnQnIHx8IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmlnaHQnO1xuICAgICAgICAgICAgY29uc3Qgd2FzRHJhZ2dpbmcgPSB0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ3JhbmdlJztcblxuICAgICAgICAgICAgdGhpcy5kcmFnZ2luZy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHdhc1Jlc2l6aW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciByZXNpemVkIHNlbGVjdGlvbiDihpIgYWRqdXN0IHZpc2libGUgcmFuZ2UgdG8gYmUgNHggc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gYW5kIHJlY2VudGVyIHNlbGVjdGlvbiB3aXRoaW4gbmV3IHZpc2libGUgcmFuZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZER1cmF0aW9uID0gdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlRHVyYXRpb24gPSBzZWxlY3RlZER1cmF0aW9uICogNDtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZENlbnRlciA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCArIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHZpc2libGUgcmFuZ2UgY2VudGVyZWQgb24gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgbGV0IG5ld1Zpc2libGVTdGFydCA9IHNlbGVjdGVkQ2VudGVyIC0gKG5ld1Zpc2libGVEdXJhdGlvbiAvIDIpO1xuICAgICAgICAgICAgICAgIGxldCBuZXdWaXNpYmxlRW5kID0gc2VsZWN0ZWRDZW50ZXIgKyAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgICAgICAgICAvLyBLZWVwIHdpdGhpbiBmdWxsIHJhbmdlIGJvdW5kc1xuICAgICAgICAgICAgICAgIGlmIChuZXdWaXNpYmxlU3RhcnQgPCB0aGlzLmZ1bGxSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdWaXNpYmxlU3RhcnQgPSB0aGlzLmZ1bGxSYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmlzaWJsZUVuZCA9IE1hdGgubWluKG5ld1Zpc2libGVTdGFydCArIG5ld1Zpc2libGVEdXJhdGlvbiwgdGhpcy5mdWxsUmFuZ2UuZW5kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5ld1Zpc2libGVFbmQgPiB0aGlzLmZ1bGxSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmlzaWJsZUVuZCA9IHRoaXMuZnVsbFJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmlzaWJsZVN0YXJ0ID0gTWF0aC5tYXgobmV3VmlzaWJsZUVuZCAtIG5ld1Zpc2libGVEdXJhdGlvbiwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3VmlzaWJsZVN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSBjZW50ZXJlZCBzZWxlY3Rpb24gKDEvNCBvZiBuZXcgdmlzaWJsZSByYW5nZSlcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWFjdGl2YXRlIGFsbCBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgJCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdhc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciBkcmFnZ2VkIHNlbGVjdGlvbiDihpIgc2hpZnQgdmlzaWJsZSByYW5nZSB0byBrZWVwIHNlbGVjdGlvbiBjZW50ZXJlZFxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIHRvIGtlZXAgc2VsZWN0aW9uIGF0IGNlbnRlclxuICAgICAgICAgICAgICAgIGxldCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgICAgICAgICBsZXQgbmV3VmlzaWJsZUVuZCA9IHNlbGVjdGVkQ2VudGVyICsgKHZpc2libGVEdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgICAgICAgICAgLy8gS2VlcCB3aXRoaW4gZnVsbCByYW5nZSBib3VuZHNcbiAgICAgICAgICAgICAgICBpZiAobmV3VmlzaWJsZVN0YXJ0IDwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3VmlzaWJsZVN0YXJ0ID0gdGhpcy5mdWxsUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Zpc2libGVFbmQgPSBuZXdWaXNpYmxlU3RhcnQgKyB2aXNpYmxlRHVyYXRpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuZXdWaXNpYmxlRW5kID4gdGhpcy5mdWxsUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Zpc2libGVFbmQgPSB0aGlzLmZ1bGxSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Zpc2libGVTdGFydCA9IG5ld1Zpc2libGVFbmQgLSB2aXNpYmxlRHVyYXRpb247XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gbmV3VmlzaWJsZUVuZDtcblxuICAgICAgICAgICAgICAgIC8vIFJlY2FsY3VsYXRlIGNlbnRlcmVkIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjYWxsYmFjayB0byBsb2FkIGRhdGFcbiAgICAgICAgICAgIGlmICh0aGlzLm9uUmFuZ2VDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uUmFuZ2VDaGFuZ2UoXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHdpbmRvdyByZXNpemVcbiAgICAgKi9cbiAgICBoYW5kbGVSZXNpemUoKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHBlcmlvZCBmcm9tIHF1aWNrLXBlcmlvZC1idXR0b25zIChZYW5kZXggQ2xvdWQgc3R5bGUpXG4gICAgICogU2V0cyB2aXNpYmxlIHJhbmdlIGFuZCBhdXRvLWNlbnRlcnMgc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZFNlY29uZHMgLSBQZXJpb2QgaW4gc2Vjb25kcyAoZS5nLiwgMzYwMCBmb3IgMWgpXG4gICAgICovXG4gICAgYXBwbHlQZXJpb2QocGVyaW9kU2Vjb25kcykge1xuICAgICAgICBjb25zdCBwZXJpb2QgPSBwYXJzZUludChwZXJpb2RTZWNvbmRzKTtcblxuICAgICAgICAvLyBTZXQgdmlzaWJsZSByYW5nZSB0byBsYXN0IE4gc2Vjb25kc1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSB0aGlzLmZ1bGxSYW5nZS5lbmQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gTWF0aC5tYXgodGhpcy5mdWxsUmFuZ2UuZW5kIC0gcGVyaW9kLCB0aGlzLmZ1bGxSYW5nZS5zdGFydCk7XG5cbiAgICAgICAgLy8gQXV0by1jZW50ZXIgc2VsZWN0aW9uICgxLzQgb2YgdmlzaWJsZSByYW5nZSlcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpO1xuXG4gICAgICAgIC8vIFJlbmRlclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2FsbGJhY2sgdG8gbG9hZCBkYXRhXG4gICAgICAgIGlmICh0aGlzLm9uUmFuZ2VDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMub25SYW5nZUNoYW5nZShcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCksXG4gICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgc2VsZWN0ZWQgcmFuZ2UgKGRlcHJlY2F0ZWQgLSB1c2UgYXBwbHlQZXJpb2QgaW5zdGVhZClcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIHNldFJhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGEgKHdpdGhvdXQgdHJpZ2dlcmluZyBvblJhbmdlQ2hhbmdlKVxuICAgICAqIFVzZWQgd2hlbiBiYWNrZW5kIHJldHVybnMgZGlmZmVyZW50IHJhbmdlIGR1ZSB0byA1MDAwIGxpbmUgbGltaXRcbiAgICAgKiBTeW5jaHJvbm91c2x5IHVwZGF0ZXMgYm90aCB2aXNpYmxlIHJhbmdlIGFuZCBzZWxlY3RlZCByYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBBY3R1YWwgc3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEFjdHVhbCBlbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgdXBkYXRlU2VsZWN0ZWRSYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGFcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIGFzIDR4IG9mIHNlbGVjdGVkIHJhbmdlXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZUR1cmF0aW9uID0gc2VsZWN0ZWREdXJhdGlvbiAqIDQ7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gc3RhcnQgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIENlbnRlciB2aXNpYmxlIHJhbmdlIGFyb3VuZCBzZWxlY3RlZCByYW5nZVxuICAgICAgICBsZXQgbmV3VmlzaWJsZVN0YXJ0ID0gc2VsZWN0ZWRDZW50ZXIgLSAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG4gICAgICAgIGxldCBuZXdWaXNpYmxlRW5kID0gc2VsZWN0ZWRDZW50ZXIgKyAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgLy8gS2VlcCB3aXRoaW4gZnVsbCByYW5nZSBib3VuZHNcbiAgICAgICAgaWYgKG5ld1Zpc2libGVTdGFydCA8IHRoaXMuZnVsbFJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICBuZXdWaXNpYmxlU3RhcnQgPSB0aGlzLmZ1bGxSYW5nZS5zdGFydDtcbiAgICAgICAgICAgIG5ld1Zpc2libGVFbmQgPSBNYXRoLm1pbihuZXdWaXNpYmxlU3RhcnQgKyBuZXdWaXNpYmxlRHVyYXRpb24sIHRoaXMuZnVsbFJhbmdlLmVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld1Zpc2libGVFbmQgPiB0aGlzLmZ1bGxSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIG5ld1Zpc2libGVFbmQgPSB0aGlzLmZ1bGxSYW5nZS5lbmQ7XG4gICAgICAgICAgICBuZXdWaXNpYmxlU3RhcnQgPSBNYXRoLm1heChuZXdWaXNpYmxlRW5kIC0gbmV3VmlzaWJsZUR1cmF0aW9uLCB0aGlzLmZ1bGxSYW5nZS5zdGFydCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdmlzaWJsZSByYW5nZVxuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IG5ld1Zpc2libGVTdGFydDtcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gbmV3VmlzaWJsZUVuZDtcblxuICAgICAgICAvLyBSZWNhbGN1bGF0ZSBjZW50ZXJlZCBzZWxlY3Rpb24gdG8gZW5zdXJlIDEvNCByYXRpbyBpcyBtYWludGFpbmVkXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKTtcblxuICAgICAgICAvLyBSZW5kZXIgd2l0aCBuZXcgcmFuZ2VzXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9lcyBOT1QgdHJpZ2dlciBvblJhbmdlQ2hhbmdlIGNhbGxiYWNrXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIHdoZW4gcmFuZ2UgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgb25SYW5nZUNoYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB0aW1lbGluZVxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIl19