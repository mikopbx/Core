<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('providers/save/sip', 'role': 'form', 'class': 'ui large form', 'id':'save-provider-form') }}

{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('type') }}
{{ form.render('disabled') }}
{{ form.render('providerType') }}


<div class="ten wide required field">
    <label>{{ t._('pr_ProviderName') }}</label>
    {{ form.render('description') }}
</div>

<div class="five wide field required">
    <label>{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>

<div class="ten wide field">
    <label>{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div class="ten wide field">
    <label>{{ t._('pr_ProviderPassword') }}</label>
    {{ form.render('secret') }}
</div>

<div class="five wide field">
    <label>{{ t._('pr_DTMFMode') }}</label>
    {{ form.render('dtmfmode') }}
</div>

<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class=" content field">
        <h3 class="ui dividing header ">{{ t._("ConnectionSettings") }}</h3>

        <div class="five wide field">
            <label for="port">{{ t._('pr_SIPPort') }}</label>
            {{ form.render('port') }}
        </div>

        {{ partial("partials/natqualify") }}

        <h3 class="ui dividing header ">{{ t._("pr_RegistrationSettings") }}</h3>
        {{ t._("pr_CustomFieldsDescriptions") }}
        <div class=" field">
            <label for="defaultuser">{{ t._('pr_DefaultUser') }}</label>
            {{ form.render('defaultuser') }}
        </div>
        <div class=" field">
            <label for="fromuser">{{ t._('pr_FromUser') }}</label>
            {{ form.render('fromuser') }}
        </div>
        <div class="field">
            <label for="fromdomain">{{ t._('pr_FromDomain') }}</label>
            {{ form.render('fromdomain') }}
        </div>
        <div class="ui segment">
            <div class="field">
                <div class="ui toggle checkbox" id="disablefromuser">
                    {{ form.render('disablefromuser') }}
                    <label>{{ t._('pr_DisableFromUser') }}</label>
                </div>
            </div>
        </div>
        <div class="ui segment">
            <div class="field">
                <div class="ui toggle checkbox" id="noregister">
                    {{ form.render('noregister') }}
                    <label>{{ t._('pr_NoRegister') }}</label>
                </div>
            </div>
        </div>
        <div class="ui segment">
            <div class="field">
                <div class="ui toggle checkbox" id="receive_calls_without_auth">
                    {{ form.render('receive_calls_without_auth') }}
                    <label>{{ t._('pr_ReceiveCallsWithoutAuth') }}</label>
                </div>
            </div>
        </div>


        <h3 class="ui dividing header ">{{ t._("pr_ManualAdditionalAtributes") }}</h3>
        <div class="field">
            {{ form.render('manualattributes') }}
        </div>

    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
</form>
