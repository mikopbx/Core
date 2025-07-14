-- MikoPBX Unified Security Filter
-- Combines IP filtering, session validation, rate limiting, and basic attack protection
-- Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov

local redis = require "resty.redis"

-- Get configuration from nginx variables
local redis_host = ngx.var.redis_host or "127.0.0.1"
local redis_port = tonumber(ngx.var.redis_port) or 6379
local redis_db = tonumber(ngx.var.redis_db) or 1
local is_docker = ngx.var.is_docker == "1"
local security_mode = ngx.var.security_mode or "balanced"
local rate_limit_enabled = ngx.var.rate_limit_enabled == "1"
local session_check_required = ngx.var.session_check_required == "1"

-- Get client IP address
local client_ip = ngx.var.http_x_real_ip or ngx.var.remote_addr
if not client_ip then
    return
end

-- Cache settings
local cache_ttl = 10
local blocked_ips_cache = ngx.shared.blocked_ips
local firewall_state_cache = ngx.shared.firewall_state
local access_cache = ngx.shared.access_cache
local rate_limit_cache = ngx.shared.rate_limit

-- Redis key prefixes
local REDIS_PREFIX = "_PH_REDIS_CLIENT:firewall:"
local CATEGORY_HTTP = "http"
local CATEGORY_WHITELIST = "whitelist"
local RATE_LIMIT_PREFIX = "_PH_REDIS_CLIENT:rate_limit:"

-- Rate limiting settings
local rate_limit_requests = 60  -- requests per minute for anonymous
local rate_limit_requests_auth = 300  -- requests per minute for authenticated
local rate_limit_window = 60  -- window in seconds
local rate_limit_block_time = 300  -- block time in seconds

-- ===== COMMON FUNCTIONS =====

-- Check if IP is localhost
local function is_localhost(ip)
    if ip == "127.0.0.1" or ip == "::1" or ip == "localhost" then
        return true
    end
    if string.sub(ip, 1, 4) == "127." then
        return true
    end
    return false
end

-- Allow localhost immediately
if is_localhost(client_ip) then
    return
end

-- Function to check IP in network (CIDR support)
local function ip_in_network(ip, network)
    if ip == network then
        return true
    end
    
    local pos = string.find(network, "/")
    if not pos then
        return false
    end
    
    local net_addr = string.sub(network, 1, pos - 1)
    local mask_bits = tonumber(string.sub(network, pos + 1))
    
    local function ip_to_number(addr)
        local a, b, c, d = addr:match("(%d+)%.(%d+)%.(%d+)%.(%d+)")
        if not a then return nil end
        return tonumber(a) * 16777216 + tonumber(b) * 65536 + tonumber(c) * 256 + tonumber(d)
    end
    
    local ip_num = ip_to_number(ip)
    local net_num = ip_to_number(net_addr)
    
    if not ip_num or not net_num or not mask_bits then
        return false
    end
    
    local mask = 0
    for i = 1, mask_bits do
        mask = mask + 2^(32 - i)
    end
    
    return (ip_num - ip_num % 2^(32 - mask_bits)) == (net_num - net_num % 2^(32 - mask_bits))
end

-- Function to connect to Redis
local function connect_to_redis()
    local red = redis:new()
    red:set_timeout(1000)
    
    local ok, err = red:connect(redis_host, redis_port)
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil
    end
    
    local ok, err = red:select(redis_db)
    if not ok then
        ngx.log(ngx.ERR, "Failed to select Redis database: ", err)
        return nil
    end
    
    return red
end

-- ===== BASIC ATTACK PROTECTION =====

