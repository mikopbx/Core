-- MikoPBX - free phone system for small business
-- Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License along with this program.
-- If not, see <https://www.gnu.org/licenses/>.

-- Initializing helper procedures and functions.
JSON = (loadfile "/usr/www/src/Core/Asterisk/Configs/lua/JSON.lua")();
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

--[[
    Encodes the given data in Base64 format.

    Parameters:
    - data (string): The data to be encoded.

    Returns:
    - The Base64 encoded string.

    Example Usage:
    local encodedData = base64_encode("Hello, world!")
]]
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

--[[
    Generates a random string of the specified length.

    Parameters:
    - len (number): The length of the random string to generate.

    Returns:
    - The randomly generated string.

    Example Usage:
    local randomStr = generateRandomString(10)
]]
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

--[[
    Returns the current date and time with milliseconds.

    Returns:
    - The current date and time in the format "YYYY-MM-DD HH:MM:SS.SSS".

    Example Usage:
    local currentDate = getNowDate()
]]
function getNowDate()
    local a,b = math.modf(os.clock())
    return os.date("%Y-%m-%d %H:%M:%S.")..tostring(b):sub(3,5);
end

--[[
    Extracts and returns the account name from a channel string.

    Parameters:
    - channel: A string representing the channel.

    Returns:
    - The extracted account name from the channel.

    Example Usage:
    local channel = "SIP/1234-5678@provider"
    local accountName = getAccountName(channel)
]]
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

--[[
    Retrieves the value of a channel variable.

    Parameters:
    - name: A string representing the name of the variable.

    Returns:
    - The value of the channel variable, or an empty string if the variable is not found or has no value.

    Example Usage:
    local variableName = "CALLERID(num)"
    local value = get_variable(variableName)
]]
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

--[[
    Checks if conversation recording is enabled for a call between the source and destination.

    Parameters:
    - src: A string representing the source of the call.
    - dst: A string representing the destination of the call.

    Returns:
    - A boolean value indicating whether conversation recording is enabled for the call.

    Example Usage:
    local sourceNumber = "123456789"
    local destinationNumber = "987654321"
    local isRecordingEnabled = monitorEnable(sourceNumber, destinationNumber)
]]
function monitorEnable(src, dst)

    -- Extract the last 9 digits from the source and destination numbers
    src = string.sub(src, -9);
    dst = string.sub(dst, -9);
    app["NoOp"]("Check (".. src.." -> "..dst..")");

    -- Check if the call is an inner call and conversation recording is disabled for inner calls
    local isInner     = get_variable("DIALPLAN_EXISTS(monitor-internal,"..src..")") == "1" and get_variable("DIALPLAN_EXISTS(monitor-internal,"..dst..")") == "1";
    local notRecInner = get_variable("MONITOR_INNER") == "0";
    if(isInner == true and notRecInner == true )then
        app["NoOp"]("Is inner call. (".. src.." -> "..dst..") Conversation recording is disabled");
        return false;
    end

    -- Check if the source or destination numbers are exceptions where conversation recording is disabled
    if(get_variable("DIALPLAN_EXISTS(monitor-exceptions,"..src..")") == "1")then
        app["NoOp"]("Is exception numbers. ("..src..") Conversation recording is disabled");
        return false;
    end
    if(get_variable("DIALPLAN_EXISTS(monitor-exceptions,"..dst..")") == "1")then
        app["NoOp"]("Is exception numbers. ("..dst..") Conversation recording is disabled");
        return false;
    end
    return true;
end

--[[
    Sets the value of a channel variable.

    Parameters:
    - p_name: A string representing the name of the variable.
    - p_value: The value to be assigned to the variable.

    Example Usage:
    set_variable("MY_VARIABLE", "Hello, World!")

    Note:
    - The function assigns the value of p_value to the channel variable with the name p_name.
]]
function set_variable(p_name, p_value)
    if(is_test == nil) then
        channel[p_name] = p_value;
        -- app["NoOp"](p_name.. ' set to '..p_value);
    elseif( ask_var ~=nil ) then

        channel[p_name] = ask_var:new(p_value);
    end
end

--[[
    Sends a user event with encoded data.

    Parameters:
    - data: A table containing the data to be encoded and sent as a user event.

    Note:
    - The function encodes the data using base64 encoding and sends it as a user event.
    - If the 'is_test' variable is defined, the function returns without performing any action.

    Example Usage:
    local eventData = {
        key1 = "value1",
        key2 = "value2",
    }
    userevent_return(eventData)
]]
function userevent_return(data)
    if(is_test ~= nil) then
        return
    end
    data = base64_encode( JSON:encode(data) );
    app["CELGenUserEvent"](""..data);
    app["UserEvent"]("CdrConnector,AgiData:"..data);
    app["return"]();
end

--[[
    Sends a user event with encoded data and hangs up the channel.

    Parameters:
    - data: A table containing the data to be encoded and sent as a user event.

    Note:
    - The function encodes the data using base64 encoding and sends it as a user event.
    - If the 'is_test' variable is defined, the function returns without performing any action.
    - After sending the user event, the function logs a NoOp message indicating the hangup and hangs up the channel.

    Example Usage:
    local eventData = {
        key1 = "value1",
        key2 = "value2",
    }
    userevent_hangup(eventData)
]]
function userevent_hangup(data)
    if(is_test ~= nil) then
        return
    end
    data = base64_encode(JSON:encode(data));
    app["CELGenUserEvent"](""..data);
    app["UserEvent"]("CdrConnector,AgiData:"..data);
    app["NoOp"]('Hangup channel ');
    app["Hangup"]();
end


