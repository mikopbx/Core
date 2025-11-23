-- MikoPBX Unified Security Filter
-- Combines JWT validation (via PHP), IP filtering, rate limiting, and basic attack protection
-- JWT validation is delegated to PHP endpoint /pbxcore/api/nchan/validate-token for consistency
--
-- ARCHITECTURE NOTES:
-- - This script runs at SERVER level when firewall is enabled (PBX_FIREWALL_ENABLED=1)
-- - Related: access-nchan.lua handles WebSocket-specific JWT validation
-- - Both scripts use validate_jwt_via_php() with same PHP endpoint
-- - Keep validation logic synchronized between both files
--
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
local rate_limit_requests = 180  -- requests per minute for anonymous
local rate_limit_requests_auth = 600  -- requests per minute for authenticated
local rate_limit_requests_api = 180  -- requests per minute for API endpoints
local rate_limit_window = 60  -- window in seconds
local rate_limit_burst = 20  -- burst allowance
local rate_limit_block_time = 300  -- block time in seconds (5 minutes)
local rate_limit_progressive_multiplier = 2  -- multiply block time for repeat offenders

-- ===== JWT VALIDATION FUNCTIONS =====

-- Extract token from Authorization header
local function extract_bearer_token(auth_header)
    if not auth_header then
        return nil
    end
    local token = string.match(auth_header, "^Bearer%s+(.+)$")
    return token
end

-- Validate JWT token via PHP endpoint
local function validate_jwt_via_php(token)
    if not token or token == "" then
        return false
    end

    -- Check cache first
    local jwt_cache_key = "jwt:valid:" .. token
    local cached_result = access_cache:get(jwt_cache_key)

    if cached_result == "1" then
        return true
    elseif cached_result == "0" then
        return false
    end

    -- Validate via PHP endpoint
    local res = ngx.location.capture("/pbxcore/api/v3/auth:validate-token?token=" .. ngx.escape_uri(token))

    local is_valid = (res.status == 200)

    -- Cache the result (valid tokens for 60s, invalid for 10s)
    if is_valid then
        access_cache:set(jwt_cache_key, "1", 60)
    else
        access_cache:set(jwt_cache_key, "0", 10)
    end

    return is_valid
end

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

-- ===== IPv6 SUPPORT AND PERFORMANCE OPTIMIZATION =====
--
-- CIDR CACHING MECHANISM:
--   Cache structure: cidr_cache[cidr_string] = {network_bytes={...}, prefix_len=N, is_ipv6=boolean}
--   Purpose: Avoid re-parsing CIDR notation on every HTTP request
--   Performance impact:
--     - Cache miss (first request): ~20-30 Lua operations (IPv6 parsing overhead)
--     - Cache hit (subsequent): ~5 table lookups (negligible overhead, <1ms)
--     - IPv4 path: unchanged performance (existing optimized code)
--
-- IPv6 BINARY REPRESENTATION:
--   - Lua 5.1 lacks native 128-bit integers
--   - Solution: Represent IPv6 as table of 16 bytes {b1, b2, ..., b16}
--   - Example: 2001:db8::1 = {0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1}
--
-- SUPPORTED IPv6 FORMATS:
--   - Compressed notation: ::1, 2001:db8::1, fe80::
--   - Full notation: 2001:0db8:0000:0000:0000:0000:0000:0001
--   - IPv4-mapped: ::ffff:192.0.2.1
--   - Link-local with scope: fe80::1%eth0 (scope ID ignored for CIDR matching)
--
-- CIDR MATCHING ALGORITHM:
--   - Byte-by-byte comparison up to prefix length
--   - prefix_len=64: Compare first 8 bytes (64 bits)
--   - Remaining bits: Apply bit mask to partial byte
--   - Example: /65 compares first 8 full bytes + 1 bit of byte 9
--
-- PERFORMANCE EXPECTATIONS (per request):
--   - IPv4 exact match: ~5 operations (hash lookup + string compare)
--   - IPv4 CIDR match: ~15 operations (parse + 32-bit math)
--   - IPv6 exact match: ~5 operations (hash lookup + string compare)
--   - IPv6 CIDR match (cached): ~20 operations (hash lookup + byte compare)
--   - IPv6 CIDR match (uncached): ~50 operations (parse + cache + byte compare)
--
-- CACHE INVALIDATION:
--   - Cache lives for lifetime of nginx worker process
--   - Reload nginx to clear cache: `nginx -s reload`
--   - No TTL - CIDR networks change rarely
--
local cidr_cache = {}

-- Detect if IP is IPv6 (contains colon)
local function is_ipv6(ip)
    return string.find(ip, ":") ~= nil
end

