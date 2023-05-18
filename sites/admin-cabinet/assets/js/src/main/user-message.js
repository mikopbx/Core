/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
/* global globalTranslate */
const UserMessage = {
	$ajaxMessagesDiv: $('#ajax-messages'),
	convertToText(text){
		if ((Array.isArray(text) || typeof text === 'object')
			&& Object.keys(text).length > 0
			&& text.messages !== undefined
		) {
			return text.messages;
		} else {
			return text;
		}
	},
	showError(message, header = '') {
		const text = UserMessage.convertToText(message);
		let html = '<div class="ui error message ajax">';
		if (header!==''){
			html +=`<div class="header">${header}</div>`
		} else {
			html +=`<div class="header">${globalTranslate.msg_ErrorHeader}</div>`
		}
		html += `<p>${text}</p></div>`;
		UserMessage.$ajaxMessagesDiv.after(html);
		UserMessage.scrollToMessages();
	},
	showWarning(message, header = '') {
		const text = UserMessage.convertToText(message);
		let html = '<div class="ui warning message ajax">';
		if (header!==''){
			html +=`<div class="header">${header}</div>`
		} else {
			html +=`<div class="header">${globalTranslate.msg_WarningHeader}</div>`
		}
		html += `<p>${text}</p></div>`;
		UserMessage.$ajaxMessagesDiv.after(html);
		UserMessage.scrollToMessages();
	},
	showInformation(message, header = '') {
		const text = UserMessage.convertToText(message);
		let html = '<div class="ui info message ajax">';
		if (header!==''){
			html +=`<div class="header">${header}</div>`
		} else {
			html +=`<div class="header">${globalTranslate.msg_infoHeader}</div>`
		}
		html += `<p>${text}</p></div>`;
		UserMessage.$ajaxMessagesDiv.after(html);
		UserMessage.scrollToMessages();
	},
	showMultiString(message, header = '') {
		let messages = UserMessage.convertToText(message);
		$('.ui.message.ajax').remove();
		if (!messages) return;

		// Remove empty values
		let messagesArray = [];
		if ((Array.isArray(messages) || typeof messages === 'object')
			&& Object.keys(messages).length > 0) {
			messagesArray = messages;
			$.each(messages, (index, value) => {
				if (!value) {
					if (Array.isArray(messagesArray)){
						messagesArray.pop(index);
					} else {
						delete messagesArray[index];
					}

				}
			});
		} else if (!Array.isArray(messages) && messages) {
			messagesArray = { error: messages };
		}
		let previousMessage = '';
		if (messagesArray.length === 1 || Object.keys(messagesArray).length === 1) {
			$.each(messagesArray, (index, value) => {
				if (previousMessage === value) {
					return;
				}
				let newValue = value;
				if (Array.isArray(newValue)) {
					newValue = newValue.join('<br>');
				}
				if (index === 'error') {
					UserMessage.showError(newValue, header);
				} else if (index === 'info') {
					UserMessage.showInformation(newValue, header);
				} else {
					UserMessage.showWarning(newValue, header);
				}
				previousMessage = value;
			});
		} else {
			let content = '';
			$.each(messagesArray, (index, value) => {
				let newValue = value;
				if (previousMessage !== value) {
					if (Array.isArray(newValue)) {
						newValue = newValue.join('<br>');
					}
					content = `${content}<br>${newValue}`;
				}
				previousMessage = value;
			});
			UserMessage.showWarning(content, header);
		}
	},
	scrollToMessages() {
		$('html, body').animate({
			scrollTop: UserMessage.$ajaxMessagesDiv.offset().top-50,
		}, 2000);
	},
};