local function check_basic_security()
    local uri = ngx.var.uri
    local args = ngx.var.args
    local user_agent = ngx.var.http_user_agent or ""
    
    -- Check for SQL injection patterns
    local sql_patterns = {
        "union%s+select",
        "select%s+.*%s+from",
        "insert%s+into",
        "delete%s+from",
        "drop%s+table",
        "update%s+.*%s+set",
        "';",
        '";',
        "' or ",
        '" or ',
        "1=1",
        "1' or '1'='1"
    }
    
    local check_string = string.lower(uri .. (args or "") .. user_agent)
    for _, pattern in ipairs(sql_patterns) do
        if string.match(check_string, pattern) then
            ngx.log(ngx.WARN, "SQL injection attempt from: ", client_ip, " pattern: ", pattern)
            return false
        end
    end
    
    -- Check for path traversal
    if string.match(uri, "%.%.") or string.match(uri, "//") then
        ngx.log(ngx.WARN, "Path traversal attempt from: ", client_ip)
        return false
    end
    
    -- Check for null bytes
    if string.match(uri, "%z") or (args and string.match(args, "%z")) then
        ngx.log(ngx.WARN, "Null byte injection attempt from: ", client_ip)
        return false
    end
    
    return true
end

-- ===== RATE LIMITING =====

local function check_rate_limit(is_authenticated)
    if not rate_limit_enabled then
        return true
    end
    
    -- Check if IP is already blocked for rate limiting
    local rate_block_key = "rate_blocked:" .. client_ip
    local is_rate_blocked = rate_limit_cache:get(rate_block_key)
    
    if is_rate_blocked == "1" then
        return false
    end
    
    -- Get current counter
    local rate_key = "rate:" .. client_ip
    local current_count = rate_limit_cache:get(rate_key)
    
    if current_count == nil then
        -- Initialize counter
        rate_limit_cache:set(rate_key, 1, rate_limit_window)
        return true
    end
    
    current_count = tonumber(current_count) + 1
    rate_limit_cache:incr(rate_key, 1)
    
    -- Determine limit based on authentication
    local limit = is_authenticated and rate_limit_requests_auth or rate_limit_requests
    
    if current_count > limit then
        -- Block IP for excessive requests
        rate_limit_cache:set(rate_block_key, "1", rate_limit_block_time)
        
        -- Also add to Redis for persistence
        local red = connect_to_redis()
        if red then
            local key = RATE_LIMIT_PREFIX .. client_ip
            red:setex(key, rate_limit_block_time, "1")
            red:set_keepalive(10000, 100)
        end
        
        ngx.log(ngx.WARN, "Rate limit exceeded for IP: ", client_ip, " count: ", current_count)
        return false
    end
    
    return true
end

-- ===== SESSION VALIDATION =====

local function check_session()
    if not session_check_required then
        return true
    end
    
    local session_id = ngx.var.cookie_PHPSESSID or "default_session_id"
    local cache_key = session_id .. ngx.var.uri
    local is_allowed = access_cache:get(cache_key)
    
    if is_allowed == nil then
        -- Check with backend
        local backend_url = "/pbxcore/api/system/checkAuth"
        local res = ngx.location.capture(backend_url, {
            method = ngx.HTTP_GET,
            args = { view = ngx.var.arg_view }
        })
        
        if res.status == ngx.HTTP_OK then
            is_allowed = true
            access_cache:set(cache_key, is_allowed, 60)
        else
            is_allowed = false
            if res.status == ngx.HTTP_FORBIDDEN then
                access_cache:set(cache_key, is_allowed, 60)
            end
        end
    end
    
    return is_allowed
end

-- ===== IP FILTERING (FROM ip-filter-redis.lua) =====

