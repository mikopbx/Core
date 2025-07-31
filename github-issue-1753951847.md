# GitHub Issue: Implement Dialplan Applications REST API v2 with Unified Text Processing Architecture

## Title
Implement Dialplan Applications REST API v2 with Unified Text Processing Architecture

## Description

### English Description

This task implements the migration of Dialplan Applications to the unified REST API v2 architecture as part of issue #915 "Migrate All Account Types to Unified REST API Architecture". The implementation introduces a comprehensive text processing architecture that addresses critical security and user experience issues.

#### Current Implementation Overview
- ✅ Basic dialplan applications functionality exists in legacy format
- ✅ Web interface for managing dialplan applications
- ❌ No REST API v2 support for dialplan applications
- ❌ Inconsistent text processing across different API endpoints
- ❌ Double HTML escaping issues causing user experience problems
- ❌ Mixed security approaches across different modules

#### Proposed Changes/Solution

**1. REST API v2 Migration**
- Implement complete CRUD operations for dialplan applications
- Add proper authentication and authorization
- Implement queue-based processing architecture
- Add comprehensive input validation and sanitization
- Support for both JSON and form-data requests

**2. Unified Text Processing Architecture**
- Create `TextFieldProcessor` class with "Store Raw, Escape at Edge" principle:
  - `sanitizeForStorage()` - Removes XSS threats while preserving text content
  - `escapeForHtml()` - HTML escaping for web interface display
  - `escapeForJson()` - JSON-safe escaping for API responses
  - `containsDangerousContent()` - Security threat detection
- Replace problematic `html_escape` sanitization rules with proper `sanitize` rules
- Remove double HTML escaping from API responses

**3. Security Enhancements**
- XSS protection without content corruption
- Removal of dangerous HTML tags (script, iframe, object, embed)
- JavaScript and VBScript protocol filtering
- Event handler removal (onclick, onload, etc.)
- SQL injection pattern detection
- Comprehensive security logging

**4. User Experience Improvements**
- Fix double escaping issues (quotes appearing as `&amp;quot;` instead of `"`)
- Preserve normal text formatting and special characters
- Maintain application code integrity (PHP/plaintext)
- Limit application name length to 50 characters
- Enhanced form validation with proper error messages

**5. API Features**
- Full CRUD operations: Create, Read, Update, Delete
- Bulk operations support
- Advanced filtering and sorting
- Pagination support
- Proper error handling and validation
- Base64 encoding for application logic code
- Extension uniqueness validation

#### Technical Implementation Details

**New Files Created:**
- `TextFieldProcessor.php` - Unified text processing class
- `CodeSecurityValidator.php` - Application code security validation
- `DataStructure.php` - API response formatting
- REST API controllers and action classes for all CRUD operations

**Modified Components:**
- Updated `BaseActionHelper` to use new sanitization approach
- Fixed IVR Menu API to remove double escaping
- Enhanced JavaScript API client without redundant escaping
- Updated form validation rules and length limits

#### Benefits
- **Security**: Comprehensive XSS protection without content corruption
- **User Experience**: Eliminates double escaping issues, preserves text formatting
- **API Consistency**: Unified approach across all REST API endpoints
- **Maintainability**: Centralized text processing logic
- **Performance**: Efficient sanitization without redundant operations
- **Compliance**: Follows security best practices and coding standards

---

### Русское описание

Данная задача реализует миграцию приложений диалплана на унифицированную архитектуру REST API v2 в рамках задачи #915 "Migrate All Account Types to Unified REST API Architecture". Реализация вводит комплексную архитектуру обработки текста, которая решает критические проблемы безопасности и пользовательского опыта.

#### Обзор текущей реализации
- ✅ Базовая функциональность приложений диалплана существует в устаревшем формате
- ✅ Веб-интерфейс для управления приложениями диалплана
- ❌ Отсутствует поддержка REST API v2 для приложений диалплана
- ❌ Несогласованная обработка текста в разных API endpoint'ах
- ❌ Проблемы двойного HTML-экранирования, ухудшающие пользовательский опыт
- ❌ Смешанные подходы к безопасности в разных модулях

