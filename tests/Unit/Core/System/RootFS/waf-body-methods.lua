-- Run from any directory: luajit waf-body-methods.lua /path/to/unified-security.lua
-- Exercise the real request/body checks without nginx/Redis. Transport is tested live.
local source_file = assert(io.open(assert(arg[1], 'pass unified-security.lua path'), 'r'))
local source = source_file:read('*a')
source_file:close()
local checks = assert(source:match('(%-%- Body scan limit.-)\n%-%- ===== RATE LIMITING ====='))
local reads, body, method = 0, nil, nil
ngx = {
    var = {}, req = {}, WARN = 1, log = function() end,
    unescape_uri = function(s)
        return (s:gsub('%%(%x%x)', function(h) return string.char(tonumber(h, 16)) end))
    end,
}
ngx.req.get_method = function() return method end
ngx.req.read_body = function() reads = reads + 1 end
ngx.req.get_body_data = function() return body end
ngx.req.get_body_file = function() return nil end
local compile = loadstring or load
local check = assert(compile([[
local client_ip = 'test'
local function get_request_path() return '/pbxcore/api/v3/extensions' end
local function is_scope_exempt() return false end
]] .. checks .. '\nreturn check_basic_security'))()
local cases, failures = 0, 0
local function verify(name, verb, ct, payload, cl, te, allowed, expected_reads)
    method, body, reads = verb, payload, 0
    ngx.var = {content_type = ct, content_length = cl, http_transfer_encoding = te}
    local actual = check()
    cases = cases + 1
    if actual ~= allowed or reads ~= expected_reads then
        failures = failures + 1
        print('FAIL ' .. name .. ': allowed=' .. tostring(actual) .. ' reads=' .. reads)
    end
end
for _, verb in ipairs({'POST', 'PUT', 'PATCH', 'DELETE'}) do
    -- HTTP/2 DATA frames do not require either HTTP/1 framing header.
    verify(verb .. ' no CL/TE', verb, 'application/json', '{"uniqid":"../../evil"}', nil, nil, false, 1)
    verify(verb .. ' chunked', verb, 'application/json', '{"uniqid":"../../evil"}', nil, 'chunked', false, 1)
    verify(verb .. ' form', verb, 'application/x-www-form-urlencoded', 'uniqid=..%2Fevil', '17', nil, false, 1)
    verify(verb .. ' clean JSON', verb, 'application/json', '{"deleteRecording":true}', nil, nil, true, 1)
    verify(verb .. ' clean form', verb, 'application/x-www-form-urlencoded', 'deleteRecording=true', nil, nil, true, 1)
