import Extensions from '../Extensions/extensions.js';
import Form from '../main/form.js';
/* global globalRootUrl,globalTranslate */

const ClassName = {
	$number: $('#extension'),
	$formObj: $('#form'),
	validateRules: {
		name: {
			identifier: 'name',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.cq_ValidateNameEmpty,
				},
			],
		},
	},
	initialize() {
		// Динамическая проверка свободен ли внутренний номер
		ClassName.$number.on('change', () => {
			const newNumber = ClassName.$formObj.form('get value', 'extension');
			Extensions.checkAvailability(ClassName.defaultNumber, newNumber);
		});

		this.initializeForm();
		ClassName.defaultExtension = ClassName.$formObj.form('get value', 'extension');
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = ClassName.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = ClassName.$formObj;
		Form.url = `${globalRootUrl}call-queues/save`;
		Form.validateRules = ClassName.validateRules;
		Form.cbBeforeSendForm = ClassName.cbBeforeSendForm;
		Form.cbAfterSendForm = ClassName.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	ClassName.initialize();
});