-- Convert IPv6 address string to 16-byte table representation
-- Handles compressed notation (::), full notation, and IPv4-mapped IPv6
-- Returns: table of 16 bytes {b1, b2, ..., b16} or nil on error
local function ipv6_to_bytes(ipv6_str)
    -- Handle IPv4-mapped IPv6: ::ffff:192.0.2.1
    local ipv4_mapped = string.match(ipv6_str, "::ffff:(%d+%.%d+%.%d+%.%d+)")
    if ipv4_mapped then
        local a, b, c, d = ipv4_mapped:match("(%d+)%.(%d+)%.(%d+)%.(%d+)")
        if not a then return nil end
        -- First 10 bytes are zeros, bytes 11-12 are 0xFF, last 4 are IPv4
        local bytes = {}
        for i = 1, 10 do bytes[i] = 0 end
        bytes[11], bytes[12] = 0xFF, 0xFF
        bytes[13] = tonumber(a)
        bytes[14] = tonumber(b)
        bytes[15] = tonumber(c)
        bytes[16] = tonumber(d)
        return bytes
    end

    -- Parse standard IPv6 notation
    local parts = {}
    local double_colon_pos = string.find(ipv6_str, "::")

    if double_colon_pos then
        -- Handle :: compression
        local left = string.sub(ipv6_str, 1, double_colon_pos - 1)
        local right = string.sub(ipv6_str, double_colon_pos + 2)

        -- Parse left side
        if left ~= "" then
            for part in string.gmatch(left, "([^:]+)") do
                table.insert(parts, tonumber(part, 16) or 0)
            end
        end

        -- Calculate number of zero groups
        local right_parts = {}
        if right ~= "" then
            for part in string.gmatch(right, "([^:]+)") do
                table.insert(right_parts, tonumber(part, 16) or 0)
            end
        end

        local zeros_needed = 8 - #parts - #right_parts
        for i = 1, zeros_needed do
            table.insert(parts, 0)
        end

        -- Add right side
        for _, part in ipairs(right_parts) do
            table.insert(parts, part)
        end
    else
        -- No compression, parse all 8 groups
        for part in string.gmatch(ipv6_str, "([^:]+)") do
            table.insert(parts, tonumber(part, 16) or 0)
        end
    end

    -- Convert 8 x 16-bit words to 16 x 8-bit bytes
    if #parts ~= 8 then
        return nil
    end

    local bytes = {}
    for i = 1, 8 do
        local word = parts[i]
        bytes[(i-1)*2 + 1] = math.floor(word / 256)  -- High byte
        bytes[(i-1)*2 + 2] = word % 256               -- Low byte
    end

    return bytes
end

-- Check if IPv6 address is in CIDR network
-- ip: IPv6 address string (e.g., "2001:db8::1")
-- network: IPv6 CIDR string (e.g., "2001:db8::/64")
-- Returns: true if IP is in network, false otherwise
local function ipv6_in_network(ip, network)
    -- Parse CIDR notation
    local pos = string.find(network, "/")
    if not pos then
        return false
    end

    local net_addr = string.sub(network, 1, pos - 1)
    local prefix_len = tonumber(string.sub(network, pos + 1))

    if not prefix_len or prefix_len < 0 or prefix_len > 128 then
        return false
    end

    -- Convert both addresses to byte arrays
    local ip_bytes = ipv6_to_bytes(ip)
    local net_bytes = ipv6_to_bytes(net_addr)

    if not ip_bytes or not net_bytes then
        return false
    end

    -- Compare bytes up to prefix length
    -- prefix_len=64 means first 64 bits (8 bytes) must match
    local full_bytes = math.floor(prefix_len / 8)  -- Full bytes to compare
    local remaining_bits = prefix_len % 8           -- Remaining bits in partial byte

    -- Compare full bytes
    for i = 1, full_bytes do
        if ip_bytes[i] ~= net_bytes[i] then
            return false
        end
    end

    -- Compare remaining bits in partial byte
    if remaining_bits > 0 then
        local byte_idx = full_bytes + 1
        local mask = 0xFF - (2^(8 - remaining_bits) - 1)  -- Create bit mask
        if (ip_bytes[byte_idx] - ip_bytes[byte_idx] % (2^(8 - remaining_bits))) ~=
           (net_bytes[byte_idx] - net_bytes[byte_idx] % (2^(8 - remaining_bits))) then
            return false
        end
    end

    return true
end