--[[
    Handles the dial event and collects call information.

    Parameters:
    - without_event (optional): If set to true, the function will skip sending a user event with the call data.

    Returns:
    - A table containing the call information.

    Note:
    - The function collects various call details such as start time, channel information, caller ID, destination number,
      and more.
    - If the 'NOCDR' variable is set, the function returns without performing any action.
    - If the call is an originate call (IS_ORGNT is set), the function adjusts the channel and destination information accordingly.
    - The function generates a unique ID for the call and sets it as '__pt1c_UNIQUEID' variable.
    - By default, the function sends a user event with the call data unless 'without_event' is set to true.

    Example Usage:
    local eventData = event_dial()
    -- Use the eventData table for further processing
]]
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

    if(id~='' and IS_ORGNT=='') then
        app["return"]();
        return;
    end

    if(id=='' or IS_ORGNT~='') then
        id = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end
    local channel       = get_variable("CHANNEL")
    local agi_channel   = channel;

    -- Adjust channel for local calls
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
        -- Adjust channel and destination for originate calls
        agi_channel         = get_variable('MASTER_CHANNEL(CHANNEL)')
        dst_num  	        = get_variable("CALLERID(num)")
        src_num  	        = get_variable("EXTEN")
        data['dialstatus']  = 'ORIGINATE';
        from_account = '';

        -- Extract number and modified destination channel for originate calls
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
    data['linkedid']  	 = get_variable("CHANNEL(linkedid)");
    data['UNIQUEID']  	 = id;
    data['transfer']  	 = '0';
    data['agi_channel']  = agi_channel;
    data['did']		     = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    local origCallId = get_variable("ORIG_CALLID");
    if(origCallId ~= '')then
        data['verbose_call_id'] = data['verbose_call_id'] .. "&".. origCallId;
    end
    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    data['from_account'] = from_account;
    data['IS_ORGNT']     = (IS_ORGNT ~= '');

    set_variable("__pt1c_UNIQUEID", id);
    local chanExists = get_variable('CHANNEL_EXISTS('..data['src_chan']..')');
    if(chanExists ~= '1')then
        app["NoOp"]('The channel '..data['src_chan']..' no longer exists ('..chanExists..'). We are completing the call.');
        app["Hangup"]();
        return {};
    end
    if(without_event == false)then
        userevent_return(data)
    end

    return data;
end

--[[
    Handles the start of an interception event and collects relevant information.

    Returns:
    - A table containing the interception event details.

    Note:
    - The function collects the start time, action, unique ID, linked ID, channel information, verbose call ID,
      and other relevant data for the interception event.
    - If there is an interception channel specified, the function adjusts the source channel, source number, and destination number accordingly.
    - The function generates a unique ID for the interception event and sets it as '__int_UNIQUEID' variable.
    - The function sends a user event with the interception data.

    Example Usage:
    local eventData = event_interception_start()
    -- Use the eventData table for further processing
]]
function event_interception_start()
    local data = {}
    data['start'] = getNowDate()
    data['action']       = "dial";
    data['action_extra'] = "originate_start";

    data['UNIQUEID']     = get_variable('UNIQUEID')..'_'..generateRandomString(6)
    set_variable("__int_UNIQUEID", data['UNIQUEID']);

    data['linkedid']  	    = get_variable("CHANNEL(linkedid)");
    data['int_channel']     = get_variable("INTECEPTION_CNANNEL");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    local origCallId = get_variable("ORIG_CALLID");
    if(origCallId ~= '')then
        data['verbose_call_id'] = data['verbose_call_id'] .. "&".. origCallId;
    end

    if(data['int_channel'] ~= '')then
        -- Adjust channel and numbers for interception
        data['linkedid']     = get_variable('OLD_LINKEDID');
        set_variable("__int_ID", data['linkedid']);
        local from_account  = get_variable("FROM_PEER")
        if ( from_account=='' and string.lower(data['int_channel']):find("local/") == nil )then
            from_account = getAccountName(data['int_channel']);
        end
        data['from_account'] = from_account;
        data['src_chan']  	 = data['int_channel'];
        data['src_num']  	 = get_variable("pt1c_cid");
        data['dst_num']  	 = get_variable("number");
        data['dialstatus']   = 'ORIGINATE_TRY_INTERCEPTION';
        data['appname']  	 = 'interception';
    else
        data['appname']  	 = 'originate';
        data['src_num']  	 = get_variable("number");
        data['dst_num']  	 = get_variable("pt1c_cid");
        data['dialstatus']  = 'ORIGINATE_TRY_DIAL';
    end

    userevent_return(data)
    return data;
end

--[[
    Handles the result of an interception bridge event and collects call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function creates a data table to store the call information.
    - It sets the end time, action, and action extra for the call.
    - It retrieves the dial status of the call and updates it if necessary.
    - The 'answer' field is set for answered calls to differentiate them from unsuccessful calls in logging.
    - It retrieves the unique ID and linked ID of the call.
    - If there is an internal ID, it updates the linked ID accordingly.
    - The function sends a user event with the call information.

    Example Usage:
    local callData = event_interception_bridge_result()
    -- Use the callData table for further processing
]]
function event_interception_bridge_result()
    -- Create a data table to store the call information
    local data = {}

    -- Set the end time of the call
    data['endtime']          = getNowDate()

    -- Set the action and action extra for the call
    data['action']       = "dial";
    data['action_extra'] = "originate_end";

    -- Get the dial status of the call
    data['dialstatus']   = get_variable("M_DIALSTATUS");

    if(data['dialstatus'] == 'ANSWER') then
        data['dialstatus']   = 'ANSWERED';
        -- Respond as answered; this call won't appear in the final CDR.
        -- It will be logged differently. Only applicable for Originate to track unsuccessful calls.
        data['answer']   = os.date("%Y-%m-%d %H:%M:%S", os.time()+3)..'.0';
        data['endtime']  = os.date("%Y-%m-%d %H:%M:%S", os.time()+5)..'.0';
    end

    -- Get the unique ID and linked ID of the call
    data['UNIQUEID']     = get_variable("int_UNIQUEID");
    data['linkedid']  	 = get_variable("CHANNEL(linkedid)");

    -- Check if there is an internal ID and update the linked ID if present
    local intId = get_variable('int_ID');
    if(intId ~= '')then
        data['linkedid'] = intId;
    end

    -- Send the data as a user event
    userevent_return(data)

    return data;
end

