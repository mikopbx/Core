<div class="inline field">
    {{ form.render('PBXCallParkingExt') }}
    <label>{{ t._('gs_PBXCallParkingExt') }}</label>
</div>
<div class="inline field">
    {{ form.render('PBXCallParkingStartSlot') }}-&nbsp;&nbsp;&nbsp;
    {{ form.render('PBXCallParkingEndSlot') }}&nbsp;
    <label>{{ t._('gs_PBXCallParkingSlotRange') }}</label>
</div>

<div class="inline field">
    {{ form.render('PBXFeatureAttendedTransfer') }}
    <label>{{ t._('gs_PBXFeatureAttendedTransfer') }}</label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureBlindTransfer') }}
    <label>{{ t._('gs_PBXFeatureBlindTransfer') }}</label>
</div>
<div class="inline field">
    {{ form.render('PBXFeaturePickupExten') }}
    <label>{{ t._('gs_PBXFeaturePickupExten') }}</label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureAtxferNoAnswerTimeout') }}
    <label>{{ t._('gs_PBXFeatureAtxferNoAnswerTimeout') }}</label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureDigitTimeout') }}
    <label>{{ t._('gs_PBXFeatureDigitTimeout') }}</label>
</div>