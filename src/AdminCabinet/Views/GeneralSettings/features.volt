<div class="field">
    <label>{{ t._('gs_PBXCallParkingExt') }}</label>
    {{ form.render('PBXCallParkingExt') }}
</div>

<div class="two fields">
<div class="field">
    <label>{{ t._('gs_PBXCallParkingStartSlot') }}</label>
    {{ form.render('PBXCallParkingStartSlot') }}
</div>
<div class="field">
    <label>{{ t._('gs_PBXCallParkingEndSlot') }}</label>
    {{ form.render('PBXCallParkingEndSlot') }}
</div>
</div>
<div class="inline field">
    <label>{{ t._('gs_PBXFeatureAttendedTransfer') }}</label>
    {{ form.render('PBXFeatureAttendedTransfer') }}
</div>
<div class="inline field">
    <label>{{ t._('gs_PBXFeatureBlindTransfer') }}</label>
    {{ form.render('PBXFeatureBlindTransfer') }}
</div>
<div class="inline field">
    <label>{{ t._('gs_PBXFeaturePickupExten') }}</label>
    {{ form.render('PBXFeaturePickupExten') }}
</div>
<div class="inline field">
    <label>{{ t._('gs_PBXFeatureAtxferNoAnswerTimeout') }}</label>
    {{ form.render('PBXFeatureAtxferNoAnswerTimeout') }}
</div>