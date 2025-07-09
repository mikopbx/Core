-- MikoPBX IP Filter for Docker environments using Redis
-- Dynamic IP blocking using lua-resty-redis
-- Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov

local redis = require "resty.redis"

-- Get client IP address
-- Check X-Real-IP header first (for proxy scenarios), then fall back to remote_addr
local client_ip = ngx.var.http_x_real_ip or ngx.var.remote_addr
if not client_ip then
    return
end

-- Always allow localhost addresses
local function is_localhost(ip)
    if ip == "127.0.0.1" or ip == "::1" or ip == "localhost" then
        return true
    end
    -- Check if IP is in 127.0.0.0/8 network
    if string.sub(ip, 1, 4) == "127." then
        return true
    end
    return false
end

-- Allow localhost immediately
if is_localhost(client_ip) then
    return
end

-- Get Redis configuration from nginx variables
local redis_host = ngx.var.redis_host or "127.0.0.1"
local redis_port = tonumber(ngx.var.redis_port) or 6379
local redis_db = tonumber(ngx.var.redis_db) or 1

-- Cache settings
local cache_ttl = 10  -- Cache for 10 seconds (reduced for faster unban response)
local blocked_ips_cache = ngx.shared.blocked_ips
local firewall_state_cache = ngx.shared.firewall_state

-- Redis key prefixes
-- Note: Using Phalcon Redis adapter prefix for compatibility with PHP
local REDIS_PREFIX = "_PH_REDIS_CLIENT:firewall:"
local CATEGORY_HTTP = "http"
local CATEGORY_WHITELIST = "whitelist"

-- Function to check IP in network (CIDR support)
local function ip_in_network(ip, network)
    if ip == network then
        return true
    end
    
    -- Check for CIDR notation
    local pos = string.find(network, "/")
    if not pos then
        return false
    end
    
    -- Simple implementation for IPv4 only
    -- For production, consider using a more robust CIDR matching library
    return false
end

-- Function to connect to Redis
local function connect_to_redis()
    local red = redis:new()
    red:set_timeout(1000) -- 1 second timeout
    
    local ok, err = red:connect(redis_host, redis_port)
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil
    end
    
    -- Select database
    local ok, err = red:select(redis_db)
    if not ok then
        ngx.log(ngx.ERR, "Failed to select Redis database: ", err)
        return nil
    end
    
    return red
end

-- Function to check if firewall is enabled
local function is_firewall_enabled()
    local enabled = firewall_state_cache:get("enabled")
    if enabled ~= nil then
        return enabled == "1"
    end
    
    -- Check Redis
    local red = connect_to_redis()
    if not red then
        -- If Redis is not available, allow access
        firewall_state_cache:set("enabled", "0", 30)
        return false
    end
    
    -- Check if firewall is enabled by checking if any rules exist
    local keys, err = red:keys(REDIS_PREFIX .. "*")
    if err then
        ngx.log(ngx.ERR, "Failed to check firewall status: ", err)
        firewall_state_cache:set("enabled", "0", 30)
        red:set_keepalive(10000, 100)
        return false
    end
    
    enabled = (#keys > 0) and "1" or "0"
    firewall_state_cache:set("enabled", enabled, 30)
    
    -- Return connection to pool
    red:set_keepalive(10000, 100)
    
    return enabled == "1"
end

-- If firewall is disabled, allow all traffic
if not is_firewall_enabled() then
    return
end

-- Check if IP is whitelisted (cached)
local whitelist_key = "whitelist:" .. client_ip
local is_whitelisted = blocked_ips_cache:get(whitelist_key)

if is_whitelisted == nil then
    -- Check Redis
    local red = connect_to_redis()
    if not red then
        -- If Redis is not available, allow access
        return
    end
    
    -- Check if IP is in whitelist set
    local res, err = red:smembers(REDIS_PREFIX .. CATEGORY_WHITELIST)
    if err then
        ngx.log(ngx.ERR, "Failed to get whitelist: ", err)
        red:set_keepalive(10000, 100)
        return
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
    
    -- Cache whitelist result
    blocked_ips_cache:set(whitelist_key, is_whitelisted, cache_ttl)
    
    -- Return connection to pool
    red:set_keepalive(10000, 100)
end

-- If IP is whitelisted, allow access
if is_whitelisted == "1" then
    return
end

-- Check if IP is blocked (cached)
local block_key = "blocked:" .. client_ip
local is_blocked = blocked_ips_cache:get(block_key)

if is_blocked == nil then
    -- Check Redis
    local red = connect_to_redis()
    if not red then
        -- If Redis is not available, allow access
        return
    end
    
    -- Check if IP is blocked in HTTP category
    local key = REDIS_PREFIX .. CATEGORY_HTTP .. ":" .. client_ip
    local res, err = red:exists(key)
    
    if err then
        ngx.log(ngx.ERR, "Failed to check blocked IP: ", err)
        red:set_keepalive(10000, 100)
        return
    end
    
    is_blocked = (res == 1) and "1" or "0"
    
    -- Cache blocked result
    blocked_ips_cache:set(block_key, is_blocked, cache_ttl)
    
    -- Return connection to pool
    red:set_keepalive(10000, 100)
end

-- Block access if IP is blacklisted
if is_blocked == "1" then
    ngx.log(ngx.WARN, "Access denied for IP: ", client_ip)
    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.say("Access denied")
    ngx.exit(ngx.HTTP_FORBIDDEN)
end

-- Allow access for all other IPs