-- Function to check IP in network (CIDR support)
-- Supports both IPv4 and IPv6 CIDR notation with caching
local function ip_in_network(ip, network)
    -- Exact match (no CIDR)
    if ip == network then
        return true
    end

    -- Check if CIDR notation
    local pos = string.find(network, "/")
    if not pos then
        return false
    end

    -- Determine IP version and route to appropriate handler
    local ip_is_v6 = is_ipv6(ip)
    local net_is_v6 = is_ipv6(network)

    -- Version mismatch - cannot match
    if ip_is_v6 ~= net_is_v6 then
        return false
    end

    -- Route to IPv6 handler
    if ip_is_v6 then
        -- Check cache first
        local cache_entry = cidr_cache[network]
        if cache_entry and cache_entry.is_ipv6 then
            -- Cache hit - use cached parsed network
            local ip_bytes = ipv6_to_bytes(ip)
            if not ip_bytes then return false end

            local prefix_len = cache_entry.prefix_len
            local net_bytes = cache_entry.network_bytes

            -- Fast comparison using cached network bytes
            local full_bytes = math.floor(prefix_len / 8)
            local remaining_bits = prefix_len % 8

            for i = 1, full_bytes do
                if ip_bytes[i] ~= net_bytes[i] then
                    return false
                end
            end

            if remaining_bits > 0 then
                local byte_idx = full_bytes + 1
                if (ip_bytes[byte_idx] - ip_bytes[byte_idx] % (2^(8 - remaining_bits))) ~=
                   (net_bytes[byte_idx] - net_bytes[byte_idx] % (2^(8 - remaining_bits))) then
                    return false
                end
            end

            return true
        else
            -- Cache miss - parse and cache
            local result = ipv6_in_network(ip, network)

            -- Cache the parsed network for future requests
            local net_addr = string.sub(network, 1, pos - 1)
            local prefix_len = tonumber(string.sub(network, pos + 1))
            local net_bytes = ipv6_to_bytes(net_addr)

            if net_bytes and prefix_len then
                cidr_cache[network] = {
                    network_bytes = net_bytes,
                    prefix_len = prefix_len,
                    is_ipv6 = true
                }
            end

            return result
        end
    end

    -- IPv4 handling (existing logic - unchanged for performance)
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

-- Check if request is for static resource
local function is_static_resource()
    local uri = ngx.var.uri
    local static_extensions = {
        "%.css$", "%.js$", "%.jpg$", "%.jpeg$", "%.png$", "%.gif$", "%.ico$",
        "%.svg$", "%.woff$", "%.woff2$", "%.ttf$", "%.eot$", "%.map$"
    }

    for _, pattern in ipairs(static_extensions) do
        if string.match(uri, pattern) then
            return true
        end
    end

    return false
end

local function check_rate_limit(is_authenticated)
    if not rate_limit_enabled then
        return true
    end

    -- Skip rate limiting for static resources
    if is_static_resource() then
        return true
    end

    -- Check if IP is already blocked for rate limiting
    local rate_block_key = "rate_blocked:" .. client_ip
    local block_info = rate_limit_cache:get(rate_block_key)

    if block_info then
        return false
    end

    -- Progressive blocking check
    local offense_key = "rate_offenses:" .. client_ip
    local offense_count = tonumber(rate_limit_cache:get(offense_key) or "0")

    -- Get current counter using atomic increment
    local rate_key = "rate:" .. client_ip
    local current_count, err = rate_limit_cache:incr(rate_key, 1)

    if not current_count then
        -- Key doesn't exist, initialize it
        rate_limit_cache:set(rate_key, 1, rate_limit_window)
        current_count = 1
    end

    -- Determine limit based on request type
    local limit = rate_limit_requests
    if is_authenticated then
        limit = rate_limit_requests_auth
    elseif string.match(ngx.var.uri, "^/pbxcore/api/") then
        limit = rate_limit_requests_api
    end

    -- Add burst allowance
    local effective_limit = limit + rate_limit_burst

    if current_count > effective_limit then
        -- Calculate progressive block time
        local block_time = rate_limit_block_time * (rate_limit_progressive_multiplier ^ offense_count)
        if block_time > 3600 then -- Cap at 1 hour
            block_time = 3600
        end

        -- Block IP for excessive requests
        rate_limit_cache:set(rate_block_key, "1", block_time)

        -- Increment offense counter
        offense_count = offense_count + 1
        rate_limit_cache:set(offense_key, offense_count, 86400) -- Remember for 24 hours

        -- Also add to Redis for persistence
        local red = connect_to_redis()
        if red then
            local key = RATE_LIMIT_PREFIX .. client_ip
            red:setex(key, block_time, tostring(offense_count))
            red:set_keepalive(10000, 100)
        end

        ngx.log(ngx.WARN, "Rate limit exceeded for IP: ", client_ip,
                " count: ", current_count, "/", effective_limit,
                " offenses: ", offense_count, " block_time: ", block_time)
        return false
    end

    -- Log warning when approaching limit
    if current_count > (limit * 0.8) then
        ngx.log(ngx.NOTICE, "IP approaching rate limit: ", client_ip,
                " count: ", current_count, "/", limit)
    end

    return true
end

-- ===== AUTHENTICATION VALIDATION =====

local function check_auth()
    if not session_check_required then
        return true
    end

    -- Check JWT Bearer token (via PHP endpoint)
    local auth_header = ngx.var.http_authorization
    if auth_header then
        local token = extract_bearer_token(auth_header)
        if token then
            -- Validate JWT via PHP endpoint
            if validate_jwt_via_php(token) then
                -- JWT is valid - authenticated user
                return true
            else
                ngx.log(ngx.INFO, "JWT validation failed via PHP endpoint")
            end
        end
    end

    -- No valid authentication found
    return false
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

-- 5. Check authentication (JWT or session) if required
local is_authenticated = false
if session_check_required then
    is_authenticated = check_auth()
    if not is_authenticated then
        ngx.log(ngx.WARN, "Access denied for unauthenticated request from: ", client_ip)
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
