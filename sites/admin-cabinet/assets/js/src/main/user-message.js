/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
/* global globalTranslate */
const UserMessage = {
	$ajaxMessagesDiv: $('#ajax-messages'),
	showError(text, header = '') {
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
	showWraning(text, header = '') {
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
	showInformation(text, header = '') {
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
	showMultiString(messages, header = '') {
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
				if (newValue.length > 100) {
					UserMessage.$ajaxMessagesDiv.after(`<div class="ui ${index} message ajax">${newValue}</div>`);
					UserMessage.scrollToMessages();
				} else if (index === 'error') {
					UserMessage.showError(newValue, header);
				} else if (index === 'info') {
					UserMessage.showInformation(newValue, header);
				} else {
					UserMessage.showWraning(newValue, header);
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
			UserMessage.$ajaxMessagesDiv
				.after(`<div class="ui warning message ajax"><div class="ui header">${header}</div>${content}</div>`);
			UserMessage.scrollToMessages();
		}
	},
	scrollToMessages() {
		$('html, body').animate({
			scrollTop: UserMessage.$ajaxMessagesDiv.offset().top-50,
		}, 2000);
	},
};