--[[
    Handles the start of a voicemail event and collects relevant call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function creates a data table to store the call information.
    - It sets the start time and answer time to the current date and time.
    - It generates a unique ID for the voicemail event.
    - It retrieves the caller's account name if available.
    - It sets the action, source channel, source number, destination number, and destination channel for the voicemail event.
    - It retrieves the linked ID, unique ID, and other related details of the call.
    - If the channel is using PJSIP, it retrieves the source call ID.
    - The function sets the caller's account information and marks the event as not originating.
    - It sends a user event with the call information.

    Example Usage:
    local voicemailData = event_voicemail_start()
    -- Use the voicemailData table for further processing
]]
function event_voicemail_start()
    -- Create a data table to store the call information
    local data = {}

    -- Set the start and answer time to the current date and time
    data['start']       = getNowDate()
    data['answer']  	= getNowDate();

    -- Generate a unique ID for the voicemail event
    local id            = get_variable('UNIQUEID')..'_'..generateRandomString(6);

    -- Retrieve the caller's account name if available
    local from_account  = get_variable("FROM_PEER")
    if ( from_account=='' and string.lower(agi_channel):find("local/") == nil )then
        from_account = getAccountName(agi_channel);
    end

    -- Set the action, source channel, source number, destination number, and destination channel for the voicemail event
    data['action']          = "voicemail_start";
    data['src_chan'] 	    = get_variable("CHANNEL");
    data['src_num']  	    = get_variable("CALLERID(num)");
    data['dst_num']  	    = get_variable("EXTEN");
    data['dst_chan']        = 'VOICEMAIL';

    -- Retrieve the linked ID, unique ID, and other related details of the call
    data['linkedid']  	    = get_variable("CHANNEL(linkedid)");
    data['UNIQUEID']  	    = id;
    data['transfer']  	    = '0';
    data['agi_channel']     = agi_channel;
    data['did']		        = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    local origCallId = get_variable("ORIG_CALLID");
    if(origCallId ~= '')then
        data['verbose_call_id'] = data['verbose_call_id'] .. "&".. origCallId;
    end

    -- Check if the channel is using PJSIP and retrieve the source call ID
    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    -- Set the caller's account information and mark the event as not originating
    data['from_account'] = from_account
    data['IS_ORGNT']     = false;

    -- Set the unique ID as a variable for further use
    set_variable("__pt1c_UNIQUEID", id);

    -- Send a user event with the call information
    userevent_return(data)

    return data;
end

--[[
    Handles the dial interception event and collects relevant call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function creates a data table to store the call information.
    - It retrieves the linked ID and checks if it exists.
    - If the linked ID is empty, the function returns.
    - It sets the start time to the current date and time using the linked ID.
    - It generates a unique ID for the interception event.
    - It retrieves the channel and AGI channel of the call.
    - It retrieves the interception channel and the caller's account name.
    - It sets the action, source channel, source number, and destination number for the dial interception event.
    - It retrieves the linked ID, unique ID, and other related details of the call.
    - If the channel is using PJSIP, it retrieves the source call ID.
    - The function sets the caller's account information.
    - It sets the unique ID as a variable for further use.
    - It sends a user event with the call information.

    Example Usage:
    local dialInterceptionData = event_dial_interception()
    -- Use the dialInterceptionData table for further processing
]]
function event_dial_interception()
    -- Create a data table to store the call information
    local data = {}

    -- Retrieve the linked ID and check if it exists
    local OLD_LINKEDID = get_variable("OLD_LINKEDID");
    if(OLD_LINKEDID == '') then
        app["return"]();
        return;
    end

    -- Set the start time to the current date and time using the linked ID
    data['start']  = os.date("%Y-%m-%d %H:%M:%S.")..tostring(OLD_LINKEDID:sub(9)):sub(3,5);

    -- Generate a unique ID for the interception event
    local id = get_variable('UNIQUEID')..'_'..generateRandomString(6);

    -- Retrieve the channel and AGI channel of the call
    local channel       = get_variable("CHANNEL")
    local agi_channel   = channel;

    -- Retrieve the interception channel and the caller's account name
    local interceptionChannel  = get_variable("INTECEPTION_CNANNEL")
    local from_account = getAccountName(interceptionChannel);

    local dst_num, src_num;
    data['action'] = "dial";
    dst_num  	        = get_variable("CALLERID(num)")
    src_num  	        = get_variable("EXTEN")
    from_account = '';

    id = get_variable('UNIQUEID');
    data['dst_chan']     = agi_channel;
    data['linkedid']  	 = OLD_LINKEDID;
    data['src_chan'] 	 = interceptionChannel;
    data['src_num']  	 = src_num;
    data['dst_num']  	 = dst_num;
    data['UNIQUEID']  	 = id;
    data['transfer']  	 = '0';
    data['agi_channel']  = agi_channel;
    data['did']		     = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    local origCallId = get_variable("ORIG_CALLID");
    if(origCallId ~= '')then
        data['verbose_call_id'] = data['verbose_call_id'] .. "&".. origCallId;
    end

    -- Check if the channel is using PJSIP and retrieve the source call ID
    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    -- Set the caller's account information
    data['from_account'] = from_account;

    -- Set the unique ID as a variable for further use
    set_variable("__pt1c_UNIQUEID", id);

    -- Send a user event with the call information
    userevent_return(data)

    return data;
end

--[[
    Handles the dial creation channel event and collects relevant call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function checks if NOCDR variable exists and returns if it does.
    - The function creates a data table to store the call information.
    - It retrieves the unique ID of the call.
    - It sets the action, event time, unique ID, destination channel, and linked ID for the dial creation channel event.
    - It checks if the destination channel is local and retrieves the account name if it is not.
    - If IS_ORGNT variable exists, it retrieves the peer mobile number and sets the org_id if it is not already present.
    - If the destination channel is using PJSIP, it retrieves the destination call ID.
    - The function sends a user event with the call information.

    Example Usage:
    local dialCreateChanData = event_dial_create_chan()
    -- Use the dialCreateChanData table for further processing
]]
function event_dial_create_chan()

    -- Check if NOCDR variable exists and return if it does
    local NOCDR = get_variable("NOCDR");
    if(NOCDR~='') then
        app["return"]();
        return;
    end

    -- Create a data table to store the call information
    local data = {}

    -- Retrieve the unique ID of the call
    local id = get_variable("pt1c_UNIQUEID");

    -- Set the action, event time, unique ID, destination channel, and linked ID for the dial creation channel event
    data['action']      = 'dial_create_chan';
    data['event_time']  = getNowDate();
    data['UNIQUEID']	= id;
    data['dst_chan']	= get_variable("CHANNEL");
    data['linkedid']    = get_variable("CHANNEL(linkedid)");

    if(get_variable('PROVIDER_ID') ~= '')then
        -- outgoing call
        app["NoOp"]('__TO_CHAN set to '..data['dst_chan']);
        set_variable("MASTER_CHANNEL(__TO_CHAN)", data['dst_chan']);
    end
    -- Check if the destination channel is local and retrieve the account name if it is not
    local is_local = string.lower(data['dst_chan']):find("local/") ~= nil
    if(is_local ~= true)then
        data['to_account'] = getAccountName(data['dst_chan']);
        app["NoOp"]('to_account set to '..data['to_account']);
    end

    -- Check if IS_ORGNT variable exists and retrieve the peer mobile number, then set org_id if it is not already present
    local IS_ORGNT   = get_variable("IS_ORGNT");
    if(IS_ORGNT ~= '')then
        local peer_mobile= get_variable("peer_mobile");
        if(peer_mobile ~= '' and id:find(peer_mobile) == nil)then
            data['org_id'] = get_variable('UNIQUEID'):sub(0, 16)..'_'..peer_mobile..'_'..IS_ORGNT;
        end
    end

    -- Check if the destination channel is using PJSIP and retrieve the destination call ID
    -- data['dst_call_id']  = get_variable("PJSIP_HEADER(read,Call-ID)");
    local is_pjsip = string.lower(data['dst_chan']):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['dst_call_id']  = get_variable("CHANNEL(pjsip,call-id)");
    end

    -- Send a user event with the call information
    userevent_return(data)

    return data;
