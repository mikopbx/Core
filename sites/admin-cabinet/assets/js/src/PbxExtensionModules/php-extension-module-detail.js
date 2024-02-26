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
    $moduleDetailPopup: $('#module-details-template'),

    /**
     * jQuery object for the table rows which activate the popup.
     * @type {jQuery}
     */
    $popupActivator: $('tr.module-row'),

    /**
     * Initialize extensionModuleDetail
     */
    initialize() {
        extensionModuleDetail.$popupActivator.on('click',(event)=>{
            const params = {};
            params.uniqid = $(event).closest('tr').attr('id');
            PbxApi.ModulesGetModuleInfo(params, extensionModuleDetail.cbAfterGetModuleDetails);
        });
    },
    initializeSlider($popup){
        $popup.find('.right')
            .on('click', function() {
                $popup.find('.slide')
                    .siblings('.active:not(:last-of-type)')
                    .removeClass('active')
                    .next()
                    .addClass('active');
            });

        $popup.find('.left')
            .on('click', function() {
                $popup.find('..slide')
                    .siblings('.active:not(:first-of-type)')
                    .removeClass('active')
                    .prev()
                    .addClass('active');
            });
    },
    cbOnShowTheDetailPopup(event) {
        // Initialize images slider
        $newPopup = $(event).closest('.module-details-modal-form')
        extensionModuleDetail.initializeSlider($newPopup);

        // Initialize tab menu
        $newPopup.find('.module-details-menu .item').tab();
    },
    cbAfterGetModuleDetails(result, response) {
        if(result){
            const repoData = response.data;

            // Module detail popup form
            const $newPopup = extensionModuleDetail.$moduleDetailPopup.clone(true);
            $newPopup.attr('id', repoData.uniqid);

            // Module name
            $newPopup.find('.module-name').text(repoData.name);

            // Module logo
            $newPopup.find('.module-logo').src(repoData.logotype);

            // Module uniqid
            $newPopup.find('.module-id').text(repoData.uniqid);

            // Install last release button
            $newPopup.find('.main-install-button').attr('data-uniqid', repoData.uniqid);

            // Total count of installations
            $newPopup.find('.module-count-installed').html(repoData.downloads);

            // Last release version
            $newPopup.find('.module-latest-release').text(repoData.releases[0].version);

            // Developer
            const developerView = extensionModuleDetail.prepareDeveloperView(repoData);
            $newPopup.find('.module-publisher').html(developerView);

            // Commercial
            const commercialView = extensionModuleDetail.prepareCommercialView(repoData.commercial);
            $newPopup.find('.module-commercial').html(commercialView);

            // Release size
            const sizeText = extensionModuleDetail.convertBytesToReadableFormat(repoData.releases[0].size);
            $newPopup.find('.module-latest-release-size').text(sizeText);

            // Screenshots
            const screenshotsView = extensionModuleDetail.prepareScreenshotsView(repoData.screenshots);
            $newPopup.find('.module-screenshots').html(screenshotsView);

            // Description
            const descriptionView = extensionModuleDetail.prepareDescriptionView(repoData);
            $newPopup.find('.module-description').html(descriptionView);

            // Changelog
            const changelogView = extensionModuleDetail.prepareChangeLogView(repoData);
            $newPopup.find('.module-changelog').html(changelogView);

            // Show the popup
            $newPopup.popup({
                show: true,
                position: 'top center',
                closable: true,
                onShow: extensionModuleDetail.cbOnShowTheDetailPopup
            });
        }
    },
     convertBytesToReadableFormat(bytes) {
        const megabytes = bytes / (1024*1024);
        const roundedMegabytes = megabytes.toFixed(2);
        return `${roundedMegabytes} Mb`;
    },
    prepareCommercialView(commercial) {
        if(commercial==='1'){
            return '<i class="ui donate icon"></i> '+globalTranslate.ext_CommercialModule;
        }
        return '<i class="puzzle piece icon"></i> '+globalTranslate.ext_FreeModule;
    },
    prepareScreenshotsView(screenshots) {
        let html =
            '<div class="ui container">\n' +
            '            <div class="ui text container slides">\n' +
            '                <i class="big left angle icon"></i>\n' +
            '                <i class="big right angle icon"></i>';
        $.each(screenshots, function (index, screenshot) {
            if (index > 0) {
                html += `<div class="slide"><img src="${screenshot.url}" alt="${screenshot.name}"></div>`;
            } else {
                html += `<div class="slide active"><img src="${screenshot.url}" alt="${screenshot.name}"></div>`;
            }
        });
        html += '</div></div>';
        return html;
    },
    prepareDescriptionView(repoData) {
        let html = `<div class="ui header">${repoData.name}</div>`;
        html += `<p>${repoData.description}</p>`;
        html += `<div class="ui header">${globalTranslate.ext_UsefulLinks}</div>`;
        html += '<ul class="ui list">';
        html += `<li class="item"><a href="${repoData.promo_link}" target="_blank">${globalTranslate.ext_ExternalDescription}</a></li>`;
        html += '</ul>';
        return html;
    },
    prepareDeveloperView(repoData) {
        let html = '';
        html += `${repoData.developer}`;
        return html;
    },
    prepareChangeLogView(repoData) {
        let html = '';
        $.each(repoData.releases, function (index, release) {
            const sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
            html+=`<div class="ui header">${release.version}</div>`;
            html+=`<p>${release.changelog}</p>`;
            html+=`<a href="#" class="ui labeled basic button download"
               data-uniqid = "${repoData.uniqid}"
               data-id ="${release.releaseID}">
                <i class="icon download blue"></i>
                ${globalTranslate.ext_InstallModule} (${sizeText})
            </a>`;
        });
        return html;
    }
}

