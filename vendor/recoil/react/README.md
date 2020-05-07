# Recoil + ReactPHP

[![Build Status](http://img.shields.io/travis/recoilphp/react/master.svg?style=flat-square)](https://travis-ci.org/recoilphp/react)
[![Code Coverage](https://img.shields.io/codecov/c/github/recoilphp/react/master.svg?style=flat-square)](https://codecov.io/github/recoilphp/react)
[![Code Quality](https://img.shields.io/scrutinizer/g/recoilphp/react/master.svg?style=flat-square)](https://scrutinizer-ci.com/g/recoilphp/react/)
[![Latest Version](http://img.shields.io/packagist/v/recoil/react.svg?style=flat-square&label=semver)](https://semver.org)

Integrate [Recoil](https://github.com/recoilphp/recoil) with [ReactPHP](https://github.com/reactphp/react).

    composer require recoil/react

This repository provides a Recoil kernel implemented on top of the ReactPHP
event loop, allowing cooperative execution of Recoil and ReactPHP applications.

ReactPHP promises can be yielded from a coroutine as though they were a native
Recoil coroutine.
