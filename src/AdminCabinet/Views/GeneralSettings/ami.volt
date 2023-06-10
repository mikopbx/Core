<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_AMIEnabled') }}</label>
            {{ form.render('AMIEnabled') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_AJAMEnabled') }}</label>
            {{ form.render('AJAMEnabled') }}
        </div>
    </div>
</div>
<div class="inline field">
    {{ form.render('AMIPort') }}
    <label>{{ t._('gs_AMIPort') }}</label>
</div>
<div class="inline field">
    {{ form.render('AJAMPort') }}
    <label>{{ t._('gs_AJAMPort') }}</label>
</div>
<div class="inline field">
    {{ form.render('AJAMPortTLS') }}
    <label>{{ t._('gs_AJAMPortTLS') }}</label>
</div>