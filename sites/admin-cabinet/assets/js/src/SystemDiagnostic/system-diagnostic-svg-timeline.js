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
const SVGTimeline = {
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
        ticks: null,      // Background layer for ticks and labels
        dynamic: null     // Foreground layer for selection, handles, boundaries
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
        direction: null,  // 'left' or 'right'
        leftZone: null,   // { start, end } if data was truncated from left (latest=true)
        rightZone: null   // { start, end } if data was truncated from right (latest=false)
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
        handle: null, // 'left', 'right', 'range'
        startX: 0,
        startSelectedStart: 0,
        startSelectedEnd: 0
    },

    /**
     * Initialize timeline (Yandex Cloud LogViewer style)
     * @param {string|HTMLElement} container - Container selector or element
     * @param {object} timeRange - Full time range with start and end timestamps
     */
    initialize(container, timeRange) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            console.error('Timeline container not found');
            return;
        }

        // Validate time range - must have valid numeric timestamps
        if (typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number' ||
            isNaN(timeRange.start) || isNaN(timeRange.end)) {
            console.error('SVGTimeline: Invalid time range - start and end must be valid numbers');
            return;
        }

        // Store full range (entire log file) - ORIGINAL values, never expanded
        // fullRange represents actual data boundaries for no-data zone calculation
        this.fullRange.start = timeRange.start;
        this.fullRange.end = timeRange.end;

        // For display purposes, expand range if too short (prevents division by zero)
        // But keep fullRange as original for no-data zone detection
        const MIN_DURATION = 60; // 1 minute minimum
        let displayStart = timeRange.start;
        let displayEnd = timeRange.end;
        if (displayEnd - displayStart < MIN_DURATION) {
            const center = displayStart;
            displayStart = center - (MIN_DURATION / 2);
            displayEnd = center + (MIN_DURATION / 2);
        }

        this.dimensions.width = this.container.offsetWidth;

        // Determine initial visible range based on display duration (expanded for short logs)
        const totalDuration = displayEnd - displayStart;
        let initialVisibleDuration;

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
        }

        // Set visible range (what user sees on timeline) - use expanded display range
        this.visibleRange.end = displayEnd;
        this.visibleRange.start = Math.max(displayEnd - initialVisibleDuration, displayStart);

        // Calculate selected range as 1/4 of visible range, centered
        this.calculateCenteredSelection();

        // Create SVG structure
        this.createSVG();
        this.render();
        this.attachEvents();

        // Handle window resize (stored for cleanup in destroy())
        this._boundResize = () => this.handleResize();
        window.addEventListener('resize', this._boundResize);
    },

    /**
     * Calculate centered selection (1/4 of visible range, positioned at center)
     */
    calculateCenteredSelection() {
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const selectedDuration = visibleDuration / 4;
        const visibleCenter = this.visibleRange.start + (visibleDuration / 2);

        this.selectedRange.start = visibleCenter - (selectedDuration / 2);
        this.selectedRange.end = visibleCenter + (selectedDuration / 2);

        // Ensure selected range stays within visible range
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
    calculateAdaptiveStep(duration, availableWidth) {
        // Time steps in seconds with labels (from smallest to largest)
        const steps = [
            { value: 1, label: '1 sec', format: 'HH:MM:SS' },        // 1 second
            { value: 5, label: '5 sec', format: 'HH:MM:SS' },        // 5 seconds
            { value: 10, label: '10 sec', format: 'HH:MM:SS' },      // 10 seconds
            { value: 30, label: '30 sec', format: 'HH:MM:SS' },      // 30 seconds
            { value: 60, label: '1 min', format: 'HH:MM' },          // 1 minute
            { value: 300, label: '5 min', format: 'HH:MM' },         // 5 minutes
            { value: 600, label: '10 min', format: 'HH:MM' },        // 10 minutes
            { value: 1800, label: '30 min', format: 'HH:MM' },       // 30 minutes
            { value: 3600, label: '1 hour', format: 'HH:MM' },       // 1 hour
            { value: 10800, label: '3 hours', format: 'HH:MM' },     // 3 hours
            { value: 21600, label: '6 hours', format: 'HH:MM' },     // 6 hours
            { value: 43200, label: '12 hours', format: 'HH:MM' },    // 12 hours
            { value: 86400, label: '1 day', format: 'MM-DD' },       // 1 day
            { value: 259200, label: '3 days', format: 'MM-DD' },     // 3 days
            { value: 604800, label: '1 week', format: 'MM-DD' },     // 7 days
            { value: 2592000, label: '1 month', format: 'MM-DD' }    // 30 days
        ];

        // Minimum spacing between labels: 2cm ≈ 75px (at 96 DPI)
        // Using 80px to be safe and account for label width
        const minSpacingPx = 80;

        // Calculate maximum number of labels that fit with minimum spacing
        const maxLabels = Math.floor(availableWidth / minSpacingPx);

        // Ensure at least 2 labels, but not more than available space allows
        const targetMinLabels = Math.max(2, Math.min(4, maxLabels));
        const targetMaxLabels = Math.max(targetMinLabels, maxLabels);

        // Find step that produces appropriate number of labels
        for (let i = 0; i < steps.length; i++) {
            const numLabels = Math.floor(duration / steps[i].value);

            // Check if this step produces acceptable number of labels
            if (numLabels >= targetMinLabels && numLabels <= targetMaxLabels) {
                return steps[i];
            }
        }

        // If no perfect match, find closest match
        let bestStep = steps[0];
        let bestDiff = Infinity;

        for (let i = 0; i < steps.length; i++) {
            const numLabels = Math.floor(duration / steps[i].value);

            // For very short durations, prefer step that produces at least 2 labels
            if (duration < steps[0].value * targetMinLabels) {
                if (numLabels >= 2) {
                    return steps[i];
                }
                continue;
            }

            // Calculate difference from ideal range
            let diff;
            if (numLabels < targetMinLabels) {
                diff = (targetMinLabels - numLabels) * 2; // Penalize too few labels more
            } else if (numLabels > targetMaxLabels) {
                diff = numLabels - targetMaxLabels; // Penalize too many labels
            } else {
                diff = 0; // Within acceptable range
            }

            if (diff < bestDiff) {
                bestDiff = diff;
                bestStep = steps[i];
            }
        }

        return bestStep;
    },

    /**
     * Create SVG element with persistent dynamic elements
     */
    createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'timeline-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', this.dimensions.height);

        // Create defs for patterns
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // Diagonal stripes pattern for "no data" zones
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'timeline-no-data-pattern');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', '8');
        pattern.setAttribute('height', '8');
        pattern.setAttribute('patternTransform', 'rotate(45)');

        const patternRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        patternRect.setAttribute('width', '4');
        patternRect.setAttribute('height', '8');
        patternRect.setAttribute('fill', 'rgba(0, 0, 0, 0.08)');

        pattern.appendChild(patternRect);
        defs.appendChild(pattern);
        svg.appendChild(defs);

        // Create layer groups for proper z-ordering
        this.layers.ticks = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.layers.ticks.setAttribute('class', 'timeline-ticks-layer');

        this.layers.dynamic = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.layers.dynamic.setAttribute('class', 'timeline-dynamic-layer');

        svg.appendChild(this.layers.ticks);
        svg.appendChild(this.layers.dynamic);

        // Create persistent dynamic elements (for CSS transitions)
        this.createDynamicElements();

        this.container.innerHTML = '';
        this.container.appendChild(svg);
        this.svg = svg;
    },

    /**
     * Create persistent dynamic SVG elements once
     * These elements are updated via setAttribute for smooth CSS transitions
     */
    createDynamicElements() {
        const { height } = this.dimensions;

        // No data zone - left (beyond fullRange.start)
        this.elements.noDataLeftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.noDataLeftRect.setAttribute('y', 0);
        this.elements.noDataLeftRect.setAttribute('height', height);
        this.elements.noDataLeftRect.setAttribute('class', 'timeline-no-data');
        this.elements.noDataLeftRect.style.display = 'none';
        this.layers.dynamic.appendChild(this.elements.noDataLeftRect);

        // No data zone - right (beyond fullRange.end)
        this.elements.noDataRightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.noDataRightRect.setAttribute('y', 0);
        this.elements.noDataRightRect.setAttribute('height', height);
        this.elements.noDataRightRect.setAttribute('class', 'timeline-no-data');
        this.elements.noDataRightRect.style.display = 'none';
        this.layers.dynamic.appendChild(this.elements.noDataRightRect);

        // Truncated zone - left (data cut by 5000 line limit when latest=true)
        this.elements.truncatedLeftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.truncatedLeftRect.setAttribute('y', 0);
        this.elements.truncatedLeftRect.setAttribute('height', height);
        this.elements.truncatedLeftRect.setAttribute('class', 'timeline-truncated');
        this.elements.truncatedLeftRect.setAttribute('data-zone', 'truncated-left');
        this.elements.truncatedLeftRect.style.display = 'none';
        this.layers.dynamic.appendChild(this.elements.truncatedLeftRect);

        // Truncated zone - right (data cut by 5000 line limit when latest=false)
        this.elements.truncatedRightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.truncatedRightRect.setAttribute('y', 0);
        this.elements.truncatedRightRect.setAttribute('height', height);
        this.elements.truncatedRightRect.setAttribute('class', 'timeline-truncated');
        this.elements.truncatedRightRect.setAttribute('data-zone', 'truncated-right');
        this.elements.truncatedRightRect.style.display = 'none';
        this.layers.dynamic.appendChild(this.elements.truncatedRightRect);

        // "Now" line
        this.elements.nowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.elements.nowLine.setAttribute('y1', 0);
        this.elements.nowLine.setAttribute('y2', height);
        this.elements.nowLine.setAttribute('class', 'timeline-now');
        this.layers.dynamic.appendChild(this.elements.nowLine);

        // Start boundary (left red line)
        this.elements.startBoundary = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.elements.startBoundary.setAttribute('y1', 0);
        this.elements.startBoundary.setAttribute('y2', height);
        this.elements.startBoundary.setAttribute('class', 'timeline-boundary');
        this.layers.dynamic.appendChild(this.elements.startBoundary);

        // End boundary (right red line)
        this.elements.endBoundary = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.elements.endBoundary.setAttribute('y1', 0);
        this.elements.endBoundary.setAttribute('y2', height);
        this.elements.endBoundary.setAttribute('class', 'timeline-boundary');
        this.layers.dynamic.appendChild(this.elements.endBoundary);

        // Selection rectangle
        this.elements.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.selectionRect.setAttribute('y', 0);
        this.elements.selectionRect.setAttribute('height', height);
        this.elements.selectionRect.setAttribute('class', 'timeline-selection');
        this.elements.selectionRect.setAttribute('data-handle', 'range');
        this.layers.dynamic.appendChild(this.elements.selectionRect);

        // Left handle
        this.elements.leftHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.elements.leftHandle.setAttribute('y', 0);
        this.elements.leftHandle.setAttribute('width', 6);
        this.elements.leftHandle.setAttribute('height', height);
        this.elements.leftHandle.setAttribute('class', 'timeline-handle');
        this.elements.leftHandle.setAttribute('data-handle', 'left');
        this.layers.dynamic.appendChild(this.elements.leftHandle);

        // Right handle
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
    render() {
        if (!this.svg) return;

        // Update width
        this.dimensions.width = this.container.offsetWidth;

        // Redraw ticks and labels (they depend on visibleRange)
        this.renderTicks();

        // Update dynamic elements positions (with CSS transitions)
        this.updateDynamicElements();
    },

    /**
     * Render only ticks and labels (background layer)
     * Called when visibleRange changes
     */
    renderTicks() {
        if (!this.layers.ticks) return;

        // Clear only ticks layer
        this.layers.ticks.innerHTML = '';

        // Draw ticks and labels
        this.drawTicks();
    },

    /**
     * Update dynamic elements positions via setAttribute
     * Called during drag for smooth CSS transitions
     */
    updateDynamicElements() {
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const { width, height, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        // Safety check
        if (visibleDuration <= 0 || availableWidth <= 0) return;

        // Calculate positions independently for each edge
        // This prevents visual artifacts when resizing from one side
        const leftX = padding + ((this.selectedRange.start - this.visibleRange.start) / visibleDuration) * availableWidth;
        const rightX = padding + ((this.selectedRange.end - this.visibleRange.start) / visibleDuration) * availableWidth;
        const w = rightX - leftX;

        // Update selection rectangle
        this.elements.selectionRect.setAttribute('x', leftX);
        this.elements.selectionRect.setAttribute('width', Math.max(0, w));

        // Update handles - positioned independently
        this.elements.leftHandle.setAttribute('x', leftX - 3);
        this.elements.rightHandle.setAttribute('x', rightX - 3);

        // Update "Now" line
        // Add 60s buffer to prevent hiding when time slightly exceeds visibleRange.end
        const now = Math.floor(Date.now() / 1000);
        const nowBuffer = 60;
        if (now >= this.visibleRange.start && now <= this.visibleRange.end + nowBuffer) {
            // Clamp nowX to visible area (don't draw beyond right edge)
            const clampedNow = Math.min(now, this.visibleRange.end);
            const nowX = padding + ((clampedNow - this.visibleRange.start) / visibleDuration) * availableWidth;
            this.elements.nowLine.setAttribute('x1', nowX);
            this.elements.nowLine.setAttribute('x2', nowX);
            this.elements.nowLine.style.display = '';
        } else {
            this.elements.nowLine.style.display = 'none';
        }

        // Update start boundary
        if (this.fullRange.start <= this.visibleRange.end) {
            let xStart;
            if (this.fullRange.start < this.visibleRange.start) {
                xStart = padding;
            } else {
                xStart = padding + ((this.fullRange.start - this.visibleRange.start) / visibleDuration) * availableWidth;
            }
            this.elements.startBoundary.setAttribute('x1', xStart);
            this.elements.startBoundary.setAttribute('x2', xStart);
            this.elements.startBoundary.style.display = '';
        } else {
            this.elements.startBoundary.style.display = 'none';
        }

        // Update end boundary
        if (this.fullRange.end >= this.visibleRange.start) {
            let xEnd;
            if (this.fullRange.end > this.visibleRange.end) {
                xEnd = padding + availableWidth;
            } else {
                xEnd = padding + ((this.fullRange.end - this.visibleRange.start) / visibleDuration) * availableWidth;
            }
            this.elements.endBoundary.setAttribute('x1', xEnd);
            this.elements.endBoundary.setAttribute('x2', xEnd);
            this.elements.endBoundary.style.display = '';
        } else {
            this.elements.endBoundary.style.display = 'none';
        }

        // Update no-data zone (left) - when visibleRange extends before fullRange
        if (this.visibleRange.start < this.fullRange.start) {
            const noDataLeftEnd = padding + ((this.fullRange.start - this.visibleRange.start) / visibleDuration) * availableWidth;
            this.elements.noDataLeftRect.setAttribute('x', padding);
            this.elements.noDataLeftRect.setAttribute('width', Math.max(0, noDataLeftEnd - padding));
            this.elements.noDataLeftRect.style.display = '';
        } else {
            this.elements.noDataLeftRect.style.display = 'none';
        }

        // Update no-data zone (right) - when visibleRange extends after fullRange
        if (this.visibleRange.end > this.fullRange.end) {
            const noDataRightStart = padding + ((this.fullRange.end - this.visibleRange.start) / visibleDuration) * availableWidth;
            this.elements.noDataRightRect.setAttribute('x', noDataRightStart);
            this.elements.noDataRightRect.setAttribute('width', Math.max(0, padding + availableWidth - noDataRightStart));
            this.elements.noDataRightRect.style.display = '';
        } else {
            this.elements.noDataRightRect.style.display = 'none';
        }

        // Update truncated zone (left) - when data was cut from beginning (latest=true)
        if (this.truncation.wasTruncated && this.truncation.leftZone) {
            const truncStart = padding + ((this.truncation.leftZone.start - this.visibleRange.start) / visibleDuration) * availableWidth;
            const truncEnd = padding + ((this.truncation.leftZone.end - this.visibleRange.start) / visibleDuration) * availableWidth;
            // Clamp to visible area
            const clampedStart = Math.max(padding, Math.min(padding + availableWidth, truncStart));
            const clampedEnd = Math.max(padding, Math.min(padding + availableWidth, truncEnd));
            const truncWidth = clampedEnd - clampedStart;

            if (truncWidth > 0) {
                this.elements.truncatedLeftRect.setAttribute('x', clampedStart);
                this.elements.truncatedLeftRect.setAttribute('width', truncWidth);
                this.elements.truncatedLeftRect.style.display = '';
            } else {
                this.elements.truncatedLeftRect.style.display = 'none';
            }
        } else {
            this.elements.truncatedLeftRect.style.display = 'none';
        }

        // Update truncated zone (right) - when data was cut from end (latest=false)
        if (this.truncation.wasTruncated && this.truncation.rightZone) {
            const truncStart = padding + ((this.truncation.rightZone.start - this.visibleRange.start) / visibleDuration) * availableWidth;
            const truncEnd = padding + ((this.truncation.rightZone.end - this.visibleRange.start) / visibleDuration) * availableWidth;
            // Clamp to visible area
            const clampedStart = Math.max(padding, Math.min(padding + availableWidth, truncStart));
            const clampedEnd = Math.max(padding, Math.min(padding + availableWidth, truncEnd));
            const truncWidth = clampedEnd - clampedStart;

            if (truncWidth > 0) {
                this.elements.truncatedRightRect.setAttribute('x', clampedStart);
                this.elements.truncatedRightRect.setAttribute('width', truncWidth);
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
    drawTicks() {
        const { width, height, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        // Use visible range for both positioning and step calculation
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;

        // Safety check: prevent division by zero
        if (visibleDuration <= 0) {
            console.warn('SVGTimeline: visibleDuration is zero or negative, skipping tick drawing');
            return;
        }

        // Get adaptive step based on VISIBLE duration and available width
        const step = this.calculateAdaptiveStep(visibleDuration, availableWidth);

        // Round visible range to nearest step interval
        const roundedStart = Math.floor(this.visibleRange.start / step.value) * step.value;

        // Store major tick positions for collision detection
        const majorTickPositions = new Set();

        // Draw major ticks at discrete intervals within visible range
        let timestamp = roundedStart;
        while (timestamp <= this.visibleRange.end) {
            if (timestamp >= this.visibleRange.start) {
                // Calculate position relative to VISIBLE range (not full range!)
                const x = padding + ((timestamp - this.visibleRange.start) / visibleDuration) * availableWidth;
                majorTickPositions.add(Math.round(timestamp));

                // Major tick - bottom (compact)
                this.drawTick(x, height - 6, 4, '#767676');

                // Label - centered vertically (compact) with format from step
                this.drawLabel(x, height / 2 + 3, this.formatTime(timestamp, step.format));
            }
            timestamp += step.value;
        }

        // Draw minor ticks between major ones (5 per interval)
        let minorTimestamp = roundedStart;
        const minorStep = step.value / 5;
        while (minorTimestamp <= this.visibleRange.end) {
            if (minorTimestamp >= this.visibleRange.start) {
                // Check if this is not a major tick position
                const roundedMinorTimestamp = Math.round(minorTimestamp);
                if (!majorTickPositions.has(roundedMinorTimestamp)) {
                    // Calculate position relative to VISIBLE range
                    const x = padding + ((minorTimestamp - this.visibleRange.start) / visibleDuration) * availableWidth;
                    // Minor tick - shorter and lighter
                    this.drawTick(x, height - 5, 2, '#d4d4d5');
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
    drawTick(x, y, height, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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
    drawLabel(x, y, text) {
        // Create white background rectangle for label
        const bbox = this.getTextBBox(text);
        const padding = 3;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', x - (bbox.width / 2) - padding);
        bg.setAttribute('y', y - bbox.height + 2);
        bg.setAttribute('width', bbox.width + (padding * 2));
        bg.setAttribute('height', bbox.height);
        bg.setAttribute('fill', '#fafafa');
        this.layers.ticks.appendChild(bg);

        // Create text label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
    getTextBBox(text) {
        // Approximate size based on font size and character count
        const fontSize = 11;
        // Use monospace width for time labels (seconds format is longer)
        const charWidth = text.includes(':') ? 6.5 : 6; // Wider for time formats
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
    formatTime(timestamp, format = 'HH:MM') {
        // Create date from UTC timestamp, then add server offset to get milliseconds
        // serverTimezoneOffset is in seconds, timestamp is in seconds
        const serverTimeMs = (timestamp + this.serverTimezoneOffset) * 1000;
        const date = new Date(serverTimeMs);

        if (format === 'MM-DD') {
            // Format as month-day for long ranges
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${month}-${day}`;
        } else if (format === 'HH:MM:SS') {
            // Format as time with seconds for very short ranges
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        } else {
            // Format as time (HH:MM) for shorter ranges
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    },

    /**
     * Attach mouse events
     */
    attachEvents() {
        // Store bound handlers for cleanup in destroy()
        this._boundMouseDown = (e) => this.handleMouseDown(e);
        this._boundMouseMove = (e) => this.handleMouseMove(e);
        this._boundMouseUp = () => this.handleMouseUp();
        this._boundZoneClick = (e) => this.handleZoneClick(e);

        this.svg.addEventListener('mousedown', this._boundMouseDown);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);

        // Handle click on truncated zone
        this.svg.addEventListener('click', this._boundZoneClick);
    },

    /**
     * Handle click on zone elements (truncated zones)
     * @param {MouseEvent} e - Mouse event
     */
    handleZoneClick(e) {
        const target = e.target;
        const zone = target.getAttribute('data-zone');

        if (zone === 'truncated-left' && this.truncation.leftZone) {
            if (this.onTruncatedZoneClick) {
                // Left zone: data was cut from beginning (latest=true used)
                // To load this zone, we need latest=true to get entries from end of interval
                this.onTruncatedZoneClick(
                    Math.round(this.truncation.leftZone.start),
                    Math.round(this.truncation.leftZone.end),
                    true // isLeftZone = true → use latest=true
                );
            }
        } else if (zone === 'truncated-right' && this.truncation.rightZone) {
            if (this.onTruncatedZoneClick) {
                // Right zone: data was cut from end (latest=false used)
                // To load this zone, we need latest=false to get entries from start of interval
                this.onTruncatedZoneClick(
                    Math.round(this.truncation.rightZone.start),
                    Math.round(this.truncation.rightZone.end),
                    false // isLeftZone = false → use latest=false
                );
            }
        }
    },

    /**
     * Handle mouse down
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        const target = e.target;
        const handle = target.getAttribute('data-handle');

        if (!handle) return;

        this.dragging.active = true;
        this.dragging.handle = handle;
        this.dragging.startX = e.clientX;
        this.dragging.startSelectedStart = this.selectedRange.start;
        this.dragging.startSelectedEnd = this.selectedRange.end;

        const rect = this.container.getBoundingClientRect();
        this.dragging.containerLeft = rect.left;
        this.dragging.containerWidth = rect.width;

        e.preventDefault();
    },

    /**
     * Handle mouse move (Yandex Cloud LogViewer style)
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.dragging.active) return;

        const deltaX = e.clientX - this.dragging.startX;
        const { padding } = this.dimensions;
        const availableWidth = this.dragging.containerWidth - (padding * 2);
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;

        // Safety check: prevent division by zero
        if (visibleDuration <= 0 || availableWidth <= 0) {
            console.warn('SVGTimeline: Invalid dimensions for mouse move calculation');
            return;
        }

        // Calculate time delta relative to VISIBLE range
        const deltaTime = (deltaX / availableWidth) * visibleDuration;

        if (this.dragging.handle === 'left') {
            // Resizing from left - allow free movement
            let newStart = this.dragging.startSelectedStart + deltaTime;
            // Only enforce minimum width of 60 seconds
            newStart = Math.min(newStart, this.selectedRange.end - 60);
            this.selectedRange.start = newStart;
        } else if (this.dragging.handle === 'right') {
            // Resizing from right - allow free movement
            let newEnd = this.dragging.startSelectedEnd + deltaTime;
            // Only enforce minimum width of 60 seconds
            newEnd = Math.max(newEnd, this.selectedRange.start + 60);
            this.selectedRange.end = newEnd;
        } else if (this.dragging.handle === 'range') {
            // Dragging entire range - allow free movement
            let newStart = this.dragging.startSelectedStart + deltaTime;
            let newEnd = this.dragging.startSelectedEnd + deltaTime;

            // No bounds checking - allow dragging anywhere
            this.selectedRange.start = newStart;
            this.selectedRange.end = newEnd;
        }

        // Only update dynamic elements during drag (no ticks redraw)
        // This enables smooth CSS transitions
        this.updateDynamicElements();
    },

    /**
     * Handle mouse up (Yandex Cloud LogViewer style)
     * After drag: preserve user's manual selection and adjust visible range
     */
    handleMouseUp() {
        if (this.dragging.active) {
            const wasResizing = this.dragging.handle === 'left' || this.dragging.handle === 'right';
            const wasDragging = this.dragging.handle === 'range';
            const draggedHandle = this.dragging.handle; // Save before reset

            this.dragging.active = false;
            this.dragging.handle = null;

            if (wasResizing) {
                // User resized selection → adjust visible range to be 4x selection
                // PRESERVE user's manual selection (do NOT recalculate it!)
                const selectedDuration = this.selectedRange.end - this.selectedRange.start;
                const newVisibleDuration = selectedDuration * 4;
                const selectedCenter = this.selectedRange.start + (selectedDuration / 2);

                // Calculate new visible range centered on selection
                // NOTE: Allow visibleRange to extend BEYOND fullRange to maintain 1/4 ratio
                const newVisibleStart = selectedCenter - (newVisibleDuration / 2);
                const newVisibleEnd = selectedCenter + (newVisibleDuration / 2);

                this.visibleRange.start = newVisibleStart;
                this.visibleRange.end = newVisibleEnd;

                // Do NOT call calculateCenteredSelection() here!
                // The user's manual selection (e.g., 9:45-9:50) must be preserved

                // Deactivate all period buttons
                if (typeof $ !== 'undefined') {
                    $('.period-btn').removeClass('active');
                }

            } else if (wasDragging) {
                // User dragged selection → shift visible range to keep selection centered
                // PRESERVE user's manual selection (do NOT recalculate it!)
                const selectedCenter = this.selectedRange.start + ((this.selectedRange.end - this.selectedRange.start) / 2);
                const visibleDuration = this.visibleRange.end - this.visibleRange.start;

                // Calculate new visible range to keep selection at center
                // NOTE: Allow visibleRange to extend BEYOND fullRange
                const newVisibleStart = selectedCenter - (visibleDuration / 2);
                const newVisibleEnd = selectedCenter + (visibleDuration / 2);

                this.visibleRange.start = newVisibleStart;
                this.visibleRange.end = newVisibleEnd;

                // Do NOT call calculateCenteredSelection() here!
                // The user's manual selection must be preserved
            }

            // Render with new ranges
            this.render();

            // Trigger callback to load data with user's selected range
            if (this.onRangeChange) {
                this.onRangeChange(
                    Math.round(this.selectedRange.start),
                    Math.round(this.selectedRange.end),
                    draggedHandle
                );
            }
        }
    },

    /**
     * Handle window resize
     */
    handleResize() {
        this.render();
    },

    /**
     * Apply period from quick-period-buttons (Yandex Cloud style)
     * Sets visible range and auto-centers selection
     * @param {number} periodSeconds - Period in seconds (e.g., 3600 for 1h)
     */
    applyPeriod(periodSeconds) {
        const period = parseInt(periodSeconds);

        // Set visible range to last N seconds
        this.visibleRange.end = this.fullRange.end;
        this.visibleRange.start = Math.max(this.fullRange.end - period, this.fullRange.start);

        // Auto-center selection (1/4 of visible range)
        this.calculateCenteredSelection();

        // Render
        this.render();

        // Trigger callback to load data
        if (this.onRangeChange) {
            this.onRangeChange(
                Math.round(this.selectedRange.start),
                Math.round(this.selectedRange.end)
            );
        }
    },

    /**
     * Set selected range explicitly (without auto-centering or triggering onRangeChange)
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    setRange(start, end) {
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
    updateSelectedRange(start, end) {
        // Ensure minimum duration to prevent division by zero
        const MIN_DURATION = 60; // 1 minute minimum
        if (end - start < MIN_DURATION) {
            // Expand range symmetrically around the single timestamp
            const center = start;
            start = center - (MIN_DURATION / 2);
            end = center + (MIN_DURATION / 2);
        }

        // Set selected range to actual loaded data
        this.selectedRange.start = start;
        this.selectedRange.end = end;

        // Calculate new visible range as 4x of selected range
        const selectedDuration = end - start;
        const newVisibleDuration = selectedDuration * 4;
        const selectedCenter = start + (selectedDuration / 2);

        // Center visible range around selected range
        // NOTE: visibleRange can extend BEYOND fullRange to maintain 1/4 ratio
        // This creates empty space around the actual data
        const newVisibleStart = selectedCenter - (newVisibleDuration / 2);
        const newVisibleEnd = selectedCenter + (newVisibleDuration / 2);

        // Update visible range (no bounds check - allow extending beyond fullRange)
        this.visibleRange.start = newVisibleStart;
        this.visibleRange.end = newVisibleEnd;

        // Render with new ranges
        this.render();

        // Note: Does NOT trigger onRangeChange callback
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
    updateFromServerResponse(actualRange, requestedStart, requestedEnd, isInitialLoad = false) {
        // Store what was requested
        this.requestedRange.start = requestedStart;
        this.requestedRange.end = requestedEnd;

        // Reset truncation info
        this.truncation.wasTruncated = false;
        this.truncation.linesCount = 0;
        this.truncation.direction = null;
        this.truncation.leftZone = null;
        this.truncation.rightZone = null;

        // Calculate truncation zone if data was truncated
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
        }

        // Call existing updateSelectedRange logic for the rest
        // Ensure minimum duration to prevent division by zero
        let start = actualRange.start;
        let end = actualRange.end;
        const MIN_DURATION = 60; // 1 minute minimum

        if (end - start < MIN_DURATION) {
            const center = start;
            start = center - (MIN_DURATION / 2);
            end = center + (MIN_DURATION / 2);
        }

        // Set selected range to actual loaded data
        this.selectedRange.start = start;
        this.selectedRange.end = end;

        // Calculate what new visible range would be based on actual data (4x of selected)
        const selectedDuration = end - start;
        const newVisibleDuration = selectedDuration * 4;
        const selectedCenter = start + (selectedDuration / 2);
        let newVisibleStart = selectedCenter - (newVisibleDuration / 2);
        let newVisibleEnd = selectedCenter + (newVisibleDuration / 2);

        // IMPORTANT: Preserve entire visibleRange if it was extended to current time
        // This ensures no-data zone displays correctly after refresh
        // When user clicks refresh, they want to see timeline up to current time
        // Preserve both position AND duration to prevent shrinking the visible area
        const currentVisibleDuration = this.visibleRange.end - this.visibleRange.start;
        if (this.visibleRange.end > newVisibleEnd || this.visibleRange.end > end) {
            // Keep the existing visibleRange entirely (both duration and end position)
            // Only selectedRange was updated above to show where actual data is
            // The gap between fullRange.end and visibleRange.end will show as no-data zone
            newVisibleEnd = this.visibleRange.end;
            newVisibleStart = this.visibleRange.start;
        }

        this.visibleRange.start = newVisibleStart;
        this.visibleRange.end = newVisibleEnd;

        // Render with new ranges
        this.render();

        // Initialize popups after render (elements now exist in DOM)
        this.initializeZonePopups();
    },

    /**
     * Initialize Semantic UI popups for zone elements
     * Destroys existing popups before re-initialization to prevent leaks
     */
    initializeZonePopups() {
        // Check if jQuery and popup are available
        if (typeof $ === 'undefined' || typeof $.fn.popup === 'undefined') {
            return;
        }

        const noDataContent = globalTranslate.sd_NoDataForPeriod || 'No data available for this period';
        const truncatedContent = globalTranslate.sd_DataTruncatedClickToLoad || 'Data truncated (5000 lines limit). Click to load.';
        const popupSettings = { position: 'top center', variation: 'mini' };

        // Popup for no-data zones
        [this.elements.noDataLeftRect, this.elements.noDataRightRect].forEach((el) => {
            if (el) {
                $(el).popup('destroy').popup({ ...popupSettings, content: noDataContent });
            }
        });

        // Popup for truncated zones
        [this.elements.truncatedLeftRect, this.elements.truncatedRightRect].forEach((el) => {
            if (el) {
                $(el).popup('destroy').popup({ ...popupSettings, content: truncatedContent });
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
    onTruncatedZoneClick(start, end, isLeftZone) {
        // To be overridden
    },

    /**
     * Callback when range changes
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    onRangeChange(start, end) {
        // To be overridden
    },

    /**
     * Set the visible range end to specific timestamp (for refresh mode)
     * This is called BEFORE server request to set where timeline should end
     * Only updates visibleRange, NOT selectedRange or fullRange
     * @param {number} newEnd - New end timestamp for visible range
     * @param {boolean} force - If true, always set even if newEnd <= current end
     */
    extendRange(newEnd, force = false) {
        if (!force && newEnd <= this.visibleRange.end) {
            return; // No need to extend
        }

        // Only update visible range, NOT fullRange or selectedRange
        // fullRange represents actual data in log file
        // selectedRange represents the actual data period (not projected future)
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        this.visibleRange.end = newEnd;
        this.visibleRange.start = newEnd - visibleDuration;

        // DO NOT shift selectedRange - it should remain bound to actual data
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
    updateDataBoundary(actualEnd) {
        if (actualEnd > this.fullRange.end) {
            this.fullRange.end = actualEnd;
            this.render();
        }
    },

    /**
     * Destroy timeline
     */
    destroy() {
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
