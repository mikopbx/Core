<div class="ui grey top right attached label" id="status"><i
            class="spinner loading icon"></i>{{ t._("pr_UpdateStatus") }}</div>
{{ form(['action' : 'extensions/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'extensions-form']) }}

{{ form.render('id') }}
{{ form.render('user_avatar') }}

<div class="ui top attached tabular menu" id="extensions-menu">
        <a class="item active" data-tab="general">{{ t._('ex_GeneralSettings') }}</a>
        <a class="item" data-tab="routing">{{ t._('ex_RoutingSettings') }}</a>
        <a class="item" data-tab="status"><i class="heartbeat icon"></i>{{ t._('ex_MonitoringTab') }}</a>
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

            <div class="field">
                <label>{{ t._('ex_Secret') }}</label>
                {{ form.render('sip_secret') }}
            </div>
        </div>
        <div class="field">
            <div class="field">
                <div class="ui centered card">
                    <div class="image">
                        <img src='/admin-cabinet/assets/img/unknownPerson.jpg' id="avatar" alt="{{ t._('ex_UserPhotography') }}">
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
            <!-- Group: Network settings -->
            <h4 class="ui dividing header ">{{ t._('ex_NetworkSettings') }}</h4>
            <div class="field">
                <label>{{ t._('ex_Transport') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="sip_transport"></i>
                </label>
                <div class="field max-width-200">
                    {{ form.render('sip_transport') }}
                </div>
            </div>

              <!-- Group: Security settings -->
            <h4 class="ui dividing header ">{{ t._('ex_SecuritySettings') }}</h4>
            <div class="field">
                <label>{{ t._('ex_NetworkFilter') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="sip_networkfilterid"></i>
                </label>
                <div class="ten wide field">
                    {{ form.render('sip_networkfilterid') }}
                </div>
            </div>

             <!-- Group: Additional parameters -->
        <h4 class="ui dividing header ">{{ t._('ex_AdditionalParameters') }}</h4>
            <div class="field">
                <label>{{ t._('ex_MobileDialstring') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="mobile_dialstring"></i>
                </label>
                <div class="five wide field">
                    {{ form.render('mobile_dialstring') }}
                </div>
            </div>

            <div class="ten wide field">
                <div class="ui toggle checkbox">
                    {{ form.render('sip_enableRecording') }}
                    <label for="sip_enableRecording">{{ t._('ex_enableRecording') }}</label>
                </div>
            </div>

            <div class="field">
                <label>{{ t._('ex_DTMFMode') }}
                    <i class="small info circle icon field-info-icon" 
                       data-field="sip_dtmfmode"></i>
                </label>
                <div class="field max-width-200">
                    {{ form.render('sip_dtmfmode') }}
                </div>
            </div>
            
            <div class="field">
                  <label>
                {{ t._('ex_ManualAdditionalAttributes') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="sip_manualattributes"></i>
            </label>
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

<div class="ui bottom attached tab segment" data-tab="status">
    <!-- Active devices section -->
    <h3 class="ui header">
        <div class="content">
            {{ t._('ex_ActiveDevices') }}
        </div>
    </h3>
    <div id="active-devices-list">
        <div class="ui relaxed divided list">
            <div class="item">
                <div class="content">
                    <div class="description">{{ t._('ex_NoActiveDevices') }}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="ui divider"></div>

    <!-- Device history section -->
    <h3 class="ui header">
        <div class="content">
            {{ t._('ex_DeviceHistory') }}
        </div>
    </h3>
    <div id="device-history-list">
        <div class="ui relaxed divided list">
            <div class="item">
                <div class="content">
                    <div class="description">{{ t._('ex_NoHistoryAvailable') }}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="ui divider"></div>

    <!-- Security section -->
    <h3 class="ui header">
        <i class="shield icon"></i>
        <div class="content">
            {{ t._('ex_Security') }}
        </div>
    </h3>
    <div id="security-info" class="ui basic segment">
        <table id="security-failed-auth-table" class="ui very compact single line table">
            <thead>
                <tr>
                    <th>{{ t._('ex_SecurityIP') }}</th>
                    <th>{{ t._('ex_SecurityFailedAttempts') }}</th>
                    <th>{{ t._('ex_SecurityLastAttempt') }}</th>
                    <th class="center aligned">{{ t._('ex_SecurityActions') }}</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <div id="no-security-data" class="ui placeholder segment" style="display: none;">
            <div class="ui icon header">
                <i class="shield icon"></i>
                {{ t._('ex_SecurityNoFailures') }}
            </div>
        </div>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}

{{ partial("partials/submitbutton",['indexurl':'extensions/index/']) }}
{{ close('form') }}