{{ form(['action' : 'incoming-routes/save', 'method': 'post', 'role': 'form', 'class': 'ui large form', 'id':'incoming-route-form']) }}


{{ form.render('id') }}
{{ form.render('priority') }}
{{ form.render('action') }}

<div class="field max-width-800">
    <label for="note">{{ t._('ir_Note') }}</label>
    {{ form.render('note') }}
</div>
<h3 class="ui dividing header ">{{ t._("ir_RuleAssignIf") }}</h3>

<div class="field max-width-500">
    <label for="providerid">{{ t._('ir_Provider') }}
        <i class="small info circle icon field-info-icon" 
           data-field="providerid"></i>
    </label>
    {{ form.render('providerid') }}
</div>

<div class="field max-width-500">
    <label for="number">{{ t._('ir_DidNumber') }}
        <i class="small info circle icon field-info-icon"
           data-field="number"></i>
    </label>
    {{ form.render('number') }}
</div>
{{ partial("partials/playAddNewSoundWithIcons", ['label': t._('iv_PlaySound'), 'id':'audio_message_id', 'fieldClass':'field max-width-800', 'fieldId':'']) }}
<h3 class="ui dividing header ">{{ t._("ir_CallTransferTo") }}</h3>

<div class="field max-width-800">
    <label for="extension"></label>
    {{ form.render('extension') }}
  </div>

<div class="inline field">
    {{ form.render('timeout') }}
    <label for="timeout">{{ t._('ir_TimeoutToTransferDefault') }}
        <i class="small info circle icon field-info-icon" 
           data-field="timeout"></i>
    </label>

</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'incoming-routes/index']) }}
{{ close('form') }}