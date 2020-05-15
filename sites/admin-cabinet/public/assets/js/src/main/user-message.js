/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

const UserMessage = {
	$ajaxMessagesDiv: $('#ajax-messages'),
	showError(text, header = '') {
		$('body')
			.toast({
				class: 'error',
				displayTime: 0,
				message: text,
				title: header,
				compact: false,
			});
	},
	showWraning(text, header = '') {
		$('body')
			.toast({
				class: 'warning',
				displayTime: 0,
				message: text,
				title: header,
				compact: false,
			});
	},
	showInformation(text, header = '') {
		$('body')
			.toast({
				class: 'success',
				displayTime: 5000,
				message: text,
				title: header,
				compact: false,
			});
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
			$.each(messagesArray, (index, value) => {
				let newValue = value;
				if (previousMessage !== value) {
					if (Array.isArray(newValue)) {
						newValue = newValue.join('<br>');
					}
					UserMessage.$ajaxMessagesDiv
						.after(`<div class="ui ${index} message ajax">${newValue}</div>`);
					UserMessage.scrollToMessages();
				}
				previousMessage = value;
			});
		}
	},
	scrollToMessages() {
		$('html, body').animate({
			scrollTop: UserMessage.$ajaxMessagesDiv.offset().top,
		}, 2000);
	},
};
