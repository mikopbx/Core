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

/* global globalRootUrl, Form, extension  */

const avatar = {
	$picture: $('#avatar'),
	initialize() {
		if (avatar.$picture.attr('src') === '') {
			avatar.$picture.attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
		}
		$('#upload-new-avatar').on('click', () => {
			$('#file-select').click();
		});

		$('#clear-avatar').on('click', () => {
			avatar.$picture.attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
			extension.$formObj.form('set value', 'user_avatar', null);
			extension.$sip_secret.trigger('change');
		});

		$('#file-select').on('change', (e) => {
			let image;
			e.preventDefault();
			const dataTransfer = 'dataTransfer' in e ? e.dataTransfer.files : [];
			const images = 'files' in e.target ? e.target.files : dataTransfer;
			if (images && images.length) {
				Array.from(images).forEach((curImage) => {
					if (typeof curImage !== 'object') return;
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
						const mybase64resized = avatar.resizeCrop(args);
						avatar.$picture.attr('src', mybase64resized);
						extension.$formObj.form('set value', 'user_avatar', mybase64resized);
						extension.$sip_secret.trigger('change');
					};
				});
			}
		});
	},
	resizeCrop({
				   src, width, height, type, compress,
			   }) {
		let newWidth = width;
		let newHeight = height;
		const crop = newWidth === 0 || newHeight === 0;
		// not resize
		if (src.width <= newWidth && newHeight === 0) {
			newWidth = src.width;
			newHeight = src.height;
		}
		// resize
		if (src.width > newWidth && newHeight === 0) {
			newHeight = src.height * (newWidth / src.width);
		}
		// check scale
		const xscale = newWidth / src.width;
		const yscale = newHeight / src.height;
		const scale = crop ? Math.min(xscale, yscale) : Math.max(xscale, yscale);
		// create empty canvas
		const canvas = document.createElement('canvas');
		canvas.width = newWidth || Math.round(src.width * scale);
		canvas.height = newHeight || Math.round(src.height * scale);
		canvas.getContext('2d').scale(scale, scale);
		// crop it top center
		canvas.getContext('2d').drawImage(src, ((src.width * scale) - canvas.width) * -0.5, ((src.height * scale) - canvas.height) * -0.5);
		return canvas.toDataURL(type, compress);
	},
	createObjectURL(i) {
		const URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
		return URL.createObjectURL(i);
	},

};