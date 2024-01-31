{{ form('incoming-routes/save', 'role': 'form', 'class': 'ui large form', 'id':'incoming-route-form') }}


{{ form.render('id') }}
{{ form.render('priority') }}
{{ form.render('action') }}

<div class="field max-width-800">
    <label for="note">{{ t._('ir_Note') }}</label>
    {{ form.render('note') }}
</div>
<h3 class="ui dividing header ">{{ t._("ir_RuleAssignIf") }}</h3>

<div class="field max-width-500">
    <label for="provider">{{ t._('ir_Provider') }}</label>
    {{ form.render('provider') }}
</div>

<div class="field">
    <label for="number">{{ t._('ir_DidNumber') }}</label>
    <div class="field max-width-200">
        {{ form.render('number') }}
    </div>
</div>
<div class="ui info message">{{ t._('ir_DidNumberDescription') }}</div>
{{ partial("partials/playAddNewSound", ['label': t._('iv_PlaySound'), 'id':'audio_message_id', 'fieldClass':'eleven wide field', 'fieldId':'']) }}
<h3 class="ui dividing header ">{{ t._("ir_CallTransferTo") }}</h3>

<div class="field max-width-500">
    <label for="extension"></label>
    {{ form.render('extension') }}
</div>

<div class="inline field">
    {{ form.render('timeout') }}
    <label for="timeout">{{ t._('ir_TimeoutToTransferDefault') }}</label>

</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'incoming-routes/index']) }}
{{ end_form() }}