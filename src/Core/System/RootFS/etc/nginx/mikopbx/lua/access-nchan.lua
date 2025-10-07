-- MikoPBX Nchan Access Control
-- Validates JWT tokens for WebSocket connections (nchan pub/sub)
-- JWT validation is delegated to PHP ValidateTokenController via ngx.location.capture
-- Legacy file-based tokens (/var/etc/auth/{token}) are supported for module compatibility
--
-- ARCHITECTURE NOTES:
-- - This script runs at LOCATION level (/pbxcore/api/nchan/sub/*) and is ALWAYS active
-- - Independent of firewall settings (PBX_FIREWALL_ENABLED)
-- - Related: unified-security.lua handles general security for HTTP API
-- - Both scripts use validate_jwt_via_php() - keep logic synchronized
-- - Token source: query string (?token=xxx) because WebSocket can't send custom headers
--
-- Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov

-- ===== NCHAN ACCESS CONTROL =====

-- Check if the token parameter is present in the request
local token = ngx.var.arg_token

if not token then
    -- No token in query string - deny access
    -- Session-based authentication was removed in favor of JWT-only approach
    ngx.log(ngx.WARN, "[access-nchan] No token provided, denying access")
    return ngx.exec("/pbxcore/api/nchan/auth")
end

-- Token present - validate via PHP endpoint (internal location with camelCase method name)
local res = ngx.location.capture("/pbxcore/api/v3/auth:validateToken?token=" .. ngx.escape_uri(token))

-- Log the response for debugging
ngx.log(ngx.ERR, "[access-nchan] PHP response status: ", res.status, " body: ", res.body or "empty")

if res.status == 200 then
    -- JWT token is valid - allow access
    ngx.log(ngx.NOTICE, "[access-nchan] Token validated successfully")
    return
end

-- Fallback: check for legacy token file (for backwards compatibility with modules)
-- Some modules still use file-based token authentication via /var/etc/auth/{token}
-- This mechanism is kept for compatibility until all modules migrate to JWT
local file_path = "/var/etc/auth/" .. token
local file = io.open(file_path, "rb")
if file then
    ngx.log(ngx.NOTICE, "[access-nchan] Legacy file-based token used - module compatibility mode")
    file:close()
    return
end

-- Token is neither valid JWT nor valid file - deny access
ngx.log(ngx.WARN, "[access-nchan] Authentication failed, denying access")
return ngx.exec("/pbxcore/api/nchan/auth")
