<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('providers/save/iax', 'role': 'form', 'class': 'ui large form ', 'id':'save-provider-form') }}
{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
{{ form.render('providerType') }}


<div class="required field max-width-500">
    <label for="description">{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>

<div class="field required max-width-500">
    <label for="host">{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>

<div class="field max-width-500">
    <label for="username">{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div class="field max-width-500">
    <label for="secret">{{ t._('pr_ProviderPassword') }}</label>
    {{ form.render('secret') }}
</div>
<div class="field max-width-800">
    <label for="note">{{ t._('pr_Note') }}</label>
    {{ form.render('note') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class="content field">
        <h3 class="ui dividing header ">{{ t._("ConnectionSettings") }}</h3>

        <div class="field max-width-400">
            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox" id="qualify">
                        {{ form.render('qualify') }}
                        <label for="qualify">{{ t._('qf_Qualify') }}</label>
                    </div>
                </div>
            </div>
        </div>
        <div class="ui info message">{{ t._('pr_QualifyInstructionsIAX') }}</div>

        <h3 class="ui dividing header ">{{ t._("pr_RegistrationSettings") }}</h3>

        <div class="field  max-width-400">
            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox" id="noregister">
                        {{ form.render('noregister') }}
                        <label>{{ t._('pr_NoRegister') }}</label>
                    </div>
                </div>
            </div>
        </div>

        <h4 class="ui dividing header ">{{ t._("pr_ManualAdditionalAtributes") }}</h4>
        <div class="field">
            {{ form.render('manualattributes') }}
        </div>

        {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('AdvancedFields')]) }}
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
{{ end_form() }}