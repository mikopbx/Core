{{ form('licensing/modify', 'role': 'form', 'class': 'ui form large', 'id':'licencing-modify-form') }}
<input type="hidden" name="dirrty" id="dirrty"/>

<div class="ui top attached tabular menu" id="licensing-menu">
    <a class="item active" data-tab="intro">{{ t._('lic_IntroductionTabHeader') }}</a>
    <a class="item" data-tab="management">{{ t._('lic_ManagementTabHeader') }}</a>
</div>
<div class="ui bottom attached tab segment active" data-tab="intro">
    <div class="ui header">{{ t._('lic_FirstQuestionHeader') }}</div>
    {{ t._('lic_FirstQuestionAnswer') }}
    <div class="ui header">{{ t._('lic_MarketplaceHeader') }}</div>
    {{ t._('lic_MarketplaceText') }}
    <div class="ui header">{{ t._('lic_MarketplaceImageHeader') }}</div>
    <div class="ui center aligned basic segment">
        <img src="{{ modulesExampleImgPath }}" class="ui fluid image"/>
        <div class="ui hidden divider"></div>
        <a class="ui blue primary button" href="#management" id="changePageToLicensing">{{ t._('lic_MarketplaceAction') }}</a>
    </div>

</div>
<div class="ui bottom attached tab segment" data-tab="management">
   {% if internetExists === true %}
    <div id="licenseKeySection" class="disabled">
        <h2 class="ui header">{{ t._('lic_LicenseKey') }}</h2>

        <div id="empty-license-key-info">
            <div class="field">
                {{ changeLicenseKeyForm.render('licKey') }}
            </div>
            {{ t._('lic_LicenseKeyMessage') }}
        </div>
        <div id="filled-license-key-info" class="confidential-field"></div>
        <div class="ui hidden divider"></div>
        <div class="ui accordion field" id="licenseDetailInfo">
            <div class=" title">
                <i class="icon dropdown"></i>
                {{ t._('lic_CurrentLicenseInfo') }}
            </div>

            <div class="content field">
                <h2 class="ui header">{{ t._('lic_LicenseKeyOwner') }}</h2>
                <div class="ui list">
                    <div class="item">
                        <div class="content">
                            <i class="building icon"></i>
                            <span id="key-companyname"></span>
                        </div>
                    </div>
                    <div class="item">
                        <div class="content">
                            <i class="user icon"></i>
                            <span id="key-contact"></span>
                        </div>
                    </div>
                    <div class="item">
                        <div class="content">
                            <i class="mail icon"></i>
                            <span id="key-email"></span>
                        </div>
                    </div>
                    <div class="item">
                        <div class="content">
                            <i class="phone icon"></i>
                            <span id="key-tel"></span>
                        </div>
                    </div>
                </div>
                <h2 class="ui header">{{ t._('lic_LicenseKeyProducts') }}</h2>
                <table class="ui very basic very compact table" id="productDetails">
                    <tbody></tbody>
                </table>
            </div>

            <div class="ui divider"></div>

        </div>
        <div id="getNewKeyLicenseSection">
            <h2 class="ui header">{{ t._('lic_GetKeyForm') }}</h2>
            <div class="field required">
                <label>{{ t._('lic_CompanyName') }}</label>
                {{ getKeyForm.render('companyname') }}
            </div>
            <div class="field required">
                <label>{{ t._('lic_Email') }}</label>
                {{ getKeyForm.render('email') }}
            </div>
            <div class="field required">
                <label>{{ t._('lic_Contact') }}</label>
                {{ getKeyForm.render('contact') }}
            </div>
            <div class="field">
                <label>{{ t._('lic_Phone') }}</label>
                {{ getKeyForm.render('telefone') }}
            </div>
            <div class="field">
                <label>{{ t._('lic_Inn') }}</label>
                {{ getKeyForm.render('inn') }}
            </div>
            <div class="ui hidden divider"></div>
        </div>

        <div id="couponSection">
            <h2 class="ui header">{{ t._('lic_ActivateCoupon') }}</h2>
            <div class="field">
                {{ activateCouponForm.render('coupon') }}
            </div>
            {{ t._('lic_CouponMessage') }}
            <div class="ui hidden divider"></div>
        </div>
        <div class="ui header">{{ t._('lic_LastQuestionHeader') }}</div>
        {{ t._('lic_LastQuestionAnswer') }}
        <div class="ui hidden divider"></div>
        {{ partial("partials/submitbutton",['indexurl':'']) }}
        <button class="ui labeled icon large button" id="reset-license">
            <i class="recycle icon"></i>
            {{ t._('lic_ResetLicenseSettings') }}
        </button>

    </div>
    {% else %}
        <div class="ui message">
          <div class="header">
            {{ t._('lic_NoInetHeader') }}
          </div>
          <ul class="list">
            <li>{{ t._('lic_NoInet') }}</li>
            <li>{{ t._('lic_NoInetLicMiko') }}</li>
            <li>{{ t._('lic_NoInetNetSettings') }}</li>
          </ul>
          <br>
          <b><a href='#' onclick='window.location.reload()'>Обновить страницу...</a><b>
        </div>
    {% endif %}
</div>
</form>