end

--[[
    Handles the dial end event and collects relevant call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function creates a data table to store the call information.
    - It sets the end time, unique ID, source channel, linked ID, and action for the dial end event.
    - It triggers a user event with the reason for the dial failure.
    - The function sends a user event with the call information.

    Example Usage:
    local dialEndData = event_dial_end()
    -- Use the dialEndData table for further processing
]]
function event_dial_end()

    -- Create a data table to store the call information
    local data = {}

    -- Set the end time, unique ID, source channel, linked ID, and action for the dial end event
    data['endtime']  = getNowDate();
    data['UNIQUEID']	= get_variable("pt1c_UNIQUEID");
    data['src_chan']	= get_variable("CHANNEL");
    data['linkedid']    = get_variable("CHANNEL(linkedid)");
    data['action']      = 'dial_end';

    -- Trigger a user event with the reason for the dial failure
    app["UserEvent"]("DialFail,REASON:NO_CONTACTS");
    -- Send a user event with the call information
    userevent_return(data)

    return data;
end

--[[
    Handles the dial answer event and collects relevant call information.

    Returns:
    - A table containing the call information.

    Note:
    - The function creates a data table to store the call information.
    - It sets the answer time and AGI channel for the call.
    - It checks if recording should be enabled based on monitor configuration.
    - If recording is enabled, it starts the MixMonitor and triggers a user event for recording.
    - It sets the action, unique ID, linked ID, and other call details.
    - It handles the case of calls from 1C and pickup scenarios.
    - It updates the master channel's dial status and performs additional operations if necessary.
    - The function sends a user event with the call information.

    Example Usage:
    local dialAnswerData = event_dial_answer()
    -- Use the dialAnswerData table for further processing
]]
function event_dial_answer()

    -- Create a data table to store the call information
    local data = {}

    -- Set the answer time and AGI channel for the call
    data['answer']  	= getNowDate();
    data['agi_channel'] = get_variable("CHANNEL");

    local id     = get_variable("pt1c_UNIQUEID");
    local monDir = get_variable("MONITOR_DIR");

    -- Check if recording should be enabled based on monitor configuration and channel type
    -- Check for Originate
    local isOriginatePt1c = get_variable("pt1c_is_dst");
    local fromPeer        = get_variable("FROM_PEER");
    -- Usually, pt1c_is_dst=1 is not assigned to the initial channel for fromPeer.
    -- Recording should be enabled on the destination channel.
    local isSrcChan = (isOriginatePt1c ~= '1' or fromPeer~='');

    if(monDir ~= '' and string.lower(data['agi_channel']):find("local/") == nil and isSrcChan) then
        -- Enable recording for real channels
        if(monitorEnable(get_variable("CONNECTEDLINE(num)"), get_variable("CALLERID(num)"))) then
            app["NoOp"]("Monitor ... "..get_variable("CONNECTEDLINE(num)").." -> "..get_variable("CALLERID(num)"));
            local mixFileName = ''..monDir..'/'.. os.date("%Y/%m/%d/%H")..'/'..id;
            local stereoMode = get_variable("MONITOR_STEREO");
            local mixOptions = '';
            if('1' == stereoMode )then
                mixOptions = "ar("..mixFileName.."_in.wav)t("..mixFileName.."_out.wav)";
            else
                mixOptions = 'a';
            end
            app["MixMonitor"](mixFileName .. ".wav,"..mixOptions);
            app["NoOp"]('Start MixMonitor on channel '.. get_variable("CHANNEL"));
            data['recordingfile']  	= mixFileName .. ".mp3";
            app["UserEvent"]("StartRecording,recordingfile:"..data['recordingfile']..',recchan:'..data['agi_channel']);
        end
    end

    -- Set the action, unique ID, linked ID, and other call details
    data['action']      = 'dial_answer';
    data['id'] 		    = id;

    local OLD_LINKEDID = get_variable("OLD_LINKEDID");
    if(OLD_LINKEDID ~= '')then
        data['linkedid']  	= OLD_LINKEDID;
    else
        data['linkedid']  	= get_variable("CHANNEL(linkedid)");
    end

    data['ENDCALLONANSWER']= get_variable("ENDCALLONANSWER");
    data['BRIDGEPEER']     = get_variable("FROM_CHAN");

    local IS_ORGNT   = get_variable("IS_ORGNT");
    if(IS_ORGNT ~= '')then
        -- Handle ID override for Originate calls with two channels (mobile and internal number)
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

    -- Handle scenarios related to END CALL ON ANSWER and pickup
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
        -- Handle scenarios where the call is from 1C
        data['dnid']   = pickupexten;
    elseif(pickupexten == data['dnid']:sub(1,2) and PICKUPEER ~='') then
        data['dnid']   = pickupexten;
    end

    if(data['dnid'] == pickupexten)then
        -- Clear the channel variable as it is no longer needed
        set_variable("PICKUPEER", "");
        data['old_id'] = id;
        data['id'] = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end

    local masterChannel = get_variable('MASTER_CHANNEL(CHANNEL)');
    if(string.lower(masterChannel):find("local/") == nil)then
        -- Update timeout channel and perform additional operations only for real channels in incoming scenarios
        set_variable("__pt1c_UNIQUEID", id);
        local chanExists = get_variable('CHANNEL_EXISTS('..get_variable("FROM_CHAN")..')');
        if(chanExists == "1")then
            set_variable('EXPORT('..get_variable("FROM_CHAN")..',MASTER_CHANNEL(M_DIALSTATUS))', 'ANSWER')
            set_variable('EXPORT('..get_variable("FROM_CHAN")..',M_DIALSTATUS)', 'ANSWER')
            app["NoOp"]('EXPORT ANSWER state');
        end
        set_variable("MASTER_CHANNEL(M_DIALSTATUS)", 'ANSWER');
        set_variable("MASTER_CHANNEL(M_TIMEOUT_CHANNEL)", '');

        local disableAnnonceIn  = get_variable('MASTER_CHANNEL(DISABLE_ANNONCE)');
        local needAnnonceIn  = get_variable('MASTER_CHANNEL(IN_NEED_ANNONCE)');
        local fileAnnonceIn  = get_variable('PBX_REC_ANNONCE_IN');
        app["NoOp"]('needAnnonceIn: '.. needAnnonceIn .. '. fileAnnonceIn: ' .. fileAnnonceIn.. '. disableAnnonceIn: ' .. disableAnnonceIn);
        if( needAnnonceIn == '1' and fileAnnonceIn ~= '' and disableAnnonceIn ~= '1' )then
            local posSlash = masterChannel:find('/') + 1;
            local dst_chan = masterChannel:sub(posSlash);
            app["Originate"]('Local/'..dst_chan..'@annonce-spy,exten,annonce-playback-in,annonce,1,2,a');
            set_variable("MASTER_CHANNEL(IN_NEED_ANNONCE)", '0');
        end

        local disableAnnonceOut  = get_variable('DISABLE_ANNONCE');
        local needAnnonceOut     = get_variable('OUT_NEED_ANNONCE');
        local fileAnnonceOut     = get_variable('PBX_REC_ANNONCE_OUT');
        app["NoOp"]('needAnnonceOut: '.. needAnnonceOut .. '. fileAnnonceOut: ' .. fileAnnonceOut.. '. disableAnnonceOut: ' .. disableAnnonceOut);
        if( needAnnonceOut == '1' and fileAnnonceOut ~= '' and disableAnnonceOut ~= '1' )then
            local posSlash = masterChannel:find('/') + 1;
            local dst_chan = masterChannel:sub(posSlash);
            app["Originate"]('Local/'..dst_chan..'@annonce-spy,exten,annonce-playback-out,annonce,1,2,a');
            set_variable("OUT_NEED_ANNONCE", '0');
        end
    end

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_transfer_dial()

    This function handles the event when a transfer is initiated.

    Parameters:
        None

    Returns:
        data (table): A table containing the call information:
            - start (string): The start time of the transfer dial.
            - action (string): The action type, which is "transfer_dial".
            - agi_channel (string): The AGI channel involved in the transfer.
            - is_queue (string): Indicates whether the transfer is from a queue (0 or 1).
            - linkedid (string): The linked ID of the channel.
            - src_chan (string): The source channel of the transfer.
            - did (string): The DID (Direct Inward Dialing) associated with the transfer.
            - verbose_call_id (string): The verbose call ID of the channel.
            - UNIQUEID (string): The unique ID of the transfer dial.
            - src_call_id (string): The source call ID if the channel is using PJSIP.
            - transfer (string): Indicates whether it is a transfer (1) or a regular dial (0).
            - src_num (string): The source number of the transfer.
            - dst_num (string): The destination number of the transfer.

]]
function event_transfer_dial()

    -- Create a data table to store the call information
    local data = {}

    -- Set the start time of the transfer dial
    data['start'] = getNowDate()

    -- Generate a unique ID for the transfer dial
    local id = get_variable('UNIQUEID')..'_'..generateRandomString(6);

    local TRANSFERERNAME = get_variable("TRANSFERERNAME");
    local QUEUE_SRC_CHAN = get_variable("QUEUE_SRC_CHAN");

    -- Check if the TRANSFERERNAME is a local channel or a queue
    local is_local = string.lower(TRANSFERERNAME):find("local/") ~= nil
    local is_queue = '0';
    if(QUEUE_SRC_CHAN~='') then
        is_queue= '1';
    end

    -- Determine the channel based on the conditions
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

    -- Set the action, agi_channel, and other data fields
    data['action']  	= "transfer_dial";
    data['agi_channel'] = channel;
    data['is_queue']    = is_queue;
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");
    data['src_chan'] 	= channel;
    data['did']		    = get_variable("FROM_DID");
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    data['UNIQUEID']  	= id;

    -- Check if the channel is using PJSIP and set the src_call_id if applicable
    local is_pjsip = string.lower(get_variable("CHANNEL")):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['src_call_id'] = get_variable("CHANNEL(pjsip,call-id)");
    end

    -- Determine if it's a transfer or a regular dial
    if(TRANSFERERNAME == '')then
        data['transfer'] = '0'
    else
        data['transfer'] = '1'
    end

    -- Set the source number and destination number
    data['src_num']  	= get_variable("CALLERID(num)");
    data['dst_num']  	= get_variable("EXTEN");

    set_variable("__transfer_UNIQUEID", id);
    local chanExists = get_variable('CHANNEL_EXISTS('..data['src_chan']..')');
    if(chanExists ~= '1')then
        app["NoOp"]('The channel '..data['src_chan']..' no longer exists ('..chanExists..'). We are completing the call.');
        app["Hangup"]();
        return {};
    end
    -- Send the data as a user event
    userevent_return(data)

    return data;
