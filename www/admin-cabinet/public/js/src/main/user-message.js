/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
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
	showMultiString(messages) {
		$('.ui.message.ajax').remove();
		let previousMessage = '';
		if (Object.keys(messages).length === 1) {
			$.each(messages, (index, value) => {
				if (index === 'error') {
					UserMessage.showError(value);
				} else if (index === 'warning') {
					UserMessage.showWraning(value);
				} else {
					UserMessage.showInformation(value);
				}
			});
		} else {
			$.each(messages, (index, value) => {
				if (previousMessage !== value) {
					UserMessage.$ajaxMessagesDiv
						.after(`<div class="ui ${index} message ajax">${value}</div>`);
				}
				previousMessage = value;
			});
		}
	},
};
