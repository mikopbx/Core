-- Get the session ID from the request or use a default value
local sessionId = ngx.var.cookie_PHPSESSID or "default_session_id"

-- Check if the session ID has access in the cache
local cacheTime = 60  -- Cache time in seconds, if user will log out it is the maximum time to have access
local cacheKey = sessionId .. ngx.var.uri
local cache = ngx.shared.access_cache
local isAllowed = cache:get(cacheKey)

-- No information in nginx cache
if isAllowed == nil then
    -- Send request to the backend using the user IP address
    local backendUrl = "/pbxcore/index.php"
    local requestMethod = ngx.req.get_method()
    local requestHeaders = ngx.req.get_headers()
    local requestArgs = {
        view = ngx.var.arg_view,
        _url = ngx.var.uri
    }

    local res = ngx.location.capture(backendUrl, {
        method = ngx[requestMethod],
        header = requestHeaders,
        args = requestArgs
    })

    if res.status == ngx.HTTP_UNAUTHORIZED then
        -- No need to cache for unauthorized sessions
        isAllowed = false;
    elseif res.status == ngx.HTTP_FORBIDDEN then
        -- Backend returned 403 status code, access denied
        isAllowed = false;
        -- Cache the state with a limited time
        cache:set(cacheKey, isAllowed, cacheTime)
    else
        isAllowed = true;
        -- Cache the state with a limited time
        cache:set(cacheKey, isAllowed, cacheTime)
    end
end

if (isAllowed == false) then
    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.log(ngx.WARN)
    ngx.say('The user isn\'t authenticated.')
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end