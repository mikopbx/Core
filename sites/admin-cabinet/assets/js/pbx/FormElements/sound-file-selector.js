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


    var rawValue = options.data && options.data[fieldId] || $hiddenInput.val() || config.defaultValue || ''; // Normalize empty option value: -1 from getForSelect API means "no selection"

    var currentValue = rawValue === '-1' || rawValue === -1 ? '' : rawValue;
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Create dropdown configuration for DynamicDropdownBuilder

    var dropdownConfig = {
      apiUrl: "/pbxcore/api/v3/sound-files:getForSelect",
      apiParams: {
        category: config.category,
        includeEmpty: config.includeEmpty ? 'true' : 'false'
      },
      placeholder: config.placeholder || globalTranslate.sf_SelectAudioFile,
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
    if (!instance) return; // Normalize empty option value: -1 from getForSelect API means "no selection"

    var normalizedValue = value === '-1' || value === -1 ? '' : value; // Update instance state

    instance.currentValue = normalizedValue;
    instance.currentText = text; // CRITICAL: Update hidden input field to maintain synchronization

    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(normalizedValue);
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
        var apiUrl = "/pbxcore/api/v3/sound-files:playback?view=".concat(encodeURIComponent(response.data.path)); // Load authenticated audio source

        _this4.loadAuthenticatedAudio(apiUrl, instance);
      } else {
        // If failed to get file info, revert icon back to play
        if (instance.playButton) {
          instance.playButton.find('i').removeClass('pause').addClass('play');
        }
      }
    });
  },

  /**
   * Load audio from authenticated API endpoint
   *
   * @param {string} apiUrl - API URL requiring Bearer token
   * @param {object} instance - Selector instance
   */
  loadAuthenticatedAudio: function loadAuthenticatedAudio(apiUrl, instance) {
    var _this5 = this;

    // Build full URL
    var fullUrl;

    if (apiUrl.startsWith('http')) {
      fullUrl = apiUrl;
    } else if (apiUrl.startsWith('/pbxcore/')) {
      // API path - use base URL without admin-cabinet path
      var baseUrl = window.location.origin;
      fullUrl = "".concat(baseUrl).concat(apiUrl);
    } else {
      fullUrl = "".concat(globalRootUrl).concat(apiUrl.replace(/^\//, ''));
    } // Prepare headers with Bearer token


    var headers = {
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
      headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
    } // Fetch audio file with authentication


    fetch(fullUrl, {
      headers: headers
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
      } // Extract duration from header if available


      var duration = response.headers.get('X-Audio-Duration');

      if (duration) {
        console.log("Audio duration: ".concat(duration, "s"));
      }

      return response.blob();
    }).then(function (blob) {
      // Revoke previous blob URL if exists
      if (_this5.audioPlayer.src && _this5.audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(_this5.audioPlayer.src);
      } // Create and set new blob URL


      var blobUrl = URL.createObjectURL(blob);
      _this5.audioPlayer.src = blobUrl; // Play audio

      _this5.audioPlayer.play()["catch"](function (error) {
        console.error('Audio playback failed:', error);

        _this5.stopPlayback();
      });
    })["catch"](function (error) {
      console.error('Failed to load audio:', error);

      _this5.stopPlayback(); // Revert play button icon


      if (instance.playButton) {
        instance.playButton.find('i').removeClass('pause').addClass('play');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwib25DaGFuZ2UiLCJvblBsYXkiLCJpbml0IiwiZmllbGRJZCIsIm9wdGlvbnMiLCJoYXMiLCJnZXQiLCIkaGlkZGVuSW5wdXQiLCIkIiwibGVuZ3RoIiwiY29uZmlnIiwicmF3VmFsdWUiLCJkYXRhIiwidmFsIiwiZGVmYXVsdFZhbHVlIiwiY3VycmVudFZhbHVlIiwiY3VycmVudFRleHQiLCJkZXRlY3RJbml0aWFsVGV4dCIsImRyb3Bkb3duQ29uZmlnIiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfU2VsZWN0QXVkaW9GaWxlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImRyb3Bkb3duRGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJwbGF5QnV0dG9uIiwiYWRkQnV0dG9uIiwiaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsIm5vcm1hbGl6ZWRWYWx1ZSIsInVwZGF0ZVBsYXlCdXR0b25TdGF0ZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVBdWRpb1BsYXllciIsImluaXRpYWxpemVCdXR0b25zIiwiJGJ1dHRvbkNvbnRhaW5lciIsImNsb3Nlc3QiLCJmaXJzdCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFuZGxlUGxheUNsaWNrIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwicHJlbG9hZCIsInN0eWxlIiwiZGlzcGxheSIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJzdG9wUGxheWJhY2siLCJwYXVzZWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGxheUZpbGUiLCJmaWxlSWQiLCJTb3VuZEZpbGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwYXRoIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwibG9hZEF1dGhlbnRpY2F0ZWRBdWRpbyIsImZ1bGxVcmwiLCJzdGFydHNXaXRoIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwiZ2xvYmFsUm9vdFVybCIsInJlcGxhY2UiLCJoZWFkZXJzIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJmZXRjaCIsInRoZW4iLCJvayIsIkVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsImR1cmF0aW9uIiwiY29uc29sZSIsImxvZyIsImJsb2IiLCJzcmMiLCJVUkwiLCJyZXZva2VPYmplY3RVUkwiLCJibG9iVXJsIiwiY3JlYXRlT2JqZWN0VVJMIiwicGxheSIsImVycm9yIiwicGF1c2UiLCJjdXJyZW50VGltZSIsImZvckVhY2giLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwicmVmcmVzaCIsImRyb3Bkb3duIiwiZGVzdHJveSIsImNsZWFyIiwiY2xlYXJDYWNoZSIsImNsZWFyQ2FjaGVGb3IiLCJyZWZyZXNoQWxsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Es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SjtBQUNBO0FBQ0E7QUFDQTtBQUNJa0YsRUFBQUEsVUEzZ0JzQix3QkEyZ0JNO0FBQUEsUUFBakJySCxRQUFpQix1RUFBTixJQUFNOztBQUN4QixRQUFJQSxRQUFKLEVBQWM7QUFDVjtBQUNBaUMsTUFBQUEsc0JBQXNCLENBQUNxRixhQUF2QixDQUFxQywwQ0FBckMsRUFBaUY7QUFBRXRILFFBQUFBLFFBQVEsRUFBUkE7QUFBRixPQUFqRjtBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0FpQyxNQUFBQSxzQkFBc0IsQ0FBQ3FGLGFBQXZCLENBQXFDLDBDQUFyQztBQUNIO0FBQ0osR0FuaEJxQjs7QUFxaEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBMWhCc0Isd0JBMGhCTTtBQUFBLFFBQWpCdkgsUUFBaUIsdUVBQU4sSUFBTTtBQUN4QjtBQUNBLFNBQUtxSCxVQUFMLENBQWdCckgsUUFBaEIsRUFGd0IsQ0FJeEI7O0FBQ0EsU0FBS0wsU0FBTCxDQUFlbUgsT0FBZixDQUF1QixVQUFDM0UsUUFBRCxFQUFXM0IsT0FBWCxFQUF1QjtBQUMxQyxVQUFJLENBQUNSLFFBQUQsSUFBYW1DLFFBQVEsQ0FBQ3BCLE1BQVQsQ0FBZ0JmLFFBQWhCLEtBQTZCQSxRQUE5QyxFQUF3RDtBQUNwRDtBQUNBaUMsUUFBQUEsc0JBQXNCLENBQUNtRixLQUF2QixDQUE2QjVHLE9BQTdCLEVBRm9ELENBSXBEOztBQUNBLFlBQU1nQyxTQUFTLEdBQUczQixDQUFDLFlBQUtMLE9BQUwsZUFBbkI7O0FBQ0EsWUFBSWdDLFNBQVMsQ0FBQzFCLE1BQWQsRUFBc0I7QUFDbEIwQixVQUFBQSxTQUFTLENBQUMwRSxRQUFWLENBQW1CLFNBQW5CO0FBQ0g7QUFDSjtBQUNKLEtBWEQ7QUFZSDtBQTNpQnFCLENBQTFCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFRyYW5zbGF0ZSwgU291bmRGaWxlc0FQSSwgRm9ybSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIFNvdW5kRmlsZVNlbGVjdG9yIC0gQXVkaW8tc3BlY2lmaWMgZXh0ZW5zaW9uIG9mIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAqIFxuICogVGhpcyBjb21wb25lbnQgYnVpbGRzIHVwb24gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBhZGQgYXVkaW8tc3BlY2lmaWMgZmVhdHVyZXM6XG4gKiAtIEJ1aWx0LWluIGF1ZGlvIHBsYXliYWNrIGZ1bmN0aW9uYWxpdHlcbiAqIC0gUGxheS9wYXVzZSBidXR0b24gaW50ZWdyYXRpb25cbiAqIC0gU3VwcG9ydCBmb3IgY3VzdG9tL21vaCBzb3VuZCBmaWxlIGNhdGVnb3JpZXNcbiAqIC0gQXVkaW8gcHJldmlldyBjYXBhYmlsaXRpZXNcbiAqIFxuICogVXNhZ2U6XG4gKiBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICogICAgIGNhdGVnb3J5OiAnY3VzdG9tJywgICAgICAgICAgIC8vIEZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gKiAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBvcHRpb25cbiAqICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7IC4uLiB9ICAvLyBDaGFuZ2UgY2FsbGJhY2tcbiAqIH0pO1xuICogXG4gKiBAbW9kdWxlIFNvdW5kRmlsZVNlbGVjdG9yXG4gKi9cbmNvbnN0IFNvdW5kRmlsZVNlbGVjdG9yID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBzZWxlY3RvciBpbnN0YW5jZXMgd2l0aCBhdWRpbyBjYXBhYmlsaXRpZXNcbiAgICAgKiBAdHlwZSB7TWFwfVxuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdsb2JhbCBhdWRpbyBwbGF5ZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtIVE1MQXVkaW9FbGVtZW50fG51bGx9XG4gICAgICovXG4gICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudGx5IHBsYXlpbmcgZmlsZSBJRFxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBjdXJyZW50bHlQbGF5aW5nSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgIC8vIFNvdW5kIGZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgLy8gSW5jbHVkZSBlbXB0eS9ub25lIG9wdGlvblxuICAgICAgICBwbGFjZWhvbGRlcjogbnVsbCwgICAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgKGF1dG8tZGV0ZWN0ZWQpXG4gICAgICAgIHNob3dQbGF5QnV0dG9uOiB0cnVlLCAgICAgLy8gU2hvdyBwbGF5IGJ1dHRvblxuICAgICAgICBzaG93QWRkQnV0dG9uOiB0cnVlLCAgICAgIC8vIFNob3cgYWRkIG5ldyBmaWxlIGJ1dHRvblxuICAgICAgICBvbkNoYW5nZTogbnVsbCwgICAgICAgICAgIC8vIENoYW5nZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBvblBsYXk6IG51bGwsICAgICAgICAgICAgLy8gUGxheSBjYWxsYmFjayBmdW5jdGlvblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRCAoZS5nLiwgJ2F1ZGlvX21lc3NhZ2VfaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoZmllbGRJZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBoaWRkZW4gaW5wdXQgZWxlbWVudFxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50IHRleHQgZnJvbSBkYXRhIG9iamVjdCBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCByYXdWYWx1ZSA9IChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhW2ZpZWxkSWRdKSB8fCAkaGlkZGVuSW5wdXQudmFsKCkgfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgLy8gTm9ybWFsaXplIGVtcHR5IG9wdGlvbiB2YWx1ZTogLTEgZnJvbSBnZXRGb3JTZWxlY3QgQVBJIG1lYW5zIFwibm8gc2VsZWN0aW9uXCJcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gKHJhd1ZhbHVlID09PSAnLTEnIHx8IHJhd1ZhbHVlID09PSAtMSkgPyAnJyA6IHJhd1ZhbHVlO1xuICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9IHRoaXMuZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgb3B0aW9ucy5kYXRhKSB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gY29uZmlndXJhdGlvbiBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3RgLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNvbmZpZy5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGNvbmZpZy5pbmNsdWRlRW1wdHkgPyAndHJ1ZScgOiAnZmFsc2UnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlciB8fCBnbG9iYWxUcmFuc2xhdGUuc2ZfU2VsZWN0QXVkaW9GaWxlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkRhdGEgPSB7XG4gICAgICAgICAgICBbZmllbGRJZF06IGN1cnJlbnRWYWx1ZVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlcHJlc2VudCB0ZXh0IGlmIGF2YWlsYWJsZSBhbmQgd2UgaGF2ZSBhIHZhbHVlXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGRyb3Bkb3duRGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRUZXh0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkSWQsIGRyb3Bkb3duRGF0YSwgZHJvcGRvd25Db25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlIGZvciBhdWRpbyBmdW5jdGlvbmFsaXR5XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0ge1xuICAgICAgICAgICAgZmllbGRJZCxcbiAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0LFxuICAgICAgICAgICAgJGhpZGRlbklucHV0LFxuICAgICAgICAgICAgcGxheUJ1dHRvbjogbnVsbCxcbiAgICAgICAgICAgIGFkZEJ1dHRvbjogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1zcGVjaWZpYyBmZWF0dXJlc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVBdWRpb0ZlYXR1cmVzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaW5pdGlhbCB0ZXh0IGZyb20gZGF0YSBvYmplY3Qgb3IgZHJvcGRvd25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdCB3aXRoIHJlcHJlc2VudCBmaWVsZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEluaXRpYWwgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBleGlzdGluZyBkcm9wZG93biB0ZXh0XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dDpub3QoLmRlZmF1bHQpJyk7XG4gICAgICAgICAgICBpZiAoJHRleHQubGVuZ3RoICYmICR0ZXh0LnRleHQoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHRleHQuaHRtbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBTZWxlY3RlZCB0ZXh0XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjaG9pY2UgLSBTZWxlY3RlZCBjaG9pY2UgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIE5vcm1hbGl6ZSBlbXB0eSBvcHRpb24gdmFsdWU6IC0xIGZyb20gZ2V0Rm9yU2VsZWN0IEFQSSBtZWFucyBcIm5vIHNlbGVjdGlvblwiXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRWYWx1ZSA9ICh2YWx1ZSA9PT0gJy0xJyB8fCB2YWx1ZSA9PT0gLTEpID8gJycgOiB2YWx1ZTtcblxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gbm9ybWFsaXplZFZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG5cbiAgICAgICAgLy8gQ1JJVElDQUw6IFVwZGF0ZSBoaWRkZW4gaW5wdXQgZmllbGQgdG8gbWFpbnRhaW4gc3luY2hyb25pemF0aW9uXG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKG5vcm1hbGl6ZWRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvbkNoYW5nZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdWRpby1zcGVjaWZpYyBmZWF0dXJlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMoaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBnbG9iYWwgYXVkaW8gcGxheWVyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF1ZGlvUGxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFuZCBpbml0aWFsaXplIGJ1dHRvbnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQnV0dG9ucyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5pdGlhbCBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb250cm9sIGJ1dHRvbnMgKHBsYXkvYWRkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUJ1dHRvbnMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZElkLCBjb25maWcgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBidXR0b24gY29udGFpbmVyIGJ5IGxvb2tpbmcgbmVhciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBidXR0b25zIGluIHRoZSBzYW1lIHBhcmVudCBjb250YWluZXIgKHVuc3RhY2thYmxlIGZpZWxkcylcbiAgICAgICAgbGV0ICRidXR0b25Db250YWluZXIgPSAkZHJvcGRvd24uY2xvc2VzdCgnLnVuc3RhY2thYmxlLmZpZWxkcycpLmZpbmQoJy51aS5idXR0b25zJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjazogbG9vayBpbiB0aGUgc2FtZSBmaWVsZFxuICAgICAgICBpZiAoISRidXR0b25Db250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkYnV0dG9uQ29udGFpbmVyID0gJGRyb3Bkb3duLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5idXR0b25zJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICgkYnV0dG9uQ29udGFpbmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGxheSBidXR0b25cbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd1BsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uID0gJGJ1dHRvbkNvbnRhaW5lci5maW5kKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQbGF5Q2xpY2soaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgYWRkIGJ1dHRvbiAobm8gYWRkaXRpb25hbCBoYW5kbGluZyBuZWVkZWQgLSBoYXMgaHJlZilcbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd0FkZEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmFkZEJ1dHRvbiA9ICRidXR0b25Db250YWluZXIuZmluZCgnYVtocmVmKj1cInNvdW5kLWZpbGVzL21vZGlmeVwiXScpLmZpcnN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXVkaW8gcGxheWVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1ZGlvUGxheWVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuYXVkaW9QbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wcmVsb2FkID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmF1ZGlvUGxheWVyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHBsYXkvcGF1c2UgZXZlbnRzXG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcGxheSBidXR0b24gY2xpY2tcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZVBsYXlDbGljayhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSwgY29uZmlnLCBwbGF5QnV0dG9uIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFZhbHVlIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0xJyB8fCBjdXJyZW50VmFsdWUgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgcGxheWluZyB0aGlzIGZpbGVcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9wIGFueSBjdXJyZW50IHBsYXliYWNrXG4gICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBwYXVzZSBpY29uXG4gICAgICAgIGlmIChwbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICBwbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZmlsZSBwYXRoIGFuZCBwbGF5XG4gICAgICAgIHRoaXMucGxheUZpbGUoY3VycmVudFZhbHVlLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvblBsYXkgY2FsbGJhY2tcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25QbGF5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25QbGF5KGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBsYXkgc291bmQgZmlsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIEZpbGUgSUQgdG8gcGxheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgcGxheUZpbGUoZmlsZUlkLCBpbnN0YW5jZSkge1xuICAgICAgICAvLyBHZXQgZmlsZSByZWNvcmQgdG8gZ2V0IHRoZSBwYXRoXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBmaWxlSWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgYXBpVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlc3BvbnNlLmRhdGEucGF0aCl9YDtcblxuICAgICAgICAgICAgICAgIC8vIExvYWQgYXV0aGVudGljYXRlZCBhdWRpbyBzb3VyY2VcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRBdXRoZW50aWNhdGVkQXVkaW8oYXBpVXJsLCBpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIGZhaWxlZCB0byBnZXQgZmlsZSBpbmZvLCByZXZlcnQgaWNvbiBiYWNrIHRvIHBsYXlcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXVkaW8gZnJvbSBhdXRoZW50aWNhdGVkIEFQSSBlbmRwb2ludFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIEFQSSBVUkwgcmVxdWlyaW5nIEJlYXJlciB0b2tlblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgbG9hZEF1dGhlbnRpY2F0ZWRBdWRpbyhhcGlVcmwsIGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwaVVybDtcbiAgICAgICAgfSBlbHNlIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIC8vIEFQSSBwYXRoIC0gdXNlIGJhc2UgVVJMIHdpdGhvdXQgYWRtaW4tY2FiaW5ldCBwYXRoXG4gICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtiYXNlVXJsfSR7YXBpVXJsfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke2FwaVVybC5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1ZGlvIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGR1cmF0aW9uIGZyb20gaGVhZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEF1ZGlvIGR1cmF0aW9uOiAke2R1cmF0aW9ufXNgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGJsb2IgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllci5zcmMgJiYgdGhpcy5hdWRpb1BsYXllci5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuYXVkaW9QbGF5ZXIuc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHNldCBuZXcgYmxvYiBVUkxcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IGJsb2JVcmw7XG5cbiAgICAgICAgICAgICAgICAvLyBQbGF5IGF1ZGlvXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdWRpbyBwbGF5YmFjayBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgYXVkaW86JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZXZlcnQgcGxheSBidXR0b24gaWNvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3AgYXVkaW8gcGxheWJhY2tcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwbGF5IGJ1dHRvbnMgYmFjayB0byBwbGF5IGljb25cbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGxheSBidXR0b24gc3RhdGUgYmFzZWQgb24gY3VycmVudCBzZWxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSkge1xuICAgICAgICBpZiAoIWluc3RhbmNlLnBsYXlCdXR0b24gfHwgIWluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRWYWx1ZSB8fCBjdXJyZW50VmFsdWUgPT09ICcnIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0nKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGJ1dHRvbiBhbmQgZW5zdXJlIHBsYXkgaWNvblxuICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFbmFibGUgYnV0dG9uXG4gICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgYXBwcm9wcmlhdGUgaWNvbiBiYXNlZCBvbiBwbGF5YmFjayBzdGF0ZVxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBzZXQgdGhlIHZhbHVlXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGxheSBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2UuY3VycmVudFZhbHVlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggZHJvcGRvd24gZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGZpZWxkSWQpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyAoRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3b3VsZCBuZWVkIGEgcmVmcmVzaCBtZXRob2QpXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gU3RvcCBwbGF5YmFjayBpZiBwbGF5aW5nXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gaW5zdGFuY2VzXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIGNsZWFyXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IG51bGw7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3Igc291bmQgZmlsZXMgQVBJXG4gICAgICogQ2FsbCB0aGlzIGFmdGVyIHNvdW5kIGZpbGUgb3BlcmF0aW9ucyAoYWRkL2VkaXQvZGVsZXRlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byBjbGVhciAoJ2N1c3RvbScsICdtb2gnKVxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUoY2F0ZWdvcnkgPSBudWxsKSB7XG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIGNhdGVnb3J5XG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3QnLCB7IGNhdGVnb3J5IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIHNvdW5kIGZpbGVzIGNhY2hlXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3QnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBhbGwgc291bmQgZmlsZSBkcm9wZG93bnMgb24gdGhlIHBhZ2VcbiAgICAgKiBUaGlzIHdpbGwgZm9yY2UgdGhlbSB0byByZWxvYWQgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byByZWZyZXNoICgnY3VzdG9tJywgJ21vaCcpXG4gICAgICovXG4gICAgcmVmcmVzaEFsbChjYXRlZ29yeSA9IG51bGwpIHtcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKGNhdGVnb3J5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggZWFjaCBhY3RpdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgaW5zdGFuY2UuY29uZmlnLmNhdGVnb3J5ID09PSBjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIGFuZCByZWxvYWRcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcm9wZG93biB0byB0cmlnZ2VyIG5ldyBBUEkgcmVxdWVzdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==