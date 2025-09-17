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
    <label>{{ t._('gs_RTPPortRange') }}
        <i class="small info circle icon field-info-icon" 
           data-field="RTPPortRange"></i>
    </label>
</div>


<div class="field">
    <label>{{ t._('gs_RTPStunServer') }}
        <i class="small info circle icon field-info-icon" 
           data-field="RTPStunServer"></i>
    </label>
    <div class="field max-width-400">
        {{ form.render('RTPStunServer') }}
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_SIPAuthPrefix') }}
        <i class="small info circle icon field-info-icon" 
           data-field="SIPAuthPrefix"></i>
    </label>
    <div class="field max-width-400">
        {{ form.render('SIPAuthPrefix') }}
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label for="UseWebRTC">{{ t._('gs_UseWebRTC') }}
                <i class="small info circle icon field-info-icon"
                   data-field="UseWebRTC"></i>
            </label>
            {{ form.render('UseWebRTC') }}
        </div>
    </div>
</div>

<h4 class="ui header">{{ t._('gs_KeepAliveHeader') }}</h4>
<div class="inline field">
    {{ form.render('SIPDefaultExpiry') }}
    <label>{{ t._('gs_SIPDefaultExpiry') }}
        <i class="small info circle icon field-info-icon" 
           data-field="SIPDefaultExpiry"></i>
    </label>
</div>

<div class="inline field">
    {{ form.render('SIPMinExpiry') }}-&nbsp;&nbsp;&nbsp;
    {{ form.render('SIPMaxExpiry') }}&nbsp;
    <label>{{ t._('gs_SIPExpiryRange') }}
        <i class="small info circle icon field-info-icon" 
           data-field="SIPExpiryRange"></i>
    </label>
</div>