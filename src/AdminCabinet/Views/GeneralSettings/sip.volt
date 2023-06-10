<h4 class="ui header">{{ t._('gs_SIPPortSettings') }}</h4>

<div class="inline field">
    {{ form.render('SIPPort') }}
    <label>{{ t._('gs_SIPPort') }}</label>
</div>
<div class="inline field">
    {{ form.render('TLS_PORT') }}
    <label>{{ t._('gs_TLS_PORT') }}</label>
</div>


<div class="inline field">
    {{ form.render('RTPPortFrom') }}-&nbsp;&nbsp;&nbsp;
    {{ form.render('RTPPortTo') }} &nbsp;
    <label>{{ t._('gs_RTPPortRange') }}</label>
</div>


<div class="field">
    <label>{{ t._('gs_RTPStunServer') }}</label>
    <div class="field max-width-400">
        {{ form.render('RTPStunServer') }}
    </div>
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
    {{ form.render('SIPDefaultExpiry') }}
    <label>{{ t._('gs_SIPDefaultExpiry') }}</label>
</div>

<div class="inline field">
    {{ form.render('SIPMinExpiry') }}-&nbsp;&nbsp;&nbsp;
    {{ form.render('SIPMaxExpiry') }}&nbsp;
    <label>{{ t._('gs_SIPExpiryRange') }}</label>
</div>