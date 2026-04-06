# Quick Start Guide - REST API Translation Management

## Одна команда - все задачи

### Интерактивный режим (рекомендуется)
```bash
cd .claude/skills/restapi-translations/scripts
./manage_translations.sh
```

Выберите опцию из меню (0-7).

---

## Типичные сценарии

### 🔍 Проверить состояние переводов

```bash
# Вариант 1: Через скрипт
python3 validate_translations.py

# Вариант 2: Через оболочку
./manage_translations.sh
# Выбрать: 2. Validate translations
```

**Результат:** Показывает отсутствующие и неиспользуемые ключи

---

### ➕ Добавить отсутствующие ключи

```bash
# Вариант 1: Напрямую
python3 extract_keys.py
python3 sync_translations.py --add-missing

# Вариант 2: Через оболочку
./manage_translations.sh
# Выбрать: 3. Add missing keys
```

**Результат:** RestApi.php обновлен с новыми ключами (требуют перевода)

---

### 🧹 Удалить неиспользуемые ключи

```bash
# Предварительный просмотр
python3 sync_translations.py --remove-unused --dry-run

# Применить изменения
python3 sync_translations.py --remove-unused
```

**⚠️ Внимание:** Удаляйте ключи осторожно! Они могут быть для будущих функций.

---

### 🔄 Полная синхронизация (рекомендуется раз в месяц)

```bash
./manage_translations.sh
# Выбрать: 7. Run all (extract + validate + sync)
```

**Результат:** Полный цикл извлечения, валидации и синхронизации

---

## Работа с Claude Code

Просто задайте вопрос на русском или английском:

### Примеры команд

**Русский:**
- "Проверь переводы REST API"
- "Синхронизируй RestApi.php"
- "Найди отсутствующие ключи rest_*"
- "Добавь отсутствующие переводы"

**English:**
- "Check REST API translations"
- "Sync RestApi.php translations"
- "Find missing rest_* keys"
- "Add missing translation keys"

Claude автоматически:
1. Извлечет ключи из кода
2. Проверит RestApi.php
3. Покажет отсутствующие/неиспользуемые
4. Предложит синхронизацию

---

## После синхронизации

### 1. Проверить изменения
```bash
git diff src/Common/Messages/ru/RestApi.php
```

### 2. Найти placeholder для перевода
```bash
grep "ТРЕБУЕТ ПЕРЕВОДА" src/Common/Messages/ru/RestApi.php
```

### 3. Перевести placeholder
Откройте файл и замените:
```php
// ДО
'rest_ext_GetList' => 'Получить список [ТРЕБУЕТ ПЕРЕВОДА]',

// ПОСЛЕ
'rest_ext_GetList' => 'Получить список внутренних номеров',
```

### 4. Проверить результат
```bash
python3 validate_translations.py
```

---

## Устранение проблем

### Ошибка "Extracted keys file not found"
```bash
# Запустите сначала extraction
python3 extract_keys.py
```

### Ошибка PHP синтаксиса после sync
```bash
# Откатить из резервной копии
ls -la src/Common/Messages/ru/RestApi.php.bak.*
cp src/Common/Messages/ru/RestApi.php.bak.YYYYMMDD_HHMMSS \
   src/Common/Messages/ru/RestApi.php
```

### Много неиспользуемых ключей
```bash
# Посмотреть список
python3 validate_translations.py | grep "⚠️  Unused"

# НЕ удаляйте сразу! Проверьте:
# - Ключи могут быть для будущих функций
# - Ключи могут быть в комментариях
# - Ключи могут быть в других файлах
```

---

## Статистика

После extraction и validation вы увидите:

```
Files scanned:    479 файлов PHP
Keys found:       2876 использований
Unique keys:      1589 уникальных ключей

Valid keys:       1370/1589 (86%)
Missing keys:     219 отсутствуют
Unused keys:      358 не используются
```

**Цель:** 100% Valid keys (все ключи в синхронизации)

---

## Интеграция в workflow

### При создании нового endpoint

1. Напишите controller с attributes
2. Запустите `python3 extract_keys.py`
3. Запустите `python3 validate_translations.py`
4. Если есть missing keys → `sync_translations.py --add-missing`
5. Переведите placeholder
6. Commit изменений

### Перед релизом

```bash
./manage_translations.sh
# Опция 7: Run all

git diff src/Common/Messages/ru/RestApi.php
# Если есть изменения - проверьте и commit
```

---

## Файлы навыка

```
.claude/skills/restapi-translations/
├── README.md              ← Полная документация
├── QUICKSTART.md          ← Этот файл
├── SKILL.md               ← Техническая документация
├── skill.json             ← Конфигурация для Claude
└── scripts/
    ├── extract_keys.py           ← Извлечение ключей (шаг 1)
    ├── validate_translations.py  ← Валидация (шаг 2)
    ├── sync_translations.py      ← Синхронизация (шаг 3)
    ├── manage_translations.sh    ← Интерактивный режим
    └── extracted_keys.json       ← Результат (генерируется)
```

---

## Помощь

**Проблемы?**
1. Проверьте README.md для деталей
2. Запустите с `--help`: `python3 sync_translations.py --help`
3. Проверьте резервные копии: `*.bak.*`

**Вопросы к Claude:**
- "Как работает restapi-translations skill?"
- "Покажи примеры использования"
- "Что делать с отсутствующими ключами?"
