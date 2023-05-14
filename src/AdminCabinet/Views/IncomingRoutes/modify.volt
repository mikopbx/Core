{{ form('incoming-routes/save', 'role': 'form', 'class': 'ui large form', 'id':'incoming-route-form') }}


{{ form.render('id') }}
{{ form.render('priority') }}
{{ form.render('action') }}

<div class="ten wide field">
    <label>{{ t._('ir_RuleName') }}</label>
    {{ form.render('rulename') }}
</div>

<div class="ten wide field">
    <label>{{ t._('ir_Note') }}</label>
    {{ form.render('note') }}
</div>
<h3 class="ui dividing header ">{{ t._("ir_RuleAssignIf") }}</h3>

<div class="ten wide field">
    <label>{{ t._('ir_Provider') }}</label>
    {{ form.render('provider') }}
</div>

<div class="four wide field">
    <label>{{ t._('ir_DidNumber') }}</label>
    {{ form.render('number') }}
</div>
<div class="ui info message">{{ t._('ir_DidNumberDescription') }}</div>
<h3 class="ui dividing header ">{{ t._("ir_CallTransferTo") }}</h3>

<div class="ten wide field">
    <label>{{ t._('ir_Extension') }}</label>
    {{ form.render('extension') }}
</div>

<div class="field">
    <label>{{ t._('ir_TimeoutToTransferDefault') }}</label>
    {{ form.render('timeout') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'incoming-routes/index']) }}
{{ end_form() }}