end

--[[
    event_transfer_dial_create_chan()

    This function handles the event when a transfer channel is created.

    Parameters:
        None

    Returns:
        data (table): A table containing the transfer channel information:
            - transfer_UNIQUEID (string): The unique ID of the transfer.
            - dst_chan (string): The destination channel of the transfer.
            - action (string): The action type, which is "transfer_dial_create_chan".
            - linkedid (string): The linked ID of the channel.
            - dst_call_id (string): The destination call ID if the channel is using PJSIP.
]]
function event_transfer_dial_create_chan()

    -- Create a table to store the transfer channel information
    local data = {}

    -- Retrieve the unique ID and destination channel of the transfer
    data['transfer_UNIQUEID'] = get_variable("transfer_UNIQUEID");
    data['dst_chan'] 		  = get_variable("CHANNEL");

    -- Set the action type to "transfer_dial_create_chan"
    data['action']  		  = "transfer_dial_create_chan";

    -- Retrieve the linked ID of the channel
    data['linkedid']  		  = get_variable("CHANNEL(linkedid)");


    -- Check if the channel is using PJSIP and retrieve the destination call ID
    local is_pjsip = string.lower(data['dst_chan']):find("pjsip/") ~= nil
    if(is_pjsip) then
        data['dst_call_id']       = get_variable("CHANNEL(pjsip,call-id)");
    end

    -- Set the hangup handler for the channel
    set_variable("CHANNEL(hangup_handler_wipe)", 'hangup_handler,s,1');

    userevent_return(data)
    return data;
