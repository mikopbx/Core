<div class="inline field">
    {{ form.render('PBXCallParkingExt') }}
    <label>{{ t._('gs_PBXCallParkingExt') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXCallParkingExt"></i>
    </label>
</div>
<div class="inline field">
    {{ form.render('PBXCallParkingStartSlot') }}-&nbsp;&nbsp;&nbsp;
    {{ form.render('PBXCallParkingEndSlot') }}&nbsp;
    <label>{{ t._('gs_PBXCallParkingSlotRange') }}</label>
</div>

<div class="inline field">
    {{ form.render('PBXFeatureAttendedTransfer') }}
    <label>{{ t._('gs_PBXFeatureAttendedTransfer') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXFeatureAttendedTransfer"></i>
    </label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureBlindTransfer') }}
    <label>{{ t._('gs_PBXFeatureBlindTransfer') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXFeatureBlindTransfer"></i>
    </label>
</div>
<div class="inline field">
    {{ form.render('PBXFeaturePickupExten') }}
    <label>{{ t._('gs_PBXFeaturePickupExten') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXFeaturePickupExten"></i>
    </label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureAtxferNoAnswerTimeout') }}
    <label>{{ t._('gs_PBXFeatureAtxferNoAnswerTimeout') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXFeatureAtxferNoAnswerTimeout"></i>
    </label>
</div>
<div class="inline field">
    {{ form.render('PBXFeatureDigitTimeout') }}
    <label>{{ t._('gs_PBXFeatureDigitTimeout') }}
        <i class="small info circle icon field-info-icon" 
           data-field="PBXFeatureDigitTimeout"></i>
    </label>
</div>