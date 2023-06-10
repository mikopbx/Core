{{ form('dialplan-applications/save', 'role': 'form', 'class': 'ui form large', 'id':'dialplan-application-form') }}
{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('applicationlogic') }}
<div class="ui ribbon label" id="dialplan-application-extension-number">
    <i class="phone icon"></i> {{ extension }}
</div>
<h3 class="ui hidden header "></h3>
<div class="ui top attached tabular menu" id="application-code-menu">
    <a class="item" data-tab="main">{{ t._('da_Main') }}</a>
    <a class="item active" data-tab="code">{{ t._('da_Applicationlogic') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>
<div class="ui bottom attached tab segment" data-tab="main">

    <div class="field">
        <label>{{ t._('da_Name') }}</label>
        <div class="field max-width-800">
        {{ form.render('name') }}
        </div>
    </div>
    <div class="field">
        <label>{{ t._('da_Description') }}</label>
        <div class="field max-width-800">
        {{ form.render('description') }}
        </div>
    </div>
    <div class="field">
        <label>{{ t._('da_Extensions') }}</label>
        <div class="field max-width-200">
        <div class="ui icon input extension">
            <i class="search icon"></i>
            {{ form.render('extension') }}
        </div>

        <div class="ui top pointing red label hidden" id="extension-error">
            {{ t._("da_ThisNumberIsNotFree") }}
        </div>
        </div>
    </div>
    <div class="field">
        <label>{{ t._('da_Type') }}</label>
        <div class="field max-width-300">
        {{ form.render('type') }}
        </div>
    </div>

    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainTabFields')]) }}
</div>
<div class="ui bottom attached tab segment active" data-tab="code">
    <div id="application-code" class="application-code">
        <pre></pre>
    </div>
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('CodeTabFields')]) }}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}

{{ partial("partials/submitbutton",['indexurl':'dialplan-applications/index/']) }}
{{ end_form() }}