end

--[[
    event_transfer_dial_answer()

    This function handles the event when a transfer call is answered.

    Parameters:
        None

    Returns:
        data (table): A table containing the transfer call information:
            - transfer_UNIQUEID (string): The unique ID of the transfer.
            - answer (string): The date and time when the call was answered.
            - action (string): The action type, which is "transfer_dial_answer".
            - agi_channel (string): The AGI channel of the call.
            - linkedid (string): The linked ID of the channel.
            - recordingfile (string): The file name of the call recording if enabled.

]]
function event_transfer_dial_answer()

    -- Create a table to store the transfer call information
    local data = {}

    -- Retrieve the unique ID of the transfer
    local id = get_variable("transfer_UNIQUEID");
    data['transfer_UNIQUEID'] = id;

    -- Set the answer timestamp
    data['answer']            = getNowDate()

    -- Set the action type to "transfer_dial_answer"
    data['action']            = 'transfer_dial_answer';

    -- Retrieve the AGI channel and linked ID of the call
    data['agi_channel']       = get_variable("CHANNEL");
    data['linkedid']          = get_variable("CHANNEL(linkedid)");

    -- Retrieve the monitoring directory and check if call recording is enabled
    local monDir = get_variable("MONITOR_DIR");
    if(monDir ~= '' and string.lower(data['agi_channel']):find("local/") == nil )then
        -- Activate call recording for real channels
        if(monitorEnable(get_variable("CONNECTEDLINE(num)"), get_variable("CALLERID(num)"))) then
            app["NoOp"]("Monitor ... "..get_variable("CONNECTEDLINE(num)").." -> "..get_variable("CALLERID(num)"));
            local mixFileName = ''..monDir..'/'.. os.date("%Y/%m/%d/%H")..'/'..id;
            local stereoMode = get_variable("MONITOR_STEREO");
            local mixOptions = '';
            if('1' == stereoMode )then
                mixOptions = "abr("..mixFileName.."_in.wav)t("..mixFileName.."_out.wav)";
            else
                mixOptions = 'ab';
            end
            app["MixMonitor"](mixFileName .. ".wav,"..mixOptions);
            app["NoOp"]('Start MixMonitor on channel '.. data['agi_channel']);
            data['recordingfile']  	= mixFileName .. ".mp3";
            app["UserEvent"]("StartRecording,recordingfile:"..data['recordingfile']..',recchan:'..data['agi_channel']);
        end
    end

    -- Send the data as a user event
    userevent_return(data)

    return data;
end

--[[
    event_transfer_dial_hangup()

    This function handles the event when a transfer call is hung up.

    Parameters:
        None

    Returns:
        data (table): A table containing the transfer call information:
            - action (string): The action type, which is "transfer_dial_hangup".
            - end (string): The date and time when the call was hung up.
            - linkedid (string): The linked ID of the channel.
            - did (string): The DID of the call.
            - agi_channel (string): The AGI channel of the call.
            - agi_threadid (string): The thread ID of the AGI channel.
            - TRANSFERERNAME (string, optional): The name of the transferer if the channel is local.
            - ANSWEREDTIME (string, optional): The answered time of the call if the channel is local.
            - dst_chan (string, optional): The destination channel of the call if the channel is local.

]]
function event_transfer_dial_hangup()

    -- Create a table to store the transfer call information
    local data = {}

    -- Set the action type to "transfer_dial_hangup"
    data['action']  	= "transfer_dial_hangup";

    -- Set the end timestamp of the call
    data['end']         = getNowDate()

    -- Retrieve the linked ID and DID of the call
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");
    data['did']		    = get_variable("FROM_DID");

    -- Retrieve the AGI channel and thread ID
    data['agi_channel'] = get_variable("CHANNEL");
    data['agi_threadid']= get_variable('UNIQUEID')..'_'..generateRandomString(6);

    -- Check if the channel is local and retrieve additional information if applicable
    local is_local = string.lower(get_variable("CHANNEL")):find("local/") ~= nil
    if(is_local)then
        data['TRANSFERERNAME'] = get_variable("TRANSFERERNAME");
        data['ANSWEREDTIME']   = get_variable("ANSWEREDTIME");
        data['dst_chan'] 	   = get_variable("CDR(dstchannel)");
    end

    -- Check the extension and invoke the appropriate function
    local EXTEN = get_variable("EXTEN");
    if('h' == EXTEN)then
        userevent_hangup(data);
    else
        -- Send the data as a user event
        userevent_return(data);
    end

    return data;
end

