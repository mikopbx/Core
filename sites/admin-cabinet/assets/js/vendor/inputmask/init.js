Inputmask.extendAliases({
    'email':{
        mask: "*{1,30}[.*{1,30}][.*{1,30}][.*{1,30}][.*{1,30}]@*{1,20}[.*{1,20}][.*{1,20}][.*{2,6}][.*{2,6}]",
        greedy: false,
        onBeforePaste: function (pastedValue, opts) {
            pastedValue = pastedValue.toLowerCase();
            return pastedValue.replace("mailto:", "");
        },
        definitions: {
            '*': {
                validator: "[0-9A-Za-z!#$%&'*+/=?^_`{|}~\-]",
                casing: "lower"
            }
        }
    }
});

$.extend(true, $.fn.form.settings.rules, {'mask': function (value) {
		var mask = $(this).inputmask("getmetadata");
		return Inputmask.isValid(value, mask);
}});



