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

/* global $, globalTranslate, SoundFilesAPI, Form, globalRootUrl */

/**
 * SoundFileSelector - Unified component for sound file dropdown selection with playback
 * 
 * Provides consistent sound file selection functionality across the application:
 * - Unified initialization and configuration
 * - REST API integration for loading sound files
 * - Built-in audio playback functionality
 * - Support for custom/moh categories
 * - Integration with play and add buttons
 * 
 * Usage:
 * SoundFileSelector.init('#audio_message_id', {
 *     category: 'custom',           // File category (custom/moh)
 *     includeEmpty: true,           // Show empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module SoundFileSelector
 */
var SoundFileSelector = {
  /**
   * Active selector instances
   * @type {Map}
   */
  instances: new Map(),

  /**
   * Audio player element
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
    // Include empty option
    forceSelection: false,
    // Force user to select a file
    clearable: false,
    // Allow clearing selection
    fullTextSearch: true,
    // Enable full text search
    onChange: null,
    // Change callback function
    onPlay: null,
    // Play callback function
    placeholder: null,
    // Placeholder text (auto-detected)
    showPlayButton: true,
    // Show play button
    showAddButton: true // Show add new file button

  },

  /**
   * Initialize sound file selector
   * 
   * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
   * @param {object} options - Configuration options
   * @returns {object|null} Selector instance
   */
  init: function init(fieldId) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    // Find elements - try multiple ways to find container
    var $container = $("#".concat(fieldId, "-container, .").concat(fieldId, "-container")).first();

    if ($container.length === 0) {
      $container = $("[data-field-id=\"".concat(fieldId, "\"]")).first();
    }

    if ($container.length === 0) {
      $container = $(".".concat(fieldId, "-dropdown")).closest('.field').parent();
    }

    var $dropdown = $(".".concat(fieldId, "-dropdown"));
    var $hiddenInput = $("input[name=\"".concat(fieldId, "\"]"));

    if ($dropdown.length === 0) {
      console.warn("SoundFileSelector: Dropdown not found for field: ".concat(fieldId));
      return null;
    } // Check if already initialized


    if (this.instances.has(fieldId)) {
      return this.instances.get(fieldId);
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Auto-detect placeholder


    if (!config.placeholder) {
      config.placeholder = this.detectPlaceholder($dropdown);
    } // Create instance


    var instance = {
      fieldId: fieldId,
      $container: $container,
      $dropdown: $dropdown,
      $hiddenInput: $hiddenInput,
      config: config,
      initialized: false,
      currentValue: null,
      currentText: null,
      playButton: null,
      addButton: null
    }; // Initialize components

    this.initializeDropdown(instance);
    this.initializeButtons(instance);
    this.initializeAudioPlayer(); // Store instance

    this.instances.set(fieldId, instance);
    instance.initialized = true;
    return instance;
  },

  /**
   * Detect placeholder text
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @returns {string} Detected text
   */
  detectPlaceholder: function detectPlaceholder($dropdown) {
    var $defaultText = $dropdown.find('.default.text');

    if ($defaultText.length > 0) {
      return $defaultText.text();
    }

    return globalTranslate.sf_SelectAudioFile || 'Select audio file';
  },

  /**
   * Initialize dropdown with sound file data
   * 
   * @param {object} instance - Selector instance
   */
  initializeDropdown: function initializeDropdown(instance) {
    var $dropdown = instance.$dropdown,
        $hiddenInput = instance.$hiddenInput,
        config = instance.config,
        fieldId = instance.fieldId; // Dropdown configuration with no caching

    var dropdownSettings = {
      apiSettings: {
        url: SoundFilesAPI.endpoints.getForSelect,
        method: 'GET',
        cache: false,
        beforeSend: function beforeSend(settings) {
          // Add timestamp to prevent caching
          settings.data = {
            category: config.category,
            _t: Date.now()
          };
          return settings;
        },
        onResponse: function onResponse(response) {
          return SoundFileSelector.formatDropdownResults(response, config.includeEmpty);
        }
      },
      onChange: function onChange(value, text, $selectedItem) {
        // Update instance
        instance.currentValue = value;
        instance.currentText = text; // Update hidden input

        if ($hiddenInput.length > 0) {
          $hiddenInput.val(value).trigger('change');
        } // Update play button state


        SoundFileSelector.updatePlayButtonState(instance, value); // Call custom onChange

        if (typeof config.onChange === 'function') {
          config.onChange(value, text, $selectedItem);
        } // Mark form as changed


        if (typeof Form !== 'undefined' && Form.dataChanged) {
          Form.dataChanged();
        }
      },
      clearable: config.clearable,
      fullTextSearch: config.fullTextSearch,
      forceSelection: config.forceSelection,
      placeholder: config.placeholder,
      ignoreCase: true,
      filterRemoteData: true,
      saveRemoteData: false,
      cache: false,
      hideDividers: 'empty'
    }; // Clear any existing initialization and data

    $dropdown.dropdown('destroy'); // Clear dropdown menu content

    $dropdown.find('.menu').empty(); // Clear any cached data

    $dropdown.removeData(); // Initialize dropdown

    $dropdown.dropdown(dropdownSettings);
  },

  /**
   * Initialize control buttons (play/add)
   * 
   * @param {object} instance - Selector instance
   */
  initializeButtons: function initializeButtons(instance) {
    var _this = this;

    var $container = instance.$container,
        config = instance.config,
        fieldId = instance.fieldId; // Find button container

    var $buttonContainer = $container.find('.ui.buttons').first();

    if ($buttonContainer.length === 0) {
      $buttonContainer = $container.find('.field').last().find('.ui.buttons');
    }

    if ($buttonContainer.length > 0) {
      // Play button
      if (config.showPlayButton) {
        instance.playButton = $buttonContainer.find('.action-playback-button').first();

        if (instance.playButton.length > 0) {
          // Initially disable the button
          instance.playButton.addClass('disabled');
          instance.playButton.off('click').on('click', function (e) {
            e.preventDefault();

            _this.handlePlayClick(instance);
          });
        }
      } // Add button


      if (config.showAddButton) {
        instance.addButton = $buttonContainer.find('a[href*="sound-files/modify"]').first(); // Add button already has href, no additional handling needed
      }
    }
  },

  /**
   * Initialize audio player
   */
  initializeAudioPlayer: function initializeAudioPlayer() {
    var _this2 = this;

    if (!this.audioPlayer) {
      this.audioPlayer = document.createElement('audio');
      this.audioPlayer.preload = 'none';
      this.audioPlayer.style.display = 'none';
      document.body.appendChild(this.audioPlayer); // Handle play/pause events

      this.audioPlayer.addEventListener('ended', function () {
        _this2.stopPlayback();
      });
      this.audioPlayer.addEventListener('error', function (e) {
        console.error('Audio playback error:', e);

        _this2.stopPlayback();
      });
    }
  },

  /**
   * Format dropdown results
   * 
   * @param {object} response - API response
   * @param {boolean} includeEmpty - Include empty option
   * @returns {object} Formatted results
   */
  formatDropdownResults: function formatDropdownResults(response, includeEmpty) {
    var formattedResponse = {
      success: false,
      results: []
    };

    if (includeEmpty) {
      formattedResponse.results.push({
        name: '-',
        value: -1,
        text: '-'
      });
    }

    if (response && response.result && response.data) {
      formattedResponse.success = true;
      response.data.forEach(function (item) {
        // Use represent field which already contains the icon
        var displayName = item.represent;
        formattedResponse.results.push({
          name: displayName,
          value: item.id,
          text: displayName,
          raw: displayName // Store raw text for search

        });
      });
    }

    return formattedResponse;
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
    var _this3 = this;

    // Get file record to get the path
    SoundFilesAPI.getRecord(fileId, function (response) {
      if (response.result && response.data && response.data.path) {
        _this3.currentlyPlayingId = fileId;
        _this3.audioPlayer.src = "/pbxcore/api/v2/sound-files/playback?view=".concat(encodeURIComponent(response.data.path));

        _this3.audioPlayer.play()["catch"](function (error) {
          console.error('Failed to play audio:', error);

          _this3.stopPlayback();
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
   * Update play button state based on selection
   * 
   * @param {object} instance - Selector instance
   * @param {string} value - Selected value
   */
  updatePlayButtonState: function updatePlayButtonState(instance, value) {
    if (instance.playButton) {
      if (!value || value === '-1' || value === -1) {
        instance.playButton.addClass('disabled'); // Make sure icon is in play state when disabled

        instance.playButton.find('i').removeClass('pause').addClass('play');
      } else {
        instance.playButton.removeClass('disabled');
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
      console.warn("SoundFileSelector: Instance not found for field: ".concat(fieldId));
      return;
    }

    var $dropdown = instance.$dropdown,
        $hiddenInput = instance.$hiddenInput; // Set dropdown value

    $dropdown.dropdown('set value', value); // Set text if provided

    if (text) {
      $dropdown.dropdown('set text', text);
      instance.currentText = text;
    } // Update hidden input


    if ($hiddenInput.length > 0) {
      $hiddenInput.val(value);
    }

    instance.currentValue = value;
    this.updatePlayButtonState(instance, value);
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
    var instance = this.instances.get(fieldId);

    if (instance && instance.$dropdown) {
      instance.$dropdown.dropdown('clear cache');
      instance.$dropdown.dropdown('restore defaults');
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
      } // Destroy dropdown


      if (instance.$dropdown) {
        instance.$dropdown.dropdown('destroy');
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

    if (instance && instance.$dropdown) {
      instance.$dropdown.dropdown('clear');
      instance.currentValue = null;
      instance.currentText = null;
      this.updatePlayButtonState(instance, null); // Update hidden input

      if (instance.$hiddenInput.length > 0) {
        instance.$hiddenInput.val('');
      }
    }
  },

  /**
   * Set dropdown selection by value (without representation text)
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Value to select
   */
  setSelected: function setSelected(fieldId, value) {
    var instance = this.instances.get(fieldId);

    if (instance && instance.$dropdown) {
      instance.$dropdown.dropdown('set selected', value);
      instance.currentValue = value;
      this.updatePlayButtonState(instance, value); // Update hidden input

      if (instance.$hiddenInput.length > 0) {
        instance.$hiddenInput.val(value);
      }
    }
  },

  /**
   * Refresh dropdown data and clear cache
   * 
   * @param {string} fieldId - Field ID
   */
  clearCache: function clearCache(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance && instance.$dropdown) {
      // Clear Semantic UI cache
      instance.$dropdown.dropdown('clear cache'); // Clear dropdown menu content

      instance.$dropdown.find('.menu').empty(); // Clear jQuery data cache

      instance.$dropdown.removeData(); // Force refresh on next interaction

      instance.$dropdown.dropdown('refresh');
    }
  },

  /**
   * Check if field has a value selected
   * 
   * @param {string} fieldId - Field ID
   * @returns {boolean} True if has value
   */
  hasValue: function hasValue(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance && instance.currentValue && instance.currentValue !== '-1' && instance.currentValue !== -1;
  },

  /**
   * Get dropdown jQuery object (for advanced operations)
   * 
   * @param {string} fieldId - Field ID
   * @returns {jQuery|null} Dropdown jQuery object
   */
  getDropdown: function getDropdown(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance ? instance.$dropdown : null;
  },

  /**
   * Destroy all instances
   */
  destroyAll: function destroyAll() {
    var _this4 = this;

    this.stopPlayback();
    this.instances.forEach(function (instance, fieldId) {
      _this4.destroy(fieldId);
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsImZvcmNlU2VsZWN0aW9uIiwiY2xlYXJhYmxlIiwiZnVsbFRleHRTZWFyY2giLCJvbkNoYW5nZSIsIm9uUGxheSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwiaW5pdCIsImZpZWxkSWQiLCJvcHRpb25zIiwiJGNvbnRhaW5lciIsIiQiLCJmaXJzdCIsImxlbmd0aCIsImNsb3Nlc3QiLCJwYXJlbnQiLCIkZHJvcGRvd24iLCIkaGlkZGVuSW5wdXQiLCJjb25zb2xlIiwid2FybiIsImhhcyIsImdldCIsImNvbmZpZyIsImRldGVjdFBsYWNlaG9sZGVyIiwiaW5zdGFuY2UiLCJpbml0aWFsaXplZCIsImN1cnJlbnRWYWx1ZSIsImN1cnJlbnRUZXh0IiwicGxheUJ1dHRvbiIsImFkZEJ1dHRvbiIsImluaXRpYWxpemVEcm9wZG93biIsImluaXRpYWxpemVCdXR0b25zIiwiaW5pdGlhbGl6ZUF1ZGlvUGxheWVyIiwic2V0IiwiJGRlZmF1bHRUZXh0IiwiZmluZCIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9TZWxlY3RBdWRpb0ZpbGUiLCJkcm9wZG93blNldHRpbmdzIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJTb3VuZEZpbGVzQVBJIiwiZW5kcG9pbnRzIiwiZ2V0Rm9yU2VsZWN0IiwibWV0aG9kIiwiY2FjaGUiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJkYXRhIiwiX3QiLCJEYXRlIiwibm93Iiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwidmFsdWUiLCIkc2VsZWN0ZWRJdGVtIiwidmFsIiwidHJpZ2dlciIsInVwZGF0ZVBsYXlCdXR0b25TdGF0ZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImlnbm9yZUNhc2UiLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJoaWRlRGl2aWRlcnMiLCJkcm9wZG93biIsImVtcHR5IiwicmVtb3ZlRGF0YSIsIiRidXR0b25Db250YWluZXIiLCJsYXN0IiwiYWRkQ2xhc3MiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhbmRsZVBsYXlDbGljayIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInByZWxvYWQiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwic3RvcFBsYXliYWNrIiwiZXJyb3IiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJyZXN1bHQiLCJmb3JFYWNoIiwiaXRlbSIsImRpc3BsYXlOYW1lIiwicmVwcmVzZW50IiwiaWQiLCJyYXciLCJwYXVzZWQiLCJyZW1vdmVDbGFzcyIsInBsYXlGaWxlIiwiZmlsZUlkIiwiZ2V0UmVjb3JkIiwicGF0aCIsInNyYyIsImVuY29kZVVSSUNvbXBvbmVudCIsInBsYXkiLCJwYXVzZSIsImN1cnJlbnRUaW1lIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsInJlZnJlc2giLCJkZXN0cm95IiwiY2xlYXIiLCJzZXRTZWxlY3RlZCIsImNsZWFyQ2FjaGUiLCJoYXNWYWx1ZSIsImdldERyb3Bkb3duIiwiZGVzdHJveUFsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLEdBQUosRUFOVzs7QUFRdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBWlM7O0FBY3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLElBbEJFOztBQW9CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFO0FBQ05DLElBQUFBLFFBQVEsRUFBRSxRQURKO0FBQ29CO0FBQzFCQyxJQUFBQSxZQUFZLEVBQUUsSUFGUjtBQUVvQjtBQUMxQkMsSUFBQUEsY0FBYyxFQUFFLEtBSFY7QUFHb0I7QUFDMUJDLElBQUFBLFNBQVMsRUFBRSxLQUpMO0FBSW9CO0FBQzFCQyxJQUFBQSxjQUFjLEVBQUUsSUFMVjtBQUtvQjtBQUMxQkMsSUFBQUEsUUFBUSxFQUFFLElBTko7QUFNb0I7QUFDMUJDLElBQUFBLE1BQU0sRUFBRSxJQVBGO0FBT21CO0FBQ3pCQyxJQUFBQSxXQUFXLEVBQUUsSUFSUDtBQVFvQjtBQUMxQkMsSUFBQUEsY0FBYyxFQUFFLElBVFY7QUFTb0I7QUFDMUJDLElBQUFBLGFBQWEsRUFBRSxJQVZULENBVW9COztBQVZwQixHQXhCWTs7QUFxQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLElBNUNzQixnQkE0Q2pCQyxPQTVDaUIsRUE0Q007QUFBQSxRQUFkQyxPQUFjLHVFQUFKLEVBQUk7QUFDeEI7QUFDQSxRQUFJQyxVQUFVLEdBQUdDLENBQUMsWUFBS0gsT0FBTCwwQkFBNEJBLE9BQTVCLGdCQUFELENBQWtESSxLQUFsRCxFQUFqQjs7QUFDQSxRQUFJRixVQUFVLENBQUNHLE1BQVgsS0FBc0IsQ0FBMUIsRUFBNkI7QUFDekJILE1BQUFBLFVBQVUsR0FBR0MsQ0FBQyw0QkFBb0JILE9BQXBCLFNBQUQsQ0FBa0NJLEtBQWxDLEVBQWI7QUFDSDs7QUFDRCxRQUFJRixVQUFVLENBQUNHLE1BQVgsS0FBc0IsQ0FBMUIsRUFBNkI7QUFDekJILE1BQUFBLFVBQVUsR0FBR0MsQ0FBQyxZQUFLSCxPQUFMLGVBQUQsQ0FBMEJNLE9BQTFCLENBQWtDLFFBQWxDLEVBQTRDQyxNQUE1QyxFQUFiO0FBQ0g7O0FBRUQsUUFBTUMsU0FBUyxHQUFHTCxDQUFDLFlBQUtILE9BQUwsZUFBbkI7QUFDQSxRQUFNUyxZQUFZLEdBQUdOLENBQUMsd0JBQWdCSCxPQUFoQixTQUF0Qjs7QUFHQSxRQUFJUSxTQUFTLENBQUNILE1BQVYsS0FBcUIsQ0FBekIsRUFBNEI7QUFDeEJLLE1BQUFBLE9BQU8sQ0FBQ0MsSUFBUiw0REFBaUVYLE9BQWpFO0FBQ0EsYUFBTyxJQUFQO0FBQ0gsS0FqQnVCLENBbUJ4Qjs7O0FBQ0EsUUFBSSxLQUFLaEIsU0FBTCxDQUFlNEIsR0FBZixDQUFtQlosT0FBbkIsQ0FBSixFQUFpQztBQUM3QixhQUFPLEtBQUtoQixTQUFMLENBQWU2QixHQUFmLENBQW1CYixPQUFuQixDQUFQO0FBQ0gsS0F0QnVCLENBd0J4Qjs7O0FBQ0EsUUFBTWMsTUFBTSxtQ0FBUSxLQUFLMUIsUUFBYixHQUEwQmEsT0FBMUIsQ0FBWixDQXpCd0IsQ0EyQnhCOzs7QUFDQSxRQUFJLENBQUNhLE1BQU0sQ0FBQ2xCLFdBQVosRUFBeUI7QUFDckJrQixNQUFBQSxNQUFNLENBQUNsQixXQUFQLEdBQXFCLEtBQUttQixpQkFBTCxDQUF1QlAsU0FBdkIsQ0FBckI7QUFDSCxLQTlCdUIsQ0FnQ3hCOzs7QUFDQSxRQUFNUSxRQUFRLEdBQUc7QUFDYmhCLE1BQUFBLE9BQU8sRUFBUEEsT0FEYTtBQUViRSxNQUFBQSxVQUFVLEVBQVZBLFVBRmE7QUFHYk0sTUFBQUEsU0FBUyxFQUFUQSxTQUhhO0FBSWJDLE1BQUFBLFlBQVksRUFBWkEsWUFKYTtBQUtiSyxNQUFBQSxNQUFNLEVBQU5BLE1BTGE7QUFNYkcsTUFBQUEsV0FBVyxFQUFFLEtBTkE7QUFPYkMsTUFBQUEsWUFBWSxFQUFFLElBUEQ7QUFRYkMsTUFBQUEsV0FBVyxFQUFFLElBUkE7QUFTYkMsTUFBQUEsVUFBVSxFQUFFLElBVEM7QUFVYkMsTUFBQUEsU0FBUyxFQUFFO0FBVkUsS0FBakIsQ0FqQ3dCLENBOEN4Qjs7QUFDQSxTQUFLQyxrQkFBTCxDQUF3Qk4sUUFBeEI7QUFDQSxTQUFLTyxpQkFBTCxDQUF1QlAsUUFBdkI7QUFDQSxTQUFLUSxxQkFBTCxHQWpEd0IsQ0FtRHhCOztBQUNBLFNBQUt4QyxTQUFMLENBQWV5QyxHQUFmLENBQW1CekIsT0FBbkIsRUFBNEJnQixRQUE1QjtBQUNBQSxJQUFBQSxRQUFRLENBQUNDLFdBQVQsR0FBdUIsSUFBdkI7QUFFQSxXQUFPRCxRQUFQO0FBQ0gsR0FwR3FCOztBQXNHdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lELEVBQUFBLGlCQTVHc0IsNkJBNEdKUCxTQTVHSSxFQTRHTztBQUN6QixRQUFNa0IsWUFBWSxHQUFHbEIsU0FBUyxDQUFDbUIsSUFBVixDQUFlLGVBQWYsQ0FBckI7O0FBQ0EsUUFBSUQsWUFBWSxDQUFDckIsTUFBYixHQUFzQixDQUExQixFQUE2QjtBQUN6QixhQUFPcUIsWUFBWSxDQUFDRSxJQUFiLEVBQVA7QUFDSDs7QUFDRCxXQUFPQyxlQUFlLENBQUNDLGtCQUFoQixJQUFzQyxtQkFBN0M7QUFDSCxHQWxIcUI7O0FBb0h0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lSLEVBQUFBLGtCQXpIc0IsOEJBeUhITixRQXpIRyxFQXlITztBQUN6QixRQUFRUixTQUFSLEdBQXFEUSxRQUFyRCxDQUFRUixTQUFSO0FBQUEsUUFBbUJDLFlBQW5CLEdBQXFETyxRQUFyRCxDQUFtQlAsWUFBbkI7QUFBQSxRQUFpQ0ssTUFBakMsR0FBcURFLFFBQXJELENBQWlDRixNQUFqQztBQUFBLFFBQXlDZCxPQUF6QyxHQUFxRGdCLFFBQXJELENBQXlDaEIsT0FBekMsQ0FEeUIsQ0FHekI7O0FBQ0EsUUFBTStCLGdCQUFnQixHQUFHO0FBQ3JCQyxNQUFBQSxXQUFXLEVBQUU7QUFDVEMsUUFBQUEsR0FBRyxFQUFFQyxhQUFhLENBQUNDLFNBQWQsQ0FBd0JDLFlBRHBCO0FBRVRDLFFBQUFBLE1BQU0sRUFBRSxLQUZDO0FBR1RDLFFBQUFBLEtBQUssRUFBRSxLQUhFO0FBSVRDLFFBQUFBLFVBSlMsc0JBSUVDLFFBSkYsRUFJWTtBQUNqQjtBQUNBQSxVQUFBQSxRQUFRLENBQUNDLElBQVQsR0FBZ0I7QUFDWnBELFlBQUFBLFFBQVEsRUFBRXlCLE1BQU0sQ0FBQ3pCLFFBREw7QUFFWnFELFlBQUFBLEVBQUUsRUFBRUMsSUFBSSxDQUFDQyxHQUFMO0FBRlEsV0FBaEI7QUFJQSxpQkFBT0osUUFBUDtBQUNILFNBWFE7QUFZVEssUUFBQUEsVUFaUyxzQkFZRUMsUUFaRixFQVlZO0FBQ2pCLGlCQUFPL0QsaUJBQWlCLENBQUNnRSxxQkFBbEIsQ0FBd0NELFFBQXhDLEVBQWtEaEMsTUFBTSxDQUFDeEIsWUFBekQsQ0FBUDtBQUNIO0FBZFEsT0FEUTtBQWlCckJJLE1BQUFBLFFBakJxQixvQkFpQlpzRCxLQWpCWSxFQWlCTHBCLElBakJLLEVBaUJDcUIsYUFqQkQsRUFpQmdCO0FBQ2pDO0FBQ0FqQyxRQUFBQSxRQUFRLENBQUNFLFlBQVQsR0FBd0I4QixLQUF4QjtBQUNBaEMsUUFBQUEsUUFBUSxDQUFDRyxXQUFULEdBQXVCUyxJQUF2QixDQUhpQyxDQUtqQzs7QUFDQSxZQUFJbkIsWUFBWSxDQUFDSixNQUFiLEdBQXNCLENBQTFCLEVBQTZCO0FBQ3pCSSxVQUFBQSxZQUFZLENBQUN5QyxHQUFiLENBQWlCRixLQUFqQixFQUF3QkcsT0FBeEIsQ0FBZ0MsUUFBaEM7QUFDSCxTQVJnQyxDQVVqQzs7O0FBQ0FwRSxRQUFBQSxpQkFBaUIsQ0FBQ3FFLHFCQUFsQixDQUF3Q3BDLFFBQXhDLEVBQWtEZ0MsS0FBbEQsRUFYaUMsQ0FhakM7O0FBQ0EsWUFBSSxPQUFPbEMsTUFBTSxDQUFDcEIsUUFBZCxLQUEyQixVQUEvQixFQUEyQztBQUN2Q29CLFVBQUFBLE1BQU0sQ0FBQ3BCLFFBQVAsQ0FBZ0JzRCxLQUFoQixFQUF1QnBCLElBQXZCLEVBQTZCcUIsYUFBN0I7QUFDSCxTQWhCZ0MsQ0FrQmpDOzs7QUFDQSxZQUFJLE9BQU9JLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQ0MsV0FBeEMsRUFBcUQ7QUFDakRELFVBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBQ0osT0F2Q29CO0FBd0NyQjlELE1BQUFBLFNBQVMsRUFBRXNCLE1BQU0sQ0FBQ3RCLFNBeENHO0FBeUNyQkMsTUFBQUEsY0FBYyxFQUFFcUIsTUFBTSxDQUFDckIsY0F6Q0Y7QUEwQ3JCRixNQUFBQSxjQUFjLEVBQUV1QixNQUFNLENBQUN2QixjQTFDRjtBQTJDckJLLE1BQUFBLFdBQVcsRUFBRWtCLE1BQU0sQ0FBQ2xCLFdBM0NDO0FBNENyQjJELE1BQUFBLFVBQVUsRUFBRSxJQTVDUztBQTZDckJDLE1BQUFBLGdCQUFnQixFQUFFLElBN0NHO0FBOENyQkMsTUFBQUEsY0FBYyxFQUFFLEtBOUNLO0FBK0NyQm5CLE1BQUFBLEtBQUssRUFBRSxLQS9DYztBQWdEckJvQixNQUFBQSxZQUFZLEVBQUU7QUFoRE8sS0FBekIsQ0FKeUIsQ0F1RHpCOztBQUNBbEQsSUFBQUEsU0FBUyxDQUFDbUQsUUFBVixDQUFtQixTQUFuQixFQXhEeUIsQ0EwRHpCOztBQUNBbkQsSUFBQUEsU0FBUyxDQUFDbUIsSUFBVixDQUFlLE9BQWYsRUFBd0JpQyxLQUF4QixHQTNEeUIsQ0E2RHpCOztBQUNBcEQsSUFBQUEsU0FBUyxDQUFDcUQsVUFBVixHQTlEeUIsQ0FnRXpCOztBQUNBckQsSUFBQUEsU0FBUyxDQUFDbUQsUUFBVixDQUFtQjVCLGdCQUFuQjtBQUNILEdBM0xxQjs7QUE2THRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVIsRUFBQUEsaUJBbE1zQiw2QkFrTUpQLFFBbE1JLEVBa01NO0FBQUE7O0FBQ3hCLFFBQVFkLFVBQVIsR0FBd0NjLFFBQXhDLENBQVFkLFVBQVI7QUFBQSxRQUFvQlksTUFBcEIsR0FBd0NFLFFBQXhDLENBQW9CRixNQUFwQjtBQUFBLFFBQTRCZCxPQUE1QixHQUF3Q2dCLFFBQXhDLENBQTRCaEIsT0FBNUIsQ0FEd0IsQ0FHeEI7O0FBQ0EsUUFBSThELGdCQUFnQixHQUFHNUQsVUFBVSxDQUFDeUIsSUFBWCxDQUFnQixhQUFoQixFQUErQnZCLEtBQS9CLEVBQXZCOztBQUNBLFFBQUkwRCxnQkFBZ0IsQ0FBQ3pELE1BQWpCLEtBQTRCLENBQWhDLEVBQW1DO0FBQy9CeUQsTUFBQUEsZ0JBQWdCLEdBQUc1RCxVQUFVLENBQUN5QixJQUFYLENBQWdCLFFBQWhCLEVBQTBCb0MsSUFBMUIsR0FBaUNwQyxJQUFqQyxDQUFzQyxhQUF0QyxDQUFuQjtBQUNIOztBQUVELFFBQUltQyxnQkFBZ0IsQ0FBQ3pELE1BQWpCLEdBQTBCLENBQTlCLEVBQWlDO0FBQzdCO0FBQ0EsVUFBSVMsTUFBTSxDQUFDakIsY0FBWCxFQUEyQjtBQUN2Qm1CLFFBQUFBLFFBQVEsQ0FBQ0ksVUFBVCxHQUFzQjBDLGdCQUFnQixDQUFDbkMsSUFBakIsQ0FBc0IseUJBQXRCLEVBQWlEdkIsS0FBakQsRUFBdEI7O0FBRUEsWUFBSVksUUFBUSxDQUFDSSxVQUFULENBQW9CZixNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNoQztBQUNBVyxVQUFBQSxRQUFRLENBQUNJLFVBQVQsQ0FBb0I0QyxRQUFwQixDQUE2QixVQUE3QjtBQUVBaEQsVUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9CNkMsR0FBcEIsQ0FBd0IsT0FBeEIsRUFBaUNDLEVBQWpDLENBQW9DLE9BQXBDLEVBQTZDLFVBQUNDLENBQUQsRUFBTztBQUNoREEsWUFBQUEsQ0FBQyxDQUFDQyxjQUFGOztBQUNBLFlBQUEsS0FBSSxDQUFDQyxlQUFMLENBQXFCckQsUUFBckI7QUFDSCxXQUhEO0FBSUg7QUFDSixPQWQ0QixDQWdCN0I7OztBQUNBLFVBQUlGLE1BQU0sQ0FBQ2hCLGFBQVgsRUFBMEI7QUFDdEJrQixRQUFBQSxRQUFRLENBQUNLLFNBQVQsR0FBcUJ5QyxnQkFBZ0IsQ0FBQ25DLElBQWpCLENBQXNCLCtCQUF0QixFQUF1RHZCLEtBQXZELEVBQXJCLENBRHNCLENBRXRCO0FBQ0g7QUFDSjtBQUNKLEdBak9xQjs7QUFtT3RCO0FBQ0o7QUFDQTtBQUNJb0IsRUFBQUEscUJBdE9zQixtQ0FzT0U7QUFBQTs7QUFDcEIsUUFBSSxDQUFDLEtBQUt0QyxXQUFWLEVBQXVCO0FBQ25CLFdBQUtBLFdBQUwsR0FBbUJvRixRQUFRLENBQUNDLGFBQVQsQ0FBdUIsT0FBdkIsQ0FBbkI7QUFDQSxXQUFLckYsV0FBTCxDQUFpQnNGLE9BQWpCLEdBQTJCLE1BQTNCO0FBQ0EsV0FBS3RGLFdBQUwsQ0FBaUJ1RixLQUFqQixDQUF1QkMsT0FBdkIsR0FBaUMsTUFBakM7QUFDQUosTUFBQUEsUUFBUSxDQUFDSyxJQUFULENBQWNDLFdBQWQsQ0FBMEIsS0FBSzFGLFdBQS9CLEVBSm1CLENBTW5COztBQUNBLFdBQUtBLFdBQUwsQ0FBaUIyRixnQkFBakIsQ0FBa0MsT0FBbEMsRUFBMkMsWUFBTTtBQUM3QyxRQUFBLE1BQUksQ0FBQ0MsWUFBTDtBQUNILE9BRkQ7QUFJQSxXQUFLNUYsV0FBTCxDQUFpQjJGLGdCQUFqQixDQUFrQyxPQUFsQyxFQUEyQyxVQUFDVixDQUFELEVBQU87QUFDOUN6RCxRQUFBQSxPQUFPLENBQUNxRSxLQUFSLENBQWMsdUJBQWQsRUFBdUNaLENBQXZDOztBQUNBLFFBQUEsTUFBSSxDQUFDVyxZQUFMO0FBQ0gsT0FIRDtBQUlIO0FBQ0osR0F2UHFCOztBQXlQdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSS9CLEVBQUFBLHFCQWhRc0IsaUNBZ1FBRCxRQWhRQSxFQWdRVXhELFlBaFFWLEVBZ1F3QjtBQUMxQyxRQUFNMEYsaUJBQWlCLEdBQUc7QUFDdEJDLE1BQUFBLE9BQU8sRUFBRSxLQURhO0FBRXRCQyxNQUFBQSxPQUFPLEVBQUU7QUFGYSxLQUExQjs7QUFLQSxRQUFJNUYsWUFBSixFQUFrQjtBQUNkMEYsTUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCQyxJQUExQixDQUErQjtBQUMzQkMsUUFBQUEsSUFBSSxFQUFFLEdBRHFCO0FBRTNCcEMsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FGbUI7QUFHM0JwQixRQUFBQSxJQUFJLEVBQUU7QUFIcUIsT0FBL0I7QUFLSDs7QUFFRCxRQUFJa0IsUUFBUSxJQUFJQSxRQUFRLENBQUN1QyxNQUFyQixJQUErQnZDLFFBQVEsQ0FBQ0wsSUFBNUMsRUFBa0Q7QUFDOUN1QyxNQUFBQSxpQkFBaUIsQ0FBQ0MsT0FBbEIsR0FBNEIsSUFBNUI7QUFDQW5DLE1BQUFBLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjNkMsT0FBZCxDQUFzQixVQUFDQyxJQUFELEVBQVU7QUFDNUI7QUFDQSxZQUFNQyxXQUFXLEdBQUdELElBQUksQ0FBQ0UsU0FBekI7QUFFQVQsUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCQyxJQUExQixDQUErQjtBQUMzQkMsVUFBQUEsSUFBSSxFQUFFSSxXQURxQjtBQUUzQnhDLFVBQUFBLEtBQUssRUFBRXVDLElBQUksQ0FBQ0csRUFGZTtBQUczQjlELFVBQUFBLElBQUksRUFBRTRELFdBSHFCO0FBSTNCRyxVQUFBQSxHQUFHLEVBQUVILFdBSnNCLENBSVY7O0FBSlUsU0FBL0I7QUFNSCxPQVZEO0FBV0g7O0FBRUQsV0FBT1IsaUJBQVA7QUFDSCxHQTlScUI7O0FBZ1N0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLGVBclNzQiwyQkFxU05yRCxRQXJTTSxFQXFTSTtBQUN0QixRQUFRRSxZQUFSLEdBQTZDRixRQUE3QyxDQUFRRSxZQUFSO0FBQUEsUUFBc0JKLE1BQXRCLEdBQTZDRSxRQUE3QyxDQUFzQkYsTUFBdEI7QUFBQSxRQUE4Qk0sVUFBOUIsR0FBNkNKLFFBQTdDLENBQThCSSxVQUE5Qjs7QUFFQSxRQUFJLENBQUNGLFlBQUQsSUFBaUJBLFlBQVksS0FBSyxJQUFsQyxJQUEwQ0EsWUFBWSxLQUFLLENBQUMsQ0FBaEUsRUFBbUU7QUFDL0Q7QUFDSCxLQUxxQixDQU90Qjs7O0FBQ0EsUUFBSSxLQUFLL0Isa0JBQUwsS0FBNEIrQixZQUE1QixJQUE0QyxDQUFDLEtBQUtoQyxXQUFMLENBQWlCMEcsTUFBbEUsRUFBMEU7QUFDdEUsV0FBS2QsWUFBTDtBQUNBO0FBQ0gsS0FYcUIsQ0FhdEI7OztBQUNBLFNBQUtBLFlBQUwsR0Fkc0IsQ0FnQnRCOztBQUNBLFFBQUkxRCxVQUFKLEVBQWdCO0FBQ1pBLE1BQUFBLFVBQVUsQ0FBQ08sSUFBWCxDQUFnQixHQUFoQixFQUFxQmtFLFdBQXJCLENBQWlDLE1BQWpDLEVBQXlDN0IsUUFBekMsQ0FBa0QsT0FBbEQ7QUFDSCxLQW5CcUIsQ0FxQnRCOzs7QUFDQSxTQUFLOEIsUUFBTCxDQUFjNUUsWUFBZCxFQUE0QkYsUUFBNUIsRUF0QnNCLENBd0J0Qjs7QUFDQSxRQUFJLE9BQU9GLE1BQU0sQ0FBQ25CLE1BQWQsS0FBeUIsVUFBN0IsRUFBeUM7QUFDckNtQixNQUFBQSxNQUFNLENBQUNuQixNQUFQLENBQWN1QixZQUFkO0FBQ0g7QUFDSixHQWpVcUI7O0FBbVV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTRFLEVBQUFBLFFBelVzQixvQkF5VWJDLE1BelVhLEVBeVVML0UsUUF6VUssRUF5VUs7QUFBQTs7QUFDdkI7QUFDQWtCLElBQUFBLGFBQWEsQ0FBQzhELFNBQWQsQ0FBd0JELE1BQXhCLEVBQWdDLFVBQUNqRCxRQUFELEVBQWM7QUFDMUMsVUFBSUEsUUFBUSxDQUFDdUMsTUFBVCxJQUFtQnZDLFFBQVEsQ0FBQ0wsSUFBNUIsSUFBb0NLLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjd0QsSUFBdEQsRUFBNEQ7QUFDeEQsUUFBQSxNQUFJLENBQUM5RyxrQkFBTCxHQUEwQjRHLE1BQTFCO0FBQ0EsUUFBQSxNQUFJLENBQUM3RyxXQUFMLENBQWlCZ0gsR0FBakIsdURBQW9FQyxrQkFBa0IsQ0FBQ3JELFFBQVEsQ0FBQ0wsSUFBVCxDQUFjd0QsSUFBZixDQUF0Rjs7QUFDQSxRQUFBLE1BQUksQ0FBQy9HLFdBQUwsQ0FBaUJrSCxJQUFqQixZQUE4QixVQUFBckIsS0FBSyxFQUFJO0FBQ25DckUsVUFBQUEsT0FBTyxDQUFDcUUsS0FBUixDQUFjLHVCQUFkLEVBQXVDQSxLQUF2Qzs7QUFDQSxVQUFBLE1BQUksQ0FBQ0QsWUFBTDtBQUNILFNBSEQ7QUFJSCxPQVBELE1BT087QUFDSDtBQUNBLFlBQUk5RCxRQUFRLENBQUNJLFVBQWIsRUFBeUI7QUFDckJKLFVBQUFBLFFBQVEsQ0FBQ0ksVUFBVCxDQUFvQk8sSUFBcEIsQ0FBeUIsR0FBekIsRUFBOEJrRSxXQUE5QixDQUEwQyxPQUExQyxFQUFtRDdCLFFBQW5ELENBQTRELE1BQTVEO0FBQ0g7QUFDSjtBQUNKLEtBZEQ7QUFlSCxHQTFWcUI7O0FBNFZ0QjtBQUNKO0FBQ0E7QUFDSWMsRUFBQUEsWUEvVnNCLDBCQStWUDtBQUNYLFFBQUksS0FBSzVGLFdBQVQsRUFBc0I7QUFDbEIsV0FBS0EsV0FBTCxDQUFpQm1ILEtBQWpCO0FBQ0EsV0FBS25ILFdBQUwsQ0FBaUJvSCxXQUFqQixHQUErQixDQUEvQjtBQUNIOztBQUVELFNBQUtuSCxrQkFBTCxHQUEwQixJQUExQixDQU5XLENBUVg7O0FBQ0EsU0FBS0gsU0FBTCxDQUFlc0csT0FBZixDQUF1QixVQUFDdEUsUUFBRCxFQUFjO0FBQ2pDLFVBQUlBLFFBQVEsQ0FBQ0ksVUFBYixFQUF5QjtBQUNyQkosUUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9CTyxJQUFwQixDQUF5QixHQUF6QixFQUE4QmtFLFdBQTlCLENBQTBDLE9BQTFDLEVBQW1EN0IsUUFBbkQsQ0FBNEQsTUFBNUQ7QUFDSDtBQUNKLEtBSkQ7QUFLSCxHQTdXcUI7O0FBK1d0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVosRUFBQUEscUJBclhzQixpQ0FxWEFwQyxRQXJYQSxFQXFYVWdDLEtBclhWLEVBcVhpQjtBQUNuQyxRQUFJaEMsUUFBUSxDQUFDSSxVQUFiLEVBQXlCO0FBQ3JCLFVBQUksQ0FBQzRCLEtBQUQsSUFBVUEsS0FBSyxLQUFLLElBQXBCLElBQTRCQSxLQUFLLEtBQUssQ0FBQyxDQUEzQyxFQUE4QztBQUMxQ2hDLFFBQUFBLFFBQVEsQ0FBQ0ksVUFBVCxDQUFvQjRDLFFBQXBCLENBQTZCLFVBQTdCLEVBRDBDLENBRTFDOztBQUNBaEQsUUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9CTyxJQUFwQixDQUF5QixHQUF6QixFQUE4QmtFLFdBQTlCLENBQTBDLE9BQTFDLEVBQW1EN0IsUUFBbkQsQ0FBNEQsTUFBNUQ7QUFDSCxPQUpELE1BSU87QUFDSGhELFFBQUFBLFFBQVEsQ0FBQ0ksVUFBVCxDQUFvQnlFLFdBQXBCLENBQWdDLFVBQWhDO0FBQ0g7QUFDSjtBQUNKLEdBL1hxQjs7QUFpWXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLFFBeFlzQixvQkF3WWJ2RyxPQXhZYSxFQXdZSmdELEtBeFlJLEVBd1lnQjtBQUFBLFFBQWJwQixJQUFhLHVFQUFOLElBQU07QUFDbEMsUUFBTVosUUFBUSxHQUFHLEtBQUtoQyxTQUFMLENBQWU2QixHQUFmLENBQW1CYixPQUFuQixDQUFqQjs7QUFDQSxRQUFJLENBQUNnQixRQUFMLEVBQWU7QUFDWE4sTUFBQUEsT0FBTyxDQUFDQyxJQUFSLDREQUFpRVgsT0FBakU7QUFDQTtBQUNIOztBQUVELFFBQVFRLFNBQVIsR0FBb0NRLFFBQXBDLENBQVFSLFNBQVI7QUFBQSxRQUFtQkMsWUFBbkIsR0FBb0NPLFFBQXBDLENBQW1CUCxZQUFuQixDQVBrQyxDQVNsQzs7QUFDQUQsSUFBQUEsU0FBUyxDQUFDbUQsUUFBVixDQUFtQixXQUFuQixFQUFnQ1gsS0FBaEMsRUFWa0MsQ0FZbEM7O0FBQ0EsUUFBSXBCLElBQUosRUFBVTtBQUNOcEIsTUFBQUEsU0FBUyxDQUFDbUQsUUFBVixDQUFtQixVQUFuQixFQUErQi9CLElBQS9CO0FBQ0FaLE1BQUFBLFFBQVEsQ0FBQ0csV0FBVCxHQUF1QlMsSUFBdkI7QUFDSCxLQWhCaUMsQ0FrQmxDOzs7QUFDQSxRQUFJbkIsWUFBWSxDQUFDSixNQUFiLEdBQXNCLENBQTFCLEVBQTZCO0FBQ3pCSSxNQUFBQSxZQUFZLENBQUN5QyxHQUFiLENBQWlCRixLQUFqQjtBQUNIOztBQUVEaEMsSUFBQUEsUUFBUSxDQUFDRSxZQUFULEdBQXdCOEIsS0FBeEI7QUFDQSxTQUFLSSxxQkFBTCxDQUEyQnBDLFFBQTNCLEVBQXFDZ0MsS0FBckM7QUFDSCxHQWphcUI7O0FBbWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXdELEVBQUFBLFFBemFzQixvQkF5YWJ4RyxPQXphYSxFQXlhSjtBQUNkLFFBQU1nQixRQUFRLEdBQUcsS0FBS2hDLFNBQUwsQ0FBZTZCLEdBQWYsQ0FBbUJiLE9BQW5CLENBQWpCO0FBQ0EsV0FBT2dCLFFBQVEsR0FBR0EsUUFBUSxDQUFDRSxZQUFaLEdBQTJCLElBQTFDO0FBQ0gsR0E1YXFCOztBQThhdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJdUYsRUFBQUEsT0FuYnNCLG1CQW1iZHpHLE9BbmJjLEVBbWJMO0FBQ2IsUUFBTWdCLFFBQVEsR0FBRyxLQUFLaEMsU0FBTCxDQUFlNkIsR0FBZixDQUFtQmIsT0FBbkIsQ0FBakI7O0FBQ0EsUUFBSWdCLFFBQVEsSUFBSUEsUUFBUSxDQUFDUixTQUF6QixFQUFvQztBQUNoQ1EsTUFBQUEsUUFBUSxDQUFDUixTQUFULENBQW1CbUQsUUFBbkIsQ0FBNEIsYUFBNUI7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQ1IsU0FBVCxDQUFtQm1ELFFBQW5CLENBQTRCLGtCQUE1QjtBQUNIO0FBQ0osR0F6YnFCOztBQTJidEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJK0MsRUFBQUEsT0FoY3NCLG1CQWdjZDFHLE9BaGNjLEVBZ2NMO0FBQ2IsUUFBTWdCLFFBQVEsR0FBRyxLQUFLaEMsU0FBTCxDQUFlNkIsR0FBZixDQUFtQmIsT0FBbkIsQ0FBakI7O0FBQ0EsUUFBSWdCLFFBQUosRUFBYztBQUNWO0FBQ0EsVUFBSSxLQUFLN0Isa0JBQUwsS0FBNEI2QixRQUFRLENBQUNFLFlBQXpDLEVBQXVEO0FBQ25ELGFBQUs0RCxZQUFMO0FBQ0gsT0FKUyxDQU1WOzs7QUFDQSxVQUFJOUQsUUFBUSxDQUFDUixTQUFiLEVBQXdCO0FBQ3BCUSxRQUFBQSxRQUFRLENBQUNSLFNBQVQsQ0FBbUJtRCxRQUFuQixDQUE0QixTQUE1QjtBQUNILE9BVFMsQ0FXVjs7O0FBQ0EsVUFBSTNDLFFBQVEsQ0FBQ0ksVUFBYixFQUF5QjtBQUNyQkosUUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9CNkMsR0FBcEIsQ0FBd0IsT0FBeEI7QUFDSCxPQWRTLENBZ0JWOzs7QUFDQSxXQUFLakYsU0FBTCxXQUFzQmdCLE9BQXRCO0FBQ0g7QUFDSixHQXJkcUI7O0FBdWR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kyRyxFQUFBQSxLQTVkc0IsaUJBNGRoQjNHLE9BNWRnQixFQTRkUDtBQUNYLFFBQU1nQixRQUFRLEdBQUcsS0FBS2hDLFNBQUwsQ0FBZTZCLEdBQWYsQ0FBbUJiLE9BQW5CLENBQWpCOztBQUNBLFFBQUlnQixRQUFRLElBQUlBLFFBQVEsQ0FBQ1IsU0FBekIsRUFBb0M7QUFDaENRLE1BQUFBLFFBQVEsQ0FBQ1IsU0FBVCxDQUFtQm1ELFFBQW5CLENBQTRCLE9BQTVCO0FBQ0EzQyxNQUFBQSxRQUFRLENBQUNFLFlBQVQsR0FBd0IsSUFBeEI7QUFDQUYsTUFBQUEsUUFBUSxDQUFDRyxXQUFULEdBQXVCLElBQXZCO0FBQ0EsV0FBS2lDLHFCQUFMLENBQTJCcEMsUUFBM0IsRUFBcUMsSUFBckMsRUFKZ0MsQ0FNaEM7O0FBQ0EsVUFBSUEsUUFBUSxDQUFDUCxZQUFULENBQXNCSixNQUF0QixHQUErQixDQUFuQyxFQUFzQztBQUNsQ1csUUFBQUEsUUFBUSxDQUFDUCxZQUFULENBQXNCeUMsR0FBdEIsQ0FBMEIsRUFBMUI7QUFDSDtBQUNKO0FBQ0osR0F6ZXFCOztBQTJldEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0kwRCxFQUFBQSxXQWpmc0IsdUJBaWZWNUcsT0FqZlUsRUFpZkRnRCxLQWpmQyxFQWlmTTtBQUN4QixRQUFNaEMsUUFBUSxHQUFHLEtBQUtoQyxTQUFMLENBQWU2QixHQUFmLENBQW1CYixPQUFuQixDQUFqQjs7QUFDQSxRQUFJZ0IsUUFBUSxJQUFJQSxRQUFRLENBQUNSLFNBQXpCLEVBQW9DO0FBQ2hDUSxNQUFBQSxRQUFRLENBQUNSLFNBQVQsQ0FBbUJtRCxRQUFuQixDQUE0QixjQUE1QixFQUE0Q1gsS0FBNUM7QUFDQWhDLE1BQUFBLFFBQVEsQ0FBQ0UsWUFBVCxHQUF3QjhCLEtBQXhCO0FBQ0EsV0FBS0kscUJBQUwsQ0FBMkJwQyxRQUEzQixFQUFxQ2dDLEtBQXJDLEVBSGdDLENBS2hDOztBQUNBLFVBQUloQyxRQUFRLENBQUNQLFlBQVQsQ0FBc0JKLE1BQXRCLEdBQStCLENBQW5DLEVBQXNDO0FBQ2xDVyxRQUFBQSxRQUFRLENBQUNQLFlBQVQsQ0FBc0J5QyxHQUF0QixDQUEwQkYsS0FBMUI7QUFDSDtBQUNKO0FBQ0osR0E3ZnFCOztBQStmdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJNkQsRUFBQUEsVUFwZ0JzQixzQkFvZ0JYN0csT0FwZ0JXLEVBb2dCRjtBQUNoQixRQUFNZ0IsUUFBUSxHQUFHLEtBQUtoQyxTQUFMLENBQWU2QixHQUFmLENBQW1CYixPQUFuQixDQUFqQjs7QUFDQSxRQUFJZ0IsUUFBUSxJQUFJQSxRQUFRLENBQUNSLFNBQXpCLEVBQW9DO0FBQ2hDO0FBQ0FRLE1BQUFBLFFBQVEsQ0FBQ1IsU0FBVCxDQUFtQm1ELFFBQW5CLENBQTRCLGFBQTVCLEVBRmdDLENBSWhDOztBQUNBM0MsTUFBQUEsUUFBUSxDQUFDUixTQUFULENBQW1CbUIsSUFBbkIsQ0FBd0IsT0FBeEIsRUFBaUNpQyxLQUFqQyxHQUxnQyxDQU9oQzs7QUFDQTVDLE1BQUFBLFFBQVEsQ0FBQ1IsU0FBVCxDQUFtQnFELFVBQW5CLEdBUmdDLENBVWhDOztBQUNBN0MsTUFBQUEsUUFBUSxDQUFDUixTQUFULENBQW1CbUQsUUFBbkIsQ0FBNEIsU0FBNUI7QUFDSDtBQUNKLEdBbmhCcUI7O0FBcWhCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ltRCxFQUFBQSxRQTNoQnNCLG9CQTJoQmI5RyxPQTNoQmEsRUEyaEJKO0FBQ2QsUUFBTWdCLFFBQVEsR0FBRyxLQUFLaEMsU0FBTCxDQUFlNkIsR0FBZixDQUFtQmIsT0FBbkIsQ0FBakI7QUFDQSxXQUFPZ0IsUUFBUSxJQUFJQSxRQUFRLENBQUNFLFlBQXJCLElBQXFDRixRQUFRLENBQUNFLFlBQVQsS0FBMEIsSUFBL0QsSUFBdUVGLFFBQVEsQ0FBQ0UsWUFBVCxLQUEwQixDQUFDLENBQXpHO0FBQ0gsR0E5aEJxQjs7QUFnaUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTZGLEVBQUFBLFdBdGlCc0IsdUJBc2lCVi9HLE9BdGlCVSxFQXNpQkQ7QUFDakIsUUFBTWdCLFFBQVEsR0FBRyxLQUFLaEMsU0FBTCxDQUFlNkIsR0FBZixDQUFtQmIsT0FBbkIsQ0FBakI7QUFDQSxXQUFPZ0IsUUFBUSxHQUFHQSxRQUFRLENBQUNSLFNBQVosR0FBd0IsSUFBdkM7QUFDSCxHQXppQnFCOztBQTJpQnRCO0FBQ0o7QUFDQTtBQUNJd0csRUFBQUEsVUE5aUJzQix3QkE4aUJUO0FBQUE7O0FBQ1QsU0FBS2xDLFlBQUw7QUFDQSxTQUFLOUYsU0FBTCxDQUFlc0csT0FBZixDQUF1QixVQUFDdEUsUUFBRCxFQUFXaEIsT0FBWCxFQUF1QjtBQUMxQyxNQUFBLE1BQUksQ0FBQzBHLE9BQUwsQ0FBYTFHLE9BQWI7QUFDSCxLQUZEO0FBR0g7QUFuakJxQixDQUExQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIFNvdW5kRmlsZXNBUEksIEZvcm0sIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBTb3VuZEZpbGVTZWxlY3RvciAtIFVuaWZpZWQgY29tcG9uZW50IGZvciBzb3VuZCBmaWxlIGRyb3Bkb3duIHNlbGVjdGlvbiB3aXRoIHBsYXliYWNrXG4gKiBcbiAqIFByb3ZpZGVzIGNvbnNpc3RlbnQgc291bmQgZmlsZSBzZWxlY3Rpb24gZnVuY3Rpb25hbGl0eSBhY3Jvc3MgdGhlIGFwcGxpY2F0aW9uOlxuICogLSBVbmlmaWVkIGluaXRpYWxpemF0aW9uIGFuZCBjb25maWd1cmF0aW9uXG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIGZvciBsb2FkaW5nIHNvdW5kIGZpbGVzXG4gKiAtIEJ1aWx0LWluIGF1ZGlvIHBsYXliYWNrIGZ1bmN0aW9uYWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY3VzdG9tL21vaCBjYXRlZ29yaWVzXG4gKiAtIEludGVncmF0aW9uIHdpdGggcGxheSBhbmQgYWRkIGJ1dHRvbnNcbiAqIFxuICogVXNhZ2U6XG4gKiBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCcjYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAqICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgICAgICAvLyBGaWxlIGNhdGVnb3J5IChjdXN0b20vbW9oKVxuICogICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgICAgIC8vIFNob3cgZW1wdHkgb3B0aW9uXG4gKiAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4geyAuLi4gfSAgLy8gQ2hhbmdlIGNhbGxiYWNrXG4gKiB9KTtcbiAqIFxuICogQG1vZHVsZSBTb3VuZEZpbGVTZWxlY3RvclxuICovXG5jb25zdCBTb3VuZEZpbGVTZWxlY3RvciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgc2VsZWN0b3IgaW5zdGFuY2VzXG4gICAgICogQHR5cGUge01hcH1cbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBdWRpbyBwbGF5ZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtIVE1MQXVkaW9FbGVtZW50fG51bGx9XG4gICAgICovXG4gICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudGx5IHBsYXlpbmcgZmlsZSBJRFxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBjdXJyZW50bHlQbGF5aW5nSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgIC8vIFNvdW5kIGZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgLy8gSW5jbHVkZSBlbXB0eSBvcHRpb25cbiAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLCAgICAvLyBGb3JjZSB1c2VyIHRvIHNlbGVjdCBhIGZpbGVcbiAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSwgICAgICAgICAvLyBBbGxvdyBjbGVhcmluZyBzZWxlY3Rpb25cbiAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsICAgICAvLyBFbmFibGUgZnVsbCB0ZXh0IHNlYXJjaFxuICAgICAgICBvbkNoYW5nZTogbnVsbCwgICAgICAgICAgIC8vIENoYW5nZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBvblBsYXk6IG51bGwsICAgICAgICAgICAgLy8gUGxheSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBwbGFjZWhvbGRlcjogbnVsbCwgICAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgKGF1dG8tZGV0ZWN0ZWQpXG4gICAgICAgIHNob3dQbGF5QnV0dG9uOiB0cnVlLCAgICAgLy8gU2hvdyBwbGF5IGJ1dHRvblxuICAgICAgICBzaG93QWRkQnV0dG9uOiB0cnVlLCAgICAgIC8vIFNob3cgYWRkIG5ldyBmaWxlIGJ1dHRvblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRCAoZS5nLiwgJ2F1ZGlvX21lc3NhZ2VfaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoZmllbGRJZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIC8vIEZpbmQgZWxlbWVudHMgLSB0cnkgbXVsdGlwbGUgd2F5cyB0byBmaW5kIGNvbnRhaW5lclxuICAgICAgICBsZXQgJGNvbnRhaW5lciA9ICQoYCMke2ZpZWxkSWR9LWNvbnRhaW5lciwgLiR7ZmllbGRJZH0tY29udGFpbmVyYCkuZmlyc3QoKTtcbiAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gJChgW2RhdGEtZmllbGQtaWQ9XCIke2ZpZWxkSWR9XCJdYCkuZmlyc3QoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkKGAuJHtmaWVsZElkfS1kcm9wZG93bmApLmNsb3Nlc3QoJy5maWVsZCcpLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAuJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZElkfVwiXWApO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFNvdW5kRmlsZVNlbGVjdG9yOiBEcm9wZG93biBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWRldGVjdCBwbGFjZWhvbGRlclxuICAgICAgICBpZiAoIWNvbmZpZy5wbGFjZWhvbGRlcikge1xuICAgICAgICAgICAgY29uZmlnLnBsYWNlaG9sZGVyID0gdGhpcy5kZXRlY3RQbGFjZWhvbGRlcigkZHJvcGRvd24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgJGNvbnRhaW5lcixcbiAgICAgICAgICAgICRkcm9wZG93bixcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dCxcbiAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgIGluaXRpYWxpemVkOiBmYWxzZSxcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogbnVsbCxcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0OiBudWxsLFxuICAgICAgICAgICAgcGxheUJ1dHRvbjogbnVsbCxcbiAgICAgICAgICAgIGFkZEJ1dHRvbjogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGluc3RhbmNlKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQnV0dG9ucyhpbnN0YW5jZSk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF1ZGlvUGxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBpbnN0YW5jZS5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gRGV0ZWN0ZWQgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdFBsYWNlaG9sZGVyKCRkcm9wZG93bikge1xuICAgICAgICBjb25zdCAkZGVmYXVsdFRleHQgPSAkZHJvcGRvd24uZmluZCgnLmRlZmF1bHQudGV4dCcpO1xuICAgICAgICBpZiAoJGRlZmF1bHRUZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkZGVmYXVsdFRleHQudGV4dCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuc2ZfU2VsZWN0QXVkaW9GaWxlIHx8ICdTZWxlY3QgYXVkaW8gZmlsZSc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggc291bmQgZmlsZSBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZHJvcGRvd24sICRoaWRkZW5JbnB1dCwgY29uZmlnLCBmaWVsZElkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIERyb3Bkb3duIGNvbmZpZ3VyYXRpb24gd2l0aCBubyBjYWNoaW5nXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogU291bmRGaWxlc0FQSS5lbmRwb2ludHMuZ2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRpbWVzdGFtcCB0byBwcmV2ZW50IGNhY2hpbmdcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuZGF0YSA9IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY29uZmlnLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Q6IERhdGUubm93KClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gU291bmRGaWxlU2VsZWN0b3IuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBjb25maWcuaW5jbHVkZUVtcHR5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXkgYnV0dG9uIHN0YXRlXG4gICAgICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3IudXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25DaGFuZ2VcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsZWFyYWJsZTogY29uZmlnLmNsZWFyYWJsZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiBjb25maWcuZnVsbFRleHRTZWFyY2gsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogY29uZmlnLmZvcmNlU2VsZWN0aW9uLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlcixcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgaW5pdGlhbGl6YXRpb24gYW5kIGRhdGFcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBkcm9wZG93biBtZW51IGNvbnRlbnRcbiAgICAgICAgJGRyb3Bkb3duLmZpbmQoJy5tZW51JykuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFueSBjYWNoZWQgZGF0YVxuICAgICAgICAkZHJvcGRvd24ucmVtb3ZlRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oZHJvcGRvd25TZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvbnRyb2wgYnV0dG9ucyAocGxheS9hZGQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQnV0dG9ucyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIsIGNvbmZpZywgZmllbGRJZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGJ1dHRvbiBjb250YWluZXJcbiAgICAgICAgbGV0ICRidXR0b25Db250YWluZXIgPSAkY29udGFpbmVyLmZpbmQoJy51aS5idXR0b25zJykuZmlyc3QoKTtcbiAgICAgICAgaWYgKCRidXR0b25Db250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkYnV0dG9uQ29udGFpbmVyID0gJGNvbnRhaW5lci5maW5kKCcuZmllbGQnKS5sYXN0KCkuZmluZCgnLnVpLmJ1dHRvbnMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCRidXR0b25Db250YWluZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gUGxheSBidXR0b25cbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd1BsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uID0gJGJ1dHRvbkNvbnRhaW5lci5maW5kKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsbHkgZGlzYWJsZSB0aGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQbGF5Q2xpY2soaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBidXR0b25cbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd0FkZEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmFkZEJ1dHRvbiA9ICRidXR0b25Db250YWluZXIuZmluZCgnYVtocmVmKj1cInNvdW5kLWZpbGVzL21vZGlmeVwiXScpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBhbHJlYWR5IGhhcyBocmVmLCBubyBhZGRpdGlvbmFsIGhhbmRsaW5nIG5lZWRlZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1ZGlvIHBsYXllclxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdWRpb1BsYXllcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucHJlbG9hZCA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5hdWRpb1BsYXllcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBwbGF5L3BhdXNlIGV2ZW50c1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1ZGlvIHBsYXliYWNrIGVycm9yOicsIGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGRyb3Bkb3duIHJlc3VsdHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGluY2x1ZGVFbXB0eSAtIEluY2x1ZGUgZW1wdHkgb3B0aW9uXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9ybWF0dGVkIHJlc3VsdHNcbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGluY2x1ZGVFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpbmNsdWRlRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0ZXh0OiAnLSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHJlcHJlc2VudCBmaWVsZCB3aGljaCBhbHJlYWR5IGNvbnRhaW5zIHRoZSBpY29uXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBpdGVtLnJlcHJlc2VudDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0uaWQsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICByYXc6IGRpc3BsYXlOYW1lIC8vIFN0b3JlIHJhdyB0ZXh0IGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcGxheSBidXR0b24gY2xpY2tcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZVBsYXlDbGljayhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSwgY29uZmlnLCBwbGF5QnV0dG9uIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFZhbHVlIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0xJyB8fCBjdXJyZW50VmFsdWUgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgcGxheWluZyB0aGlzIGZpbGVcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9wIGFueSBjdXJyZW50IHBsYXliYWNrXG4gICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBwYXVzZSBpY29uXG4gICAgICAgIGlmIChwbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICBwbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZmlsZSBwYXRoIGFuZCBwbGF5XG4gICAgICAgIHRoaXMucGxheUZpbGUoY3VycmVudFZhbHVlLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvblBsYXkgY2FsbGJhY2tcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25QbGF5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25QbGF5KGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBsYXkgc291bmQgZmlsZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBGaWxlIElEIHRvIHBsYXlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIHBsYXlGaWxlKGZpbGVJZCwgaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gR2V0IGZpbGUgcmVjb3JkIHRvIGdldCB0aGUgcGF0aFxuICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEucGF0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGx5UGxheWluZ0lkID0gZmlsZUlkO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gYC9wYnhjb3JlL2FwaS92Mi9zb3VuZC1maWxlcy9wbGF5YmFjaz92aWV3PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlc3BvbnNlLmRhdGEucGF0aCl9YDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwbGF5IGF1ZGlvOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgZmFpbGVkIHRvIGdldCBmaWxlIGluZm8sIHJldmVydCBpY29uIGJhY2sgdG8gcGxheVxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3AgYXVkaW8gcGxheWJhY2tcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwbGF5IGJ1dHRvbnMgYmFjayB0byBwbGF5IGljb25cbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGxheSBidXR0b24gc3RhdGUgYmFzZWQgb24gc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCB2YWx1ZVxuICAgICAqL1xuICAgIHVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICctMScgfHwgdmFsdWUgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgaWNvbiBpcyBpbiBwbGF5IHN0YXRlIHdoZW4gZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgcHJvZ3JhbW1hdGljYWxseVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIERpc3BsYXkgdGV4dCAob3B0aW9uYWwpXG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUsIHRleHQgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFNvdW5kRmlsZVNlbGVjdG9yOiBJbnN0YW5jZSBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgJGRyb3Bkb3duLCAkaGlkZGVuSW5wdXQgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHZhbHVlJywgdmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRleHQgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHRleHQnLCB0ZXh0KTtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dFxuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UsIHZhbHVlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IHZhbHVlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gQ3VycmVudCB2YWx1ZVxuICAgICAqL1xuICAgIGdldFZhbHVlKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA6IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGRyb3Bkb3duIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgcmVmcmVzaChmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuJGRyb3Bkb3duKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyIGNhY2hlJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ3Jlc3RvcmUgZGVmYXVsdHMnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gU3RvcCBwbGF5YmFjayBpZiBwbGF5aW5nXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc3Ryb3kgZHJvcGRvd25cbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS4kZHJvcGRvd24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ub2ZmKCdjbGljaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBpbnN0YW5jZXNcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS4kZHJvcGRvd24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLiRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IG51bGw7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSwgbnVsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS4kaGlkZGVuSW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLiRoaWRkZW5JbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgZHJvcGRvd24gc2VsZWN0aW9uIGJ5IHZhbHVlICh3aXRob3V0IHJlcHJlc2VudGF0aW9uIHRleHQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNlbGVjdFxuICAgICAqL1xuICAgIHNldFNlbGVjdGVkKGZpZWxkSWQsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuJGRyb3Bkb3duKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UsIHZhbHVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLiRoaWRkZW5JbnB1dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggZHJvcGRvd24gZGF0YSBhbmQgY2xlYXIgY2FjaGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgY2xlYXJDYWNoZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuJGRyb3Bkb3duKSB7XG4gICAgICAgICAgICAvLyBDbGVhciBTZW1hbnRpYyBVSSBjYWNoZVxuICAgICAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhciBjYWNoZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBtZW51IGNvbnRlbnRcbiAgICAgICAgICAgIGluc3RhbmNlLiRkcm9wZG93bi5maW5kKCcubWVudScpLmVtcHR5KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGpRdWVyeSBkYXRhIGNhY2hlXG4gICAgICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24ucmVtb3ZlRGF0YSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3JjZSByZWZyZXNoIG9uIG5leHQgaW50ZXJhY3Rpb25cbiAgICAgICAgICAgIGluc3RhbmNlLiRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBmaWVsZCBoYXMgYSB2YWx1ZSBzZWxlY3RlZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBoYXMgdmFsdWVcbiAgICAgKi9cbiAgICBoYXNWYWx1ZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgJiYgaW5zdGFuY2UuY3VycmVudFZhbHVlICYmIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSAhPT0gJy0xJyAmJiBpbnN0YW5jZS5jdXJyZW50VmFsdWUgIT09IC0xO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIGpRdWVyeSBvYmplY3QgKGZvciBhZHZhbmNlZCBvcGVyYXRpb25zKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7alF1ZXJ5fG51bGx9IERyb3Bkb3duIGpRdWVyeSBvYmplY3RcbiAgICAgKi9cbiAgICBnZXREcm9wZG93bihmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS4kZHJvcGRvd24gOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgaW5zdGFuY2VzXG4gICAgICovXG4gICAgZGVzdHJveUFsbCgpIHtcbiAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=