--[[
    event_hangup_chan()

    This function handles the event when a channel is hung up.

    Parameters:
        None

    Returns:
        data (table): A table containing the hung-up channel information:
            - action (string): The action type, which is "hangup_chan".
            - end (string): The date and time when the channel was hung up.
            - src_num (string): The caller ID number.
            - did (string): The DID (Direct Inward Dialing) of the call.
            - agi_threadid (string): The AGI thread ID of the channel.
            - linkedid (string): The linked ID of the channel.
            - dialstatus (string): The dial status of the call.
            - agi_channel (string): The AGI channel of the call.
            - OLD_LINKEDID (string): The old linked ID of the channel.
            - UNIQUEID (string): The unique ID of the channel.
            - VMSTATUS (string): The voicemail status of the call.
            - verbose_call_id (string): The verbose call ID of the channel.

]]
function event_hangup_chan()

    -- Create a table to store the hung-up channel information
    local data = {}

    -- Set the action type to "hangup_chan"
    data['action']  	= "hangup_chan";

    -- Set the end timestamp of the channel
    data['end']  		= getNowDate();

    -- Retrieve the caller ID number and DID of the call
    data['src_num']		= get_variable("CALLERID(num)");
    data['did']		    = get_variable("FROM_DID");

    -- Retrieve the AGI thread ID and linked ID of the channel
    data['agi_threadid']= get_variable('UNIQUEID')..'_'..generateRandomString(6);
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");

    -- Retrieve the dial status, AGI channel, old linked ID, unique ID, and voicemail status of the call
    data['dialstatus']  = get_variable("DIALSTATUS");
    data['agi_channel'] = get_variable("CHANNEL");
    data['OLD_LINKEDID']= get_variable("OLD_LINKEDID");
    data['UNIQUEID']  	= get_variable("pt1c_UNIQUEID");
    data['VMSTATUS']  	= get_variable("VMSTATUS");

    -- Retrieve the verbose call ID and append the original call ID if available
    data['verbose_call_id']	= get_variable("CHANNEL(callid)");
    local origCallId = get_variable("ORIG_CALLID");
    if(origCallId ~= '')then
        data['verbose_call_id'] = data['verbose_call_id'] .. "&".. origCallId;
    end

    -- Update the dial status if it is "ANSWER" to "ANSWERED"
    if('ANSWER' == data['dialstatus'])then
        data['dialstatus'] = "ANSWERED";
    end

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_queue_start()

    This function handles the event when a call enters a queue.

    Parameters:
        None

    Returns:
        data (table): A table containing the queue start information:
            - action (string): The action type, which is "queue_start".
            - dst_num (string): The destination number (queue extension).
            - dst_chan (string): The destination channel in the format "Queue:<queue_extension>".
            - did (string): The DID (Direct Inward Dialing) of the call.
            - is_app (string): Indicates if the call is from an application (1) or not (0).
            - UNIQUEID (string): The unique ID of the call.
            - linkedid (string): The linked ID of the call.
            - src_chan (string): The source channel of the call.
            - src_num (string): The source number (caller ID number) of the call.
            - start (string): The start timestamp of the call.
            - transfer (string): Indicates if the call is a transfer (1) or not (0).
]]
function event_queue_start()

    -- Create a table to store the queue start information
    local data = {}
    data['action']  	= "queue_start";
    local time_start;

    -- Retrieve the unique ID and ISTRANSFER variable
    local id         = get_variable("pt1c_UNIQUEID")
    local ISTRANSFER = get_variable("ISTRANSFER");

    -- Retrieve the FROM_DID variable
    local FROM_DID   = get_variable('FROM_DID');

    if(id ~= '' and ISTRANSFER ~= '') then
        -- Getting a new call ID for the queue
        id         = get_variable('UNIQUEID')..'_'..generateRandomString(6);
        time_start = getNowDate();
    elseif(id ~= '' and FROM_DID == '') then
        time_start = getNowDate();
        -- It is an internal call as FROM_DID is empty
        -- Generate a new unique ID and start timestamp
        set_variable("pt1c_UNIQUEID", "");
    elseif(id == '' or ISTRANSFER ~= '') then
        id         = get_variable('UNIQUEID')..'_'..generateRandomString(6);
        time_start = getNowDate();
    end

    -- Set the action type to "queue_start"
    data['action']  	= "queue_start";

    -- Retrieve the destination number, destination channel, DID, is_app flag, and linked ID
    data['dst_num']  	= get_variable('EXTEN');
    data['dst_chan']  	= 'Queue:'..get_variable('EXTEN');
    data['did']  	    = FROM_DID;
    data['is_app']  	= '1';
    data['UNIQUEID']  	= id;
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");

    -- Check if the start timestamp is set and populate the source channel, source number, start timestamp, and transfer flag
    if(time_start ~= nil)then
        data['src_chan'] = get_variable("QUEUE_SRC_CHAN");
        data['src_num']  = get_variable("CALLERID(num)");
        data['start']    = time_start;
        data['transfer'] = '0';
        set_variable("__pt1c_q_UNIQUEID", id);
    end

    -- Set the transfer flag if it is a transfer call
    if(ISTRANSFER ~= '')then
        data['transfer']  	= '1';
        set_variable("_TRANSFERERNAME", data['src_chan']);
    else
        data['transfer']  	= '0';
    end

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_queue_answer()

    This function handles the event when an agent answers a call in a queue.

    Parameters:
        None

    Returns:
        data (table): A table containing the queue answer information:
            - action (string): The action type, which is "queue_answer".
            - answer (string): The date and time when the call was answered.
            - id (string): The unique ID of the call.
            - agi_channel (string): The AGI channel of the call.
            - linkedid (string): The linked ID of the call.
]]
function event_queue_answer()
    -- Create a table to store the queue answer information
    local data = {}

    -- Set the action type to "queue_answer"
    data['action'] = "queue_answer"

    -- Set the answer timestamp, unique ID, AGI channel, and linked ID
    data['answer']  	= getNowDate();
    data['id'] 		    = get_variable("pt1c_q_UNIQUEID");
    data['agi_channel'] = get_variable('CHANNEL');
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_queue_end()

    This function handles the event when a call in a queue ends.

    Parameters:
        None

    Returns:
        data (table): A table containing the queue end information:
            - action (string): The action type, which is "queue_end".
            - end (string): The date and time when the call ended.
            - id (string): The unique ID of the call.
            - dialstatus (string): The dial status of the call.
            - agi_channel (string): The AGI channel of the call.
            - linkedid (string): The linked ID of the call.
]]
function event_queue_end()
    -- Create a table to store the queue end information
    local data = {}

    -- Set the action type to "queue_end"
    data['action'] = "queue_end"
    data['end']  		= getNowDate();

    -- Set the end timestamp, unique ID, dial status, AGI channel, and linked ID
    data['id'] 		    = get_variable("pt1c_q_UNIQUEID");
    data['dialstatus']  = get_variable("QUEUESTATUS");
    data['agi_channel'] = get_variable('CHANNEL');
    data['linkedid']  	= get_variable("CHANNEL(linkedid)");

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_dial_app()

    This function handles the event when a call is dialed using an application.

    Parameters:
        None

    Returns:
        data (table): A table containing the dial app information:
            - start (string): The start timestamp of the call.
            - answer (string): The answer timestamp of the call.
            - endtime (string): The end timestamp of the call.
            - action (string): The action type, which is "dial".
            - dialstatus (string): The dial status of the call.
            - dst_chan (string): The destination channel of the call, prefixed with "App:".
            - dst_num (string): The destination number or extension dialed.
            - is_app (number): Indicates if the call was dialed using an application (1 for true, 0 for false).
            - UNIQUEID (string): The unique ID of the call.
            - linkedid (string): The linked ID of the call.

]]
function event_dial_app()
    -- Create a table to store the dial app information
    local data = {}

    -- Get the necessary variables
    local CHANNEL       = get_variable('CHANNEL');
    local FROM_CHAN     = get_variable('FROM_CHAN');
    local pt1c_UNIQUEID = get_variable('pt1c_UNIQUEID');

    -- Determine the unique ID for the call
    local id = '';
    if(CHANNEL==FROM_CHAN and pt1c_UNIQUEID~='') then
        id = pt1c_UNIQUEID;
    else
        id = get_variable('UNIQUEID')..'_'..generateRandomString(6);
    end

    -- Get the dialed extension
    local extension = get_variable("APPEXTEN");
    if(extension == '')then
        extension = get_variable("EXTEN");
    end

    -- Call the event_dial() function to handle the common dial logic
    data = event_dial(true);

    local monDir = get_variable("MONITOR_DIR");
    if(monDir ~= '' and get_variable('NEED_MONITOR')=='1' and  monitorEnable(get_variable("CONNECTEDLINE(num)"), get_variable("CALLERID(num)"))) then
        app["NoOp"]("Monitor ... "..get_variable("CONNECTEDLINE(num)").." -> "..get_variable("CALLERID(num)"));
        local mixFileName = ''..monDir..'/'.. os.date("%Y/%m/%d/%H")..'/'..id;
        local stereoMode = get_variable("MONITOR_STEREO");
        local mixOptions = '';
        if('1' == stereoMode )then
            mixOptions = "ar("..mixFileName.."_in.wav)t("..mixFileName.."_out.wav)";
        else
            mixOptions = 'a';
        end
        app["MixMonitor"](mixFileName .. ".wav,"..mixOptions);
        app["NoOp"]('Start MixMonitor on channel '.. get_variable("CHANNEL"));
        data['recordingfile']  	= mixFileName .. ".mp3";
        app["UserEvent"]("StartRecording,recordingfile:"..data['recordingfile']..',recchan:'..CHANNEL);
    end

    -- Set the destination channel, number, and is_app flag
    data['dst_chan'] = 'App:'..extension;
    data['dst_num']  = extension;
    data['is_app']   = 1;

    -- Set the UNIQUEID and clear the pt1c_UNIQUEID variable
    data['UNIQUEID'] = id;
    set_variable("__pt1c_UNIQUEID", '');

    -- Send the data as a user event
    userevent_return(data)
    return data;
