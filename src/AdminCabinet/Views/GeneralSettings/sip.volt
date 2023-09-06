<h4 class="ui header">{{ t._('gs_SIPPortSettings') }}</h4>
<div class="two fields">
    <div class="field">
        <label>{{ t._('gs_SIPPort') }}</label>
        {{ form.render('SIPPort') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_TLS_PORT') }}</label>
        {{ form.render('TLS_PORT') }}
    </div>
</div>
<div class="two fields">
    <div class="field">
        <label>{{ t._('gs_RTPPortFrom') }}</label>
        {{ form.render('RTPPortFrom') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_RTPPortTo') }}</label>
        {{ form.render('RTPPortTo') }}
    </div>
</div>

<div class="field">
    <label>{{ t._('gs_RTPStunServer') }}</label>
    {{ form.render('RTPStunServer') }}
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_UseWebRTC') }}</label>
            {{ form.render('UseWebRTC') }}
        </div>
    </div>
</div>

<h4 class="ui header">{{ t._('gs_KeepAliveHeader') }}</h4>
<div class="inline field">
    <label>{{ t._('gs_SIPDefaultExpiry') }}</label>
    {{ form.render('SIPDefaultExpiry') }}
</div>
<div class="two fields">
    <div class="field">
        <label>{{ t._('gs_SIPMinExpiry') }}</label>
        {{ form.render('SIPMinExpiry') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_SIPMaxExpiry') }}</label>
        {{ form.render('SIPMaxExpiry') }}
    </div>
</div>