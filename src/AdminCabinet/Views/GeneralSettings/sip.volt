<h4 class="ui header">{{ t._('gs_SIPPortSettings') }}</h4>
<div class="inline field">
    <label>{{ t._('gs_SIPPort') }}</label>
    {{ form.render('SIPPort') }}
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