end
for _, verb in ipairs({'GET', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT', 'PROPFIND'}) do
    verify(verb .. ' ignored body', verb, 'application/json', '{"uniqid":"../../evil"}', '23', nil, true, 0)
    verify(verb .. ' ignored chunked', verb, 'application/json', '{"uniqid":"../../evil"}', nil, 'chunked', true, 0)
end
-- #1238: `select ... from` / `update ... set` keep the old `%s+.*%s+` semantics (two whitespace chars).
for payload, allowed in pairs({
    ['SELECT name\nFROM t'] = false, ['select  from'] = false, ['select x fromage'] = false,
    ['update users set a=0'] = false, ['select from'] = true, ['selectx from'] = true,
    ['from x select y'] = true, ['update set'] = true, ['set x update y'] = true,
}) do
    verify('sql ' .. payload, 'POST', 'text/plain', payload, nil, nil, allowed, 1)
end
-- The same matcher guards the query string.
verify('sql in query', 'GET', nil, nil, nil, nil, true, 0)
ngx.var.args = 'q=select%20id%20from%20t'
cases = cases + 1
if check() ~= false then failures = failures + 1; print('FAIL sql in query') end
-- #1238: hostile 64 KiB bodies took 2.3-4.8 s each with `.*`; linear scan takes milliseconds.
for _, unit in ipairs({'select ', 'update ', 'select\t', 'Select  x'}) do
    local started = os.clock()
    verify('time ' .. unit, 'POST', 'application/json', string.rep(unit, math.floor(65000 / #unit)), nil, nil, true, 1)
    local spent = os.clock() - started
    if spent > 0.2 then failures = failures + 1; print('FAIL time ' .. unit .. ': ' .. spent .. ' s') end
end
-- #1239: decoded variants are scanned whatever the Content-Type says.
for name, c in pairs({
    ['json \\u traversal'] = {'application/json', '{"a":"\\u002e\\u002E/etc"}', false},
    ['json \\/ traversal'] = {'application/json', '{"a":"..\\/etc"}', false},
    ['json \\u null'] = {'application/json', '{"a":"x\\u0000"}', false},
    ['text/plain percent'] = {'text/plain', 'a=%2e%2e%2fetc', false},
    ['no type percent'] = {nil, 'a=%2e%2e%2fetc', false},
    ['form plus sql'] = {'application/x-www-form-urlencoded', 'q=1+union+select+2', false},
    ['json substring multipart'] = {'application/json; x=multipart', '{"a":"../x"}', false},
    ['clean json escapes'] = {'application/json', '{"a":"line\\nnext \\u00e9 50%"}', true},
    ['json \\t sql'] = {'application/json', '{"q":"1 union\\tselect\\tpw\\tfrom\\tusers"}', false},
    ['json \\n sql'] = {'application/json', '{"q":"drop\\ntable x"}', false},
    ['json \\u0009 sql'] = {'application/json', '{"q":"update\\u0009x\\u0009set"}', false},
}) do
    verify(name, 'PUT', c[1], c[2], nil, nil, c[3], 1)
end
-- Only a multipart POST is skipped; Phalcon parses multipart PUT/PATCH into fields.
local mp = 'multipart/form-data; boundary=b'
verify('multipart POST skipped', 'POST', mp, '--b\r\n\r\n../x\r\n--b--', nil, nil, true, 0)
verify('multipart POST mixed case', 'POST', 'Multipart/Form-Data;boundary=b', '../x', nil, nil, true, 0)
verify('multipart PUT scanned', 'PUT', mp, '--b\r\n\r\n../x\r\n--b--', nil, nil, false, 1)
verify('multipart-ish POST scanned', 'POST', 'multipart/form-datax', '../x', nil, nil, false, 1)
-- Request::getData() json_decodes anything whose Content-Type mentions application/json.
verify('multipart json param', 'POST', 'multipart/form-data; x=application/json', '{"a":"../x"}', nil, nil, false, 1)
verify('multipart tab json', 'POST', 'multipart/form-data\t;x=application/json', '{"a":"../x"}', nil, nil, false, 1)
-- 64 KiB+ bodies are scanned up to 4 MiB; above it REST gets 413, other paths pass unscanned.
local pad = string.rep(' ', 70000)
verify('padded json', 'POST', 'application/json', '{"a":"../x"' .. pad .. '}', nil, nil, false, 1)
local limit = 4 * 1024 * 1024
local rewritten = '/pbxcore/index.php'
local function verify_status(name, payload, cl, want_ok, want_status, want_reads)
    method, body, reads = 'POST', payload, 0
    ngx.var = {content_type = 'application/json', content_length = cl, uri = rewritten}
    local ok, status = check()
    cases = cases + 1
    if ok ~= want_ok or status ~= want_status or reads ~= want_reads then
        failures = failures + 1
        print('FAIL ' .. name .. ': ok=' .. tostring(ok) .. ' status=' .. tostring(status) .. ' reads=' .. reads)
    end
end
verify_status('REST CL over limit', nil, tostring(limit + 1), false, 413, 0)
verify_status('REST body over limit', string.rep('a', limit + 1), nil, false, 413, 1)
rewritten = '/admin-cabinet/index.php'
verify_status('cabinet CL over limit', nil, tostring(limit + 1), true, nil, 0)
verify_status('cabinet body over limit', '../x' .. string.rep('a', limit), nil, true, nil, 1)
verify_status('cabinet small body', '../x', nil, false, nil, 1)
rewritten = '/pbxcore/index.php'
do
    local started = os.clock()
    verify_status('4 MiB benign', '{"a":"' .. string.rep('select % \\n ', math.floor((limit - 10) / 12)) .. '"}', nil, true, nil, 1)
    local spent = os.clock() - started
    print(string.format('4 MiB worst-case scan: %.3f s', spent))
    if spent > 2 then failures = failures + 1; print('FAIL 4 MiB scan too slow') end
end
print(cases .. ' cases, ' .. failures .. ' failures')
assert(failures == 0)
