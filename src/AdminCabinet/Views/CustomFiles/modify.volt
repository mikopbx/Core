{{ form('custom-files/save', 'role': 'form', 'class': 'ui form large', 'id':'custom-file-form') }}
{{ form.render('id') }}
{{ form.render('content') }}
{{ form.render('filepath') }}
<div class="field max-width-800">
    <label>{{ t._('cf_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="field ">
    <label>{{ t._('cf_Mode') }}</label>
    <div class="field max-width-400">
        {{ form.render('mode') }}
    </div>
</div>


<div class="ui top attached tabular menu" id="custom-files-menu">
    <a class="item" data-tab="original">{{ t._('cf_OriginalFileHeader') }}</a>
    <a class="item" data-tab="editor">{{ t._('cf_UserEditHeader') }}</a>
    <a class="item" data-tab="result">{{ t._('cf_ResultFileHeader') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>


<!-- original-section -->
<div class="ui bottom attached tab" data-tab="original">
    <div id="config-file-original" class="application-code"></div>
</div>

<!-- editor-section -->
<div class="ui bottom attached tab" data-tab="editor">
    <div id="user-edit-config" class="application-code"></div>
</div>

<!-- result-section -->
<div class="ui bottom attached tab" data-tab="result">
    <div id="config-file-result" class="application-code"></div>
</div>


{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralMainFields')]) }}

<div class="ui hidden divider"></div>
{{ partial("partials/submitbutton",['indexurl':'custom-files/index/']) }}
{{ end_form() }}