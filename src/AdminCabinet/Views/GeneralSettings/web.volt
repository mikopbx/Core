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
    <label>{{ t._('gs_WEBHTTPSPublicKey') }}</label>
    {{ form.render('WEBHTTPSPublicKey') }}
</div>
<div class="field">
    <label>{{ t._('gs_WEBHTTPSPrivateKey') }}</label>
    {{ form.render('WEBHTTPSPrivateKey') }}
</div>