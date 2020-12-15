-- MikoPBX - free phone system for small business
-- Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

tests = {};
function tests:new()
    local object = {}
    setmetatable(object, self)
    self.__index = self
    return object
end

function tests:t_dial()
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
    }
    channel['CALLERID(num)'] = ask_var:new('74952293042')
    channel['CHANNEL(peername)'] = ask_var:new('104')
    channel['CHANNEL(linkedid)'] = ask_var:new('1557224457.0022')

    local number_test;

    -- TESTS FOR "event_dial"
    number_test = 1
    channel['pt1c_UNIQUEID'] = ask_var:new('')
    channel['IS_ORGNT']      = ask_var:new('')
    local res = event_dial();
    if(res['UNIQUEID']:sub(0, string.len( get_variable('UNIQUEID')) ) ~= get_variable('UNIQUEID'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end
    if(res['src_num'] ~= get_variable('CALLERID(num)'))then
        print('Error test '..number_test..' '..res['src_num'])
    end

    number_test = 2
    channel['pt1c_UNIQUEID'] = ask_var:new('1557224457.0022_test')
    local res = event_dial();
    if(res['UNIQUEID']:sub(0, string.len( get_variable('UNIQUEID')) ) ~= get_variable('UNIQUEID'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    number_test = 3
    channel['QUEUE_SRC_CHAN'] = ask_var:new('SIP/104-00001')
    channel['CHANNEL'] = ask_var:new('Local/104@internal-00001')
    local res = event_dial();
    if(res['src_chan'] ~= get_variable('QUEUE_SRC_CHAN'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    number_test = 3
    channel['QUEUE_SRC_CHAN'] = ask_var:new('')
    channel['orign_chan'] = ask_var:new('SIP/104-00001')
    channel['CHANNEL'] = ask_var:new('Local/104@internal-00001')
    local res = event_dial();
    if(res['src_chan'] ~= get_variable('orign_chan'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    number_test = 4
    channel['FROM_PEER'] = ask_var:new('')
    channel['CHANNEL'] = ask_var:new('SIP/104-00001')
    local res = event_dial();
    if(res['from_account'] ~= get_variable('CHANNEL'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    number_test = 5
    channel['FROM_PEER'] = ask_var:new('SIP/204-00002')
    channel['CHANNEL'] = ask_var:new('SIP/104-00001')
    local res = event_dial();
    if(res['from_account'] ~= get_variable('FROM_PEER'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    number_test = 6
    channel['IS_ORGNT']      = ask_var:new('201')
    channel['CALLERID(num)'] = ask_var:new('74952293042')
    channel['EXTEN']         = ask_var:new('201')
    channel['CHANNEL']       = ask_var:new('Local/104@internal-00001;2')
    channel['UNIQUEID']      = ask_var:new('1557224457.0022')
    local res = event_dial();
    if(res['src_num'] ~= get_variable('EXTEN'))then
        print('Error test '..number_test..' '..res['src_num'])
    end
    if(res['UNIQUEID'] ~= "1557224457.0022_104_201")then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end
    if(res['dialstatus'] ~= 'ORIGINATE')then
        print('Error test '..number_test..' '..res['dialstatus'])
    end
    if(res['dst_chan'] ~= 'Local/104@internal-00001;1')then
        print('Error test '..number_test..' '..res['dst_chan'])
    end

    if(res['UNIQUEID'] ~= get_variable('__pt1c_UNIQUEID'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end
end

function tests:t_transfer_dial()
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
    }
    number_test = 7
    local res = event_transfer_dial();
    if(res['UNIQUEID']:sub(0, string.len( get_variable('UNIQUEID')) ) ~= get_variable('UNIQUEID'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
    end

    channel['QUEUE_SRC_CHAN'] = ask_var:new('SIP/104-00001')
    channel['orign_chan'] = ask_var:new('')
    channel['TRANSFERERNAME'] = ask_var:new('Local/104@internal-00001')
    number_test = 8
    local res = event_transfer_dial();
    if(res['src_chan'] ~= get_variable('QUEUE_SRC_CHAN'))then
        print('Error test '..number_test..' '..res['src_chan'])
    end
    if(res['transfer'] ~= '1')then
        print('Error test '..number_test..' '..res['transfer'])
    end


    channel['QUEUE_SRC_CHAN'] = ask_var:new('SIP/104-00001')
    channel['orign_chan'] = ask_var:new('')
    channel['TRANSFERERNAME'] = ask_var:new('')
    number_test = 9
    local res = event_transfer_dial();
    if(res['src_chan'] ~= get_variable('QUEUE_SRC_CHAN'))then
        print('Error test '..number_test..' '..res['src_chan'])
    end
    if(res['transfer'] ~= '0')then
        print('Error test '..number_test..' '..res['transfer'])
    end

    channel['QUEUE_SRC_CHAN'] = ask_var:new('')
    channel['orign_chan']     = ask_var:new('')
    channel['TRANSFERERNAME'] = ask_var:new('SIP/104-00001')
    number_test = 10
    local res = event_transfer_dial();
    if(res['src_chan'] ~= get_variable('TRANSFERERNAME'))then
        print('Error test '..number_test..' '..res['src_chan'])
    end

    if(res['UNIQUEID'] ~= get_variable('__transfer_UNIQUEID'))then
        print('Error test '..number_test..' '..res['UNIQUEID'])
        end
end

function tests:t_event_dial_create_chan()

    local number_test;
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
    }
    channel['CALLERID(num)']     = ask_var:new('74952293042')
    channel['CHANNEL(peername)'] = ask_var:new('')
    channel['CHANNEL(linkedid)'] = ask_var:new('1557224457.0022')

    number_test = 11
    local res = event_dial_create_chan();
    if(res['to_account'] ~= nil)then
        print('Error test '..number_test..' '..res['to_account'])
    end

    number_test = 12
    channel['CHANNEL'] = ask_var:new('Local/104@internal-00001;2')
    channel['CHANNEL(peername)'] = ask_var:new('SIP/104-00001')
    local res = event_dial_create_chan();
    if(res['to_account'] == nil)then
        print('Error test '..number_test..' '..res['to_account'])
    end

    number_test = 13
    channel['peer_mobile']  = ask_var:new('89257184444')
    channel['UNIQUEID']     = ask_var:new('1557224457.0022')
    channel['IS_ORGNT']     = ask_var:new('201')
    local res = event_dial_create_chan();
    if(res['org_id'] ~= '1557224457.0022_89257184444_201')then
        print('Error test '..number_test..' '..res['org_id'])
    end

end

function tests:t_event_dial_answer()
    local number_test;
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
        ENDCALLONANSWER = ask_var:new(''),
        FROM_CHAN       = ask_var:new(''),
        PICKUPEER       = ask_var:new(''),
        DNID            = ask_var:new(''),
    }
    channel['CALLERID(num)'] = ask_var:new('74952293042')
    channel['CHANNEL(peername)'] = ask_var:new('104')
    channel['CHANNEL(linkedid)'] = ask_var:new('1557224457.0022')

    number_test = 14
    channel['peer_mobile']  = ask_var:new('89257184444')
    channel['UNIQUEID']     = ask_var:new('1557224457.0022')
    channel['IS_ORGNT']     = ask_var:new('201')
    local res = event_dial_answer();
    if(res['org_id'] ~= '1557224457.0022_89257184444_201')then
        print('Error test '..number_test..' '..res['org_id'])
    end

    number_test = 15
    channel['IS_ORGNT']     = ask_var:new('')
    res = event_dial_answer();
    if(res['org_id'] ~= nil )then
        print('Error test '..number_test..' ')
    end

    number_test = 16
    channel['ENDCALLONANSWER']     = ask_var:new('test')
    res = event_dial_answer();
    if(get_variable("__ENDCALLONANSWER") ~= '' )then
        print('Error test '..number_test..' ')
    end

    number_test = 17
    channel['CDR(dnid)']     = ask_var:new('unknown')
    channel['PICKUPEER']= ask_var:new('unknown')
    res = event_dial_answer();
    if(res['dnid'] ~= '*8' )then
        print('Error test '..number_test..''..res['dnid']..' ')
    end

    number_test = 18
    channel['CDR(dnid)']     = ask_var:new('*8101')
    channel['PICKUPEER']= ask_var:new('unknown')
    res = event_dial_answer();
    if(res['dnid'] ~= '*8' )then
        print('Error test '..number_test..''..res['dnid']..' ')
    end
    number_test = 19
    channel['CDR(dnid)']     = ask_var:new('*8')
    channel['PICKUPEER']= ask_var:new('unknown')
    channel['pt1c_UNIQUEID']= ask_var:new('1557224457.0022_dsff')
    res = event_dial_answer();
    if(res['dnid'] ~= '*8' and get_variable("PICKUPEER") ~= '' )then
        print('Error test '..number_test..''..res['dnid']..' ')
    end
    if(res['old_id'] ~= get_variable("pt1c_UNIQUEID") )then
        print('Error test '..number_test..''..res['old_id']..get_variable("pt1c_UNIQUEID"))
    end


end

function tests:t_event_transfer_dial_hangup()
    local number_test;
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
        ENDCALLONANSWER = ask_var:new(''),
        FROM_CHAN       = ask_var:new(''),
        PICKUPEER       = ask_var:new(''),
        DNID            = ask_var:new(''),
    }
    channel['CALLERID(num)'] = ask_var:new('74952293042')
    channel['CHANNEL(peername)'] = ask_var:new('104')
    channel['CHANNEL(linkedid)'] = ask_var:new('1557224457.0022')

    number_test = 20
    channel['peer_mobile']  = ask_var:new('89257184444')
    channel['UNIQUEID']     = ask_var:new('1557224457.0022')
    channel['IS_ORGNT']     = ask_var:new('201')
    local res = event_transfer_dial_hangup();
    if(res['TRANSFERERNAME'] ~= nil)then
        print('Error test '..number_test..' '..res['TRANSFERERNAME'])
    end

    number_test = 21
    channel['CHANNEL']         = ask_var:new('Local/104@internal-00001;2')
    channel['TRANSFERERNAME']  = ask_var:new('SIP/104-00001')
    local res = event_transfer_dial_hangup();
    if(res['TRANSFERERNAME'] == nil)then
        print('Error test '..number_test..' ' .. res['agi_channel'])
    end

end

function tests:t_event_hangup_chan()

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
        ENDCALLONANSWER = ask_var:new(''),
        FROM_CHAN       = ask_var:new(''),
        PICKUPEER       = ask_var:new(''),
        DNID            = ask_var:new(''),
        DIALSTATUS      = ask_var:new(''),
    }
    channel['CALLERID(num)'] = ask_var:new('74952293042')
    channel['CHANNEL(peername)'] = ask_var:new('104')
    channel['CHANNEL(linkedid)'] = ask_var:new('1557224457.0022')

    local number_test = 23
    channel['DIALSTATUS']  = ask_var:new('ANSWER')
    local res = event_hangup_chan();
    if(res['dialstatus'] ~= 'ANSWERED')then
        print('Error test '..number_test..' '..res['dialstatus'])
    end

    number_test = 24
    channel['DIALSTATUS']  = ask_var:new('NO ANSWER')
    local res = event_hangup_chan();
    if(res['dialstatus'] ~= get_variable("DIALSTATUS"))then
        print('Error test '..number_test..' '..res['dialstatus'])
    end

end

function tests:t_event_queue_start()

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
    }
    channel['CALLERID(num)']    = ask_var:new('74952293042')
    channel['CHANNEL(peername)']= ask_var:new('104')
    channel['CHANNEL(linkedid)']    = ask_var:new('1557224457.0022')
    channel['CDR(dstchannel)']  = ask_var:new('')

    local number_test = 26
    channel['pt1c_UNIQUEID']  = ask_var:new('123')
    local res = event_queue_start();
    if(res['UNIQUEID'] ~= get_variable("pt1c_UNIQUEID") )then
        print('Error test '..number_test..' ')
    end
    if(res['UNIQUEID'] ~= get_variable("__pt1c_q_UNIQUEID") )then
        print('Error test '..number_test..' ')
    end

    local number_test = 26
    channel['ISTRANSFER']     = ask_var:new('1')
    channel['pt1c_UNIQUEID']  = ask_var:new('')
    local res = event_queue_start();
    if(res['UNIQUEID'] == get_variable("pt1c_UNIQUEID") )then
        print('Error test '..number_test..' 1')
    end
    if(res['src_chan'] ~= get_variable("QUEUE_SRC_CHAN") )then
        print('Error test '..number_test..' 2')
    end


end

function tests:t_event_dial_app()
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
    }
    channel['CALLERID(num)']    = ask_var:new('74952293042')
    channel['CHANNEL(peername)']= ask_var:new('104')
    channel['CHANNEL(linkedid)']    = ask_var:new('1557224457.0022')
    channel['CDR(dstchannel)']  = ask_var:new('')


    local number_test = 27
    channel['APPEXTEN']  = ask_var:new('100')
    channel['EXTEN']     = ask_var:new('')
    local res = event_dial_app();
    if(res['dst_num'] ~= get_variable("APPEXTEN") )then
        print('Error test '..number_test..' ')
    end
    local number_test = 28
    channel['APPEXTEN']  = ask_var:new('')
    channel['EXTEN']     = ask_var:new('100')
    local res = event_dial_app();
    if(res['dst_num'] ~= get_variable("EXTEN") )then
        print('Error test '..number_test..' ')
    end

end

function tests:make_tests()
    self:t_dial();
    self:t_transfer_dial();
    self:t_event_dial_create_chan();
    self:t_event_dial_answer();
    self:t_event_transfer_dial_hangup();
    self:t_event_hangup_chan();
    self:t_event_queue_start();
    self:t_event_dial_app();
end

return tests:new();
