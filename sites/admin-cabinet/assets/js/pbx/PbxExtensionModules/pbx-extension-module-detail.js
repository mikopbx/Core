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
      var sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
      var changeLogText = UserMessage.convertToText(release.changelog);
      html += "<div class=\"ui header\">".concat(globalTranslate.ext_InstallModuleReleaseTag, ": ").concat(release.version, "</div>");
      html += "<div class=\"\"><i class=\"icon grey download\"></i> ".concat(release.downloads, "</div>");
      html += "<p>".concat(changeLogText, "</p>");
      html += "<a href=\"#\" class=\"ui icon labeled basic blue button download\"\n               data-uniqid = \"".concat(repoData.uniqid, "\"\n               data-releaseid =\"").concat(release.releaseID, "\">\n                <i class=\"icon download\"></i>\n                ").concat(globalTranslate.ext_InstallModuleVersion, " ").concat(release.version, " (").concat(sizeText, ")\n            </a>");
    });
    return html;
  }
}; // When the document is ready, initialize the external modules detail page

$(document).ready(function () {
  extensionModuleDetail.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlc3VsdCIsInJlc3BvbnNlIiwicmVwb0RhdGEiLCIkbmV3UG9wdXAiLCJuYW1lIiwidGV4dCIsImxvZ290eXBlIiwicmVwbGFjZVdpdGgiLCJkb3dubG9hZHMiLCJodG1sIiwicmVsZWFzZXMiLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfVXBkYXRlTW9kdWxlU2hvcnQiLCJkZXZlbG9wZXJWaWV3IiwicHJlcGFyZURldmVsb3BlclZpZXciLCJjb21tZXJjaWFsIiwiY29tbWVyY2lhbFZpZXciLCJwcmVwYXJlQ29tbWVyY2lhbFZpZXciLCJzaXplIiwic2l6ZVRleHQiLCJjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0Iiwic2NyZWVuc2hvdHMiLCJsZW5ndGgiLCJzY3JlZW5zaG90c1ZpZXciLCJwcmVwYXJlU2NyZWVuc2hvdHNWaWV3IiwicmVtb3ZlIiwiZGVzY3JpcHRpb25WaWV3IiwicHJlcGFyZURlc2NyaXB0aW9uVmlldyIsImNoYW5nZWxvZ1ZpZXciLCJwcmVwYXJlQ2hhbmdlTG9nVmlldyIsImV1bGEiLCJVc2VyTWVzc2FnZSIsImNvbnZlcnRUb1RleHQiLCJoaWRlIiwidGFiIiwiYnl0ZXMiLCJtZWdhYnl0ZXMiLCJyb3VuZGVkTWVnYWJ5dGVzIiwidG9GaXhlZCIsImV4dF9Db21tZXJjaWFsTW9kdWxlIiwiZXh0X0ZyZWVNb2R1bGUiLCJlYWNoIiwiaW5kZXgiLCJzY3JlZW5zaG90IiwidXJsIiwiZGVzY3JpcHRpb24iLCJleHRfVXNlZnVsTGlua3MiLCJwcm9tb19saW5rIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJyZWxlYXNlIiwiY2hhbmdlTG9nVGV4dCIsImNoYW5nZWxvZyIsImV4dF9JbnN0YWxsTW9kdWxlUmVsZWFzZVRhZyIsInJlbGVhc2VJRCIsImV4dF9JbnN0YWxsTW9kdWxlVmVyc2lvbiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQUFxQixFQUFFQyxDQUFDLENBQUMsMEJBQUQsQ0FMRTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUVDLFNBWE07O0FBYzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFuQjBCLHdCQW1CYjtBQUNUO0FBQ0FILElBQUFBLENBQUMsQ0FBQ0ksUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLG1CQUF4QixFQUE2QyxVQUFDQyxLQUFELEVBQVM7QUFDbERBLE1BQUFBLEtBQUssQ0FBQ0MsY0FBTjtBQUNBLFVB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T0FBTyxDQUFDSSxTQUYxQixtRkFJRTNDLGVBQWUsQ0FBQzRDLHdCQUpsQixjQUk4Q0wsT0FBTyxDQUFDekMsT0FKdEQsZUFJa0VVLFFBSmxFLHdCQUFKO0FBTUgsS0FaRDtBQWFBLFdBQU9aLElBQVA7QUFDSDtBQXJSeUIsQ0FBOUIsQyxDQXdSQTs7QUFDQXhDLENBQUMsQ0FBQ0ksUUFBRCxDQUFELENBQVlxRixLQUFaLENBQWtCLFlBQU07QUFDcEIzRixFQUFBQSxxQkFBcUIsQ0FBQ0ssVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZXh0ZW5zaW9uIG1vZHVsZSBwb3B1cC5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVEZXRhaWxcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVEZXRhaWwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZHVsZSBkZXRhaWwgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2R1bGVEZXRhaWxQb3B1cFRwbDogJCgnI21vZHVsZS1kZXRhaWxzLXRlbXBsYXRlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kdWxlIGRldGFpbCBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZHVsZURldGFpbFBvcHVwOiB1bmRlZmluZWQsXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb25Nb2R1bGVEZXRhaWwgb2JqZWN0LlxuICAgICAqIFRoaXMgbWV0aG9kIHNldHMgdXAgdGhlIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyB0byB0cmlnZ2VyIHRoZSBkaXNwbGF5IG9mIG1vZHVsZSBkZXRhaWxzXG4gICAgICogd2hlbiBhIHVzZXIgY2xpY2tzIG9uIGEgbW9kdWxlIHJvdyB3aXRoaW4gdGhlIFBCWCBzeXN0ZW0gaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFRoZSB0YWJsZSByb3dzIHdoaWNoIGFjdGl2YXRlIGEgZGV0YWlsIHBvcHVwLlxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAndHIubmV3LW1vZHVsZS1yb3cnLCAoZXZlbnQpPT57XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpO1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuY2xvc2VzdCgndGQnKS5oYXNDbGFzcygnc2hvdy1kZXRhaWxzLW9uLWNsaWNrJykpe1xuICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykuZGF0YSgnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLnVuaXFpZCE9PXVuZGVmaW5lZCl7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTW9kdWxlIGRldGFpbCBwb3B1cCBmb3JtXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXAgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwVHBsLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwLmF0dHIoJ2lkJywgJ21vZGFsLScrcGFyYW1zLnVuaXFpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cFxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzR2V0TW9kdWxlSW5mbyhwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZURldGFpbC5jYkFmdGVyR2V0TW9kdWxlRGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNsaWRlciBmdW5jdGlvbmFsaXR5IHdpdGhpbiB0aGUgbW9kdWxlIGRldGFpbCBtb2RhbC5cbiAgICAgKiBUaGlzIGFsbG93cyB1c2VycyB0byBuYXZpZ2F0ZSB0aHJvdWdoIGFueSBhdmFpbGFibGUgc2NyZWVuc2hvdHMgb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbmFsIHNsaWRlc1xuICAgICAqIGJ5IGNsaWNraW5nIGxlZnQgb3IgcmlnaHQgYXJyb3dzIHdpdGhpbiB0aGUgbW9kYWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gbW9kYWxGb3JtIC0gVGhlIG1vZGFsIGZvcm0gd2l0aGluIHdoaWNoIHRoZSBzbGlkZXIgaXMgdG8gYmUgaW5pdGlhbGl6ZWQuXG4gICAgICogVGhpcyBmb3JtIHNob3VsZCBjb250YWluIGVsZW1lbnRzIHdpdGggY2xhc3NlcyBgLnNsaWRlc2AsIGAucmlnaHRgLCBgLmxlZnRgLCBhbmQgYC5zbGlkZWAgZm9yIHRoZSBzbGlkZXIgdG8gZnVuY3Rpb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcihtb2RhbEZvcm0pe1xuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAucmlnaHQnKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGUnKVxuICAgICAgICAgICAgICAgICAgICAuc2libGluZ3MoJy5hY3RpdmU6bm90KDpsYXN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAubmV4dCgpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAubGVmdCcpXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgKCk9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZScpXG4gICAgICAgICAgICAgICAgICAgIC5zaWJsaW5ncygnLmFjdGl2ZTpub3QoOmZpcnN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAucHJldigpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZSBhZnRlciBmZXRjaGluZyBtb2R1bGUgZGV0YWlscyBmcm9tIHRoZSBBUEkuXG4gICAgICogSXQgcG9wdWxhdGVzIHRoZSBtb2R1bGUgZGV0YWlsIHBvcHVwIHdpdGggdGhlIHJldHJpZXZlZCBkYXRhLCBpbmNsdWRpbmcgbmFtZSwgbG9nbywgdmVyc2lvbiwgYW5kIG90aGVyIG1vZHVsZS1zcGVjaWZpYyBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzdWx0IC0gQSBib29sZWFuIGluZGljYXRpbmcgaWYgdGhlIEFQSSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBkYXRhIHJldHVybmVkIGZyb20gdGhlIEFQSSByZXF1ZXN0LCBleHBlY3RlZCB0byBjb250YWluIG1vZHVsZSBkZXRhaWxzIHN1Y2ggYXMgbmFtZSxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dvIFVSTCwgdmVyc2lvbiwgYW5kIG90aGVyIHJlbGV2YW50IGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYocmVzdWx0KSB7XG4gICAgICAgICAgICBjb25zdCByZXBvRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgIGNvbnN0ICRuZXdQb3B1cCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXA7XG5cblxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgdmFyaW91cyBlbGVtZW50cyBpbiB0aGUgcG9wdXAgd2l0aCBkYXRhIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAvLyBNb2R1bGUgbmFtZVxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLW5hbWUnKS50ZXh0KHJlcG9EYXRhLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgbG9nb1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmxvZ290eXBlICYmIHJlcG9EYXRhLmxvZ290eXBlIT09JycpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykuYXR0cignc3JjJywgcmVwb0RhdGEubG9nb3R5cGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykucmVwbGFjZVdpdGgoJzxpIGNsYXNzPVwiaWNvbiBwdXp6bGVcIj48L2k+Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1vZHVsZSB1bmlxaWRcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS51bmlxaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWlkJykudGV4dChyZXBvRGF0YS51bmlxaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5zdGFsbCBsYXN0IHJlbGVhc2UgYnV0dG9uXG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tYWluLWluc3RhbGwtYnV0dG9uJykuZGF0YSgndW5pcWlkJywgcmVwb0RhdGEudW5pcWlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVG90YWwgY291bnQgb2YgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmRvd25sb2FkcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtY291bnQtaW5zdGFsbGVkJykuaHRtbChyZXBvRGF0YS5kb3dubG9hZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBMYXN0IHJlbGVhc2UgdmVyc2lvblxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnZlcnNpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWxhdGVzdC1yZWxlYXNlJykudGV4dChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvbiA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke3JlcG9EYXRhLnVuaXFpZH1dYCkuZGF0YSgndmVyc2lvbicpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VmVyc2lvbiE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EubWFpbi1pbnN0YWxsLWJ1dHRvbiBzcGFuLmJ1dHRvbi10ZXh0JykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZVNob3J0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERldmVsb3BlclxuICAgICAgICAgICAgY29uc3QgZGV2ZWxvcGVyVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlRGV2ZWxvcGVyVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1wdWJsaXNoZXInKS5odG1sKGRldmVsb3BlclZpZXcpO1xuXG4gICAgICAgICAgICAvLyBDb21tZXJjaWFsXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuY29tbWVyY2lhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tbWVyY2lhbFZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZUNvbW1lcmNpYWxWaWV3KHJlcG9EYXRhLmNvbW1lcmNpYWwpO1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvbW1lcmNpYWwnKS5odG1sKGNvbW1lcmNpYWxWaWV3KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVsZWFzZSBzaXplXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZXBvRGF0YS5yZWxlYXNlc1swXS5zaXplKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZS1zaXplJykudGV4dChzaXplVGV4dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNjcmVlbnNob3RzXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuc2NyZWVuc2hvdHMgIT09IHVuZGVmaW5lZCAmJiByZXBvRGF0YS5zY3JlZW5zaG90cy5sZW5ndGg+MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbnNob3RzVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlU2NyZWVuc2hvdHNWaWV3KHJlcG9EYXRhLnNjcmVlbnNob3RzKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1zY3JlZW5zaG90cycpLmh0bWwoc2NyZWVuc2hvdHNWaWV3KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtc2NyZWVuc2hvdHMnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlRGVzY3JpcHRpb25WaWV3KHJlcG9EYXRhKTtcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWRlc2NyaXB0aW9uJykuaHRtbChkZXNjcmlwdGlvblZpZXcpO1xuXG4gICAgICAgICAgICAvLyBDaGFuZ2Vsb2dcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWxvZ1ZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZUNoYW5nZUxvZ1ZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtY2hhbmdlbG9nJykuaHRtbChjaGFuZ2Vsb2dWaWV3KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW1hZ2Ugc2xpZGVyIGZvciBzY3JlZW5zaG90cywgaWYgYW55XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuaW5pdGlhbGl6ZVNsaWRlcigkbmV3UG9wdXApO1xuXG4gICAgICAgICAgICAvLyBUb3RhbCBjb3VudCBvZiBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuZXVsYSkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWV1bGEnKS5odG1sKFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQocmVwb0RhdGEuZXVsYSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnYVtkYXRhLXRhYj1cImV1bGFcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnVcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWRldGFpbHMtbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgdG8gcmV2ZWFsIHRoZSBwb3B1cCBjb250ZW50XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhIGJ5dGUgdmFsdWUgdG8gYSBodW1hbi1yZWFkYWJsZSBmb3JtYXQgaW4gbWVnYWJ5dGVzIChNYikuXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZnVsIGZvciBkaXNwbGF5aW5nIGZpbGUgc2l6ZXMgaW4gYSBtb3JlIHVuZGVyc3RhbmRhYmxlIGZvcm1hdCB0byB1c2Vycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIFRoZSBzaXplIGluIGJ5dGVzIHRvIGJlIGNvbnZlcnRlZC5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgc2l6ZSBpbiBtZWdhYnl0ZXMgKE1iKSB3aXRoIHR3byBkZWNpbWFsIHBsYWNlcy5cbiAgICAgKi9cbiAgICAgY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChieXRlcykge1xuICAgICAgICBjb25zdCBtZWdhYnl0ZXMgPSBieXRlcyAvICgxMDI0KjEwMjQpO1xuICAgICAgICBjb25zdCByb3VuZGVkTWVnYWJ5dGVzID0gbWVnYWJ5dGVzLnRvRml4ZWQoMik7XG4gICAgICAgIHJldHVybiBgJHtyb3VuZGVkTWVnYWJ5dGVzfSBNYmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBIVE1MIGNvbnRlbnQgdG8gZGlzcGxheSBjb21tZXJjaWFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBtb2R1bGUuXG4gICAgICogVGhpcyBkaXN0aW5ndWlzaGVzIGJldHdlZW4gY29tbWVyY2lhbCBhbmQgZnJlZSBtb2R1bGVzIHdpdGggYW4gYXBwcm9wcmlhdGUgaWNvbiBhbmQgdGV4dC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb21tZXJjaWFsIC0gQSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgY29tbWVyY2lhbCBzdGF0dXMgb2YgdGhlIG1vZHVsZSAoJzEnIGZvciBjb21tZXJjaWFsLCBvdGhlcndpc2UgZnJlZSkuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGNvbW1lcmNpYWwgc3RhdHVzIG9mIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgcHJlcGFyZUNvbW1lcmNpYWxWaWV3KGNvbW1lcmNpYWwpIHtcbiAgICAgICAgaWYoY29tbWVyY2lhbD09PScxJyl7XG4gICAgICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9Db21tZXJjaWFsTW9kdWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4gJytnbG9iYWxUcmFuc2xhdGUuZXh0X0ZyZWVNb2R1bGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIG1vZHVsZSBzY3JlZW5zaG90cy5cbiAgICAgKiBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgc2NyZWVuc2hvdHMsIHRoZXkgd2lsbCBiZSBpbmNsdWRlZCBpbiBhIG5hdmlnYWJsZSBzbGlkZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzY3JlZW5zaG90cyAtIEFuIGFycmF5IG9mIG9iamVjdHMgcmVwcmVzZW50aW5nIHNjcmVlbnNob3RzLCBlYWNoIGNvbnRhaW5pbmcgVVJMIGFuZCBuYW1lIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBzY3JlZW5zaG90IHNsaWRlci5cbiAgICAgKi9cbiAgICBwcmVwYXJlU2NyZWVuc2hvdHNWaWV3KHNjcmVlbnNob3RzKSB7XG4gICAgICAgIGxldCBodG1sID1cbiAgICAgICAgICAgICcgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29udGFpbmVyIHNsaWRlc1wiPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyBsZWZ0IGFuZ2xlIGljb25cIj48L2k+XFxuJyArXG4gICAgICAgICAgICAnICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYmlnIHJpZ2h0IGFuZ2xlIGljb25cIj48L2k+JztcbiAgICAgICAgJC5lYWNoKHNjcmVlbnNob3RzLCBmdW5jdGlvbiAoaW5kZXgsIHNjcmVlbnNob3QpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJzbGlkZSBhY3RpdmVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgdGhlIG1vZHVsZSdzIGRlc2NyaXB0aW9uIHNlY3Rpb24uXG4gICAgICogVGhpcyBpbmNsdWRlcyB0aGUgbW9kdWxlIG5hbWUsIGEgdGV4dHVhbCBkZXNjcmlwdGlvbiwgYW5kIGFueSB1c2VmdWwgbGlua3MgcHJvdmlkZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBuYW1lLCBkZXNjcmlwdGlvbiwgYW5kIHByb21vdGlvbmFsIGxpbmsuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXNjcmlwdGlvblZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7cmVwb0RhdGEubmFtZX08L2Rpdj5gO1xuICAgICAgICBodG1sICs9IGA8cD4ke3JlcG9EYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VzZWZ1bExpbmtzfTwvZGl2PmA7XG4gICAgICAgIGh0bWwgKz0gJzx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBodG1sICs9IGA8bGkgY2xhc3M9XCJpdGVtXCI+PGEgaHJlZj1cIiR7cmVwb0RhdGEucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+PC9saT5gO1xuICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IHRvIGRpc3BsYXkgdGhlIGRldmVsb3BlcidzIGluZm9ybWF0aW9uIGZvciB0aGUgbW9kdWxlLlxuICAgICAqIFRoaXMgaXMgdHlwaWNhbGx5IGEgc2ltcGxlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRldmVsb3BlcidzIG5hbWUgb3IgaWRlbnRpZmllci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGRldmVsb3BlciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdGhlIGRldmVsb3BlciBpbmZvcm1hdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXZlbG9wZXJWaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGh0bWwgKz0gYCR7cmVwb0RhdGEuZGV2ZWxvcGVyfWA7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cuXG4gICAgICogRWFjaCByZWxlYXNlIHdpdGhpbiB0aGUgbW9kdWxlJ3MgaGlzdG9yeSBpcyBwcmVzZW50ZWQgd2l0aCB2ZXJzaW9uIGluZm9ybWF0aW9uLCBkb3dubG9hZCBjb3VudCwgYW5kIGEgZGV0YWlsZWQgY2hhbmdlbG9nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgYW4gYXJyYXkgb2YgcmVsZWFzZSBvYmplY3RzIHdpdGggdmVyc2lvbiwgZG93bmxvYWQgY291bnQsIGFuZCBjaGFuZ2Vsb2cgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cgc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlQ2hhbmdlTG9nVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICAkLmVhY2gocmVwb0RhdGEucmVsZWFzZXMsIGZ1bmN0aW9uIChpbmRleCwgcmVsZWFzZSkge1xuICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZWxlYXNlLnNpemUpO1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlTG9nVGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQocmVsZWFzZS5jaGFuZ2Vsb2cpO1xuICAgICAgICAgICAgaHRtbCs9YDxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZVJlbGVhc2VUYWd9OiAke3JlbGVhc2UudmVyc2lvbn08L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCs9YDxkaXYgY2xhc3M9XCJcIj48aSBjbGFzcz1cImljb24gZ3JleSBkb3dubG9hZFwiPjwvaT4gJHtyZWxlYXNlLmRvd25sb2Fkc308L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCs9YDxwPiR7Y2hhbmdlTG9nVGV4dH08L3A+YDtcbiAgICAgICAgICAgIGh0bWwrPWA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBsYWJlbGVkIGJhc2ljIGJsdWUgYnV0dG9uIGRvd25sb2FkXCJcbiAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke3JlcG9EYXRhLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtyZWxlYXNlLnJlbGVhc2VJRH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWRcIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVWZXJzaW9ufSAke3JlbGVhc2UudmVyc2lvbn0gKCR7c2l6ZVRleHR9KVxuICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIGRldGFpbCBwYWdlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmluaXRpYWxpemUoKTtcbn0pO1xuIl19