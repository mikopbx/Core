-- see if the file exists
function file_exists(file)
    local f = io.open(file, "rb")
    if f then f:close() end
    return f ~= nil
end

-- get all lines from a file, returns an empty
-- list/table if the file does not exist
function lines_from(file)
    local lines = ''
    if not file_exists(file) then
        return lines
    end

    for line in io.lines(file) do
        lines = lines .. line
    end
    return lines
end

local cookie = ngx.req.get_headers()["Cookie"];

if(cookie == nil) then
    ngx.log(ngx.ERR, 'The user isn\'t authenticated.');
    ngx.say('The user isn\'t authenticated. Cookie is not set.');
    return;
end

cookie     = cookie:gsub('PHPSESSID=','');  --
local lines  = lines_from('/var/lib/php/session/sess_'..cookie);
if(lines == '') then
    ngx.log(ngx.ERR, 'The user isn\'t authenticated.');
    ngx.say('The user isn\'t authenticated. Session not found.');
    return;
end

-- Проверка авторизации
local auth_string = 'auth|a:';

if lines:find(auth_string) == nil then
    ngx.log(ngx.ERR, 'The user isn\'t authenticated.');
    ngx.say('The user isn\'t authenticated.');
    return;
end