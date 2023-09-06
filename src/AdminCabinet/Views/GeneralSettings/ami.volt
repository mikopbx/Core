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
    <label>{{ t._('gs_AMIPort') }}</label>
    {{ form.render('AMIPort') }}
</div>
<div class="inline field">
    <label>{{ t._('gs_AJAMPort') }}</label>
    {{ form.render('AJAMPort') }}
</div>
<div class="inline field">
    <label>{{ t._('gs_AJAMPortTLS') }}</label>
    {{ form.render('AJAMPortTLS') }}
</div>