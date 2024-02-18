-- Check if the token parameter is present in the request
local token = ngx.var.arg_token

if not token then

    -- Extract the part of the URI that contains the queue name
    local queue_name = ngx.var[1]

    -- Perform a GET request to /pbxcore/api/nchan/<queueName>
    local res = ngx.location.capture("/pbxcore/api/nchan/" .. ngx.escape_uri(queue_name))

    if res.status == 200 then
        -- Authorization is granted if the response is 200
        return
    else
        -- Redirect to authentication if the response is not 200
        return ngx.exec("/pbxcore/api/nchan/auth")
    end
else
    -- Check for the existence of the token file
    local file_path = "/var/etc/auth/" .. token
    local file = io.open(file_path, "rb")
    if file then
        file:close()
        return
    else
        -- Redirect to authentication if the token file does not exist
        return ngx.exec("/pbxcore/api/nchan/auth")
    end
end

-- Deny access if none of the conditions are met
ngx.exit(403)
