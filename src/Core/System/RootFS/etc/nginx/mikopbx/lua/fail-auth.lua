-- MikoPBX Authentication Failure Handler
-- Simple 403 response when authentication fails
-- Actual failed authentication tracking is handled by PHP Fail2Ban integration
--
-- IPv6 COMPATIBILITY:
-- - This script does not access client IP address
-- - Works transparently with both IPv4 and IPv6 client connections
-- - Failed auth tracking and blocking handled by unified-security.lua and PHP layer
--
-- Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov

ngx.status = ngx.HTTP_FORBIDDEN
ngx.log(ngx.WARN)
ngx.say('The user isn\'t authenticated.')
return ngx.exit(ngx.HTTP_FORBIDDEN)