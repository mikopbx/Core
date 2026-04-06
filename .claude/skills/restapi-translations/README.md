# REST API Translation Management

Автоматическое управление переводами REST API ключей для MikoPBX.

## Проблема

REST API использует около 1500+ ключей переводов (rest_*) для документации OpenAPI. Эти ключи:
- Разбросаны по 259 endpoints в `/src/PBXCoreREST`
- Должны быть определены в `/src/Common/Messages/ru/RestApi.php`
- Сложно отслеживать вручную (пропущенные/устаревшие ключи)

## Решение

Три Python скрипта для автоматизации:

1. **extract_keys.py** - Извлекает все rest_* ключи из исходного кода
2. **validate_translations.py** - Находит отсутствующие/неиспользуемые ключи
3. **sync_translations.py** - Добавляет/удаляет ключи в RestApi.php

## Быстрый старт

### Проверить текущее состояние

```bash
cd .claude/skills/restapi-translations/scripts
python3 extract_keys.py
python3 validate_translations.py
```

### Добавить отсутствующие ключи

```bash
python3 sync_translations.py --add-missing
```

### Удалить неиспользуемые ключи

```bash
python3 sync_translations.py --remove-unused
```

### Полная синхронизация

```bash
python3 sync_translations.py --add-missing --remove-unused
```

### Предварительный просмотр (без изменений)

```bash
python3 sync_translations.py --add-missing --dry-run
```

## Интерактивный режим

```bash
./manage_translations.sh
```

Меню:
1. Извлечь ключи из исходного кода
2. Валидировать переводы
3. Добавить отсутствующие ключи
4. Удалить неиспользуемые ключи
5. Полная синхронизация
6. Предварительный просмотр
7. Выполнить все (extract + validate + sync)

## Использование с Claude Code

Просто спросите Claude:

- "Check REST API translations" - проверка
- "Sync RestApi.php translations" - полная синхронизация
- "Find missing rest_* keys" - найти отсутствующие
- "Add missing translation keys" - добавить отсутствующие
- "проверь переводы REST API" - проверка на русском

Claude автоматически выберет нужный скрипт и выполнит задачу.

## Типы ключей

### 1. Описания API ресурсов
```php
'rest_Extensions_ApiDescription' => 'Описание ресурса Extensions'
```

### 2. Названия операций
```php
'rest_ext_GetList' => 'Получить список внутренних номеров'
```

### 3. Подробные описания операций
```php
'rest_ext_GetListDesc' => 'Подробное описание операции получения списка...'
```

### 4. HTTP ответы
```php
'rest_response_200_get' => 'Запись успешно получена'
'rest_response_404_not_found' => 'Запись не найдена'
```

### 5. Параметры
```php
'rest_param_name' => 'Название'
'rest_param_extension' => 'Внутренний номер'
```

## Структура файлов

```
.claude/skills/restapi-translations/
├── SKILL.md                      # Документация навыка
├── README.md                     # Это файл
├── skill.json                    # Конфигурация навыка
└── scripts/
    ├── extract_keys.py           # Извлечение ключей
    ├── validate_translations.py  # Валидация
    ├── sync_translations.py      # Синхронизация
    ├── manage_translations.sh    # Интерактивная оболочка
    └── extracted_keys.json       # Результат извлечения (генерируется)
```

## Workflow

### 1. После добавления нового endpoint

```bash
# Извлечь новые ключи
python3 extract_keys.py

# Проверить что отсутствует
python3 validate_translations.py

# Добавить отсутствующие
python3 sync_translations.py --add-missing

# Перевести placeholder на русский
vim ../../../src/Common/Messages/ru/RestApi.php
```

### 2. Периодическая проверка

```bash
# Раз в месяц проверяйте неиспользуемые ключи
python3 validate_translations.py

# Удалите устаревшие (с осторожностью!)
python3 sync_translations.py --remove-unused
```

### 3. Перед релизом

```bash
# Полная синхронизация
./manage_translations.sh
# Выберите опцию 7 (Run all)
```

## Безопасность

- ✅ Создается резервная копия перед изменениями
- ✅ Валидация PHP синтаксиса после изменений
- ✅ Режим dry-run для предварительного просмотра
- ✅ Требуется подтверждение перед удалением ключей

## Ограничения

- Управляет только русскими переводами (RestApi.php)
- Не переводит автоматически (только placeholder)
- Не обнаруживает семантические ошибки
- Требует ручной проверки placeholder текста

## Пример вывода

### Extraction
```
Files scanned:    479
Keys found:       2876
Unique keys:      1589

Top 10 most referenced keys:
  rest_response_401_unauthorized: 292 occurrences
  rest_response_403_forbidden: 260 occurrences
  ...
```

### Validation
```
✅ Valid keys:    1370/1589 (86%)
❌ Missing keys:  219 (in code, not in RestApi.php)
⚠️  Unused keys:   358 (in RestApi.php, not used in code)

Missing Keys:
  rest_ext_id (Controllers/Extensions/RestController.php:126)
  ...
```

### Sync
```
➕ Adding 219 missing keys...
✅ RestApi.php has been updated successfully!

Next steps:
  1. Review changes: git diff src/Common/Messages/ru/RestApi.php
  2. Translate placeholder text from Russian
  3. Run validate_translations.py to verify
```

## Интеграция с другими навыками

- **`openapi-analyzer`** - Использует OpenAPI спецификацию для валидации
- **`endpoint-validator`** - Проверяет полноту переводов
- **`translations`** - Может переводить ключи на другие языки

## Поддержка

Если обнаружили проблему:
1. Проверьте резервную копию: `RestApi.php.bak.*`
2. Откатите изменения: `git checkout src/Common/Messages/ru/RestApi.php`
3. Сообщите об ошибке с выводом скрипта

## Лицензия

MIT - часть проекта MikoPBX
