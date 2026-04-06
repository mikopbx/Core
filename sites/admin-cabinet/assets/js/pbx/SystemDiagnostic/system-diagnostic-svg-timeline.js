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
    this.visibleRange.start = Math.max(this.fullRange.end - period, this.fullRange.start); // Selection covers entire visible range — user expects to see ALL data for the period

    this.selectedRange.start = this.visibleRange.start;
    this.selectedRange.end = this.visibleRange.end; // Render

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLXN2Zy10aW1lbGluZS5qcyJdLCJuYW1lcyI6WyJTVkdUaW1lbGluZSIsImNvbnRhaW5lciIsInN2ZyIsImxheWVycyIsInRpY2tzIiwiZHluYW1pYyIsImVsZW1lbnRzIiwic2VsZWN0aW9uUmVjdCIsImxlZnRIYW5kbGUiLCJyaWdodEhhbmRsZSIsIm5vd0xpbmUiLCJzdGFydEJvdW5kYXJ5IiwiZW5kQm91bmRhcnkiLCJub0RhdGFMZWZ0UmVjdCIsIm5vRGF0YVJpZ2h0UmVjdCIsInRydW5jYXRlZExlZnRSZWN0IiwidHJ1bmNhdGVkUmlnaHRSZWN0IiwiZnVsbFJhbmdlIiwic3RhcnQiLCJlbmQiLCJ2aXNpYmxlUmFuZ2UiLCJzZWxlY3RlZFJhbmdlIiwicmVxdWVzdGVkUmFuZ2UiLCJ0cnVuY2F0aW9uIiwid2FzVHJ1bmNhdGVkIiwibGluZXNDb3VudCIsImRpcmVjdGlvbiIsImxlZnRab25lIiwicmlnaHRab25lIiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJkaW1lbnNpb25zIiwid2lkdGgiLCJoZWlnaHQiLCJwYWRkaW5nIiwiZHJhZ2dpbmciLCJhY3RpdmUiLCJoYW5kbGUiLCJzdGFydFgiLCJzdGFydFNlbGVjdGVkU3RhcnQiLCJzdGFydFNlbGVjdGVkRW5kIiwiaW5pdGlhbGl6ZSIsInRpbWVSYW5nZSIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsImNvbnNvbGUiLCJlcnJvciIsImlzTmFOIiwiTUlOX0RVUkFUSU9OIiwiZGlzcGxheVN0YXJ0IiwiZGlzcGxheUVuZCIsImNlbnRlciIsIm9mZnNldFdpZHRoIiwidG90YWxEdXJhdGlvbiIsImluaXRpYWxWaXNpYmxlRHVyYXRpb24iLCJNYXRoIiwibWF4IiwiY2FsY3VsYXRlQ2VudGVyZWRTZWxlY3Rpb24iLCJjcmVhdGVTVkciLCJyZW5kZXIiLCJhdHRhY2hFdmVudHMiLCJfYm91bmRSZXNpemUiLCJoYW5kbGVSZXNpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwidmlzaWJsZUR1cmF0aW9uIiwic2VsZWN0ZWREdXJhdGlvbiIsInZpc2libGVDZW50ZXIiLCJjYWxjdWxhdGVBZGFwdGl2ZVN0ZXAiLCJkdXJhdGlvbiIsImF2YWlsYWJsZVdpZHRoIiwic3RlcHMiLCJ2YWx1ZSIsImxhYmVsIiwiZm9ybWF0IiwibWluU3BhY2luZ1B4IiwibWF4TGFiZWxzIiwiZmxvb3IiLCJ0YXJnZXRNaW5MYWJlbHMiLCJtaW4iLCJ0YXJnZXRNYXhMYWJlbHMiLCJpIiwibGVuZ3RoIiwibnVtTGFiZWxzIiwiYmVzdFN0ZXAiLCJiZXN0RGlmZiIsIkluZmluaXR5IiwiZGlmZiIsImNyZWF0ZUVsZW1lbnROUyIsInNldEF0dHJpYnV0ZSIsImRlZnMiLCJwYXR0ZXJuIiwicGF0dGVyblJlY3QiLCJhcHBlbmRDaGlsZCIsImNyZWF0ZUR5bmFtaWNFbGVtZW50cyIsImlubmVySFRNTCIsInN0eWxlIiwiZGlzcGxheSIsInJlbmRlclRpY2tzIiwidXBkYXRlRHluYW1pY0VsZW1lbnRzIiwiZHJhd1RpY2tzIiwibGVmdFgiLCJyaWdodFgiLCJ3Iiwibm93IiwiRGF0ZSIsIm5vd0J1ZmZlciIsImNsYW1wZWROb3ciLCJub3dYIiwieFN0YXJ0IiwieEVuZCIsIm5vRGF0YUxlZnRFbmQiLCJub0RhdGFSaWdodFN0YXJ0IiwidHJ1bmNTdGFydCIsInRydW5jRW5kIiwiY2xhbXBlZFN0YXJ0IiwiY2xhbXBlZEVuZCIsInRydW5jV2lkdGgiLCJ3YXJuIiwic3RlcCIsInJvdW5kZWRTdGFydCIsIm1ham9yVGlja1Bvc2l0aW9ucyIsIlNldCIsInRpbWVzdGFtcCIsIngiLCJhZGQiLCJyb3VuZCIsImRyYXdUaWNrIiwiZHJhd0xhYmVsIiwiZm9ybWF0VGltZSIsIm1pbm9yVGltZXN0YW1wIiwibWlub3JTdGVwIiwicm91bmRlZE1pbm9yVGltZXN0YW1wIiwiaGFzIiwieSIsImNvbG9yIiwibGluZSIsInRleHQiLCJiYm94IiwiZ2V0VGV4dEJCb3giLCJiZyIsInRleHRDb250ZW50IiwiZm9udFNpemUiLCJjaGFyV2lkdGgiLCJpbmNsdWRlcyIsInNlcnZlclRpbWVNcyIsImRhdGUiLCJtb250aCIsIlN0cmluZyIsImdldFVUQ01vbnRoIiwicGFkU3RhcnQiLCJkYXkiLCJnZXRVVENEYXRlIiwiaG91cnMiLCJnZXRVVENIb3VycyIsIm1pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwic2Vjb25kcyIsImdldFVUQ1NlY29uZHMiLCJfYm91bmRNb3VzZURvd24iLCJlIiwiaGFuZGxlTW91c2VEb3duIiwiX2JvdW5kTW91c2VNb3ZlIiwiaGFuZGxlTW91c2VNb3ZlIiwiX2JvdW5kTW91c2VVcCIsImhhbmRsZU1vdXNlVXAiLCJfYm91bmRab25lQ2xpY2siLCJoYW5kbGVab25lQ2xpY2siLCJ0YXJnZXQiLCJ6b25lIiwiZ2V0QXR0cmlidXRlIiwib25UcnVuY2F0ZWRab25lQ2xpY2siLCJjbGllbnRYIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNvbnRhaW5lckxlZnQiLCJsZWZ0IiwiY29udGFpbmVyV2lkdGgiLCJwcmV2ZW50RGVmYXVsdCIsImRlbHRhWCIsImRlbHRhVGltZSIsIm5ld1N0YXJ0IiwibmV3RW5kIiwid2FzUmVzaXppbmciLCJ3YXNEcmFnZ2luZyIsImRyYWdnZWRIYW5kbGUiLCJuZXdWaXNpYmxlRHVyYXRpb24iLCJzZWxlY3RlZENlbnRlciIsIm5ld1Zpc2libGVTdGFydCIsIm5ld1Zpc2libGVFbmQiLCIkIiwicmVtb3ZlQ2xhc3MiLCJvblJhbmdlQ2hhbmdlIiwiYXBwbHlQZXJpb2QiLCJwZXJpb2RTZWNvbmRzIiwicGVyaW9kIiwicGFyc2VJbnQiLCJzZXRSYW5nZSIsInVwZGF0ZVNlbGVjdGVkUmFuZ2UiLCJ1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UiLCJhY3R1YWxSYW5nZSIsInJlcXVlc3RlZFN0YXJ0IiwicmVxdWVzdGVkRW5kIiwiaXNJbml0aWFsTG9hZCIsInRydW5jYXRlZCIsImxpbmVzX2NvdW50IiwidHJ1bmNhdGVkX2RpcmVjdGlvbiIsImN1cnJlbnRWaXNpYmxlRHVyYXRpb24iLCJpbml0aWFsaXplWm9uZVBvcHVwcyIsImZuIiwicG9wdXAiLCJub0RhdGFDb250ZW50IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfTm9EYXRhRm9yUGVyaW9kIiwidHJ1bmNhdGVkQ29udGVudCIsInNkX0RhdGFUcnVuY2F0ZWRDbGlja1RvTG9hZCIsInBvcHVwU2V0dGluZ3MiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImZvckVhY2giLCJlbCIsImNvbnRlbnQiLCJpc0xlZnRab25lIiwiZXh0ZW5kUmFuZ2UiLCJmb3JjZSIsInVwZGF0ZURhdGFCb3VuZGFyeSIsImFjdHVhbEVuZCIsImRlc3Ryb3kiLCJyZW1vdmVFdmVudExpc3RlbmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUxLOztBQU9oQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxHQUFHLEVBQUUsSUFYVzs7QUFhaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFO0FBQ0pDLElBQUFBLEtBQUssRUFBRSxJQURIO0FBQ2M7QUFDbEJDLElBQUFBLE9BQU8sRUFBRSxJQUZMLENBRWM7O0FBRmQsR0FqQlE7O0FBc0JoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUU7QUFDTkMsSUFBQUEsYUFBYSxFQUFFLElBRFQ7QUFFTkMsSUFBQUEsVUFBVSxFQUFFLElBRk47QUFHTkMsSUFBQUEsV0FBVyxFQUFFLElBSFA7QUFJTkMsSUFBQUEsT0FBTyxFQUFFLElBSkg7QUFLTkMsSUFBQUEsYUFBYSxFQUFFLElBTFQ7QUFNTkMsSUFBQUEsV0FBVyxFQUFFLElBTlA7QUFPTkMsSUFBQUEsY0FBYyxFQUFFLElBUFY7QUFRTkMsSUFBQUEsZUFBZSxFQUFFLElBUlg7QUFTTkMsSUFBQUEsaUJBQWlCLEVBQUUsSUFUYjtBQVVOQyxJQUFBQSxrQkFBa0IsRUFBRTtBQVZkLEdBMUJNOztBQXVDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLEtBQUssRUFBRSxJQURBO0FBRVBDLElBQUFBLEdBQUcsRUFBRTtBQUZFLEdBM0NLOztBQWdEaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFO0FBQ1ZGLElBQUFBLEtBQUssRUFBRSxJQURHO0FBRVZDLElBQUFBLEdBQUcsRUFBRTtBQUZLLEdBcERFOztBQXlEaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsYUFBYSxFQUFFO0FBQ1hILElBQUFBLEtBQUssRUFBRSxJQURJO0FBRVhDLElBQUFBLEdBQUcsRUFBRTtBQUZNLEdBN0RDOztBQWtFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsY0FBYyxFQUFFO0FBQ1pKLElBQUFBLEtBQUssRUFBRSxJQURLO0FBRVpDLElBQUFBLEdBQUcsRUFBRTtBQUZPLEdBdEVBOztBQTJFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsVUFBVSxFQUFFO0FBQ1JDLElBQUFBLFlBQVksRUFBRSxLQUROO0FBRVJDLElBQUFBLFVBQVUsRUFBRSxDQUZKO0FBR1JDLElBQUFBLFNBQVMsRUFBRSxJQUhIO0FBR1U7QUFDbEJDLElBQUFBLFFBQVEsRUFBRSxJQUpGO0FBSVU7QUFDbEJDLElBQUFBLFNBQVMsRUFBRSxJQUxILENBS1U7O0FBTFYsR0EvRUk7O0FBdUZoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRSxDQTNGTjs7QUE2RmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRTtBQUNSQyxJQUFBQSxLQUFLLEVBQUUsQ0FEQztBQUVSQyxJQUFBQSxNQUFNLEVBQUUsRUFGQTtBQUdSQyxJQUFBQSxPQUFPLEVBQUU7QUFIRCxHQWpHSTs7QUF1R2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxNQUFNLEVBQUUsS0FERjtBQUVOQyxJQUFBQSxNQUFNLEVBQUUsSUFGRjtBQUVRO0FBQ2RDLElBQUFBLE1BQU0sRUFBRSxDQUhGO0FBSU5DLElBQUFBLGtCQUFrQixFQUFFLENBSmQ7QUFLTkMsSUFBQUEsZ0JBQWdCLEVBQUU7QUFMWixHQTNHTTs7QUFtSGhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUF4SGdCLHNCQXdITHZDLFNBeEhLLEVBd0hNd0MsU0F4SE4sRUF3SGlCO0FBQUE7O0FBQzdCLFNBQUt4QyxTQUFMLEdBQWlCLE9BQU9BLFNBQVAsS0FBcUIsUUFBckIsR0FDWHlDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QjFDLFNBQXZCLENBRFcsR0FFWEEsU0FGTjs7QUFJQSxRQUFJLENBQUMsS0FBS0EsU0FBVixFQUFxQjtBQUNqQjJDLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDhCQUFkO0FBQ0E7QUFDSCxLQVI0QixDQVU3Qjs7O0FBQ0EsUUFBSSxPQUFPSixTQUFTLENBQUN2QixLQUFqQixLQUEyQixRQUEzQixJQUF1QyxPQUFPdUIsU0FBUyxDQUFDdEIsR0FBakIsS0FBeUIsUUFBaEUsSUFDQTJCLEtBQUssQ0FBQ0wsU0FBUyxDQUFDdkIsS0FBWCxDQURMLElBQzBCNEIsS0FBSyxDQUFDTCxTQUFTLENBQUN0QixHQUFYLENBRG5DLEVBQ29EO0FBQ2hEeUIsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsdUVBQWQ7QUFDQTtBQUNILEtBZjRCLENBaUI3QjtBQUNBOzs7QUFDQSxTQUFLNUIsU0FBTCxDQUFlQyxLQUFmLEdBQXVCdUIsU0FBUyxDQUFDdkIsS0FBakM7QUFDQSxTQUFLRCxTQUFMLENBQWVFLEdBQWYsR0FBcUJzQixTQUFTLENBQUN0QixHQUEvQixDQXBCNkIsQ0FzQjdCO0FBQ0E7O0FBQ0EsUUFBTTRCLFlBQVksR0FBRyxFQUFyQixDQXhCNkIsQ0F3Qko7O0FBQ3pCLFFBQUlDLFlBQVksR0FBR1AsU0FBUyxDQUFDdkIsS0FBN0I7QUFDQSxRQUFJK0IsVUFBVSxHQUFHUixTQUFTLENBQUN0QixHQUEzQjs7QUFDQSxRQUFJOEIsVUFBVSxHQUFHRCxZQUFiLEdBQTRCRCxZQUFoQyxFQUE4QztBQUMxQyxVQUFNRyxNQUFNLEdBQUdGLFlBQWY7QUFDQUEsTUFBQUEsWUFBWSxHQUFHRSxNQUFNLEdBQUlILFlBQVksR0FBRyxDQUF4QztBQUNBRSxNQUFBQSxVQUFVLEdBQUdDLE1BQU0sR0FBSUgsWUFBWSxHQUFHLENBQXRDO0FBQ0g7O0FBRUQsU0FBS2pCLFVBQUwsQ0FBZ0JDLEtBQWhCLEdBQXdCLEtBQUs5QixTQUFMLENBQWVrRCxXQUF2QyxDQWpDNkIsQ0FtQzdCOztBQUNBLFFBQU1DLGFBQWEsR0FBR0gsVUFBVSxHQUFHRCxZQUFuQztBQUNBLFFBQUlLLHNCQUFKOztBQUVBLFFBQUlELGFBQWEsR0FBRyxRQUFRLENBQTVCLEVBQStCO0FBQzNCO0FBQ0FDLE1BQUFBLHNCQUFzQixHQUFHLEtBQXpCLENBRjJCLENBRUs7QUFDbkMsS0FIRCxNQUdPLElBQUlELGFBQWEsR0FBRyxLQUFwQixFQUEyQjtBQUM5QjtBQUNBQyxNQUFBQSxzQkFBc0IsR0FBRyxLQUF6QixDQUY4QixDQUVFO0FBQ25DLEtBSE0sTUFHQSxJQUFJRCxhQUFhLEdBQUcsT0FBTyxDQUEzQixFQUE4QjtBQUNqQztBQUNBQyxNQUFBQSxzQkFBc0IsR0FBRyxLQUF6QixDQUZpQyxDQUVEO0FBQ25DLEtBSE0sTUFHQTtBQUNIO0FBQ0FBLE1BQUFBLHNCQUFzQixHQUFHRCxhQUF6QjtBQUNILEtBbkQ0QixDQXFEN0I7OztBQUNBLFNBQUtoQyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QjhCLFVBQXhCO0FBQ0EsU0FBSzdCLFlBQUwsQ0FBa0JGLEtBQWxCLEdBQTBCb0MsSUFBSSxDQUFDQyxHQUFMLENBQVNOLFVBQVUsR0FBR0ksc0JBQXRCLEVBQThDTCxZQUE5QyxDQUExQixDQXZENkIsQ0F5RDdCOztBQUNBLFNBQUtRLDBCQUFMLEdBMUQ2QixDQTREN0I7O0FBQ0EsU0FBS0MsU0FBTDtBQUNBLFNBQUtDLE1BQUw7QUFDQSxTQUFLQyxZQUFMLEdBL0Q2QixDQWlFN0I7O0FBQ0EsU0FBS0MsWUFBTCxHQUFvQjtBQUFBLGFBQU0sS0FBSSxDQUFDQyxZQUFMLEVBQU47QUFBQSxLQUFwQjs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixRQUF4QixFQUFrQyxLQUFLSCxZQUF2QztBQUNILEdBNUxlOztBQThMaEI7QUFDSjtBQUNBO0FBQ0lKLEVBQUFBLDBCQWpNZ0Isd0NBaU1hO0FBQ3pCLFFBQU1RLGVBQWUsR0FBRyxLQUFLNUMsWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0IsS0FBS0MsWUFBTCxDQUFrQkYsS0FBbEU7QUFDQSxRQUFNK0MsZ0JBQWdCLEdBQUdELGVBQWUsR0FBRyxDQUEzQztBQUNBLFFBQU1FLGFBQWEsR0FBRyxLQUFLOUMsWUFBTCxDQUFrQkYsS0FBbEIsR0FBMkI4QyxlQUFlLEdBQUcsQ0FBbkU7QUFFQSxTQUFLM0MsYUFBTCxDQUFtQkgsS0FBbkIsR0FBMkJnRCxhQUFhLEdBQUlELGdCQUFnQixHQUFHLENBQS9EO0FBQ0EsU0FBSzVDLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCK0MsYUFBYSxHQUFJRCxnQkFBZ0IsR0FBRyxDQUE3RCxDQU55QixDQVF6Qjs7QUFDQSxRQUFJLEtBQUs1QyxhQUFMLENBQW1CSCxLQUFuQixHQUEyQixLQUFLRSxZQUFMLENBQWtCRixLQUFqRCxFQUF3RDtBQUNwRCxXQUFLRyxhQUFMLENBQW1CSCxLQUFuQixHQUEyQixLQUFLRSxZQUFMLENBQWtCRixLQUE3QztBQUNBLFdBQUtHLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCLEtBQUtDLFlBQUwsQ0FBa0JGLEtBQWxCLEdBQTBCK0MsZ0JBQW5EO0FBQ0g7O0FBQ0QsUUFBSSxLQUFLNUMsYUFBTCxDQUFtQkYsR0FBbkIsR0FBeUIsS0FBS0MsWUFBTCxDQUFrQkQsR0FBL0MsRUFBb0Q7QUFDaEQsV0FBS0UsYUFBTCxDQUFtQkYsR0FBbkIsR0FBeUIsS0FBS0MsWUFBTCxDQUFrQkQsR0FBM0M7QUFDQSxXQUFLRSxhQUFMLENBQW1CSCxLQUFuQixHQUEyQixLQUFLRSxZQUFMLENBQWtCRCxHQUFsQixHQUF3QjhDLGdCQUFuRDtBQUNIO0FBQ0osR0FsTmU7O0FBb05oQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLHFCQTVOZ0IsaUNBNE5NQyxRQTVOTixFQTROZ0JDLGNBNU5oQixFQTROZ0M7QUFDNUM7QUFDQSxRQUFNQyxLQUFLLEdBQUcsQ0FDVjtBQUFFQyxNQUFBQSxLQUFLLEVBQUUsQ0FBVDtBQUFZQyxNQUFBQSxLQUFLLEVBQUUsT0FBbkI7QUFBNEJDLE1BQUFBLE1BQU0sRUFBRTtBQUFwQyxLQURVLEVBQytDO0FBQ3pEO0FBQUVGLE1BQUFBLEtBQUssRUFBRSxDQUFUO0FBQVlDLE1BQUFBLEtBQUssRUFBRSxPQUFuQjtBQUE0QkMsTUFBQUEsTUFBTSxFQUFFO0FBQXBDLEtBRlUsRUFFK0M7QUFDekQ7QUFBRUYsTUFBQUEsS0FBSyxFQUFFLEVBQVQ7QUFBYUMsTUFBQUEsS0FBSyxFQUFFLFFBQXBCO0FBQThCQyxNQUFBQSxNQUFNLEVBQUU7QUFBdEMsS0FIVSxFQUcrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsRUFBVDtBQUFhQyxNQUFBQSxLQUFLLEVBQUUsUUFBcEI7QUFBOEJDLE1BQUFBLE1BQU0sRUFBRTtBQUF0QyxLQUpVLEVBSStDO0FBQ3pEO0FBQUVGLE1BQUFBLEtBQUssRUFBRSxFQUFUO0FBQWFDLE1BQUFBLEtBQUssRUFBRSxPQUFwQjtBQUE2QkMsTUFBQUEsTUFBTSxFQUFFO0FBQXJDLEtBTFUsRUFLK0M7QUFDekQ7QUFBRUYsTUFBQUEsS0FBSyxFQUFFLEdBQVQ7QUFBY0MsTUFBQUEsS0FBSyxFQUFFLE9BQXJCO0FBQThCQyxNQUFBQSxNQUFNLEVBQUU7QUFBdEMsS0FOVSxFQU0rQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsR0FBVDtBQUFjQyxNQUFBQSxLQUFLLEVBQUUsUUFBckI7QUFBK0JDLE1BQUFBLE1BQU0sRUFBRTtBQUF2QyxLQVBVLEVBTytDO0FBQ3pEO0FBQUVGLE1BQUFBLEtBQUssRUFBRSxJQUFUO0FBQWVDLE1BQUFBLEtBQUssRUFBRSxRQUF0QjtBQUFnQ0MsTUFBQUEsTUFBTSxFQUFFO0FBQXhDLEtBUlUsRUFRK0M7QUFDekQ7QUFBRUYsTUFBQUEsS0FBSyxFQUFFLElBQVQ7QUFBZUMsTUFBQUEsS0FBSyxFQUFFLFFBQXRCO0FBQWdDQyxNQUFBQSxNQUFNLEVBQUU7QUFBeEMsS0FUVSxFQVMrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsS0FBVDtBQUFnQkMsTUFBQUEsS0FBSyxFQUFFLFNBQXZCO0FBQWtDQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUMsS0FWVSxFQVUrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsS0FBVDtBQUFnQkMsTUFBQUEsS0FBSyxFQUFFLFNBQXZCO0FBQWtDQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUMsS0FYVSxFQVcrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsS0FBVDtBQUFnQkMsTUFBQUEsS0FBSyxFQUFFLFVBQXZCO0FBQW1DQyxNQUFBQSxNQUFNLEVBQUU7QUFBM0MsS0FaVSxFQVkrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsS0FBVDtBQUFnQkMsTUFBQUEsS0FBSyxFQUFFLE9BQXZCO0FBQWdDQyxNQUFBQSxNQUFNLEVBQUU7QUFBeEMsS0FiVSxFQWErQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsTUFBVDtBQUFpQkMsTUFBQUEsS0FBSyxFQUFFLFFBQXhCO0FBQWtDQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUMsS0FkVSxFQWMrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsTUFBVDtBQUFpQkMsTUFBQUEsS0FBSyxFQUFFLFFBQXhCO0FBQWtDQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUMsS0FmVSxFQWUrQztBQUN6RDtBQUFFRixNQUFBQSxLQUFLLEVBQUUsT0FBVDtBQUFrQkMsTUFBQUEsS0FBSyxFQUFFLFNBQXpCO0FBQW9DQyxNQUFBQSxNQUFNLEVBQUU7QUFBNUMsS0FoQlUsQ0FnQitDO0FBaEIvQyxLQUFkLENBRjRDLENBcUI1QztBQUNBOztBQUNBLFFBQU1DLFlBQVksR0FBRyxFQUFyQixDQXZCNEMsQ0F5QjVDOztBQUNBLFFBQU1DLFNBQVMsR0FBR3JCLElBQUksQ0FBQ3NCLEtBQUwsQ0FBV1AsY0FBYyxHQUFHSyxZQUE1QixDQUFsQixDQTFCNEMsQ0E0QjVDOztBQUNBLFFBQU1HLGVBQWUsR0FBR3ZCLElBQUksQ0FBQ0MsR0FBTCxDQUFTLENBQVQsRUFBWUQsSUFBSSxDQUFDd0IsR0FBTCxDQUFTLENBQVQsRUFBWUgsU0FBWixDQUFaLENBQXhCO0FBQ0EsUUFBTUksZUFBZSxHQUFHekIsSUFBSSxDQUFDQyxHQUFMLENBQVNzQixlQUFULEVBQTBCRixTQUExQixDQUF4QixDQTlCNEMsQ0FnQzVDOztBQUNBLFNBQUssSUFBSUssQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR1YsS0FBSyxDQUFDVyxNQUExQixFQUFrQ0QsQ0FBQyxFQUFuQyxFQUF1QztBQUNuQyxVQUFNRSxTQUFTLEdBQUc1QixJQUFJLENBQUNzQixLQUFMLENBQVdSLFFBQVEsR0FBR0UsS0FBSyxDQUFDVSxDQUFELENBQUwsQ0FBU1QsS0FBL0IsQ0FBbEIsQ0FEbUMsQ0FHbkM7O0FBQ0EsVUFBSVcsU0FBUyxJQUFJTCxlQUFiLElBQWdDSyxTQUFTLElBQUlILGVBQWpELEVBQWtFO0FBQzlELGVBQU9ULEtBQUssQ0FBQ1UsQ0FBRCxDQUFaO0FBQ0g7QUFDSixLQXhDMkMsQ0EwQzVDOzs7QUFDQSxRQUFJRyxRQUFRLEdBQUdiLEtBQUssQ0FBQyxDQUFELENBQXBCO0FBQ0EsUUFBSWMsUUFBUSxHQUFHQyxRQUFmOztBQUVBLFNBQUssSUFBSUwsRUFBQyxHQUFHLENBQWIsRUFBZ0JBLEVBQUMsR0FBR1YsS0FBSyxDQUFDVyxNQUExQixFQUFrQ0QsRUFBQyxFQUFuQyxFQUF1QztBQUNuQyxVQUFNRSxVQUFTLEdBQUc1QixJQUFJLENBQUNzQixLQUFMLENBQVdSLFFBQVEsR0FBR0UsS0FBSyxDQUFDVSxFQUFELENBQUwsQ0FBU1QsS0FBL0IsQ0FBbEIsQ0FEbUMsQ0FHbkM7OztBQUNBLFVBQUlILFFBQVEsR0FBR0UsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTQyxLQUFULEdBQWlCTSxlQUFoQyxFQUFpRDtBQUM3QyxZQUFJSyxVQUFTLElBQUksQ0FBakIsRUFBb0I7QUFDaEIsaUJBQU9aLEtBQUssQ0FBQ1UsRUFBRCxDQUFaO0FBQ0g7O0FBQ0Q7QUFDSCxPQVRrQyxDQVduQzs7O0FBQ0EsVUFBSU0sSUFBSSxTQUFSOztBQUNBLFVBQUlKLFVBQVMsR0FBR0wsZUFBaEIsRUFBaUM7QUFDN0JTLFFBQUFBLElBQUksR0FBRyxDQUFDVCxlQUFlLEdBQUdLLFVBQW5CLElBQWdDLENBQXZDLENBRDZCLENBQ2E7QUFDN0MsT0FGRCxNQUVPLElBQUlBLFVBQVMsR0FBR0gsZUFBaEIsRUFBaUM7QUFDcENPLFFBQUFBLElBQUksR0FBR0osVUFBUyxHQUFHSCxlQUFuQixDQURvQyxDQUNBO0FBQ3ZDLE9BRk0sTUFFQTtBQUNITyxRQUFBQSxJQUFJLEdBQUcsQ0FBUCxDQURHLENBQ087QUFDYjs7QUFFRCxVQUFJQSxJQUFJLEdBQUdGLFFBQVgsRUFBcUI7QUFDakJBLFFBQUFBLFFBQVEsR0FBR0UsSUFBWDtBQUNBSCxRQUFBQSxRQUFRLEdBQUdiLEtBQUssQ0FBQ1UsRUFBRCxDQUFoQjtBQUNIO0FBQ0o7O0FBRUQsV0FBT0csUUFBUDtBQUNILEdBdFNlOztBQXdTaEI7QUFDSjtBQUNBO0FBQ0kxQixFQUFBQSxTQTNTZ0IsdUJBMlNKO0FBQ1IsUUFBTXZELEdBQUcsR0FBR3dDLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELEtBQXZELENBQVo7QUFDQXJGLElBQUFBLEdBQUcsQ0FBQ3NGLFlBQUosQ0FBaUIsT0FBakIsRUFBMEIsY0FBMUI7QUFDQXRGLElBQUFBLEdBQUcsQ0FBQ3NGLFlBQUosQ0FBaUIsT0FBakIsRUFBMEIsTUFBMUI7QUFDQXRGLElBQUFBLEdBQUcsQ0FBQ3NGLFlBQUosQ0FBaUIsUUFBakIsRUFBMkIsS0FBSzFELFVBQUwsQ0FBZ0JFLE1BQTNDLEVBSlEsQ0FNUjs7QUFDQSxRQUFNeUQsSUFBSSxHQUFHL0MsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsTUFBdkQsQ0FBYixDQVBRLENBU1I7O0FBQ0EsUUFBTUcsT0FBTyxHQUFHaEQsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsU0FBdkQsQ0FBaEI7QUFDQUcsSUFBQUEsT0FBTyxDQUFDRixZQUFSLENBQXFCLElBQXJCLEVBQTJCLDBCQUEzQjtBQUNBRSxJQUFBQSxPQUFPLENBQUNGLFlBQVIsQ0FBcUIsY0FBckIsRUFBcUMsZ0JBQXJDO0FBQ0FFLElBQUFBLE9BQU8sQ0FBQ0YsWUFBUixDQUFxQixPQUFyQixFQUE4QixHQUE5QjtBQUNBRSxJQUFBQSxPQUFPLENBQUNGLFlBQVIsQ0FBcUIsUUFBckIsRUFBK0IsR0FBL0I7QUFDQUUsSUFBQUEsT0FBTyxDQUFDRixZQUFSLENBQXFCLGtCQUFyQixFQUF5QyxZQUF6QztBQUVBLFFBQU1HLFdBQVcsR0FBR2pELFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQXBCO0FBQ0FJLElBQUFBLFdBQVcsQ0FBQ0gsWUFBWixDQUF5QixPQUF6QixFQUFrQyxHQUFsQztBQUNBRyxJQUFBQSxXQUFXLENBQUNILFlBQVosQ0FBeUIsUUFBekIsRUFBbUMsR0FBbkM7QUFDQUcsSUFBQUEsV0FBVyxDQUFDSCxZQUFaLENBQXlCLE1BQXpCLEVBQWlDLHFCQUFqQztBQUVBRSxJQUFBQSxPQUFPLENBQUNFLFdBQVIsQ0FBb0JELFdBQXBCO0FBQ0FGLElBQUFBLElBQUksQ0FBQ0csV0FBTCxDQUFpQkYsT0FBakI7QUFDQXhGLElBQUFBLEdBQUcsQ0FBQzBGLFdBQUosQ0FBZ0JILElBQWhCLEVBeEJRLENBMEJSOztBQUNBLFNBQUt0RixNQUFMLENBQVlDLEtBQVosR0FBb0JzQyxRQUFRLENBQUM2QyxlQUFULENBQXlCLDRCQUF6QixFQUF1RCxHQUF2RCxDQUFwQjtBQUNBLFNBQUtwRixNQUFMLENBQVlDLEtBQVosQ0FBa0JvRixZQUFsQixDQUErQixPQUEvQixFQUF3QyxzQkFBeEM7QUFFQSxTQUFLckYsTUFBTCxDQUFZRSxPQUFaLEdBQXNCcUMsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsR0FBdkQsQ0FBdEI7QUFDQSxTQUFLcEYsTUFBTCxDQUFZRSxPQUFaLENBQW9CbUYsWUFBcEIsQ0FBaUMsT0FBakMsRUFBMEMsd0JBQTFDO0FBRUF0RixJQUFBQSxHQUFHLENBQUMwRixXQUFKLENBQWdCLEtBQUt6RixNQUFMLENBQVlDLEtBQTVCO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQzBGLFdBQUosQ0FBZ0IsS0FBS3pGLE1BQUwsQ0FBWUUsT0FBNUIsRUFsQ1EsQ0FvQ1I7O0FBQ0EsU0FBS3dGLHFCQUFMO0FBRUEsU0FBSzVGLFNBQUwsQ0FBZTZGLFNBQWYsR0FBMkIsRUFBM0I7QUFDQSxTQUFLN0YsU0FBTCxDQUFlMkYsV0FBZixDQUEyQjFGLEdBQTNCO0FBQ0EsU0FBS0EsR0FBTCxHQUFXQSxHQUFYO0FBQ0gsR0FyVmU7O0FBdVZoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJMkYsRUFBQUEscUJBM1ZnQixtQ0EyVlE7QUFDcEIsUUFBUTdELE1BQVIsR0FBbUIsS0FBS0YsVUFBeEIsQ0FBUUUsTUFBUixDQURvQixDQUdwQjs7QUFDQSxTQUFLMUIsUUFBTCxDQUFjTyxjQUFkLEdBQStCNkIsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsTUFBdkQsQ0FBL0I7QUFDQSxTQUFLakYsUUFBTCxDQUFjTyxjQUFkLENBQTZCMkUsWUFBN0IsQ0FBMEMsR0FBMUMsRUFBK0MsQ0FBL0M7QUFDQSxTQUFLbEYsUUFBTCxDQUFjTyxjQUFkLENBQTZCMkUsWUFBN0IsQ0FBMEMsUUFBMUMsRUFBb0R4RCxNQUFwRDtBQUNBLFNBQUsxQixRQUFMLENBQWNPLGNBQWQsQ0FBNkIyRSxZQUE3QixDQUEwQyxPQUExQyxFQUFtRCxrQkFBbkQ7QUFDQSxTQUFLbEYsUUFBTCxDQUFjTyxjQUFkLENBQTZCa0YsS0FBN0IsQ0FBbUNDLE9BQW5DLEdBQTZDLE1BQTdDO0FBQ0EsU0FBSzdGLE1BQUwsQ0FBWUUsT0FBWixDQUFvQnVGLFdBQXBCLENBQWdDLEtBQUt0RixRQUFMLENBQWNPLGNBQTlDLEVBVG9CLENBV3BCOztBQUNBLFNBQUtQLFFBQUwsQ0FBY1EsZUFBZCxHQUFnQzRCLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQWhDO0FBQ0EsU0FBS2pGLFFBQUwsQ0FBY1EsZUFBZCxDQUE4QjBFLFlBQTlCLENBQTJDLEdBQTNDLEVBQWdELENBQWhEO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY1EsZUFBZCxDQUE4QjBFLFlBQTlCLENBQTJDLFFBQTNDLEVBQXFEeEQsTUFBckQ7QUFDQSxTQUFLMUIsUUFBTCxDQUFjUSxlQUFkLENBQThCMEUsWUFBOUIsQ0FBMkMsT0FBM0MsRUFBb0Qsa0JBQXBEO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY1EsZUFBZCxDQUE4QmlGLEtBQTlCLENBQW9DQyxPQUFwQyxHQUE4QyxNQUE5QztBQUNBLFNBQUs3RixNQUFMLENBQVlFLE9BQVosQ0FBb0J1RixXQUFwQixDQUFnQyxLQUFLdEYsUUFBTCxDQUFjUSxlQUE5QyxFQWpCb0IsQ0FtQnBCOztBQUNBLFNBQUtSLFFBQUwsQ0FBY1MsaUJBQWQsR0FBa0MyQixRQUFRLENBQUM2QyxlQUFULENBQXlCLDRCQUF6QixFQUF1RCxNQUF2RCxDQUFsQztBQUNBLFNBQUtqRixRQUFMLENBQWNTLGlCQUFkLENBQWdDeUUsWUFBaEMsQ0FBNkMsR0FBN0MsRUFBa0QsQ0FBbEQ7QUFDQSxTQUFLbEYsUUFBTCxDQUFjUyxpQkFBZCxDQUFnQ3lFLFlBQWhDLENBQTZDLFFBQTdDLEVBQXVEeEQsTUFBdkQ7QUFDQSxTQUFLMUIsUUFBTCxDQUFjUyxpQkFBZCxDQUFnQ3lFLFlBQWhDLENBQTZDLE9BQTdDLEVBQXNELG9CQUF0RDtBQUNBLFNBQUtsRixRQUFMLENBQWNTLGlCQUFkLENBQWdDeUUsWUFBaEMsQ0FBNkMsV0FBN0MsRUFBMEQsZ0JBQTFEO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY1MsaUJBQWQsQ0FBZ0NnRixLQUFoQyxDQUFzQ0MsT0FBdEMsR0FBZ0QsTUFBaEQ7QUFDQSxTQUFLN0YsTUFBTCxDQUFZRSxPQUFaLENBQW9CdUYsV0FBcEIsQ0FBZ0MsS0FBS3RGLFFBQUwsQ0FBY1MsaUJBQTlDLEVBMUJvQixDQTRCcEI7O0FBQ0EsU0FBS1QsUUFBTCxDQUFjVSxrQkFBZCxHQUFtQzBCLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQW5DO0FBQ0EsU0FBS2pGLFFBQUwsQ0FBY1Usa0JBQWQsQ0FBaUN3RSxZQUFqQyxDQUE4QyxHQUE5QyxFQUFtRCxDQUFuRDtBQUNBLFNBQUtsRixRQUFMLENBQWNVLGtCQUFkLENBQWlDd0UsWUFBakMsQ0FBOEMsUUFBOUMsRUFBd0R4RCxNQUF4RDtBQUNBLFNBQUsxQixRQUFMLENBQWNVLGtCQUFkLENBQWlDd0UsWUFBakMsQ0FBOEMsT0FBOUMsRUFBdUQsb0JBQXZEO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY1Usa0JBQWQsQ0FBaUN3RSxZQUFqQyxDQUE4QyxXQUE5QyxFQUEyRCxpQkFBM0Q7QUFDQSxTQUFLbEYsUUFBTCxDQUFjVSxrQkFBZCxDQUFpQytFLEtBQWpDLENBQXVDQyxPQUF2QyxHQUFpRCxNQUFqRDtBQUNBLFNBQUs3RixNQUFMLENBQVlFLE9BQVosQ0FBb0J1RixXQUFwQixDQUFnQyxLQUFLdEYsUUFBTCxDQUFjVSxrQkFBOUMsRUFuQ29CLENBcUNwQjs7QUFDQSxTQUFLVixRQUFMLENBQWNJLE9BQWQsR0FBd0JnQyxRQUFRLENBQUM2QyxlQUFULENBQXlCLDRCQUF6QixFQUF1RCxNQUF2RCxDQUF4QjtBQUNBLFNBQUtqRixRQUFMLENBQWNJLE9BQWQsQ0FBc0I4RSxZQUF0QixDQUFtQyxJQUFuQyxFQUF5QyxDQUF6QztBQUNBLFNBQUtsRixRQUFMLENBQWNJLE9BQWQsQ0FBc0I4RSxZQUF0QixDQUFtQyxJQUFuQyxFQUF5Q3hELE1BQXpDO0FBQ0EsU0FBSzFCLFFBQUwsQ0FBY0ksT0FBZCxDQUFzQjhFLFlBQXRCLENBQW1DLE9BQW5DLEVBQTRDLGNBQTVDO0FBQ0EsU0FBS3JGLE1BQUwsQ0FBWUUsT0FBWixDQUFvQnVGLFdBQXBCLENBQWdDLEtBQUt0RixRQUFMLENBQWNJLE9BQTlDLEVBMUNvQixDQTRDcEI7O0FBQ0EsU0FBS0osUUFBTCxDQUFjSyxhQUFkLEdBQThCK0IsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsTUFBdkQsQ0FBOUI7QUFDQSxTQUFLakYsUUFBTCxDQUFjSyxhQUFkLENBQTRCNkUsWUFBNUIsQ0FBeUMsSUFBekMsRUFBK0MsQ0FBL0M7QUFDQSxTQUFLbEYsUUFBTCxDQUFjSyxhQUFkLENBQTRCNkUsWUFBNUIsQ0FBeUMsSUFBekMsRUFBK0N4RCxNQUEvQztBQUNBLFNBQUsxQixRQUFMLENBQWNLLGFBQWQsQ0FBNEI2RSxZQUE1QixDQUF5QyxPQUF6QyxFQUFrRCxtQkFBbEQ7QUFDQSxTQUFLckYsTUFBTCxDQUFZRSxPQUFaLENBQW9CdUYsV0FBcEIsQ0FBZ0MsS0FBS3RGLFFBQUwsQ0FBY0ssYUFBOUMsRUFqRG9CLENBbURwQjs7QUFDQSxTQUFLTCxRQUFMLENBQWNNLFdBQWQsR0FBNEI4QixRQUFRLENBQUM2QyxlQUFULENBQXlCLDRCQUF6QixFQUF1RCxNQUF2RCxDQUE1QjtBQUNBLFNBQUtqRixRQUFMLENBQWNNLFdBQWQsQ0FBMEI0RSxZQUExQixDQUF1QyxJQUF2QyxFQUE2QyxDQUE3QztBQUNBLFNBQUtsRixRQUFMLENBQWNNLFdBQWQsQ0FBMEI0RSxZQUExQixDQUF1QyxJQUF2QyxFQUE2Q3hELE1BQTdDO0FBQ0EsU0FBSzFCLFFBQUwsQ0FBY00sV0FBZCxDQUEwQjRFLFlBQTFCLENBQXVDLE9BQXZDLEVBQWdELG1CQUFoRDtBQUNBLFNBQUtyRixNQUFMLENBQVlFLE9BQVosQ0FBb0J1RixXQUFwQixDQUFnQyxLQUFLdEYsUUFBTCxDQUFjTSxXQUE5QyxFQXhEb0IsQ0EwRHBCOztBQUNBLFNBQUtOLFFBQUwsQ0FBY0MsYUFBZCxHQUE4Qm1DLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQTlCO0FBQ0EsU0FBS2pGLFFBQUwsQ0FBY0MsYUFBZCxDQUE0QmlGLFlBQTVCLENBQXlDLEdBQXpDLEVBQThDLENBQTlDO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY0MsYUFBZCxDQUE0QmlGLFlBQTVCLENBQXlDLFFBQXpDLEVBQW1EeEQsTUFBbkQ7QUFDQSxTQUFLMUIsUUFBTCxDQUFjQyxhQUFkLENBQTRCaUYsWUFBNUIsQ0FBeUMsT0FBekMsRUFBa0Qsb0JBQWxEO0FBQ0EsU0FBS2xGLFFBQUwsQ0FBY0MsYUFBZCxDQUE0QmlGLFlBQTVCLENBQXlDLGFBQXpDLEVBQXdELE9BQXhEO0FBQ0EsU0FBS3JGLE1BQUwsQ0FBWUUsT0FBWixDQUFvQnVGLFdBQXBCLENBQWdDLEtBQUt0RixRQUFMLENBQWNDLGFBQTlDLEVBaEVvQixDQWtFcEI7O0FBQ0EsU0FBS0QsUUFBTCxDQUFjRSxVQUFkLEdBQTJCa0MsUUFBUSxDQUFDNkMsZUFBVCxDQUF5Qiw0QkFBekIsRUFBdUQsTUFBdkQsQ0FBM0I7QUFDQSxTQUFLakYsUUFBTCxDQUFjRSxVQUFkLENBQXlCZ0YsWUFBekIsQ0FBc0MsR0FBdEMsRUFBMkMsQ0FBM0M7QUFDQSxTQUFLbEYsUUFBTCxDQUFjRSxVQUFkLENBQXlCZ0YsWUFBekIsQ0FBc0MsT0FBdEMsRUFBK0MsQ0FBL0M7QUFDQSxTQUFLbEYsUUFBTCxDQUFjRSxVQUFkLENBQXlCZ0YsWUFBekIsQ0FBc0MsUUFBdEMsRUFBZ0R4RCxNQUFoRDtBQUNBLFNBQUsxQixRQUFMLENBQWNFLFVBQWQsQ0FBeUJnRixZQUF6QixDQUFzQyxPQUF0QyxFQUErQyxpQkFBL0M7QUFDQSxTQUFLbEYsUUFBTCxDQUFjRSxVQUFkLENBQXlCZ0YsWUFBekIsQ0FBc0MsYUFBdEMsRUFBcUQsTUFBckQ7QUFDQSxTQUFLckYsTUFBTCxDQUFZRSxPQUFaLENBQW9CdUYsV0FBcEIsQ0FBZ0MsS0FBS3RGLFFBQUwsQ0FBY0UsVUFBOUMsRUF6RW9CLENBMkVwQjs7QUFDQSxTQUFLRixRQUFMLENBQWNHLFdBQWQsR0FBNEJpQyxRQUFRLENBQUM2QyxlQUFULENBQXlCLDRCQUF6QixFQUF1RCxNQUF2RCxDQUE1QjtBQUNBLFNBQUtqRixRQUFMLENBQWNHLFdBQWQsQ0FBMEIrRSxZQUExQixDQUF1QyxHQUF2QyxFQUE0QyxDQUE1QztBQUNBLFNBQUtsRixRQUFMLENBQWNHLFdBQWQsQ0FBMEIrRSxZQUExQixDQUF1QyxPQUF2QyxFQUFnRCxDQUFoRDtBQUNBLFNBQUtsRixRQUFMLENBQWNHLFdBQWQsQ0FBMEIrRSxZQUExQixDQUF1QyxRQUF2QyxFQUFpRHhELE1BQWpEO0FBQ0EsU0FBSzFCLFFBQUwsQ0FBY0csV0FBZCxDQUEwQitFLFlBQTFCLENBQXVDLE9BQXZDLEVBQWdELGlCQUFoRDtBQUNBLFNBQUtsRixRQUFMLENBQWNHLFdBQWQsQ0FBMEIrRSxZQUExQixDQUF1QyxhQUF2QyxFQUFzRCxPQUF0RDtBQUNBLFNBQUtyRixNQUFMLENBQVlFLE9BQVosQ0FBb0J1RixXQUFwQixDQUFnQyxLQUFLdEYsUUFBTCxDQUFjRyxXQUE5QztBQUNILEdBOWFlOztBQWdiaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSWlELEVBQUFBLE1BcGJnQixvQkFvYlA7QUFDTCxRQUFJLENBQUMsS0FBS3hELEdBQVYsRUFBZSxPQURWLENBR0w7O0FBQ0EsU0FBSzRCLFVBQUwsQ0FBZ0JDLEtBQWhCLEdBQXdCLEtBQUs5QixTQUFMLENBQWVrRCxXQUF2QyxDQUpLLENBTUw7O0FBQ0EsU0FBSzhDLFdBQUwsR0FQSyxDQVNMOztBQUNBLFNBQUtDLHFCQUFMO0FBQ0gsR0EvYmU7O0FBaWNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRCxFQUFBQSxXQXJjZ0IseUJBcWNGO0FBQ1YsUUFBSSxDQUFDLEtBQUs5RixNQUFMLENBQVlDLEtBQWpCLEVBQXdCLE9BRGQsQ0FHVjs7QUFDQSxTQUFLRCxNQUFMLENBQVlDLEtBQVosQ0FBa0IwRixTQUFsQixHQUE4QixFQUE5QixDQUpVLENBTVY7O0FBQ0EsU0FBS0ssU0FBTDtBQUNILEdBN2NlOztBQStjaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUQsRUFBQUEscUJBbmRnQixtQ0FtZFE7QUFDcEIsUUFBTWxDLGVBQWUsR0FBRyxLQUFLNUMsWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0IsS0FBS0MsWUFBTCxDQUFrQkYsS0FBbEU7QUFDQSwyQkFBbUMsS0FBS1ksVUFBeEM7QUFBQSxRQUFRQyxLQUFSLG9CQUFRQSxLQUFSO0FBQUEsUUFBZUMsTUFBZixvQkFBZUEsTUFBZjtBQUFBLFFBQXVCQyxPQUF2QixvQkFBdUJBLE9BQXZCO0FBQ0EsUUFBTW9DLGNBQWMsR0FBR3RDLEtBQUssR0FBSUUsT0FBTyxHQUFHLENBQTFDLENBSG9CLENBS3BCOztBQUNBLFFBQUkrQixlQUFlLElBQUksQ0FBbkIsSUFBd0JLLGNBQWMsSUFBSSxDQUE5QyxFQUFpRCxPQU43QixDQVFwQjtBQUNBOztBQUNBLFFBQU0rQixLQUFLLEdBQUduRSxPQUFPLEdBQUksQ0FBQyxLQUFLWixhQUFMLENBQW1CSCxLQUFuQixHQUEyQixLQUFLRSxZQUFMLENBQWtCRixLQUE5QyxJQUF1RDhDLGVBQXhELEdBQTJFSyxjQUFuRztBQUNBLFFBQU1nQyxNQUFNLEdBQUdwRSxPQUFPLEdBQUksQ0FBQyxLQUFLWixhQUFMLENBQW1CRixHQUFuQixHQUF5QixLQUFLQyxZQUFMLENBQWtCRixLQUE1QyxJQUFxRDhDLGVBQXRELEdBQXlFSyxjQUFsRztBQUNBLFFBQU1pQyxDQUFDLEdBQUdELE1BQU0sR0FBR0QsS0FBbkIsQ0Fab0IsQ0FjcEI7O0FBQ0EsU0FBSzlGLFFBQUwsQ0FBY0MsYUFBZCxDQUE0QmlGLFlBQTVCLENBQXlDLEdBQXpDLEVBQThDWSxLQUE5QztBQUNBLFNBQUs5RixRQUFMLENBQWNDLGFBQWQsQ0FBNEJpRixZQUE1QixDQUF5QyxPQUF6QyxFQUFrRGxDLElBQUksQ0FBQ0MsR0FBTCxDQUFTLENBQVQsRUFBWStDLENBQVosQ0FBbEQsRUFoQm9CLENBa0JwQjs7QUFDQSxTQUFLaEcsUUFBTCxDQUFjRSxVQUFkLENBQXlCZ0YsWUFBekIsQ0FBc0MsR0FBdEMsRUFBMkNZLEtBQUssR0FBRyxDQUFuRDtBQUNBLFNBQUs5RixRQUFMLENBQWNHLFdBQWQsQ0FBMEIrRSxZQUExQixDQUF1QyxHQUF2QyxFQUE0Q2EsTUFBTSxHQUFHLENBQXJELEVBcEJvQixDQXNCcEI7QUFDQTs7QUFDQSxRQUFNRSxHQUFHLEdBQUdqRCxJQUFJLENBQUNzQixLQUFMLENBQVc0QixJQUFJLENBQUNELEdBQUwsS0FBYSxJQUF4QixDQUFaO0FBQ0EsUUFBTUUsU0FBUyxHQUFHLEVBQWxCOztBQUNBLFFBQUlGLEdBQUcsSUFBSSxLQUFLbkYsWUFBTCxDQUFrQkYsS0FBekIsSUFBa0NxRixHQUFHLElBQUksS0FBS25GLFlBQUwsQ0FBa0JELEdBQWxCLEdBQXdCc0YsU0FBckUsRUFBZ0Y7QUFDNUU7QUFDQSxVQUFNQyxVQUFVLEdBQUdwRCxJQUFJLENBQUN3QixHQUFMLENBQVN5QixHQUFULEVBQWMsS0FBS25GLFlBQUwsQ0FBa0JELEdBQWhDLENBQW5CO0FBQ0EsVUFBTXdGLElBQUksR0FBRzFFLE9BQU8sR0FBSSxDQUFDeUUsVUFBVSxHQUFHLEtBQUt0RixZQUFMLENBQWtCRixLQUFoQyxJQUF5QzhDLGVBQTFDLEdBQTZESyxjQUFwRjtBQUNBLFdBQUsvRCxRQUFMLENBQWNJLE9BQWQsQ0FBc0I4RSxZQUF0QixDQUFtQyxJQUFuQyxFQUF5Q21CLElBQXpDO0FBQ0EsV0FBS3JHLFFBQUwsQ0FBY0ksT0FBZCxDQUFzQjhFLFlBQXRCLENBQW1DLElBQW5DLEVBQXlDbUIsSUFBekM7QUFDQSxXQUFLckcsUUFBTCxDQUFjSSxPQUFkLENBQXNCcUYsS0FBdEIsQ0FBNEJDLE9BQTVCLEdBQXNDLEVBQXRDO0FBQ0gsS0FQRCxNQU9PO0FBQ0gsV0FBSzFGLFFBQUwsQ0FBY0ksT0FBZCxDQUFzQnFGLEtBQXRCLENBQTRCQyxPQUE1QixHQUFzQyxNQUF0QztBQUNILEtBbkNtQixDQXFDcEI7OztBQUNBLFFBQUksS0FBSy9FLFNBQUwsQ0FBZUMsS0FBZixJQUF3QixLQUFLRSxZQUFMLENBQWtCRCxHQUE5QyxFQUFtRDtBQUMvQyxVQUFJeUYsTUFBSjs7QUFDQSxVQUFJLEtBQUszRixTQUFMLENBQWVDLEtBQWYsR0FBdUIsS0FBS0UsWUFBTCxDQUFrQkYsS0FBN0MsRUFBb0Q7QUFDaEQwRixRQUFBQSxNQUFNLEdBQUczRSxPQUFUO0FBQ0gsT0FGRCxNQUVPO0FBQ0gyRSxRQUFBQSxNQUFNLEdBQUczRSxPQUFPLEdBQUksQ0FBQyxLQUFLaEIsU0FBTCxDQUFlQyxLQUFmLEdBQXVCLEtBQUtFLFlBQUwsQ0FBa0JGLEtBQTFDLElBQW1EOEMsZUFBcEQsR0FBdUVLLGNBQTFGO0FBQ0g7O0FBQ0QsV0FBSy9ELFFBQUwsQ0FBY0ssYUFBZCxDQUE0QjZFLFlBQTVCLENBQXlDLElBQXpDLEVBQStDb0IsTUFBL0M7QUFDQSxXQUFLdEcsUUFBTCxDQUFjSyxhQUFkLENBQTRCNkUsWUFBNUIsQ0FBeUMsSUFBekMsRUFBK0NvQixNQUEvQztBQUNBLFdBQUt0RyxRQUFMLENBQWNLLGFBQWQsQ0FBNEJvRixLQUE1QixDQUFrQ0MsT0FBbEMsR0FBNEMsRUFBNUM7QUFDSCxLQVZELE1BVU87QUFDSCxXQUFLMUYsUUFBTCxDQUFjSyxhQUFkLENBQTRCb0YsS0FBNUIsQ0FBa0NDLE9BQWxDLEdBQTRDLE1BQTVDO0FBQ0gsS0FsRG1CLENBb0RwQjs7O0FBQ0EsUUFBSSxLQUFLL0UsU0FBTCxDQUFlRSxHQUFmLElBQXNCLEtBQUtDLFlBQUwsQ0FBa0JGLEtBQTVDLEVBQW1EO0FBQy9DLFVBQUkyRixJQUFKOztBQUNBLFVBQUksS0FBSzVGLFNBQUwsQ0FBZUUsR0FBZixHQUFxQixLQUFLQyxZQUFMLENBQWtCRCxHQUEzQyxFQUFnRDtBQUM1QzBGLFFBQUFBLElBQUksR0FBRzVFLE9BQU8sR0FBR29DLGNBQWpCO0FBQ0gsT0FGRCxNQUVPO0FBQ0h3QyxRQUFBQSxJQUFJLEdBQUc1RSxPQUFPLEdBQUksQ0FBQyxLQUFLaEIsU0FBTCxDQUFlRSxHQUFmLEdBQXFCLEtBQUtDLFlBQUwsQ0FBa0JGLEtBQXhDLElBQWlEOEMsZUFBbEQsR0FBcUVLLGNBQXRGO0FBQ0g7O0FBQ0QsV0FBSy9ELFFBQUwsQ0FBY00sV0FBZCxDQUEwQjRFLFlBQTFCLENBQXVDLElBQXZDLEVBQTZDcUIsSUFBN0M7QUFDQSxXQUFLdkcsUUFBTCxDQUFjTSxXQUFkLENBQTBCNEUsWUFBMUIsQ0FBdUMsSUFBdkMsRUFBNkNxQixJQUE3QztBQUNBLFdBQUt2RyxRQUFMLENBQWNNLFdBQWQsQ0FBMEJtRixLQUExQixDQUFnQ0MsT0FBaEMsR0FBMEMsRUFBMUM7QUFDSCxLQVZELE1BVU87QUFDSCxXQUFLMUYsUUFBTCxDQUFjTSxXQUFkLENBQTBCbUYsS0FBMUIsQ0FBZ0NDLE9BQWhDLEdBQTBDLE1BQTFDO0FBQ0gsS0FqRW1CLENBbUVwQjs7O0FBQ0EsUUFBSSxLQUFLNUUsWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEIsS0FBS0QsU0FBTCxDQUFlQyxLQUE3QyxFQUFvRDtBQUNoRCxVQUFNNEYsYUFBYSxHQUFHN0UsT0FBTyxHQUFJLENBQUMsS0FBS2hCLFNBQUwsQ0FBZUMsS0FBZixHQUF1QixLQUFLRSxZQUFMLENBQWtCRixLQUExQyxJQUFtRDhDLGVBQXBELEdBQXVFSyxjQUF2RztBQUNBLFdBQUsvRCxRQUFMLENBQWNPLGNBQWQsQ0FBNkIyRSxZQUE3QixDQUEwQyxHQUExQyxFQUErQ3ZELE9BQS9DO0FBQ0EsV0FBSzNCLFFBQUwsQ0FBY08sY0FBZCxDQUE2QjJFLFlBQTdCLENBQTBDLE9BQTFDLEVBQW1EbEMsSUFBSSxDQUFDQyxHQUFMLENBQVMsQ0FBVCxFQUFZdUQsYUFBYSxHQUFHN0UsT0FBNUIsQ0FBbkQ7QUFDQSxXQUFLM0IsUUFBTCxDQUFjTyxjQUFkLENBQTZCa0YsS0FBN0IsQ0FBbUNDLE9BQW5DLEdBQTZDLEVBQTdDO0FBQ0gsS0FMRCxNQUtPO0FBQ0gsV0FBSzFGLFFBQUwsQ0FBY08sY0FBZCxDQUE2QmtGLEtBQTdCLENBQW1DQyxPQUFuQyxHQUE2QyxNQUE3QztBQUNILEtBM0VtQixDQTZFcEI7OztBQUNBLFFBQUksS0FBSzVFLFlBQUwsQ0FBa0JELEdBQWxCLEdBQXdCLEtBQUtGLFNBQUwsQ0FBZUUsR0FBM0MsRUFBZ0Q7QUFDNUMsVUFBTTRGLGdCQUFnQixHQUFHOUUsT0FBTyxHQUFJLENBQUMsS0FBS2hCLFNBQUwsQ0FBZUUsR0FBZixHQUFxQixLQUFLQyxZQUFMLENBQWtCRixLQUF4QyxJQUFpRDhDLGVBQWxELEdBQXFFSyxjQUF4RztBQUNBLFdBQUsvRCxRQUFMLENBQWNRLGVBQWQsQ0FBOEIwRSxZQUE5QixDQUEyQyxHQUEzQyxFQUFnRHVCLGdCQUFoRDtBQUNBLFdBQUt6RyxRQUFMLENBQWNRLGVBQWQsQ0FBOEIwRSxZQUE5QixDQUEyQyxPQUEzQyxFQUFvRGxDLElBQUksQ0FBQ0MsR0FBTCxDQUFTLENBQVQsRUFBWXRCLE9BQU8sR0FBR29DLGNBQVYsR0FBMkIwQyxnQkFBdkMsQ0FBcEQ7QUFDQSxXQUFLekcsUUFBTCxDQUFjUSxlQUFkLENBQThCaUYsS0FBOUIsQ0FBb0NDLE9BQXBDLEdBQThDLEVBQTlDO0FBQ0gsS0FMRCxNQUtPO0FBQ0gsV0FBSzFGLFFBQUwsQ0FBY1EsZUFBZCxDQUE4QmlGLEtBQTlCLENBQW9DQyxPQUFwQyxHQUE4QyxNQUE5QztBQUNILEtBckZtQixDQXVGcEI7OztBQUNBLFFBQUksS0FBS3pFLFVBQUwsQ0FBZ0JDLFlBQWhCLElBQWdDLEtBQUtELFVBQUwsQ0FBZ0JJLFFBQXBELEVBQThEO0FBQzFELFVBQU1xRixVQUFVLEdBQUcvRSxPQUFPLEdBQUksQ0FBQyxLQUFLVixVQUFMLENBQWdCSSxRQUFoQixDQUF5QlQsS0FBekIsR0FBaUMsS0FBS0UsWUFBTCxDQUFrQkYsS0FBcEQsSUFBNkQ4QyxlQUE5RCxHQUFpRkssY0FBOUc7QUFDQSxVQUFNNEMsUUFBUSxHQUFHaEYsT0FBTyxHQUFJLENBQUMsS0FBS1YsVUFBTCxDQUFnQkksUUFBaEIsQ0FBeUJSLEdBQXpCLEdBQStCLEtBQUtDLFlBQUwsQ0FBa0JGLEtBQWxELElBQTJEOEMsZUFBNUQsR0FBK0VLLGNBQTFHLENBRjBELENBRzFEOztBQUNBLFVBQU02QyxZQUFZLEdBQUc1RCxJQUFJLENBQUNDLEdBQUwsQ0FBU3RCLE9BQVQsRUFBa0JxQixJQUFJLENBQUN3QixHQUFMLENBQVM3QyxPQUFPLEdBQUdvQyxjQUFuQixFQUFtQzJDLFVBQW5DLENBQWxCLENBQXJCO0FBQ0EsVUFBTUcsVUFBVSxHQUFHN0QsSUFBSSxDQUFDQyxHQUFMLENBQVN0QixPQUFULEVBQWtCcUIsSUFBSSxDQUFDd0IsR0FBTCxDQUFTN0MsT0FBTyxHQUFHb0MsY0FBbkIsRUFBbUM0QyxRQUFuQyxDQUFsQixDQUFuQjtBQUNBLFVBQU1HLFVBQVUsR0FBR0QsVUFBVSxHQUFHRCxZQUFoQzs7QUFFQSxVQUFJRSxVQUFVLEdBQUcsQ0FBakIsRUFBb0I7QUFDaEIsYUFBSzlHLFFBQUwsQ0FBY1MsaUJBQWQsQ0FBZ0N5RSxZQUFoQyxDQUE2QyxHQUE3QyxFQUFrRDBCLFlBQWxEO0FBQ0EsYUFBSzVHLFFBQUwsQ0FBY1MsaUJBQWQsQ0FBZ0N5RSxZQUFoQyxDQUE2QyxPQUE3QyxFQUFzRDRCLFVBQXREO0FBQ0EsYUFBSzlHLFFBQUwsQ0FBY1MsaUJBQWQsQ0FBZ0NnRixLQUFoQyxDQUFzQ0MsT0FBdEMsR0FBZ0QsRUFBaEQ7QUFDSCxPQUpELE1BSU87QUFDSCxhQUFLMUYsUUFBTCxDQUFjUyxpQkFBZCxDQUFnQ2dGLEtBQWhDLENBQXNDQyxPQUF0QyxHQUFnRCxNQUFoRDtBQUNIO0FBQ0osS0FmRCxNQWVPO0FBQ0gsV0FBSzFGLFFBQUwsQ0FBY1MsaUJBQWQsQ0FBZ0NnRixLQUFoQyxDQUFzQ0MsT0FBdEMsR0FBZ0QsTUFBaEQ7QUFDSCxLQXpHbUIsQ0EyR3BCOzs7QUFDQSxRQUFJLEtBQUt6RSxVQUFMLENBQWdCQyxZQUFoQixJQUFnQyxLQUFLRCxVQUFMLENBQWdCSyxTQUFwRCxFQUErRDtBQUMzRCxVQUFNb0YsV0FBVSxHQUFHL0UsT0FBTyxHQUFJLENBQUMsS0FBS1YsVUFBTCxDQUFnQkssU0FBaEIsQ0FBMEJWLEtBQTFCLEdBQWtDLEtBQUtFLFlBQUwsQ0FBa0JGLEtBQXJELElBQThEOEMsZUFBL0QsR0FBa0ZLLGNBQS9HOztBQUNBLFVBQU00QyxTQUFRLEdBQUdoRixPQUFPLEdBQUksQ0FBQyxLQUFLVixVQUFMLENBQWdCSyxTQUFoQixDQUEwQlQsR0FBMUIsR0FBZ0MsS0FBS0MsWUFBTCxDQUFrQkYsS0FBbkQsSUFBNEQ4QyxlQUE3RCxHQUFnRkssY0FBM0csQ0FGMkQsQ0FHM0Q7OztBQUNBLFVBQU02QyxhQUFZLEdBQUc1RCxJQUFJLENBQUNDLEdBQUwsQ0FBU3RCLE9BQVQsRUFBa0JxQixJQUFJLENBQUN3QixHQUFMLENBQVM3QyxPQUFPLEdBQUdvQyxjQUFuQixFQUFtQzJDLFdBQW5DLENBQWxCLENBQXJCOztBQUNBLFVBQU1HLFdBQVUsR0FBRzdELElBQUksQ0FBQ0MsR0FBTCxDQUFTdEIsT0FBVCxFQUFrQnFCLElBQUksQ0FBQ3dCLEdBQUwsQ0FBUzdDLE9BQU8sR0FBR29DLGNBQW5CLEVBQW1DNEMsU0FBbkMsQ0FBbEIsQ0FBbkI7O0FBQ0EsVUFBTUcsV0FBVSxHQUFHRCxXQUFVLEdBQUdELGFBQWhDOztBQUVBLFVBQUlFLFdBQVUsR0FBRyxDQUFqQixFQUFvQjtBQUNoQixhQUFLOUcsUUFBTCxDQUFjVSxrQkFBZCxDQUFpQ3dFLFlBQWpDLENBQThDLEdBQTlDLEVBQW1EMEIsYUFBbkQ7QUFDQSxhQUFLNUcsUUFBTCxDQUFjVSxrQkFBZCxDQUFpQ3dFLFlBQWpDLENBQThDLE9BQTlDLEVBQXVENEIsV0FBdkQ7QUFDQSxhQUFLOUcsUUFBTCxDQUFjVSxrQkFBZCxDQUFpQytFLEtBQWpDLENBQXVDQyxPQUF2QyxHQUFpRCxFQUFqRDtBQUNILE9BSkQsTUFJTztBQUNILGFBQUsxRixRQUFMLENBQWNVLGtCQUFkLENBQWlDK0UsS0FBakMsQ0FBdUNDLE9BQXZDLEdBQWlELE1BQWpEO0FBQ0g7QUFDSixLQWZELE1BZU87QUFDSCxXQUFLMUYsUUFBTCxDQUFjVSxrQkFBZCxDQUFpQytFLEtBQWpDLENBQXVDQyxPQUF2QyxHQUFpRCxNQUFqRDtBQUNIO0FBQ0osR0FqbEJlOztBQW1sQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBdmxCZ0IsdUJBdWxCSjtBQUNSLDRCQUFtQyxLQUFLckUsVUFBeEM7QUFBQSxRQUFRQyxLQUFSLHFCQUFRQSxLQUFSO0FBQUEsUUFBZUMsTUFBZixxQkFBZUEsTUFBZjtBQUFBLFFBQXVCQyxPQUF2QixxQkFBdUJBLE9BQXZCO0FBQ0EsUUFBTW9DLGNBQWMsR0FBR3RDLEtBQUssR0FBSUUsT0FBTyxHQUFHLENBQTFDLENBRlEsQ0FJUjs7QUFDQSxRQUFNK0IsZUFBZSxHQUFHLEtBQUs1QyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QixLQUFLQyxZQUFMLENBQWtCRixLQUFsRSxDQUxRLENBT1I7O0FBQ0EsUUFBSThDLGVBQWUsSUFBSSxDQUF2QixFQUEwQjtBQUN0QnBCLE1BQUFBLE9BQU8sQ0FBQ3lFLElBQVIsQ0FBYSx5RUFBYjtBQUNBO0FBQ0gsS0FYTyxDQWFSOzs7QUFDQSxRQUFNQyxJQUFJLEdBQUcsS0FBS25ELHFCQUFMLENBQTJCSCxlQUEzQixFQUE0Q0ssY0FBNUMsQ0FBYixDQWRRLENBZ0JSOztBQUNBLFFBQU1rRCxZQUFZLEdBQUdqRSxJQUFJLENBQUNzQixLQUFMLENBQVcsS0FBS3hELFlBQUwsQ0FBa0JGLEtBQWxCLEdBQTBCb0csSUFBSSxDQUFDL0MsS0FBMUMsSUFBbUQrQyxJQUFJLENBQUMvQyxLQUE3RSxDQWpCUSxDQW1CUjs7QUFDQSxRQUFNaUQsa0JBQWtCLEdBQUcsSUFBSUMsR0FBSixFQUEzQixDQXBCUSxDQXNCUjs7QUFDQSxRQUFJQyxTQUFTLEdBQUdILFlBQWhCOztBQUNBLFdBQU9HLFNBQVMsSUFBSSxLQUFLdEcsWUFBTCxDQUFrQkQsR0FBdEMsRUFBMkM7QUFDdkMsVUFBSXVHLFNBQVMsSUFBSSxLQUFLdEcsWUFBTCxDQUFrQkYsS0FBbkMsRUFBMEM7QUFDdEM7QUFDQSxZQUFNeUcsQ0FBQyxHQUFHMUYsT0FBTyxHQUFJLENBQUN5RixTQUFTLEdBQUcsS0FBS3RHLFlBQUwsQ0FBa0JGLEtBQS9CLElBQXdDOEMsZUFBekMsR0FBNERLLGNBQWhGO0FBQ0FtRCxRQUFBQSxrQkFBa0IsQ0FBQ0ksR0FBbkIsQ0FBdUJ0RSxJQUFJLENBQUN1RSxLQUFMLENBQVdILFNBQVgsQ0FBdkIsRUFIc0MsQ0FLdEM7O0FBQ0EsYUFBS0ksUUFBTCxDQUFjSCxDQUFkLEVBQWlCM0YsTUFBTSxHQUFHLENBQTFCLEVBQTZCLENBQTdCLEVBQWdDLFNBQWhDLEVBTnNDLENBUXRDOztBQUNBLGFBQUsrRixTQUFMLENBQWVKLENBQWYsRUFBa0IzRixNQUFNLEdBQUcsQ0FBVCxHQUFhLENBQS9CLEVBQWtDLEtBQUtnRyxVQUFMLENBQWdCTixTQUFoQixFQUEyQkosSUFBSSxDQUFDN0MsTUFBaEMsQ0FBbEM7QUFDSDs7QUFDRGlELE1BQUFBLFNBQVMsSUFBSUosSUFBSSxDQUFDL0MsS0FBbEI7QUFDSCxLQXJDTyxDQXVDUjs7O0FBQ0EsUUFBSTBELGNBQWMsR0FBR1YsWUFBckI7QUFDQSxRQUFNVyxTQUFTLEdBQUdaLElBQUksQ0FBQy9DLEtBQUwsR0FBYSxDQUEvQjs7QUFDQSxXQUFPMEQsY0FBYyxJQUFJLEtBQUs3RyxZQUFMLENBQWtCRCxHQUEzQyxFQUFnRDtBQUM1QyxVQUFJOEcsY0FBYyxJQUFJLEtBQUs3RyxZQUFMLENBQWtCRixLQUF4QyxFQUErQztBQUMzQztBQUNBLFlBQU1pSCxxQkFBcUIsR0FBRzdFLElBQUksQ0FBQ3VFLEtBQUwsQ0FBV0ksY0FBWCxDQUE5Qjs7QUFDQSxZQUFJLENBQUNULGtCQUFrQixDQUFDWSxHQUFuQixDQUF1QkQscUJBQXZCLENBQUwsRUFBb0Q7QUFDaEQ7QUFDQSxjQUFNUixFQUFDLEdBQUcxRixPQUFPLEdBQUksQ0FBQ2dHLGNBQWMsR0FBRyxLQUFLN0csWUFBTCxDQUFrQkYsS0FBcEMsSUFBNkM4QyxlQUE5QyxHQUFpRUssY0FBckYsQ0FGZ0QsQ0FHaEQ7OztBQUNBLGVBQUt5RCxRQUFMLENBQWNILEVBQWQsRUFBaUIzRixNQUFNLEdBQUcsQ0FBMUIsRUFBNkIsQ0FBN0IsRUFBZ0MsU0FBaEM7QUFDSDtBQUNKOztBQUNEaUcsTUFBQUEsY0FBYyxJQUFJQyxTQUFsQjtBQUNIO0FBQ0osR0E5b0JlOztBQWdwQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lKLEVBQUFBLFFBdnBCZ0Isb0JBdXBCUEgsQ0F2cEJPLEVBdXBCSlUsQ0F2cEJJLEVBdXBCRHJHLE1BdnBCQyxFQXVwQk9zRyxLQXZwQlAsRUF1cEJjO0FBQzFCLFFBQU1DLElBQUksR0FBRzdGLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQWI7QUFDQWdELElBQUFBLElBQUksQ0FBQy9DLFlBQUwsQ0FBa0IsSUFBbEIsRUFBd0JtQyxDQUF4QjtBQUNBWSxJQUFBQSxJQUFJLENBQUMvQyxZQUFMLENBQWtCLElBQWxCLEVBQXdCNkMsQ0FBeEI7QUFDQUUsSUFBQUEsSUFBSSxDQUFDL0MsWUFBTCxDQUFrQixJQUFsQixFQUF3Qm1DLENBQXhCO0FBQ0FZLElBQUFBLElBQUksQ0FBQy9DLFlBQUwsQ0FBa0IsSUFBbEIsRUFBd0I2QyxDQUFDLEdBQUdyRyxNQUE1QjtBQUNBdUcsSUFBQUEsSUFBSSxDQUFDL0MsWUFBTCxDQUFrQixRQUFsQixFQUE0QjhDLEtBQTVCO0FBQ0FDLElBQUFBLElBQUksQ0FBQy9DLFlBQUwsQ0FBa0IsY0FBbEIsRUFBa0MsR0FBbEM7QUFDQSxTQUFLckYsTUFBTCxDQUFZQyxLQUFaLENBQWtCd0YsV0FBbEIsQ0FBOEIyQyxJQUE5QjtBQUNILEdBaHFCZTs7QUFrcUJoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVIsRUFBQUEsU0F4cUJnQixxQkF3cUJOSixDQXhxQk0sRUF3cUJIVSxDQXhxQkcsRUF3cUJBRyxJQXhxQkEsRUF3cUJNO0FBQ2xCO0FBQ0EsUUFBTUMsSUFBSSxHQUFHLEtBQUtDLFdBQUwsQ0FBaUJGLElBQWpCLENBQWI7QUFDQSxRQUFNdkcsT0FBTyxHQUFHLENBQWhCO0FBRUEsUUFBTTBHLEVBQUUsR0FBR2pHLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQVg7QUFDQW9ELElBQUFBLEVBQUUsQ0FBQ25ELFlBQUgsQ0FBZ0IsR0FBaEIsRUFBcUJtQyxDQUFDLEdBQUljLElBQUksQ0FBQzFHLEtBQUwsR0FBYSxDQUFsQixHQUF1QkUsT0FBNUM7QUFDQTBHLElBQUFBLEVBQUUsQ0FBQ25ELFlBQUgsQ0FBZ0IsR0FBaEIsRUFBcUI2QyxDQUFDLEdBQUdJLElBQUksQ0FBQ3pHLE1BQVQsR0FBa0IsQ0FBdkM7QUFDQTJHLElBQUFBLEVBQUUsQ0FBQ25ELFlBQUgsQ0FBZ0IsT0FBaEIsRUFBeUJpRCxJQUFJLENBQUMxRyxLQUFMLEdBQWNFLE9BQU8sR0FBRyxDQUFqRDtBQUNBMEcsSUFBQUEsRUFBRSxDQUFDbkQsWUFBSCxDQUFnQixRQUFoQixFQUEwQmlELElBQUksQ0FBQ3pHLE1BQS9CO0FBQ0EyRyxJQUFBQSxFQUFFLENBQUNuRCxZQUFILENBQWdCLE1BQWhCLEVBQXdCLFNBQXhCO0FBQ0EsU0FBS3JGLE1BQUwsQ0FBWUMsS0FBWixDQUFrQndGLFdBQWxCLENBQThCK0MsRUFBOUIsRUFYa0IsQ0FhbEI7O0FBQ0EsUUFBTW5FLEtBQUssR0FBRzlCLFFBQVEsQ0FBQzZDLGVBQVQsQ0FBeUIsNEJBQXpCLEVBQXVELE1BQXZELENBQWQ7QUFDQWYsSUFBQUEsS0FBSyxDQUFDZ0IsWUFBTixDQUFtQixHQUFuQixFQUF3Qm1DLENBQXhCO0FBQ0FuRCxJQUFBQSxLQUFLLENBQUNnQixZQUFOLENBQW1CLEdBQW5CLEVBQXdCNkMsQ0FBeEI7QUFDQTdELElBQUFBLEtBQUssQ0FBQ2dCLFlBQU4sQ0FBbUIsYUFBbkIsRUFBa0MsUUFBbEM7QUFDQWhCLElBQUFBLEtBQUssQ0FBQ2dCLFlBQU4sQ0FBbUIsT0FBbkIsRUFBNEIsZ0JBQTVCO0FBQ0FoQixJQUFBQSxLQUFLLENBQUNvRSxXQUFOLEdBQW9CSixJQUFwQjtBQUNBLFNBQUtySSxNQUFMLENBQVlDLEtBQVosQ0FBa0J3RixXQUFsQixDQUE4QnBCLEtBQTlCO0FBQ0gsR0E3ckJlOztBQStyQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWtFLEVBQUFBLFdBcHNCZ0IsdUJBb3NCSkYsSUFwc0JJLEVBb3NCRTtBQUNkO0FBQ0EsUUFBTUssUUFBUSxHQUFHLEVBQWpCLENBRmMsQ0FHZDs7QUFDQSxRQUFNQyxTQUFTLEdBQUdOLElBQUksQ0FBQ08sUUFBTCxDQUFjLEdBQWQsSUFBcUIsR0FBckIsR0FBMkIsQ0FBN0MsQ0FKYyxDQUlrQzs7QUFDaEQsV0FBTztBQUNIaEgsTUFBQUEsS0FBSyxFQUFFeUcsSUFBSSxDQUFDdkQsTUFBTCxHQUFjNkQsU0FEbEI7QUFFSDlHLE1BQUFBLE1BQU0sRUFBRTZHLFFBQVEsR0FBRztBQUZoQixLQUFQO0FBSUgsR0E3c0JlOztBQStzQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJYixFQUFBQSxVQXJ0QmdCLHNCQXF0QkxOLFNBcnRCSyxFQXF0QndCO0FBQUEsUUFBbEJqRCxNQUFrQix1RUFBVCxPQUFTO0FBQ3BDO0FBQ0E7QUFDQSxRQUFNdUUsWUFBWSxHQUFHLENBQUN0QixTQUFTLEdBQUcsS0FBSzdGLG9CQUFsQixJQUEwQyxJQUEvRDtBQUNBLFFBQU1vSCxJQUFJLEdBQUcsSUFBSXpDLElBQUosQ0FBU3dDLFlBQVQsQ0FBYjs7QUFFQSxRQUFJdkUsTUFBTSxLQUFLLE9BQWYsRUFBd0I7QUFDcEI7QUFDQSxVQUFNeUUsS0FBSyxHQUFHQyxNQUFNLENBQUNGLElBQUksQ0FBQ0csV0FBTCxLQUFxQixDQUF0QixDQUFOLENBQStCQyxRQUEvQixDQUF3QyxDQUF4QyxFQUEyQyxHQUEzQyxDQUFkO0FBQ0EsVUFBTUMsR0FBRyxHQUFHSCxNQUFNLENBQUNGLElBQUksQ0FBQ00sVUFBTCxFQUFELENBQU4sQ0FBMEJGLFFBQTFCLENBQW1DLENBQW5DLEVBQXNDLEdBQXRDLENBQVo7QUFDQSx1QkFBVUgsS0FBVixjQUFtQkksR0FBbkI7QUFDSCxLQUxELE1BS08sSUFBSTdFLE1BQU0sS0FBSyxVQUFmLEVBQTJCO0FBQzlCO0FBQ0EsVUFBTStFLEtBQUssR0FBR0wsTUFBTSxDQUFDRixJQUFJLENBQUNRLFdBQUwsRUFBRCxDQUFOLENBQTJCSixRQUEzQixDQUFvQyxDQUFwQyxFQUF1QyxHQUF2QyxDQUFkO0FBQ0EsVUFBTUssT0FBTyxHQUFHUCxNQUFNLENBQUNGLElBQUksQ0FBQ1UsYUFBTCxFQUFELENBQU4sQ0FBNkJOLFFBQTdCLENBQXNDLENBQXRDLEVBQXlDLEdBQXpDLENBQWhCO0FBQ0EsVUFBTU8sT0FBTyxHQUFHVCxNQUFNLENBQUNGLElBQUksQ0FBQ1ksYUFBTCxFQUFELENBQU4sQ0FBNkJSLFFBQTdCLENBQXNDLENBQXRDLEVBQXlDLEdBQXpDLENBQWhCO0FBQ0EsdUJBQVVHLEtBQVYsY0FBbUJFLE9BQW5CLGNBQThCRSxPQUE5QjtBQUNILEtBTk0sTUFNQTtBQUNIO0FBQ0EsVUFBTUosTUFBSyxHQUFHTCxNQUFNLENBQUNGLElBQUksQ0FBQ1EsV0FBTCxFQUFELENBQU4sQ0FBMkJKLFFBQTNCLENBQW9DLENBQXBDLEVBQXVDLEdBQXZDLENBQWQ7O0FBQ0EsVUFBTUssUUFBTyxHQUFHUCxNQUFNLENBQUNGLElBQUksQ0FBQ1UsYUFBTCxFQUFELENBQU4sQ0FBNkJOLFFBQTdCLENBQXNDLENBQXRDLEVBQXlDLEdBQXpDLENBQWhCOztBQUNBLHVCQUFVRyxNQUFWLGNBQW1CRSxRQUFuQjtBQUNIO0FBQ0osR0E1dUJlOztBQTh1QmhCO0FBQ0o7QUFDQTtBQUNJL0YsRUFBQUEsWUFqdkJnQiwwQkFpdkJEO0FBQUE7O0FBQ1g7QUFDQSxTQUFLbUcsZUFBTCxHQUF1QixVQUFDQyxDQUFEO0FBQUEsYUFBTyxNQUFJLENBQUNDLGVBQUwsQ0FBcUJELENBQXJCLENBQVA7QUFBQSxLQUF2Qjs7QUFDQSxTQUFLRSxlQUFMLEdBQXVCLFVBQUNGLENBQUQ7QUFBQSxhQUFPLE1BQUksQ0FBQ0csZUFBTCxDQUFxQkgsQ0FBckIsQ0FBUDtBQUFBLEtBQXZCOztBQUNBLFNBQUtJLGFBQUwsR0FBcUI7QUFBQSxhQUFNLE1BQUksQ0FBQ0MsYUFBTCxFQUFOO0FBQUEsS0FBckI7O0FBQ0EsU0FBS0MsZUFBTCxHQUF1QixVQUFDTixDQUFEO0FBQUEsYUFBTyxNQUFJLENBQUNPLGVBQUwsQ0FBcUJQLENBQXJCLENBQVA7QUFBQSxLQUF2Qjs7QUFFQSxTQUFLN0osR0FBTCxDQUFTNkQsZ0JBQVQsQ0FBMEIsV0FBMUIsRUFBdUMsS0FBSytGLGVBQTVDO0FBQ0FwSCxJQUFBQSxRQUFRLENBQUNxQixnQkFBVCxDQUEwQixXQUExQixFQUF1QyxLQUFLa0csZUFBNUM7QUFDQXZILElBQUFBLFFBQVEsQ0FBQ3FCLGdCQUFULENBQTBCLFNBQTFCLEVBQXFDLEtBQUtvRyxhQUExQyxFQVRXLENBV1g7O0FBQ0EsU0FBS2pLLEdBQUwsQ0FBUzZELGdCQUFULENBQTBCLE9BQTFCLEVBQW1DLEtBQUtzRyxlQUF4QztBQUNILEdBOXZCZTs7QUFnd0JoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQXB3QmdCLDJCQW93QkFQLENBcHdCQSxFQW93Qkc7QUFDZixRQUFNUSxNQUFNLEdBQUdSLENBQUMsQ0FBQ1EsTUFBakI7QUFDQSxRQUFNQyxJQUFJLEdBQUdELE1BQU0sQ0FBQ0UsWUFBUCxDQUFvQixXQUFwQixDQUFiOztBQUVBLFFBQUlELElBQUksS0FBSyxnQkFBVCxJQUE2QixLQUFLakosVUFBTCxDQUFnQkksUUFBakQsRUFBMkQ7QUFDdkQsVUFBSSxLQUFLK0ksb0JBQVQsRUFBK0I7QUFDM0I7QUFDQTtBQUNBLGFBQUtBLG9CQUFMLENBQ0lwSCxJQUFJLENBQUN1RSxLQUFMLENBQVcsS0FBS3RHLFVBQUwsQ0FBZ0JJLFFBQWhCLENBQXlCVCxLQUFwQyxDQURKLEVBRUlvQyxJQUFJLENBQUN1RSxLQUFMLENBQVcsS0FBS3RHLFVBQUwsQ0FBZ0JJLFFBQWhCLENBQXlCUixHQUFwQyxDQUZKLEVBR0ksSUFISixDQUdTO0FBSFQ7QUFLSDtBQUNKLEtBVkQsTUFVTyxJQUFJcUosSUFBSSxLQUFLLGlCQUFULElBQThCLEtBQUtqSixVQUFMLENBQWdCSyxTQUFsRCxFQUE2RDtBQUNoRSxVQUFJLEtBQUs4SSxvQkFBVCxFQUErQjtBQUMzQjtBQUNBO0FBQ0EsYUFBS0Esb0JBQUwsQ0FDSXBILElBQUksQ0FBQ3VFLEtBQUwsQ0FBVyxLQUFLdEcsVUFBTCxDQUFnQkssU0FBaEIsQ0FBMEJWLEtBQXJDLENBREosRUFFSW9DLElBQUksQ0FBQ3VFLEtBQUwsQ0FBVyxLQUFLdEcsVUFBTCxDQUFnQkssU0FBaEIsQ0FBMEJULEdBQXJDLENBRkosRUFHSSxLQUhKLENBR1U7QUFIVjtBQUtIO0FBQ0o7QUFDSixHQTd4QmU7O0FBK3hCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSTZJLEVBQUFBLGVBbnlCZ0IsMkJBbXlCQUQsQ0FueUJBLEVBbXlCRztBQUNmLFFBQU1RLE1BQU0sR0FBR1IsQ0FBQyxDQUFDUSxNQUFqQjtBQUNBLFFBQU1uSSxNQUFNLEdBQUdtSSxNQUFNLENBQUNFLFlBQVAsQ0FBb0IsYUFBcEIsQ0FBZjtBQUVBLFFBQUksQ0FBQ3JJLE1BQUwsRUFBYTtBQUViLFNBQUtGLFFBQUwsQ0FBY0MsTUFBZCxHQUF1QixJQUF2QjtBQUNBLFNBQUtELFFBQUwsQ0FBY0UsTUFBZCxHQUF1QkEsTUFBdkI7QUFDQSxTQUFLRixRQUFMLENBQWNHLE1BQWQsR0FBdUIwSCxDQUFDLENBQUNZLE9BQXpCO0FBQ0EsU0FBS3pJLFFBQUwsQ0FBY0ksa0JBQWQsR0FBbUMsS0FBS2pCLGFBQUwsQ0FBbUJILEtBQXREO0FBQ0EsU0FBS2dCLFFBQUwsQ0FBY0ssZ0JBQWQsR0FBaUMsS0FBS2xCLGFBQUwsQ0FBbUJGLEdBQXBEO0FBRUEsUUFBTXlKLElBQUksR0FBRyxLQUFLM0ssU0FBTCxDQUFlNEsscUJBQWYsRUFBYjtBQUNBLFNBQUszSSxRQUFMLENBQWM0SSxhQUFkLEdBQThCRixJQUFJLENBQUNHLElBQW5DO0FBQ0EsU0FBSzdJLFFBQUwsQ0FBYzhJLGNBQWQsR0FBK0JKLElBQUksQ0FBQzdJLEtBQXBDO0FBRUFnSSxJQUFBQSxDQUFDLENBQUNrQixjQUFGO0FBQ0gsR0FwekJlOztBQXN6QmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lmLEVBQUFBLGVBMXpCZ0IsMkJBMHpCQUgsQ0ExekJBLEVBMHpCRztBQUNmLFFBQUksQ0FBQyxLQUFLN0gsUUFBTCxDQUFjQyxNQUFuQixFQUEyQjtBQUUzQixRQUFNK0ksTUFBTSxHQUFHbkIsQ0FBQyxDQUFDWSxPQUFGLEdBQVksS0FBS3pJLFFBQUwsQ0FBY0csTUFBekM7QUFDQSxRQUFRSixPQUFSLEdBQW9CLEtBQUtILFVBQXpCLENBQVFHLE9BQVI7QUFDQSxRQUFNb0MsY0FBYyxHQUFHLEtBQUtuQyxRQUFMLENBQWM4SSxjQUFkLEdBQWdDL0ksT0FBTyxHQUFHLENBQWpFO0FBQ0EsUUFBTStCLGVBQWUsR0FBRyxLQUFLNUMsWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0IsS0FBS0MsWUFBTCxDQUFrQkYsS0FBbEUsQ0FOZSxDQVFmOztBQUNBLFFBQUk4QyxlQUFlLElBQUksQ0FBbkIsSUFBd0JLLGNBQWMsSUFBSSxDQUE5QyxFQUFpRDtBQUM3Q3pCLE1BQUFBLE9BQU8sQ0FBQ3lFLElBQVIsQ0FBYSw0REFBYjtBQUNBO0FBQ0gsS0FaYyxDQWNmOzs7QUFDQSxRQUFNOEQsU0FBUyxHQUFJRCxNQUFNLEdBQUc3RyxjQUFWLEdBQTRCTCxlQUE5Qzs7QUFFQSxRQUFJLEtBQUs5QixRQUFMLENBQWNFLE1BQWQsS0FBeUIsTUFBN0IsRUFBcUM7QUFDakM7QUFDQSxVQUFJZ0osUUFBUSxHQUFHLEtBQUtsSixRQUFMLENBQWNJLGtCQUFkLEdBQW1DNkksU0FBbEQsQ0FGaUMsQ0FHakM7O0FBQ0FDLE1BQUFBLFFBQVEsR0FBRzlILElBQUksQ0FBQ3dCLEdBQUwsQ0FBU3NHLFFBQVQsRUFBbUIsS0FBSy9KLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCLEVBQTVDLENBQVg7QUFDQSxXQUFLRSxhQUFMLENBQW1CSCxLQUFuQixHQUEyQmtLLFFBQTNCO0FBQ0gsS0FORCxNQU1PLElBQUksS0FBS2xKLFFBQUwsQ0FBY0UsTUFBZCxLQUF5QixPQUE3QixFQUFzQztBQUN6QztBQUNBLFVBQUlpSixNQUFNLEdBQUcsS0FBS25KLFFBQUwsQ0FBY0ssZ0JBQWQsR0FBaUM0SSxTQUE5QyxDQUZ5QyxDQUd6Qzs7QUFDQUUsTUFBQUEsTUFBTSxHQUFHL0gsSUFBSSxDQUFDQyxHQUFMLENBQVM4SCxNQUFULEVBQWlCLEtBQUtoSyxhQUFMLENBQW1CSCxLQUFuQixHQUEyQixFQUE1QyxDQUFUO0FBQ0EsV0FBS0csYUFBTCxDQUFtQkYsR0FBbkIsR0FBeUJrSyxNQUF6QjtBQUNILEtBTk0sTUFNQSxJQUFJLEtBQUtuSixRQUFMLENBQWNFLE1BQWQsS0FBeUIsT0FBN0IsRUFBc0M7QUFDekM7QUFDQSxVQUFJZ0osU0FBUSxHQUFHLEtBQUtsSixRQUFMLENBQWNJLGtCQUFkLEdBQW1DNkksU0FBbEQ7O0FBQ0EsVUFBSUUsT0FBTSxHQUFHLEtBQUtuSixRQUFMLENBQWNLLGdCQUFkLEdBQWlDNEksU0FBOUMsQ0FIeUMsQ0FLekM7OztBQUNBLFdBQUs5SixhQUFMLENBQW1CSCxLQUFuQixHQUEyQmtLLFNBQTNCO0FBQ0EsV0FBSy9KLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCa0ssT0FBekI7QUFDSCxLQXJDYyxDQXVDZjtBQUNBOzs7QUFDQSxTQUFLbkYscUJBQUw7QUFDSCxHQXAyQmU7O0FBczJCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSWtFLEVBQUFBLGFBMTJCZ0IsMkJBMDJCQTtBQUNaLFFBQUksS0FBS2xJLFFBQUwsQ0FBY0MsTUFBbEIsRUFBMEI7QUFDdEIsVUFBTW1KLFdBQVcsR0FBRyxLQUFLcEosUUFBTCxDQUFjRSxNQUFkLEtBQXlCLE1BQXpCLElBQW1DLEtBQUtGLFFBQUwsQ0FBY0UsTUFBZCxLQUF5QixPQUFoRjtBQUNBLFVBQU1tSixXQUFXLEdBQUcsS0FBS3JKLFFBQUwsQ0FBY0UsTUFBZCxLQUF5QixPQUE3QztBQUNBLFVBQU1vSixhQUFhLEdBQUcsS0FBS3RKLFFBQUwsQ0FBY0UsTUFBcEMsQ0FIc0IsQ0FHc0I7O0FBRTVDLFdBQUtGLFFBQUwsQ0FBY0MsTUFBZCxHQUF1QixLQUF2QjtBQUNBLFdBQUtELFFBQUwsQ0FBY0UsTUFBZCxHQUF1QixJQUF2Qjs7QUFFQSxVQUFJa0osV0FBSixFQUFpQjtBQUNiO0FBQ0E7QUFDQSxZQUFNckgsZ0JBQWdCLEdBQUcsS0FBSzVDLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCLEtBQUtFLGFBQUwsQ0FBbUJILEtBQXJFO0FBQ0EsWUFBTXVLLGtCQUFrQixHQUFHeEgsZ0JBQWdCLEdBQUcsQ0FBOUM7QUFDQSxZQUFNeUgsY0FBYyxHQUFHLEtBQUtySyxhQUFMLENBQW1CSCxLQUFuQixHQUE0QitDLGdCQUFnQixHQUFHLENBQXRFLENBTGEsQ0FPYjtBQUNBOztBQUNBLFlBQU0wSCxlQUFlLEdBQUdELGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBL0Q7QUFDQSxZQUFNRyxhQUFhLEdBQUdGLGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBN0Q7QUFFQSxhQUFLckssWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEJ5SyxlQUExQjtBQUNBLGFBQUt2SyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QnlLLGFBQXhCLENBYmEsQ0FlYjtBQUNBO0FBRUE7O0FBQ0EsWUFBSSxPQUFPQyxDQUFQLEtBQWEsV0FBakIsRUFBOEI7QUFDMUJBLFVBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJDLFdBQWpCLENBQTZCLFFBQTdCO0FBQ0g7QUFFSixPQXZCRCxNQXVCTyxJQUFJUCxXQUFKLEVBQWlCO0FBQ3BCO0FBQ0E7QUFDQSxZQUFNRyxlQUFjLEdBQUcsS0FBS3JLLGFBQUwsQ0FBbUJILEtBQW5CLEdBQTRCLENBQUMsS0FBS0csYUFBTCxDQUFtQkYsR0FBbkIsR0FBeUIsS0FBS0UsYUFBTCxDQUFtQkgsS0FBN0MsSUFBc0QsQ0FBekc7O0FBQ0EsWUFBTThDLGVBQWUsR0FBRyxLQUFLNUMsWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0IsS0FBS0MsWUFBTCxDQUFrQkYsS0FBbEUsQ0FKb0IsQ0FNcEI7QUFDQTs7QUFDQSxZQUFNeUssZ0JBQWUsR0FBR0QsZUFBYyxHQUFJMUgsZUFBZSxHQUFHLENBQTVEOztBQUNBLFlBQU00SCxjQUFhLEdBQUdGLGVBQWMsR0FBSTFILGVBQWUsR0FBRyxDQUExRDs7QUFFQSxhQUFLNUMsWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEJ5SyxnQkFBMUI7QUFDQSxhQUFLdkssWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0J5SyxjQUF4QixDQVpvQixDQWNwQjtBQUNBO0FBQ0gsT0EvQ3FCLENBaUR0Qjs7O0FBQ0EsV0FBS2xJLE1BQUwsR0FsRHNCLENBb0R0Qjs7QUFDQSxVQUFJLEtBQUtxSSxhQUFULEVBQXdCO0FBQ3BCLGFBQUtBLGFBQUwsQ0FDSXpJLElBQUksQ0FBQ3VFLEtBQUwsQ0FBVyxLQUFLeEcsYUFBTCxDQUFtQkgsS0FBOUIsQ0FESixFQUVJb0MsSUFBSSxDQUFDdUUsS0FBTCxDQUFXLEtBQUt4RyxhQUFMLENBQW1CRixHQUE5QixDQUZKLEVBR0lxSyxhQUhKO0FBS0g7QUFDSjtBQUNKLEdBeDZCZTs7QUEwNkJoQjtBQUNKO0FBQ0E7QUFDSTNILEVBQUFBLFlBNzZCZ0IsMEJBNjZCRDtBQUNYLFNBQUtILE1BQUw7QUFDSCxHQS82QmU7O0FBaTdCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJc0ksRUFBQUEsV0F0N0JnQix1QkFzN0JKQyxhQXQ3QkksRUFzN0JXO0FBQ3ZCLFFBQU1DLE1BQU0sR0FBR0MsUUFBUSxDQUFDRixhQUFELENBQXZCLENBRHVCLENBR3ZCOztBQUNBLFNBQUs3SyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QixLQUFLRixTQUFMLENBQWVFLEdBQXZDO0FBQ0EsU0FBS0MsWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEJvQyxJQUFJLENBQUNDLEdBQUwsQ0FBUyxLQUFLdEMsU0FBTCxDQUFlRSxHQUFmLEdBQXFCK0ssTUFBOUIsRUFBc0MsS0FBS2pMLFNBQUwsQ0FBZUMsS0FBckQsQ0FBMUIsQ0FMdUIsQ0FPdkI7O0FBQ0EsU0FBS0csYUFBTCxDQUFtQkgsS0FBbkIsR0FBMkIsS0FBS0UsWUFBTCxDQUFrQkYsS0FBN0M7QUFDQSxTQUFLRyxhQUFMLENBQW1CRixHQUFuQixHQUF5QixLQUFLQyxZQUFMLENBQWtCRCxHQUEzQyxDQVR1QixDQVd2Qjs7QUFDQSxTQUFLdUMsTUFBTCxHQVp1QixDQWN2Qjs7QUFDQSxRQUFJLEtBQUtxSSxhQUFULEVBQXdCO0FBQ3BCLFdBQUtBLGFBQUwsQ0FDSXpJLElBQUksQ0FBQ3VFLEtBQUwsQ0FBVyxLQUFLeEcsYUFBTCxDQUFtQkgsS0FBOUIsQ0FESixFQUVJb0MsSUFBSSxDQUFDdUUsS0FBTCxDQUFXLEtBQUt4RyxhQUFMLENBQW1CRixHQUE5QixDQUZKO0FBSUg7QUFDSixHQTM4QmU7O0FBNjhCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJaUwsRUFBQUEsUUFsOUJnQixvQkFrOUJQbEwsS0FsOUJPLEVBazlCQUMsR0FsOUJBLEVBazlCSztBQUNqQixTQUFLRSxhQUFMLENBQW1CSCxLQUFuQixHQUEyQkEsS0FBM0I7QUFDQSxTQUFLRyxhQUFMLENBQW1CRixHQUFuQixHQUF5QkEsR0FBekI7QUFDQSxTQUFLdUMsTUFBTDtBQUNILEdBdDlCZTs7QUF3OUJoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJMkksRUFBQUEsbUJBLzlCZ0IsK0JBKzlCSW5MLEtBLzlCSixFQSs5QldDLEdBLzlCWCxFQSs5QmdCO0FBQzVCO0FBQ0EsUUFBTTRCLFlBQVksR0FBRyxFQUFyQixDQUY0QixDQUVIOztBQUN6QixRQUFJNUIsR0FBRyxHQUFHRCxLQUFOLEdBQWM2QixZQUFsQixFQUFnQztBQUM1QjtBQUNBLFVBQU1HLE1BQU0sR0FBR2hDLEtBQWY7QUFDQUEsTUFBQUEsS0FBSyxHQUFHZ0MsTUFBTSxHQUFJSCxZQUFZLEdBQUcsQ0FBakM7QUFDQTVCLE1BQUFBLEdBQUcsR0FBRytCLE1BQU0sR0FBSUgsWUFBWSxHQUFHLENBQS9CO0FBQ0gsS0FSMkIsQ0FVNUI7OztBQUNBLFNBQUsxQixhQUFMLENBQW1CSCxLQUFuQixHQUEyQkEsS0FBM0I7QUFDQSxTQUFLRyxhQUFMLENBQW1CRixHQUFuQixHQUF5QkEsR0FBekIsQ0FaNEIsQ0FjNUI7O0FBQ0EsUUFBTThDLGdCQUFnQixHQUFHOUMsR0FBRyxHQUFHRCxLQUEvQjtBQUNBLFFBQU11SyxrQkFBa0IsR0FBR3hILGdCQUFnQixHQUFHLENBQTlDO0FBQ0EsUUFBTXlILGNBQWMsR0FBR3hLLEtBQUssR0FBSStDLGdCQUFnQixHQUFHLENBQW5ELENBakI0QixDQW1CNUI7QUFDQTtBQUNBOztBQUNBLFFBQU0wSCxlQUFlLEdBQUdELGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBL0Q7QUFDQSxRQUFNRyxhQUFhLEdBQUdGLGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBN0QsQ0F2QjRCLENBeUI1Qjs7QUFDQSxTQUFLckssWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEJ5SyxlQUExQjtBQUNBLFNBQUt2SyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QnlLLGFBQXhCLENBM0I0QixDQTZCNUI7O0FBQ0EsU0FBS2xJLE1BQUwsR0E5QjRCLENBZ0M1QjtBQUNILEdBaGdDZTs7QUFrZ0NoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTRJLEVBQUFBLHdCQTNnQ2dCLG9DQTJnQ1NDLFdBM2dDVCxFQTJnQ3NCQyxjQTNnQ3RCLEVBMmdDc0NDLFlBM2dDdEMsRUEyZ0MyRTtBQUFBLFFBQXZCQyxhQUF1Qix1RUFBUCxLQUFPO0FBQ3ZGO0FBQ0EsU0FBS3BMLGNBQUwsQ0FBb0JKLEtBQXBCLEdBQTRCc0wsY0FBNUI7QUFDQSxTQUFLbEwsY0FBTCxDQUFvQkgsR0FBcEIsR0FBMEJzTCxZQUExQixDQUh1RixDQUt2Rjs7QUFDQSxTQUFLbEwsVUFBTCxDQUFnQkMsWUFBaEIsR0FBK0IsS0FBL0I7QUFDQSxTQUFLRCxVQUFMLENBQWdCRSxVQUFoQixHQUE2QixDQUE3QjtBQUNBLFNBQUtGLFVBQUwsQ0FBZ0JHLFNBQWhCLEdBQTRCLElBQTVCO0FBQ0EsU0FBS0gsVUFBTCxDQUFnQkksUUFBaEIsR0FBMkIsSUFBM0I7QUFDQSxTQUFLSixVQUFMLENBQWdCSyxTQUFoQixHQUE0QixJQUE1QixDQVZ1RixDQVl2RjtBQUNBOztBQUNBLFFBQUkySyxXQUFXLENBQUNJLFNBQVosSUFBeUIsQ0FBQ0QsYUFBOUIsRUFBNkM7QUFDekMsV0FBS25MLFVBQUwsQ0FBZ0JDLFlBQWhCLEdBQStCLElBQS9CO0FBQ0EsV0FBS0QsVUFBTCxDQUFnQkUsVUFBaEIsR0FBNkI4SyxXQUFXLENBQUNLLFdBQXpDO0FBQ0EsV0FBS3JMLFVBQUwsQ0FBZ0JHLFNBQWhCLEdBQTRCNkssV0FBVyxDQUFDTSxtQkFBWixJQUFtQyxPQUEvRDs7QUFFQSxVQUFJLEtBQUt0TCxVQUFMLENBQWdCRyxTQUFoQixLQUE4QixNQUFsQyxFQUEwQztBQUN0QztBQUNBLFlBQUk2SyxXQUFXLENBQUNyTCxLQUFaLEdBQW9Cc0wsY0FBeEIsRUFBd0M7QUFDcEMsZUFBS2pMLFVBQUwsQ0FBZ0JJLFFBQWhCLEdBQTJCO0FBQ3ZCVCxZQUFBQSxLQUFLLEVBQUVzTCxjQURnQjtBQUV2QnJMLFlBQUFBLEdBQUcsRUFBRW9MLFdBQVcsQ0FBQ3JMO0FBRk0sV0FBM0I7QUFJSDtBQUNKLE9BUkQsTUFRTztBQUNIO0FBQ0EsWUFBSXFMLFdBQVcsQ0FBQ3BMLEdBQVosR0FBa0JzTCxZQUF0QixFQUFvQztBQUNoQyxlQUFLbEwsVUFBTCxDQUFnQkssU0FBaEIsR0FBNEI7QUFDeEJWLFlBQUFBLEtBQUssRUFBRXFMLFdBQVcsQ0FBQ3BMLEdBREs7QUFFeEJBLFlBQUFBLEdBQUcsRUFBRXNMO0FBRm1CLFdBQTVCO0FBSUg7QUFDSjtBQUNKLEtBcENzRixDQXNDdkY7QUFDQTs7O0FBQ0EsUUFBSXZMLEtBQUssR0FBR3FMLFdBQVcsQ0FBQ3JMLEtBQXhCO0FBQ0EsUUFBSUMsR0FBRyxHQUFHb0wsV0FBVyxDQUFDcEwsR0FBdEI7QUFDQSxRQUFNNEIsWUFBWSxHQUFHLEVBQXJCLENBMUN1RixDQTBDOUQ7O0FBRXpCLFFBQUk1QixHQUFHLEdBQUdELEtBQU4sR0FBYzZCLFlBQWxCLEVBQWdDO0FBQzVCLFVBQU1HLE1BQU0sR0FBR2hDLEtBQWY7QUFDQUEsTUFBQUEsS0FBSyxHQUFHZ0MsTUFBTSxHQUFJSCxZQUFZLEdBQUcsQ0FBakM7QUFDQTVCLE1BQUFBLEdBQUcsR0FBRytCLE1BQU0sR0FBSUgsWUFBWSxHQUFHLENBQS9CO0FBQ0gsS0FoRHNGLENBa0R2Rjs7O0FBQ0EsU0FBSzFCLGFBQUwsQ0FBbUJILEtBQW5CLEdBQTJCQSxLQUEzQjtBQUNBLFNBQUtHLGFBQUwsQ0FBbUJGLEdBQW5CLEdBQXlCQSxHQUF6QixDQXBEdUYsQ0FzRHZGOztBQUNBLFFBQU04QyxnQkFBZ0IsR0FBRzlDLEdBQUcsR0FBR0QsS0FBL0I7QUFDQSxRQUFNdUssa0JBQWtCLEdBQUd4SCxnQkFBZ0IsR0FBRyxDQUE5QztBQUNBLFFBQU15SCxjQUFjLEdBQUd4SyxLQUFLLEdBQUkrQyxnQkFBZ0IsR0FBRyxDQUFuRDtBQUNBLFFBQUkwSCxlQUFlLEdBQUdELGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBN0Q7QUFDQSxRQUFJRyxhQUFhLEdBQUdGLGNBQWMsR0FBSUQsa0JBQWtCLEdBQUcsQ0FBM0QsQ0EzRHVGLENBNkR2RjtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxRQUFNcUIsc0JBQXNCLEdBQUcsS0FBSzFMLFlBQUwsQ0FBa0JELEdBQWxCLEdBQXdCLEtBQUtDLFlBQUwsQ0FBa0JGLEtBQXpFOztBQUNBLFFBQUksS0FBS0UsWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0J5SyxhQUF4QixJQUF5QyxLQUFLeEssWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0JBLEdBQXJFLEVBQTBFO0FBQ3RFO0FBQ0E7QUFDQTtBQUNBeUssTUFBQUEsYUFBYSxHQUFHLEtBQUt4SyxZQUFMLENBQWtCRCxHQUFsQztBQUNBd0ssTUFBQUEsZUFBZSxHQUFHLEtBQUt2SyxZQUFMLENBQWtCRixLQUFwQztBQUNIOztBQUVELFNBQUtFLFlBQUwsQ0FBa0JGLEtBQWxCLEdBQTBCeUssZUFBMUI7QUFDQSxTQUFLdkssWUFBTCxDQUFrQkQsR0FBbEIsR0FBd0J5SyxhQUF4QixDQTNFdUYsQ0E2RXZGOztBQUNBLFNBQUtsSSxNQUFMLEdBOUV1RixDQWdGdkY7O0FBQ0EsU0FBS3FKLG9CQUFMO0FBQ0gsR0E3bENlOztBQStsQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLG9CQW5tQ2dCLGtDQW1tQ087QUFDbkI7QUFDQSxRQUFJLE9BQU9sQixDQUFQLEtBQWEsV0FBYixJQUE0QixPQUFPQSxDQUFDLENBQUNtQixFQUFGLENBQUtDLEtBQVosS0FBc0IsV0FBdEQsRUFBbUU7QUFDL0Q7QUFDSDs7QUFFRCxRQUFNQyxhQUFhLEdBQUdDLGVBQWUsQ0FBQ0Msa0JBQWhCLElBQXNDLG1DQUE1RDtBQUNBLFFBQU1DLGdCQUFnQixHQUFHRixlQUFlLENBQUNHLDJCQUFoQixJQUErQyxtREFBeEU7QUFDQSxRQUFNQyxhQUFhLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFLFlBQVo7QUFBMEJDLE1BQUFBLFNBQVMsRUFBRTtBQUFyQyxLQUF0QixDQVJtQixDQVVuQjs7QUFDQSxLQUFDLEtBQUtuTixRQUFMLENBQWNPLGNBQWYsRUFBK0IsS0FBS1AsUUFBTCxDQUFjUSxlQUE3QyxFQUE4RDRNLE9BQTlELENBQXNFLFVBQUNDLEVBQUQsRUFBUTtBQUMxRSxVQUFJQSxFQUFKLEVBQVE7QUFDSjlCLFFBQUFBLENBQUMsQ0FBQzhCLEVBQUQsQ0FBRCxDQUFNVixLQUFOLENBQVksU0FBWixFQUF1QkEsS0FBdkIsaUNBQWtDTSxhQUFsQztBQUFpREssVUFBQUEsT0FBTyxFQUFFVjtBQUExRDtBQUNIO0FBQ0osS0FKRCxFQVhtQixDQWlCbkI7O0FBQ0EsS0FBQyxLQUFLNU0sUUFBTCxDQUFjUyxpQkFBZixFQUFrQyxLQUFLVCxRQUFMLENBQWNVLGtCQUFoRCxFQUFvRTBNLE9BQXBFLENBQTRFLFVBQUNDLEVBQUQsRUFBUTtBQUNoRixVQUFJQSxFQUFKLEVBQVE7QUFDSjlCLFFBQUFBLENBQUMsQ0FBQzhCLEVBQUQsQ0FBRCxDQUFNVixLQUFOLENBQVksU0FBWixFQUF1QkEsS0FBdkIsaUNBQWtDTSxhQUFsQztBQUFpREssVUFBQUEsT0FBTyxFQUFFUDtBQUExRDtBQUNIO0FBQ0osS0FKRDtBQUtILEdBMW5DZTs7QUE0bkNoQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJM0MsRUFBQUEsb0JBbm9DZ0IsZ0NBbW9DS3hKLEtBbm9DTCxFQW1vQ1lDLEdBbm9DWixFQW1vQ2lCME0sVUFub0NqQixFQW1vQzZCLENBQ3pDO0FBQ0gsR0Fyb0NlOztBQXVvQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTlCLEVBQUFBLGFBNW9DZ0IseUJBNG9DRjdLLEtBNW9DRSxFQTRvQ0tDLEdBNW9DTCxFQTRvQ1UsQ0FDdEI7QUFDSCxHQTlvQ2U7O0FBZ3BDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTJNLEVBQUFBLFdBdnBDZ0IsdUJBdXBDSnpDLE1BdnBDSSxFQXVwQ21CO0FBQUEsUUFBZjBDLEtBQWUsdUVBQVAsS0FBTzs7QUFDL0IsUUFBSSxDQUFDQSxLQUFELElBQVUxQyxNQUFNLElBQUksS0FBS2pLLFlBQUwsQ0FBa0JELEdBQTFDLEVBQStDO0FBQzNDLGFBRDJDLENBQ25DO0FBQ1gsS0FIOEIsQ0FLL0I7QUFDQTtBQUNBOzs7QUFDQSxRQUFNNkMsZUFBZSxHQUFHLEtBQUs1QyxZQUFMLENBQWtCRCxHQUFsQixHQUF3QixLQUFLQyxZQUFMLENBQWtCRixLQUFsRTtBQUNBLFNBQUtFLFlBQUwsQ0FBa0JELEdBQWxCLEdBQXdCa0ssTUFBeEI7QUFDQSxTQUFLakssWUFBTCxDQUFrQkYsS0FBbEIsR0FBMEJtSyxNQUFNLEdBQUdySCxlQUFuQyxDQVYrQixDQVkvQjtBQUNBO0FBQ0E7QUFFQTs7QUFDQSxTQUFLTixNQUFMO0FBQ0gsR0F6cUNlOztBQTJxQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXNLLEVBQUFBLGtCQWhyQ2dCLDhCQWdyQ0dDLFNBaHJDSCxFQWdyQ2M7QUFDMUIsUUFBSUEsU0FBUyxHQUFHLEtBQUtoTixTQUFMLENBQWVFLEdBQS9CLEVBQW9DO0FBQ2hDLFdBQUtGLFNBQUwsQ0FBZUUsR0FBZixHQUFxQjhNLFNBQXJCO0FBQ0EsV0FBS3ZLLE1BQUw7QUFDSDtBQUNKLEdBcnJDZTs7QUF1ckNoQjtBQUNKO0FBQ0E7QUFDSXdLLEVBQUFBLE9BMXJDZ0IscUJBMHJDTjtBQUNOO0FBQ0EsUUFBSSxLQUFLakUsZUFBVCxFQUEwQjtBQUN0QnZILE1BQUFBLFFBQVEsQ0FBQ3lMLG1CQUFULENBQTZCLFdBQTdCLEVBQTBDLEtBQUtsRSxlQUEvQztBQUNIOztBQUNELFFBQUksS0FBS0UsYUFBVCxFQUF3QjtBQUNwQnpILE1BQUFBLFFBQVEsQ0FBQ3lMLG1CQUFULENBQTZCLFNBQTdCLEVBQXdDLEtBQUtoRSxhQUE3QztBQUNIOztBQUNELFFBQUksS0FBS3ZHLFlBQVQsRUFBdUI7QUFDbkJFLE1BQUFBLE1BQU0sQ0FBQ3FLLG1CQUFQLENBQTJCLFFBQTNCLEVBQXFDLEtBQUt2SyxZQUExQztBQUNIOztBQUVELFFBQUksS0FBSzNELFNBQVQsRUFBb0I7QUFDaEIsV0FBS0EsU0FBTCxDQUFlNkYsU0FBZixHQUEyQixFQUEzQjtBQUNIOztBQUVELFNBQUs1RixHQUFMLEdBQVcsSUFBWDtBQUNBLFNBQUtDLE1BQUwsQ0FBWUMsS0FBWixHQUFvQixJQUFwQjtBQUNBLFNBQUtELE1BQUwsQ0FBWUUsT0FBWixHQUFzQixJQUF0QjtBQUNIO0FBN3NDZSxDQUFwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogU1ZHIFRpbWVsaW5lIGNvbXBvbmVudCBmb3IgbG9nIG5hdmlnYXRpb25cbiAqIEdyYWZhbmEtc3R5bGUgdGltZWxpbmUgd2l0aCByYW5nZSBzZWxlY3Rpb25cbiAqXG4gKiBAbW9kdWxlIFNWR1RpbWVsaW5lXG4gKi9cbmNvbnN0IFNWR1RpbWVsaW5lID0ge1xuICAgIC8qKlxuICAgICAqIENvbnRhaW5lciBlbGVtZW50XG4gICAgICogQHR5cGUge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIGNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNWRyBlbGVtZW50XG4gICAgICogQHR5cGUge1NWR0VsZW1lbnR9XG4gICAgICovXG4gICAgc3ZnOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU1ZHIGdyb3VwcyBmb3IgbGF5ZXJpbmdcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGxheWVyczoge1xuICAgICAgICB0aWNrczogbnVsbCwgICAgICAvLyBCYWNrZ3JvdW5kIGxheWVyIGZvciB0aWNrcyBhbmQgbGFiZWxzXG4gICAgICAgIGR5bmFtaWM6IG51bGwgICAgIC8vIEZvcmVncm91bmQgbGF5ZXIgZm9yIHNlbGVjdGlvbiwgaGFuZGxlcywgYm91bmRhcmllc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQZXJzaXN0ZW50IGR5bmFtaWMgU1ZHIGVsZW1lbnRzIChmb3IgQ1NTIHRyYW5zaXRpb25zKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZWxlbWVudHM6IHtcbiAgICAgICAgc2VsZWN0aW9uUmVjdDogbnVsbCxcbiAgICAgICAgbGVmdEhhbmRsZTogbnVsbCxcbiAgICAgICAgcmlnaHRIYW5kbGU6IG51bGwsXG4gICAgICAgIG5vd0xpbmU6IG51bGwsXG4gICAgICAgIHN0YXJ0Qm91bmRhcnk6IG51bGwsXG4gICAgICAgIGVuZEJvdW5kYXJ5OiBudWxsLFxuICAgICAgICBub0RhdGFMZWZ0UmVjdDogbnVsbCxcbiAgICAgICAgbm9EYXRhUmlnaHRSZWN0OiBudWxsLFxuICAgICAgICB0cnVuY2F0ZWRMZWZ0UmVjdDogbnVsbCxcbiAgICAgICAgdHJ1bmNhdGVkUmlnaHRSZWN0OiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bGwgYXZhaWxhYmxlIHJhbmdlIChlbnRpcmUgbG9nIGZpbGUpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBmdWxsUmFuZ2U6IHtcbiAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgIGVuZDogbnVsbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBWaXNpYmxlIHJhbmdlIG9uIHRpbWVsaW5lIChjb250cm9sbGVkIGJ5IHBlcmlvZCBidXR0b25zIGFuZCB6b29tKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmlzaWJsZVJhbmdlOiB7XG4gICAgICAgIHN0YXJ0OiBudWxsLFxuICAgICAgICBlbmQ6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VsZWN0ZWQgcmFuZ2UgZm9yIGRhdGEgbG9hZGluZyAoYWx3YXlzIDEvNCBvZiB2aXNpYmxlUmFuZ2UsIGNlbnRlcmVkKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgc2VsZWN0ZWRSYW5nZToge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3RlZCByYW5nZSAod2hhdCB3YXMgc2VudCB0byBzZXJ2ZXIgYmVmb3JlIHRydW5jYXRpb24pXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICByZXF1ZXN0ZWRSYW5nZToge1xuICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgZW5kOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRydW5jYXRpb24gaW5mbyBmcm9tIHNlcnZlciByZXNwb25zZVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdHJ1bmNhdGlvbjoge1xuICAgICAgICB3YXNUcnVuY2F0ZWQ6IGZhbHNlLFxuICAgICAgICBsaW5lc0NvdW50OiAwLFxuICAgICAgICBkaXJlY3Rpb246IG51bGwsICAvLyAnbGVmdCcgb3IgJ3JpZ2h0J1xuICAgICAgICBsZWZ0Wm9uZTogbnVsbCwgICAvLyB7IHN0YXJ0LCBlbmQgfSBpZiBkYXRhIHdhcyB0cnVuY2F0ZWQgZnJvbSBsZWZ0IChsYXRlc3Q9dHJ1ZSlcbiAgICAgICAgcmlnaHRab25lOiBudWxsICAgLy8geyBzdGFydCwgZW5kIH0gaWYgZGF0YSB3YXMgdHJ1bmNhdGVkIGZyb20gcmlnaHQgKGxhdGVzdD1mYWxzZSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VydmVyIHRpbWV6b25lIG9mZnNldCBpbiBzZWNvbmRzXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBzZXJ2ZXJUaW1lem9uZU9mZnNldDogMCxcblxuICAgIC8qKlxuICAgICAqIERpbWVuc2lvbnMgLSBjb21wYWN0IHZlcnNpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGRpbWVuc2lvbnM6IHtcbiAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgIGhlaWdodDogMjQsXG4gICAgICAgIHBhZGRpbmc6IDhcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhZ2dpbmcgc3RhdGVcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGRyYWdnaW5nOiB7XG4gICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgIGhhbmRsZTogbnVsbCwgLy8gJ2xlZnQnLCAncmlnaHQnLCAncmFuZ2UnXG4gICAgICAgIHN0YXJ0WDogMCxcbiAgICAgICAgc3RhcnRTZWxlY3RlZFN0YXJ0OiAwLFxuICAgICAgICBzdGFydFNlbGVjdGVkRW5kOiAwXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBzZWxlY3RvciBvciBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZSAtIEZ1bGwgdGltZSByYW5nZSB3aXRoIHN0YXJ0IGFuZCBlbmQgdGltZXN0YW1wc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoY29udGFpbmVyLCB0aW1lUmFuZ2UpIHtcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSB0eXBlb2YgY29udGFpbmVyID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGNvbnRhaW5lcilcbiAgICAgICAgICAgIDogY29udGFpbmVyO1xuXG4gICAgICAgIGlmICghdGhpcy5jb250YWluZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RpbWVsaW5lIGNvbnRhaW5lciBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRpbWUgcmFuZ2UgLSBtdXN0IGhhdmUgdmFsaWQgbnVtZXJpYyB0aW1lc3RhbXBzXG4gICAgICAgIGlmICh0eXBlb2YgdGltZVJhbmdlLnN0YXJ0ICE9PSAnbnVtYmVyJyB8fCB0eXBlb2YgdGltZVJhbmdlLmVuZCAhPT0gJ251bWJlcicgfHxcbiAgICAgICAgICAgIGlzTmFOKHRpbWVSYW5nZS5zdGFydCkgfHwgaXNOYU4odGltZVJhbmdlLmVuZCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NWR1RpbWVsaW5lOiBJbnZhbGlkIHRpbWUgcmFuZ2UgLSBzdGFydCBhbmQgZW5kIG11c3QgYmUgdmFsaWQgbnVtYmVycycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgZnVsbCByYW5nZSAoZW50aXJlIGxvZyBmaWxlKSAtIE9SSUdJTkFMIHZhbHVlcywgbmV2ZXIgZXhwYW5kZWRcbiAgICAgICAgLy8gZnVsbFJhbmdlIHJlcHJlc2VudHMgYWN0dWFsIGRhdGEgYm91bmRhcmllcyBmb3Igbm8tZGF0YSB6b25lIGNhbGN1bGF0aW9uXG4gICAgICAgIHRoaXMuZnVsbFJhbmdlLnN0YXJ0ID0gdGltZVJhbmdlLnN0YXJ0O1xuICAgICAgICB0aGlzLmZ1bGxSYW5nZS5lbmQgPSB0aW1lUmFuZ2UuZW5kO1xuXG4gICAgICAgIC8vIEZvciBkaXNwbGF5IHB1cnBvc2VzLCBleHBhbmQgcmFuZ2UgaWYgdG9vIHNob3J0IChwcmV2ZW50cyBkaXZpc2lvbiBieSB6ZXJvKVxuICAgICAgICAvLyBCdXQga2VlcCBmdWxsUmFuZ2UgYXMgb3JpZ2luYWwgZm9yIG5vLWRhdGEgem9uZSBkZXRlY3Rpb25cbiAgICAgICAgY29uc3QgTUlOX0RVUkFUSU9OID0gNjA7IC8vIDEgbWludXRlIG1pbmltdW1cbiAgICAgICAgbGV0IGRpc3BsYXlTdGFydCA9IHRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgbGV0IGRpc3BsYXlFbmQgPSB0aW1lUmFuZ2UuZW5kO1xuICAgICAgICBpZiAoZGlzcGxheUVuZCAtIGRpc3BsYXlTdGFydCA8IE1JTl9EVVJBVElPTikge1xuICAgICAgICAgICAgY29uc3QgY2VudGVyID0gZGlzcGxheVN0YXJ0O1xuICAgICAgICAgICAgZGlzcGxheVN0YXJ0ID0gY2VudGVyIC0gKE1JTl9EVVJBVElPTiAvIDIpO1xuICAgICAgICAgICAgZGlzcGxheUVuZCA9IGNlbnRlciArIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGltZW5zaW9ucy53aWR0aCA9IHRoaXMuY29udGFpbmVyLm9mZnNldFdpZHRoO1xuXG4gICAgICAgIC8vIERldGVybWluZSBpbml0aWFsIHZpc2libGUgcmFuZ2UgYmFzZWQgb24gZGlzcGxheSBkdXJhdGlvbiAoZXhwYW5kZWQgZm9yIHNob3J0IGxvZ3MpXG4gICAgICAgIGNvbnN0IHRvdGFsRHVyYXRpb24gPSBkaXNwbGF5RW5kIC0gZGlzcGxheVN0YXJ0O1xuICAgICAgICBsZXQgaW5pdGlhbFZpc2libGVEdXJhdGlvbjtcblxuICAgICAgICBpZiAodG90YWxEdXJhdGlvbiA+IDg2NDAwICogNykge1xuICAgICAgICAgICAgLy8gSWYgbG9ncyBzcGFuIG1vcmUgdGhhbiA3IGRheXMsIHNob3cgbGFzdCAyNCBob3VycyBhcyB2aXNpYmxlXG4gICAgICAgICAgICBpbml0aWFsVmlzaWJsZUR1cmF0aW9uID0gODY0MDA7IC8vIDI0IGhvdXJzXG4gICAgICAgIH0gZWxzZSBpZiAodG90YWxEdXJhdGlvbiA+IDg2NDAwKSB7XG4gICAgICAgICAgICAvLyBJZiBsb2dzIHNwYW4gMS03IGRheXMsIHNob3cgbGFzdCAxMiBob3Vyc1xuICAgICAgICAgICAgaW5pdGlhbFZpc2libGVEdXJhdGlvbiA9IDQzMjAwOyAvLyAxMiBob3Vyc1xuICAgICAgICB9IGVsc2UgaWYgKHRvdGFsRHVyYXRpb24gPiAzNjAwICogNikge1xuICAgICAgICAgICAgLy8gSWYgbG9ncyBzcGFuIDYtMjQgaG91cnMsIHNob3cgbGFzdCA2IGhvdXJzXG4gICAgICAgICAgICBpbml0aWFsVmlzaWJsZUR1cmF0aW9uID0gMjE2MDA7IC8vIDYgaG91cnNcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBzaG9ydGVyIGxvZ3MsIHNob3cgZW50aXJlIHJhbmdlXG4gICAgICAgICAgICBpbml0aWFsVmlzaWJsZUR1cmF0aW9uID0gdG90YWxEdXJhdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB2aXNpYmxlIHJhbmdlICh3aGF0IHVzZXIgc2VlcyBvbiB0aW1lbGluZSkgLSB1c2UgZXhwYW5kZWQgZGlzcGxheSByYW5nZVxuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBkaXNwbGF5RW5kO1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IE1hdGgubWF4KGRpc3BsYXlFbmQgLSBpbml0aWFsVmlzaWJsZUR1cmF0aW9uLCBkaXNwbGF5U3RhcnQpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBzZWxlY3RlZCByYW5nZSBhcyAxLzQgb2YgdmlzaWJsZSByYW5nZSwgY2VudGVyZWRcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBTVkcgc3RydWN0dXJlXG4gICAgICAgIHRoaXMuY3JlYXRlU1ZHKCk7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIHRoaXMuYXR0YWNoRXZlbnRzKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHdpbmRvdyByZXNpemUgKHN0b3JlZCBmb3IgY2xlYW51cCBpbiBkZXN0cm95KCkpXG4gICAgICAgIHRoaXMuX2JvdW5kUmVzaXplID0gKCkgPT4gdGhpcy5oYW5kbGVSZXNpemUoKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX2JvdW5kUmVzaXplKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGNlbnRlcmVkIHNlbGVjdGlvbiAoMS80IG9mIHZpc2libGUgcmFuZ2UsIHBvc2l0aW9uZWQgYXQgY2VudGVyKVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZUNlbnRlcmVkU2VsZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWREdXJhdGlvbiA9IHZpc2libGVEdXJhdGlvbiAvIDQ7XG4gICAgICAgIGNvbnN0IHZpc2libGVDZW50ZXIgPSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCArICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQgPSB2aXNpYmxlQ2VudGVyIC0gKHNlbGVjdGVkRHVyYXRpb24gLyAyKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHZpc2libGVDZW50ZXIgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIEVuc3VyZSBzZWxlY3RlZCByYW5nZSBzdGF5cyB3aXRoaW4gdmlzaWJsZSByYW5nZVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0IDwgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ICsgc2VsZWN0ZWREdXJhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA+IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZDtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHNlbGVjdGVkRHVyYXRpb247XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGFkYXB0aXZlIHRpbWUgc3RlcCBiYXNlZCBvbiByYW5nZSBkdXJhdGlvbiBhbmQgYXZhaWxhYmxlIHdpZHRoXG4gICAgICogRW5zdXJlcyBsYWJlbHMgYXJlIG5vdCBjbG9zZXIgdGhhbiAyY20gKH43NXB4IGF0IHN0YW5kYXJkIERQSSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiAtIER1cmF0aW9uIGluIHNlY29uZHNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXZhaWxhYmxlV2lkdGggLSBBdmFpbGFibGUgd2lkdGggaW4gcGl4ZWxzXG4gICAgICogQHJldHVybnMge29iamVjdH0gU3RlcCBjb25maWd1cmF0aW9uIHt2YWx1ZSwgbGFiZWwsIGZvcm1hdH1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVBZGFwdGl2ZVN0ZXAoZHVyYXRpb24sIGF2YWlsYWJsZVdpZHRoKSB7XG4gICAgICAgIC8vIFRpbWUgc3RlcHMgaW4gc2Vjb25kcyB3aXRoIGxhYmVscyAoZnJvbSBzbWFsbGVzdCB0byBsYXJnZXN0KVxuICAgICAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6IDEsIGxhYmVsOiAnMSBzZWMnLCBmb3JtYXQ6ICdISDpNTTpTUycgfSwgICAgICAgIC8vIDEgc2Vjb25kXG4gICAgICAgICAgICB7IHZhbHVlOiA1LCBsYWJlbDogJzUgc2VjJywgZm9ybWF0OiAnSEg6TU06U1MnIH0sICAgICAgICAvLyA1IHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDEwLCBsYWJlbDogJzEwIHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgIC8vIDEwIHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDMwLCBsYWJlbDogJzMwIHNlYycsIGZvcm1hdDogJ0hIOk1NOlNTJyB9LCAgICAgIC8vIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwLCBsYWJlbDogJzEgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgICAgIC8vIDEgbWludXRlXG4gICAgICAgICAgICB7IHZhbHVlOiAzMDAsIGxhYmVsOiAnNSBtaW4nLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgICAgICAvLyA1IG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwMCwgbGFiZWw6ICcxMCBtaW4nLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgICAgIC8vIDEwIG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDE4MDAsIGxhYmVsOiAnMzAgbWluJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgIC8vIDMwIG1pbnV0ZXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDM2MDAsIGxhYmVsOiAnMSBob3VyJywgZm9ybWF0OiAnSEg6TU0nIH0sICAgICAgIC8vIDEgaG91clxuICAgICAgICAgICAgeyB2YWx1ZTogMTA4MDAsIGxhYmVsOiAnMyBob3VycycsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgLy8gMyBob3Vyc1xuICAgICAgICAgICAgeyB2YWx1ZTogMjE2MDAsIGxhYmVsOiAnNiBob3VycycsIGZvcm1hdDogJ0hIOk1NJyB9LCAgICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgeyB2YWx1ZTogNDMyMDAsIGxhYmVsOiAnMTIgaG91cnMnLCBmb3JtYXQ6ICdISDpNTScgfSwgICAgLy8gMTIgaG91cnNcbiAgICAgICAgICAgIHsgdmFsdWU6IDg2NDAwLCBsYWJlbDogJzEgZGF5JywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAgIC8vIDEgZGF5XG4gICAgICAgICAgICB7IHZhbHVlOiAyNTkyMDAsIGxhYmVsOiAnMyBkYXlzJywgZm9ybWF0OiAnTU0tREQnIH0sICAgICAvLyAzIGRheXNcbiAgICAgICAgICAgIHsgdmFsdWU6IDYwNDgwMCwgbGFiZWw6ICcxIHdlZWsnLCBmb3JtYXQ6ICdNTS1ERCcgfSwgICAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgeyB2YWx1ZTogMjU5MjAwMCwgbGFiZWw6ICcxIG1vbnRoJywgZm9ybWF0OiAnTU0tREQnIH0gICAgLy8gMzAgZGF5c1xuICAgICAgICBdO1xuXG4gICAgICAgIC8vIE1pbmltdW0gc3BhY2luZyBiZXR3ZWVuIGxhYmVsczogMmNtIOKJiCA3NXB4IChhdCA5NiBEUEkpXG4gICAgICAgIC8vIFVzaW5nIDgwcHggdG8gYmUgc2FmZSBhbmQgYWNjb3VudCBmb3IgbGFiZWwgd2lkdGhcbiAgICAgICAgY29uc3QgbWluU3BhY2luZ1B4ID0gODA7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG1heGltdW0gbnVtYmVyIG9mIGxhYmVscyB0aGF0IGZpdCB3aXRoIG1pbmltdW0gc3BhY2luZ1xuICAgICAgICBjb25zdCBtYXhMYWJlbHMgPSBNYXRoLmZsb29yKGF2YWlsYWJsZVdpZHRoIC8gbWluU3BhY2luZ1B4KTtcblxuICAgICAgICAvLyBFbnN1cmUgYXQgbGVhc3QgMiBsYWJlbHMsIGJ1dCBub3QgbW9yZSB0aGFuIGF2YWlsYWJsZSBzcGFjZSBhbGxvd3NcbiAgICAgICAgY29uc3QgdGFyZ2V0TWluTGFiZWxzID0gTWF0aC5tYXgoMiwgTWF0aC5taW4oNCwgbWF4TGFiZWxzKSk7XG4gICAgICAgIGNvbnN0IHRhcmdldE1heExhYmVscyA9IE1hdGgubWF4KHRhcmdldE1pbkxhYmVscywgbWF4TGFiZWxzKTtcblxuICAgICAgICAvLyBGaW5kIHN0ZXAgdGhhdCBwcm9kdWNlcyBhcHByb3ByaWF0ZSBudW1iZXIgb2YgbGFiZWxzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG51bUxhYmVscyA9IE1hdGguZmxvb3IoZHVyYXRpb24gLyBzdGVwc1tpXS52YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgc3RlcCBwcm9kdWNlcyBhY2NlcHRhYmxlIG51bWJlciBvZiBsYWJlbHNcbiAgICAgICAgICAgIGlmIChudW1MYWJlbHMgPj0gdGFyZ2V0TWluTGFiZWxzICYmIG51bUxhYmVscyA8PSB0YXJnZXRNYXhMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RlcHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBubyBwZXJmZWN0IG1hdGNoLCBmaW5kIGNsb3Nlc3QgbWF0Y2hcbiAgICAgICAgbGV0IGJlc3RTdGVwID0gc3RlcHNbMF07XG4gICAgICAgIGxldCBiZXN0RGlmZiA9IEluZmluaXR5O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG51bUxhYmVscyA9IE1hdGguZmxvb3IoZHVyYXRpb24gLyBzdGVwc1tpXS52YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIEZvciB2ZXJ5IHNob3J0IGR1cmF0aW9ucywgcHJlZmVyIHN0ZXAgdGhhdCBwcm9kdWNlcyBhdCBsZWFzdCAyIGxhYmVsc1xuICAgICAgICAgICAgaWYgKGR1cmF0aW9uIDwgc3RlcHNbMF0udmFsdWUgKiB0YXJnZXRNaW5MYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVtTGFiZWxzID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ZXBzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGRpZmZlcmVuY2UgZnJvbSBpZGVhbCByYW5nZVxuICAgICAgICAgICAgbGV0IGRpZmY7XG4gICAgICAgICAgICBpZiAobnVtTGFiZWxzIDwgdGFyZ2V0TWluTGFiZWxzKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9ICh0YXJnZXRNaW5MYWJlbHMgLSBudW1MYWJlbHMpICogMjsgLy8gUGVuYWxpemUgdG9vIGZldyBsYWJlbHMgbW9yZVxuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1MYWJlbHMgPiB0YXJnZXRNYXhMYWJlbHMpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gbnVtTGFiZWxzIC0gdGFyZ2V0TWF4TGFiZWxzOyAvLyBQZW5hbGl6ZSB0b28gbWFueSBsYWJlbHNcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IDA7IC8vIFdpdGhpbiBhY2NlcHRhYmxlIHJhbmdlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaWZmIDwgYmVzdERpZmYpIHtcbiAgICAgICAgICAgICAgICBiZXN0RGlmZiA9IGRpZmY7XG4gICAgICAgICAgICAgICAgYmVzdFN0ZXAgPSBzdGVwc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBiZXN0U3RlcDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFNWRyBlbGVtZW50IHdpdGggcGVyc2lzdGVudCBkeW5hbWljIGVsZW1lbnRzXG4gICAgICovXG4gICAgY3JlYXRlU1ZHKCkge1xuICAgICAgICBjb25zdCBzdmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1zdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB0aGlzLmRpbWVuc2lvbnMuaGVpZ2h0KTtcblxuICAgICAgICAvLyBDcmVhdGUgZGVmcyBmb3IgcGF0dGVybnNcbiAgICAgICAgY29uc3QgZGVmcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnZGVmcycpO1xuXG4gICAgICAgIC8vIERpYWdvbmFsIHN0cmlwZXMgcGF0dGVybiBmb3IgXCJubyBkYXRhXCIgem9uZXNcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncGF0dGVybicpO1xuICAgICAgICBwYXR0ZXJuLnNldEF0dHJpYnV0ZSgnaWQnLCAndGltZWxpbmUtbm8tZGF0YS1wYXR0ZXJuJyk7XG4gICAgICAgIHBhdHRlcm4uc2V0QXR0cmlidXRlKCdwYXR0ZXJuVW5pdHMnLCAndXNlclNwYWNlT25Vc2UnKTtcbiAgICAgICAgcGF0dGVybi5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzgnKTtcbiAgICAgICAgcGF0dGVybi5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsICc4Jyk7XG4gICAgICAgIHBhdHRlcm4uc2V0QXR0cmlidXRlKCdwYXR0ZXJuVHJhbnNmb3JtJywgJ3JvdGF0ZSg0NSknKTtcblxuICAgICAgICBjb25zdCBwYXR0ZXJuUmVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICBwYXR0ZXJuUmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzQnKTtcbiAgICAgICAgcGF0dGVyblJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnOCcpO1xuICAgICAgICBwYXR0ZXJuUmVjdC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAncmdiYSgwLCAwLCAwLCAwLjA4KScpO1xuXG4gICAgICAgIHBhdHRlcm4uYXBwZW5kQ2hpbGQocGF0dGVyblJlY3QpO1xuICAgICAgICBkZWZzLmFwcGVuZENoaWxkKHBhdHRlcm4pO1xuICAgICAgICBzdmcuYXBwZW5kQ2hpbGQoZGVmcyk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGxheWVyIGdyb3VwcyBmb3IgcHJvcGVyIHotb3JkZXJpbmdcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2cnKTtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3Muc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS10aWNrcy1sYXllcicpO1xuXG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2cnKTtcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWR5bmFtaWMtbGF5ZXInKTtcblxuICAgICAgICBzdmcuYXBwZW5kQ2hpbGQodGhpcy5sYXllcnMudGlja3MpO1xuICAgICAgICBzdmcuYXBwZW5kQ2hpbGQodGhpcy5sYXllcnMuZHluYW1pYyk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHBlcnNpc3RlbnQgZHluYW1pYyBlbGVtZW50cyAoZm9yIENTUyB0cmFuc2l0aW9ucylcbiAgICAgICAgdGhpcy5jcmVhdGVEeW5hbWljRWxlbWVudHMoKTtcblxuICAgICAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQoc3ZnKTtcbiAgICAgICAgdGhpcy5zdmcgPSBzdmc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwZXJzaXN0ZW50IGR5bmFtaWMgU1ZHIGVsZW1lbnRzIG9uY2VcbiAgICAgKiBUaGVzZSBlbGVtZW50cyBhcmUgdXBkYXRlZCB2aWEgc2V0QXR0cmlidXRlIGZvciBzbW9vdGggQ1NTIHRyYW5zaXRpb25zXG4gICAgICovXG4gICAgY3JlYXRlRHluYW1pY0VsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCB7IGhlaWdodCB9ID0gdGhpcy5kaW1lbnNpb25zO1xuXG4gICAgICAgIC8vIE5vIGRhdGEgem9uZSAtIGxlZnQgKGJleW9uZCBmdWxsUmFuZ2Uuc3RhcnQpXG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdC5zZXRBdHRyaWJ1dGUoJ3knLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1uby1kYXRhJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0KTtcblxuICAgICAgICAvLyBObyBkYXRhIHpvbmUgLSByaWdodCAoYmV5b25kIGZ1bGxSYW5nZS5lbmQpXG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtbm8tZGF0YScpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0KTtcblxuICAgICAgICAvLyBUcnVuY2F0ZWQgem9uZSAtIGxlZnQgKGRhdGEgY3V0IGJ5IDUwMDAgbGluZSBsaW1pdCB3aGVuIGxhdGVzdD10cnVlKVxuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndGltZWxpbmUtdHJ1bmNhdGVkJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc2V0QXR0cmlidXRlKCdkYXRhLXpvbmUnLCAndHJ1bmNhdGVkLWxlZnQnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3QpO1xuXG4gICAgICAgIC8vIFRydW5jYXRlZCB6b25lIC0gcmlnaHQgKGRhdGEgY3V0IGJ5IDUwMDAgbGluZSBsaW1pdCB3aGVuIGxhdGVzdD1mYWxzZSlcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS10cnVuY2F0ZWQnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3Quc2V0QXR0cmlidXRlKCdkYXRhLXpvbmUnLCAndHJ1bmNhdGVkLXJpZ2h0Jyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy50cnVuY2F0ZWRSaWdodFJlY3QpO1xuXG4gICAgICAgIC8vIFwiTm93XCIgbGluZVxuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vd0xpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lLnNldEF0dHJpYnV0ZSgneTEnLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lLnNldEF0dHJpYnV0ZSgneTInLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLm5vd0xpbmUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1ub3cnKTtcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLm5vd0xpbmUpO1xuXG4gICAgICAgIC8vIFN0YXJ0IGJvdW5kYXJ5IChsZWZ0IHJlZCBsaW5lKVxuICAgICAgICB0aGlzLmVsZW1lbnRzLnN0YXJ0Qm91bmRhcnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneTEnLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneTInLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnN0YXJ0Qm91bmRhcnkuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1ib3VuZGFyeScpO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeSk7XG5cbiAgICAgICAgLy8gRW5kIGJvdW5kYXJ5IChyaWdodCByZWQgbGluZSlcbiAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnbGluZScpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmVuZEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneTEnLCAwKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3kyJywgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWJvdW5kYXJ5Jyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeSk7XG5cbiAgICAgICAgLy8gU2VsZWN0aW9uIHJlY3RhbmdsZVxuICAgICAgICB0aGlzLmVsZW1lbnRzLnNlbGVjdGlvblJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnNlbGVjdGlvblJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnNlbGVjdGlvblJlY3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1zZWxlY3Rpb24nKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgnZGF0YS1oYW5kbGUnLCAncmFuZ2UnKTtcbiAgICAgICAgdGhpcy5sYXllcnMuZHluYW1pYy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnRzLnNlbGVjdGlvblJlY3QpO1xuXG4gICAgICAgIC8vIExlZnQgaGFuZGxlXG4gICAgICAgIHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUuc2V0QXR0cmlidXRlKCd5JywgMCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgNik7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubGVmdEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWhhbmRsZScpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmxlZnRIYW5kbGUuc2V0QXR0cmlidXRlKCdkYXRhLWhhbmRsZScsICdsZWZ0Jyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5sZWZ0SGFuZGxlKTtcblxuICAgICAgICAvLyBSaWdodCBoYW5kbGVcbiAgICAgICAgdGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnJpZ2h0SGFuZGxlLnNldEF0dHJpYnV0ZSgneScsIDApO1xuICAgICAgICB0aGlzLmVsZW1lbnRzLnJpZ2h0SGFuZGxlLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCA2KTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0aW1lbGluZS1oYW5kbGUnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJywgJ3JpZ2h0Jyk7XG4gICAgICAgIHRoaXMubGF5ZXJzLmR5bmFtaWMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50cy5yaWdodEhhbmRsZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bGwgcmVuZGVyIC0gcmVkcmF3cyB0aWNrcyBhbmQgdXBkYXRlcyBkeW5hbWljIGVsZW1lbnRzXG4gICAgICogQ2FsbGVkIHdoZW4gdmlzaWJsZVJhbmdlIGNoYW5nZXMgKHBlcmlvZCBidXR0b25zLCByZXNpemUsIG1vdXNlVXApXG4gICAgICovXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuc3ZnKSByZXR1cm47XG5cbiAgICAgICAgLy8gVXBkYXRlIHdpZHRoXG4gICAgICAgIHRoaXMuZGltZW5zaW9ucy53aWR0aCA9IHRoaXMuY29udGFpbmVyLm9mZnNldFdpZHRoO1xuXG4gICAgICAgIC8vIFJlZHJhdyB0aWNrcyBhbmQgbGFiZWxzICh0aGV5IGRlcGVuZCBvbiB2aXNpYmxlUmFuZ2UpXG4gICAgICAgIHRoaXMucmVuZGVyVGlja3MoKTtcblxuICAgICAgICAvLyBVcGRhdGUgZHluYW1pYyBlbGVtZW50cyBwb3NpdGlvbnMgKHdpdGggQ1NTIHRyYW5zaXRpb25zKVxuICAgICAgICB0aGlzLnVwZGF0ZUR5bmFtaWNFbGVtZW50cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgb25seSB0aWNrcyBhbmQgbGFiZWxzIChiYWNrZ3JvdW5kIGxheWVyKVxuICAgICAqIENhbGxlZCB3aGVuIHZpc2libGVSYW5nZSBjaGFuZ2VzXG4gICAgICovXG4gICAgcmVuZGVyVGlja3MoKSB7XG4gICAgICAgIGlmICghdGhpcy5sYXllcnMudGlja3MpIHJldHVybjtcblxuICAgICAgICAvLyBDbGVhciBvbmx5IHRpY2tzIGxheWVyXG4gICAgICAgIHRoaXMubGF5ZXJzLnRpY2tzLmlubmVySFRNTCA9ICcnO1xuXG4gICAgICAgIC8vIERyYXcgdGlja3MgYW5kIGxhYmVsc1xuICAgICAgICB0aGlzLmRyYXdUaWNrcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZHluYW1pYyBlbGVtZW50cyBwb3NpdGlvbnMgdmlhIHNldEF0dHJpYnV0ZVxuICAgICAqIENhbGxlZCBkdXJpbmcgZHJhZyBmb3Igc21vb3RoIENTUyB0cmFuc2l0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUR5bmFtaWNFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgdmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gKHBhZGRpbmcgKiAyKTtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2tcbiAgICAgICAgaWYgKHZpc2libGVEdXJhdGlvbiA8PSAwIHx8IGF2YWlsYWJsZVdpZHRoIDw9IDApIHJldHVybjtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgcG9zaXRpb25zIGluZGVwZW5kZW50bHkgZm9yIGVhY2ggZWRnZVxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIHZpc3VhbCBhcnRpZmFjdHMgd2hlbiByZXNpemluZyBmcm9tIG9uZSBzaWRlXG4gICAgICAgIGNvbnN0IGxlZnRYID0gcGFkZGluZyArICgodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0IC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICBjb25zdCByaWdodFggPSBwYWRkaW5nICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICBjb25zdCB3ID0gcmlnaHRYIC0gbGVmdFg7XG5cbiAgICAgICAgLy8gVXBkYXRlIHNlbGVjdGlvbiByZWN0YW5nbGVcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgneCcsIGxlZnRYKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5zZWxlY3Rpb25SZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBNYXRoLm1heCgwLCB3KSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGhhbmRsZXMgLSBwb3NpdGlvbmVkIGluZGVwZW5kZW50bHlcbiAgICAgICAgdGhpcy5lbGVtZW50cy5sZWZ0SGFuZGxlLnNldEF0dHJpYnV0ZSgneCcsIGxlZnRYIC0gMyk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMucmlnaHRIYW5kbGUuc2V0QXR0cmlidXRlKCd4JywgcmlnaHRYIC0gMyk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFwiTm93XCIgbGluZVxuICAgICAgICAvLyBBZGQgNjBzIGJ1ZmZlciB0byBwcmV2ZW50IGhpZGluZyB3aGVuIHRpbWUgc2xpZ2h0bHkgZXhjZWVkcyB2aXNpYmxlUmFuZ2UuZW5kXG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBub3dCdWZmZXIgPSA2MDtcbiAgICAgICAgaWYgKG5vdyA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCAmJiBub3cgPD0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kICsgbm93QnVmZmVyKSB7XG4gICAgICAgICAgICAvLyBDbGFtcCBub3dYIHRvIHZpc2libGUgYXJlYSAoZG9uJ3QgZHJhdyBiZXlvbmQgcmlnaHQgZWRnZSlcbiAgICAgICAgICAgIGNvbnN0IGNsYW1wZWROb3cgPSBNYXRoLm1pbihub3csIHRoaXMudmlzaWJsZVJhbmdlLmVuZCk7XG4gICAgICAgICAgICBjb25zdCBub3dYID0gcGFkZGluZyArICgoY2xhbXBlZE5vdyAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm93TGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgbm93WCk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vd0xpbmUuc2V0QXR0cmlidXRlKCd4MicsIG5vd1gpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub3dMaW5lLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm93TGluZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YXJ0IGJvdW5kYXJ5XG4gICAgICAgIGlmICh0aGlzLmZ1bGxSYW5nZS5zdGFydCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIGxldCB4U3RhcnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5mdWxsUmFuZ2Uuc3RhcnQgPCB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgIHhTdGFydCA9IHBhZGRpbmc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHhTdGFydCA9IHBhZGRpbmcgKyAoKHRoaXMuZnVsbFJhbmdlLnN0YXJ0IC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneDEnLCB4U3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneDInLCB4U3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5zdGFydEJvdW5kYXJ5LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuc3RhcnRCb3VuZGFyeS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGVuZCBib3VuZGFyeVxuICAgICAgICBpZiAodGhpcy5mdWxsUmFuZ2UuZW5kID49IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICBsZXQgeEVuZDtcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bGxSYW5nZS5lbmQgPiB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgICAgICB4RW5kID0gcGFkZGluZyArIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4RW5kID0gcGFkZGluZyArICgodGhpcy5mdWxsUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zZXRBdHRyaWJ1dGUoJ3gxJywgeEVuZCk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLmVuZEJvdW5kYXJ5LnNldEF0dHJpYnV0ZSgneDInLCB4RW5kKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMuZW5kQm91bmRhcnkuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5lbmRCb3VuZGFyeS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG5vLWRhdGEgem9uZSAobGVmdCkgLSB3aGVuIHZpc2libGVSYW5nZSBleHRlbmRzIGJlZm9yZSBmdWxsUmFuZ2VcbiAgICAgICAgaWYgKHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0IDwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vRGF0YUxlZnRFbmQgPSBwYWRkaW5nICsgKCh0aGlzLmZ1bGxSYW5nZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3Quc2V0QXR0cmlidXRlKCd4JywgcGFkZGluZyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBNYXRoLm1heCgwLCBub0RhdGFMZWZ0RW5kIC0gcGFkZGluZykpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YUxlZnRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgbm8tZGF0YSB6b25lIChyaWdodCkgLSB3aGVuIHZpc2libGVSYW5nZSBleHRlbmRzIGFmdGVyIGZ1bGxSYW5nZVxuICAgICAgICBpZiAodGhpcy52aXNpYmxlUmFuZ2UuZW5kID4gdGhpcy5mdWxsUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICBjb25zdCBub0RhdGFSaWdodFN0YXJ0ID0gcGFkZGluZyArICgodGhpcy5mdWxsUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc2V0QXR0cmlidXRlKCd4Jywgbm9EYXRhUmlnaHRTdGFydCk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLm5vRGF0YVJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgTWF0aC5tYXgoMCwgcGFkZGluZyArIGF2YWlsYWJsZVdpZHRoIC0gbm9EYXRhUmlnaHRTdGFydCkpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy5ub0RhdGFSaWdodFJlY3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0cnVuY2F0ZWQgem9uZSAobGVmdCkgLSB3aGVuIGRhdGEgd2FzIGN1dCBmcm9tIGJlZ2lubmluZyAobGF0ZXN0PXRydWUpXG4gICAgICAgIGlmICh0aGlzLnRydW5jYXRpb24ud2FzVHJ1bmNhdGVkICYmIHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZSkge1xuICAgICAgICAgICAgY29uc3QgdHJ1bmNTdGFydCA9IHBhZGRpbmcgKyAoKHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIGNvbnN0IHRydW5jRW5kID0gcGFkZGluZyArICgodGhpcy50cnVuY2F0aW9uLmxlZnRab25lLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIC8vIENsYW1wIHRvIHZpc2libGUgYXJlYVxuICAgICAgICAgICAgY29uc3QgY2xhbXBlZFN0YXJ0ID0gTWF0aC5tYXgocGFkZGluZywgTWF0aC5taW4ocGFkZGluZyArIGF2YWlsYWJsZVdpZHRoLCB0cnVuY1N0YXJ0KSk7XG4gICAgICAgICAgICBjb25zdCBjbGFtcGVkRW5kID0gTWF0aC5tYXgocGFkZGluZywgTWF0aC5taW4ocGFkZGluZyArIGF2YWlsYWJsZVdpZHRoLCB0cnVuY0VuZCkpO1xuICAgICAgICAgICAgY29uc3QgdHJ1bmNXaWR0aCA9IGNsYW1wZWRFbmQgLSBjbGFtcGVkU3RhcnQ7XG5cbiAgICAgICAgICAgIGlmICh0cnVuY1dpZHRoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3Quc2V0QXR0cmlidXRlKCd4JywgY2xhbXBlZFN0YXJ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB0cnVuY1dpZHRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZExlZnRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cy50cnVuY2F0ZWRMZWZ0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHRydW5jYXRlZCB6b25lIChyaWdodCkgLSB3aGVuIGRhdGEgd2FzIGN1dCBmcm9tIGVuZCAobGF0ZXN0PWZhbHNlKVxuICAgICAgICBpZiAodGhpcy50cnVuY2F0aW9uLndhc1RydW5jYXRlZCAmJiB0aGlzLnRydW5jYXRpb24ucmlnaHRab25lKSB7XG4gICAgICAgICAgICBjb25zdCB0cnVuY1N0YXJ0ID0gcGFkZGluZyArICgodGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZS5zdGFydCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgIGNvbnN0IHRydW5jRW5kID0gcGFkZGluZyArICgodGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkgLyB2aXNpYmxlRHVyYXRpb24pICogYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAvLyBDbGFtcCB0byB2aXNpYmxlIGFyZWFcbiAgICAgICAgICAgIGNvbnN0IGNsYW1wZWRTdGFydCA9IE1hdGgubWF4KHBhZGRpbmcsIE1hdGgubWluKHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aCwgdHJ1bmNTdGFydCkpO1xuICAgICAgICAgICAgY29uc3QgY2xhbXBlZEVuZCA9IE1hdGgubWF4KHBhZGRpbmcsIE1hdGgubWluKHBhZGRpbmcgKyBhdmFpbGFibGVXaWR0aCwgdHJ1bmNFbmQpKTtcbiAgICAgICAgICAgIGNvbnN0IHRydW5jV2lkdGggPSBjbGFtcGVkRW5kIC0gY2xhbXBlZFN0YXJ0O1xuXG4gICAgICAgICAgICBpZiAodHJ1bmNXaWR0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCBjbGFtcGVkU3RhcnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB0cnVuY1dpZHRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnRydW5jYXRlZFJpZ2h0UmVjdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgdGltZWxpbmUgdGlja3MgYW5kIGxhYmVsc1xuICAgICAqIFVzZXMgVklTSUJMRSByYW5nZSBmb3IgYWRhcHRpdmUgc2NhbGluZyAoWWFuZGV4IENsb3VkIHN0eWxlKVxuICAgICAqL1xuICAgIGRyYXdUaWNrcygpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBwYWRkaW5nIH0gPSB0aGlzLmRpbWVuc2lvbnM7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVdpZHRoID0gd2lkdGggLSAocGFkZGluZyAqIDIpO1xuXG4gICAgICAgIC8vIFVzZSB2aXNpYmxlIHJhbmdlIGZvciBib3RoIHBvc2l0aW9uaW5nIGFuZCBzdGVwIGNhbGN1bGF0aW9uXG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgIC8vIFNhZmV0eSBjaGVjazogcHJldmVudCBkaXZpc2lvbiBieSB6ZXJvXG4gICAgICAgIGlmICh2aXNpYmxlRHVyYXRpb24gPD0gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdTVkdUaW1lbGluZTogdmlzaWJsZUR1cmF0aW9uIGlzIHplcm8gb3IgbmVnYXRpdmUsIHNraXBwaW5nIHRpY2sgZHJhd2luZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGFkYXB0aXZlIHN0ZXAgYmFzZWQgb24gVklTSUJMRSBkdXJhdGlvbiBhbmQgYXZhaWxhYmxlIHdpZHRoXG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLmNhbGN1bGF0ZUFkYXB0aXZlU3RlcCh2aXNpYmxlRHVyYXRpb24sIGF2YWlsYWJsZVdpZHRoKTtcblxuICAgICAgICAvLyBSb3VuZCB2aXNpYmxlIHJhbmdlIHRvIG5lYXJlc3Qgc3RlcCBpbnRlcnZhbFxuICAgICAgICBjb25zdCByb3VuZGVkU3RhcnQgPSBNYXRoLmZsb29yKHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0IC8gc3RlcC52YWx1ZSkgKiBzdGVwLnZhbHVlO1xuXG4gICAgICAgIC8vIFN0b3JlIG1ham9yIHRpY2sgcG9zaXRpb25zIGZvciBjb2xsaXNpb24gZGV0ZWN0aW9uXG4gICAgICAgIGNvbnN0IG1ham9yVGlja1Bvc2l0aW9ucyA9IG5ldyBTZXQoKTtcblxuICAgICAgICAvLyBEcmF3IG1ham9yIHRpY2tzIGF0IGRpc2NyZXRlIGludGVydmFscyB3aXRoaW4gdmlzaWJsZSByYW5nZVxuICAgICAgICBsZXQgdGltZXN0YW1wID0gcm91bmRlZFN0YXJ0O1xuICAgICAgICB3aGlsZSAodGltZXN0YW1wIDw9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkge1xuICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+PSB0aGlzLnZpc2libGVSYW5nZS5zdGFydCkge1xuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlIChub3QgZnVsbCByYW5nZSEpXG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAoKHRpbWVzdGFtcCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSAvIHZpc2libGVEdXJhdGlvbikgKiBhdmFpbGFibGVXaWR0aDtcbiAgICAgICAgICAgICAgICBtYWpvclRpY2tQb3NpdGlvbnMuYWRkKE1hdGgucm91bmQodGltZXN0YW1wKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYWpvciB0aWNrIC0gYm90dG9tIChjb21wYWN0KVxuICAgICAgICAgICAgICAgIHRoaXMuZHJhd1RpY2soeCwgaGVpZ2h0IC0gNiwgNCwgJyM3Njc2NzYnKTtcblxuICAgICAgICAgICAgICAgIC8vIExhYmVsIC0gY2VudGVyZWQgdmVydGljYWxseSAoY29tcGFjdCkgd2l0aCBmb3JtYXQgZnJvbSBzdGVwXG4gICAgICAgICAgICAgICAgdGhpcy5kcmF3TGFiZWwoeCwgaGVpZ2h0IC8gMiArIDMsIHRoaXMuZm9ybWF0VGltZSh0aW1lc3RhbXAsIHN0ZXAuZm9ybWF0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lc3RhbXAgKz0gc3RlcC52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERyYXcgbWlub3IgdGlja3MgYmV0d2VlbiBtYWpvciBvbmVzICg1IHBlciBpbnRlcnZhbClcbiAgICAgICAgbGV0IG1pbm9yVGltZXN0YW1wID0gcm91bmRlZFN0YXJ0O1xuICAgICAgICBjb25zdCBtaW5vclN0ZXAgPSBzdGVwLnZhbHVlIC8gNTtcbiAgICAgICAgd2hpbGUgKG1pbm9yVGltZXN0YW1wIDw9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCkge1xuICAgICAgICAgICAgaWYgKG1pbm9yVGltZXN0YW1wID49IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBub3QgYSBtYWpvciB0aWNrIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgcm91bmRlZE1pbm9yVGltZXN0YW1wID0gTWF0aC5yb3VuZChtaW5vclRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYWpvclRpY2tQb3NpdGlvbnMuaGFzKHJvdW5kZWRNaW5vclRpbWVzdGFtcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIFZJU0lCTEUgcmFuZ2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeCA9IHBhZGRpbmcgKyAoKG1pbm9yVGltZXN0YW1wIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQpIC8gdmlzaWJsZUR1cmF0aW9uKSAqIGF2YWlsYWJsZVdpZHRoO1xuICAgICAgICAgICAgICAgICAgICAvLyBNaW5vciB0aWNrIC0gc2hvcnRlciBhbmQgbGlnaHRlclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYXdUaWNrKHgsIGhlaWdodCAtIDUsIDIsICcjZDRkNGQ1Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWlub3JUaW1lc3RhbXAgKz0gbWlub3JTdGVwO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgYSBzaW5nbGUgdGlja1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gWCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gWSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHQgLSBUaWNrIGhlaWdodFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvciAtIFRpY2sgY29sb3JcbiAgICAgKi9cbiAgICBkcmF3VGljayh4LCB5LCBoZWlnaHQsIGNvbG9yKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2xpbmUnKTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgeCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkpO1xuICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgneDInLCB4KTtcbiAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgeSArIGhlaWdodCk7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdzdHJva2UnLCBjb2xvcik7XG4gICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdzdHJva2Utd2lkdGgnLCAnMScpO1xuICAgICAgICB0aGlzLmxheWVycy50aWNrcy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyB0aW1lIGxhYmVsXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHggLSBYIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHkgLSBZIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBMYWJlbCB0ZXh0XG4gICAgICovXG4gICAgZHJhd0xhYmVsKHgsIHksIHRleHQpIHtcbiAgICAgICAgLy8gQ3JlYXRlIHdoaXRlIGJhY2tncm91bmQgcmVjdGFuZ2xlIGZvciBsYWJlbFxuICAgICAgICBjb25zdCBiYm94ID0gdGhpcy5nZXRUZXh0QkJveCh0ZXh0KTtcbiAgICAgICAgY29uc3QgcGFkZGluZyA9IDM7XG5cbiAgICAgICAgY29uc3QgYmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCd4JywgeCAtIChiYm94LndpZHRoIC8gMikgLSBwYWRkaW5nKTtcbiAgICAgICAgYmcuc2V0QXR0cmlidXRlKCd5JywgeSAtIGJib3guaGVpZ2h0ICsgMik7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBiYm94LndpZHRoICsgKHBhZGRpbmcgKiAyKSk7XG4gICAgICAgIGJnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgYmJveC5oZWlnaHQpO1xuICAgICAgICBiZy5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAnI2ZhZmFmYScpO1xuICAgICAgICB0aGlzLmxheWVycy50aWNrcy5hcHBlbmRDaGlsZChiZyk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRleHQgbGFiZWxcbiAgICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3RleHQnKTtcbiAgICAgICAgbGFiZWwuc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpO1xuICAgICAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RpbWVsaW5lLWxhYmVsJyk7XG4gICAgICAgIGxhYmVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MuYXBwZW5kQ2hpbGQobGFiZWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgYXBwcm94aW1hdGUgYm91bmRpbmcgYm94IGZvciB0ZXh0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBCb3VuZGluZyBib3gge3dpZHRoLCBoZWlnaHR9XG4gICAgICovXG4gICAgZ2V0VGV4dEJCb3godGV4dCkge1xuICAgICAgICAvLyBBcHByb3hpbWF0ZSBzaXplIGJhc2VkIG9uIGZvbnQgc2l6ZSBhbmQgY2hhcmFjdGVyIGNvdW50XG4gICAgICAgIGNvbnN0IGZvbnRTaXplID0gMTE7XG4gICAgICAgIC8vIFVzZSBtb25vc3BhY2Ugd2lkdGggZm9yIHRpbWUgbGFiZWxzIChzZWNvbmRzIGZvcm1hdCBpcyBsb25nZXIpXG4gICAgICAgIGNvbnN0IGNoYXJXaWR0aCA9IHRleHQuaW5jbHVkZXMoJzonKSA/IDYuNSA6IDY7IC8vIFdpZGVyIGZvciB0aW1lIGZvcm1hdHNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiB0ZXh0Lmxlbmd0aCAqIGNoYXJXaWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogZm9udFNpemUgKyAyXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lc3RhbXAgdG8gdGltZSBzdHJpbmcgKHNlcnZlciB0aW1lKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcCBpbiBVVENcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gRm9ybWF0IHR5cGU6ICdISDpNTTpTUycsICdISDpNTScsIG9yICdNTS1ERCdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgdGltZS9kYXRlIGluIHNlcnZlciB0aW1lem9uZVxuICAgICAqL1xuICAgIGZvcm1hdFRpbWUodGltZXN0YW1wLCBmb3JtYXQgPSAnSEg6TU0nKSB7XG4gICAgICAgIC8vIENyZWF0ZSBkYXRlIGZyb20gVVRDIHRpbWVzdGFtcCwgdGhlbiBhZGQgc2VydmVyIG9mZnNldCB0byBnZXQgbWlsbGlzZWNvbmRzXG4gICAgICAgIC8vIHNlcnZlclRpbWV6b25lT2Zmc2V0IGlzIGluIHNlY29uZHMsIHRpbWVzdGFtcCBpcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlcnZlclRpbWVNcyA9ICh0aW1lc3RhbXAgKyB0aGlzLnNlcnZlclRpbWV6b25lT2Zmc2V0KSAqIDEwMDA7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShzZXJ2ZXJUaW1lTXMpO1xuXG4gICAgICAgIGlmIChmb3JtYXQgPT09ICdNTS1ERCcpIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBhcyBtb250aC1kYXkgZm9yIGxvbmcgcmFuZ2VzXG4gICAgICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldFVUQ01vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0VVRDRGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgcmV0dXJuIGAke21vbnRofS0ke2RheX1gO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gJ0hIOk1NOlNTJykge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGFzIHRpbWUgd2l0aCBzZWNvbmRzIGZvciB2ZXJ5IHNob3J0IHJhbmdlc1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBTdHJpbmcoZGF0ZS5nZXRVVENIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3QgbWludXRlcyA9IFN0cmluZyhkYXRlLmdldFVUQ01pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IHNlY29uZHMgPSBTdHJpbmcoZGF0ZS5nZXRVVENTZWNvbmRzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc306JHtzZWNvbmRzfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgYXMgdGltZSAoSEg6TU0pIGZvciBzaG9ydGVyIHJhbmdlc1xuICAgICAgICAgICAgY29uc3QgaG91cnMgPSBTdHJpbmcoZGF0ZS5nZXRVVENIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3QgbWludXRlcyA9IFN0cmluZyhkYXRlLmdldFVUQ01pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIG1vdXNlIGV2ZW50c1xuICAgICAqL1xuICAgIGF0dGFjaEV2ZW50cygpIHtcbiAgICAgICAgLy8gU3RvcmUgYm91bmQgaGFuZGxlcnMgZm9yIGNsZWFudXAgaW4gZGVzdHJveSgpXG4gICAgICAgIHRoaXMuX2JvdW5kTW91c2VEb3duID0gKGUpID0+IHRoaXMuaGFuZGxlTW91c2VEb3duKGUpO1xuICAgICAgICB0aGlzLl9ib3VuZE1vdXNlTW92ZSA9IChlKSA9PiB0aGlzLmhhbmRsZU1vdXNlTW92ZShlKTtcbiAgICAgICAgdGhpcy5fYm91bmRNb3VzZVVwID0gKCkgPT4gdGhpcy5oYW5kbGVNb3VzZVVwKCk7XG4gICAgICAgIHRoaXMuX2JvdW5kWm9uZUNsaWNrID0gKGUpID0+IHRoaXMuaGFuZGxlWm9uZUNsaWNrKGUpO1xuXG4gICAgICAgIHRoaXMuc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuX2JvdW5kTW91c2VEb3duKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRNb3VzZU1vdmUpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRNb3VzZVVwKTtcblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgb24gdHJ1bmNhdGVkIHpvbmVcbiAgICAgICAgdGhpcy5zdmcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9ib3VuZFpvbmVDbGljayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjbGljayBvbiB6b25lIGVsZW1lbnRzICh0cnVuY2F0ZWQgem9uZXMpXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVab25lQ2xpY2soZSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgICAgY29uc3Qgem9uZSA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtem9uZScpO1xuXG4gICAgICAgIGlmICh6b25lID09PSAndHJ1bmNhdGVkLWxlZnQnICYmIHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMub25UcnVuY2F0ZWRab25lQ2xpY2spIHtcbiAgICAgICAgICAgICAgICAvLyBMZWZ0IHpvbmU6IGRhdGEgd2FzIGN1dCBmcm9tIGJlZ2lubmluZyAobGF0ZXN0PXRydWUgdXNlZClcbiAgICAgICAgICAgICAgICAvLyBUbyBsb2FkIHRoaXMgem9uZSwgd2UgbmVlZCBsYXRlc3Q9dHJ1ZSB0byBnZXQgZW50cmllcyBmcm9tIGVuZCBvZiBpbnRlcnZhbFxuICAgICAgICAgICAgICAgIHRoaXMub25UcnVuY2F0ZWRab25lQ2xpY2soXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy50cnVuY2F0aW9uLmxlZnRab25lLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLnRydW5jYXRpb24ubGVmdFpvbmUuZW5kKSxcbiAgICAgICAgICAgICAgICAgICAgdHJ1ZSAvLyBpc0xlZnRab25lID0gdHJ1ZSDihpIgdXNlIGxhdGVzdD10cnVlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh6b25lID09PSAndHJ1bmNhdGVkLXJpZ2h0JyAmJiB0aGlzLnRydW5jYXRpb24ucmlnaHRab25lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vblRydW5jYXRlZFpvbmVDbGljaykge1xuICAgICAgICAgICAgICAgIC8vIFJpZ2h0IHpvbmU6IGRhdGEgd2FzIGN1dCBmcm9tIGVuZCAobGF0ZXN0PWZhbHNlIHVzZWQpXG4gICAgICAgICAgICAgICAgLy8gVG8gbG9hZCB0aGlzIHpvbmUsIHdlIG5lZWQgbGF0ZXN0PWZhbHNlIHRvIGdldCBlbnRyaWVzIGZyb20gc3RhcnQgb2YgaW50ZXJ2YWxcbiAgICAgICAgICAgICAgICB0aGlzLm9uVHJ1bmNhdGVkWm9uZUNsaWNrKFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUuc3RhcnQpLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUuZW5kKSxcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UgLy8gaXNMZWZ0Wm9uZSA9IGZhbHNlIOKGkiB1c2UgbGF0ZXN0PWZhbHNlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgZG93blxuICAgICAqIEBwYXJhbSB7TW91c2VFdmVudH0gZSAtIE1vdXNlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlTW91c2VEb3duKGUpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICAgIGNvbnN0IGhhbmRsZSA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaGFuZGxlJyk7XG5cbiAgICAgICAgaWYgKCFoYW5kbGUpIHJldHVybjtcblxuICAgICAgICB0aGlzLmRyYWdnaW5nLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuaGFuZGxlID0gaGFuZGxlO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLnN0YXJ0WCA9IGUuY2xpZW50WDtcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkU3RhcnQgPSB0aGlzLnNlbGVjdGVkUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZEVuZCA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQ7XG5cbiAgICAgICAgY29uc3QgcmVjdCA9IHRoaXMuY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB0aGlzLmRyYWdnaW5nLmNvbnRhaW5lckxlZnQgPSByZWN0LmxlZnQ7XG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyV2lkdGggPSByZWN0LndpZHRoO1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1vdXNlIG1vdmUgKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtNb3VzZUV2ZW50fSBlIC0gTW91c2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVNb3VzZU1vdmUoZSkge1xuICAgICAgICBpZiAoIXRoaXMuZHJhZ2dpbmcuYWN0aXZlKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgZGVsdGFYID0gZS5jbGllbnRYIC0gdGhpcy5kcmFnZ2luZy5zdGFydFg7XG4gICAgICAgIGNvbnN0IHsgcGFkZGluZyB9ID0gdGhpcy5kaW1lbnNpb25zO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IHRoaXMuZHJhZ2dpbmcuY29udGFpbmVyV2lkdGggLSAocGFkZGluZyAqIDIpO1xuICAgICAgICBjb25zdCB2aXNpYmxlRHVyYXRpb24gPSB0aGlzLnZpc2libGVSYW5nZS5lbmQgLSB0aGlzLnZpc2libGVSYW5nZS5zdGFydDtcblxuICAgICAgICAvLyBTYWZldHkgY2hlY2s6IHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBpZiAodmlzaWJsZUR1cmF0aW9uIDw9IDAgfHwgYXZhaWxhYmxlV2lkdGggPD0gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdTVkdUaW1lbGluZTogSW52YWxpZCBkaW1lbnNpb25zIGZvciBtb3VzZSBtb3ZlIGNhbGN1bGF0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBkZWx0YSByZWxhdGl2ZSB0byBWSVNJQkxFIHJhbmdlXG4gICAgICAgIGNvbnN0IGRlbHRhVGltZSA9IChkZWx0YVggLyBhdmFpbGFibGVXaWR0aCkgKiB2aXNpYmxlRHVyYXRpb247XG5cbiAgICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgIC8vIFJlc2l6aW5nIGZyb20gbGVmdCAtIGFsbG93IGZyZWUgbW92ZW1lbnRcbiAgICAgICAgICAgIGxldCBuZXdTdGFydCA9IHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZFN0YXJ0ICsgZGVsdGFUaW1lO1xuICAgICAgICAgICAgLy8gT25seSBlbmZvcmNlIG1pbmltdW0gd2lkdGggb2YgNjAgc2Vjb25kc1xuICAgICAgICAgICAgbmV3U3RhcnQgPSBNYXRoLm1pbihuZXdTdGFydCwgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIDYwKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IG5ld1N0YXJ0O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICAvLyBSZXNpemluZyBmcm9tIHJpZ2h0IC0gYWxsb3cgZnJlZSBtb3ZlbWVudFxuICAgICAgICAgICAgbGV0IG5ld0VuZCA9IHRoaXMuZHJhZ2dpbmcuc3RhcnRTZWxlY3RlZEVuZCArIGRlbHRhVGltZTtcbiAgICAgICAgICAgIC8vIE9ubHkgZW5mb3JjZSBtaW5pbXVtIHdpZHRoIG9mIDYwIHNlY29uZHNcbiAgICAgICAgICAgIG5ld0VuZCA9IE1hdGgubWF4KG5ld0VuZCwgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgNjApO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCA9IG5ld0VuZDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRyYWdnaW5nLmhhbmRsZSA9PT0gJ3JhbmdlJykge1xuICAgICAgICAgICAgLy8gRHJhZ2dpbmcgZW50aXJlIHJhbmdlIC0gYWxsb3cgZnJlZSBtb3ZlbWVudFxuICAgICAgICAgICAgbGV0IG5ld1N0YXJ0ID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkU3RhcnQgKyBkZWx0YVRpbWU7XG4gICAgICAgICAgICBsZXQgbmV3RW5kID0gdGhpcy5kcmFnZ2luZy5zdGFydFNlbGVjdGVkRW5kICsgZGVsdGFUaW1lO1xuXG4gICAgICAgICAgICAvLyBObyBib3VuZHMgY2hlY2tpbmcgLSBhbGxvdyBkcmFnZ2luZyBhbnl3aGVyZVxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gbmV3U3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gbmV3RW5kO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgZHluYW1pYyBlbGVtZW50cyBkdXJpbmcgZHJhZyAobm8gdGlja3MgcmVkcmF3KVxuICAgICAgICAvLyBUaGlzIGVuYWJsZXMgc21vb3RoIENTUyB0cmFuc2l0aW9uc1xuICAgICAgICB0aGlzLnVwZGF0ZUR5bmFtaWNFbGVtZW50cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbW91c2UgdXAgKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQWZ0ZXIgZHJhZzogcHJlc2VydmUgdXNlcidzIG1hbnVhbCBzZWxlY3Rpb24gYW5kIGFkanVzdCB2aXNpYmxlIHJhbmdlXG4gICAgICovXG4gICAgaGFuZGxlTW91c2VVcCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcuYWN0aXZlKSB7XG4gICAgICAgICAgICBjb25zdCB3YXNSZXNpemluZyA9IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAnbGVmdCcgfHwgdGhpcy5kcmFnZ2luZy5oYW5kbGUgPT09ICdyaWdodCc7XG4gICAgICAgICAgICBjb25zdCB3YXNEcmFnZ2luZyA9IHRoaXMuZHJhZ2dpbmcuaGFuZGxlID09PSAncmFuZ2UnO1xuICAgICAgICAgICAgY29uc3QgZHJhZ2dlZEhhbmRsZSA9IHRoaXMuZHJhZ2dpbmcuaGFuZGxlOyAvLyBTYXZlIGJlZm9yZSByZXNldFxuXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5kcmFnZ2luZy5oYW5kbGUgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAod2FzUmVzaXppbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2VyIHJlc2l6ZWQgc2VsZWN0aW9uIOKGkiBhZGp1c3QgdmlzaWJsZSByYW5nZSB0byBiZSA0eCBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBQUkVTRVJWRSB1c2VyJ3MgbWFudWFsIHNlbGVjdGlvbiAoZG8gTk9UIHJlY2FsY3VsYXRlIGl0ISlcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZER1cmF0aW9uID0gdGhpcy5zZWxlY3RlZFJhbmdlLmVuZCAtIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydDtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWaXNpYmxlRHVyYXRpb24gPSBzZWxlY3RlZER1cmF0aW9uICogNDtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZENlbnRlciA9IHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCArIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHZpc2libGUgcmFuZ2UgY2VudGVyZWQgb24gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gTk9URTogQWxsb3cgdmlzaWJsZVJhbmdlIHRvIGV4dGVuZCBCRVlPTkQgZnVsbFJhbmdlIHRvIG1haW50YWluIDEvNCByYXRpb1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVTdGFydCA9IHNlbGVjdGVkQ2VudGVyIC0gKG5ld1Zpc2libGVEdXJhdGlvbiAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3VmlzaWJsZVN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgICAgICAgICAvLyBEbyBOT1QgY2FsbCBjYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpIGhlcmUhXG4gICAgICAgICAgICAgICAgLy8gVGhlIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIChlLmcuLCA5OjQ1LTk6NTApIG11c3QgYmUgcHJlc2VydmVkXG5cbiAgICAgICAgICAgICAgICAvLyBEZWFjdGl2YXRlIGFsbCBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgJCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdhc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciBkcmFnZ2VkIHNlbGVjdGlvbiDihpIgc2hpZnQgdmlzaWJsZSByYW5nZSB0byBrZWVwIHNlbGVjdGlvbiBjZW50ZXJlZFxuICAgICAgICAgICAgICAgIC8vIFBSRVNFUlZFIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIChkbyBOT1QgcmVjYWxjdWxhdGUgaXQhKVxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ICsgKCh0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kIC0gdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIHRvIGtlZXAgc2VsZWN0aW9uIGF0IGNlbnRlclxuICAgICAgICAgICAgICAgIC8vIE5PVEU6IEFsbG93IHZpc2libGVSYW5nZSB0byBleHRlbmQgQkVZT05EIGZ1bGxSYW5nZVxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVTdGFydCA9IHNlbGVjdGVkQ2VudGVyIC0gKHZpc2libGVEdXJhdGlvbiAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArICh2aXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3VmlzaWJsZVN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgICAgICAgICAvLyBEbyBOT1QgY2FsbCBjYWxjdWxhdGVDZW50ZXJlZFNlbGVjdGlvbigpIGhlcmUhXG4gICAgICAgICAgICAgICAgLy8gVGhlIHVzZXIncyBtYW51YWwgc2VsZWN0aW9uIG11c3QgYmUgcHJlc2VydmVkXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbmRlciB3aXRoIG5ldyByYW5nZXNcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY2FsbGJhY2sgdG8gbG9hZCBkYXRhIHdpdGggdXNlcidzIHNlbGVjdGVkIHJhbmdlXG4gICAgICAgICAgICBpZiAodGhpcy5vblJhbmdlQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vblJhbmdlQ2hhbmdlKFxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCksXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLmVuZCksXG4gICAgICAgICAgICAgICAgICAgIGRyYWdnZWRIYW5kbGVcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSB3aW5kb3cgcmVzaXplXG4gICAgICovXG4gICAgaGFuZGxlUmVzaXplKCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBwZXJpb2QgZnJvbSBxdWljay1wZXJpb2QtYnV0dG9ucyAoWWFuZGV4IENsb3VkIHN0eWxlKVxuICAgICAqIFNldHMgdmlzaWJsZSByYW5nZSBhbmQgYXV0by1jZW50ZXJzIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJpb2RTZWNvbmRzIC0gUGVyaW9kIGluIHNlY29uZHMgKGUuZy4sIDM2MDAgZm9yIDFoKVxuICAgICAqL1xuICAgIGFwcGx5UGVyaW9kKHBlcmlvZFNlY29uZHMpIHtcbiAgICAgICAgY29uc3QgcGVyaW9kID0gcGFyc2VJbnQocGVyaW9kU2Vjb25kcyk7XG5cbiAgICAgICAgLy8gU2V0IHZpc2libGUgcmFuZ2UgdG8gbGFzdCBOIHNlY29uZHNcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2UuZW5kID0gdGhpcy5mdWxsUmFuZ2UuZW5kO1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5zdGFydCA9IE1hdGgubWF4KHRoaXMuZnVsbFJhbmdlLmVuZCAtIHBlcmlvZCwgdGhpcy5mdWxsUmFuZ2Uuc3RhcnQpO1xuXG4gICAgICAgIC8vIFNlbGVjdGlvbiBjb3ZlcnMgZW50aXJlIHZpc2libGUgcmFuZ2Ug4oCUIHVzZXIgZXhwZWN0cyB0byBzZWUgQUxMIGRhdGEgZm9yIHRoZSBwZXJpb2RcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSB0aGlzLnZpc2libGVSYW5nZS5lbmQ7XG5cbiAgICAgICAgLy8gUmVuZGVyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjYWxsYmFjayB0byBsb2FkIGRhdGFcbiAgICAgICAgaWYgKHRoaXMub25SYW5nZUNoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5vblJhbmdlQ2hhbmdlKFxuICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBzZWxlY3RlZCByYW5nZSBleHBsaWNpdGx5ICh3aXRob3V0IGF1dG8tY2VudGVyaW5nIG9yIHRyaWdnZXJpbmcgb25SYW5nZUNoYW5nZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIHNldFJhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGEgKHdpdGhvdXQgdHJpZ2dlcmluZyBvblJhbmdlQ2hhbmdlKVxuICAgICAqIFVzZWQgd2hlbiBiYWNrZW5kIHJldHVybnMgZGlmZmVyZW50IHJhbmdlIGR1ZSB0byA1MDAwIGxpbmUgbGltaXRcbiAgICAgKiBTeW5jaHJvbm91c2x5IHVwZGF0ZXMgYm90aCB2aXNpYmxlIHJhbmdlIGFuZCBzZWxlY3RlZCByYW5nZSB0byBtYWludGFpbiAxLzQgcmF0aW9cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgLSBBY3R1YWwgc3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEFjdHVhbCBlbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgdXBkYXRlU2VsZWN0ZWRSYW5nZShzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vIEVuc3VyZSBtaW5pbXVtIGR1cmF0aW9uIHRvIHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBjb25zdCBNSU5fRFVSQVRJT04gPSA2MDsgLy8gMSBtaW51dGUgbWluaW11bVxuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIC8vIEV4cGFuZCByYW5nZSBzeW1tZXRyaWNhbGx5IGFyb3VuZCB0aGUgc2luZ2xlIHRpbWVzdGFtcFxuICAgICAgICAgICAgY29uc3QgY2VudGVyID0gc3RhcnQ7XG4gICAgICAgICAgICBzdGFydCA9IGNlbnRlciAtIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgICAgIGVuZCA9IGNlbnRlciArIChNSU5fRFVSQVRJT04gLyAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCByYW5nZSB0byBhY3R1YWwgbG9hZGVkIGRhdGFcbiAgICAgICAgdGhpcy5zZWxlY3RlZFJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5lbmQgPSBlbmQ7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyB2aXNpYmxlIHJhbmdlIGFzIDR4IG9mIHNlbGVjdGVkIHJhbmdlXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRHVyYXRpb24gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZUR1cmF0aW9uID0gc2VsZWN0ZWREdXJhdGlvbiAqIDQ7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkQ2VudGVyID0gc3RhcnQgKyAoc2VsZWN0ZWREdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIENlbnRlciB2aXNpYmxlIHJhbmdlIGFyb3VuZCBzZWxlY3RlZCByYW5nZVxuICAgICAgICAvLyBOT1RFOiB2aXNpYmxlUmFuZ2UgY2FuIGV4dGVuZCBCRVlPTkQgZnVsbFJhbmdlIHRvIG1haW50YWluIDEvNCByYXRpb1xuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgZW1wdHkgc3BhY2UgYXJvdW5kIHRoZSBhY3R1YWwgZGF0YVxuICAgICAgICBjb25zdCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgY29uc3QgbmV3VmlzaWJsZUVuZCA9IHNlbGVjdGVkQ2VudGVyICsgKG5ld1Zpc2libGVEdXJhdGlvbiAvIDIpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB2aXNpYmxlIHJhbmdlIChubyBib3VuZHMgY2hlY2sgLSBhbGxvdyBleHRlbmRpbmcgYmV5b25kIGZ1bGxSYW5nZSlcbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIE5vdGU6IERvZXMgTk9UIHRyaWdnZXIgb25SYW5nZUNoYW5nZSBjYWxsYmFja1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGltZWxpbmUgd2l0aCBzZXJ2ZXIgcmVzcG9uc2UgKGhhbmRsZXMgdHJ1bmNhdGlvbiB2aXN1YWxpemF0aW9uKVxuICAgICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgdG8gY2FsbCBhZnRlciByZWNlaXZpbmcgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjdHVhbFJhbmdlIC0gU2VydmVyIHJlc3BvbnNlOiB7IHN0YXJ0LCBlbmQsIGxpbmVzX2NvdW50LCB0cnVuY2F0ZWQgfVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByZXF1ZXN0ZWRTdGFydCAtIE9yaWdpbmFsIHJlcXVlc3RlZCBzdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcmVxdWVzdGVkRW5kIC0gT3JpZ2luYWwgcmVxdWVzdGVkIGVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzSW5pdGlhbExvYWQgLSBJZiB0cnVlLCBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5IChmaXJzdCBwYWdlIGxvYWQpXG4gICAgICovXG4gICAgdXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKGFjdHVhbFJhbmdlLCByZXF1ZXN0ZWRTdGFydCwgcmVxdWVzdGVkRW5kLCBpc0luaXRpYWxMb2FkID0gZmFsc2UpIHtcbiAgICAgICAgLy8gU3RvcmUgd2hhdCB3YXMgcmVxdWVzdGVkXG4gICAgICAgIHRoaXMucmVxdWVzdGVkUmFuZ2Uuc3RhcnQgPSByZXF1ZXN0ZWRTdGFydDtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ZWRSYW5nZS5lbmQgPSByZXF1ZXN0ZWRFbmQ7XG5cbiAgICAgICAgLy8gUmVzZXQgdHJ1bmNhdGlvbiBpbmZvXG4gICAgICAgIHRoaXMudHJ1bmNhdGlvbi53YXNUcnVuY2F0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxpbmVzQ291bnQgPSAwO1xuICAgICAgICB0aGlzLnRydW5jYXRpb24uZGlyZWN0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxlZnRab25lID0gbnVsbDtcbiAgICAgICAgdGhpcy50cnVuY2F0aW9uLnJpZ2h0Wm9uZSA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRydW5jYXRpb24gem9uZSBpZiBkYXRhIHdhcyB0cnVuY2F0ZWRcbiAgICAgICAgLy8gU2tpcCB0cnVuY2F0aW9uIHpvbmVzIG9uIGluaXRpYWwgbG9hZCAtIHVzZXIgZXhwZWN0cyB0byBzZWUgXCJ0YWlsXCIgb2YgbG9nXG4gICAgICAgIGlmIChhY3R1YWxSYW5nZS50cnVuY2F0ZWQgJiYgIWlzSW5pdGlhbExvYWQpIHtcbiAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi53YXNUcnVuY2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy50cnVuY2F0aW9uLmxpbmVzQ291bnQgPSBhY3R1YWxSYW5nZS5saW5lc19jb3VudDtcbiAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5kaXJlY3Rpb24gPSBhY3R1YWxSYW5nZS50cnVuY2F0ZWRfZGlyZWN0aW9uIHx8ICdyaWdodCc7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnRydW5jYXRpb24uZGlyZWN0aW9uID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnVuY2F0ZWQgZnJvbSBsZWZ0IChsYXRlc3Q9dHJ1ZSk6IGJlZ2lubmluZyBvZiByZXF1ZXN0ZWQgcmFuZ2Ugd2FzIGN1dFxuICAgICAgICAgICAgICAgIGlmIChhY3R1YWxSYW5nZS5zdGFydCA+IHJlcXVlc3RlZFN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5sZWZ0Wm9uZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiByZXF1ZXN0ZWRTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogYWN0dWFsUmFuZ2Uuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRydW5jYXRlZCBmcm9tIHJpZ2h0IChsYXRlc3Q9ZmFsc2UpOiBlbmQgb2YgcmVxdWVzdGVkIHJhbmdlIHdhcyBjdXRcbiAgICAgICAgICAgICAgICBpZiAoYWN0dWFsUmFuZ2UuZW5kIDwgcmVxdWVzdGVkRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJ1bmNhdGlvbi5yaWdodFpvbmUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogYWN0dWFsUmFuZ2UuZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiByZXF1ZXN0ZWRFbmRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIGV4aXN0aW5nIHVwZGF0ZVNlbGVjdGVkUmFuZ2UgbG9naWMgZm9yIHRoZSByZXN0XG4gICAgICAgIC8vIEVuc3VyZSBtaW5pbXVtIGR1cmF0aW9uIHRvIHByZXZlbnQgZGl2aXNpb24gYnkgemVyb1xuICAgICAgICBsZXQgc3RhcnQgPSBhY3R1YWxSYW5nZS5zdGFydDtcbiAgICAgICAgbGV0IGVuZCA9IGFjdHVhbFJhbmdlLmVuZDtcbiAgICAgICAgY29uc3QgTUlOX0RVUkFUSU9OID0gNjA7IC8vIDEgbWludXRlIG1pbmltdW1cblxuICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCBNSU5fRFVSQVRJT04pIHtcbiAgICAgICAgICAgIGNvbnN0IGNlbnRlciA9IHN0YXJ0O1xuICAgICAgICAgICAgc3RhcnQgPSBjZW50ZXIgLSAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgICAgICBlbmQgPSBjZW50ZXIgKyAoTUlOX0RVUkFUSU9OIC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgcmFuZ2UgdG8gYWN0dWFsIGxvYWRlZCBkYXRhXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLnNlbGVjdGVkUmFuZ2UuZW5kID0gZW5kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aGF0IG5ldyB2aXNpYmxlIHJhbmdlIHdvdWxkIGJlIGJhc2VkIG9uIGFjdHVhbCBkYXRhICg0eCBvZiBzZWxlY3RlZClcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWREdXJhdGlvbiA9IGVuZCAtIHN0YXJ0O1xuICAgICAgICBjb25zdCBuZXdWaXNpYmxlRHVyYXRpb24gPSBzZWxlY3RlZER1cmF0aW9uICogNDtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRDZW50ZXIgPSBzdGFydCArIChzZWxlY3RlZER1cmF0aW9uIC8gMik7XG4gICAgICAgIGxldCBuZXdWaXNpYmxlU3RhcnQgPSBzZWxlY3RlZENlbnRlciAtIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcbiAgICAgICAgbGV0IG5ld1Zpc2libGVFbmQgPSBzZWxlY3RlZENlbnRlciArIChuZXdWaXNpYmxlRHVyYXRpb24gLyAyKTtcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IFByZXNlcnZlIGVudGlyZSB2aXNpYmxlUmFuZ2UgaWYgaXQgd2FzIGV4dGVuZGVkIHRvIGN1cnJlbnQgdGltZVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgbm8tZGF0YSB6b25lIGRpc3BsYXlzIGNvcnJlY3RseSBhZnRlciByZWZyZXNoXG4gICAgICAgIC8vIFdoZW4gdXNlciBjbGlja3MgcmVmcmVzaCwgdGhleSB3YW50IHRvIHNlZSB0aW1lbGluZSB1cCB0byBjdXJyZW50IHRpbWVcbiAgICAgICAgLy8gUHJlc2VydmUgYm90aCBwb3NpdGlvbiBBTkQgZHVyYXRpb24gdG8gcHJldmVudCBzaHJpbmtpbmcgdGhlIHZpc2libGUgYXJlYVxuICAgICAgICBjb25zdCBjdXJyZW50VmlzaWJsZUR1cmF0aW9uID0gdGhpcy52aXNpYmxlUmFuZ2UuZW5kIC0gdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQ7XG4gICAgICAgIGlmICh0aGlzLnZpc2libGVSYW5nZS5lbmQgPiBuZXdWaXNpYmxlRW5kIHx8IHRoaXMudmlzaWJsZVJhbmdlLmVuZCA+IGVuZCkge1xuICAgICAgICAgICAgLy8gS2VlcCB0aGUgZXhpc3RpbmcgdmlzaWJsZVJhbmdlIGVudGlyZWx5IChib3RoIGR1cmF0aW9uIGFuZCBlbmQgcG9zaXRpb24pXG4gICAgICAgICAgICAvLyBPbmx5IHNlbGVjdGVkUmFuZ2Ugd2FzIHVwZGF0ZWQgYWJvdmUgdG8gc2hvdyB3aGVyZSBhY3R1YWwgZGF0YSBpc1xuICAgICAgICAgICAgLy8gVGhlIGdhcCBiZXR3ZWVuIGZ1bGxSYW5nZS5lbmQgYW5kIHZpc2libGVSYW5nZS5lbmQgd2lsbCBzaG93IGFzIG5vLWRhdGEgem9uZVxuICAgICAgICAgICAgbmV3VmlzaWJsZUVuZCA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZDtcbiAgICAgICAgICAgIG5ld1Zpc2libGVTdGFydCA9IHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpYmxlUmFuZ2Uuc3RhcnQgPSBuZXdWaXNpYmxlU3RhcnQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLmVuZCA9IG5ld1Zpc2libGVFbmQ7XG5cbiAgICAgICAgLy8gUmVuZGVyIHdpdGggbmV3IHJhbmdlc1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIHJlbmRlciAoZWxlbWVudHMgbm93IGV4aXN0IGluIERPTSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplWm9uZVBvcHVwcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFNlbWFudGljIFVJIHBvcHVwcyBmb3Igem9uZSBlbGVtZW50c1xuICAgICAqIERlc3Ryb3lzIGV4aXN0aW5nIHBvcHVwcyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb24gdG8gcHJldmVudCBsZWFrc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVab25lUG9wdXBzKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBqUXVlcnkgYW5kIHBvcHVwIGFyZSBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiAkID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgJC5mbi5wb3B1cCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5vRGF0YUNvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGUuc2RfTm9EYXRhRm9yUGVyaW9kIHx8ICdObyBkYXRhIGF2YWlsYWJsZSBmb3IgdGhpcyBwZXJpb2QnO1xuICAgICAgICBjb25zdCB0cnVuY2F0ZWRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlLnNkX0RhdGFUcnVuY2F0ZWRDbGlja1RvTG9hZCB8fCAnRGF0YSB0cnVuY2F0ZWQgKDUwMDAgbGluZXMgbGltaXQpLiBDbGljayB0byBsb2FkLic7XG4gICAgICAgIGNvbnN0IHBvcHVwU2V0dGluZ3MgPSB7IHBvc2l0aW9uOiAndG9wIGNlbnRlcicsIHZhcmlhdGlvbjogJ21pbmknIH07XG5cbiAgICAgICAgLy8gUG9wdXAgZm9yIG5vLWRhdGEgem9uZXNcbiAgICAgICAgW3RoaXMuZWxlbWVudHMubm9EYXRhTGVmdFJlY3QsIHRoaXMuZWxlbWVudHMubm9EYXRhUmlnaHRSZWN0XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICAgICAgJChlbCkucG9wdXAoJ2Rlc3Ryb3knKS5wb3B1cCh7IC4uLnBvcHVwU2V0dGluZ3MsIGNvbnRlbnQ6IG5vRGF0YUNvbnRlbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFBvcHVwIGZvciB0cnVuY2F0ZWQgem9uZXNcbiAgICAgICAgW3RoaXMuZWxlbWVudHMudHJ1bmNhdGVkTGVmdFJlY3QsIHRoaXMuZWxlbWVudHMudHJ1bmNhdGVkUmlnaHRSZWN0XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICAgICAgJChlbCkucG9wdXAoJ2Rlc3Ryb3knKS5wb3B1cCh7IC4uLnBvcHVwU2V0dGluZ3MsIGNvbnRlbnQ6IHRydW5jYXRlZENvbnRlbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayB3aGVuIHRydW5jYXRlZCB6b25lIGlzIGNsaWNrZWRcbiAgICAgKiBPdmVycmlkZSB0aGlzIHRvIGxvYWQgdGhlIHRydW5jYXRlZCByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydCAtIFN0YXJ0IHRpbWVzdGFtcCBvZiB0cnVuY2F0ZWQgem9uZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgLSBFbmQgdGltZXN0YW1wIG9mIHRydW5jYXRlZCB6b25lXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0xlZnRab25lIC0gVHJ1ZSBpZiBsZWZ0IHpvbmUgY2xpY2tlZCAodXNlIGxhdGVzdD10cnVlKSwgZmFsc2UgZm9yIHJpZ2h0IHpvbmVcbiAgICAgKi9cbiAgICBvblRydW5jYXRlZFpvbmVDbGljayhzdGFydCwgZW5kLCBpc0xlZnRab25lKSB7XG4gICAgICAgIC8vIFRvIGJlIG92ZXJyaWRkZW5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgd2hlbiByYW5nZSBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBvblJhbmdlQ2hhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgLy8gVG8gYmUgb3ZlcnJpZGRlblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIHZpc2libGUgcmFuZ2UgZW5kIHRvIHNwZWNpZmljIHRpbWVzdGFtcCAoZm9yIHJlZnJlc2ggbW9kZSlcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBCRUZPUkUgc2VydmVyIHJlcXVlc3QgdG8gc2V0IHdoZXJlIHRpbWVsaW5lIHNob3VsZCBlbmRcbiAgICAgKiBPbmx5IHVwZGF0ZXMgdmlzaWJsZVJhbmdlLCBOT1Qgc2VsZWN0ZWRSYW5nZSBvciBmdWxsUmFuZ2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbmV3RW5kIC0gTmV3IGVuZCB0aW1lc3RhbXAgZm9yIHZpc2libGUgcmFuZ2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlIC0gSWYgdHJ1ZSwgYWx3YXlzIHNldCBldmVuIGlmIG5ld0VuZCA8PSBjdXJyZW50IGVuZFxuICAgICAqL1xuICAgIGV4dGVuZFJhbmdlKG5ld0VuZCwgZm9yY2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIWZvcmNlICYmIG5ld0VuZCA8PSB0aGlzLnZpc2libGVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gTm8gbmVlZCB0byBleHRlbmRcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIHZpc2libGUgcmFuZ2UsIE5PVCBmdWxsUmFuZ2Ugb3Igc2VsZWN0ZWRSYW5nZVxuICAgICAgICAvLyBmdWxsUmFuZ2UgcmVwcmVzZW50cyBhY3R1YWwgZGF0YSBpbiBsb2cgZmlsZVxuICAgICAgICAvLyBzZWxlY3RlZFJhbmdlIHJlcHJlc2VudHMgdGhlIGFjdHVhbCBkYXRhIHBlcmlvZCAobm90IHByb2plY3RlZCBmdXR1cmUpXG4gICAgICAgIGNvbnN0IHZpc2libGVEdXJhdGlvbiA9IHRoaXMudmlzaWJsZVJhbmdlLmVuZCAtIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0O1xuICAgICAgICB0aGlzLnZpc2libGVSYW5nZS5lbmQgPSBuZXdFbmQ7XG4gICAgICAgIHRoaXMudmlzaWJsZVJhbmdlLnN0YXJ0ID0gbmV3RW5kIC0gdmlzaWJsZUR1cmF0aW9uO1xuXG4gICAgICAgIC8vIERPIE5PVCBzaGlmdCBzZWxlY3RlZFJhbmdlIC0gaXQgc2hvdWxkIHJlbWFpbiBib3VuZCB0byBhY3R1YWwgZGF0YVxuICAgICAgICAvLyBUaGUgZ2FwIGJldHdlZW4gc2VsZWN0ZWRSYW5nZS5lbmQgYW5kIHZpc2libGVSYW5nZS5lbmQgd2lsbCBzaG93IGFzIG5vLWRhdGEgem9uZVxuICAgICAgICAvLyBzZWxlY3RlZFJhbmdlIHdpbGwgYmUgdXBkYXRlZCBieSB1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoKSB3aXRoIHJlYWwgZGF0YVxuXG4gICAgICAgIC8vIFJlLXJlbmRlciB0byBzaG93IHVwZGF0ZWQgdGltZWxpbmUgd2l0aCBuby1kYXRhIHpvbmVcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZ1bGxSYW5nZS5lbmQgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBDYWxsZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBhY3R1YWxfcmFuZ2Ugd2l0aCByZWFsIGRhdGEgYm91bmRhcmllc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhY3R1YWxFbmQgLSBBY3R1YWwgZW5kIHRpbWVzdGFtcCBmcm9tIHNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIHVwZGF0ZURhdGFCb3VuZGFyeShhY3R1YWxFbmQpIHtcbiAgICAgICAgaWYgKGFjdHVhbEVuZCA+IHRoaXMuZnVsbFJhbmdlLmVuZCkge1xuICAgICAgICAgICAgdGhpcy5mdWxsUmFuZ2UuZW5kID0gYWN0dWFsRW5kO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRpbWVsaW5lXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGRvY3VtZW50L3dpbmRvdy1sZXZlbCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kTW91c2VNb3ZlKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZE1vdXNlTW92ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kTW91c2VVcCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kTW91c2VVcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kUmVzaXplKSB7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fYm91bmRSZXNpemUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3ZnID0gbnVsbDtcbiAgICAgICAgdGhpcy5sYXllcnMudGlja3MgPSBudWxsO1xuICAgICAgICB0aGlzLmxheWVycy5keW5hbWljID0gbnVsbDtcbiAgICB9XG59O1xuIl19