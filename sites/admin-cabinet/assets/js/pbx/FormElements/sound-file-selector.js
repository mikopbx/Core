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
      apiUrl: "/pbxcore/api/v2/sound-files/getForSelect",
      apiParams: {
        category: config.category
      },
      placeholder: config.placeholder || globalTranslate.sf_SelectAudioFile || 'Select audio file',
      onChange: function onChange(value, text, $choice) {
        _this.handleSelectionChange(fieldId, value, text, $choice, config);
      }
    }; // Add empty option if needed

    if (config.includeEmpty) {
      dropdownConfig.emptyOption = {
        key: '',
        value: '-'
      };
    } // Build dropdown using DynamicDropdownBuilder


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
        _this4.audioPlayer.src = "/pbxcore/api/v2/sound-files/playback?view=".concat(encodeURIComponent(response.data.path));

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
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v2/sound-files/getForSelect', {
        category: category
      });
    } else {
      // Clear all sound files cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v2/sound-files/getForSelect');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwib25DaGFuZ2UiLCJvblBsYXkiLCJpbml0IiwiZmllbGRJZCIsIm9wdGlvbnMiLCJoYXMiLCJnZXQiLCIkaGlkZGVuSW5wdXQiLCIkIiwibGVuZ3RoIiwiY29uZmlnIiwiY3VycmVudFZhbHVlIiwiZGF0YSIsInZhbCIsImRlZmF1bHRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiZGV0ZWN0SW5pdGlhbFRleHQiLCJkcm9wZG93bkNvbmZpZyIsImFwaVVybCIsImFwaVBhcmFtcyIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1NlbGVjdEF1ZGlvRmlsZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJoYW5kbGVTZWxlY3Rpb25DaGFuZ2UiLCJlbXB0eU9wdGlvbiIsImtleSIsImRyb3Bkb3duRGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJwbGF5QnV0dG9uIiwiYWRkQnV0dG9uIiwiaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsInVwZGF0ZVBsYXlCdXR0b25TdGF0ZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVBdWRpb1BsYXllciIsImluaXRpYWxpemVCdXR0b25zIiwiJGJ1dHRvbkNvbnRhaW5lciIsImNsb3Nlc3QiLCJmaXJzdCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFuZGxlUGxheUNsaWNrIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwicHJlbG9hZCIsInN0eWxlIiwiZGlzcGxheSIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJzdG9wUGxheWJhY2siLCJwYXVzZWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGxheUZpbGUiLCJmaWxlSWQiLCJTb3VuZEZpbGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwYXRoIiwic3JjIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicGxheSIsImVycm9yIiwicGF1c2UiLCJjdXJyZW50VGltZSIsImZvckVhY2giLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwicmVmcmVzaCIsImRyb3Bkb3duIiwiZGVzdHJveSIsImNsZWFyIiwiY2xlYXJDYWNoZSIsImNsZWFyQ2FjaGVGb3IiLCJyZWZyZXNoQWxsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLEdBQUosRUFOVzs7QUFRdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBWlM7O0FBY3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLElBbEJFOztBQW9CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFO0FBQ05DLElBQUFBLFFBQVEsRUFBRSxRQURKO0FBQ29CO0FBQzFCQyxJQUFBQSxZQUFZLEVBQUUsSUFGUjtBQUVvQjtBQUMxQkMs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RCxRQUFELEVBQVc1QixPQUFYLEVBQXVCO0FBQzFDLFVBQUksQ0FBQ1IsUUFBRCxJQUFhb0MsUUFBUSxDQUFDckIsTUFBVCxDQUFnQmYsUUFBaEIsS0FBNkJBLFFBQTlDLEVBQXdEO0FBQ3BEO0FBQ0FrQyxRQUFBQSxzQkFBc0IsQ0FBQ3dELEtBQXZCLENBQTZCbEYsT0FBN0IsRUFGb0QsQ0FJcEQ7O0FBQ0EsWUFBTWlDLFNBQVMsR0FBRzVCLENBQUMsWUFBS0wsT0FBTCxlQUFuQjs7QUFDQSxZQUFJaUMsU0FBUyxDQUFDM0IsTUFBZCxFQUFzQjtBQUNsQjJCLFVBQUFBLFNBQVMsQ0FBQytDLFFBQVYsQ0FBbUIsU0FBbkI7QUFDSDtBQUNKO0FBQ0osS0FYRDtBQVlIO0FBdGVxQixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIFNvdW5kRmlsZXNBUEksIEZvcm0sIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBTb3VuZEZpbGVTZWxlY3RvciAtIEF1ZGlvLXNwZWNpZmljIGV4dGVuc2lvbiBvZiBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gKiBcbiAqIFRoaXMgY29tcG9uZW50IGJ1aWxkcyB1cG9uIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gYWRkIGF1ZGlvLXNwZWNpZmljIGZlYXR1cmVzOlxuICogLSBCdWlsdC1pbiBhdWRpbyBwbGF5YmFjayBmdW5jdGlvbmFsaXR5XG4gKiAtIFBsYXkvcGF1c2UgYnV0dG9uIGludGVncmF0aW9uXG4gKiAtIFN1cHBvcnQgZm9yIGN1c3RvbS9tb2ggc291bmQgZmlsZSBjYXRlZ29yaWVzXG4gKiAtIEF1ZGlvIHByZXZpZXcgY2FwYWJpbGl0aWVzXG4gKiBcbiAqIFVzYWdlOlxuICogU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAqICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgICAgICAvLyBGaWxlIGNhdGVnb3J5IChjdXN0b20vbW9oKVxuICogICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgICAgIC8vIFNob3cgZW1wdHkgb3B0aW9uXG4gKiAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4geyAuLi4gfSAgLy8gQ2hhbmdlIGNhbGxiYWNrXG4gKiB9KTtcbiAqIFxuICogQG1vZHVsZSBTb3VuZEZpbGVTZWxlY3RvclxuICovXG5jb25zdCBTb3VuZEZpbGVTZWxlY3RvciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgc2VsZWN0b3IgaW5zdGFuY2VzIHdpdGggYXVkaW8gY2FwYWJpbGl0aWVzXG4gICAgICogQHR5cGUge01hcH1cbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHbG9iYWwgYXVkaW8gcGxheWVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7SFRNTEF1ZGlvRWxlbWVudHxudWxsfVxuICAgICAqL1xuICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBwbGF5aW5nIGZpbGUgSURcbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgY3VycmVudGx5UGxheWluZ0lkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLCAgICAgICAvLyBTb3VuZCBmaWxlIGNhdGVnb3J5IChjdXN0b20vbW9oKVxuICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgIC8vIEluY2x1ZGUgZW1wdHkvbm9uZSBvcHRpb25cbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgICAgICBzaG93UGxheUJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgcGxheSBidXR0b25cbiAgICAgICAgc2hvd0FkZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBTaG93IGFkZCBuZXcgZmlsZSBidXR0b25cbiAgICAgICAgb25DaGFuZ2U6IG51bGwsICAgICAgICAgICAvLyBDaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgb25QbGF5OiBudWxsLCAgICAgICAgICAgIC8vIFBsYXkgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSUQgKGUuZy4sICdhdWRpb19tZXNzYWdlX2lkJylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KGZpZWxkSWQsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgaGlkZGVuIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgYW5kIHJlcHJlc2VudCB0ZXh0IGZyb20gZGF0YSBvYmplY3QgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGFbZmllbGRJZF0pIHx8ICRoaWRkZW5JbnB1dC52YWwoKSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9IHRoaXMuZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgb3B0aW9ucy5kYXRhKSB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gY29uZmlndXJhdGlvbiBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRGb3JTZWxlY3RgLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNvbmZpZy5jYXRlZ29yeVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjb25maWcucGxhY2Vob2xkZXIgfHwgZ2xvYmFsVHJhbnNsYXRlLnNmX1NlbGVjdEF1ZGlvRmlsZSB8fCAnU2VsZWN0IGF1ZGlvIGZpbGUnLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVtcHR5IG9wdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5pbmNsdWRlRW1wdHkpIHtcbiAgICAgICAgICAgIGRyb3Bkb3duQ29uZmlnLmVtcHR5T3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIGtleTogJycsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICctJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkRhdGEgPSB7XG4gICAgICAgICAgICBbZmllbGRJZF06IGN1cnJlbnRWYWx1ZVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlcHJlc2VudCB0ZXh0IGlmIGF2YWlsYWJsZSBhbmQgd2UgaGF2ZSBhIHZhbHVlXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGRyb3Bkb3duRGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRUZXh0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkSWQsIGRyb3Bkb3duRGF0YSwgZHJvcGRvd25Db25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlIGZvciBhdWRpbyBmdW5jdGlvbmFsaXR5XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0ge1xuICAgICAgICAgICAgZmllbGRJZCxcbiAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0LFxuICAgICAgICAgICAgJGhpZGRlbklucHV0LFxuICAgICAgICAgICAgcGxheUJ1dHRvbjogbnVsbCxcbiAgICAgICAgICAgIGFkZEJ1dHRvbjogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1zcGVjaWZpYyBmZWF0dXJlc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVBdWRpb0ZlYXR1cmVzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaW5pdGlhbCB0ZXh0IGZyb20gZGF0YSBvYmplY3Qgb3IgZHJvcGRvd25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdCB3aXRoIHJlcHJlc2VudCBmaWVsZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEluaXRpYWwgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBleGlzdGluZyBkcm9wZG93biB0ZXh0XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dDpub3QoLmRlZmF1bHQpJyk7XG4gICAgICAgICAgICBpZiAoJHRleHQubGVuZ3RoICYmICR0ZXh0LnRleHQoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHRleHQuaHRtbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBTZWxlY3RlZCB0ZXh0XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjaG9pY2UgLSBTZWxlY3RlZCBjaG9pY2UgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSB0ZXh0O1xuICAgICAgICBcbiAgICAgICAgLy8gQ1JJVElDQUw6IFVwZGF0ZSBoaWRkZW4gaW5wdXQgZmllbGQgdG8gbWFpbnRhaW4gc3luY2hyb25pemF0aW9uXG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBsYXkgYnV0dG9uIHN0YXRlXG4gICAgICAgIHRoaXMudXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgY3VzdG9tIG9uQ2hhbmdlIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1ZGlvLXNwZWNpZmljIGZlYXR1cmVzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQXVkaW9GZWF0dXJlcyhpbnN0YW5jZSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGdsb2JhbCBhdWRpbyBwbGF5ZXJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQXVkaW9QbGF5ZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYW5kIGluaXRpYWxpemUgYnV0dG9uc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVCdXR0b25zKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbml0aWFsIGJ1dHRvbiBzdGF0ZVxuICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvbnRyb2wgYnV0dG9ucyAocGxheS9hZGQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQnV0dG9ucyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7IGZpZWxkSWQsIGNvbmZpZyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGJ1dHRvbiBjb250YWluZXIgYnkgbG9va2luZyBuZWFyIHRoZSBkcm9wZG93blxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIExvb2sgZm9yIGJ1dHRvbnMgaW4gdGhlIHNhbWUgcGFyZW50IGNvbnRhaW5lciAodW5zdGFja2FibGUgZmllbGRzKVxuICAgICAgICBsZXQgJGJ1dHRvbkNvbnRhaW5lciA9ICRkcm9wZG93bi5jbG9zZXN0KCcudW5zdGFja2FibGUuZmllbGRzJykuZmluZCgnLnVpLmJ1dHRvbnMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrOiBsb29rIGluIHRoZSBzYW1lIGZpZWxkXG4gICAgICAgIGlmICghJGJ1dHRvbkNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRidXR0b25Db250YWluZXIgPSAkZHJvcGRvd24uY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLmJ1dHRvbnMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCRidXR0b25Db250YWluZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwbGF5IGJ1dHRvblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5zaG93UGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24gPSAkYnV0dG9uQ29udGFpbmVyLmZpbmQoJy5hY3Rpb24tcGxheWJhY2stYnV0dG9uJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVBsYXlDbGljayhpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCBhZGQgYnV0dG9uIChubyBhZGRpdGlvbmFsIGhhbmRsaW5nIG5lZWRlZCAtIGhhcyBocmVmKVxuICAgICAgICAgICAgaWYgKGNvbmZpZy5zaG93QWRkQnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuYWRkQnV0dG9uID0gJGJ1dHRvbkNvbnRhaW5lci5maW5kKCdhW2hyZWYqPVwic291bmQtZmlsZXMvbW9kaWZ5XCJdJykuZmlyc3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdWRpbyBwbGF5ZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQXVkaW9QbGF5ZXIoKSB7XG4gICAgICAgIGlmICghdGhpcy5hdWRpb1BsYXllcikge1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnByZWxvYWQgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuYXVkaW9QbGF5ZXIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgcGxheS9wYXVzZSBldmVudHNcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBwbGF5IGJ1dHRvbiBjbGlja1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaGFuZGxlUGxheUNsaWNrKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgY3VycmVudFZhbHVlLCBjb25maWcsIHBsYXlCdXR0b24gfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFjdXJyZW50VmFsdWUgfHwgY3VycmVudFZhbHVlID09PSAnLTEnIHx8IGN1cnJlbnRWYWx1ZSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBwbGF5aW5nIHRoaXMgZmlsZVxuICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGN1cnJlbnRWYWx1ZSAmJiAhdGhpcy5hdWRpb1BsYXllci5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3AgYW55IGN1cnJlbnQgcGxheWJhY2tcbiAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IHBhdXNlIGljb25cbiAgICAgICAgaWYgKHBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgIHBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwbGF5JykuYWRkQ2xhc3MoJ3BhdXNlJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBmaWxlIHBhdGggYW5kIHBsYXlcbiAgICAgICAgdGhpcy5wbGF5RmlsZShjdXJyZW50VmFsdWUsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgY3VzdG9tIG9uUGxheSBjYWxsYmFja1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vblBsYXkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbmZpZy5vblBsYXkoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUGxheSBzb3VuZCBmaWxlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIEZpbGUgSUQgdG8gcGxheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgcGxheUZpbGUoZmlsZUlkLCBpbnN0YW5jZSkge1xuICAgICAgICAvLyBHZXQgZmlsZSByZWNvcmQgdG8gZ2V0IHRoZSBwYXRoXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBmaWxlSWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBgL3BieGNvcmUvYXBpL3YyL3NvdW5kLWZpbGVzL3BsYXliYWNrP3ZpZXc9JHtlbmNvZGVVUklDb21wb25lbnQocmVzcG9uc2UuZGF0YS5wYXRoKX1gO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgZmFpbGVkIHRvIGdldCBmaWxlIGluZm8sIHJldmVydCBpY29uIGJhY2sgdG8gcGxheVxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3AgYXVkaW8gcGxheWJhY2tcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwbGF5IGJ1dHRvbnMgYmFjayB0byBwbGF5IGljb25cbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGxheSBidXR0b24gc3RhdGUgYmFzZWQgb24gY3VycmVudCBzZWxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSkge1xuICAgICAgICBpZiAoIWluc3RhbmNlLnBsYXlCdXR0b24gfHwgIWluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRWYWx1ZSB8fCBjdXJyZW50VmFsdWUgPT09ICcnIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0nKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGJ1dHRvbiBhbmQgZW5zdXJlIHBsYXkgaWNvblxuICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFbmFibGUgYnV0dG9uXG4gICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgYXBwcm9wcmlhdGUgaWNvbiBiYXNlZCBvbiBwbGF5YmFjayBzdGF0ZVxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBzZXQgdGhlIHZhbHVlXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGxheSBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2UuY3VycmVudFZhbHVlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggZHJvcGRvd24gZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGZpZWxkSWQpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyAoRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3b3VsZCBuZWVkIGEgcmVmcmVzaCBtZXRob2QpXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gU3RvcCBwbGF5YmFjayBpZiBwbGF5aW5nXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gaW5zdGFuY2VzXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIGNsZWFyXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IG51bGw7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3Igc291bmQgZmlsZXMgQVBJXG4gICAgICogQ2FsbCB0aGlzIGFmdGVyIHNvdW5kIGZpbGUgb3BlcmF0aW9ucyAoYWRkL2VkaXQvZGVsZXRlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byBjbGVhciAoJ2N1c3RvbScsICdtb2gnKVxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUoY2F0ZWdvcnkgPSBudWxsKSB7XG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIGNhdGVnb3J5XG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRGb3JTZWxlY3QnLCB7IGNhdGVnb3J5IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIHNvdW5kIGZpbGVzIGNhY2hlXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9nZXRGb3JTZWxlY3QnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBhbGwgc291bmQgZmlsZSBkcm9wZG93bnMgb24gdGhlIHBhZ2VcbiAgICAgKiBUaGlzIHdpbGwgZm9yY2UgdGhlbSB0byByZWxvYWQgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byByZWZyZXNoICgnY3VzdG9tJywgJ21vaCcpXG4gICAgICovXG4gICAgcmVmcmVzaEFsbChjYXRlZ29yeSA9IG51bGwpIHtcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKGNhdGVnb3J5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggZWFjaCBhY3RpdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgaW5zdGFuY2UuY29uZmlnLmNhdGVnb3J5ID09PSBjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIGFuZCByZWxvYWRcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcm9wZG93biB0byB0cmlnZ2VyIG5ldyBBUEkgcmVxdWVzdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==