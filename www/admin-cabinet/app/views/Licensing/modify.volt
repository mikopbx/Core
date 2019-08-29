{{ form('licensing/modify', 'role': 'form', 'class': 'ui form large', 'id':'licencing-modify-form') }}
<input type="hidden" name = "backurl" value="{{ backurl }}">
<div id="licenseKeySection">
    <h2 class="ui header">{{ t._('lic_LicenseKey') }}</h2>

    <div id="empty-license-key-info">
        <div class="field">
            {{ changeLicenseKeyForm.render('licKey') }}
        </div>
        {{ t._('lic_LicenseKeyMessage') }}
    </div>
    <div id="filled-license-key-info">
    </div>
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
                    <table class="ui very basic very compact table" id="productDetails"><tbody></tbody></table>
        </div>

        <div class="ui divider"></div>

    </div>
    <div id="getTrialLicenseSection">
        <h2 class="ui header">{{ t._('lic_GetTrialForm') }}</h2>
        <div class="field required">
            <label>{{ t._('lic_CompanyName') }}</label>
            {{ getTrialForm.render('companyname') }}
        </div>
        <div class="field required">
            <label>{{ t._('lic_Email') }}</label>
            {{ getTrialForm.render('email') }}
        </div>
        <div class="field required">
            <label>{{ t._('lic_Contact') }}</label>
            {{ getTrialForm.render('contact') }}
        </div>
        <div class="field">
            <label>{{ t._('lic_Phone') }}</label>
            {{ getTrialForm.render('telefone') }}
        </div>
        <div class="field">
            <label>{{ t._('lic_Inn') }}</label>
            {{ getTrialForm.render('inn') }}
        </div>
        <div class="ui divider"></div>
    </div>

    <div id="couponSection">
        <h2 class="ui header">{{ t._('lic_ActivateCoupon') }}</h2>
        <div class="field">
            {{ activateCouponForm.render('coupon') }}
        </div>
        {{ t._('lic_CouponMessage') }}
        <div class="ui divider"></div>
    </div>
    {{ partial("partials/submitbutton",['indexurl':'']) }}
    <button class="ui labeled icon large button" id="reset-license">
        <i class="recycle icon"></i>
        {{ t._('lic_ResetLicenseSettings') }}
    </button>
</div>
</form>
