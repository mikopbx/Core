ngx.status = ngx.HTTP_FORBIDDEN
ngx.log(ngx.WARN)
ngx.say('The user isn\'t authenticated.')
return ngx.exit(ngx.HTTP_FORBIDDEN)