#### Предлагаемые изменения/решение

**1. Миграция на REST API v2**
- Реализация полных CRUD операций для приложений диалплана
- Добавление правильной аутентификации и авторизации
- Реализация очередной архитектуры обработки
- Добавление комплексной валидации и санитизации входных данных
- Поддержка как JSON, так и form-data запросов

**2. Унифицированная архитектура обработки текста**
- Создание класса `TextFieldProcessor` с принципом "Store Raw, Escape at Edge":
  - `sanitizeForStorage()` - Удаляет XSS-угрозы, сохраняя содержимое текста
  - `escapeForHtml()` - HTML-экранирование для отображения в веб-интерфейсе
  - `escapeForJson()` - JSON-безопасное экранирование для API ответов
  - `containsDangerousContent()` - Обнаружение угроз безопасности
- Замена проблематичных правил санитизации `html_escape` на правильные правила `sanitize`
- Удаление двойного HTML-экранирования из API ответов

**3. Улучшения безопасности**
- XSS защита без повреждения содержимого
- Удаление опасных HTML тегов (script, iframe, object, embed)
- Фильтрация JavaScript и VBScript протоколов
- Удаление обработчиков событий (onclick, onload и т.д.)
- Обнаружение паттернов SQL инъекций
- Комплексное логирование безопасности

**4. Улучшения пользовательского опыта**
- Исправление проблем двойного экранирования (кавычки отображаются как `&amp;quot;` вместо `"`)
- Сохранение нормального форматирования текста и специальных символов
- Поддержание целостности кода приложений (PHP/plaintext)
- Ограничение длины названия приложения до 50 символов
- Улучшенная валидация форм с правильными сообщениями об ошибках

**5. Функции API**
- Полные CRUD операции: Создание, Чтение, Обновление, Удаление
- Поддержка массовых операций
- Расширенная фильтрация и сортировка
- Поддержка пагинации
- Правильная обработка ошибок и валидация
- Base64 кодирование для логики кода приложений
- Валидация уникальности расширений

#### Технические детали реализации

**Созданные новые файлы:**
- `TextFieldProcessor.php` - Унифицированный класс обработки текста
- `CodeSecurityValidator.php` - Валидация безопасности кода приложений
- `DataStructure.php` - Форматирование ответов API
- REST API контроллеры и классы действий для всех CRUD операций

**Модифицированные компоненты:**
- Обновлен `BaseActionHelper` для использования нового подхода санитизации
- Исправлен IVR Menu API для удаления двойного экранирования
- Улучшен JavaScript API клиент без избыточного экранирования
- Обновлены правила валидации форм и ограничения длины

#### Преимущества
- **Безопасность**: Комплексная XSS защита без повреждения содержимого
- **Пользовательский опыт**: Устраняет проблемы двойного экранирования, сохраняет форматирование текста
- **Согласованность API**: Унифицированный подход во всех REST API endpoint'ах
- **Поддерживаемость**: Централизованная логика обработки текста
- **Производительность**: Эффективная санитизация без избыточных операций
- **Соответствие**: Следует лучшим практикам безопасности и стандартам кодирования

---

### Labels
- enhancement
- api
- security
- core
- high

### Milestone
REST API v2 Migration

### Related Issues
- Relates to #915 "Migrate All Account Types to Unified REST API Architecture"

### Testing Requirements
- [ ] All CRUD operations work correctly via REST API
- [ ] XSS protection prevents malicious scripts without corrupting normal text
- [ ] No double escaping occurs in web interface
- [ ] Application code (PHP/plaintext) is preserved correctly
- [ ] Form validation works with 50-character name limit
- [ ] Backward compatibility with existing dialplan applications
- [ ] Security logging captures all threat attempts

### Acceptance Criteria
- [ ] Complete REST API v2 implementation for dialplan applications
- [ ] Unified TextFieldProcessor adopted across all API endpoints
- [ ] Double HTML escaping issues resolved
- [ ] XSS protection works without content corruption
- [ ] All existing functionality preserved
- [ ] Comprehensive test coverage
- [ ] Documentation updated