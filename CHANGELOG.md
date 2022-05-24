# Changelog

All notable changes to this project will be documented in this file.

# [1.12.0](https://github.com/EvolutionX-10/Radon/compare/v1.11.0...v1.12.0) - (2022-05-24)

## 🏠 Refactor

- **bool:** Use 1 and 0 instead of string ([cedd0b0](https://github.com/EvolutionX-10/Radon/commit/cedd0b015644128eb8e5d6683b1614a7907e9aa7))
- **config:** Hmr stuff ([8c0c607](https://github.com/EvolutionX-10/Radon/commit/8c0c6079ceca71b5059f062c8746431d3f4fc6c0))
- **msg:** Remove useless methods & clean code ([178025f](https://github.com/EvolutionX-10/Radon/commit/178025f9193cb7ac6aea6e18aefd10b54cb90606))
- **stats:** Remove code duplication ([cf0b5ae](https://github.com/EvolutionX-10/Radon/commit/cf0b5ae2aca9537ef73de20410b358bba67e91c5))

## 🐛 Bug Fixes

- **deps:** Update dependency @sapphire/discord-utilities to v2.11.0 (#83) ([640d506](https://github.com/EvolutionX-10/Radon/commit/640d5065dc19371d648f9da838db449b16d3e40a))
- **deps:** Update dependency mongoose to v6.3.4 (#47) ([8a9c5e4](https://github.com/EvolutionX-10/Radon/commit/8a9c5e4b3f2f64424938f5e6ad539f46d49c3ca6))
- **deps:** Update dependency @sapphire/framework to v3.0.0-next.fd7be0b.0 (#70) ([50ebecc](https://github.com/EvolutionX-10/Radon/commit/50ebecc7b45e777db397547765c4f659fb433119))
- **deps:** Update dependency @sapphire/pieces to v3.3.3 (#73) ([01ac2c6](https://github.com/EvolutionX-10/Radon/commit/01ac2c66372914bbebb016b455755807dc14d91c))
- **deps:** Update dependency ioredis to v5.0.5 (#78) ([f85e9d8](https://github.com/EvolutionX-10/Radon/commit/f85e9d80708860a14359e4e833899f46df0e5c8b))
- **deps:** Update dependency @sapphire/discord.js-utilities to v4.11.0 (#75) ([3c85aa0](https://github.com/EvolutionX-10/Radon/commit/3c85aa0eb40c643e6f683c332e9d50953b5a117f))
- **deps:** Pin dependency @devtomio/plugin-botlist to 1.2.0 (#66) ([a430d5e](https://github.com/EvolutionX-10/Radon/commit/a430d5eae207e8c76cd324028731d83a7b1cd196))
- Boolean is now parsed correctly ([6eee048](https://github.com/EvolutionX-10/Radon/commit/6eee048de8b616138f34c3d82c429cebfa8ae134))
- **deps:** Pin dependencies (#59) ([af5c70a](https://github.com/EvolutionX-10/Radon/commit/af5c70aee08e88f971a1112a6d0e9cbd357bff45))
- No errors anymore when running slash cmd as legacy ([688a1e1](https://github.com/EvolutionX-10/Radon/commit/688a1e1ba8216e77d4af4f94f897171a68822e0b))

## 📝 Documentation

- Update badge (#61) ([b348a69](https://github.com/EvolutionX-10/Radon/commit/b348a690062057c500b0ddf919ed2ddafa23d5a3))
- Update `README.md` ([006281c](https://github.com/EvolutionX-10/Radon/commit/006281cf1d46af6da175ae6e84f2de85adbab2c3))

## 🚀 Features

- Add lock and unlock (#71) ([d8f2bfa](https://github.com/EvolutionX-10/Radon/commit/d8f2bfa20f77ee23a921267b8419e99dfbf0175f))
- **botlist:** Use plugin to autopost stats ([d1bebf3](https://github.com/EvolutionX-10/Radon/commit/d1bebf321dffcc1e8082a9a97b022a513ecce361))
- **lines:** New function to count lines/files ([b3d1f19](https://github.com/EvolutionX-10/Radon/commit/b3d1f19f28cfc8157e0900dfc4b1b96a790029b1))

# [1.11.0](https://github.com/EvolutionX-10/Radon/compare/v1.10.0...v1.11.0) - (2022-05-14)

## 🏠 Refactor

- Use some instead of Boolean constructor ([9443b9c](https://github.com/EvolutionX-10/Radon/commit/9443b9c2f950b805662d14371e6e70d8856e74e9))
- **time:** Removed ms and humanize-duration, using @sapphire ([8c7c2a1](https://github.com/EvolutionX-10/Radon/commit/8c7c2a11450ffbaf11b6802dc72b2116c15d1f8e))
- **ownerMode:** Use redis now ([001dbaa](https://github.com/EvolutionX-10/Radon/commit/001dbaa7a53f7ac1fffbc546aef2a6885c01b647))

## 🐛 Bug Fixes

- **confirmation:** Use interaction instead of message for ephemerals ([bcbf74a](https://github.com/EvolutionX-10/Radon/commit/bcbf74ad5fcd6bb00c0e4390cf982f06a00afefe))
- Remove any ([fd4f9db](https://github.com/EvolutionX-10/Radon/commit/fd4f9db6e8d1afad76e5f4738982f1b6de2f25b3))

## 🚀 Features

- **tsup:** Switch to tsup ([9e68272](https://github.com/EvolutionX-10/Radon/commit/9e6827270fd0c5ad8fa9b59c74dd9d7e86861974))
- **ban:** Ban confirmations are now available ([9c15e42](https://github.com/EvolutionX-10/Radon/commit/9c15e42567502568d4141502828a86e7361e0506))
- Update to discord.js v13.7 ([4ff13f3](https://github.com/EvolutionX-10/Radon/commit/4ff13f35fe781abbb5e0d5d07bbfe0d95dc72b16))
- **setup:** Remove community question ([30e77a4](https://github.com/EvolutionX-10/Radon/commit/30e77a43ccc21078992e4855bac88ff0457d2a09))
- Added redis connection ([c4bfa14](https://github.com/EvolutionX-10/Radon/commit/c4bfa149043241d35bf3eb3096c59404df69e2dd))

# [1.10.0](https://github.com/EvolutionX-10/Radon/compare/v1.9.0...v1.10.0) - (2022-05-11)

## 🏃 Performance

- **cache:** Added sweepers ([46e4520](https://github.com/EvolutionX-10/Radon/commit/46e4520267dd5df663c55ec8f3b0680028164ba7))

## 🚀 Features

- Completely removed stats and invite ([6de14a7](https://github.com/EvolutionX-10/Radon/commit/6de14a7151f7b332fac626d8307e75431d2d86fa))
- **join:** Now shows perms in readable manner ([67a7f96](https://github.com/EvolutionX-10/Radon/commit/67a7f962e843b515cc563fefa4042e597558def1))
- **stats:** Made stats an owner only command as msg cmd ([5c38a2a](https://github.com/EvolutionX-10/Radon/commit/5c38a2adb073c467b29913717d1a531a57270e08))

