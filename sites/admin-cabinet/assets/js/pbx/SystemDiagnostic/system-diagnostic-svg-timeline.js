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
   * SVG groups for layering
   * @type {object}
   */
  layers: {
    ticks: null,
    // Background layer for ticks and labels
    dynamic: null // Foreground layer for selection, handles, boundaries

  },

  /**
   * Persistent dynamic SVG elements (for CSS transitions)
   * @type {object}
   */
  elements: {
    selectionRect: null,
    leftHandle: null,
    rightHandle: null,
    nowLine: null,
    startBoundary: null,
    endBoundary: null,
    noDataLeftRect: null,
    noDataRightRect: null,
    truncatedLeftRect: null,
    truncatedRightRect: null
  },

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
   * Requested range (what was sent to server before truncation)
   * @type {object}
   */
  requestedRange: {
    start: null,
    end: null
  },

  /**
   * Truncation info from server response
   * @type {object}
   */
  truncation: {
    wasTruncated: false,
    linesCount: 0,
    direction: null,
    // 'left' or 'right'
    leftZone: null,
    // { start, end } if data was truncated from left (latest=true)
    rightZone: null // { start, end } if data was truncated from right (latest=false)

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
    } // Validate time range - must have valid numeric timestamps


    if (typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number' || isNaN(timeRange.start) || isNaN(timeRange.end)) {
      console.error('SVGTimeline: Invalid time range - start and end must be valid numbers');
      return;
    } // Store full range (entire log file) - ORIGINAL values, never expanded
    // fullRange represents actual data boundaries for no-data zone calculation


    this.fullRange.start = timeRange.start;
    this.fullRange.end = timeRange.end; // For display purposes, expand range if too short (prevents division by zero)
    // But keep fullRange as original for no-data zone detection

    var MIN_DURATION = 60; // 1 minute minimum

    var displayStart = timeRange.start;
    var displayEnd = timeRange.end;

    if (displayEnd - displayStart < MIN_DURATION) {
      var center = displayStart;
      displayStart = center - MIN_DURATION / 2;
      displayEnd = center + MIN_DURATION / 2;
    }

    this.dimensions.width = this.container.offsetWidth; // Determine initial visible range based on display duration (expanded for short logs)

    var totalDuration = displayEnd - displayStart;
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
    } // Set visible range (what user sees on timeline) - use expanded display range


    this.visibleRange.end = displayEnd;
    this.visibleRange.start = Math.max(displayEnd - initialVisibleDuration, displayStart); // Calculate selected range as 1/4 of visible range, centered

    this.calculateCenteredSelection(); // Create SVG structure

    this.createSVG();
    this.render();
    this.attachEvents(); // Handle window resize (stored for cleanup in destroy())

    this._boundResize = function () {
      return _this.handleResize();
    };

    window.addEventListener('resize', this._boundResize);
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
   * Create SVG element with persistent dynamic elements
   */
  createSVG: function createSVG() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'timeline-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', this.dimensions.height); // Create defs for patterns

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); // Diagonal stripes pattern for "no data" zones

    var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'timeline-no-data-pattern');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '8');
    pattern.setAttribute('height', '8');
    pattern.setAttribute('patternTransform', 'rotate(45)');
    var patternRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    patternRect.setAttribute('width', '4');
    patternRect.setAttribute('height', '8');
    patternRect.setAttribute('fill', 'rgba(0, 0, 0, 0.08)');
    pattern.appendChild(patternRect);
    defs.appendChild(pattern);
    svg.appendChild(defs); // Create layer groups for proper z-ordering

    this.layers.ticks = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.layers.ticks.setAttribute('class', 'timeline-ticks-layer');
    this.layers.dynamic = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.layers.dynamic.setAttribute('class', 'timeline-dynamic-layer');
    svg.appendChild(this.layers.ticks);
    svg.appendChild(this.layers.dynamic); // Create persistent dynamic elements (for CSS transitions)

    this.createDynamicElements();
    this.container.innerHTML = '';
    this.container.appendChild(svg);
    this.svg = svg;
  },

  /**
   * Create persistent dynamic SVG elements once
   * These elements are updated via setAttribute for smooth CSS transitions
   */
  createDynamicElements: function createDynamicElements() {
    var height = this.dimensions.height; // No data zone - left (beyond fullRange.start)

    this.elements.noDataLeftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.noDataLeftRect.setAttribute('y', 0);
    this.elements.noDataLeftRect.setAttribute('height', height);
    this.elements.noDataLeftRect.setAttribute('class', 'timeline-no-data');
    this.elements.noDataLeftRect.style.display = 'none';
    this.layers.dynamic.appendChild(this.elements.noDataLeftRect); // No data zone - right (beyond fullRange.end)

    this.elements.noDataRightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.noDataRightRect.setAttribute('y', 0);
    this.elements.noDataRightRect.setAttribute('height', height);
    this.elements.noDataRightRect.setAttribute('class', 'timeline-no-data');
    this.elements.noDataRightRect.style.display = 'none';
    this.layers.dynamic.appendChild(this.elements.noDataRightRect); // Truncated zone - left (data cut by 5000 line limit when latest=true)

    this.elements.truncatedLeftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.truncatedLeftRect.setAttribute('y', 0);
    this.elements.truncatedLeftRect.setAttribute('height', height);
    this.elements.truncatedLeftRect.setAttribute('class', 'timeline-truncated');
    this.elements.truncatedLeftRect.setAttribute('data-zone', 'truncated-left');
    this.elements.truncatedLeftRect.style.display = 'none';
    this.layers.dynamic.appendChild(this.elements.truncatedLeftRect); // Truncated zone - right (data cut by 5000 line limit when latest=false)

    this.elements.truncatedRightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.truncatedRightRect.setAttribute('y', 0);
    this.elements.truncatedRightRect.setAttribute('height', height);
    this.elements.truncatedRightRect.setAttribute('class', 'timeline-truncated');
    this.elements.truncatedRightRect.setAttribute('data-zone', 'truncated-right');
    this.elements.truncatedRightRect.style.display = 'none';
    this.layers.dynamic.appendChild(this.elements.truncatedRightRect); // "Now" line

    this.elements.nowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.elements.nowLine.setAttribute('y1', 0);
    this.elements.nowLine.setAttribute('y2', height);
    this.elements.nowLine.setAttribute('class', 'timeline-now');
    this.layers.dynamic.appendChild(this.elements.nowLine); // Start boundary (left red line)

    this.elements.startBoundary = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.elements.startBoundary.setAttribute('y1', 0);
    this.elements.startBoundary.setAttribute('y2', height);
    this.elements.startBoundary.setAttribute('class', 'timeline-boundary');
    this.layers.dynamic.appendChild(this.elements.startBoundary); // End boundary (right red line)

    this.elements.endBoundary = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.elements.endBoundary.setAttribute('y1', 0);
    this.elements.endBoundary.setAttribute('y2', height);
    this.elements.endBoundary.setAttribute('class', 'timeline-boundary');
    this.layers.dynamic.appendChild(this.elements.endBoundary); // Selection rectangle

    this.elements.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.selectionRect.setAttribute('y', 0);
    this.elements.selectionRect.setAttribute('height', height);
    this.elements.selectionRect.setAttribute('class', 'timeline-selection');
    this.elements.selectionRect.setAttribute('data-handle', 'range');
    this.layers.dynamic.appendChild(this.elements.selectionRect); // Left handle

    this.elements.leftHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.leftHandle.setAttribute('y', 0);
    this.elements.leftHandle.setAttribute('width', 6);
    this.elements.leftHandle.setAttribute('height', height);
    this.elements.leftHandle.setAttribute('class', 'timeline-handle');
    this.elements.leftHandle.setAttribute('data-handle', 'left');
    this.layers.dynamic.appendChild(this.elements.leftHandle); // Right handle

    this.elements.rightHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.elements.rightHandle.setAttribute('y', 0);
    this.elements.rightHandle.setAttribute('width', 6);
    this.elements.rightHandle.setAttribute('height', height);
    this.elements.rightHandle.setAttribute('class', 'timeline-handle');
    this.elements.rightHandle.setAttribute('data-handle', 'right');
    this.layers.dynamic.appendChild(this.elements.rightHandle);
  },

  /**
   * Full render - redraws ticks and updates dynamic elements
   * Called when visibleRange changes (period buttons, resize, mouseUp)
   */
  render: function render() {
    if (!this.svg) return; // Update width

    this.dimensions.width = this.container.offsetWidth; // Redraw ticks and labels (they depend on visibleRange)

    this.renderTicks(); // Update dynamic elements positions (with CSS transitions)

    this.updateDynamicElements();
  },

  /**
   * Render only ticks and labels (background layer)
   * Called when visibleRange changes
   */
  renderTicks: function renderTicks() {
    if (!this.layers.ticks) return; // Clear only ticks layer

    this.layers.ticks.innerHTML = ''; // Draw ticks and labels

    this.drawTicks();
  },

  /**
   * Update dynamic elements positions via setAttribute
   * Called during drag for smooth CSS transitions
   */
  updateDynamicElements: function updateDynamicElements() {
    var visibleDuration = this.visibleRange.end - this.visibleRange.start;
    var _this$dimensions = this.dimensions,
        width = _this$dimensions.width,
        height = _this$dimensions.height,
        padding = _this$dimensions.padding;
    var availableWidth = width - padding * 2; // Safety check

    if (visibleDuration <= 0 || availableWidth <= 0) return; // Calculate positions independently for each edge
    // This prevents visual artifacts when resizing from one side

    var leftX = padding + (this.selectedRange.start - this.visibleRange.start) / visibleDuration * availableWidth;
    var rightX = padding + (this.selectedRange.end - this.visibleRange.start) / visibleDuration * availableWidth;
    var w = rightX - leftX; // Update selection rectangle

    this.elements.selectionRect.setAttribute('x', leftX);
    this.elements.selectionRect.setAttribute('width', Math.max(0, w)); // Update handles - positioned independently

    this.elements.leftHandle.setAttribute('x', leftX - 3);
    this.elements.rightHandle.setAttribute('x', rightX - 3); // Update "Now" line
    // Add 60s buffer to prevent hiding when time slightly exceeds visibleRange.end

    var now = Math.floor(Date.now() / 1000);
    var nowBuffer = 60;

    if (now >= this.visibleRange.start && now <= this.visibleRange.end + nowBuffer) {
      // Clamp nowX to visible area (don't draw beyond right edge)
      var clampedNow = Math.min(now, this.visibleRange.end);
      var nowX = padding + (clampedNow - this.visibleRange.start) / visibleDuration * availableWidth;
      this.elements.nowLine.setAttribute('x1', nowX);
      this.elements.nowLine.setAttribute('x2', nowX);
      this.elements.nowLine.style.display = '';
    } else {
      this.elements.nowLine.style.display = 'none';
    } // Update start boundary


    if (this.fullRange.start <= this.visibleRange.end) {
      var xStart;

      if (this.fullRange.start < this.visibleRange.start) {
        xStart = padding;
      } else {
        xStart = padding + (this.fullRange.start - this.visibleRange.start) / visibleDuration * availableWidth;
      }

      this.elements.startBoundary.setAttribute('x1', xStart);
      this.elements.startBoundary.setAttribute('x2', xStart);
      this.elements.startBoundary.style.display = '';
    } else {
      this.elements.startBoundary.style.display = 'none';
    } // Update end boundary


    if (this.fullRange.end >= this.visibleRange.start) {
      var xEnd;

      if (this.fullRange.end > this.visibleRange.end) {
        xEnd = padding + availableWidth;
      } else {
        xEnd = padding + (this.fullRange.end - this.visibleRange.start) / visibleDuration * availableWidth;
      }

      this.elements.endBoundary.setAttribute('x1', xEnd);
      this.elements.endBoundary.setAttribute('x2', xEnd);
      this.elements.endBoundary.style.display = '';
    } else {
      this.elements.endBoundary.style.display = 'none';
    } // Update no-data zone (left) - when visibleRange extends before fullRange


    if (this.visibleRange.start < this.fullRange.start) {
      var noDataLeftEnd = padding + (this.fullRange.start - this.visibleRange.start) / visibleDuration * availableWidth;
      this.elements.noDataLeftRect.setAttribute('x', padding);
      this.elements.noDataLeftRect.setAttribute('width', Math.max(0, noDataLeftEnd - padding));
      this.elements.noDataLeftRect.style.display = '';
    } else {
      this.elements.noDataLeftRect.style.display = 'none';
    } // Update no-data zone (right) - when visibleRange extends after fullRange


    if (this.visibleRange.end > this.fullRange.end) {
      var noDataRightStart = padding + (this.fullRange.end - this.visibleRange.start) / visibleDuration * availableWidth;
      this.elements.noDataRightRect.setAttribute('x', noDataRightStart);
      this.elements.noDataRightRect.setAttribute('width', Math.max(0, padding + availableWidth - noDataRightStart));
      this.elements.noDataRightRect.style.display = '';
    } else {
      this.elements.noDataRightRect.style.display = 'none';
    } // Update truncated zone (left) - when data was cut from beginning (latest=true)


    if (this.truncation.wasTruncated && this.truncation.leftZone) {
      var truncStart = padding + (this.truncation.leftZone.start - this.visibleRange.start) / visibleDuration * availableWidth;
      var truncEnd = padding + (this.truncation.leftZone.end - this.visibleRange.start) / visibleDuration * availableWidth; // Clamp to visible area

      var clampedStart = Math.max(padding, Math.min(padding + availableWidth, truncStart));
      var clampedEnd = Math.max(padding, Math.min(padding + availableWidth, truncEnd));
      var truncWidth = clampedEnd - clampedStart;

      if (truncWidth > 0) {
        this.elements.truncatedLeftRect.setAttribute('x', clampedStart);
        this.elements.truncatedLeftRect.setAttribute('width', truncWidth);
        this.elements.truncatedLeftRect.style.display = '';
      } else {
        this.elements.truncatedLeftRect.style.display = 'none';
      }
    } else {
      this.elements.truncatedLeftRect.style.display = 'none';
    } // Update truncated zone (right) - when data was cut from end (latest=false)


    if (this.truncation.wasTruncated && this.truncation.rightZone) {
      var _truncStart = padding + (this.truncation.rightZone.start - this.visibleRange.start) / visibleDuration * availableWidth;

      var _truncEnd = padding + (this.truncation.rightZone.end - this.visibleRange.start) / visibleDuration * availableWidth; // Clamp to visible area


      var _clampedStart = Math.max(padding, Math.min(padding + availableWidth, _truncStart));

      var _clampedEnd = Math.max(padding, Math.min(padding + availableWidth, _truncEnd));

      var _truncWidth = _clampedEnd - _clampedStart;

      if (_truncWidth > 0) {
        this.elements.truncatedRightRect.setAttribute('x', _clampedStart);
        this.elements.truncatedRightRect.setAttribute('width', _truncWidth);
        this.elements.truncatedRightRect.style.display = '';
      } else {
        this.elements.truncatedRightRect.style.display = 'none';
      }
    } else {
      this.elements.truncatedRightRect.style.display = 'none';
    }
  },

  /**
   * Draw timeline ticks and labels
   * Uses VISIBLE range for adaptive scaling (Yandex Cloud style)
   */
  drawTicks: function drawTicks() {
    var _this$dimensions2 = this.dimensions,
        width = _this$dimensions2.width,
        height = _this$dimensions2.height,
        padding = _this$dimensions2.padding;
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
    this.layers.ticks.appendChild(line);
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
    this.layers.ticks.appendChild(bg); // Create text label

    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'timeline-label');
    label.textContent = text;
    this.layers.ticks.appendChild(label);
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

    // Store bound handlers for cleanup in destroy()
    this._boundMouseDown = function (e) {
      return _this2.handleMouseDown(e);
    };

    this._boundMouseMove = function (e) {
      return _this2.handleMouseMove(e);
    };

    this._boundMouseUp = function () {
      return _this2.handleMouseUp();
    };

    this._boundZoneClick = function (e) {
      return _this2.handleZoneClick(e);
    };

    this.svg.addEventListener('mousedown', this._boundMouseDown);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp); // Handle click on truncated zone

    this.svg.addEventListener('click', this._boundZoneClick);
  },

  /**
   * Handle click on zone elements (truncated zones)
   * @param {MouseEvent} e - Mouse event
   */
  handleZoneClick: function handleZoneClick(e) {
    var target = e.target;
    var zone = target.getAttribute('data-zone');

    if (zone === 'truncated-left' && this.truncation.leftZone) {
      if (this.onTruncatedZoneClick) {
        // Left zone: data was cut from beginning (latest=true used)
        // To load this zone, we need latest=true to get entries from end of interval
        this.onTruncatedZoneClick(Math.round(this.truncation.leftZone.start), Math.round(this.truncation.leftZone.end), true // isLeftZone = true → use latest=true
        );
      }
    } else if (zone === 'truncated-right' && this.truncation.rightZone) {
      if (this.onTruncatedZoneClick) {
        // Right zone: data was cut from end (latest=false used)
        // To load this zone, we need latest=false to get entries from start of interval
        this.onTruncatedZoneClick(Math.round(this.truncation.rightZone.start), Math.round(this.truncation.rightZone.end), false // isLeftZone = false → use latest=false
        );
      }
    }
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
    } // Only update dynamic elements during drag (no ticks redraw)
    // This enables smooth CSS transitions


    this.updateDynamicElements();
  },

  /**
   * Handle mouse up (Yandex Cloud LogViewer style)
   * After drag: preserve user's manual selection and adjust visible range
   */
  handleMouseUp: function handleMouseUp() {
    if (this.dragging.active) {
      var wasResizing = this.dragging.handle === 'left' || this.dragging.handle === 'right';
      var wasDragging = this.dragging.handle === 'range';
      var draggedHandle = this.dragging.handle; // Save before reset

      this.dragging.active = false;
      this.dragging.handle = null;

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
        this.visibleRange.end = newVisibleEnd; // Do NOT call calculateCenteredSelection() here!
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
        this.visibleRange.end = _newVisibleEnd; // Do NOT call calculateCenteredSelection() here!
        // The user's manual selection must be preserved
      } // Render with new ranges


      this.render(); // Trigger callback to load data with user's selected range

      if (this.onRangeChange) {
        this.onRangeChange(Math.round(this.selectedRange.start), Math.round(this.selectedRange.end), draggedHandle);
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
   * Set selected range explicitly (without auto-centering or triggering onRangeChange)
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
    // Ensure minimum duration to prevent division by zero
    var MIN_DURATION = 60; // 1 minute minimum

    if (end - start < MIN_DURATION) {
      // Expand range symmetrically around the single timestamp
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
    this.visibleRange.end = newVisibleEnd; // Render with new ranges

    this.render(); // Note: Does NOT trigger onRangeChange callback
  },

  /**
   * Update timeline with server response (handles truncation visualization)
   * This is the preferred method to call after receiving data from server
   *
   * @param {object} actualRange - Server response: { start, end, lines_count, truncated }
   * @param {number} requestedStart - Original requested start timestamp
   * @param {number} requestedEnd - Original requested end timestamp
   * @param {boolean} isInitialLoad - If true, suppress truncated zone display (first page load)
   */
  updateFromServerResponse: function updateFromServerResponse(actualRange, requestedStart, requestedEnd) {
    var isInitialLoad = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    // Store what was requested
    this.requestedRange.start = requestedStart;
    this.requestedRange.end = requestedEnd; // Reset truncation info

    this.truncation.wasTruncated = false;
    this.truncation.linesCount = 0;
    this.truncation.direction = null;
    this.truncation.leftZone = null;
    this.truncation.rightZone = null; // Calculate truncation zone if data was truncated
    // Skip truncation zones on initial load - user expects to see "tail" of log

    if (actualRange.truncated && !isInitialLoad) {
      this.truncation.wasTruncated = true;
      this.truncation.linesCount = actualRange.lines_count;
      this.truncation.direction = actualRange.truncated_direction || 'right';

      if (this.truncation.direction === 'left') {
        // Truncated from left (latest=true): beginning of requested range was cut
        if (actualRange.start > requestedStart) {
          this.truncation.leftZone = {
            start: requestedStart,
            end: actualRange.start
          };
        }
      } else {
        // Truncated from right (latest=false): end of requested range was cut
        if (actualRange.end < requestedEnd) {
          this.truncation.rightZone = {
            start: actualRange.end,
            end: requestedEnd
          };
        }
      }
    } // Call existing updateSelectedRange logic for the rest
    // Ensure minimum duration to prevent division by zero


    var start = actualRange.start;
    var end = actualRange.end;
    var MIN_DURATION = 60; // 1 minute minimum

    if (end - start < MIN_DURATION) {
      var center = start;
      start = center - MIN_DURATION / 2;
      end = center + MIN_DURATION / 2;
    } // Set selected range to actual loaded data


    this.selectedRange.start = start;
    this.selectedRange.end = end; // Calculate what new visible range would be based on actual data (4x of selected)

    var selectedDuration = end - start;
    var newVisibleDuration = selectedDuration * 4;
    var selectedCenter = start + selectedDuration / 2;
    var newVisibleStart = selectedCenter - newVisibleDuration / 2;
    var newVisibleEnd = selectedCenter + newVisibleDuration / 2; // IMPORTANT: Preserve entire visibleRange if it was extended to current time
    // This ensures no-data zone displays correctly after refresh
    // When user clicks refresh, they want to see timeline up to current time
    // Preserve both position AND duration to prevent shrinking the visible area

    var currentVisibleDuration = this.visibleRange.end - this.visibleRange.start;

    if (this.visibleRange.end > newVisibleEnd || this.visibleRange.end > end) {
      // Keep the existing visibleRange entirely (both duration and end position)
      // Only selectedRange was updated above to show where actual data is
      // The gap between fullRange.end and visibleRange.end will show as no-data zone
      newVisibleEnd = this.visibleRange.end;
      newVisibleStart = this.visibleRange.start;
    }

    this.visibleRange.start = newVisibleStart;
    this.visibleRange.end = newVisibleEnd; // Render with new ranges

    this.render(); // Initialize popups after render (elements now exist in DOM)

    this.initializeZonePopups();
  },

  /**
   * Initialize Semantic UI popups for zone elements
   * Destroys existing popups before re-initialization to prevent leaks
   */
  initializeZonePopups: function initializeZonePopups() {
    // Check if jQuery and popup are available
    if (typeof $ === 'undefined' || typeof $.fn.popup === 'undefined') {
      return;
    }

    var noDataContent = globalTranslate.sd_NoDataForPeriod || 'No data available for this period';
    var truncatedContent = globalTranslate.sd_DataTruncatedClickToLoad || 'Data truncated (5000 lines limit). Click to load.';
    var popupSettings = {
      position: 'top center',
      variation: 'mini'
    }; // Popup for no-data zones

    [this.elements.noDataLeftRect, this.elements.noDataRightRect].forEach(function (el) {
      if (el) {
        $(el).popup('destroy').popup(_objectSpread(_objectSpread({}, popupSettings), {}, {
          content: noDataContent
        }));
      }
    }); // Popup for truncated zones

    [this.elements.truncatedLeftRect, this.elements.truncatedRightRect].forEach(function (el) {
      if (el) {
        $(el).popup('destroy').popup(_objectSpread(_objectSpread({}, popupSettings), {}, {
          content: truncatedContent
        }));
      }
    });
  },

  /**
   * Callback when truncated zone is clicked
   * Override this to load the truncated range
   * @param {number} start - Start timestamp of truncated zone
   * @param {number} end - End timestamp of truncated zone
   * @param {boolean} isLeftZone - True if left zone clicked (use latest=true), false for right zone
   */
  onTruncatedZoneClick: function onTruncatedZoneClick(start, end, isLeftZone) {// To be overridden
  },

  /**
   * Callback when range changes
   * @param {number} start - Start timestamp
   * @param {number} end - End timestamp
   */
  onRangeChange: function onRangeChange(start, end) {// To be overridden
  },

  /**
   * Set the visible range end to specific timestamp (for refresh mode)
   * This is called BEFORE server request to set where timeline should end
   * Only updates visibleRange, NOT selectedRange or fullRange
   * @param {number} newEnd - New end timestamp for visible range
   * @param {boolean} force - If true, always set even if newEnd <= current end
   */
  extendRange: function extendRange(newEnd) {
    var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (!force && newEnd <= this.visibleRange.end) {
      return; // No need to extend
    } // Only update visible range, NOT fullRange or selectedRange
    // fullRange represents actual data in log file
    // selectedRange represents the actual data period (not projected future)


    var visibleDuration = this.visibleRange.end - this.visibleRange.start;
    this.visibleRange.end = newEnd;
    this.visibleRange.start = newEnd - visibleDuration; // DO NOT shift selectedRange - it should remain bound to actual data
    // The gap between selectedRange.end and visibleRange.end will show as no-data zone
    // selectedRange will be updated by updateFromServerResponse() with real data
    // Re-render to show updated timeline with no-data zone

    this.render();
  },

  /**
   * Update fullRange.end based on actual data from server
   * Called when server returns actual_range with real data boundaries
   * @param {number} actualEnd - Actual end timestamp from server response
   */
  updateDataBoundary: function updateDataBoundary(actualEnd) {
    if (actualEnd > this.fullRange.end) {
      this.fullRange.end = actualEnd;
      this.render();
    }
  },

  /**
   * Destroy timeline
   */
  destroy: function destroy() {
    // Remove document/window-level event listeners to prevent memory leaks
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
    }

    if (this._boundMouseUp) {
      document.removeEventListener('mouseup', this._boundMouseUp);
    }

    if (this._boundResize) {
      window.removeEventListener('resize', this._boundResize);
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.svg = null;
    this.layers.ticks = null;
    this.layers.dynamic = null;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXN2Zy10aW1lbGluZS5qcyJdLCJuYW1lcyI6WyJTVkdUaW1lbGluZSIsImNvbnRhaW5lciIsInN2ZyIsImxheWVycyIsInRpY2tzIiwiZHluYW1pYyIsImVsZW1lbnRzIiwic2VsZWN0aW9uUmVjdCIsImxlZnRIYW5kbGUiLCJyaWdodEhhbmRsZSIsIm5vd0xpbmUiLCJzdGFydEJvdW5kYXJ5IiwiZW5kQm91bmRhcnkiLCJub0RhdGFMZWZ0UmVjdCIsIm5vRGF0YVJpZ2h0UmVjdCIsInRydW5jYXRlZExlZnRSZWN0IiwidHJ1bmNhdGVkUmlnaHRSZWN0IiwiZnVsbFJhbmdlIiwic3RhcnQiLCJlbmQiLCJ2aXNpYmxlUmFuZ2UiLCJzZWxlY3RlZFJhbmdlIiwicmVxdWVzdGVkUmFuZ2UiLCJ0cnVuY2F0aW9uIiwid2FzVHJ1bmNhdGVkIiwibGluZXNDb3VudCIsImRpcmVjdGlvbiIsImxlZnRab25lIiwicmlnaHRab25lIiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJkaW1lbnNpb25zIiwid2lkdGgiLCJoZWlnaHQiLCJwYWRkaW5nIiwiZHJhZ2dpbmciLCJhY3RpdmUiLCJoYW5kbGUiLCJzdGFydFgiLCJzdGFydFNlbGVjdGVkU3RhcnQiLCJzdGFydFNlbGVjdGVkRW5kIiwiaW5pdGlhbGl6ZSIsInRpbWVSYW5nZSIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsImNvbnNvbGUiLCJlcnJvciIsImlzTmFOIiwiTUlOX0RVUkFUSU9OIiwiZGlzcGxheVN0YXJ0IiwiZGlzcGxheUVuZCIsImNlbnRlciIsIm9mZnNldFdpZHRoIiwidG90YWxEdXJhdGlvbiIsImluaXRpYWxWaXNpYmxlRHVyYXRpb24iLCJNYXRoIiwibWF4IiwiY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24iLCJjcmVhdGVTVkciLCJyZW5kZXIiLCJhdHRhY2hFdmVudHMiLCJfYm91bmRSZXNpemUiLCJoYW5kbGVSZXNpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwidmlzaWJsZUR1cmF0aW9uIiwic2VsZWN0ZWREdXJhdGlvbiIsInZpc2libGVDZW50ZXIiLCJjYWxjdWxhdGVBZGFwdGl2ZVN0ZXAiLCJkdXJhdGlvbiIsImF2YWlsYWJsZVdpZHRoIiwic3RlcHMiLCJ2YWx1ZSIsImxhYmVsIiwiZm9ybWF0IiwibWluU3BhY2luZ1B4IiwibWF4TGFiZWxzIiwiZmxvb3IiLCJ0YXJnZXRNaW5MYWJlbHMiLCJtaW4iLCJ0YXJnZXRNYXhMYWJlbHMiLCJpIiwibGVuZ3RoIiwibnVtTGFiZWxzIiwiYmVzdFN0ZXAiLCJiZXN0RGlmZiIsIkluZmluaXR5IiwiZGlmZiIsImNyZWF0ZUVsZW1lbnROUyIsInNldEF0dHJpYnV0ZSIsImRlZnMiLCJwYXR0ZXJuIiwicGF0dGVyblJlY3QiLCJhcHBlbmRDaGlsZCIsImNyZWF0ZUR5bmFtaWNFbGVtZW50cyIsImlubmVySFRNTCIsInN0eWxlIiwiZGlzcGxheSIsInJlbmRlclRpY2tzIiwidXBkYXRlRHluYW1pY0VsZW1lbnRzIiwiZHJhd1RpY2tzIiwibGVmdFgiLCJyaWdodFgiLCJ3Iiwibm93IiwiRGF0ZSIsIm5vd0J1ZmZlciIsImNsYW1wZWROb3ciLCJub3dYIiwieFN0YXJ0IiwieEVuZCIsIm5vRGF0YUxlZnRFbmQiLCJub0RhdGFSaWdodFN0YXJ0IiwidHJ1bmNTdGFydCIsInRydW5jRW5kIiwiY2xhbXBlZFN0YXJ0IiwiY2xhbXBlZEVuZCIsInRydW5jV2lkdGgiLCJ3YXJuIiwic3RlcCIsInJvdW5kZWRTdGFydCIsIm1ham9yVGlja1Bvc2l0aW9ucyIsIlNldCIsInRpbWVzdGFtcCIsIngiLCJhZGQiLCJyb3VuZCIsImRyYXdUaWNrIiwiZHJhd0xhYmVsIiwiZm9ybWF0VGltZSIsIm1pbm9yVGltZXN0YW1wIiwibWlub3JTdGVwIiwicm91bmRlZE1pbm9yVGltZXN0YW1wIiwiaGFzIiwieSIsImNvbG9yIiwibGluZSIsInRleHQiLCJiYm94IiwiZ2V0VGV4dEJCb3giLCJiZyIsInRleHRDb250ZW50IiwiZm9udFNpemUiLCJjaGFyV2lkdGgiLCJpbmNsdWRlcyIsInNlcnZlclRpbWVNcyIsImRhdGUiLCJtb250aCIsIlN0cmluZyIsImdldFVUQ01vbnRoIiwicGFkU3RhcnQiLCJkYXkiLCJnZXRVVENEYXRlIiwiaG91cnMiLCJnZXRVVENIb3VycyIsIm1pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwic2Vjb25kcyIsImdldFVUQ1NlY29uZHMiLCJfYm91bmRNb3VzZURvd24iLCJlIiwiaGFuZGxlTW91c2VEb3duIiwiX2JvdW5kTW91c2VNb3ZlIiwiaGFuZGxlTW91c2VNb3ZlIiwiX2JvdW5kTW91c2VVcCIsImhhbmRsZU1vdXNlVXAiLCJfYm91bmRab25lQ2xpY2siLCJoYW5kbGVab25lQ2xpY2siLCJ0YXJnZXQiLCJ6b25lIiwiZ2V0QXR0cmlidXRlIiwib25UcnVuY2F0ZWRab25lQ2xpY2siLCJjbGllbnRYIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNvbnRhaW5lckxlZnQiLCJsZWZ0IiwiY29udGFpbmVyV2lkdGgiLCJwcmV2ZW50RGVmYXVsdCIsImRlbHRhWCIsImRlbHRhVGltZSIsIm5ld1N0YXJ0IiwibmV3RW5kIiwid2FzUmVzaXppbmciLCJ3YXNEcmFnZ2luZyIsImRyYWdnZWRIYW5kbGUiLCJuZXdWaXNpYmxlRHVyYXRpb24iLCJzZWxlY3RlZENlbnRlciIsIm5ld1Zpc2libGVTdGFydCIsIm5ld1Zpc2libGVFbmQiLCIkIiwicmVtb3ZlQ2xhc3MiLCJvblJhbmdlQ2hhbmdlIiwiYXBwbHlQZXJpb2QiLCJwZXJpb2RTZWNvbmRzIiwicGVyaW9kIiwicGFyc2VJbnQiLCJzZXRSYW5nZSIsInVwZGF0ZVNlbGVjdGVkUmFuZ2UiLCJ1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UiLCJhY3R1YWxSYW5nZSIsInJlcXVlc3RlZFN0YXJ0IiwicmVxdWVzdGVkRW5kIiwiaXNJbml0aWFsTG9hZCIsInRydW5jYXRlZCIsImxpbmVzX2NvdW50IiwidHJ1bmNhdGVkX2RpcmVjdGlvbiIsImN1cnJlbnRWaXNpYmxlRHVyYXRpb24iLCJpbml0aWFsaXplWm9uZVBvcHVwcyIsImZuIiwicG9wdXAiLCJub0RhdGFDb250ZW50IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfTm9EYXRhRm9yUGVyaW9kIiwidHJ1bmNhdGVkQ29udGVudCIsInNkX0RhdGFUcnVuY2F0ZWRDbGlja1RvTG9hZCIsInBvcHVwU2V0dGluZ3MiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImZvckVhY2giLCJlbCIsImNvbnRlbnQiLCJpc0xlZnRab25lIiwiZXh0ZW5kUmFuZ2UiLCJmb3JjZSIsInVwZGF0ZURhdGFCb3VuZGFyeSIsImFjdHVhbEVuZCIsImRlc3Ryb3kiLCJyZW1vdmVFdmVudExpc3RlbmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUxLOztBQU9oQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxHQUFHLEVBQUUsSUFYVzs7QUFhaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFO0FBQ0pDLElBQUFBLEtBQUssRUFBRSxJQURIO0FBQ2M7QUFDbEJDLElBQUFBLE9BQU8sRUFBRSxJQUZMLENBRWM7O0FBRmQsR0FqQlE7O0FBc0JoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUU7QUFDTkMsSUFBQUEsYUFBYSxFQUFFLElBRFQ7QUFFTkMsSUFBQUEsVUFBVSxFQUFFLElBRk47QUFHTkMsSUFBQUEsV0FBVyxFQUFFLElBSFA7QUFJTkMsSUFBQUEsT0FBTyxFQUFFLElBSkg7QUFLTkMsSUFBQUEsYUFB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ZTs7QUEwcUNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lzSyxFQUFBQSxrQkEvcUNnQiw4QkErcUNHQyxTQS9xQ0gsRUErcUNjO0FBQzFCLFFBQUlBLFNBQVMsR0FBRyxLQUFLaE4sU0FBTCxDQUFlRSxHQUEvQixFQUFvQztBQUNoQyxXQUFLRixTQUFMLENBQWVFLEdBQWYsR0FBcUI4TSxTQUFyQjtBQUNBLFdBQUt2SyxNQUFMO0FBQ0g7QUFDSixHQXByQ2U7O0FBc3JDaEI7QUFDSjtBQUNBO0FBQ0l3SyxFQUFBQSxPQXpyQ2dCLHFCQXlyQ047QUFDTjtBQUNBLFFBQUksS0FBS2pFLGVBQVQsRUFBMEI7QUFDdEJ2SCxNQUFBQSxRQUFRLENBQUN5TCxtQkFBVCxDQUE2QixXQUE3QixFQUEwQyxLQUFLbEUsZUFBL0M7QUFDSDs7QUFDRCxRQUFJLEtBQUtFLGFBQVQsRUFBd0I7QUFDcEJ6SCxNQUFBQSxRQUFRLENBQUN5TCxtQkFBVCxDQUE2QixTQUE3QixFQUF3QyxLQUFLaEUsYUFBN0M7QUFDSDs7QUFDRCxRQUFJLEtBQUt2RyxZQUFULEVBQXVCO0FBQ25CRSxNQUFBQSxNQUFNLENBQUNxSyxtQkFBUCxDQUEyQixRQUEzQixFQUFxQyxLQUFLdkssWUFBMUM7QUFDSDs7QUFFRCxRQUFJLEtBQUszRCxTQUFULEVBQW9CO0FBQ2hCLFdBQUtBLFNBQUwsQ0FBZTZGLFNBQWYsR0FBMkIsRUFBM0I7QUFDSDs7QUFFRCxTQUFLNUYsR0FBTCxHQUFXLElBQVg7QUFDQSxTQUFLQyxNQUFMLENBQVlDLEtBQVosR0FBb0IsSUFBcEI7QUFDQSxTQUFLRCxNQUFMLENBQVlFLE9BQVosR0FBc0IsSUFBdEI7QUFDSDtBQTVzQ2UsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKipcbiAqIFNWRyBUaW1lbGluZSBjb21wb25lbnQgZm9yIGxvZyBuYXZpZ2F0aW9uXG4gKiBHcmFmYW5hLXN0eWxlIHRpbWVsaW5lIHdpdGggcmFuZ2Ugc2VsZWN0aW9uXG4gKlxuICogQG1vZHVsZSBTVkdUaW1lbGluZVxuICovXG5jb25zdCBTVkdUaW1lbGluZSA9IHtcbiAgICAvKipcbiAgICAgKiBDb250YWluZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBjb250YWluZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTVkcgZWxlbWVudFxuICAgICAqIEB0eXBlIHtTVkdFbGVtZW50fVxuICAgICAqL1xuICAgIHN2ZzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNWRyBncm91cHMgZm9yIGxheWVyaW5nXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBsYXllcnM6IHtcbiAgICAgICAgdGlja3M6IG51bGwsICAgICAgLy8gQmFja2dyb3VuZCBsYXllciBmb3IgdGlja3MgYW5kIGxhYmVsc1xuICAgICAgICBkeW5hbWljOiBudWxsICAgICAvLyBGb3JlZ3JvdW5kIGxheWVyIGZvciBzZWxlY3Rpb24sIGhhbmRsZXMsIGJvdW5kYXJpZXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGVyc2lzdGVudCBkeW5hbWljIFNWRyBlbGVtZW50cyAoZm9yIENTUyB0cmFuc2l0aW9ucylcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGVsZW1lbnRzOiB7XG4gICAgICAgIHNlbGVjdGlvblJlY3Q6IG51bGwsXG4gICAgICAgIGxlZnRIYW5kbGU6IG51bGwsXG4gICAgICAgIHJpZ2h0SGFuZGxlOiBudWxsLFxuICAgICAgICBub3dMaW5lOiBudWxsLFxuICAgICAgICBzdGFydEJvdW5kYXJ5OiBudWxsLFxuICAgICAgICBlbmRCb3VuZGFyeTogbnVsbCxcbiAgICAgICAgbm9EYXRhTGVmdFJlY3Q6IG51bGwsXG4gICAgICAgIG5vRGF0YVJpZ2h0UmVjdDogbnVsbCxcbiAgICAgICAgdHJ1bmNhdGVkTGVmdFJlY3Q6IG51bGwsXG4gICAgICAgIHRydW5jYXRlZFJpZ2h0UmVjdDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdWxsIGF2YWlsYWJsZSByYW5nZSAoZW50aXJlIGxvZyBmaWxlKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZnVsbFJhbmdlOiB7XG4gICAgICAgIHN0YXJ0OiBudWxsLFxuICAgICAgICBlbmQ6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmlzaWJsZSByYW5nZSBvbiB0aW1lbGluZSAoY29udHJvbGxlZCBieSBwZXJpb2QgYnV0dG9ucyBhbmQgem9vbSlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZpc2libGVSYW5nZToge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbGVjdGVkIHJhbmdlIGZvciBkYXRhIGxvYWRpbmcgKGFsd2F5cyAxLzQgb2YgdmlzaWJsZVJhbmdlLCBjZW50ZXJlZClcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNlbGVjdGVkUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0ZWQgcmFuZ2UgKHdoYXQgd2FzIHNlbnQgdG8gc2VydmVyIGJlZm9yZSB0cnVuY2F0aW9uKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgcmVxdWVzdGVkUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcnVuY2F0aW9uIGluZm8gZnJvbSBzZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHRydW5jYXRpb246IHtcbiAgICAgICAgd2FzVHJ1bmNhdGVkOiBmYWxzZSxcbiAgICAgICAgbGluZXNDb3VudDogMCxcbiAgICAgICAgZGlyZWN0aW9uOiBudWxsLCAgLy8gJ2xlZnQnIG9yICdyaWdodCdcbiAgICAgICAgbGVmdFpvbmU6IG51bGwsICAgLy8geyBzdGFydCwgZW5kIH0gaWYgZGF0YSB3YXMgdHJ1bmNhdGVkIGZyb20gbGVmdCAobGF0ZXN0PXRydWUpXG4gICAgICAgIHJpZ2h0Wm9uZTogbnVsbCAgIC8vIHsgc3RhcnQsIGVuZCB9IGlmIGRhdGEgd2FzIHRydW5jYXRlZCBmcm9tIHJpZ2h0IChsYXRlc3Q9ZmFsc2UpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlcnZlciB0aW1lem9uZSBvZmZzZXQgaW4gc2Vjb25kc1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgc2VydmVyVGltZXpvbmVPZmZzZXQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBEaW1lbnNpb25zIC0gY29tcGFjdCB2ZXJzaW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkaW1lbnNpb25zOiB7XG4gICAgICAgIHdpZHRoOiAwLFxuICAgICAgICBoZWlnaHQ6IDI0LFxuICAgICAgICBwYWRkaW5nOiA4XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYWdnaW5nIHN0YXRlXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkcmFnZ2luZzoge1xuICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICBoYW5kbGU6IG51bGwsIC8vICdsZWZ0JywgJ3JpZ2h0JywgJ3JhbmdlJ1xuICAgICAgICBzdGFydFg6IDAsXG4gICAgICAgIHN0YXJ0U2VsZWN0ZWRTdGFydDogMCxcbiAgICAgICAgc3RhcnRTZWxlY3RlZEVuZDogMFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVsaW5lIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfEhUTUxFbGVtZW50fSBjb250YWluZXIgLSBDb250YWluZXIgc2VsZWN0b3Igb3IgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lUmFuZ2UgLSBGdWxsIHRpbWUgcmFuZ2Ugd2l0aCBzdGFydCBhbmQgZW5kIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKGNvbnRhaW5lciwgdGltZVJhbmdlKSB7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdHlwZW9mIGNvbnRhaW5lciA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihjb250YWluZXIpXG4gICAgICAgICAgICA6IGNvbnRhaW5lcjtcblxuICAgICAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUaW1lbGluZSBjb250YWluZXIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSB0aW1lIHJhbmdlIC0gbXVzdCBoYXZlIHZhbGlkIG51bWVyaWMgdGltZXN0YW1wc1xuICAgICAgICBpZiAodHlwZW9mIHRpbWVSYW5nZS5zdGFydCAhPT0gJ251bWJlcicgfHwgdHlwZW9mIHRpbWVSYW5nZS5lbmQgIT09ICdudW1iZXInIHx8XG4gICAgICAgICAgICBpc05hTih0aW1lUmFuZ2Uuc3RhcnQpIHx8IGlzTmFOKHRpbWVSYW5nZS5lbmQpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTVkdUaW1lbGluZTogSW52YWxpZCB0aW1lIHJhbmdlIC0gc3RhcnQgYW5kIGVuZCBtdXN0IGJlIHZhbGlkIG51bWJlcnMnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0b3JlIGZ1bGwgcmFuZ2UgKGVudGlyZSBsb2cgZmlsZSkgLSBPUklHSU5BTCB2YWx1ZXMsIG5ldmVyIGV4cGFuZGVkXG4gICAgICAgIC8vIGZ1bGxSYW5nZSByZXByZXNlbnRzIGFjdHVhbCBkYXRhIGJvdW5kYXJpZXMgZm9yIG5vLWRhdGEgem9uZSBjYWxjdWxhdGlvblxuICAgICAgICB0aGlzLmZ1bGxSYW5nZS5zdGFydCA9IHRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgdGhpcy5mdWxsUmFuZ2UuZW5kID0gdGltZVJhbmdlLmVuZDtcblxuICAgICAgICAvLyBGb3IgZGlzcGxheSBwdXJwb3NlcywgZXhwYW5kIHJhbmdlIGlmIHRvbyBzaG9ydCAocHJldmVudHMgZGl2aXNpb24gYnkgemVybylcbiAgICAgICAgLy8gQnV0IGtlZXAgZnVsbFJhbmdlIGFzIG9yaWdpbmFsIGZvciBuby1kYXRhIHpvbmUgZGV0ZWN0aW9uXG4gICAgICAgIGNvbnN0IE1JTl9EVVJBVElPTiA9IDYwOyAvLyAxIG1pbnV0ZSBtaW5pbXVtXG4gICAgICAgIGxldCBkaXNwbGF5U3RhcnQgPSB0aW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGxldCBkaXNwbGF5RW5kID0gdGltZVJhbmdlLmVuZDtcbiAgICAgICAgaWYgKGRpc3BsYXlFbmQgLSBkaXNwbGF5U3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IGRpc3BsYXlTdGFydDtcbiAgICAgICAgICAgIGRpc3BsYXlTdGFydCA9IGNlbnRlciAtIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgICAgIGRpc3BsYXlFbmQgPSBjZW50ZXIgKyAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMud2lkdGggPSB0aGlzLmNvbnRhaW5lci5vZmZzZXRXaWR0aDtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaW5pdGlhbCB2aXNpYmxlIHJhbmdlIGJhc2VkIG9uIGRpc3BsYXkgZHVyYXRpb24gKGV4cGFuZGVkIGZvciBzaG9ydCBsb2dzKVxuICAgICAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gZGlzcGxheUVuZCAtIGRpc3BsYXlTdGFydDtcbiAgICAgICAgbGV0IGluaXRpYWxWaXNpYmxlRHVyYXRpb247XG5cbiAgICAgICAgaWYgKHRvdGFsRHVyYXRpb24gPiA4NjQwMCAqIDcpIHtcbiAgICAgICAgICAgIC8vIElmIGxvZ3Mgc3BhbiBtb3JlIHRoYW4gNyBkYXlzLCBzaG93IGxhc3QgMjQgaG91cnMgYXMgdmlzaWJsZVxuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IDg2NDAwOyAvLyAyNCBob3Vyc1xuICAgICAgICB9IGVsc2UgaWYgKHRvdGFsRHVyYXRpb24gPiA4NjQwMCkge1xuICAgICAgICAgICAgLy8gSWYgbG9ncyBzcGFuIDEtNyBkYXlzLCBzaG93IGxhc3QgMTIgaG91cnNcbiAgICAgICAgICAgIGluaXRpYWxWaXNpYmxlRHVyYXRpb24gPSA0MzIwMDsgLy8gMTIgaG91cnNcbiAgICAgICAgfSBlbHNlIGlmICh0b3RhbER1cmF0aW9uID4gMzYwMCAqIDYpIHtcbiAgICAgICAgICAgIC8vIElmIGxvZ3Mgc3BhbiA2LTI0IGhvdXJzLCBzaG93IGxhc3QgNiBob3Vyc1xuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IDIxNjAwOyAvLyA2IGhvdXJzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnRlciBsb2dzLCBzaG93IGVudGlyZSByYW5nZVxuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IHRvdGFsRHVyYXRpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdmlzaWJsZSByYW5nZSAod2hhdCB1c2VyIHNlZXMgb24gdGltZWxpbmUpIC0gdXNlIGV4cGFuZGVkIGRpc3BsYXkgcmFuZ2VcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gZGlzcGxheUVuZDtcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBNYXRoLm1heChkaXNwbGF5RW5kIC0gaW5pdGlhbFZpc2libGVEdXJhdGlvbiwgZGlzcGxheVN0YXJ0KTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgc2VsZWN0ZWQgcmFuZ2UgYXMgMS80IG9mIHZpc2libGUgcmFuZ2UsIGNlbnRlcmVkXG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKTtcblxuICAgICAgICAvLyBDcmVhdGUgU1ZHIHN0cnVjdHVyZVxuICAgICAgICB0aGlzLmNyZWF0ZVNWRygpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB0aGlzLmF0dGFjaEV2ZW50cygpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB3aW5kb3cgcmVzaXplIChzdG9yZWQgZm9yIGNsZWFudXAgaW4gZGVzdHJveSgpKVxuICAgICAgICB0aGlzLl9ib3VuZFJlc2l6ZSA9ICgpID0+IHRoaXMuaGFuZGxlUmVzaXplKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9ib3VuZFJlc2l6ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBjZW50ZXJlZCBzZWxlY3Rpb24gKDEvNCBvZiB2aXNpYmxlIHJhbmdlLCBwb3NpdGlvbmVkIGF0IGNlbnRlcilcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgdmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSB2aXNpYmxlRHVyYXRpb24gLyA0O1xuICAgICAgICBjb25zdCB2aXNpYmxlQ2VudGVyID0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgKyAodmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gdmlzaWJsZUNlbnRlciAtIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB2aXNpYmxlQ2VudGVyICsgKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBFbnN1cmUgc2VsZWN0ZWQgcmFuZ2Ugc3RheXMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA8IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCArIHNlbGVjdGVkRHVyYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPiB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB0aGlzLnZpc2libGVSYW5nZS5lbmQ7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSBzZWxlY3RlZER1cmF0aW9uO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBhZGFwdGl2ZSB0aW1lIHN0ZXAgYmFzZWQgb24gcmFuZ2UgZHVyYXRpb24gYW5kIGF2YWlsYWJsZSB3aWR0aFxuICAgICAqIEVuc3VyZXMgbGFiZWxzIGFyZSBub3QgY2xvc2VyIHRoYW4gMmNtICh+NzVweCBhdCBzdGFuZGFyZCBEUEkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gLSBEdXJhdGlvbiBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGF2YWlsYWJsZVdpZHRoIC0gQXZhaWxhYmxlIHdpZHRoIGluIHBpeGVsc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFN0ZXAgY29uZmlndXJhdGlvbiB7dmFsdWUsIGxhYmVsLCBmb3JtYXR9XG4gICAgICovXG4gICAgY2FsY3VsYXRlQWRhcHRpdmVTdGVwKGR1cmF0aW9uLCBhdmFpbGFibGVXaWR0aCkge1xuICAgICAgICAvLyBUaW1lIHN0ZXBzIGluIHNlY29uZHMgd2l0aCBsYWJlbHMgKGZyb20gc21hbGxlc3QgdG8gbGFyZ2VzdClcbiAgICAgICAgY29uc3Qgc3RlcHMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAxLCBsYWJlbDogJzEgc2VjJywgZm9ybWF0OiAnSEg6TU06U1MnIH0sICAgICAgICAvLyAxIHNlY29uZFxuICAgICAgICAgICAgeyB2YWx1ZTogNSwgbGFiZWw6ICc1IHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgICAgLy8gNSBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiAxMCwgbGFiZWw6ICcxMCBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAvLyAxMCBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiAzMCwgbGFiZWw6ICczMCBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAvLyAzMCBzZWNvbmRzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MCwgbGFiZWw6ICcxIG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAgICAvLyAxIG1pbnV0ZVxuICAgICAgICAgICAgeyB2YWx1ZTogMzAwLCBsYWJlbDogJzUgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAgLy8gNSBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MDAsIGxhYmVsOiAnMTAgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAvLyAxMCBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiAxODAwLCBsYWJlbDogJzMwIG1pbicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAvLyAzMCBtaW51dGVzXG4gICAgICAgICAgICB7IHZhbHVlOiAzNjAwLCBsYWJlbDogJzEgaG91cicsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgICAvLyAxIGhvdXJcbiAgICAgICAgICAgIHsgdmFsdWU6IDEwODAwLCBsYWJlbDogJzMgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgIC8vIDMgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDIxNjAwLCBsYWJlbDogJzYgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgIC8vIDYgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDQzMjAwLCBsYWJlbDogJzEyIGhvdXJzJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgIC8vIDEyIGhvdXJzXG4gICAgICAgICAgICB7IHZhbHVlOiA4NjQwMCwgbGFiZWw6ICcxIGRheScsIGZvcm1hdDogJ01NLUREJyB9LCAgICAgICAvLyAxIGRheVxuICAgICAgICAgICAgeyB2YWx1ZTogMjU5MjAwLCBsYWJlbDogJzMgZGF5cycsIGZvcm1hdDogJ01NLUREJyB9LCAgICAgLy8gMyBkYXlzXG4gICAgICAgICAgICB7IHZhbHVlOiA2MDQ4MDAsIGxhYmVsOiAnMSB3ZWVrJywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAvLyA3IGRheXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDI1OTIwMDAsIGxhYmVsOiAnMSBtb250aCcsIGZvcm1hdDogJ01NLUREJyB9ICAgIC8vIDMwIGRheXNcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBNaW5pbXVtIHNwYWNpbmcgYmV0d2VlbiBsYWJlbHM6IDJjbSDiiYggNzVweCAoYXQgOTYgRFBJKVxuICAgICAgICAvLyBVc2luZyA4MHB4IHRvIGJlIHNhZmUgYW5kIGFjY291bnQgZm9yIGxhYmVsIHdpZHRoXG4gICAgICAgIGNvbnN0IG1pblNwYWNpbmdQeCA9IDgwO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBtYXhpbXVtIG51bWJlciBvZiBsYWJlbHMgdGhhdCBmaXQgd2l0aCBtaW5pbXVtIHNwYWNpbmdcbiAgICAgICAgY29uc3QgbWF4TGFiZWxzID0gTWF0aC5mbG9vcihhdmFpbGFibGVXaWR0aCAvIG1pblNwYWNpbmdQeCk7XG5cbiAgICAgICAgLy8gRW5zdXJlIGF0IGxlYXN0IDIgbGFiZWxzLCBidXQgbm90IG1vcmUgdGhhbiBhdmFpbGFibGUgc3BhY2UgYWxsb3dzXG4gICAgICAgIGNvbnN0IHRhcmdldE1pbkxhYmVscyA9IE1hdGgubWF4KDIsIE1hdGgubWluKDQsIG1heExhYmVscykpO1xuICAgICAgICBjb25zdCB0YXJnZXRNYXhMYWJlbHMgPSBNYXRoLm1heCh0YXJnZXRNaW5MYWJlbHMsIG1heExhYmVscyk7XG5cbiAgICAgICAgLy8gRmluZCBzdGVwIHRoYXQgcHJvZHVjZXMgYXBwcm9wcmlhdGUgbnVtYmVyIG9mIGxhYmVsc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBudW1MYWJlbHMgPSBNYXRoLmZsb29yKGR1cmF0aW9uIC8gc3RlcHNbaV0udmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIHN0ZXAgcHJvZHVjZXMgYWNjZXB0YWJsZSBudW1iZXIgb2YgbGFiZWxzXG4gICAgICAgICAgICBpZiAobnVtTGFiZWxzID49IHRhcmdldE1pbkxhYmVscyAmJiBudW1MYWJlbHMgPD0gdGFyZ2V0TWF4TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ZXBzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbm8gcGVyZmVjdCBtYXRjaCwgZmluZCBjbG9zZXN0IG1hdGNoXG4gICAgICAgIGxldCBiZXN0U3RlcCA9IHN0ZXBzWzBdO1xuICAgICAgICBsZXQgYmVzdERpZmYgPSBJbmZpbml0eTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBudW1MYWJlbHMgPSBNYXRoLmZsb29yKGR1cmF0aW9uIC8gc3RlcHNbaV0udmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBGb3IgdmVyeSBzaG9ydCBkdXJhdGlvbnMsIHByZWZlciBzdGVwIHRoYXQgcHJvZHVjZXMgYXQgbGVhc3QgMiBsYWJlbHNcbiAgICAgICAgICAgIGlmIChkdXJhdGlvbiA8IHN0ZXBzWzBdLnZhbHVlICogdGFyZ2V0TWluTGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bUxhYmVscyA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGVwc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBkaWZmZXJlbmNlIGZyb20gaWRlYWwgcmFuZ2VcbiAgICAgICAgICAgIGxldCBkaWZmO1xuICAgICAgICAgICAgaWYgKG51bUxhYmVscyA8IHRhcmdldE1pbkxhYmVscykge1xuICAgICAgICAgICAgICAgIGRpZmYgPSAodGFyZ2V0TWluTGFiZWxzIC0gbnVtTGFiZWxzKSAqIDI7IC8vIFBlbmFsaXplIHRvbyBmZXcgbGFiZWxzIG1vcmVcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtTGFiZWxzID4gdGFyZ2V0TWF4TGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IG51bUxhYmVscyAtIHRhcmdldE1heExhYmVsczsgLy8gUGVuYWxpemUgdG9vIG1hbnkgbGFiZWxzXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpZmYgPSAwOyAvLyBXaXRoaW4gYWNjZXB0YWJsZSByYW5nZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlmZiA8IGJlc3REaWZmKSB7XG4gICAgICAgICAgICAgICAgYmVzdERpZmYgPSBkaWZmO1xuICAgICAgICAgICAgICAgIGJlc3RTdGVwID0gc3RlcHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmVzdFN0ZXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBTVkcgZWxlbWVudCB3aXRoIHBlcnNpc3RlbnQgZHluYW1pYyBlbGVtZW50c1xuICAgICAqL1xuICAgIGNyZWF0ZVNWRygpIHtcbiAgICAgICAgY29uc3Qgc3ZnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtc3ZnJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdGhpcy5kaW1lbnNpb25zLmhlaWdodCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRlZnMgZm9yIHBhdHRlcm5zXG4gICAgICAgIGNvbnN0IGRlZnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2RlZnMnKTtcblxuICAgICAgICAvLyBEaWFnb25hbCBzdHJpcGVzIHBhdHRlcm4gZm9yIFwibm8gZGF0YVwiIHpvbmVzXG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3BhdHRlcm4nKTtcbiAgICAgICAgcGF0dGVybi5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RpbWVsaW5lLW5vLWRhdGEtcGF0dGVybicpO1xuICAgICAgICBwYXR0ZXJuLnNldEF0dHJpYnV0ZSgncGF0dGVyblVuaXRzJywgJ3VzZXJTcGFjZU9uVXNlJyk7XG4gICAgICAgIHBhdHRlcm4uc2V0QXR0cmlidXRlKCd3aWR0aCcsICc4Jyk7XG4gICAgICAgIHBhdHRlcm4uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnOCcpO1xuICAgICAgICBwYXR0ZXJuLnNldEF0dHJpYnV0ZSgncGF0dGVyblRyYW5zZm9ybScsICdyb3RhdGUoNDUpJyk7XG5cbiAgICAgICAgY29uc3QgcGF0dGVyblJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgcGF0dGVyblJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsICc0Jyk7XG4gICAgICAgIHBhdHRlcm5SZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgJzgnKTtcbiAgICAgICAgcGF0dGVyblJlY3Quc2V0QXR0cmlidXRlKCdmaWxsJywgJ3JnYmEoMCwgMCwgMCwgMC4wOCknKTtcblxuICAgICAgICBwYXR0ZXJuLmFwcGVuZENoaWxkKHBhdHRlcm5SZWN0KTtcbiAgICAgICAgZGVmcy5hcHBlbmRDaGlsZChwYXR0ZXJuKTtcbiAgICAgICAgc3ZnLmFwcGVuZENoaWxkKGRlZnMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBsYXllciBncm91cHMgZm9yIHByb3BlciB6LW9yZGVyaW5nXG4gICAgICAgIHRoaXMubGF5ZXJzLnRpY2tzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdnJyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLnRpY2tzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtdGlja3MtbGF5ZXInKTtcblxuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdnJyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1keW5hbWljLWxheWVyJyk7XG5cbiAgICAgICAgc3ZnLmFwcGVuZENoaWxkKHRoaXMubGF5ZXJzLnRpY2tzKTtcbiAgICAgICAgc3ZnLmFwcGVuZENoaWxkKHRoaXMubGF5ZXJzLmR5bmFtaWMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBwZXJzaXN0ZW50IGR5bmFtaWMgZWxlbWVudHMgKGZvciBDU1MgdHJhbnNpdGlvbnMpXG4gICAgICAgIHRoaXMuY3JlYXRlRHluYW1pY0VsZW1lbnRzKCk7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHN2Zyk7XG4gICAgICAgIHRoaXMuc3ZnID0gc3ZnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcGVyc2lzdGVudCBkeW5hbWljIFNWRyBlbGVtZW50cyBvbmNlXG4gICAgICogVGhlc2UgZWxlbWVudHMgYXJlIHVwZGF0ZWQgdmlhIHNldEF0dHJpYnV0ZSBmb3Igc21vb3RoIENTUyB0cmFuc2l0aW9uc1xuICAgICAqL1xuICAgIGNyZWF0ZUR5bmFtaWNFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgeyBoZWlnaHQgfSA9IHRoaXMuZGltZW5zaW9ucztcblxuICAgICAgICAvLyBObyBkYXRhIHpvbmUgLSBsZWZ0IChiZXlvbmQgZnVsbFJhbmdlLnN0YXJ0KVxuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtbm8tZGF0YScpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdCk7XG5cbiAgICAgICAgLy8gTm8gZGF0YSB6b25lIC0gcmlnaHQgKGJleW9uZCBmdWxsUmFuZ2UuZW5kKVxuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLW5vLWRhdGEnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdCk7XG5cbiAgICAgICAgLy8gVHJ1bmNhdGVkIHpvbmUgLSBsZWZ0IChkYXRhIGN1dCBieSA1MDAwIGxpbmUgbGltaXQgd2hlbiBsYXRlc3Q9dHJ1ZSlcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLXRydW5jYXRlZCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgnZGF0YS16b25lJywgJ3RydW5jYXRlZC1sZWZ0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0KTtcblxuICAgICAgICAvLyBUcnVuY2F0ZWQgem9uZSAtIHJpZ2h0IChkYXRhIGN1dCBieSA1MDAwIGxpbmUgbGltaXQgd2hlbiBsYXRlc3Q9ZmFsc2UpXG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtdHJ1bmNhdGVkJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgnZGF0YS16b25lJywgJ3RydW5jYXRlZC1yaWdodCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0KTtcblxuICAgICAgICAvLyBcIk5vd1wiIGxpbmVcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm93TGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm93TGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtbm93Jyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5ub3dMaW5lKTtcblxuICAgICAgICAvLyBTdGFydCBib3VuZGFyeSAobGVmdCByZWQgbGluZSlcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3kyJywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtYm91bmRhcnknKTtcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLnN0YXJ0Qm91bmRhcnkpO1xuXG4gICAgICAgIC8vIEVuZCBib3VuZGFyeSAocmlnaHQgcmVkIGxpbmUpXG4gICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3kxJywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkuc2V0QXR0cmlidXRlKCd5MicsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1ib3VuZGFyeScpO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkpO1xuXG4gICAgICAgIC8vIFNlbGVjdGlvbiByZWN0YW5nbGVcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuc2VsZWN0aW9uUmVjdC5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtc2VsZWN0aW9uJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuc2VsZWN0aW9uUmVjdC5zZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJywgJ3JhbmdlJyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0KTtcblxuICAgICAgICAvLyBMZWZ0IGhhbmRsZVxuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5sZWZ0SGFuZGxlLnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUuc2V0QXR0cmlidXRlKCd3aWR0aCcsIDYpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1oYW5kbGUnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5sZWZ0SGFuZGxlLnNldEF0dHJpYnV0ZSgnZGF0YS1oYW5kbGUnLCAnbGVmdCcpO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZSk7XG5cbiAgICAgICAgLy8gUmlnaHQgaGFuZGxlXG4gICAgICAgIHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgNik7XG4gICAgICAgIHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnJpZ2h0SGFuZGxlLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtaGFuZGxlJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUuc2V0QXR0cmlidXRlKCdkYXRhLWhhbmRsZScsICdyaWdodCcpO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdWxsIHJlbmRlciAtIHJlZHJhd3MgdGlja3MgYW5kIHVwZGF0ZXMgZHluYW1pYyBlbGVtZW50c1xuICAgICAqIENhbGxlZCB3aGVuIHZpc2libGVSYW5nZSBjaGFuZ2VzIChwZXJpb2QgYnV0dG9ucywgcmVzaXplLCBtb3VzZVVwKVxuICAgICAqL1xuICAgIHJlbmRlcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLnN2ZykgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB3aWR0aFxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMud2lkdGggPSB0aGlzLmNvbnRhaW5lci5vZmZzZXRXaWR0aDtcblxuICAgICAgICAvLyBSZWRyYXcgdGlja3MgYW5kIGxhYmVscyAodGhleSBkZXBlbmQgb24gdmlzaWJsZVJhbmdlKVxuICAgICAgICB0aGlzLnJlbmRlclRpY2tzKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGR5bmFtaWMgZWxlbWVudHMgcG9zaXRpb25zICh3aXRoIENTUyB0cmFuc2l0aW9ucylcbiAgICAgICAgdGhpcy51cGRhdGVEeW5hbWljRWxlbWVudHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIG9ubHkgdGlja3MgYW5kIGxhYmVscyAoYmFja2dyb3VuZCBsYXllcilcbiAgICAgKiBDYWxsZWQgd2hlbiB2aXNpYmxlUmFuZ2UgY2hhbmdlc1xuICAgICAqL1xuICAgIHJlbmRlclRpY2tzKCkge1xuICAgICAgICBpZiAoIXRoaXMubGF5ZXJzLnRpY2tzKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ2xlYXIgb25seSB0aWNrcyBsYXllclxuICAgICAgICB0aGlzLmxheWVycy50aWNrcy5pbm5lckhUTUwgPSAnJztcblxuICAgICAgICAvLyBEcmF3IHRpY2tzIGFuZCBsYWJlbHNcbiAgICAgICAgdGhpcy5kcmF3VGlja3MoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGR5bmFtaWMgZWxlbWVudHMgcG9zaXRpb25zIHZpYSBzZXRBdHRyaWJ1dGVcbiAgICAgKiBDYWxsZWQgZHVyaW5nIGRyYWcgZm9yIHNtb290aCBDU1MgdHJhbnNpdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVEeW5hbWljRWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIHBhZGRpbmcgfSA9IHRoaXMuZGltZW5zaW9ucztcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSB3aWR0aCAtIChwYWRkaW5nICogMik7XG5cbiAgICAgICAgLy8gU2FmZXR5IGNoZWNrXG4gICAgICAgIGlmICh2aXNpYmxlRHVyYXRpb24gPD0gMCB8fCBhdmFpbGFibGVXaWR0aCA8PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHBvc2l0aW9ucyBpbmRlcGVuZGVudGx5IGZvciBlYWNoIGVkZ2VcbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyB2aXN1YWwgYXJ0aWZhY3RzIHdoZW4gcmVzaXppbmcgZnJvbSBvbmUgc2lkZVxuICAgICAgICBjb25zdCBsZWZ0WCA9IHBhZGRpbmcgKyAoKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgY29uc3QgcmlnaHRYID0gcGFkZGluZyArICgodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgY29uc3QgdyA9IHJpZ2h0WCAtIGxlZnRYO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzZWxlY3Rpb24gcmVjdGFuZ2xlXG4gICAgICAgIHRoaXMuZWxlbWVudHMuc2VsZWN0aW9uUmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCBsZWZ0WCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuc2VsZWN0aW9uUmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgTWF0aC5tYXgoMCwgdykpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoYW5kbGVzIC0gcG9zaXRpb25lZCBpbmRlcGVuZGVudGx5XG4gICAgICAgIHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3gnLCBsZWZ0WCAtIDMpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnJpZ2h0SGFuZGxlLnNldEF0dHJpYnV0ZSgneCcsIHJpZ2h0WCAtIDMpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBcIk5vd1wiIGxpbmVcbiAgICAgICAgLy8gQWRkIDYwcyBidWZmZXIgdG8gcHJldmVudCBoaWRpbmcgd2hlbiB0aW1lIHNsaWdodGx5IGV4Y2VlZHMgdmlzaWJsZVJhbmdlLmVuZFxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3Qgbm93QnVmZmVyID0gNjA7XG4gICAgICAgIGlmIChub3cgPj0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgJiYgbm93IDw9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCArIG5vd0J1ZmZlcikge1xuICAgICAgICAgICAgLy8gQ2xhbXAgbm93WCB0byB2aXNpYmxlIGFyZWEgKGRvbid0IGRyYXcgYmV5b25kIHJpZ2h0IGVkZ2UpXG4gICAgICAgICAgICBjb25zdCBjbGFtcGVkTm93ID0gTWF0aC5taW4obm93LCB0aGlzLnZpc2libGVSYW5nZS5lbmQpO1xuICAgICAgICAgICAgY29uc3Qgbm93WCA9IHBhZGRpbmcgKyAoKGNsYW1wZWROb3cgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vd0xpbmUuc2V0QXR0cmlidXRlKCd4MScsIG5vd1gpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lLnNldEF0dHJpYnV0ZSgneDInLCBub3dYKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm93TGluZS5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vd0xpbmUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFydCBib3VuZGFyeVxuICAgICAgICBpZiAodGhpcy5mdWxsUmFuZ2Uuc3RhcnQgPD0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICBsZXQgeFN0YXJ0O1xuICAgICAgICAgICAgaWYgKHRoaXMuZnVsbFJhbmdlLnN0YXJ0IDwgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICB4U3RhcnQgPSBwYWRkaW5nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4U3RhcnQgPSBwYWRkaW5nICsgKCh0aGlzLmZ1bGxSYW5nZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3gxJywgeFN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3gyJywgeFN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnN0YXJ0Qm91bmRhcnkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlbmQgYm91bmRhcnlcbiAgICAgICAgaWYgKHRoaXMuZnVsbFJhbmdlLmVuZCA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgbGV0IHhFbmQ7XG4gICAgICAgICAgICBpZiAodGhpcy5mdWxsUmFuZ2UuZW5kID4gdGhpcy52aXNpYmxlUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICAgICAgeEVuZCA9IHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgeEVuZCA9IHBhZGRpbmcgKyAoKHRoaXMuZnVsbFJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkuc2V0QXR0cmlidXRlKCd4MScsIHhFbmQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3gyJywgeEVuZCk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLmVuZEJvdW5kYXJ5LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBuby1kYXRhIHpvbmUgKGxlZnQpIC0gd2hlbiB2aXNpYmxlUmFuZ2UgZXh0ZW5kcyBiZWZvcmUgZnVsbFJhbmdlXG4gICAgICAgIGlmICh0aGlzLnZpc2libGVSYW5nZS5zdGFydCA8IHRoaXMuZnVsbFJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICBjb25zdCBub0RhdGFMZWZ0RW5kID0gcGFkZGluZyArICgodGhpcy5mdWxsUmFuZ2Uuc3RhcnQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0LnNldEF0dHJpYnV0ZSgneCcsIHBhZGRpbmcpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgTWF0aC5tYXgoMCwgbm9EYXRhTGVmdEVuZCAtIHBhZGRpbmcpKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG5vLWRhdGEgem9uZSAocmlnaHQpIC0gd2hlbiB2aXNpYmxlUmFuZ2UgZXh0ZW5kcyBhZnRlciBmdWxsUmFuZ2VcbiAgICAgICAgaWYgKHRoaXMudmlzaWJsZVJhbmdlLmVuZCA+IHRoaXMuZnVsbFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgY29uc3Qgbm9EYXRhUmlnaHRTdGFydCA9IHBhZGRpbmcgKyAoKHRoaXMuZnVsbFJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgneCcsIG5vRGF0YVJpZ2h0U3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIE1hdGgubWF4KDAsIHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aCAtIG5vRGF0YVJpZ2h0U3RhcnQpKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdHJ1bmNhdGVkIHpvbmUgKGxlZnQpIC0gd2hlbiBkYXRhIHdhcyBjdXQgZnJvbSBiZWdpbm5pbmcgKGxhdGVzdD10cnVlKVxuICAgICAgICBpZiAodGhpcy50cnVuY2F0aW9uLndhc1RydW5jYXRlZCAmJiB0aGlzLnRydW5jYXRpb24ubGVmdFpvbmUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRydW5jU3RhcnQgPSBwYWRkaW5nICsgKCh0aGlzLnRydW5jYXRpb24ubGVmdFpvbmUuc3RhcnQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICBjb25zdCB0cnVuY0VuZCA9IHBhZGRpbmcgKyAoKHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAvLyBDbGFtcCB0byB2aXNpYmxlIGFyZWFcbiAgICAgICAgICAgIGNvbnN0IGNsYW1wZWRTdGFydCA9IE1hdGgubWF4KHBhZGRpbmcsIE1hdGgubWluKHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aCwgdHJ1bmNTdGFydCkpO1xuICAgICAgICAgICAgY29uc3QgY2xhbXBlZEVuZCA9IE1hdGgubWF4KHBhZGRpbmcsIE1hdGgubWluKHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aCwgdHJ1bmNFbmQpKTtcbiAgICAgICAgICAgIGNvbnN0IHRydW5jV2lkdGggPSBjbGFtcGVkRW5kIC0gY2xhbXBlZFN0YXJ0O1xuXG4gICAgICAgICAgICBpZiAodHJ1bmNXaWR0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgneCcsIGNsYW1wZWRTdGFydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdHJ1bmNXaWR0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0cnVuY2F0ZWQgem9uZSAocmlnaHQpIC0gd2hlbiBkYXRhIHdhcyBjdXQgZnJvbSBlbmQgKGxhdGVzdD1mYWxzZSlcbiAgICAgICAgaWYgKHRoaXMudHJ1bmNhdGlvbi53YXNUcnVuY2F0ZWQgJiYgdGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZSkge1xuICAgICAgICAgICAgY29uc3QgdHJ1bmNTdGFydCA9IHBhZGRpbmcgKyAoKHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUuc3RhcnQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICBjb25zdCB0cnVuY0VuZCA9IHBhZGRpbmcgKyAoKHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgLy8gQ2xhbXAgdG8gdmlzaWJsZSBhcmVhXG4gICAgICAgICAgICBjb25zdCBjbGFtcGVkU3RhcnQgPSBNYXRoLm1heChwYWRkaW5nLCBNYXRoLm1pbihwYWRkaW5nICsgYXZhaWxhYmxlV2lkdGgsIHRydW5jU3RhcnQpKTtcbiAgICAgICAgICAgIGNvbnN0IGNsYW1wZWRFbmQgPSBNYXRoLm1heChwYWRkaW5nLCBNYXRoLm1pbihwYWRkaW5nICsgYXZhaWxhYmxlV2lkdGgsIHRydW5jRW5kKSk7XG4gICAgICAgICAgICBjb25zdCB0cnVuY1dpZHRoID0gY2xhbXBlZEVuZCAtIGNsYW1wZWRTdGFydDtcblxuICAgICAgICAgICAgaWYgKHRydW5jV2lkdGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc2V0QXR0cmlidXRlKCd4JywgY2xhbXBlZFN0YXJ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdHJ1bmNXaWR0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IHRpbWVsaW5lIHRpY2tzIGFuZCBsYWJlbHNcbiAgICAgKiBVc2VzIFZJU0lCTEUgcmFuZ2UgZm9yIGFkYXB0aXZlIHNjYWxpbmcgKFlhbmRleCBDbG91ZCBzdHlsZSlcbiAgICAgKi9cbiAgICBkcmF3VGlja3MoKSB7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBVc2UgdmlzaWJsZSByYW5nZSBmb3IgYm90aCBwb3NpdGlvbmluZyBhbmQgc3RlcCBjYWxjdWxhdGlvblxuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU1ZHVGltZWxpbmU6IHZpc2libGVEdXJhdGlvbiBpcyB6ZXJvIG9yIG5lZ2F0aXZlLCBza2lwcGluZyB0aWNrIGRyYXdpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBhZGFwdGl2ZSBzdGVwIGJhc2VkIG9uIFZJU0lCTEUgZHVyYXRpb24gYW5kIGF2YWlsYWJsZSB3aWR0aFxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5jYWxjdWxhdGVBZGFwdGl2ZVN0ZXAodmlzaWJsZUR1cmF0aW9uLCBhdmFpbGFibGVXaWR0aCk7XG5cbiAgICAgICAgLy8gUm91bmQgdmlzaWJsZSByYW5nZSB0byBuZWFyZXN0IHN0ZXAgaW50ZXJ2YWxcbiAgICAgICAgY29uc3Qgcm91bmRlZFN0YXJ0ID0gTWF0aC5mbG9vcih0aGlzLnZpc2libGVSYW5nZS5zdGFydCAvIHN0ZXAudmFsdWUpICogc3RlcC52YWx1ZTtcblxuICAgICAgICAvLyBTdG9yZSBtYWpvciB0aWNrIHBvc2l0aW9ucyBmb3IgY29sbGlzaW9uIGRldGVjdGlvblxuICAgICAgICBjb25zdCBtYWpvclRpY2tQb3NpdGlvbnMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgLy8gRHJhdyBtYWpvciB0aWNrcyBhdCBkaXNjcmV0ZSBpbnRlcnZhbHMgd2l0aGluIHZpc2libGUgcmFuZ2VcbiAgICAgICAgbGV0IHRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgd2hpbGUgKHRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmICh0aW1lc3RhbXAgPj0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgcG9zaXRpb24gcmVsYXRpdmUgdG8gVklTSUJMRSByYW5nZSAobm90IGZ1bGwgcmFuZ2UhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKCh0aW1lc3RhbXAgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAgICAgbWFqb3JUaWNrUG9zaXRpb25zLmFkZChNYXRoLnJvdW5kKHRpbWVzdGFtcCkpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFqb3IgdGljayAtIGJvdHRvbSAoY29tcGFjdClcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDYsIDQsICcjNzY3Njc2Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbCAtIGNlbnRlcmVkIHZlcnRpY2FsbHkgKGNvbXBhY3QpIHdpdGggZm9ybWF0IGZyb20gc3RlcFxuICAgICAgICAgICAgICAgIHRoaXMuZHJhd0xhYmVsKHgsIGhlaWdodCAvIDIgKyAzLCB0aGlzLmZvcm1hdFRpbWUodGltZXN0YW1wLCBzdGVwLmZvcm1hdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGltZXN0YW1wICs9IHN0ZXAudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEcmF3IG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3Igb25lcyAoNSBwZXIgaW50ZXJ2YWwpXG4gICAgICAgIGxldCBtaW5vclRpbWVzdGFtcCA9IHJvdW5kZWRTdGFydDtcbiAgICAgICAgY29uc3QgbWlub3JTdGVwID0gc3RlcC52YWx1ZSAvIDU7XG4gICAgICAgIHdoaWxlIChtaW5vclRpbWVzdGFtcCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGlmIChtaW5vclRpbWVzdGFtcCA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgbm90IGEgbWFqb3IgdGljayBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdW5kZWRNaW5vclRpbWVzdGFtcCA9IE1hdGgucm91bmQobWlub3JUaW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIGlmICghbWFqb3JUaWNrUG9zaXRpb25zLmhhcyhyb3VuZGVkTWlub3JUaW1lc3RhbXApKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHggPSBwYWRkaW5nICsgKChtaW5vclRpbWVzdGFtcCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWlub3IgdGljayAtIHNob3J0ZXIgYW5kIGxpZ2h0ZXJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmF3VGljayh4LCBoZWlnaHQgLSA1LCAyLCAnI2Q0ZDRkNScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pbm9yVGltZXN0YW1wICs9IG1pbm9yU3RlcDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgc2luZ2xlIHRpY2tcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geCAtIFggcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0geSAtIFkgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGljayBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3IgLSBUaWNrIGNvbG9yXG4gICAgICovXG4gICAgZHJhd1RpY2soeCwgeSwgaGVpZ2h0LCBjb2xvcikge1xuICAgICAgICBjb25zdCBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdsaW5lJyk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneTEnLCB5KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkgKyBoZWlnaHQpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywgY29sb3IpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgJzEnKTtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZSBsYWJlbFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gWSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gTGFiZWwgdGV4dFxuICAgICAqL1xuICAgIGRyYXdMYWJlbCh4LCB5LCB0ZXh0KSB7XG4gICAgICAgIC8vIENyZWF0ZSB3aGl0ZSBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3IgbGFiZWxcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0VGV4dEJCb3godGV4dCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSAzO1xuXG4gICAgICAgIGNvbnN0IGJnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneCcsIHggLSAoYmJveC53aWR0aCAvIDIpIC0gcGFkZGluZyk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgneScsIHkgLSBiYm94LmhlaWdodCArIDIpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgYmJveC53aWR0aCArIChwYWRkaW5nICogMikpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCdmaWxsJywgJyNmYWZhZmEnKTtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MuYXBwZW5kQ2hpbGQoYmcpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZXh0IGxhYmVsXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICd0ZXh0Jyk7XG4gICAgICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1sYWJlbCcpO1xuICAgICAgICBsYWJlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHRoaXMubGF5ZXJzLnRpY2tzLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJveGltYXRlIGJvdW5kaW5nIGJveCBmb3IgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCBjb250ZW50XG4gICAgICogQHJldHVybnMge29iamVjdH0gQm91bmRpbmcgYm94IHt3aWR0aCwgaGVpZ2h0fVxuICAgICAqL1xuICAgIGdldFRleHRCQm94KHRleHQpIHtcbiAgICAgICAgLy8gQXBwcm94aW1hdGUgc2l6ZSBiYXNlZCBvbiBmb250IHNpemUgYW5kIGNoYXJhY3RlciBjb3VudFxuICAgICAgICBjb25zdCBmb250U2l6ZSA9IDExO1xuICAgICAgICAvLyBVc2UgbW9ub3NwYWNlIHdpZHRoIGZvciB0aW1lIGxhYmVscyAoc2Vjb25kcyBmb3JtYXQgaXMgbG9uZ2VyKVxuICAgICAgICBjb25zdCBjaGFyV2lkdGggPSB0ZXh0LmluY2x1ZGVzKCc6JykgPyA2LjUgOiA2OyAvLyBXaWRlciBmb3IgdGltZSBmb3JtYXRzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogdGV4dC5sZW5ndGggKiBjaGFyV2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGZvbnRTaXplICsgMlxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZXN0YW1wIHRvIHRpbWUgc3RyaW5nIChzZXJ2ZXIgdGltZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gVVRDXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIEZvcm1hdCB0eXBlOiAnSEg6TU06U1MnLCAnSEg6TU0nLCBvciAnTU0tREQnXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHRpbWUvZGF0ZSBpbiBzZXJ2ZXIgdGltZXpvbmVcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKHRpbWVzdGFtcCwgZm9ybWF0ID0gJ0hIOk1NJykge1xuICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmcm9tIFVUQyB0aW1lc3RhbXAsIHRoZW4gYWRkIHNlcnZlciBvZmZzZXQgdG8gZ2V0IG1pbGxpc2Vjb25kc1xuICAgICAgICAvLyBzZXJ2ZXJUaW1lem9uZU9mZnNldCBpcyBpbiBzZWNvbmRzLCB0aW1lc3RhbXAgaXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZXJ2ZXJUaW1lTXMgPSAodGltZXN0YW1wICsgdGhpcy5zZXJ2ZXJUaW1lem9uZU9mZnNldCkgKiAxMDAwO1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoc2VydmVyVGltZU1zKTtcblxuICAgICAgICBpZiAoZm9ybWF0ID09PSAnTU0tREQnKSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgYXMgbW9udGgtZGF5IGZvciBsb25nIHJhbmdlc1xuICAgICAgICAgICAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRVVENNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldFVUQ0RhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIHJldHVybiBgJHttb250aH0tJHtkYXl9YDtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQgPT09ICdISDpNTTpTUycpIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBhcyB0aW1lIHdpdGggc2Vjb25kcyBmb3IgdmVyeSBzaG9ydCByYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZGF0ZS5nZXRVVENNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBzZWNvbmRzID0gU3RyaW5nKGRhdGUuZ2V0VVRDU2Vjb25kcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9OiR7c2Vjb25kc31gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGFzIHRpbWUgKEhIOk1NKSBmb3Igc2hvcnRlciByYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGRhdGUuZ2V0VVRDSG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZGF0ZS5nZXRVVENNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc31gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBtb3VzZSBldmVudHNcbiAgICAgKi9cbiAgICBhdHRhY2hFdmVudHMoKSB7XG4gICAgICAgIC8vIFN0b3JlIGJvdW5kIGhhbmRsZXJzIGZvciBjbGVhbnVwIGluIGRlc3Ryb3koKVxuICAgICAgICB0aGlzLl9ib3VuZE1vdXNlRG93biA9IChlKSA9PiB0aGlzLmhhbmRsZU1vdXNlRG93bihlKTtcbiAgICAgICAgdGhpcy5fYm91bmRNb3VzZU1vdmUgPSAoZSkgPT4gdGhpcy5oYW5kbGVNb3VzZU1vdmUoZSk7XG4gICAgICAgIHRoaXMuX2JvdW5kTW91c2VVcCA9ICgpID0+IHRoaXMuaGFuZGxlTW91c2VVcCgpO1xuICAgICAgICB0aGlzLl9ib3VuZFpvbmVDbGljayA9IChlKSA9PiB0aGlzLmhhbmRsZVpvbmVDbGljayhlKTtcblxuICAgICAgICB0aGlzLnN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLl9ib3VuZE1vdXNlRG93bik7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kTW91c2VNb3ZlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kTW91c2VVcCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIG9uIHRydW5jYXRlZCB6b25lXG4gICAgICAgIHRoaXMuc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fYm91bmRab25lQ2xpY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY2xpY2sgb24gem9uZSBlbGVtZW50cyAodHJ1bmNhdGVkIHpvbmVzKVxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlWm9uZUNsaWNrKGUpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICAgIGNvbnN0IHpvbmUgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXpvbmUnKTtcblxuICAgICAgICBpZiAoem9uZSA9PT0gJ3RydW5jYXRlZC1sZWZ0JyAmJiB0aGlzLnRydW5jYXRpb24ubGVmdFpvbmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9uVHJ1bmNhdGVkWm9uZUNsaWNrKSB7XG4gICAgICAgICAgICAgICAgLy8gTGVmdCB6b25lOiBkYXRhIHdhcyBjdXQgZnJvbSBiZWdpbm5pbmcgKGxhdGVzdD10cnVlIHVzZWQpXG4gICAgICAgICAgICAgICAgLy8gVG8gbG9hZCB0aGlzIHpvbmUsIHdlIG5lZWQgbGF0ZXN0PXRydWUgdG8gZ2V0IGVudHJpZXMgZnJvbSBlbmQgb2YgaW50ZXJ2YWxcbiAgICAgICAgICAgICAgICB0aGlzLm9uVHJ1bmNhdGVkWm9uZUNsaWNrKFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZS5zdGFydCksXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy50cnVuY2F0aW9uLmxlZnRab25lLmVuZCksXG4gICAgICAgICAgICAgICAgICAgIHRydWUgLy8gaXNMZWZ0Wm9uZSA9IHRydWUg4oaSIHVzZSBsYXRlc3Q9dHJ1ZVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoem9uZSA9PT0gJ3RydW5jYXRlZC1yaWdodCcgJiYgdGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMub25UcnVuY2F0ZWRab25lQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAvLyBSaWdodCB6b25lOiBkYXRhIHdhcyBjdXQgZnJvbSBlbmQgKGxhdGVzdD1mYWxzZSB1c2VkKVxuICAgICAgICAgICAgICAgIC8vIFRvIGxvYWQgdGhpcyB6b25lLCB3ZSBuZWVkIGxhdGVzdD1mYWxzZSB0byBnZXQgZW50cmllcyBmcm9tIHN0YXJ0IG9mIGludGVydmFsXG4gICAgICAgICAgICAgICAgdGhpcy5vblRydW5jYXRlZFpvbmVDbGljayhcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnRydW5jYXRpb24ucmlnaHRab25lLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnRydW5jYXRpb24ucmlnaHRab25lLmVuZCksXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlIC8vIGlzTGVmdFpvbmUgPSBmYWxzZSDihpIgdXNlIGxhdGVzdD1mYWxzZVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1vdXNlIGRvd25cbiAgICAgKiBAcGFyYW0ge01vdXNlRXZlbnR9IGUgLSBNb3VzZSBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZU1vdXNlRG93bihlKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgICBjb25zdCBoYW5kbGUgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWhhbmRsZScpO1xuXG4gICAgICAgIGlmICghaGFuZGxlKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5kcmFnZ2luZy5hY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLmhhbmRsZSA9IGhhbmRsZTtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5zdGFydFggPSBlLmNsaWVudFg7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZFN0YXJ0ID0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0O1xuICAgICAgICB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRFbmQgPSB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kO1xuXG4gICAgICAgIGNvbnN0IHJlY3QgPSB0aGlzLmNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5jb250YWluZXJMZWZ0ID0gcmVjdC5sZWZ0O1xuICAgICAgICB0aGlzLmRyYWdnaW5nLmNvbnRhaW5lcldpZHRoID0gcmVjdC53aWR0aDtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBtb3VzZSBtb3ZlIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlTW91c2VNb3ZlKGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nLmFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGRlbHRhWCA9IGUuY2xpZW50WCAtIHRoaXMuZHJhZ2dpbmcuc3RhcnRYO1xuICAgICAgICBjb25zdCB7IHBhZGRpbmcgfSA9IHRoaXMuZGltZW5zaW9ucztcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSB0aGlzLmRyYWdnaW5nLmNvbnRhaW5lcldpZHRoIC0gKHBhZGRpbmcgKiAyKTtcbiAgICAgICAgY29uc3QgdmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG5cbiAgICAgICAgLy8gU2FmZXR5IGNoZWNrOiBwcmV2ZW50IGRpdmlzaW9uIGJ5IHplcm9cbiAgICAgICAgaWYgKHZpc2libGVEdXJhdGlvbiA8PSAwIHx8IGF2YWlsYWJsZVdpZHRoIDw9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU1ZHVGltZWxpbmU6IEludmFsaWQgZGltZW5zaW9ucyBmb3IgbW91c2UgbW92ZSBjYWxjdWxhdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgZGVsdGEgcmVsYXRpdmUgdG8gVklTSUJMRSByYW5nZVxuICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSAoZGVsdGFYIC8gYXZhaWxhYmxlV2lkdGgpICogdmlzaWJsZUR1cmF0aW9uO1xuXG4gICAgICAgIGlmICh0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgICAvLyBSZXNpemluZyBmcm9tIGxlZnQgLSBhbGxvdyBmcmVlIG1vdmVtZW50XG4gICAgICAgICAgICBsZXQgbmV3U3RhcnQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRTdGFydCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIC8vIE9ubHkgZW5mb3JjZSBtaW5pbXVtIHdpZHRoIG9mIDYwIHNlY29uZHNcbiAgICAgICAgICAgIG5ld1N0YXJ0ID0gTWF0aC5taW4obmV3U3RhcnQsIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSA2MCk7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSBuZXdTdGFydDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgLy8gUmVzaXppbmcgZnJvbSByaWdodCAtIGFsbG93IGZyZWUgbW92ZW1lbnRcbiAgICAgICAgICAgIGxldCBuZXdFbmQgPSB0aGlzLmRyYWdnaW5nLnN0YXJ0U2VsZWN0ZWRFbmQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICAvLyBPbmx5IGVuZm9yY2UgbWluaW11bSB3aWR0aCBvZiA2MCBzZWNvbmRzXG4gICAgICAgICAgICBuZXdFbmQgPSBNYXRoLm1heChuZXdFbmQsIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCArIDYwKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBuZXdFbmQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdyYW5nZScpIHtcbiAgICAgICAgICAgIC8vIERyYWdnaW5nIGVudGlyZSByYW5nZSAtIGFsbG93IGZyZWUgbW92ZW1lbnRcbiAgICAgICAgICAgIGxldCBuZXdTdGFydCA9IHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZFN0YXJ0ICsgZGVsdGFUaW1lO1xuICAgICAgICAgICAgbGV0IG5ld0VuZCA9IHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZEVuZCArIGRlbHRhVGltZTtcblxuICAgICAgICAgICAgLy8gTm8gYm91bmRzIGNoZWNraW5nIC0gYWxsb3cgZHJhZ2dpbmcgYW55d2hlcmVcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IG5ld1N0YXJ0O1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IG5ld0VuZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGR5bmFtaWMgZWxlbWVudHMgZHVyaW5nIGRyYWcgKG5vIHRpY2tzIHJlZHJhdylcbiAgICAgICAgLy8gVGhpcyBlbmFibGVzIHNtb290aCBDU1MgdHJhbnNpdGlvbnNcbiAgICAgICAgdGhpcy51cGRhdGVEeW5hbWljRWxlbWVudHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1vdXNlIHVwIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEFmdGVyIGRyYWc6IHByZXNlcnZlIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIGFuZCBhZGp1c3QgdmlzaWJsZSByYW5nZVxuICAgICAqL1xuICAgIGhhbmRsZU1vdXNlVXAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRyYWdnaW5nLmFjdGl2ZSkge1xuICAgICAgICAgICAgY29uc3Qgd2FzUmVzaXppbmcgPSB0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ2xlZnQnIHx8IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmlnaHQnO1xuICAgICAgICAgICAgY29uc3Qgd2FzRHJhZ2dpbmcgPSB0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ3JhbmdlJztcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRIYW5kbGUgPSB0aGlzLmRyYWdnaW5nLmhhbmRsZTsgLy8gU2F2ZSBiZWZvcmUgcmVzZXRcblxuICAgICAgICAgICAgdGhpcy5kcmFnZ2luZy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHdhc1Jlc2l6aW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciByZXNpemVkIHNlbGVjdGlvbiDihpIgYWRqdXN0IHZpc2libGUgcmFuZ2UgdG8gYmUgNHggc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gUFJFU0VSVkUgdXNlcidzIG1hbnVhbCBzZWxlY3Rpb24gKGRvIE5PVCByZWNhbGN1bGF0ZSBpdCEpXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWREdXJhdGlvbiA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgLSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmlzaWJsZUR1cmF0aW9uID0gc2VsZWN0ZWREdXJhdGlvbiAqIDQ7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRDZW50ZXIgPSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIGNlbnRlcmVkIG9uIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIC8vIE5PVEU6IEFsbG93IHZpc2libGVSYW5nZSB0byBleHRlbmQgQkVZT05EIGZ1bGxSYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlRW5kID0gc2VsZWN0ZWRDZW50ZXIgKyAobmV3VmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IG5ld1Zpc2libGVTdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBuZXdWaXNpYmxlRW5kO1xuXG4gICAgICAgICAgICAgICAgLy8gRG8gTk9UIGNhbGwgY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKSBoZXJlIVxuICAgICAgICAgICAgICAgIC8vIFRoZSB1c2VyJ3MgbWFudWFsIHNlbGVjdGlvbiAoZS5nLiwgOTo0NS05OjUwKSBtdXN0IGJlIHByZXNlcnZlZFxuXG4gICAgICAgICAgICAgICAgLy8gRGVhY3RpdmF0ZSBhbGwgcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mICQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIGlmICh3YXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIC8vIFVzZXIgZHJhZ2dlZCBzZWxlY3Rpb24g4oaSIHNoaWZ0IHZpc2libGUgcmFuZ2UgdG8ga2VlcCBzZWxlY3Rpb24gY2VudGVyZWRcbiAgICAgICAgICAgICAgICAvLyBQUkVTRVJWRSB1c2VyJ3MgbWFudWFsIHNlbGVjdGlvbiAoZG8gTk9UIHJlY2FsY3VsYXRlIGl0ISlcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZENlbnRlciA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCArICgodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCkgLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgdmlzaWJsZSByYW5nZSB0byBrZWVwIHNlbGVjdGlvbiBhdCBjZW50ZXJcbiAgICAgICAgICAgICAgICAvLyBOT1RFOiBBbGxvdyB2aXNpYmxlUmFuZ2UgdG8gZXh0ZW5kIEJFWU9ORCBmdWxsUmFuZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlRW5kID0gc2VsZWN0ZWRDZW50ZXIgKyAodmlzaWJsZUR1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IG5ld1Zpc2libGVTdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBuZXdWaXNpYmxlRW5kO1xuXG4gICAgICAgICAgICAgICAgLy8gRG8gTk9UIGNhbGwgY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24oKSBoZXJlIVxuICAgICAgICAgICAgICAgIC8vIFRoZSB1c2VyJ3MgbWFudWFsIHNlbGVjdGlvbiBtdXN0IGJlIHByZXNlcnZlZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZW5kZXIgd2l0aCBuZXcgcmFuZ2VzXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNhbGxiYWNrIHRvIGxvYWQgZGF0YSB3aXRoIHVzZXIncyBzZWxlY3RlZCByYW5nZVxuICAgICAgICAgICAgaWYgKHRoaXMub25SYW5nZUNoYW5nZSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25SYW5nZUNoYW5nZShcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQpLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQpLFxuICAgICAgICAgICAgICAgICAgICBkcmFnZ2VkSGFuZGxlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgd2luZG93IHJlc2l6ZVxuICAgICAqL1xuICAgIGhhbmRsZVJlc2l6ZSgpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcGVyaW9kIGZyb20gcXVpY2stcGVyaW9kLWJ1dHRvbnMgKFlhbmRleCBDbG91ZCBzdHlsZSlcbiAgICAgKiBTZXRzIHZpc2libGUgcmFuZ2UgYW5kIGF1dG8tY2VudGVycyBzZWxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyaW9kU2Vjb25kcyAtIFBlcmlvZCBpbiBzZWNvbmRzIChlLmcuLCAzNjAwIGZvciAxaClcbiAgICAgKi9cbiAgICBhcHBseVBlcmlvZChwZXJpb2RTZWNvbmRzKSB7XG4gICAgICAgIGNvbnN0IHBlcmlvZCA9IHBhcnNlSW50KHBlcmlvZFNlY29uZHMpO1xuXG4gICAgICAgIC8vIFNldCB2aXNpYmxlIHJhbmdlIHRvIGxhc3QgTiBzZWNvbmRzXG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IHRoaXMuZnVsbFJhbmdlLmVuZDtcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBNYXRoLm1heCh0aGlzLmZ1bGxSYW5nZS5lbmQgLSBwZXJpb2QsIHRoaXMuZnVsbFJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAvLyBBdXRvLWNlbnRlciBzZWxlY3Rpb24gKDEvNCBvZiB2aXNpYmxlIHJhbmdlKVxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgLy8gUmVuZGVyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjYWxsYmFjayB0byBsb2FkIGRhdGFcbiAgICAgICAgaWYgKHRoaXMub25SYW5nZUNoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5vblJhbmdlQ2hhbmdlKFxuICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBzZWxlY3RlZCByYW5nZSBleHBsaWNpdGx5ICh3aXRob3V0IGF1dG8tY2VudGVyaW5nIG9yIHRyaWdnZXJpbmcgb25SYW5nZUNoYW5nZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIHNldFJhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGEgKHdpdGhvdXQgdHJpZ2dlcmluZyBvblJhbmdlQ2hhbmdlKVxuICAgICAqIFVzZWQgd2hlbiBiYWNrZW5kIHJldHVybnMgZGlmZmVyZW50IHJhbmdlIGR1ZSB0byA1MDAwIGxpbmUgbGltaXRcbiAgICAgKiBTeW5jaHJvbm91c2x5IHVwZGF0ZXMgYm90aCB2aXNpYmxlIHJhbmdlIGFuZCBzZWxlY3RlZCByYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBBY3R1YWwgc3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEFjdHVhbCBlbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgdXBkYXRlU2VsZWN0ZWRSYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIEVuc3VyZSBtaW5pbXVtIGR1cmF0aW9uIHRvIHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBjb25zdCBNSU5fRFVSQVRJT04gPSA2MDsgLy8gMSBtaW51dGUgbWluaW11bVxuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIC8vIEV4cGFuZCByYW5nZSBzeW1tZXRyaWNhbGx5IGFyb3VuZCB0aGUgc2luZ2xlIHRpbWVzdGFtcFxuICAgICAgICAgICAgY29uc3QgY2VudGVyID0gc3RhcnQ7XG4gICAgICAgICAgICBzdGFydCA9IGNlbnRlciAtIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgICAgIGVuZCA9IGNlbnRlciArIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGFcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIGFzIDR4IG9mIHNlbGVjdGVkIHJhbmdlXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZUR1cmF0aW9uID0gc2VsZWN0ZWREdXJhdGlvbiAqIDQ7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gc3RhcnQgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIENlbnRlciB2aXNpYmxlIHJhbmdlIGFyb3VuZCBzZWxlY3RlZCByYW5nZVxuICAgICAgICAvLyBOT1RFOiB2aXNpYmxlUmFuZ2UgY2FuIGV4dGVuZCBCRVlPTkQgZnVsbFJhbmdlIHRvIG1haW50YWluIDEvNCByYXRpb1xuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgZW1wdHkgc3BhY2UgYXJvdW5kIHRoZSBhY3R1YWwgZGF0YVxuICAgICAgICBjb25zdCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZUVuZCA9IHNlbGVjdGVkQ2VudGVyICsgKG5ld1Zpc2libGVEdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB2aXNpYmxlIHJhbmdlIChubyBib3VuZHMgY2hlY2sgLSBhbGxvdyBleHRlbmRpbmcgYmV5b25kIGZ1bGxSYW5nZSlcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIE5vdGU6IERvZXMgTk9UIHRyaWdnZXIgb25SYW5nZUNoYW5nZSBjYWxsYmFja1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGltZWxpbmUgd2l0aCBzZXJ2ZXIgcmVzcG9uc2UgKGhhbmRsZXMgdHJ1bmNhdGlvbiB2aXN1YWxpemF0aW9uKVxuICAgICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgdG8gY2FsbCBhZnRlciByZWNlaXZpbmcgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjdHVhbFJhbmdlIC0gU2VydmVyIHJlc3BvbnNlOiB7IHN0YXJ0LCBlbmQsIGxpbmVzX2NvdW50LCB0cnVuY2F0ZWQgfVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByZXF1ZXN0ZWRTdGFydCAtIE9yaWdpbmFsIHJlcXVlc3RlZCBzdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcmVxdWVzdGVkRW5kIC0gT3JpZ2luYWwgcmVxdWVzdGVkIGVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzSW5pdGlhbExvYWQgLSBJZiB0cnVlLCBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5IChmaXJzdCBwYWdlIGxvYWQpXG4gICAgICovXG4gICAgdXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKGFjdHVhbFJhbmdlLCByZXF1ZXN0ZWRTdGFydCwgcmVxdWVzdGVkRW5kLCBpc0luaXRpYWxMb2FkID0gZmFsc2UpIHtcbiAgICAgICAgLy8gU3RvcmUgd2hhdCB3YXMgcmVxdWVzdGVkXG4gICAgICAgIHRoaXMucmVxdWVzdGVkUmFuZ2Uuc3RhcnQgPSByZXF1ZXN0ZWRTdGFydDtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ZWRSYW5nZS5lbmQgPSByZXF1ZXN0ZWRFbmQ7XG5cbiAgICAgICAgLy8gUmVzZXQgdHJ1bmNhdGlvbiBpbmZvXG4gICAgICAgIHRoaXMudHJ1bmNhdGlvbi53YXNUcnVuY2F0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxpbmVzQ291bnQgPSAwO1xuICAgICAgICB0aGlzLnRydW5jYXRpb24uZGlyZWN0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxlZnRab25lID0gbnVsbDtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZSA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRydW5jYXRpb24gem9uZSBpZiBkYXRhIHdhcyB0cnVuY2F0ZWRcbiAgICAgICAgLy8gU2tpcCB0cnVuY2F0aW9uIHpvbmVzIG9uIGluaXRpYWwgbG9hZCAtIHVzZXIgZXhwZWN0cyB0byBzZWUgXCJ0YWlsXCIgb2YgbG9nXG4gICAgICAgIGlmIChhY3R1YWxSYW5nZS50cnVuY2F0ZWQgJiYgIWlzSW5pdGlhbExvYWQpIHtcbiAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi53YXNUcnVuY2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxpbmVzQ291bnQgPSBhY3R1YWxSYW5nZS5saW5lc19jb3VudDtcbiAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5kaXJlY3Rpb24gPSBhY3R1YWxSYW5nZS50cnVuY2F0ZWRfZGlyZWN0aW9uIHx8ICdyaWdodCc7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnRydW5jYXRpb24uZGlyZWN0aW9uID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnVuY2F0ZWQgZnJvbSBsZWZ0IChsYXRlc3Q9dHJ1ZSk6IGJlZ2lubmluZyBvZiByZXF1ZXN0ZWQgcmFuZ2Ugd2FzIGN1dFxuICAgICAgICAgICAgICAgIGlmIChhY3R1YWxSYW5nZS5zdGFydCA+IHJlcXVlc3RlZFN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiByZXF1ZXN0ZWRTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogYWN0dWFsUmFuZ2Uuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRydW5jYXRlZCBmcm9tIHJpZ2h0IChsYXRlc3Q9ZmFsc2UpOiBlbmQgb2YgcmVxdWVzdGVkIHJhbmdlIHdhcyBjdXRcbiAgICAgICAgICAgICAgICBpZiAoYWN0dWFsUmFuZ2UuZW5kIDwgcmVxdWVzdGVkRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogYWN0dWFsUmFuZ2UuZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiByZXF1ZXN0ZWRFbmRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIGV4aXN0aW5nIHVwZGF0ZVNlbGVjdGVkUmFuZ2UgbG9naWMgZm9yIHRoZSByZXN0XG4gICAgICAgIC8vIEVuc3VyZSBtaW5pbXVtIGR1cmF0aW9uIHRvIHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBsZXQgc3RhcnQgPSBhY3R1YWxSYW5nZS5zdGFydDtcbiAgICAgICAgbGV0IGVuZCA9IGFjdHVhbFJhbmdlLmVuZDtcbiAgICAgICAgY29uc3QgTUlOX0RVUkFUSU9OID0gNjA7IC8vIDEgbWludXRlIG1pbmltdW1cblxuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IHN0YXJ0O1xuICAgICAgICAgICAgc3RhcnQgPSBjZW50ZXIgLSAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgICAgICBlbmQgPSBjZW50ZXIgKyAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgcmFuZ2UgdG8gYWN0dWFsIGxvYWRlZCBkYXRhXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gZW5kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aGF0IG5ldyB2aXNpYmxlIHJhbmdlIHdvdWxkIGJlIGJhc2VkIG9uIGFjdHVhbCBkYXRhICg0eCBvZiBzZWxlY3RlZClcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWREdXJhdGlvbiA9IGVuZCAtIHN0YXJ0O1xuICAgICAgICBjb25zdCBuZXdWaXNpYmxlRHVyYXRpb24gPSBzZWxlY3RlZER1cmF0aW9uICogNDtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRDZW50ZXIgPSBzdGFydCArIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG4gICAgICAgIGxldCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgbGV0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IFByZXNlcnZlIGVudGlyZSB2aXNpYmxlUmFuZ2UgaWYgaXQgd2FzIGV4dGVuZGVkIHRvIGN1cnJlbnQgdGltZVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgbm8tZGF0YSB6b25lIGRpc3BsYXlzIGNvcnJlY3RseSBhZnRlciByZWZyZXNoXG4gICAgICAgIC8vIFdoZW4gdXNlciBjbGlja3MgcmVmcmVzaCwgdGhleSB3YW50IHRvIHNlZSB0aW1lbGluZSB1cCB0byBjdXJyZW50IHRpbWVcbiAgICAgICAgLy8gUHJlc2VydmUgYm90aCBwb3NpdGlvbiBBTkQgZHVyYXRpb24gdG8gcHJldmVudCBzaHJpbmtpbmcgdGhlIHZpc2libGUgYXJlYVxuICAgICAgICBjb25zdCBjdXJyZW50VmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGlmICh0aGlzLnZpc2libGVSYW5nZS5lbmQgPiBuZXdWaXNpYmxlRW5kIHx8IHRoaXMudmlzaWJsZVJhbmdlLmVuZCA+IGVuZCkge1xuICAgICAgICAgICAgLy8gS2VlcCB0aGUgZXhpc3RpbmcgdmlzaWJsZVJhbmdlIGVudGlyZWx5IChib3RoIGR1cmF0aW9uIGFuZCBlbmQgcG9zaXRpb24pXG4gICAgICAgICAgICAvLyBPbmx5IHNlbGVjdGVkUmFuZ2Ugd2FzIHVwZGF0ZWQgYWJvdmUgdG8gc2hvdyB3aGVyZSBhY3R1YWwgZGF0YSBpc1xuICAgICAgICAgICAgLy8gVGhlIGdhcCBiZXR3ZWVuIGZ1bGxSYW5nZS5lbmQgYW5kIHZpc2libGVSYW5nZS5lbmQgd2lsbCBzaG93IGFzIG5vLWRhdGEgem9uZVxuICAgICAgICAgICAgbmV3VmlzaWJsZUVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZDtcbiAgICAgICAgICAgIG5ld1Zpc2libGVTdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIHJlbmRlciAoZWxlbWVudHMgbm93IGV4aXN0IGluIERPTSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplWm9uZVBvcHVwcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFNlbWFudGljIFVJIHBvcHVwcyBmb3Igem9uZSBlbGVtZW50c1xuICAgICAqIERlc3Ryb3lzIGV4aXN0aW5nIHBvcHVwcyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb24gdG8gcHJldmVudCBsZWFrc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVab25lUG9wdXBzKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBqUXVlcnkgYW5kIHBvcHVwIGFyZSBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiAkID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgJC5mbi5wb3B1cCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5vRGF0YUNvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGUuc2RfTm9EYXRhRm9yUGVyaW9kIHx8ICdObyBkYXRhIGF2YWlsYWJsZSBmb3IgdGhpcyBwZXJpb2QnO1xuICAgICAgICBjb25zdCB0cnVuY2F0ZWRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlLnNkX0RhdGFUcnVuY2F0ZWRDbGlja1RvTG9hZCB8fCAnRGF0YSB0cnVuY2F0ZWQgKDUwMDAgbGluZXMgbGltaXQpLiBDbGljayB0byBsb2FkLic7XG4gICAgICAgIGNvbnN0IHBvcHVwU2V0dGluZ3MgPSB7IHBvc2l0aW9uOiAndG9wIGNlbnRlcicsIHZhcmlhdGlvbjogJ21pbmknIH07XG5cbiAgICAgICAgLy8gUG9wdXAgZm9yIG5vLWRhdGEgem9uZXNcbiAgICAgICAgW3RoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3QsIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICAgICAgJChlbCkucG9wdXAoJ2Rlc3Ryb3knKS5wb3B1cCh7IC4uLnBvcHVwU2V0dGluZ3MsIGNvbnRlbnQ6IG5vRGF0YUNvbnRlbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFBvcHVwIGZvciB0cnVuY2F0ZWQgem9uZXNcbiAgICAgICAgW3RoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3QsIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICAgICAgJChlbCkucG9wdXAoJ2Rlc3Ryb3knKS5wb3B1cCh7IC4uLnBvcHVwU2V0dGluZ3MsIGNvbnRlbnQ6IHRydW5jYXRlZENvbnRlbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayB3aGVuIHRydW5jYXRlZCB6b25lIGlzIGNsaWNrZWRcbiAgICAgKiBPdmVycmlkZSB0aGlzIHRvIGxvYWQgdGhlIHRydW5jYXRlZCByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcCBvZiB0cnVuY2F0ZWQgem9uZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wIG9mIHRydW5jYXRlZCB6b25lXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0xlZnRab25lIC0gVHJ1ZSBpZiBsZWZ0IHpvbmUgY2xpY2tlZCAodXNlIGxhdGVzdD10cnVlKSwgZmFsc2UgZm9yIHJpZ2h0IHpvbmVcbiAgICAgKi9cbiAgICBvblRydW5jYXRlZFpvbmVDbGljayhzdGFydCwgZW5kLCBpc0xlZnRab25lKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgd2hlbiByYW5nZSBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBvblJhbmdlQ2hhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgLy8gVG8gYmUgb3ZlcnJpZGRlblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIHZpc2libGUgcmFuZ2UgZW5kIHRvIHNwZWNpZmljIHRpbWVzdGFtcCAoZm9yIHJlZnJlc2ggbW9kZSlcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBCRUZPUkUgc2VydmVyIHJlcXVlc3QgdG8gc2V0IHdoZXJlIHRpbWVsaW5lIHNob3VsZCBlbmRcbiAgICAgKiBPbmx5IHVwZGF0ZXMgdmlzaWJsZVJhbmdlLCBOT1Qgc2VsZWN0ZWRSYW5nZSBvciBmdWxsUmFuZ2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3RW5kIC0gTmV3IGVuZCB0aW1lc3RhbXAgZm9yIHZpc2libGUgcmFuZ2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlIC0gSWYgdHJ1ZSwgYWx3YXlzIHNldCBldmVuIGlmIG5ld0VuZCA8PSBjdXJyZW50IGVuZFxuICAgICAqL1xuICAgIGV4dGVuZFJhbmdlKG5ld0VuZCwgZm9yY2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIWZvcmNlICYmIG5ld0VuZCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gTm8gbmVlZCB0byBleHRlbmRcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIHZpc2libGUgcmFuZ2UsIE5PVCBmdWxsUmFuZ2Ugb3Igc2VsZWN0ZWRSYW5nZVxuICAgICAgICAvLyBmdWxsUmFuZ2UgcmVwcmVzZW50cyBhY3R1YWwgZGF0YSBpbiBsb2cgZmlsZVxuICAgICAgICAvLyBzZWxlY3RlZFJhbmdlIHJlcHJlc2VudHMgdGhlIGFjdHVhbCBkYXRhIHBlcmlvZCAobm90IHByb2plY3RlZCBmdXR1cmUpXG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBuZXdFbmQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3RW5kIC0gdmlzaWJsZUR1cmF0aW9uO1xuXG4gICAgICAgIC8vIERPIE5PVCBzaGlmdCBzZWxlY3RlZFJhbmdlIC0gaXQgc2hvdWxkIHJlbWFpbiBib3VuZCB0byBhY3R1YWwgZGF0YVxuICAgICAgICAvLyBUaGUgZ2FwIGJldHdlZW4gc2VsZWN0ZWRSYW5nZS5lbmQgYW5kIHZpc2libGVSYW5nZS5lbmQgd2lsbCBzaG93IGFzIG5vLWRhdGEgem9uZVxuICAgICAgICAvLyBzZWxlY3RlZFJhbmdlIHdpbGwgYmUgdXBkYXRlZCBieSB1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoKSB3aXRoIHJlYWwgZGF0YVxuXG4gICAgICAgIC8vIFJlLXJlbmRlciB0byBzaG93IHVwZGF0ZWQgdGltZWxpbmUgd2l0aCBuby1kYXRhIHpvbmVcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZ1bGxSYW5nZS5lbmQgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBDYWxsZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBhY3R1YWxfcmFuZ2Ugd2l0aCByZWFsIGRhdGEgYm91bmRhcmllc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhY3R1YWxFbmQgLSBBY3R1YWwgZW5kIHRpbWVzdGFtcCBmcm9tIHNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIHVwZGF0ZURhdGFCb3VuZGFyeShhY3R1YWxFbmQpIHtcbiAgICAgICAgaWYgKGFjdHVhbEVuZCA+IHRoaXMuZnVsbFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgdGhpcy5mdWxsUmFuZ2UuZW5kID0gYWN0dWFsRW5kO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRpbWVsaW5lXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGRvY3VtZW50L3dpbmRvdy1sZXZlbCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kTW91c2VNb3ZlKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZE1vdXNlTW92ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kTW91c2VVcCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kTW91c2VVcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kUmVzaXplKSB7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fYm91bmRSZXNpemUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3ZnID0gbnVsbDtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MgPSBudWxsO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljID0gbnVsbDtcbiAgICB9XG59O1xuIl19