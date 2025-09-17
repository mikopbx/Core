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

/* global $, globalTranslate, SoundFilesAPI, Form, DynamicDropdownBuilder, SecurityUtils */

/**
 * SoundFileSelector - Audio-specific extension of DynamicDropdownBuilder
 * 
 * This component builds upon DynamicDropdownBuilder to add audio-specific features:
 * - Built-in audio playback functionality
 * - Play/pause button integration
 * - Support for custom/moh sound file categories
 * - Audio preview capabilities
 * 
 * Usage:
 * SoundFileSelector.init('audio_message_id', {
 *     category: 'custom',           // File category (custom/moh)
 *     includeEmpty: true,           // Show empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module SoundFileSelector
 */
var SoundFileSelector = {
  /**
   * Active selector instances with audio capabilities
   * @type {Map}
   */
  instances: new Map(),

  /**
   * Global audio player element
   * @type {HTMLAudioElement|null}
   */
  audioPlayer: null,

  /**
   * Currently playing file ID
   * @type {string|null}
   */
  currentlyPlayingId: null,

  /**
   * Default configuration
   * @type {object}
   */
  defaults: {
    category: 'custom',
    // Sound file category (custom/moh)
    includeEmpty: true,
    // Include empty/none option
    placeholder: null,
    // Placeholder text (auto-detected)
    showPlayButton: true,
    // Show play button
    showAddButton: true,
    // Show add new file button
    onChange: null,
    // Change callback function
    onPlay: null // Play callback function

  },

  /**
   * Initialize sound file selector
   * 
   * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
   * @param {object} options - Configuration options
   * @returns {object|null} Selector instance
   */
  init: function init(fieldId) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    // Check if already initialized
    if (this.instances.has(fieldId)) {
      return this.instances.get(fieldId);
    } // Find hidden input element


    var $hiddenInput = $("#".concat(fieldId));

    if (!$hiddenInput.length) {
      return null;
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Get current value and represent text from data object if provided


    var currentValue = options.data && options.data[fieldId] || $hiddenInput.val() || config.defaultValue || '';
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Create dropdown configuration for DynamicDropdownBuilder

    var dropdownConfig = {
      apiUrl: "/pbxcore/api/v3/sound-files:getForSelect",
      apiParams: {
        category: config.category,
        includeEmpty: config.includeEmpty ? 'true' : 'false'
      },
      placeholder: config.placeholder || globalTranslate.sf_SelectAudioFile || 'Select audio file',
      onChange: function onChange(value, text, $choice) {
        _this.handleSelectionChange(fieldId, value, text, $choice, config);
      }
    }; // Build dropdown using DynamicDropdownBuilder

    var dropdownData = _defineProperty({}, fieldId, currentValue); // Add represent text if available and we have a value


    if (currentValue && currentText) {
      dropdownData["".concat(fieldId, "_represent")] = currentText;
    }

    DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig); // Create instance for audio functionality

    var instance = {
      fieldId: fieldId,
      config: config,
      currentValue: currentValue,
      currentText: currentText,
      $hiddenInput: $hiddenInput,
      playButton: null,
      addButton: null
    }; // Initialize audio-specific features

    this.initializeAudioFeatures(instance); // Store instance

    this.instances.set(fieldId, instance);
    return instance;
  },

  /**
   * Detect initial text from data object or dropdown
   * 
   * @param {string} fieldId - Field ID
   * @param {object} data - Data object with represent fields
   * @returns {string|null} Initial text
   */
  detectInitialText: function detectInitialText(fieldId, data) {
    if (data && data["".concat(fieldId, "_represent")]) {
      return data["".concat(fieldId, "_represent")];
    } // Try to get from existing dropdown text


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $text = $dropdown.find('.text:not(.default)');

      if ($text.length && $text.text().trim()) {
        return $text.html();
      }
    }

    return null;
  },

  /**
   * Handle dropdown selection change
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Selected value
   * @param {string} text - Selected text
   * @param {jQuery} $choice - Selected choice element
   * @param {object} config - Configuration
   */
  handleSelectionChange: function handleSelectionChange(fieldId, value, text, $choice, config) {
    var instance = this.instances.get(fieldId);
    if (!instance) return; // Update instance state

    instance.currentValue = value;
    instance.currentText = text; // CRITICAL: Update hidden input field to maintain synchronization

    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Update play button state


    this.updatePlayButtonState(instance); // Call custom onChange if provided

    if (typeof config.onChange === 'function') {
      config.onChange(value, text, $choice);
    } // Notify form of changes


    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Initialize audio-specific features
   * 
   * @param {object} instance - Selector instance
   */
  initializeAudioFeatures: function initializeAudioFeatures(instance) {
    // Initialize global audio player
    this.initializeAudioPlayer(); // Find and initialize buttons

    this.initializeButtons(instance); // Update initial button state

    this.updatePlayButtonState(instance);
  },

  /**
   * Initialize control buttons (play/add)
   * 
   * @param {object} instance - Selector instance
   */
  initializeButtons: function initializeButtons(instance) {
    var _this2 = this;

    var fieldId = instance.fieldId,
        config = instance.config; // Find button container by looking near the dropdown

    var $dropdown = $("#".concat(fieldId, "-dropdown"));
    if (!$dropdown.length) return; // Look for buttons in the same parent container (unstackable fields)

    var $buttonContainer = $dropdown.closest('.unstackable.fields').find('.ui.buttons'); // Fallback: look in the same field

    if (!$buttonContainer.length) {
      $buttonContainer = $dropdown.closest('.field').find('.ui.buttons');
    }

    if ($buttonContainer.length > 0) {
      // Initialize play button
      if (config.showPlayButton) {
        instance.playButton = $buttonContainer.find('.action-playback-button').first();

        if (instance.playButton.length > 0) {
          instance.playButton.off('click').on('click', function (e) {
            e.preventDefault();

            _this2.handlePlayClick(instance);
          });
        }
      } // Find add button (no additional handling needed - has href)


      if (config.showAddButton) {
        instance.addButton = $buttonContainer.find('a[href*="sound-files/modify"]').first();
      }
    }
  },

  /**
   * Initialize audio player
   */
  initializeAudioPlayer: function initializeAudioPlayer() {
    var _this3 = this;

    if (!this.audioPlayer) {
      this.audioPlayer = document.createElement('audio');
      this.audioPlayer.preload = 'none';
      this.audioPlayer.style.display = 'none';
      document.body.appendChild(this.audioPlayer); // Handle play/pause events

      this.audioPlayer.addEventListener('ended', function () {
        _this3.stopPlayback();
      });
      this.audioPlayer.addEventListener('error', function (e) {
        _this3.stopPlayback();
      });
    }
  },

  /**
   * Handle play button click
   * 
   * @param {object} instance - Selector instance
   */
  handlePlayClick: function handlePlayClick(instance) {
    var currentValue = instance.currentValue,
        config = instance.config,
        playButton = instance.playButton;

    if (!currentValue || currentValue === '-1' || currentValue === -1) {
      return;
    } // Check if already playing this file


    if (this.currentlyPlayingId === currentValue && !this.audioPlayer.paused) {
      this.stopPlayback();
      return;
    } // Stop any current playback


    this.stopPlayback(); // Update UI to show pause icon

    if (playButton) {
      playButton.find('i').removeClass('play').addClass('pause');
    } // Get file path and play


    this.playFile(currentValue, instance); // Call custom onPlay callback

    if (typeof config.onPlay === 'function') {
      config.onPlay(currentValue);
    }
  },

  /**
   * Play sound file
   * 
   * @param {string} fileId - File ID to play
   * @param {object} instance - Selector instance
   */
  playFile: function playFile(fileId, instance) {
    var _this4 = this;

    // Get file record to get the path
    SoundFilesAPI.getRecord(fileId, function (response) {
      if (response.result && response.data && response.data.path) {
        _this4.currentlyPlayingId = fileId;
        _this4.audioPlayer.src = "/pbxcore/api/v3/sound-files:playback?view=".concat(encodeURIComponent(response.data.path));

        _this4.audioPlayer.play()["catch"](function (error) {
          _this4.stopPlayback();
        });
      } else {
        // If failed to get file info, revert icon back to play
        if (instance.playButton) {
          instance.playButton.find('i').removeClass('pause').addClass('play');
        }
      }
    });
  },

  /**
   * Stop audio playback
   */
  stopPlayback: function stopPlayback() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }

    this.currentlyPlayingId = null; // Update all play buttons back to play icon

    this.instances.forEach(function (instance) {
      if (instance.playButton) {
        instance.playButton.find('i').removeClass('pause').addClass('play');
      }
    });
  },

  /**
   * Update play button state based on current selection
   * 
   * @param {object} instance - Selector instance
   */
  updatePlayButtonState: function updatePlayButtonState(instance) {
    if (!instance.playButton || !instance.playButton.length) return;
    var currentValue = instance.currentValue;

    if (!currentValue || currentValue === '' || currentValue === '-') {
      // Disable button and ensure play icon
      instance.playButton.addClass('disabled');
      instance.playButton.find('i').removeClass('pause').addClass('play');
    } else {
      // Enable button
      instance.playButton.removeClass('disabled'); // Set appropriate icon based on playback state

      if (this.currentlyPlayingId === currentValue && !this.audioPlayer.paused) {
        instance.playButton.find('i').removeClass('play').addClass('pause');
      } else {
        instance.playButton.find('i').removeClass('pause').addClass('play');
      }
    }
  },

  /**
   * Set value programmatically
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Value to set
   * @param {string} text - Display text (optional)
   */
  setValue: function setValue(fieldId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(fieldId);

    if (!instance) {
      return;
    } // Use DynamicDropdownBuilder to set the value


    DynamicDropdownBuilder.setValue(fieldId, value); // Update instance state

    instance.currentValue = value;
    instance.currentText = text || ''; // Update play button state

    this.updatePlayButtonState(instance);
  },

  /**
   * Get current value
   * 
   * @param {string} fieldId - Field ID
   * @returns {string|null} Current value
   */
  getValue: function getValue(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance ? instance.currentValue : null;
  },

  /**
   * Refresh dropdown data
   * 
   * @param {string} fieldId - Field ID
   */
  refresh: function refresh(fieldId) {
    // Delegate to DynamicDropdownBuilder
    // (DynamicDropdownBuilder would need a refresh method)
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('refresh');
    }
  },

  /**
   * Destroy instance
   * 
   * @param {string} fieldId - Field ID
   */
  destroy: function destroy(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Stop playback if playing
      if (this.currentlyPlayingId === instance.currentValue) {
        this.stopPlayback();
      } // Remove event handlers


      if (instance.playButton) {
        instance.playButton.off('click');
      } // Remove from instances


      this.instances["delete"](fieldId);
    }
  },

  /**
   * Clear dropdown selection
   * 
   * @param {string} fieldId - Field ID
   */
  clear: function clear(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Use DynamicDropdownBuilder to clear
      DynamicDropdownBuilder.clear(fieldId); // Update instance state

      instance.currentValue = null;
      instance.currentText = null; // Update play button state

      this.updatePlayButtonState(instance);
    }
  },

  /**
   * Clear cache for sound files API
   * Call this after sound file operations (add/edit/delete)
   * @param {string} category - Optional: specific category to clear ('custom', 'moh')
   */
  clearCache: function clearCache() {
    var category = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    if (category) {
      // Clear cache for specific category
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect', {
        category: category
      });
    } else {
      // Clear all sound files cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect');
    }
  },

  /**
   * Refresh all sound file dropdowns on the page
   * This will force them to reload data from server
   * @param {string} category - Optional: specific category to refresh ('custom', 'moh')
   */
  refreshAll: function refreshAll() {
    var category = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(category); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!category || instance.config.category === category) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Reinitialize dropdown to trigger new API request

        var $dropdown = $("#".concat(fieldId, "-dropdown"));

        if ($dropdown.length) {
          $dropdown.dropdown('refresh');
        }
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwib25DaGFuZ2UiLCJvblBsYXkiLCJpbml0IiwiZmllbGRJZCIsIm9wdGlvbnMiLCJoYXMiLCJnZXQiLCIkaGlkZGVuSW5wdXQiLCIkIiwibGVuZ3RoIiwiY29uZmlnIiwiY3VycmVudFZhbHVlIiwiZGF0YSIsInZhbCIsImRlZmF1bHRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiZGV0ZWN0SW5pdGlhbFRleHQiLCJkcm9wZG93bkNvbmZpZyIsImFwaVVybCIsImFwaVBhcmFtcyIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1NlbGVjdEF1ZGlvRmlsZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJoYW5kbGVTZWxlY3Rpb25DaGFuZ2UiLCJkcm9wZG93bkRhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImluc3RhbmNlIiwicGxheUJ1dHRvbiIsImFkZEJ1dHRvbiIsImluaXRpYWxpemVBdWRpb0ZlYXR1cmVzIiwic2V0IiwiJGRyb3Bkb3duIiwiJHRleHQiLCJmaW5kIiwidHJpbSIsImh0bWwiLCJ1cGRhdGVQbGF5QnV0dG9uU3RhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQXVkaW9QbGF5ZXIiLCJpbml0aWFsaXplQnV0dG9ucyIsIiRidXR0b25Db250YWluZXIiLCJjbG9zZXN0IiwiZmlyc3QiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhbmRsZVBsYXlDbGljayIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInByZWxvYWQiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwic3RvcFBsYXliYWNrIiwicGF1c2VkIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBsYXlGaWxlIiwiZmlsZUlkIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicGF0aCIsInNyYyIsImVuY29kZVVSSUNvbXBvbmVudCIsInBsYXkiLCJlcnJvciIsInBhdXNlIiwiY3VycmVudFRpbWUiLCJmb3JFYWNoIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsInJlZnJlc2giLCJkcm9wZG93biIsImRlc3Ryb3kiLCJjbGVhciIsImNsZWFyQ2FjaGUiLCJjbGVhckNhY2hlRm9yIiwicmVmcmVzaEFsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTlc7O0FBUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQVpTOztBQWN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxJQWxCRTs7QUFvQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxRQUFRLEVBQUUsUUFESjtBQUNvQjtBQUMxQkMsSUFBQUEsWUFBWSxFQUFFLElBRlI7QUFFb0I7QUFDMUJDLElBQUFBLFdBQVcsRUFBRSxJQUhQ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QyxRQUFBQSxzQkFBc0IsQ0FBQ3dELEtBQXZCLENBQTZCaEYsT0FBN0IsRUFGb0QsQ0FJcEQ7O0FBQ0EsWUFBTStCLFNBQVMsR0FBRzFCLENBQUMsWUFBS0wsT0FBTCxlQUFuQjs7QUFDQSxZQUFJK0IsU0FBUyxDQUFDekIsTUFBZCxFQUFzQjtBQUNsQnlCLFVBQUFBLFNBQVMsQ0FBQytDLFFBQVYsQ0FBbUIsU0FBbkI7QUFDSDtBQUNKO0FBQ0osS0FYRDtBQVlIO0FBL2RxQixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIFNvdW5kRmlsZXNBUEksIEZvcm0sIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBTb3VuZEZpbGVTZWxlY3RvciAtIEF1ZGlvLXNwZWNpZmljIGV4dGVuc2lvbiBvZiBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gKiBcbiAqIFRoaXMgY29tcG9uZW50IGJ1aWxkcyB1cG9uIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gYWRkIGF1ZGlvLXNwZWNpZmljIGZlYXR1cmVzOlxuICogLSBCdWlsdC1pbiBhdWRpbyBwbGF5YmFjayBmdW5jdGlvbmFsaXR5XG4gKiAtIFBsYXkvcGF1c2UgYnV0dG9uIGludGVncmF0aW9uXG4gKiAtIFN1cHBvcnQgZm9yIGN1c3RvbS9tb2ggc291bmQgZmlsZSBjYXRlZ29yaWVzXG4gKiAtIEF1ZGlvIHByZXZpZXcgY2FwYWJpbGl0aWVzXG4gKiBcbiAqIFVzYWdlOlxuICogU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAqICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgICAgICAvLyBGaWxlIGNhdGVnb3J5IChjdXN0b20vbW9oKVxuICogICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgICAgIC8vIFNob3cgZW1wdHkgb3B0aW9uXG4gKiAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4geyAuLi4gfSAgLy8gQ2hhbmdlIGNhbGxiYWNrXG4gKiB9KTtcbiAqIFxuICogQG1vZHVsZSBTb3VuZEZpbGVTZWxlY3RvclxuICovXG5jb25zdCBTb3VuZEZpbGVTZWxlY3RvciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgc2VsZWN0b3IgaW5zdGFuY2VzIHdpdGggYXVkaW8gY2FwYWJpbGl0aWVzXG4gICAgICogQHR5cGUge01hcH1cbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHbG9iYWwgYXVkaW8gcGxheWVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7SFRNTEF1ZGlvRWxlbWVudHxudWxsfVxuICAgICAqL1xuICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBwbGF5aW5nIGZpbGUgSURcbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgY3VycmVudGx5UGxheWluZ0lkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLCAgICAgICAvLyBTb3VuZCBmaWxlIGNhdGVnb3J5IChjdXN0b20vbW9oKVxuICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgIC8vIEluY2x1ZGUgZW1wdHkvbm9uZSBvcHRpb25cbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgICAgICBzaG93UGxheUJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgcGxheSBidXR0b25cbiAgICAgICAgc2hvd0FkZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBTaG93IGFkZCBuZXcgZmlsZSBidXR0b25cbiAgICAgICAgb25DaGFuZ2U6IG51bGwsICAgICAgICAgICAvLyBDaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgb25QbGF5OiBudWxsLCAgICAgICAgICAgIC8vIFBsYXkgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSUQgKGUuZy4sICdhdWRpb19tZXNzYWdlX2lkJylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KGZpZWxkSWQsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgaGlkZGVuIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgYW5kIHJlcHJlc2VudCB0ZXh0IGZyb20gZGF0YSBvYmplY3QgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGFbZmllbGRJZF0pIHx8ICRoaWRkZW5JbnB1dC52YWwoKSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9IHRoaXMuZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgb3B0aW9ucy5kYXRhKSB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gY29uZmlndXJhdGlvbiBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3RgLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNvbmZpZy5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGNvbmZpZy5pbmNsdWRlRW1wdHkgPyAndHJ1ZScgOiAnZmFsc2UnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlciB8fCBnbG9iYWxUcmFuc2xhdGUuc2ZfU2VsZWN0QXVkaW9GaWxlIHx8ICdTZWxlY3QgYXVkaW8gZmlsZScsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IHtcbiAgICAgICAgICAgIFtmaWVsZElkXTogY3VycmVudFZhbHVlXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVwcmVzZW50IHRleHQgaWYgYXZhaWxhYmxlIGFuZCB3ZSBoYXZlIGEgdmFsdWVcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiBjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgZHJvcGRvd25EYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdID0gY3VycmVudFRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGRJZCwgZHJvcGRvd25EYXRhLCBkcm9wZG93bkNvbmZpZyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2UgZm9yIGF1ZGlvIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgY3VycmVudFRleHQsXG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQsXG4gICAgICAgICAgICBwbGF5QnV0dG9uOiBudWxsLFxuICAgICAgICAgICAgYWRkQnV0dG9uOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvLXNwZWNpZmljIGZlYXR1cmVzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBpbml0aWFsIHRleHQgZnJvbSBkYXRhIG9iamVjdCBvciBkcm9wZG93blxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0IHdpdGggcmVwcmVzZW50IGZpZWxkc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gSW5pdGlhbCB0ZXh0XG4gICAgICovXG4gICAgZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGV4aXN0aW5nIGRyb3Bkb3duIHRleHRcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Om5vdCguZGVmYXVsdCknKTtcbiAgICAgICAgICAgIGlmICgkdGV4dC5sZW5ndGggJiYgJHRleHQudGV4dCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFNlbGVjdGVkIHRleHRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGNob2ljZSAtIFNlbGVjdGVkIGNob2ljZSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBoYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDUklUSUNBTDogVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZCB0byBtYWludGFpbiBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGxheSBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25DaGFuZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25DaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXVkaW8tc3BlY2lmaWMgZmVhdHVyZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdWRpb0ZlYXR1cmVzKGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZ2xvYmFsIGF1ZGlvIHBsYXllclxuICAgICAgICB0aGlzLmluaXRpYWxpemVBdWRpb1BsYXllcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbmQgaW5pdGlhbGl6ZSBidXR0b25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUJ1dHRvbnMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluaXRpYWwgYnV0dG9uIHN0YXRlXG4gICAgICAgIHRoaXMudXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29udHJvbCBidXR0b25zIChwbGF5L2FkZClcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVCdXR0b25zKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgZmllbGRJZCwgY29uZmlnIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYnV0dG9uIGNvbnRhaW5lciBieSBsb29raW5nIG5lYXIgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3IgYnV0dG9ucyBpbiB0aGUgc2FtZSBwYXJlbnQgY29udGFpbmVyICh1bnN0YWNrYWJsZSBmaWVsZHMpXG4gICAgICAgIGxldCAkYnV0dG9uQ29udGFpbmVyID0gJGRyb3Bkb3duLmNsb3Nlc3QoJy51bnN0YWNrYWJsZS5maWVsZHMnKS5maW5kKCcudWkuYnV0dG9ucycpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmFsbGJhY2s6IGxvb2sgaW4gdGhlIHNhbWUgZmllbGRcbiAgICAgICAgaWYgKCEkYnV0dG9uQ29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJ1dHRvbkNvbnRhaW5lciA9ICRkcm9wZG93bi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkuYnV0dG9ucycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGJ1dHRvbkNvbnRhaW5lci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHBsYXkgYnV0dG9uXG4gICAgICAgICAgICBpZiAoY29uZmlnLnNob3dQbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbiA9ICRidXR0b25Db250YWluZXIuZmluZCgnLmFjdGlvbi1wbGF5YmFjay1idXR0b24nKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUGxheUNsaWNrKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIGFkZCBidXR0b24gKG5vIGFkZGl0aW9uYWwgaGFuZGxpbmcgbmVlZGVkIC0gaGFzIGhyZWYpXG4gICAgICAgICAgICBpZiAoY29uZmlnLnNob3dBZGRCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5hZGRCdXR0b24gPSAkYnV0dG9uQ29udGFpbmVyLmZpbmQoJ2FbaHJlZio9XCJzb3VuZC1maWxlcy9tb2RpZnlcIl0nKS5maXJzdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1ZGlvIHBsYXllclxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdWRpb1BsYXllcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucHJlbG9hZCA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5hdWRpb1BsYXllcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBwbGF5L3BhdXNlIGV2ZW50c1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBsYXkgYnV0dG9uIGNsaWNrXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVQbGF5Q2xpY2soaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50VmFsdWUsIGNvbmZpZywgcGxheUJ1dHRvbiB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRWYWx1ZSB8fCBjdXJyZW50VmFsdWUgPT09ICctMScgfHwgY3VycmVudFZhbHVlID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IHBsYXlpbmcgdGhpcyBmaWxlXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9PT0gY3VycmVudFZhbHVlICYmICF0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcCBhbnkgY3VycmVudCBwbGF5YmFja1xuICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgcGF1c2UgaWNvblxuICAgICAgICBpZiAocGxheUJ1dHRvbikge1xuICAgICAgICAgICAgcGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGZpbGUgcGF0aCBhbmQgcGxheVxuICAgICAgICB0aGlzLnBsYXlGaWxlKGN1cnJlbnRWYWx1ZSwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25QbGF5IGNhbGxiYWNrXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uUGxheSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uUGxheShjdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQbGF5IHNvdW5kIGZpbGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gRmlsZSBJRCB0byBwbGF5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwbGF5RmlsZShmaWxlSWQsIGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEdldCBmaWxlIHJlY29yZCB0byBnZXQgdGhlIHBhdGhcbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQoZmlsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9IGZpbGVJZDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2VuY29kZVVSSUNvbXBvbmVudChyZXNwb25zZS5kYXRhLnBhdGgpfWA7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmYWlsZWQgdG8gZ2V0IGZpbGUgaW5mbywgcmV2ZXJ0IGljb24gYmFjayB0byBwbGF5XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3RvcCBhdWRpbyBwbGF5YmFja1xuICAgICAqL1xuICAgIHN0b3BQbGF5YmFjaygpIHtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIHBsYXkgYnV0dG9ucyBiYWNrIHRvIHBsYXkgaWNvblxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZSBiYXNlZCBvbiBjdXJyZW50IHNlbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgdXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlKSB7XG4gICAgICAgIGlmICghaW5zdGFuY2UucGxheUJ1dHRvbiB8fCAhaW5zdGFuY2UucGxheUJ1dHRvbi5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgY3VycmVudFZhbHVlIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFZhbHVlIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJycgfHwgY3VycmVudFZhbHVlID09PSAnLScpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgYnV0dG9uIGFuZCBlbnN1cmUgcGxheSBpY29uXG4gICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBidXR0b25cbiAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBhcHByb3ByaWF0ZSBpY29uIGJhc2VkIG9uIHBsYXliYWNrIHN0YXRlXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGN1cnJlbnRWYWx1ZSAmJiAhdGhpcy5hdWRpb1BsYXllci5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgcHJvZ3JhbW1hdGljYWxseVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIERpc3BsYXkgdGV4dCAob3B0aW9uYWwpXG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUsIHRleHQgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIHNldCB0aGUgdmFsdWVcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5zZXRWYWx1ZShmaWVsZElkLCB2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dCB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB2YWx1ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5jdXJyZW50VmFsdWUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBkcm9wZG93biBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIHJlZnJlc2goZmllbGRJZCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIC8vIChEeW5hbWljRHJvcGRvd25CdWlsZGVyIHdvdWxkIG5lZWQgYSByZWZyZXNoIG1ldGhvZClcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAvLyBTdG9wIHBsYXliYWNrIGlmIHBsYXlpbmdcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9PT0gaW5zdGFuY2UuY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ub2ZmKCdjbGljaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBpbnN0YW5jZXNcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVXNlIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gY2xlYXJcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXkgYnV0dG9uIHN0YXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGNhY2hlIGZvciBzb3VuZCBmaWxlcyBBUElcbiAgICAgKiBDYWxsIHRoaXMgYWZ0ZXIgc291bmQgZmlsZSBvcGVyYXRpb25zIChhZGQvZWRpdC9kZWxldGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gT3B0aW9uYWw6IHNwZWNpZmljIGNhdGVnb3J5IHRvIGNsZWFyICgnY3VzdG9tJywgJ21vaCcpXG4gICAgICovXG4gICAgY2xlYXJDYWNoZShjYXRlZ29yeSA9IG51bGwpIHtcbiAgICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgY2F0ZWdvcnlcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdCcsIHsgY2F0ZWdvcnkgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBhbGwgc291bmQgZmlsZXMgY2FjaGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGFsbCBzb3VuZCBmaWxlIGRyb3Bkb3ducyBvbiB0aGUgcGFnZVxuICAgICAqIFRoaXMgd2lsbCBmb3JjZSB0aGVtIHRvIHJlbG9hZCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gT3B0aW9uYWw6IHNwZWNpZmljIGNhdGVnb3J5IHRvIHJlZnJlc2ggKCdjdXN0b20nLCAnbW9oJylcbiAgICAgKi9cbiAgICByZWZyZXNoQWxsKGNhdGVnb3J5ID0gbnVsbCkge1xuICAgICAgICAvLyBDbGVhciBjYWNoZSBmaXJzdFxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoY2F0ZWdvcnkpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVmcmVzaCBlYWNoIGFjdGl2ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCBpbnN0YW5jZS5jb25maWcuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gYW5kIHJlbG9hZFxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyb3Bkb3duIHRvIHRyaWdnZXIgbmV3IEFQSSByZXF1ZXN0XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07Il19