# Contributing to MikoPBX

Thank you for your interest in contributing to MikoPBX! This guide will help you get started.

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Ways to Contribute

- **Report bugs** — file an [issue](https://github.com/mikopbx/Core/issues) with steps to reproduce
- **Suggest features** — start a topic on [forum.mikopbx.com](https://forum.mikopbx.com)
- **Submit code** — fix bugs or implement features via pull requests
- **Translate** — help localize the interface on [Weblate](https://weblate.mikopbx.com/engage/mikopbx/)
- **Write documentation** — improve the [docs](https://docs.mikopbx.com)

## Development Setup

### Prerequisites

- PHP 8.4 with Phalcon 5.9 extension
- Composer
- Node.js (for JavaScript transpilation)
- Docker (for running MikoPBX locally)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/mikopbx/Core.git
cd Core

# Install PHP dependencies
composer install

# Run code quality checks
vendor/bin/phpstan analyse --configuration=phpstan.neon
vendor/bin/phpcs --standard=PSR12 src/
```

### Running MikoPBX

The easiest way to run MikoPBX for development is via Docker. Your local `src/` directory is automatically synchronized to the container.

## Code Standards

### PHP

- **PSR-12** coding style
- **PSR-4** autoloading
- **PHP 8.4** — use modern features (typed properties, enums, match expressions, named arguments)
- Run `vendor/bin/phpcs --standard=PSR12` before submitting
- Run `vendor/bin/phpstan analyse` for static analysis

### JavaScript

- **ES6+** syntax (classes, arrow functions, template literals, destructuring)
- **Airbnb** style guide
- Transpiled to ES5 via Babel for browser compatibility

### Commits

- Write clear, concise commit messages
- Use conventional prefixes: `fix:`, `feat:`, `refactor:`, `docs:`, `test:`, `chore:`
- Reference issues where applicable: `fix(extensions): handle empty name (#123)`

## Pull Request Process

1. **Fork** the repository and create a branch from `develop`
2. **Make changes** — keep PRs focused on a single concern
3. **Test** — ensure existing tests pass and add tests for new functionality
4. **Lint** — run code quality checks
5. **Submit** — open a PR against `develop` with a clear description

### PR Requirements

- All CI checks must pass (PHPStan, phpcs, composer audit)
- New features should include tests
- Breaking changes must be documented
- Keep changes minimal and focused

## Project Structure

```
src/
├── AdminCabinet/     # Web UI controllers, views, forms
├── Common/           # Shared models, translations, DI providers
├── Core/             # Asterisk configs, system utilities, workers
├── Modules/          # Module framework base classes
├── PBXCoreREST/      # REST API controllers and processors
└── Service/          # Service layer components
```

## Module Development

To add new functionality, consider building a module instead of modifying the core. See the [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate) repository for a starting point.

## Translations

Interface translations are managed through [Weblate](https://weblate.mikopbx.com/engage/mikopbx/). Do not edit translation files in `src/Common/Messages/` directly — changes will be overwritten by Weblate sync.

## Getting Help

- [Forum](https://forum.mikopbx.com) — questions about development and usage
- [Telegram Chat](https://t.me/mikopbx_dev) — real-time help from the community

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0 License](LICENSE).
