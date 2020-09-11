{{ form('general-settings/save', 'role': 'form', 'class': 'ui form large', 'id':'general-settings-form') }}
<input type="hidden" name="dirrty" id="dirrty"/>
<div class="ui grid">
    <div class="four wide column">
        <div class="ui vertical fluid tabular menu" id="general-settings-menu">
            <a class="item active" data-tab="general">{{ t._('gs_MainTab') }}</a>
            <a class="item" data-tab="features">{{ t._('gs_FeaturesTab') }}</a>
            <a class="item" data-tab="sip">{{ t._('gs_SIPTab') }}</a>
            <a class="item" data-tab="codecs">{{ t._('gs_CodecsTab') }}</a>
            <a class="item" data-tab="ami">{{ t._('gs_AMITab') }}</a>
            <a class="item" data-tab="ssh">{{ t._('gs_SSHTab') }}</a>
            <a class="item" data-tab="web">{{ t._('gs_WebTab') }}</a>
            <a class="item" data-tab="passwords">{{ t._('gs_Passwords') }}</a>

        </div>
    </div>
    <div class="twelve wide column">
        <div class="ui  tab segment active" data-tab="general">
            <div class="field">
                <label>{{ t._('gs_PBXName') }}</label>
                {{ form.render('Name') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXDescription') }}</label>
                {{ form.render('Description') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXLanguage') }}</label>
                {{ form.render('PBXLanguage') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXInternalExtensionLength') }}</label>
                {{ form.render('PBXInternalExtensionLength') }}
            </div>
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_PBXRecordCalls') }}</label>
                        {{ form.render('PBXRecordCalls') }}
                    </div>
                </div>
            </div>
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_PBXSplitAudioThread') }}</label>
                        {{ form.render('PBXSplitAudioThread') }}
                    </div>
                </div>
            </div>

            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_RestartEveryNight') }}</label>
                        {{ form.render('RestartEveryNight') }}
                    </div>
                </div>
            </div>
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_SendAnonymousMetrics') }}</label>
                        {{ form.render('SendMetrics') }}
                    </div>
                </div>
            </div>
        </div>


        <div class="ui  tab segment" data-tab="features">

            <div class="field">
                <label>{{ t._('gs_PBXCallParkingExt') }}</label>
                {{ form.render('PBXCallParkingExt') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXCallParkingStartSlot') }}</label>
                {{ form.render('PBXCallParkingStartSlot') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXCallParkingEndSlot') }}</label>
                {{ form.render('PBXCallParkingEndSlot') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXFeatureAttendedTransfer') }}</label>
                {{ form.render('PBXFeatureAttendedTransfer') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXFeatureBlindTransfer') }}</label>
                {{ form.render('PBXFeatureBlindTransfer') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXFeatureDigitTimeout') }}</label>
                {{ form.render('PBXFeatureDigitTimeout') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_PBXFeatureAtxferNoAnswerTimeout') }}</label>
                {{ form.render('PBXFeatureAtxferNoAnswerTimeout') }}
            </div>
        </div>


        <div class="ui  tab segment" data-tab="sip">
            <div class="field">
                <label>{{ t._('gs_SIPPort') }}</label>
                {{ form.render('SIPPort') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_SIPDefaultExpiry') }}</label>
                {{ form.render('SIPDefaultExpiry') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_SIPMinExpiry') }}</label>
                {{ form.render('SIPMinExpiry') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_SIPMaxExpiry') }}</label>
                {{ form.render('SIPMaxExpiry') }}
            </div>
            <h4 class="ui  header">{{ t._('gs_RtpSettings') }}</h4>
            <div class="field">
                <label>{{ t._('gs_RTPPortFrom') }}</label>
                {{ form.render('RTPPortFrom') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_RTPPortTo') }}</label>
                {{ form.render('RTPPortTo') }}
            </div>
        </div>

        <div class="ui  tab segment" data-tab="codecs">
            {{ partial("GeneralSettings/codecs") }}
        </div>

        <div class="ui tab segment" data-tab="ami">
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_AMIEnabled') }}</label>
                        {{ form.render('AMIEnabled') }}
                    </div>
                </div>
            </div>
            <div class="field">
                <label>{{ t._('gs_AMIPort') }}</label>
                {{ form.render('AMIPort') }}
            </div>
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_AJAMEnabled') }}</label>
                        {{ form.render('AJAMEnabled') }}
                    </div>
                </div>
            </div>
            <div class="field">
                <label>{{ t._('gs_AJAMPort') }}</label>
                {{ form.render('AJAMPort') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_AJAMPortTLS') }}</label>
                {{ form.render('AJAMPortTLS') }}
            </div>
        </div>

        <div class="ui  tab segment" data-tab="ssh">
            <div class="field">
                <label>{{ t._('gs_SSHPort') }}</label>
                {{ form.render('SSHPort') }}
            </div>
            <div class="two fields">
                <div class="field">
                    <label>{{ t._('gs_SSHPassword') }}</label>
                    {{ form.render('SSHPassword') }}
                </div>
                <div class="field">
                    <label>{{ t._('gs_SSHPasswordRepeat') }}</label>
                    {{ form.render('SSHPasswordRepeat') }}
                </div>
            </div>
            <div class="ssh-password-score-section">
                <div class="two fields">
                    <div class="field">
                        <div class="ui indicating tiny progress ssh-password-score">
                            <div class="bar"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="field">
                <label>{{ t._('gs_SSHAuthorizedKeys') }}</label>
                {{ form.render('SSHAuthorizedKeys') }}
            </div>
            {% if debugMode == true %}
                <div class="field">
                    <label>{{ t._('gs_SSHecdsaKey') }}</label>
                    {{ form.render('SSHecdsaKey') }}
                </div>
                <div class="field">
                    <label>{{ t._('gs_SSHRsaKey') }}</label>
                    {{ form.render('SSHRsaKey') }}
                </div>
                <div class="field">
                    <label>{{ t._('gs_SSHDssKey') }}</label>
                    {{ form.render('SSHDssKey') }}
                </div>
            {% endif %}
        </div>

        <div class="ui  tab segment" data-tab="web">
            <div class="inline fields">
                <div class="field">
                    <label for="WEBPort">{{ t._('gs_WebPort') }}</label>
                    {{ form.render('WEBPort') }}
                </div>
                <div class="field">
                    <label>{{ t._('gs_WebHTTPSPort') }}</label>
                    {{ form.render('WEBHTTPSPort') }}
                </div>

                <div class="field">
                    <div class="ui toggle checkbox">
                        <label>{{ t._('gs_RedirectToHttps') }}</label>
                        {{ form.render('RedirectToHttps') }}
                    </div>
                </div>
            </div>
            <div class="field">
                <label>{{ t._('gs_WEBHTTPSPublicKey') }}</label>
                {{ form.render('WEBHTTPSPublicKey') }}
            </div>
            <div class="field">
                <label>{{ t._('gs_WEBHTTPSPrivateKey') }}</label>
                {{ form.render('WEBHTTPSPrivateKey') }}
            </div>
        </div>
        <div class="ui  tab segment" data-tab="passwords">
            <div class="field">
                <label>{{ t._('gs_WebAdminLogin') }}</label>
                {{ form.render('WebAdminLogin') }}
            </div>
            <div class="two fields">
                <div class="field">
                    <label>{{ t._('gs_WebAdminPassword') }}</label>
                    {{ form.render('WebAdminPassword') }}
                </div>
                <div class="field">
                    <label>{{ t._('gs_WebAdminPasswordRepeat') }}</label>
                    {{ form.render('WebAdminPasswordRepeat') }}
                </div>
            </div>
            <div class="password-score-section">
                <div class="two fields">
                    <div class="field">
                        <div class="ui indicating tiny progress password-score">
                            <div class="bar"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ui message">
                {{ t._('gs_DefaultPasswordWarning') }}
            </div>
        </div>
    </div>
</div>


{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
</form>