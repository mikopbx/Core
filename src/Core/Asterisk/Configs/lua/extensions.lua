-- Copyright © MIKO LLC - All Rights Reserved
-- Unauthorized copying of this file, via any medium is strictly prohibited
-- Proprietary and confidential
-- Written by Alexey Portnov, 10 2020

-- Инициализация вспомогательных процедур и функций.
JSON = (loadfile "/usr/www/src/Core/Asterisk/Configs/lua/JSON.lua")();
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
-- Кодируем в base64
function base64_encode(data)
    return ((data:gsub('.', function(x)
        local r,b='',x:byte()
        for i=8,1,-1 do r=r..(b%2^i-b%2^(i-1)>0 and '1' or '0') end
        return r;
    end)..'0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
        if (#x < 6) then return '' end
        local c=0
        for i=1,6 do c=c+(x:sub(i,i)=='1' and 2^(6-i) or 0) end
        return b:sub(c+1,c+1)
    end)..({ '', '==', '=' })[#data%3+1])
end

-- Возвращает рандомную строку длинной len
function generateRandomString(len)
    len = tonumber(len) or 1

    local function rand_char()
        return math.random() > 0.5
                and string.char(math.random(65, 90))
                or string.char(math.random(97, 122))
    end
    local function rand_num()
        return string.char(math.random(48, 57))
    end

    local str = ""
    for i = 1, len do
        str = str .. (math.random() > 0.5 and rand_char() or rand_num())
    end
    return str
end

-- Текущая дата с милисекундами.
function getNowDate()
    local a,b = math.modf(os.clock())
    return os.date("%Y-%m-%d %H:%M:%S.")..tostring(b):sub(3,5);
end

function getAccountName(channel)
    local startPos = channel:find('/');
    if ( startPos == nil) then
        startPos = 0;
    else
        startPos = startPos + 1;
    end

    local dogPos   = channel:reverse():find('@');
    if ( dogPos == nil) then
        dogPos = 0;
    else
        dogPos = dogPos + 2;
    end

    local dashPos  = channel:reverse():find('-');
    if ( dashPos == nil) then
        dashPos = 1;
    else
        dashPos = channel:len() - dashPos;
    end

    local endPos   = math.max(dashPos, dogPos);
    return channel:sub(startPos, endPos);
end
-- Возвращает значение переменной канала
function get_variable(name)
    local p_result = '';
    if(channel[name] ~= nil) then
        p_result = channel[name]:get();
    end

    if(p_result == nil)then
        p_result = '';
    end
    -- app.Verbose( 3, "Var '"..name.."'=" .. p_result)
    return p_result;
end

-- Устанавливает значение переменной канала
function set_variable(p_name, p_value)
    if(is_test == nil) then
        channel[p_name] = p_value;
        -- app["NoOp"](p_name.. ' set to '..p_value);
    elseif( ask_var ~=nil ) then

        channel[p_name] = ask_var:new(p_value);
    end
end

-- Выполняет UserEvent и return
function userevent_return(data)
    if(is_test ~= nil) then
        return
    end
    app["UserEvent"]("CdrConnector,AgiData:"..base64_encode( JSON:encode(data) ));
    app["return"]();
end


-- Начало телефонного звонка
function event_dial(without_event)
    local NOCDR = get_variable("NOCDR");
    if(NOCDR~='') then
        app["return"]();
        return;
    end
    without_event = without_event or false
    local data = {}
    data['start'] = getNowDate()

    local QUEUE_SRC_CHAN = get_variable("QUEUE_SRC_CHAN")
    local orign_chan     = get_variable("orign_chan")
    local id             = get_variable("pt1c_UNIQUEID")
    local IS_ORGNT       = get_variable("IS_ORGNT")

    if(id=='' or IS_ORGNT~='') then
        id = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end
    local channel       = get_variable("CHANNEL")
    local agi_channel   = channel;

    local is_local = string.lower(channel):find("local/") ~= nil
    if(QUEUE_SRC_CHAN~='' and is_local) then
        channel = QUEUE_SRC_CHAN;
    elseif (is_local and string.lower(orign_chan):find("local/") == nil ) then
        channel = orign_chan;
    end

    local from_account  = get_variable("FROM_PEER")
    if ( from_account=='' and string.lower(agi_channel):find("local/") == nil )then
        from_account = getAccountName(agi_channel);
    end

    local dst_num, src_num;
    data['action'] = "dial";
    if(IS_ORGNT ~= '')then
        agi_channel = get_variable('MASTER_CHANNEL(CHANNEL)')
        dst_num  	        = get_variable("CALLERID(num)")
        src_num  	        = get_variable("EXTEN")
        data['dialstatus']  = 'ORIGINATE';
        from_account = '';

        local p_start, p_end, num, dst_chan;
        p_start = agi_channel:find('/')+1;
        p_end   = agi_channel:find('@')-1;
        num     = agi_channel:sub(p_start, p_end)

        p_start = agi_channel:find(';')-1;
        dst_chan= agi_channel:sub(0, p_start)..';1';

        id = get_variable('UNIQUEID'):sub(0, 16)..'_'..num..'_'..IS_ORGNT;
        data['dst_chan'] = dst_chan;
    else
        src_num  	 = get_variable("CALLERID(num)")
        dst_num  	 = get_variable("EXTEN")
    end

    data['src_chan'] 	 = channel;
    data['src_num']  	 = src_num;
    data['dst_num']  	 = dst_num;
    data['linkedid']  	 = get_variable("CDR(linkedid)");
    data['UNIQUEID']  	 = id;
    data['transfer']  	 = '0';
    data['agi_channel']  = agi_channel;
    data['did']		     = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");

    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    data['from_account'] = from_account;
    data['IS_ORGNT']     = (IS_ORGNT ~= '');

    set_variable("__pt1c_UNIQUEID", id);

    if(without_event == false)then
        userevent_return(data)
    end

    return data;
end

-- Обработка события создания канала - пары, при начале телефонного звонка.
function event_dial_create_chan()
    local NOCDR = get_variable("NOCDR");
    if(NOCDR~='') then
        app["return"]();
        return;
    end
    local data = {}
    local id = get_variable("pt1c_UNIQUEID");

    data['action']      = 'dial_create_chan';
    data['event_time']  = getNowDate();
    data['UNIQUEID']	= id;
    data['dst_chan']	= get_variable("CHANNEL");
    data['linkedid']    = get_variable("CDR(linkedid)");

    local is_local = string.lower(data['dst_chan']):find("local/") ~= nil
    if(is_local ~= true)then
        data['to_account'] = getAccountName(data['dst_chan']);
        app["NoOp"]('to_account set to '..data['to_account']);
    end

    local IS_ORGNT   = get_variable("IS_ORGNT");
    if(IS_ORGNT ~= '')then
        local peer_mobile= get_variable("peer_mobile");
        if(peer_mobile ~= '' and id:find(peer_mobile) == nil)then
            data['org_id'] = get_variable('UNIQUEID'):sub(0, 16)..'_'..peer_mobile..'_'..IS_ORGNT;
        end
    end

    -- data['dst_call_id']  = get_variable("PJSIP_HEADER(read,Call-ID)");
    local is_pjsip = string.lower(data['dst_chan']):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['dst_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    userevent_return(data)
    return data;
end

-- Обработка события ответа на звонок. Соединение абонентов.
function event_dial_answer()
    local data = {}
    data['answer']  	= getNowDate();
    data['agi_channel'] = get_variable("CHANNEL");

    local id     = get_variable("pt1c_UNIQUEID");
    local monDir = get_variable("MONITOR_DIR");

    -- Проверка на Originate
    local isOriginatePt1c = get_variable("pt1c_is_dst");
    local fromPeer        = get_variable("FROM_PEER");
    -- Обычно pt1c_is_dst=1 fromPeer не назначен для начального канала
    -- Запись следует включать на канале назначения.
    local isSrcChan = (isOriginatePt1c ~= '1' or fromPeer~='');

    if(monDir ~= '' and string.lower(data['agi_channel']):find("local/") == nil and isSrcChan) then
        -- Активируем запись разговора.
        -- Только для реальных каналов.
        local mixFileName = ''..monDir..'/'.. os.date("%Y/%m/%d/%H")..'/'..id;
        local stereoMode = get_variable("MONITOR_STEREO");
        local mixOptions = '';
        if('1' == stereoMode )then
            mixOptions = "abSr("..mixFileName.."_in.wav)t("..mixFileName.."_out.wav)";
        else
            mixOptions = 'ab';
        end
        app["MixMonitor"](mixFileName .. ".wav,"..mixOptions);
        app["NoOp"]('Start MixMonitor on channel '.. get_variable("CHANNEL"));
        data['recordingfile']  	= mixFileName .. ".mp3";
        app["UserEvent"]("StartRecording,recordingfile:"..data['recordingfile']..',recchan:'..data['agi_channel']);
    end

    data['action']      = 'dial_answer';
    data['id'] 		    = id;
    data['linkedid']  	= get_variable("CDR(linkedid)");

    data['ENDCALLONANSWER']= get_variable("ENDCALLONANSWER");
    data['BRIDGEPEER']     = get_variable("FROM_CHAN");

    local IS_ORGNT   = get_variable("IS_ORGNT");
    if(IS_ORGNT ~= '')then
        -- Вероятно необходимо переопределить ID.
        -- Применимо только для Originate, когда в качестве звонящего используем два канала
        -- мобильный и внутренний номер.
        local peer_mobile= get_variable("peer_mobile");
        if(peer_mobile ~= '' and id:find(peer_mobile) == nil)then
            data['org_id'] = get_variable('UNIQUEID'):sub(0, 16)..'_'..peer_mobile..'_'..IS_ORGNT;
        end
    end

    local from_1C      = get_variable("from_1C");
    local CTICHANNEL   = get_variable("CTICHANNEL");
    if('true' == from_1C and CTICHANNEL ~= '' )then
        data['dst_num']	    = get_variable("DIALEDPEERNUMBER");
    else
        data['dst_num']	    = get_variable("CALLERID(num)");
    end

    if(data['ENDCALLONANSWER'] ~= '')then
        set_variable("__ENDCALLONANSWER", '');
    end

    local PICKUPEER      = get_variable("PICKUPEER");
    data['dnid']         = get_variable('pt1c_dnid');
    if('' == data['dnid'])then
        data['dnid']     = get_variable('CDR(dnid)');
    end

    local pickupexten    = get_variable('PICKUP_EXTEN');
    if(data['dnid'] == 'unknown' and PICKUPEER ~= '')then
        -- Скорее всего ответ на вызов из 1С
        data['dnid']   = pickupexten;
    elseif(pickupexten == data['dnid']:sub(1,2) and PICKUPEER ~='') then
        data['dnid']   = pickupexten;
    end

    if(data['dnid'] == pickupexten)then
        -- Очищаем переменную канала. Больше не требуется.
        set_variable("PICKUPEER", "");
        data['old_id'] = id;
        data['id'] = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end

    local masterChannel = get_variable('MASTER_CHANNEL(CHANNEL)');
    if(string.lower(masterChannel):find("local/") == nil)then
        -- Таймату устанавливается только на реальный канал при входящем через провайдера.
        -- Если masterChannel локальный канал, то скорее всего идет Originate.
        set_variable("__pt1c_UNIQUEID", id);
        set_variable("MASTER_CHANNEL(M_DIALSTATUS)", 'ANSWER');
        app["AGI"]('/usr/www/src/Core/Asterisk/agi-bin/clean_timeout.php');
        set_variable("MASTER_CHANNEL(M_TIMEOUT_CHANNEL)", '');
    end

    userevent_return(data)
    return data;
end

-- Начало переадресации.
function event_transfer_dial()
    local data = {}
    data['start'] = getNowDate()
    local id = get_variable('UNIQUEID')..'_'..generateRandomString(6);

    local TRANSFERERNAME = get_variable("TRANSFERERNAME");
    local QUEUE_SRC_CHAN = get_variable("QUEUE_SRC_CHAN");

    local is_local = string.lower(TRANSFERERNAME):find("local/") ~= nil

    local channel;
    if(QUEUE_SRC_CHAN~='' and is_local) then
        channel = QUEUE_SRC_CHAN;
    elseif ( QUEUE_SRC_CHAN ~= '' and TRANSFERERNAME == '' ) then
        channel = QUEUE_SRC_CHAN;
    elseif ( TRANSFERERNAME == '' ) then
        channel = get_variable("CHANNEL");
    else
        channel = TRANSFERERNAME;
    end

    data['action']  	= "transfer_dial";
    data['agi_channel'] = channel;
    data['linkedid']  	= get_variable("CDR(linkedid)");
    data['src_chan'] 	= channel;
    data['did']		    = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    data['UNIQUEID']  	= id;
    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id'] = get_variable("CHANNEL(pjsip,call-id)");
    end

    if(TRANSFERERNAME == '')then
        data['transfer'] = '0'
    else
        data['transfer'] = '1'
    end
    data['src_num']  	= get_variable("CALLERID(num)");
    data['dst_num']  	= get_variable("EXTEN");

    set_variable("__transfer_UNIQUEID", id);
    userevent_return(data)

    return data;
end

-- Обработка события создания канала - пары, при начале переадресации звонка.
function event_transfer_dial_create_chan()
    local data = {}
    data['transfer_UNIQUEID'] = get_variable("transfer_UNIQUEID");
    data['dst_chan'] 		  = get_variable("CHANNEL");
    data['action']  		  = "transfer_dial_create_chan";
    data['linkedid']  		  = get_variable("CDR(linkedid)");

    local is_pjsip = string.lower(data['dst_chan']):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['dst_call_id']       = get_variable("CHANNEL(pjsip,call-id)");
    end
    set_variable("CHANNEL(hangup_handler_wipe)", 'hangup_handler,s,1');

    userevent_return(data)
    return data;
end

-- Обработка события ответа на переадресацию. Соединение абонентов.
function event_transfer_dial_answer()
    local data = {}

    local id = get_variable("transfer_UNIQUEID");
    data['transfer_UNIQUEID'] = id;
    data['answer']            = getNowDate()
    data['action']            = 'transfer_dial_answer';
    data['agi_channel']       = get_variable("CHANNEL");
    data['linkedid']          = get_variable("CDR(linkedid)");

    local monDir = get_variable("MONITOR_DIR");
    if(monDir ~= '' and string.lower(data['agi_channel']):find("local/") == nil )then
        -- Активируем запись разговора.
        -- Только для реальных каналов.
        local mixFileName = ''..monDir..'/'.. os.date("%Y/%m/%d/%H")..'/'..id;
        local stereoMode = get_variable("MONITOR_STEREO");
        local mixOptions = '';
        if('1' == stereoMode )then
            mixOptions = "abSr("..mixFileName.."_in.wav)t("..mixFileName.."_out.wav)";
        else
            mixOptions = 'ab';
        end
        app["MixMonitor"](mixFileName .. ".wav,"..mixOptions);
        app["NoOp"]('Start MixMonitor on channel '.. data['agi_channel']);
        data['recordingfile']  	= mixFileName .. ".mp3";
        app["UserEvent"]("StartRecording,recordingfile:"..data['recordingfile']..',recchan:'..data['agi_channel']);
    end

    userevent_return(data)
    return data;
end

-- Завершение канала при прееадресации.
function event_transfer_dial_hangup()
    local data = {}
    data['action']  	= "transfer_dial_hangup";
    data['end']         = getNowDate()
    data['linkedid']  	= get_variable("CDR(linkedid)");
    data['did']		    = get_variable("FROM_DID");
    data['agi_channel'] = get_variable("CHANNEL");
    data['agi_threadid']= get_variable('UNIQUEID')..'_'..generateRandomString(6);

    local is_local = string.lower(get_variable("CHANNEL")):find("local/") ~= nil
    if(is_local)then
        data['TRANSFERERNAME'] = get_variable("TRANSFERERNAME");
        data['ANSWEREDTIME']   = get_variable("ANSWEREDTIME");
        data['dst_chan'] 	   = get_variable("CDR(dstchannel)");
    end

    userevent_return(data)
    return data;
end

-- Завершение / уничтожение канала.
function event_hangup_chan()
    local data = {}
    data['action']  	= "hangup_chan";
    data['end']  		= getNowDate();
    data['did']		    = get_variable("FROM_DID");
    data['agi_threadid']= get_variable('UNIQUEID')..'_'..generateRandomString(6);
    data['linkedid']  	= get_variable("CDR(linkedid)");
    data['dialstatus']  = get_variable("DIALSTATUS");
    data['agi_channel'] = get_variable("CHANNEL");
    data['OLD_LINKEDID']= get_variable("OLD_LINKEDID");
    data['UNIQUEID']  	= get_variable("pt1c_UNIQUEID");
    if('ANSWER' == data['dialstatus'])then
        data['dialstatus'] = "ANSWERED";
    end

    userevent_return(data)
    return data;
end

-- Старт очереди.
function event_queue_start()
    local data = {}
    data['action']  	= "queue_start";
    local time_start;
    local id         = get_variable("pt1c_UNIQUEID")
    local ISTRANSFER = get_variable("ISTRANSFER");
    local FROM_DID   = get_variable('FROM_DID');

    if(id ~= '' and FROM_DID == '') then
        -- Это внутренний вызов, так как FROM_DID пустой.
        time_start = getNowDate();
        -- Обнуляем идентификатор, нужно описать новый
        set_variable("pt1c_UNIQUEID", "");
    elseif(id == '' or ISTRANSFER ~= '') then
        id         = get_variable('UNIQUEID')..'_'..generateRandomString(6);
        time_start = getNowDate();
    end

    data['action']  	= "queue_start";
    data['dst_num']  	= get_variable('EXTEN');
    data['dst_chan']  	= 'Queue:'..get_variable('EXTEN');
    data['did']  	    = FROM_DID;
    data['is_app']  	= '1';
    data['UNIQUEID']  	= id;
    data['linkedid']  	= get_variable("CDR(linkedid)");

    if(time_start ~= nil)then
        data['src_chan'] = get_variable("QUEUE_SRC_CHAN");
        data['src_num']  = get_variable("CALLERID(num)");
        data['start']    = time_start;
        data['transfer'] = '0';
        set_variable("__pt1c_q_UNIQUEID", id);
    end

    if(ISTRANSFER ~= '')then
        data['transfer']  	= '1';
    else
        data['transfer']  	= '0';
    end
    userevent_return(data)
    return data;
end

-- Ответ агента очереди.
function event_queue_answer()
    local data = {}
    data['action']  	= "queue_answer";
    data['answer']  	= getNowDate();
    data['id'] 		    = get_variable("pt1c_q_UNIQUEID");
    data['agi_channel'] = get_variable('CHANNEL');
    data['linkedid']  	= get_variable("CDR(linkedid)");

    userevent_return(data)
    return data;
end

-- Завершение работы очереди.
function event_queue_end()
    local data = {}
    data['action']  	= "queue_end";
    data['end']  		= getNowDate();
    data['id'] 		    = get_variable("pt1c_q_UNIQUEID");
    data['dialstatus']  = get_variable("QUEUESTATUS");
    data['agi_channel'] = get_variable('CHANNEL');
    data['linkedid']  	= get_variable("CDR(linkedid)");

    userevent_return(data)
    return data;
end

function event_dial_app()
    local data = {}
    local CHANNEL       = get_variable('CHANNEL');
    local FROM_CHAN     = get_variable('FROM_CHAN');
    local pt1c_UNIQUEID = get_variable('pt1c_UNIQUEID');

    local id = '';
    if(CHANNEL==FROM_CHAN and pt1c_UNIQUEID~='') then
        id = pt1c_UNIQUEID;
    else
        id = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end

    local extension = get_variable("APPEXTEN");
    if(extension == '')then
        extension = get_variable("EXTEN");
    end
    data = event_dial(true);
    data['dst_chan'] = 'App:'..extension;
    data['dst_num']  = extension;
    data['is_app']   = 1;
    data['UNIQUEID'] = id;
    set_variable("__pt1c_UNIQUEID", '');

    userevent_return(data)
    return data;
end

function event_dial_outworktimes()
    local data = event_dial(true);
    data['dst_chan']    = 'App:outworktimes';
    data['dst_num']     = 'outworktimes';
    data['is_app']      = 1;

    userevent_return(data)
    return data;
end

function set_from_peer()
    local from_peer_revers = get_variable("CHANNEL"):reverse();
    local result = string.sub(from_peer_revers, string.find(from_peer_revers,"-")+1, from_peer_revers:len()):reverse();
    result = string.sub(result, string.find(result,"/")+1, result:len());
    app["NoOp"]('__FROM_PEER set to '..result);
    set_variable('__FROM_PEER', result);
    app["return"]();
end

-- TODO
-- Event_unpark_call
-- Event_unpark_call_timeout

-- Event_meetme_dial
-- Event_hangup_chan_meetme

extensions = {
    dial = {},
    transfer_dial={},
    lua_dial_create_chan={},
    dial_answer={},
    lua_transfer_dial_create_chan={},
    transfer_dial_answer={},
    transfer_dial_hangup={},
    hangup_chan={},
    queue_start={},
    queue_answer={},
    queue_end={},
    dial_app={},
    dial_outworktimes={},
    set_from_peer={},
}
extensions.dial["_.!"]                      = function() event_dial() end
extensions.transfer_dial["_.!"]             = function() event_transfer_dial() end
extensions.lua_dial_create_chan["_.!"]      = function() event_dial_create_chan() end
extensions.dial_answer["_.!"]               = function() event_dial_answer() end
extensions.lua_transfer_dial_create_chan["_.!"] = function() event_transfer_dial_create_chan() end
extensions.transfer_dial_answer["_.!"]      = function() event_transfer_dial_answer() end
extensions.transfer_dial_hangup["_.!"]      = function() event_transfer_dial_hangup() end
extensions.hangup_chan["_.!"]               = function() event_hangup_chan() end
extensions.queue_start["_.!"]               = function() event_queue_start() end
extensions.queue_answer["_.!"]              = function() event_queue_answer() end
extensions.queue_end["_.!"]                 = function() event_queue_end() end
extensions.dial_app["_.!"]                  = function() event_dial_app() end
extensions.dial_outworktimes["_.!"]         = function() event_dial_outworktimes() end
extensions.set_from_peer["_.!"]             = function() set_from_peer() end

-----------------------------------------------------
-- блок тестирования модуля...
is_test = nil
if(channel == nil) then
    ask_var = {};
    function ask_var:new(value)
        local object = {}
        object.value = value or ""
        setmetatable(object, self)
        self.__index = self
        return object
    end
    function ask_var:get()
        return self.value
    end

    app = {};
    app["return"] = function()
        -- ничего не делаем.
    end
    app["Verbose"] = function()
        -- ничего не делаем.
    end
    app['UserEvent'] = function(p_event, p_data)
        print(p_event.."("..p_data..")");
    end

    if(arg~=nil and arg[1] == 'test' )then
        is_test = true;
        local TESTS = (loadfile '/usr/www/src/Core/Asterisk/Configs/lua/cdr_connector_tests.lua')();
        TESTS:make_tests();
    end

    channel = {
        QUEUE_SRC_CHAN  = ask_var:new("SIP/104-00001"),
        orign_chan      = ask_var:new('SIP/104-00001'),
        pt1c_UNIQUEID   = ask_var:new(''),
        IS_ORGNT        = ask_var:new(''),
        UNIQUEID        = ask_var:new('1557224457.0022'),
        CHANNEL         = ask_var:new('SIP/104-00001'),
        FROM_PEER       = ask_var:new('SIP/104-00001'),
        EXTEN           = ask_var:new('000063'),
        FROM_DID        = ask_var:new(''),
        TRANSFERERNAME  = ask_var:new(''),
        peer_mobile     = ask_var:new(''),
        ANSWEREDTIME    = ask_var:new(''),
        ENDCALLONANSWER = ask_var:new(''),
        FROM_CHAN       = ask_var:new(''),
        PICKUPEER       = ask_var:new(''),
        DNID            = ask_var:new(''),
        DIALSTATUS      = ask_var:new(''),
        ISTRANSFER      = ask_var:new(''),
        pt1c_q_UNIQUEID = ask_var:new(''),
        QUEUESTATUS     = ask_var:new(''),
        APPEXTEN        = ask_var:new(''),
        pt1c_dnid       = ask_var:new(''),
        DIALEDPEERNUMBER= ask_var:new(''),
        from_1C         = ask_var:new(''),
        CTICHANNEL      = ask_var:new(''),
    }
    channel['CALLERID(num)']    = ask_var:new('74952293042')
    channel['CHANNEL(peername)']= ask_var:new('104')
    channel['CDR(linkedid)']    = ask_var:new('1557224457.0022')
    channel['CDR(dstchannel)']  = ask_var:new('')
    channel['CDR(dnid)']        = ask_var:new('')
end