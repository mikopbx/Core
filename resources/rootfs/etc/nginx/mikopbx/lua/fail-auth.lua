ngx.log(ngx.WARN)
ngx.say('The user isn\'t authenticated.')
ngx.exit(ngx.HTTP_FORBIDDEN)