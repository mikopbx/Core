/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, Form, extension, Image  */

const avatar = {
    // Store reference to the avatar picture element
    $picture: $('#avatar'),
    
    // Flag to prevent multiple initializations
    initialized: false,

    // Initialize the avatar component
    initialize() {
        // Prevent multiple initializations
        if (avatar.initialized) {
            return;
        }
        avatar.initialized = true;

        // Dynamic avatar loading will be handled by setAvatarUrl method
        // No need to check src here as it's set in template

        // Bind click event to clear avatar button
        $('#clear-avatar').off('click.avatar').on('click.avatar', () => {
            avatar.$picture.attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
            // Set empty value to clear avatar in database
            extension.$formObj.form('set value', 'user_avatar', '');
            extension.$sip_secret.trigger('change');
        });

        // Use FilesAPI.attachToBtn for unified file upload handling
        FilesAPI.attachToBtn('upload-new-avatar', ['jpg', 'jpeg', 'png', 'gif'], (action, params) => {
            if (action === 'fileAdded' && params.file) {
                let image;
                const curImage = params.file.file; // Resumable.js file object

                if (typeof curImage !== 'object') return;

                // Create new image element and load selected image
                image = new Image();
                image.src = avatar.createObjectURL(curImage);
                image.onload = (event) => {
                    const args = {
                        src: event.target,
                        width: 200,
                        height: 200,
                        type: 'image/png',
                        compress: 90,
                    };

                    // Resize and crop the image
                    const mybase64resized = avatar.resizeCrop(args);

                    // Update avatar picture source
                    avatar.$picture.attr('src', mybase64resized);

                    // Update form value and trigger change event
                    extension.$formObj.form('set value', 'user_avatar', mybase64resized);
                    extension.$sip_secret.trigger('change');
                };
            }
        },'file-select');
    },

    // Resize and crop the image
    resizeCrop({
                   src, width, height, type, compress,
               }) {
        let newWidth = width;
        let newHeight = height;
        const crop = newWidth === 0 || newHeight === 0;

        // Skip resizing if the image is smaller than the desired size
        if (src.width <= newWidth && newHeight === 0) {
            newWidth = src.width;
            newHeight = src.height;
        }

        // Calculate new height while maintaining aspect ratio
        if (src.width > newWidth && newHeight === 0) {
            newHeight = src.height * (newWidth / src.width);
        }

        // Calculate scale factors
        const xscale = newWidth / src.width;
        const yscale = newHeight / src.height;
        const scale = crop ? Math.min(xscale, yscale) : Math.max(xscale, yscale);

        // Create an empty canvas element
        const canvas = document.createElement('canvas');
        canvas.width = newWidth || Math.round(src.width * scale);
        canvas.height = newHeight || Math.round(src.height * scale);
        canvas.getContext('2d').scale(scale, scale);

        // Crop the image to the top center
        canvas.getContext('2d').drawImage(src, ((src.width * scale) - canvas.width) * -0.5, ((src.height * scale) - canvas.height) * -0.5);
        return canvas.toDataURL(type, compress);
    },
    createObjectURL(i) {
        const URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
        return URL.createObjectURL(i);
    },

    /**
     * Set avatar URL from API data
     * Handles both base64 data and URL paths
     * @param {string} avatarUrl - Avatar URL or base64 data from API response
     */
    setAvatarUrl(avatarUrl) {
        if (avatarUrl && avatarUrl !== '') {
            // Check if it's a base64 string or a URL
            if (avatarUrl.startsWith('data:image')) {
                // Base64 data - set directly
                avatar.$picture.attr('src', avatarUrl);
                // Also update the form field with base64 data
                extension.$formObj.form('set value', 'user_avatar', avatarUrl);
            } else {
                // URL path - display the image and keep URL in form field
                avatar.$picture.attr('src', avatarUrl);
                // Store the URL in form field - server will ignore URLs and keep existing avatar
                extension.$formObj.form('set value', 'user_avatar', avatarUrl);
            }
        } else {
            // Set default avatar if no URL provided
            avatar.$picture.attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
            // Empty value means no avatar
            extension.$formObj.form('set value', 'user_avatar', '');
        }
    },

};