local function is_firewall_enabled()
    local enabled = firewall_state_cache:get("enabled")
    if enabled ~= nil then
        return enabled == "1"
    end
    
    local red = connect_to_redis()
    if not red then
        firewall_state_cache:set("enabled", "0", 30)
        return false
    end
    
    local keys, err = red:keys(REDIS_PREFIX .. "*")
    if err then
        ngx.log(ngx.ERR, "Failed to check firewall status: ", err)
        firewall_state_cache:set("enabled", "0", 30)
        red:set_keepalive(10000, 100)
        return false
    end
    
    enabled = (#keys > 0) and "1" or "0"
    firewall_state_cache:set("enabled", enabled, 30)
    red:set_keepalive(10000, 100)
    
    return enabled == "1"
end

local function check_whitelist()
    local whitelist_key = "whitelist:" .. client_ip
    local is_whitelisted = blocked_ips_cache:get(whitelist_key)
    
    if is_whitelisted == nil then
        local red = connect_to_redis()
        if not red then
            return false
        end
        
        local res, err = red:smembers(REDIS_PREFIX .. CATEGORY_WHITELIST)
        if err then
            ngx.log(ngx.ERR, "Failed to get whitelist: ", err)
            red:set_keepalive(10000, 100)
            return false
        end
        
        is_whitelisted = "0"
        if res then
            for _, allowed_ip in ipairs(res) do
                if allowed_ip == client_ip or ip_in_network(client_ip, allowed_ip) then
                    is_whitelisted = "1"
                    break
                end
            end
        end
        
        blocked_ips_cache:set(whitelist_key, is_whitelisted, cache_ttl)
        red:set_keepalive(10000, 100)
    end
    
    return is_whitelisted == "1"
end

local function check_blacklist()
    local block_key = "blocked:" .. client_ip
    local is_blocked = blocked_ips_cache:get(block_key)
    
    if is_blocked == nil then
        local red = connect_to_redis()
        if not red then
            return false
        end
        
        local key = REDIS_PREFIX .. CATEGORY_HTTP .. ":" .. client_ip
        local res, err = red:exists(key)
        
        if err then
            ngx.log(ngx.ERR, "Failed to check blocked IP: ", err)
            red:set_keepalive(10000, 100)
            return false
        end
        
        is_blocked = (res == 1) and "1" or "0"
        blocked_ips_cache:set(block_key, is_blocked, cache_ttl)
        red:set_keepalive(10000, 100)
    end
    
    return is_blocked == "1"
end

-- ===== MAIN SECURITY LOGIC =====

-- 1. Basic security checks
if security_mode ~= "relaxed" then
    if not check_basic_security() then
        ngx.status = ngx.HTTP_FORBIDDEN
        ngx.say("Security violation detected")
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- 2. Check if firewall is enabled
if not is_firewall_enabled() then
    -- Firewall disabled, only do rate limiting if enabled
    if rate_limit_enabled then
        if not check_rate_limit(false) then
            ngx.status = ngx.HTTP_TOO_MANY_REQUESTS
            ngx.say("Too many requests")
            return ngx.exit(ngx.HTTP_TOO_MANY_REQUESTS)
        end
    end
    return
end

-- 3. Check whitelist
if check_whitelist() then
    -- Whitelisted IPs still subject to rate limiting in strict mode
    if security_mode == "strict" and rate_limit_enabled then
        if not check_rate_limit(true) then
            ngx.status = ngx.HTTP_TOO_MANY_REQUESTS
            ngx.say("Too many requests")
            return ngx.exit(ngx.HTTP_TOO_MANY_REQUESTS)
        end
    end
    return
end

-- 4. Check blacklist
if check_blacklist() then
    ngx.log(ngx.WARN, "Access denied for blacklisted IP: ", client_ip)
    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.say("Access denied")
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end

-- 5. Check session if required
local is_authenticated = false
if session_check_required then
    is_authenticated = check_session()
    if not is_authenticated then
        ngx.log(ngx.WARN, "Access denied for unauthenticated session from: ", client_ip)
        ngx.status = ngx.HTTP_FORBIDDEN
        ngx.say("Authentication required")
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- 6. Rate limiting
if rate_limit_enabled then
    if not check_rate_limit(is_authenticated) then
        ngx.status = ngx.HTTP_TOO_MANY_REQUESTS
        ngx.say("Too many requests")
        return ngx.exit(ngx.HTTP_TOO_MANY_REQUESTS)
    end
end

-- Allow access