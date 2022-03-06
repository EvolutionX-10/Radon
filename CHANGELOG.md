# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0](https://github.com/EvolutionX-10/Radon/compare/v1.0.0...v1.1.0) (2022-03-06)


### Features

* **cooldown:** better messages when in cooldown ([81111ce](https://github.com/EvolutionX-10/Radon/commit/81111cea795f467f18c0caa0daf4ed8af718c371))
* **slash:** added delete subcommand to manage slashies ([d51bf85](https://github.com/EvolutionX-10/Radon/commit/d51bf8505a437dc922b7d140e0ddcea842563017))
* **stats:** added new `stats` slash command ([8219c95](https://github.com/EvolutionX-10/Radon/commit/8219c95cf39c00296ff7c32e92f1d523ea4b1ce4))
* **timestamps:** new class for discord timestamps ([03f22d4](https://github.com/EvolutionX-10/Radon/commit/03f22d41da8e4fe14b273595e29a7d27846a0bdf))

## [1.0.0](https://github.com/EvolutionX-10/Radon/compare/v0.2.0...v1.0.0) (2022-03-01)


### ⚠ BREAKING CHANGES

* removed the array of guild ids for production environment and made it empty array
so now slashies are global

### Features

* added Procfile, ready for hosting! ([defa0a0](https://github.com/EvolutionX-10/Radon/commit/defa0a0ffc5959527eea3b67db5dc7b8d4a68bbc))
* added typegoose for mongoose ✨ ([453c0ee](https://github.com/EvolutionX-10/Radon/commit/453c0ee8164d5e140f57f08229ae7fa2eb15a922))
* new slash command `softban` ([21a267f](https://github.com/EvolutionX-10/Radon/commit/21a267f4f0a0a2c89334867b5c48022163e34e8e))
* new slash command `timeout` 🎉 ([0b435f6](https://github.com/EvolutionX-10/Radon/commit/0b435f680b5f9efa6a42d0b2d76c50697f7e75a3))
* unban command 🎉 ([c877ef5](https://github.com/EvolutionX-10/Radon/commit/c877ef507191065f9cf38ed589738ef275fcebfd))


### Bug Fixes

* added appropriate permissions in `ban` and `kick` ([6aa7575](https://github.com/EvolutionX-10/Radon/commit/6aa75756a9455743bf44853e2d7130d675ac87bc))
* **ban:** fixed a bug where it didnt handle error at a user who isnt in guild ([324f718](https://github.com/EvolutionX-10/Radon/commit/324f7187db0005b14df6b9de04585725b062fb52))


* convert guild slashies to global in vars ([e88db71](https://github.com/EvolutionX-10/Radon/commit/e88db71d59f22702d786b0d1a12b7809a1b0e96a))

## [0.2.0](https://github.com/EvolutionX-10/Radon/compare/v0.1.2...v0.2.0) (2022-02-28)


### Features

* **ban:** added new ban command 🔨 ([7440109](https://github.com/EvolutionX-10/Radon/commit/74401090a8da4de52ed21ba3bd50f045e4e37e85))
* completely slash only bot for users ([f3aae63](https://github.com/EvolutionX-10/Radon/commit/f3aae630fca543b1d088392457d3c0e58b333bc6))
* **dm:** added dm intents and channel partials ([f32c59d](https://github.com/EvolutionX-10/Radon/commit/f32c59dfb446b806d87de750571eb5e7faf88bcd))
* new function to check if the mod action can be done or not ([9ffe35b](https://github.com/EvolutionX-10/Radon/commit/9ffe35b22644f216fda24b95543aaeb364a24276))
* **slash:** new command to view all slash commands ([7085c5d](https://github.com/EvolutionX-10/Radon/commit/7085c5d0f585663e64727d044a1b2efdf0e6935c))


### Bug Fixes

* added proper handling of perms preconditions ([5320cc4](https://github.com/EvolutionX-10/Radon/commit/5320cc404bf438c1a72652e3af951f0504257896))
* fixed a bug where if slash failed, error was not shown to user ([fa6382a](https://github.com/EvolutionX-10/Radon/commit/fa6382a9d20b74df5d602064a67a6c24743d76ee))
* fixed a bug where users could input decimals ([becb71d](https://github.com/EvolutionX-10/Radon/commit/becb71d761095937740c2bc88c4ccf951a26a881))
* **ids:** fixed idHints array with proper ids ([d7eef74](https://github.com/EvolutionX-10/Radon/commit/d7eef741ebd1ea72c5119b14f8ad698f378dd8a1))

### [0.1.2](https://github.com/EvolutionX-10/Radon/compare/v0.1.1...v0.1.2) (2022-02-27)


### Features

* **yarn:** update to yarn v3.2 🎉 ([4db8642](https://github.com/EvolutionX-10/Radon/commit/4db864216e2cc388e37a38acca91fdcff9cee25b))

### [0.1.1](https://github.com/EvolutionX-10/Radon/compare/v0.1.0...v0.1.1) (2022-02-26)


### Features

* `kick` and `clear` commands ([3b18cd3](https://github.com/EvolutionX-10/Radon/commit/3b18cd330665d023dadfe5ec6650451d050e556f))
* **ready:** better logging as well as continous development ([97621eb](https://github.com/EvolutionX-10/Radon/commit/97621eb895cfa7f34adea08b8ec03131378b8b0c))
* **yarn:** switch to yarn 🎉 ([2ecae6b](https://github.com/EvolutionX-10/Radon/commit/2ecae6b83b7021b0da03de7cfb7ac098852d0598))


### Bug Fixes

* **status:** status now actually updates with mode change ([bdc2ce9](https://github.com/EvolutionX-10/Radon/commit/bdc2ce9a1e0246894dc1eafb37989d9d2dd3c728))

## 0.1.0 (2022-02-21)


### Features

* added `ping` and `eval` commands ([d07f42e](https://github.com/EvolutionX-10/Radon/commit/d07f42e5ba3fe084aa2b8c717db64b7cb9632453))
