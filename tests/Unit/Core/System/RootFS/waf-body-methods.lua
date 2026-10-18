-- Run from any directory: luajit waf-body-methods.lua /path/to/unified-security.lua
-- Exercise the real request/body checks without nginx/Redis. Transport is tested live.
local source_file = assert(io.open(assert(arg[1], 'pass unified-security.lua path'), 'r'))
local source = source_file:read('*a')
source_file:close()
local checks = assert(source:match('(local function check_basic_security%(%)\n.-)\n%-%- ===== RATE LIMITING ====='))
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
print(cases .. ' cases, ' .. failures .. ' failures')
assert(failures == 0)
