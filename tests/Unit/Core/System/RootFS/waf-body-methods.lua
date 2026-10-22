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
local rate_limit_enabled, rate_limit_window = false, 60
]] .. checks .. "\nreturn function()\n    local ok, status = check_basic_security()\n    if not ok then return ok, status end\n    return check_body_scan(true)\nend"))()
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
-- #1240: the whole script with Redis down (fail-open): blacklist and rate limit come before read_body,
-- and scanned bytes per IP are budgeted.
local now = 0
local function dict()
    local d, expires = {}, {}
    local function live(k)
        if expires[k] and expires[k] <= now then d[k], expires[k] = nil, nil end
        return d[k]
    end
    return {
        get = function(_, k) return live(k) end,
        set = function(_, k, v, ttl) d[k], expires[k] = v, ttl and ttl > 0 and now + ttl or nil; return true end,
        incr = function(_, k, n, init, init_ttl)
            if live(k) == nil then
                if init == nil then return nil, "not found" end
                d[k], expires[k] = init, init_ttl and init_ttl > 0 and now + init_ttl or nil
            end
            d[k] = d[k] + n; return d[k]
        end,
        reset = function() d, expires = {}, {} end,
    }
end
package.preload['resty.redis'] = function()
    return {new = function()
        return {set_timeout = function() end, connect = function() return nil, 'stub' end}
    end}
end
local shared = {blocked_ips = dict(), firewall_state = dict(), access_cache = dict(), rate_limit = dict(),
    waf_exemptions = dict()}
local script = assert(compile(source))
local exit_status
local function run(name, opts, want_status, want_reads)
    now = 0
    for _, d in pairs(shared) do d.reset() end
    shared.firewall_state:set('enabled', opts.firewall and '1' or '0')
    for k, v in pairs(opts.state or {}) do shared[v[1]]:set(k, v[2]) end
    method, body, reads, exit_status = opts.method or 'POST', opts.body, 0, nil
    ngx = {
        var = {remote_addr = opts.ip or '203.0.113.7', request_uri = '/pbxcore/api/v3/extensions',
            uri = '/pbxcore/index.php', content_type = 'application/json', content_length = opts.cl,
            security_mode = opts.mode or 'balanced', rate_limit_enabled = opts.rate == false and '0' or '1'},
        req = {get_method = function() return method end, read_body = function() reads = reads + 1 end,
            get_body_data = function() return body end, get_body_file = function() return nil end},
        header = {},
        shared = shared, WARN = 1, NOTICE = 2, INFO = 3, HTTP_FORBIDDEN = 403, HTTP_TOO_MANY_REQUESTS = 429,
        log = function() end, say = function() end, null = {},
        unescape_uri = function(s) return (s:gsub('%%(%x%x)', function(h) return string.char(tonumber(h, 16)) end)) end,
        exit = function(s) exit_status = s end,
    }
    for i = 1, opts.repeats or 1 do
        if i == opts.repeats and opts.advance then now = now + opts.advance end
        script()
    end
    cases = cases + 1
    if exit_status ~= want_status or reads ~= want_reads then
        failures = failures + 1
        print('FAIL ' .. name .. ': status=' .. tostring(exit_status) .. ' reads=' .. reads)
    end
end
local evil, clean = '{"a":"../x"}', '{"a":"ok"}'
run('clean passes', {body = clean}, nil, 1)
run('evil body 403', {body = evil}, 403, 1)
run('blacklisted: no read', {firewall = true, body = clean, state = {['blocked:203.0.113.7'] = {'blocked_ips', '1'},
    ['whitelist:203.0.113.7'] = {'blocked_ips', '0'}}}, 403, 0)
run('rate blocked: no read', {body = clean, state = {['rate_blocked:203.0.113.7'] = {'rate_limit', '1'}}}, 429, 0)
run('whitelisted still scanned', {firewall = true, body = evil, state = {['whitelist:203.0.113.7'] = {'blocked_ips', '1'}}}, 403, 1)
run('relaxed: no read', {mode = 'relaxed', body = evil}, nil, 0)
run('over limit: 413 JSON', {cl = tostring(limit + 1)}, 413, 0)
if ngx.header.content_type ~= 'application/json' then failures = failures + 1; print('FAIL 413 content type') end
local mib4, big = tostring(limit), string.rep('a', limit)
run('budget: 8 x 4 MiB pass', {body = big, cl = mib4, repeats = 8}, nil, 8)
run('budget: 9th refused before read', {body = big, cl = mib4, repeats = 9}, 429, 8)
run('budget: no CL charged after read', {body = string.rep('a', limit), repeats = 9}, 429, 8)
run('budget: whitelist not charged', {firewall = true, body = big, cl = mib4, repeats = 9,
    state = {['whitelist:203.0.113.7'] = {'blocked_ips', '1'}}}, nil, 9)
run('budget: off with rate limit', {rate = false, body = big, cl = mib4, repeats = 9}, nil, 9)
run('budget: CL without a body costs nothing', {cl = mib4, repeats = 9}, nil, 9)
run('budget: next window passes', {body = big, cl = mib4, repeats = 9, advance = 61}, nil, 9)
run('strict whitelist rate blocked', {firewall = true, mode = 'strict', body = clean, state = {
    ['whitelist:203.0.113.7'] = {'blocked_ips', '1'}, ['rate_blocked:203.0.113.7'] = {'rate_limit', '1'}}}, 429, 0)
run('balanced whitelist not rate limited', {firewall = true, body = clean, state = {
    ['whitelist:203.0.113.7'] = {'blocked_ips', '1'}, ['rate_blocked:203.0.113.7'] = {'rate_limit', '1'}}}, nil, 1)
print(cases .. ' cases, ' .. failures .. ' failures')
assert(failures == 0)
