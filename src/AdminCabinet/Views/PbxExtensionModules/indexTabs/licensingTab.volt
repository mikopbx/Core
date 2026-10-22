{% set noInternetClass = licenseV2Enabled ? '' : ' disable-if-no-internet' %}
{{ form(['action' : 'licensing/modify', 'method': 'post', 'role': 'form', 'class': 'ui form large' ~ noInternetClass, 'id':'licencing-modify-form']) }}

<div id="licenseKeySection" class="disabled">
    <h2 class="ui header">{{ t._('lic_LicenseKey') }}</h2>
    <div class="empty-license-key-info">
        <div class="field">
            <div class="ui action input">
            {{ changeLicenseKeyForm.render('licKey') }}
            <button class="ui blue labeled icon button{{ noInternetClass }}" id="save-license-key-button">
                <i class="key icon"></i>
                {{ t._('lic_SaveLicenseKeyButton') }}
            </button>
            </div>
        </div>
        <div class='ui message'>{{ t._('lic_LicenseKeyMessage') }}</div>
    </div>
    <div class="filled-license-key-info">
        <table class="ui very basic table">
            <tr>
                <td>
                    <div ><span class="confidential-field"></span><i class="times circle outline red icon{{ noInternetClass }} popuped" data-content=" {{ t._('lic_ResetLicenseSettings') }}" id="reset-license-button"></i></div>
                </td>
                <td class="right aligned">
                    <a class="ui labeled icon teal button prevent-word-wrap" href="#" target="_blank" id="manage-license-button">
                        <i class="toolbox icon"></i>
                        {{ t._('lic_ManageLicenseKey') }}
                    </a>
                </td>
            </tr>
        </table>
    </div>
    <div class="ui hidden divider"></div>
    <div id="couponSection">
        <h2 class="ui header">{{ t._('lic_ActivateCoupon') }}</h2>
        <div class="field">
            <div class="ui action input">
                {{ activateCouponForm.render('coupon') }}
                <button class="ui blue labeled icon button disable-if-no-internet" id="coupon-activation-button">
                    <i class="ticket icon"></i>
                    {{ t._('lic_ActivateCouponButton') }}
                </button>
            </div>
        </div>
        <div class="ui message">{{ t._('lic_CouponMessage') }}</div>
        <div class="ui hidden divider"></div>
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
            <table class="ui very basic very compact table" id="productDetails">
                <tbody></tbody>
            </table>
        </div>

    </div>
    <div id="getNewKeyLicenseSection"{% if licenseV2Enabled %} class="field disable-if-no-internet"{% endif %}>
        <div class="ui header">{{ t._('lic_FirstQuestionHeader') }}</div>
        {{ t._('lic_FirstQuestionAnswer') }}
        <div class="ui header">{{ t._('lic_MarketplaceHeader') }}</div>
        {{ t._('lic_MarketplaceText') }}
        <div class="ui hidden divider"></div>

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
        {{ partial("partials/submitbutton",['indexurl':'','submitBtnText':'lic_RegisterTheSystemButton','submitBtnIconClass':'envelope outline icon']) }}

    </div>
    <div class="ui clearing hidden divider"></div>
</div>

{% if licenseV2Enabled %}
<div id="entitlementSection">
    <h2 class="ui header">{{ t._('lic_EntitlementHeader') }}</h2>
    <div class="ui list">
        <div class="item"><i class="file alternate outline icon"></i><span id="entitlement-status"></span></div>
        <div class="item" id="entitlement-issued"></div>
        <div class="item" id="entitlement-next"></div>
    </div>
    <div class="ui negative message" id="entitlement-error" style="display: none"></div>
    <button type="button" class="ui labeled icon button" id="entitlement-export-button">
        <i class="download icon"></i>{{ t._('lic_EntitlementExportButton') }}
    </button>
    <button type="button" class="ui labeled icon button" id="entitlement-import-button">
        <i class="upload icon"></i>{{ t._('lic_EntitlementImportButton') }}
    </button>
    <input type="file" id="entitlement-import-input" style="display: none">
    <button type="button" class="ui labeled icon button" id="entitlement-refresh-button" style="display: none">
        <i class="sync icon"></i>{{ t._('lic_EntitlementRefreshButton') }}
    </button>
    <div class="ui message">{{ t._('lic_EntitlementMessage') }}</div>
    <div class="ui hidden divider"></div>
</div>
{% endif %}

<div class="ui small modal" id="reset-license-confirm-modal">
    <div class="header">
        {{ t._('lic_ResetLicenseConfirmHeader') }}
    </div>
    <div class="content">
        <p>{{ t._('lic_ResetLicenseConfirmText') }}</p>
    </div>
    <div class="actions">
        <div class="ui black deny button">
            {{ t._('lic_Cancel') }}
        </div>
        <div class="ui negative right labeled icon button" id="confirm-reset-license-button">
            {{ t._('lic_ResetLicenseConfirm') }}
            <i class="trash icon"></i>
        </div>
    </div>
</div>

{{ close('form') }}