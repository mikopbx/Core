<div class="ui grey top right attached label" id="status"><i class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('providers/save/iax', 'role': 'form', 'class': 'ui large form ', 'id':'save-provider-form') }}
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
    <label >{{ t._('pr_ProviderHostOrIPAddress') }}</label>
    {{ form.render('host') }}
</div>

<div class="ten wide field">
    <label >{{ t._('pr_ProviderLogin') }}</label>
    {{ form.render('username') }}
</div>

<div class="ten wide field">
    <label>{{ t._('pr_ProviderPassword') }}</label>
    {{ form.render('secret') }}
</div>

<div class="ui accordion field">
    <div class=" title">
        <i class="icon dropdown"></i>
        {{ t._('AdvancedOptions') }}
    </div>

    <div class=" content field">
        <h3 class="ui dividing header ">{{ t._("ConnectionSettings") }}</h3>

          <div class="five wide field">

            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox" id="qualify">
                        {{ form.render('qualify') }}
                        <label >{{ t._('qf_Qualify') }}</label>
                    </div>
                </div>
            </div>
        </div>
        {{ t._('pr_QualifyInstructionsIAX') }}

        <h3 class="ui dividing header ">{{ t._("pr_RegistrationSettings") }}</h3>

        <div class="five wide field">
            <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox" id="noregister">
                        {{ form.render('noregister') }}
                        <label>{{ t._('pr_NoRegister') }}</label>
                    </div>
                </div>
            </div>
        </div>

        <div class="field">
            <label for="manualattributes">{{ t._('pr_ManualAdditionalAtributes') }}</label>
            {{ form.render('manualattributes') }}
        </div>

    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'providers/index/']) }}
</form>