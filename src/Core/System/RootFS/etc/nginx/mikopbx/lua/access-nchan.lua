-- Определение пути к файлу для отладочной информации
local debug_file_path = "/storage/usbdisk1/mikopbx/tmp/www_cache/upload_cache/nchan.txt"

-- Функция для записи отладочной информации в файл
local function write_debug_info(data)
    local file, err = io.open(debug_file_path, "a") -- Открытие файла в режиме добавления
    if not file then
        ngx.log(ngx.ERR, "Ошибка открытия файла для отладки: ", err)
        return
    end
    file:write(data .. "\n") -- Запись данных в файл
    file:close()
end

-- Проверка наличия параметра token в запросе
local token = ngx.var.arg_token
write_debug_info("Token: " .. (token or "nil"))

if not token then
    -- Выполнение внутреннего подзапроса, если token не предоставлен
    local res = ngx.location.capture("/pbxcore/api/system/checkNchanAuth")
    write_debug_info("Sub-request status: " .. res.status)

    if res.status == 200 then
        -- Авторизация разрешена, если ответ 200
        write_debug_info("Authorization allowed")
        return
    else
        -- Перенаправление на аутентификацию, если ответ не 200
        write_debug_info("Redirecting to auth due to sub-request response")
        return ngx.exec("/pbxcore/api/nchan/auth")
    end
else
    -- Проверка существования файла токена
    local file_path = "/var/etc/auth/" .. token
    local file = io.open(file_path, "rb")
    if file then
        file:close()
        write_debug_info("Token file exists, authorization allowed")
        return
    else
        -- Перенаправление на аутентификацию, если файл токена не существует
        write_debug_info("Token file does not exist, redirecting to auth")
        return ngx.exec("/pbxcore/api/nchan/auth")
    end
end

-- Отказ в доступе, если ни одно из условий не выполнено
write_debug_info("Access denied")
ngx.exit(403)
