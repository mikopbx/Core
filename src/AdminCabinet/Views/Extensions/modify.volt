<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form('extensions/save', 'role': 'form', 'class': 'ui form large', 'id':'extensions-form') }}

{{ form.render('id') }}
{{ form.render('type') }}
{{ form.render('is_general_user_number') }}

{{ form.render('sip_type') }}
{{ form.render('sip_uniqid') }}

{{ form.render('mobile_uniqid') }}

{{ form.render('user_avatar') }}
{{ form.render('user_id') }}
<input type="file" name="file-select" id="file-select" style="display: none"/>

<div class="ui top attached tabular menu" id="extensions-menu">
        <a class="item active" data-tab="general">{{ t._('ex_GeneralSettings') }}</a>
        <a class="item" data-tab="routing">{{ t._('ex_RoutingSettings') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui bottom attached tab segment active" data-tab="general">
    <div class="two fields">
        <div class="field">
            <div class="field">
                <label>{{ t._('ex_Username') }}</label>
                {{ form.render('user_username') }}
            </div>
            <div class="field">
                <label>{{ t._('ex_Number') }}</label>
                <div class="ui icon input number">
                    <i class="search icon"></i>
                    {{ form.render('number') }}
                </div>
                <div class="ui top pointing red label hidden" id="number-error"></div>
            </div>
            <div class="field">
                <label>{{ t._('ex_MobileNumber') }}</label>
                <div class="ui icon input mobile-number">
                    <i class="search icon"></i>
                    {{ form.render('mobile_number') }}
                </div>
                <div class="ui top pointing red label hidden" id="mobile-number-error">
                    {{ t._("ex_ThisNumberIsNotFree") }}
                </div>
            </div>
            <div class="field">
                <label>{{ t._('ex_EmailAddress') }}</label>
                <div class="ui icon input email">
                    <i class="search icon"></i>
                    {{ form.render('user_email') }}
                </div>
                <div class="ui top pointing red label hidden" id="email-error"></div>
            </div>

            {# <div class="field"> #}
            {# <label >{{ t._('ex_Language') }}</label> #}
            {# {{ form.render('user_language') }} #}
            {# </div> #}

            <div class="field">
                <label>{{ t._('ex_Secret') }}</label>
                <div class="ui action input">
                    {{ form.render('sip_secret') }}
                    <div class="ui teal icon button" id="generate-new-password">
                        <i class="refresh icon"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="field">
            <div class="field">
                <div class="ui centered card">
                    <div class="image">
                        <img src='{{ avatar }}' id="avatar" alt="{{ t._('ex_UserPhotography') }}">
                    </div>
                    <div class="ui bottom attached basic buttons">
                        <div class="ui button" id="upload-new-avatar">
                            <i class="add icon"></i>
                            {{ t._('ex_ChangeAvatar') }}
                        </div>
                        <div class="ui icon button" id="clear-avatar">
                            <i class="trash alternate icon"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabFields')]) }}

    <div class="ui accordion field">
        <div class=" title">
            <i class="icon dropdown"></i>
            {{ t._('AdvancedOptions') }}
        </div>
        <div class="content">
            <h3 class="ui dividing header ">{{ t._("ex_MobileSettings") }}</h3>
            <div class="field">
                <label>{{ t._('ex_MobileDialstring') }}</label>
                <div class="five wide field">
                    {{ form.render('mobile_dialstring') }}
                </div>
            </div>
            <h3 class="ui dividing header ">{{ t._("gs_PBXRecordCalls") }}</h3>
            <div class="ten wide field">
                <div class="ui toggle checkbox">
                    {{ form.render('sip_enableRecording') }}
                    <label for="sip_enableRecording">{{ t._('ex_enableRecording') }}</label>
                </div>
            </div>
            <h3 class="ui dividing header ">{{ t._("ex_SipSettings") }}</h3>
            <div class="field">
                <label>{{ t._('ex_DTMFMode') }}</label>
                <div class="five wide field">
                    {{ form.render('sip_dtmfmode') }}
                </div>
            </div>
            <div class="field">
                <label>{{ t._('ex_Transport') }}</label>
                <div class="five wide field">
                    {{ form.render('sip_transport') }}
                </div>
            </div>
            <div class="field">
                <label>{{ t._('ex_NetworkFilter') }}</label>
                <div class="ten wide field">
                    {{ form.render('sip_networkfilterid') }}
                </div>
            </div>
            <h3 class="ui dividing header ">{{ t._("ex_ManualAdditionalAttributes") }}</h3>
            <div class="field">
                {{ form.render('sip_manualattributes') }}
            </div>

            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabAdvancedFields')]) }}
        </div>
    </div>
</div>
<div class="ui bottom attached tab segment" data-tab="routing">

    <div class="wide inline field">
        {{ t._('ex_RingMainExtension') }}
        {{ form.render('fwd_ringlength') }}
        {{ t._('ex_SecondsAndThenRedirectCallTo') }}
        {{ form.render('fwd_forwarding') }}
    </div>

    <div class="wide inline field">
        {{ t._('ex_IfMainExtensionIsBusyRedirectCallTo') }}
        {{ form.render('fwd_forwardingonbusy') }}
    </div>

    <div class="wide inline field">
        {{ t._('ex_IfMainExtensionIsUnavailableRedirectCallTo') }}
        {{ form.render('fwd_forwardingonunavailable') }}
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}

{{ partial("partials/submitbutton",['indexurl':'extensions/index/']) }}
{{ end_form() }}