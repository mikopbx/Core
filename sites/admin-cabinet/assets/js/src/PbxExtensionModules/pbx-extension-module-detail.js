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
const extensionModuleDetail = {
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
    initialize() {
        // The table rows which activate a detail popup.
        $(document).on('click', 'tr.new-module-row', (event)=>{
            event.preventDefault();
            const params = {};
            const $target = $(event.target);
            if ($target.closest('td').hasClass('show-details-on-click')){
                params.uniqid = $target.closest('tr').data('id');
                if (params.uniqid!==undefined){

                    // Module detail popup form
                    extensionModuleDetail.$moduleDetailPopup = extensionModuleDetail.$moduleDetailPopupTpl.clone(true);
                    extensionModuleDetail.$moduleDetailPopup.attr('id', 'modal-'+params.uniqid);

                    // Show the popup
                    extensionModuleDetail.$moduleDetailPopup
                        .modal({
                            position: 'center',
                            closable: true,
                        })
                        .modal('show');
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
    initializeSlider(modalForm){
        modalForm.find('.slides .right')
            .on('click', ()=> {
                modalForm.find('.slide')
                    .siblings('.active:not(:last-of-type)')
                    .removeClass('active')
                    .next()
                    .addClass('active');
            });

        modalForm.find('.slides .left')
            .on('click', ()=> {
                modalForm.find('.slide')
                    .siblings('.active:not(:first-of-type)')
                    .removeClass('active')
                    .prev()
                    .addClass('active');
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
    cbAfterGetModuleDetails(result, response) {
        if(result) {
            const repoData = response.data;

            const $newPopup = extensionModuleDetail.$moduleDetailPopup;


            // Populate various elements in the popup with data from the response
            // Module name
            if (repoData.name !== undefined) {
                $newPopup.find('.module-name').text(repoData.name);
                $newPopup.find('.module-logo').attr('alt', repoData.name);
            }

            // Module logo
            if (repoData.logotype && repoData.logotype!=='') {
                $newPopup.find('.module-logo').attr('src', repoData.logotype);
            }

            // Module uniqid
            if (repoData.uniqid !== undefined) {
                $newPopup.find('.module-id').text(repoData.uniqid);

                // Install last release button
                $newPopup.find('.main-install-button').data('uniqid', repoData.uniqid);
            }

            // Total count of installations
            if (repoData.downloads !== undefined) {
                $newPopup.find('.module-count-installed').html(repoData.downloads);
            }

            // Last release version
            if (repoData.releases[0].version !== undefined) {
                $newPopup.find('.module-latest-release').text(repoData.releases[0].version);
                const currentVersion = $(`tr.module-row[data-id=${repoData.uniqid}]`).data('version');
                if (currentVersion!==undefined){
                    $('a.main-install-button span.button-text').text(globalTranslate.ext_UpdateModuleShort);
                }
            }

            // Developer
            const developerView = extensionModuleDetail.prepareDeveloperView(repoData);
            $newPopup.find('.module-publisher').html(developerView);

            // Commercial
            if (repoData.commercial !== undefined) {
                const commercialView = extensionModuleDetail.prepareCommercialView(repoData.commercial);
                $newPopup.find('.module-commercial').html(commercialView);
            }

            // Release size
            if (repoData.releases[0].size !== undefined) {
                const sizeText = extensionModuleDetail.convertBytesToReadableFormat(repoData.releases[0].size);
                $newPopup.find('.module-latest-release-size').text(sizeText);
            }

            // Screenshots
            if (repoData.screenshots !== undefined && repoData.screenshots.length>0) {
                const screenshotsView = extensionModuleDetail.prepareScreenshotsView(repoData.screenshots);
                $newPopup.find('.module-screenshots').html(screenshotsView);
            } else {
                $newPopup.find('.module-screenshots').remove();
            }

            // Description
            const descriptionView = extensionModuleDetail.prepareDescriptionView(repoData);
            $newPopup.find('.module-description').html(descriptionView);

            // Changelog
            const changelogView = extensionModuleDetail.prepareChangeLogView(repoData);
            $newPopup.find('.module-changelog').html(changelogView);

            // Initialize the image slider for screenshots, if any
            extensionModuleDetail.initializeSlider($newPopup);

            // Total count of installations
            if (repoData.eula) {
                $newPopup.find('.module-eula').html(UserMessage.convertToText(repoData.eula));
            } else {
                $newPopup.find('a[data-tab="eula"]').hide();
            }

            // Initialize tab menu
            $newPopup.find('.module-details-menu .item').tab();

            // Hide the dimmer to reveal the popup content
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
     convertBytesToReadableFormat(bytes) {
        const megabytes = bytes / (1024*1024);
        const roundedMegabytes = megabytes.toFixed(2);
        return `${roundedMegabytes} Mb`;
    },

    /**
     * Generates and returns HTML content to display commercial information about the module.
     * This distinguishes between commercial and free modules with an appropriate icon and text.
     *
     * @param {string} commercial - A string indicating the commercial status of the module ('1' for commercial, otherwise free).
     * @return {string} HTML string representing the commercial status of the module.
     */
    prepareCommercialView(commercial) {
        if(commercial==='1'){
            return '<i class="ui donate icon"></i> '+globalTranslate.ext_CommercialModule;
        }
        return '<i class="puzzle piece icon"></i> '+globalTranslate.ext_FreeModule;
    },

    /**
     * Creates and returns HTML content for displaying module screenshots.
     * If there are multiple screenshots, they will be included in a navigable slider.
     *
     * @param {Array} screenshots - An array of objects representing screenshots, each containing URL and name properties.
     * @return {string} HTML content for the screenshot slider.
     */
    prepareScreenshotsView(screenshots) {
        let html =
            '            <div class="ui container slides">\n' +
            '                <i class="big left angle icon"></i>\n' +
            '                <i class="big right angle icon"></i>';
        $.each(screenshots, function (index, screenshot) {
            if (index > 0) {
                html += `<div class="slide"><img class="ui fluid image" src="${screenshot.url}" alt="${screenshot.name}"></div>`;
            } else {
                html += `<div class="slide active"><img class="ui fluid image" src="${screenshot.url}" alt="${screenshot.name}"></div>`;
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
    prepareDescriptionView(repoData) {
        let html = `<div class="ui header">${repoData.name}</div>`;
        html += `<p>${repoData.description}</p>`;
        html += `<div class="ui header">${globalTranslate.ext_UsefulLinks}</div>`;
        html += '<ul class="ui list">';
        html += `<li class="item"><a href="${repoData.promo_link}" target="_blank">${globalTranslate.ext_ExternalDescription}</a></li>`;
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
    prepareDeveloperView(repoData) {
        let html = '';
        html += `${repoData.developer}`;
        return html;
    },

    /**
     * Generates and returns HTML content for displaying the module's changelog.
     * Each release within the module's history is presented with version information, download count, and a detailed changelog.
     *
     * @param {Object} repoData - An object containing the module's metadata, including an array of release objects with version, download count, and changelog information.
     * @return {string} HTML content for the module's changelog section.
     */
    prepareChangeLogView(repoData) {
        let html = '';
        $.each(repoData.releases, function (index, release) {
            let releaseDate = release.created;
            releaseDate = releaseDate.split(" ")[0];
            const sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
            let changeLogText = UserMessage.convertToText(release.changelog);
            if (changeLogText === 'null') {
                changeLogText = '';
            }
            html += '<div class="ui clearing segment">';
            html += `<div class="ui top attached label">${globalTranslate.ext_InstallModuleReleaseTag}: ${release.version} ${globalTranslate.ext_FromDate} ${releaseDate}</div>`;
            html += `<div class="ui top right attached label"><i class="icon grey download"></i> <span class="ui mini gray text">${release.downloads}</span></div>`;
            html += `<div class='ui basic segment'><p>${changeLogText}</p>`;

            html += `<p><b>${globalTranslate.ext_SystemVersionRequired}: ${release.require_version}</b></p>`;
            html += `<a href="#" class="ui icon labeled small blue right floated button download"
               data-uniqid = "${repoData.uniqid}"
               data-version = "${release.version}"
               data-releaseid ="${release.releaseID}">
                <i class="icon download"></i>
                ${globalTranslate.ext_InstallModuleVersion} ${release.version} (${sizeText})
            </a>`;
            html += '</div></div>';
        });
        return html;
    }
}

// When the document is ready, initialize the external modules detail page
$(document).ready(() => {
    extensionModuleDetail.initialize();
});
