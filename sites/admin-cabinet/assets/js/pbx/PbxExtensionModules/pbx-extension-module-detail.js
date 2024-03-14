"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * Represents the extension module popup.
 * @class extensionModuleDetail
 * @memberof module:PbxExtensionModules
 */
var extensionModuleDetail = {
  /**
   * jQuery object for the module detail form.
   * @type {jQuery}
   */
  $moduleDetailPopupTpl: $('#module-details-template'),

  /**
   * jQuery object for the module detail form.
   * @type {jQuery}
   */
  $moduleDetailPopup: undefined,

  /**
   * Initializes the extensionModuleDetail object.
   * This method sets up the necessary event handlers to trigger the display of module details
   * when a user clicks on a module row within the PBX system interface.
   */
  initialize: function initialize() {
    // The table rows which activate a detail popup.
    $(document).on('click', 'tr.new-module-row', function (event) {
      event.preventDefault();
      var params = {};
      var $target = $(event.target);

      if ($target.closest('td').hasClass('show-details-on-click')) {
        params.uniqid = $target.closest('tr').data('id');

        if (params.uniqid !== undefined) {
          // Module detail popup form
          extensionModuleDetail.$moduleDetailPopup = extensionModuleDetail.$moduleDetailPopupTpl.clone(true);
          extensionModuleDetail.$moduleDetailPopup.attr('id', 'modal-' + params.uniqid); // Show the popup

          extensionModuleDetail.$moduleDetailPopup.modal({
            position: 'center',
            closable: true
          }).modal('show');
          PbxApi.ModulesGetModuleInfo(params, extensionModuleDetail.cbAfterGetModuleDetails);
        }
      }
    });
  },

  /**
   * Initializes the slider functionality within the module detail modal.
   * This allows users to navigate through any available screenshots or additional informational slides
   * by clicking left or right arrows within the modal.
   *
   * @param {jQuery} modalForm - The modal form within which the slider is to be initialized.
   * This form should contain elements with classes `.slides`, `.right`, `.left`, and `.slide` for the slider to function.
   */
  initializeSlider: function initializeSlider(modalForm) {
    modalForm.find('.slides .right').on('click', function () {
      modalForm.find('.slide').siblings('.active:not(:last-of-type)').removeClass('active').next().addClass('active');
    });
    modalForm.find('.slides .left').on('click', function () {
      modalForm.find('.slide').siblings('.active:not(:first-of-type)').removeClass('active').prev().addClass('active');
    });
  },

  /**
   * Callback function to handle the response after fetching module details from the API.
   * It populates the module detail popup with the retrieved data, including name, logo, version, and other module-specific information.
   *
   * @param {boolean} result - A boolean indicating if the API request was successful.
   * @param {Object} response - The data returned from the API request, expected to contain module details such as name,
   *                            logo URL, version, and other relevant information.
   */
  cbAfterGetModuleDetails: function cbAfterGetModuleDetails(result, response) {
    if (result) {
      var repoData = response.data;
      var $newPopup = extensionModuleDetail.$moduleDetailPopup; // Populate various elements in the popup with data from the response
      // Module name

      if (repoData.name !== undefined) {
        $newPopup.find('.module-name').text(repoData.name);
      } // Module logo


      if (repoData.logotype && repoData.logotype !== '') {
        $newPopup.find('.module-logo').attr('src', repoData.logotype);
      } else {
        $newPopup.find('.module-logo').replaceWith('<i class="icon puzzle"></i>');
      } // Module uniqid


      if (repoData.uniqid !== undefined) {
        $newPopup.find('.module-id').text(repoData.uniqid); // Install last release button

        $newPopup.find('.main-install-button').data('uniqid', repoData.uniqid);
      } // Total count of installations


      if (repoData.downloads !== undefined) {
        $newPopup.find('.module-count-installed').html(repoData.downloads);
      } // Last release version


      if (repoData.releases[0].version !== undefined) {
        $newPopup.find('.module-latest-release').text(repoData.releases[0].version);
        var currentVersion = $("tr.module-row[data-id=".concat(repoData.uniqid, "]")).data('version');

        if (currentVersion !== undefined) {
          $('a.main-install-button span.button-text').text(globalTranslate.ext_UpdateModuleShort);
        }
      } // Developer


      var developerView = extensionModuleDetail.prepareDeveloperView(repoData);
      $newPopup.find('.module-publisher').html(developerView); // Commercial

      if (repoData.commercial !== undefined) {
        var commercialView = extensionModuleDetail.prepareCommercialView(repoData.commercial);
        $newPopup.find('.module-commercial').html(commercialView);
      } // Release size


      if (repoData.releases[0].size !== undefined) {
        var sizeText = extensionModuleDetail.convertBytesToReadableFormat(repoData.releases[0].size);
        $newPopup.find('.module-latest-release-size').text(sizeText);
      } // Screenshots


      if (repoData.screenshots !== undefined && repoData.screenshots.length > 0) {
        var screenshotsView = extensionModuleDetail.prepareScreenshotsView(repoData.screenshots);
        $newPopup.find('.module-screenshots').html(screenshotsView);
      } else {
        $newPopup.find('.module-screenshots').remove();
      } // Description


      var descriptionView = extensionModuleDetail.prepareDescriptionView(repoData);
      $newPopup.find('.module-description').html(descriptionView); // Changelog

      var changelogView = extensionModuleDetail.prepareChangeLogView(repoData);
      $newPopup.find('.module-changelog').html(changelogView); // Initialize the image slider for screenshots, if any

      extensionModuleDetail.initializeSlider($newPopup); // Total count of installations

      if (repoData.eula) {
        $newPopup.find('.module-eula').html(UserMessage.convertToText(repoData.eula));
      } else {
        $newPopup.find('a[data-tab="eula"]').hide();
      } // Initialize tab menu


      $newPopup.find('.module-details-menu .item').tab(); // Hide the dimmer to reveal the popup content

      $newPopup.find('.dimmer').removeClass('active');
    }
  },

  /**
   * Converts a byte value to a human-readable format in megabytes (Mb).
   * This method is useful for displaying file sizes in a more understandable format to users.
   *
   * @param {number} bytes - The size in bytes to be converted.
   * @return {string} The formatted size in megabytes (Mb) with two decimal places.
   */
  convertBytesToReadableFormat: function convertBytesToReadableFormat(bytes) {
    var megabytes = bytes / (1024 * 1024);
    var roundedMegabytes = megabytes.toFixed(2);
    return "".concat(roundedMegabytes, " Mb");
  },

  /**
   * Generates and returns HTML content to display commercial information about the module.
   * This distinguishes between commercial and free modules with an appropriate icon and text.
   *
   * @param {string} commercial - A string indicating the commercial status of the module ('1' for commercial, otherwise free).
   * @return {string} HTML string representing the commercial status of the module.
   */
  prepareCommercialView: function prepareCommercialView(commercial) {
    if (commercial === '1') {
      return '<i class="ui donate icon"></i> ' + globalTranslate.ext_CommercialModule;
    }

    return '<i class="puzzle piece icon"></i> ' + globalTranslate.ext_FreeModule;
  },

  /**
   * Creates and returns HTML content for displaying module screenshots.
   * If there are multiple screenshots, they will be included in a navigable slider.
   *
   * @param {Array} screenshots - An array of objects representing screenshots, each containing URL and name properties.
   * @return {string} HTML content for the screenshot slider.
   */
  prepareScreenshotsView: function prepareScreenshotsView(screenshots) {
    var html = '            <div class="ui container slides">\n' + '                <i class="big left angle icon"></i>\n' + '                <i class="big right angle icon"></i>';
    $.each(screenshots, function (index, screenshot) {
      if (index > 0) {
        html += "<div class=\"slide\"><img class=\"ui fluid image\" src=\"".concat(screenshot.url, "\" alt=\"").concat(screenshot.name, "\"></div>");
      } else {
        html += "<div class=\"slide active\"><img class=\"ui fluid image\" src=\"".concat(screenshot.url, "\" alt=\"").concat(screenshot.name, "\"></div>");
      }
    });
    html += '</div>';
    return html;
  },

  /**
   * Generates and returns HTML content for the module's description section.
   * This includes the module name, a textual description, and any useful links provided.
   *
   * @param {Object} repoData - An object containing the module's metadata, including name, description, and promotional link.
   * @return {string} HTML content for the module's description section.
   */
  prepareDescriptionView: function prepareDescriptionView(repoData) {
    var html = "<div class=\"ui header\">".concat(repoData.name, "</div>");
    html += "<p>".concat(repoData.description, "</p>");
    html += "<div class=\"ui header\">".concat(globalTranslate.ext_UsefulLinks, "</div>");
    html += '<ul class="ui list">';
    html += "<li class=\"item\"><a href=\"".concat(repoData.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a></li>");
    html += '</ul>';
    return html;
  },

  /**
   * Generates and returns HTML content to display the developer's information for the module.
   * This is typically a simple textual representation of the developer's name or identifier.
   *
   * @param {Object} repoData - An object containing the module's metadata, including developer information.
   * @return {string} HTML content for the developer information section.
   */
  prepareDeveloperView: function prepareDeveloperView(repoData) {
    var html = '';
    html += "".concat(repoData.developer);
    return html;
  },

  /**
   * Generates and returns HTML content for displaying the module's changelog.
   * Each release within the module's history is presented with version information, download count, and a detailed changelog.
   *
   * @param {Object} repoData - An object containing the module's metadata, including an array of release objects with version, download count, and changelog information.
   * @return {string} HTML content for the module's changelog section.
   */
  prepareChangeLogView: function prepareChangeLogView(repoData) {
    var html = '';
    $.each(repoData.releases, function (index, release) {
      var releaseDate = release.created;
      releaseDate = releaseDate.split(" ")[0];
      var sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
      var changeLogText = UserMessage.convertToText(release.changelog);

      if (changeLogText === 'null') {
        changeLogText = '';
      }

      html += '<div class="ui clearing segment">';
      html += "<div class=\"ui top attached label\">".concat(globalTranslate.ext_InstallModuleReleaseTag, ": ").concat(release.version, " ").concat(globalTranslate.ext_FromDate, " ").concat(releaseDate, "</div>");
      html += "<div class=\"ui top right attached label\"><i class=\"icon grey download\"></i> <span class=\"ui mini gray text\">".concat(release.downloads, "</span></div>");
      html += "<div class='ui basic segment'><p>".concat(changeLogText, "</p>");
      html += "<a href=\"#\" class=\"ui icon labeled small blue right floated button download\"\n               data-uniqid = \"".concat(repoData.uniqid, "\"\n               data-version = \"").concat(release.version, "\"\n               data-releaseid =\"").concat(release.releaseID, "\">\n                <i class=\"icon download\"></i>\n                ").concat(globalTranslate.ext_InstallModuleVersion, " ").concat(release.version, " (").concat(sizeText, ")\n            </a>");
      html += '</div></div>';
    });
    return html;
  }
}; // When the document is ready, initialize the external modules detail page

$(document).ready(function () {
  extensionModuleDetail.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlc3VsdCIsInJlc3BvbnNlIiwicmVwb0RhdGEiLCIkbmV3UG9wdXAiLCJuYW1lIiwidGV4dCIsImxvZ290eXBlIiwicmVwbGFjZVdpdGgiLCJkb3dubG9hZHMiLCJodG1sIiwicmVsZWFzZXMiLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfVXBkYXRlTW9kdWxlU2hvcnQiLCJkZXZlbG9wZXJWaWV3IiwicHJlcGFyZURldmVsb3BlclZpZXciLCJjb21tZXJjaWFsIiwiY29tbWVyY2lhbFZpZXciLCJwcmVwYXJlQ29tbWVyY2lhbFZpZXciLCJzaXplIiwic2l6ZVRleHQiLCJjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0Iiwic2NyZWVuc2hvdHMiLCJsZW5ndGgiLCJzY3JlZW5zaG90c1ZpZXciLCJwcmVwYXJlU2NyZWVuc2hvdHNWaWV3IiwicmVtb3ZlIiwiZGVzY3JpcHRpb25WaWV3IiwicHJlcGFyZURlc2NyaXB0aW9uVmlldyIsImNoYW5nZWxvZ1ZpZXciLCJwcmVwYXJlQ2hhbmdlTG9nVmlldyIsImV1bGEiLCJVc2VyTWVzc2FnZSIsImNvbnZlcnRUb1RleHQiLCJoaWRlIiwidGFiIiwiYnl0ZXMiLCJtZWdhYnl0ZXMiLCJyb3VuZGVkTWVnYWJ5dGVzIiwidG9GaXhlZCIsImV4dF9Db21tZXJjaWFsTW9kdWxlIiwiZXh0X0ZyZWVNb2R1bGUiLCJlYWNoIiwiaW5kZXgiLCJzY3JlZW5zaG90IiwidXJsIiwiZGVzY3JpcHRpb24iLCJleHRfVXNlZnVsTGlua3MiLCJwcm9tb19saW5rIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJyZWxlYXNlIiwicmVsZWFzZURhdGUiLCJjcmVhdGVkIiwic3BsaXQiLCJjaGFuZ2VMb2dUZXh0IiwiY2hhbmdlbG9nIiwiZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnIiwiZXh0X0Zyb21EYXRlIiwicmVsZWFzZUlEIiwiZXh0X0luc3RhbGxNb2R1bGVWZXJzaW9uIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEscUJBQXFCLEVBQUVDLENBQUMsQ0FBQywwQkFBRCxDQUxFOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUMsU0FYTTs7QUFjMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQW5CMEIsd0JBbUJiO0FBQ1Q7QUFDQUgsSUFBQUEsQ0FBQyxDQUFDSSxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsbUJBQXhCLEVBQTZDLFVBQUND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QUFoQjtBQUNIOztBQUNEL0MsTUFBQUEsSUFBSSxJQUFJLG1DQUFSO0FBQ0FBLE1BQUFBLElBQUksbURBQTBDSSxlQUFlLENBQUM2QywyQkFBMUQsZUFBMEZOLE9BQU8sQ0FBQ3pDLE9BQWxHLGNBQTZHRSxlQUFlLENBQUM4QyxZQUE3SCxjQUE2SU4sV0FBN0ksV0FBSjtBQUNBNUMsTUFBQUEsSUFBSSxnSUFBbUgyQyxPQUFPLENBQUM1QyxTQUEzSCxrQkFBSjtBQUNBQyxNQUFBQSxJQUFJLCtDQUF3QytDLGFBQXhDLFNBQUo7QUFDQS9DLE1BQUFBLElBQUksK0hBQ2dCUCxRQUFRLENBQUNwQixNQUR6QixpREFFaUJzRSxPQUFPLENBQUN6QyxPQUZ6QixrREFHa0J5QyxPQUFPLENBQUNRLFNBSDFCLG1GQUtFL0MsZUFBZSxDQUFDZ0Qsd0JBTGxCLGNBSzhDVCxPQUFPLENBQUN6QyxPQUx0RCxlQUtrRVUsUUFMbEUsd0JBQUo7QUFPQVosTUFBQUEsSUFBSSxJQUFJLGNBQVI7QUFDSCxLQXBCRDtBQXFCQSxXQUFPQSxJQUFQO0FBQ0g7QUE3UnlCLENBQTlCLEMsQ0FnU0E7O0FBQ0F4QyxDQUFDLENBQUNJLFFBQUQsQ0FBRCxDQUFZeUYsS0FBWixDQUFrQixZQUFNO0FBQ3BCL0YsRUFBQUEscUJBQXFCLENBQUNLLFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGV4dGVuc2lvbiBtb2R1bGUgcG9wdXAuXG4gKiBAY2xhc3MgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2R1bGUgZGV0YWlsIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kdWxlRGV0YWlsUG9wdXBUcGw6ICQoJyNtb2R1bGUtZGV0YWlscy10ZW1wbGF0ZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZHVsZSBkZXRhaWwgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2R1bGVEZXRhaWxQb3B1cDogdW5kZWZpbmVkLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsIG9iamVjdC5cbiAgICAgKiBUaGlzIG1ldGhvZCBzZXRzIHVwIHRoZSBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgdG8gdHJpZ2dlciB0aGUgZGlzcGxheSBvZiBtb2R1bGUgZGV0YWlsc1xuICAgICAqIHdoZW4gYSB1c2VyIGNsaWNrcyBvbiBhIG1vZHVsZSByb3cgd2l0aGluIHRoZSBQQlggc3lzdGVtIGludGVyZmFjZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBUaGUgdGFibGUgcm93cyB3aGljaCBhY3RpdmF0ZSBhIGRldGFpbCBwb3B1cC5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ3RyLm5ldy1tb2R1bGUtcm93JywgKGV2ZW50KT0+e1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmNsb3Nlc3QoJ3RkJykuaGFzQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpKXtcbiAgICAgICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJHRhcmdldC5jbG9zZXN0KCd0cicpLmRhdGEoJ2lkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy51bmlxaWQhPT11bmRlZmluZWQpe1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1vZHVsZSBkZXRhaWwgcG9wdXAgZm9ybVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cFRwbC5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cC5hdHRyKCdpZCcsICdtb2RhbC0nK3BhcmFtcy51bmlxaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXBcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0dldE1vZHVsZUluZm8ocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY2JBZnRlckdldE1vZHVsZURldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzbGlkZXIgZnVuY3Rpb25hbGl0eSB3aXRoaW4gdGhlIG1vZHVsZSBkZXRhaWwgbW9kYWwuXG4gICAgICogVGhpcyBhbGxvd3MgdXNlcnMgdG8gbmF2aWdhdGUgdGhyb3VnaCBhbnkgYXZhaWxhYmxlIHNjcmVlbnNob3RzIG9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25hbCBzbGlkZXNcbiAgICAgKiBieSBjbGlja2luZyBsZWZ0IG9yIHJpZ2h0IGFycm93cyB3aXRoaW4gdGhlIG1vZGFsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9IG1vZGFsRm9ybSAtIFRoZSBtb2RhbCBmb3JtIHdpdGhpbiB3aGljaCB0aGUgc2xpZGVyIGlzIHRvIGJlIGluaXRpYWxpemVkLlxuICAgICAqIFRoaXMgZm9ybSBzaG91bGQgY29udGFpbiBlbGVtZW50cyB3aXRoIGNsYXNzZXMgYC5zbGlkZXNgLCBgLnJpZ2h0YCwgYC5sZWZ0YCwgYW5kIGAuc2xpZGVgIGZvciB0aGUgc2xpZGVyIHRvIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVTbGlkZXIobW9kYWxGb3JtKXtcbiAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZXMgLnJpZ2h0JylcbiAgICAgICAgICAgIC5vbignY2xpY2snLCAoKT0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlJylcbiAgICAgICAgICAgICAgICAgICAgLnNpYmxpbmdzKCcuYWN0aXZlOm5vdCg6bGFzdC1vZi10eXBlKScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLm5leHQoKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZXMgLmxlZnQnKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGUnKVxuICAgICAgICAgICAgICAgICAgICAuc2libGluZ3MoJy5hY3RpdmU6bm90KDpmaXJzdC1vZi10eXBlKScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLnByZXYoKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UgYWZ0ZXIgZmV0Y2hpbmcgbW9kdWxlIGRldGFpbHMgZnJvbSB0aGUgQVBJLlxuICAgICAqIEl0IHBvcHVsYXRlcyB0aGUgbW9kdWxlIGRldGFpbCBwb3B1cCB3aXRoIHRoZSByZXRyaWV2ZWQgZGF0YSwgaW5jbHVkaW5nIG5hbWUsIGxvZ28sIHZlcnNpb24sIGFuZCBvdGhlciBtb2R1bGUtc3BlY2lmaWMgaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIEEgYm9vbGVhbiBpbmRpY2F0aW5nIGlmIHRoZSBBUEkgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgZGF0YSByZXR1cm5lZCBmcm9tIHRoZSBBUEkgcmVxdWVzdCwgZXhwZWN0ZWQgdG8gY29udGFpbiBtb2R1bGUgZGV0YWlscyBzdWNoIGFzIG5hbWUsXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nbyBVUkwsIHZlcnNpb24sIGFuZCBvdGhlciByZWxldmFudCBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TW9kdWxlRGV0YWlscyhyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmKHJlc3VsdCkge1xuICAgICAgICAgICAgY29uc3QgcmVwb0RhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICBjb25zdCAkbmV3UG9wdXAgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwO1xuXG5cbiAgICAgICAgICAgIC8vIFBvcHVsYXRlIHZhcmlvdXMgZWxlbWVudHMgaW4gdGhlIHBvcHVwIHdpdGggZGF0YSBmcm9tIHRoZSByZXNwb25zZVxuICAgICAgICAgICAgLy8gTW9kdWxlIG5hbWVcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1uYW1lJykudGV4dChyZXBvRGF0YS5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW9kdWxlIGxvZ29cbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5sb2dvdHlwZSAmJiByZXBvRGF0YS5sb2dvdHlwZSE9PScnKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbG9nbycpLmF0dHIoJ3NyYycsIHJlcG9EYXRhLmxvZ290eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbG9nbycpLnJlcGxhY2VXaXRoKCc8aSBjbGFzcz1cImljb24gcHV6emxlXCI+PC9pPicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgdW5pcWlkXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEudW5pcWlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1pZCcpLnRleHQocmVwb0RhdGEudW5pcWlkKTtcblxuICAgICAgICAgICAgICAgIC8vIEluc3RhbGwgbGFzdCByZWxlYXNlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubWFpbi1pbnN0YWxsLWJ1dHRvbicpLmRhdGEoJ3VuaXFpZCcsIHJlcG9EYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRvdGFsIGNvdW50IG9mIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5kb3dubG9hZHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvdW50LWluc3RhbGxlZCcpLmh0bWwocmVwb0RhdGEuZG93bmxvYWRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGFzdCByZWxlYXNlIHZlcnNpb25cbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZScpLnRleHQocmVwb0RhdGEucmVsZWFzZXNbMF0udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtyZXBvRGF0YS51bmlxaWR9XWApLmRhdGEoJ3ZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZlcnNpb24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkKCdhLm1haW4taW5zdGFsbC1idXR0b24gc3Bhbi5idXR0b24tdGV4dCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGVTaG9ydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXZlbG9wZXJcbiAgICAgICAgICAgIGNvbnN0IGRldmVsb3BlclZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURldmVsb3BlclZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtcHVibGlzaGVyJykuaHRtbChkZXZlbG9wZXJWaWV3KTtcblxuICAgICAgICAgICAgLy8gQ29tbWVyY2lhbFxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmNvbW1lcmNpYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lcmNpYWxWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDb21tZXJjaWFsVmlldyhyZXBvRGF0YS5jb21tZXJjaWFsKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jb21tZXJjaWFsJykuaHRtbChjb21tZXJjaWFsVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbGVhc2Ugc2l6ZVxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVUZXh0ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbGF0ZXN0LXJlbGVhc2Utc2l6ZScpLnRleHQoc2l6ZVRleHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTY3JlZW5zaG90c1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnNjcmVlbnNob3RzICE9PSB1bmRlZmluZWQgJiYgcmVwb0RhdGEuc2NyZWVuc2hvdHMubGVuZ3RoPjApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5zaG90c1ZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZVNjcmVlbnNob3RzVmlldyhyZXBvRGF0YS5zY3JlZW5zaG90cyk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtc2NyZWVuc2hvdHMnKS5odG1sKHNjcmVlbnNob3RzVmlldyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLXNjcmVlbnNob3RzJykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvblZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURlc2NyaXB0aW9uVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1kZXNjcmlwdGlvbicpLmh0bWwoZGVzY3JpcHRpb25WaWV3KTtcblxuICAgICAgICAgICAgLy8gQ2hhbmdlbG9nXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2Vsb2dWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDaGFuZ2VMb2dWaWV3KHJlcG9EYXRhKTtcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNoYW5nZWxvZycpLmh0bWwoY2hhbmdlbG9nVmlldyk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGltYWdlIHNsaWRlciBmb3Igc2NyZWVuc2hvdHMsIGlmIGFueVxuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmluaXRpYWxpemVTbGlkZXIoJG5ld1BvcHVwKTtcblxuICAgICAgICAgICAgLy8gVG90YWwgY291bnQgb2YgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmV1bGEpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1ldWxhJykuaHRtbChVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHJlcG9EYXRhLmV1bGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJ2FbZGF0YS10YWI9XCJldWxhXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1kZXRhaWxzLW1lbnUgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIHRvIHJldmVhbCB0aGUgcG9wdXAgY29udGVudFxuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYSBieXRlIHZhbHVlIHRvIGEgaHVtYW4tcmVhZGFibGUgZm9ybWF0IGluIG1lZ2FieXRlcyAoTWIpLlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIHVzZWZ1bCBmb3IgZGlzcGxheWluZyBmaWxlIHNpemVzIGluIGEgbW9yZSB1bmRlcnN0YW5kYWJsZSBmb3JtYXQgdG8gdXNlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnl0ZXMgLSBUaGUgc2l6ZSBpbiBieXRlcyB0byBiZSBjb252ZXJ0ZWQuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHNpemUgaW4gbWVnYWJ5dGVzIChNYikgd2l0aCB0d28gZGVjaW1hbCBwbGFjZXMuXG4gICAgICovXG4gICAgIGNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQoYnl0ZXMpIHtcbiAgICAgICAgY29uc3QgbWVnYWJ5dGVzID0gYnl0ZXMgLyAoMTAyNCoxMDI0KTtcbiAgICAgICAgY29uc3Qgcm91bmRlZE1lZ2FieXRlcyA9IG1lZ2FieXRlcy50b0ZpeGVkKDIpO1xuICAgICAgICByZXR1cm4gYCR7cm91bmRlZE1lZ2FieXRlc30gTWJgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IHRvIGRpc3BsYXkgY29tbWVyY2lhbCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbW9kdWxlLlxuICAgICAqIFRoaXMgZGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGNvbW1lcmNpYWwgYW5kIGZyZWUgbW9kdWxlcyB3aXRoIGFuIGFwcHJvcHJpYXRlIGljb24gYW5kIHRleHQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29tbWVyY2lhbCAtIEEgc3RyaW5nIGluZGljYXRpbmcgdGhlIGNvbW1lcmNpYWwgc3RhdHVzIG9mIHRoZSBtb2R1bGUgKCcxJyBmb3IgY29tbWVyY2lhbCwgb3RoZXJ3aXNlIGZyZWUpLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjb21tZXJjaWFsIHN0YXR1cyBvZiB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIHByZXBhcmVDb21tZXJjaWFsVmlldyhjb21tZXJjaWFsKSB7XG4gICAgICAgIGlmKGNvbW1lcmNpYWw9PT0nMScpe1xuICAgICAgICAgICAgcmV0dXJuICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPiAnK2dsb2JhbFRyYW5zbGF0ZS5leHRfQ29tbWVyY2lhbE1vZHVsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9GcmVlTW9kdWxlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyBtb2R1bGUgc2NyZWVuc2hvdHMuXG4gICAgICogSWYgdGhlcmUgYXJlIG11bHRpcGxlIHNjcmVlbnNob3RzLCB0aGV5IHdpbGwgYmUgaW5jbHVkZWQgaW4gYSBuYXZpZ2FibGUgc2xpZGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gc2NyZWVuc2hvdHMgLSBBbiBhcnJheSBvZiBvYmplY3RzIHJlcHJlc2VudGluZyBzY3JlZW5zaG90cywgZWFjaCBjb250YWluaW5nIFVSTCBhbmQgbmFtZSBwcm9wZXJ0aWVzLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgc2NyZWVuc2hvdCBzbGlkZXIuXG4gICAgICovXG4gICAgcHJlcGFyZVNjcmVlbnNob3RzVmlldyhzY3JlZW5zaG90cykge1xuICAgICAgICBsZXQgaHRtbCA9XG4gICAgICAgICAgICAnICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbnRhaW5lciBzbGlkZXNcIj5cXG4nICtcbiAgICAgICAgICAgICcgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJiaWcgbGVmdCBhbmdsZSBpY29uXCI+PC9pPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyByaWdodCBhbmdsZSBpY29uXCI+PC9pPic7XG4gICAgICAgICQuZWFjaChzY3JlZW5zaG90cywgZnVuY3Rpb24gKGluZGV4LCBzY3JlZW5zaG90KSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInNsaWRlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGUgYWN0aXZlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqIFRoaXMgaW5jbHVkZXMgdGhlIG1vZHVsZSBuYW1lLCBhIHRleHR1YWwgZGVzY3JpcHRpb24sIGFuZCBhbnkgdXNlZnVsIGxpbmtzIHByb3ZpZGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgbmFtZSwgZGVzY3JpcHRpb24sIGFuZCBwcm9tb3Rpb25hbCBsaW5rLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgZGVzY3JpcHRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGVzY3JpcHRpb25WaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gYDxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke3JlcG9EYXRhLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgaHRtbCArPSBgPHA+JHtyZXBvRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Vc2VmdWxMaW5rc308L2Rpdj5gO1xuICAgICAgICBodG1sICs9ICc8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgaHRtbCArPSBgPGxpIGNsYXNzPVwiaXRlbVwiPjxhIGhyZWY9XCIke3JlcG9EYXRhLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPjwvbGk+YDtcbiAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCB0byBkaXNwbGF5IHRoZSBkZXZlbG9wZXIncyBpbmZvcm1hdGlvbiBmb3IgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGlzIHR5cGljYWxseSBhIHNpbXBsZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkZXZlbG9wZXIncyBuYW1lIG9yIGlkZW50aWZpZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBkZXZlbG9wZXIgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBkZXZlbG9wZXIgaW5mb3JtYXRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGV2ZWxvcGVyVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBodG1sICs9IGAke3JlcG9EYXRhLmRldmVsb3Blcn1gO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nLlxuICAgICAqIEVhY2ggcmVsZWFzZSB3aXRoaW4gdGhlIG1vZHVsZSdzIGhpc3RvcnkgaXMgcHJlc2VudGVkIHdpdGggdmVyc2lvbiBpbmZvcm1hdGlvbiwgZG93bmxvYWQgY291bnQsIGFuZCBhIGRldGFpbGVkIGNoYW5nZWxvZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGFuIGFycmF5IG9mIHJlbGVhc2Ugb2JqZWN0cyB3aXRoIHZlcnNpb24sIGRvd25sb2FkIGNvdW50LCBhbmQgY2hhbmdlbG9nIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nIHNlY3Rpb24uXG4gICAgICovXG4gICAgcHJlcGFyZUNoYW5nZUxvZ1ZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgJC5lYWNoKHJlcG9EYXRhLnJlbGVhc2VzLCBmdW5jdGlvbiAoaW5kZXgsIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIGxldCByZWxlYXNlRGF0ZSA9IHJlbGVhc2UuY3JlYXRlZDtcbiAgICAgICAgICAgIHJlbGVhc2VEYXRlID0gcmVsZWFzZURhdGUuc3BsaXQoXCIgXCIpWzBdO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZWxlYXNlLnNpemUpO1xuICAgICAgICAgICAgbGV0IGNoYW5nZUxvZ1RleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VMb2dUZXh0ID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VMb2dUZXh0ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgY2xlYXJpbmcgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIGF0dGFjaGVkIGxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnfTogJHtyZWxlYXNlLnZlcnNpb259ICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtyZWxlYXNlRGF0ZX08L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbFwiPjxpIGNsYXNzPVwiaWNvbiBncmV5IGRvd25sb2FkXCI+PC9pPiA8c3BhbiBjbGFzcz1cInVpIG1pbmkgZ3JheSB0ZXh0XCI+JHtyZWxlYXNlLmRvd25sb2Fkc308L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9J3VpIGJhc2ljIHNlZ21lbnQnPjxwPiR7Y2hhbmdlTG9nVGV4dH08L3A+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBpY29uIGxhYmVsZWQgc21hbGwgYmx1ZSByaWdodCBmbG9hdGVkIGJ1dHRvbiBkb3dubG9hZFwiXG4gICAgICAgICAgICAgICBkYXRhLXVuaXFpZCA9IFwiJHtyZXBvRGF0YS51bmlxaWR9XCJcbiAgICAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9IFwiJHtyZWxlYXNlLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7cmVsZWFzZS5yZWxlYXNlSUR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlVmVyc2lvbn0gJHtyZWxlYXNlLnZlcnNpb259ICgke3NpemVUZXh0fSlcbiAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZXMgZGV0YWlsIHBhZ2VcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=