# Dangerous Network Tests - Руководство

## Проблема

Некоторые тесты изменяют сетевые настройки внутри Docker контейнера (firewall, static routes, DNS), что может нарушить сетевую связность между хостом и контейнером.

## Симптомы

- Потеря доступа к веб-интерфейсу MikoPBX (http://192.168.x.x:8081)
- Необходимость перезапуска сетевого адаптера на хосте
- Тесты зависают или теряют соединение с API

## Опасные тесты

Все тесты помечены маркером `@pytest.mark.dangerous_network`:

### test_35_firewall.py
- **test_11_enable_firewall** - включает firewall (блокирует входящие соединения)
- **test_12_disable_firewall** - выключает firewall (восстанавливает связь)

### test_33_network.py
- **test_04_save_global_settings_in_internet_interface** - меняет hostname, domain, gateway, DNS
- **TestStaticRoutes** (весь класс) - создаёт/изменяет/удаляет статические маршруты
- **TestStaticRoutesValidation** (весь класс) - тесты валидации маршрутов
- **TestStaticRoutesEdgeCases** (весь класс) - граничные случаи (default route 0.0.0.0/0)

## Как запускать тесты

### Вариант 1: Пропустить опасные тесты (безопасно)

```bash
# Запустить все тесты КРОМЕ dangerous_network
pytest -v -m "not dangerous_network"
```

### Вариант 2: Запустить только опасные тесты (осторожно!)

```bash
# Запустить только тесты с маркером dangerous_network
pytest -v -m "dangerous_network"
```

**ВНИМАНИЕ**: После этого может потребоваться:
1. Перезапуск контейнера: `docker restart mikopbx_php83`
2. Или отключение firewall вручную через API

### Вариант 3: Запустить все тесты (рискованно)

```bash
# Запустить все тесты включая опасные
pytest -v
```

## Восстановление после проблем

Если потеряли доступ к контейнеру:

```bash
# 1. Перезапустить контейнер (сбрасывает firewall и сеть)
docker restart mikopbx_php83

# 2. Проверить доступность
curl -I http://192.168.117.2:8081

# 3. Если не помогло - отключить firewall через docker exec
docker exec mikopbx_php83 /usr/sbin/iptables -F
docker exec mikopbx_php83 /usr/sbin/iptables -X
```

## Автоматизация безопасного запуска

Создайте alias для безопасного запуска тестов:

```bash
# В ~/.bashrc или ~/.zshrc
alias pytest-safe='pytest -v -m "not dangerous_network"'
alias pytest-dangerous='pytest -v -m "dangerous_network"'
```

Использование:

```bash
cd tests/api
pytest-safe              # Безопасные тесты
pytest-dangerous         # Только опасные (с подтверждением)
```

## Конфигурация в pytest.ini

Маркер определён в `pytest.ini`:

```ini
markers =
    dangerous_network: Tests that modify network settings and may break host connectivity (firewall, routes, DNS)
```

## Почему контейнер может влиять на хост?

Хотя контейнер запущен БЕЗ привилегий (`Privileged: false`):

1. **Port forwarding** - порты контейнера проброшены на хост (5060, 8081)
2. **Firewall внутри контейнера** блокирует доступ к этим портам
3. **Static routes** могут конфликтовать с роутингом Docker bridge
4. **DNS changes** могут влиять на разрешение имён внутри сети

## Рекомендации

1. **По умолчанию** используйте `-m "not dangerous_network"`
2. **Тестируйте опасные тесты** только при необходимости и по одному
3. **После опасных тестов** всегда проверяйте доступность контейнера
4. **В CI/CD** пропускайте dangerous_network тесты на критичных окружениях

## См. также

- [pytest.ini](pytest.ini) - конфигурация маркеров
- [test_33_network.py](test_33_network.py) - тесты сетевых настроек
- [test_35_firewall.py](test_35_firewall.py) - тесты firewall
