{{ form('ivr-menu/save', 'role': 'form', 'class': 'ui large form','id':'ivr-menu-form') }}
{{ form.render('id') }}
{{ form.render('uniqid') }}
<div class="ui ribbon label" id="ivr-menu-extension-number">
    <i class="phone icon"></i> {{ extension }}
</div>
<h3 class="ui hidden header "></h3>
<div class="field max-width-500">
    <label for="name">{{ t._('iv_Name') }}</label>
    {{ form.render('name') }}
</div>
<div class="field max-width-800">
    <label>{{ t._('iv_Description') }}</label>
    {{ form.render('description') }}
</div>
{{ partial("partials/playAddNewSound", ['label': t._('iv_PlaySound'), 'id':'audio_message_id', 'fieldClass':'eleven wide field', 'fieldId':'']) }}
<div class="ui compact segment">
    <div class="ui top attached label">{{ t._('iv_Actions') }}</div>
    <div id="actions-place">
        <!-- ROW TEMPLATE -->
        <div class="fields action-row" id="row-template" style="display: none;">
            <div class="three wide field">
                <input name="digits-id" value="" type="text" style="height: 42px;"/>
            </div>
            <div class="eleven wide field">
                <div class="ui search selection dropdown forwarding-select">
                    <input type="hidden" name="extension-id" value="">
                    <i class="dropdown icon"></i>
                    <div class="default text">Select Number</div>
                </div>
            </div>
            <div class="one wide field">
                <div class="ui  icon  button delete-action-row" data-value=""><i class="icon trash red"></i></div>
            </div>
        </div>
        <!-- /ROW TEMPLATE -->
    </div>
    <div class="field">
        <button class="ui labeled icon basic button" id="add-new-ivr-action"><i
                    class="icon plus blue"></i>{{ t._('iv_AddNewRow') }}</button>
    </div>

</div>

<div class="inline field">
    {{ form.render('number_of_repeat') }}
    <label for="number_of_repeat">{{ t._('iv_NumberOfRepeat') }}</label>
</div>
<div class="inline field">
    {{ form.render('timeout') }}
    <label for="timeout">{{ t._('iv_TimeoutToRedirect') }}</label>
</div>
<div class="field">
    <label for="timeout_extension">{{ t._('iv_TimeoutExtension') }}</label>
    {{ form.render('timeout_extension') }}
</div>

<div class="field">
    <div class="ui toggle checkbox">
        {{ form.render('allow_enter_any_internal_extension') }}
        <label for="allow_enter_any_internal_extension">{{ t._('iv_AllowEnterAnyInternalExtension') }}</label>
    </div>
</div>
<div class="field">
    <label for="extension">{{ t._('iv_Extensions') }}</label>
    <div class="field max-width-250">
        <div class="ui icon input extension">
            <i class="search icon"></i>
            {{ form.render('extension') }}
        </div>

        <div class="ui top pointing red label hidden" id="extension-error">
            {{ t._("iv_ThisNumberIsNotFree") }}
        </div>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'ivr-menu/index']) }}
{{ end_form() }}


<script type="application/javascript">
    var ivrActions = '{{ ivractions|json_encode }}';
</script>