end

--[[
    event_dial_outworktimes()

    This function handles the event when a call is dialed during out-of-work times.

    Parameters:
        None

    Returns:
        data (table): A table containing the out-of-work times dial information:
            - start (string): The start timestamp of the call.
            - answer (string): The answer timestamp of the call.
            - endtime (string): The end timestamp of the call.
            - action (string): The action type, which is "dial".
            - dialstatus (string): The dial status of the call.
            - dst_chan (string): The destination channel of the call, prefixed with "App:outworktimes".
            - dst_num (string): The destination number or extension dialed, which is "outworktimes".
            - is_app (number): Indicates if the call was dialed using an application (1 for true, 0 for false).
            - UNIQUEID (string): The unique ID of the call.
            - linkedid (string): The linked ID of the call.
]]

function event_dial_outworktimes()

    -- Call the event_dial() function to handle the common dial logic
    local data = event_dial(true);

    -- Set the destination channel, number, and is_app flag
    data['dst_chan']    = 'App:outworktimes';
    data['dst_num']     = 'outworktimes';
    data['is_app']      = 1;

    -- Send the data as a user event
    userevent_return(data)
    return data;
end


--[[
    set_from_peer()

    This function sets the "__FROM_PEER" variable based on the "CHANNEL" variable.

]]
function set_from_peer()
    -- Reverse the "CHANNEL" variable and extract the value after the last "-"
    local from_peer_revers = get_variable("CHANNEL"):reverse();
    local result = string.sub(from_peer_revers, string.find(from_peer_revers,"-")+1, from_peer_revers:len()):reverse();

    -- Extract the value after the last "/"
    result = string.sub(result, string.find(result,"/")+1, result:len());

    -- Set the "__FROM_PEER" variable and return
    set_variable('__FROM_PEER', result);
    app["NoOp"]('__FROM_PEER set to '..result);
    app["return"]();
end

-- TODO
-- Event_unpark_call
-- Event_unpark_call_timeout

-- Event_meetme_dial
-- Event_hangup_chan_meetme

extensions = {
    dial = {},
    dial_interception = {},
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
    voicemail_start={},
    voicemail_end={},
    interception_start={},
    interception_bridge_result={},
    dial_end={}
}

-- event_interception_start event_interception_bridge_result
extensions.dial["_.!"]                      = function() event_dial() end
extensions.dial_interception["_.!"]         = function() event_dial_interception() end
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
extensions.voicemail_start["_.!"]           = function() event_voicemail_start() end

extensions.interception_start["_.!"]           = function() event_interception_start() end
extensions.interception_bridge_result["_.!"]   = function() event_interception_bridge_result() end
extensions.dial_end["_.!"]                     = function() event_dial_end() end
--
------
---- Safe connection of additional dialplans described in /etc/asterisk/extensions-lua.
------
function file_exists(name)
    local f=io.open(name,"r");
    if f~=nil then io.close(f) return true else return false end
end

local scriptLocation='/etc/asterisk/extensions-lua';
if( file_exists(scriptLocation) )then
    for line in io.popen("ls "..scriptLocation.."/*.lua", "r"):lines() do
        if( debug.getinfo(1).short_src ~= line)then
            local newExtensions = loadfile(line);
            if(newExtensions)then
                newExtensions();
            end
        end
    end
end
------
