<div class="two fields">
    <div class="inline field">
        <label for="WEBPort">{{ t._('gs_WebPort') }}</label>
        {{ form.render('WEBPort') }}
    </div>
    <div class="inline field">
        <label>{{ t._('gs_WebHTTPSPort') }}</label>
        {{ form.render('WEBHTTPSPort') }}
    </div>
</div>
<div class="inline field">
    <div class="ui segment">
    <div class="ui toggle checkbox">
        <label>{{ t._('gs_RedirectToHttps') }}</label>
        {{ form.render('RedirectToHttps') }}
    </div>
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_WEBHTTPSPublicKey') }}
        <i class="small info circle icon field-info-icon" 
           data-field="WEBHTTPSPublicKey"></i>
    </label>
    {{ form.render('WEBHTTPSPublicKey', ['data-field-type': 'certificate-public']) }}
</div>
<div class="field">
    <label>{{ t._('gs_WEBHTTPSPrivateKey') }}
        <i class="small info circle icon field-info-icon" 
           data-field="WEBHTTPSPrivateKey"></i>
    </label>
    {% if WEBHTTPSPrivateKeyExists %}
        {{ form.render('WEBHTTPSPrivateKey', ['data-has-value': 'true', 'data-field-type': 'certificate-private']) }}
    {% else %}
        {{ form.render('WEBHTTPSPrivateKey', ['data-field-type': 'certificate-private']) }}
    {% endif %}
</div>