<div align="center">

# Radon

[![CodeFactor]](https://www.codefactor.io/repository/github/evolutionx-10/radon/overview/main)
[![License]][apache]
[![GitHub stars]][stars]
[![GitHub issues]][issues]
![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FEvolutionX-10%2FRadon&count_bg=%234900FF&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)
[![Lint](https://github.com/EvolutionX-10/Radon/actions/workflows/linter.yml/badge.svg)](https://github.com/EvolutionX-10/Radon/actions/workflows/linter.yml)

</div>

## Table of Contents

-   [License](#license-here)
-   [Developing on Radon](#developing-on-radon)
-   [Self Hosting](#self-hosting)
-   [Contributing](#contributing)
-   [Changelog](#changelog-here)
-   [Plans](#plans)

## License [`here`][apache]

## Developing on Radon

### Requirements

**You should have a good understanding of the following:**

-   [`Node.js`]: To run the project
-   [`MongoDB`]: To store the music database and other data
-   [`Discord.js`][discord.js]: To interact with the Discord API
-   [`Sapphire`]: Framework used in Radon

## Self Hosting

We **do not** recommend self hosting Radon. But in case you do please note that we don't provide any support for self hosted instances of Radon.

### To host Radon

#### Prerequisites

-   [`Node.js`]: To run the project
-   [`MongoDB`]: To store the music database and other data
-   [`Git`]: To manage the project[^env]

```bash
git clone https://github.com/EvolutionX-10/Radon.git
cd Radon
yarn
yarn start
```

_Note: We expect you have **solid** understanding of [TypeScript], [discord.js] and [Node.js] when Self Hosting_

## Contributing

To contribute to this repository, feel free to fork the repository and make your own changes. Once you have made your changes, you can submit a pull request.

1. Fork the repository and select the **main** branch.
2. Create a new branch and make your changes.
3. Make sure you use a proper linter and a code formatter. [^lint]
4. Make sure you have a good commit message.[^commit]
5. Push your changes.
6. Submit a pull request [here][pr].

## Changelog [`here`][changelog]

## Plans

-   [ ] Create more server utility commands
-   [ ] Create advanced automod system
-   [ ] Create a simple setup system
-   [ ] Create a support server

_Note: These plans might change in the future._ <br>
_Note2: There is **NO** [`ETA`] for these plans._

<!-- REFERENCES -->

[^env]: You will need to create a `.env` file in the root directory of the project.
[^lint]: We recommend using [`eslint`] and [`prettier`] to lint your code.
[^commit]: We strongly follow the [`Commit Message Conventions`]. This is important when commiting your code for a PR.

<!-- LINKS -->

[`node.js`]: https://nodejs.org/en/
[`mongodb`]: https://www.mongodb.com/
[`git`]: https://git-scm.com/
[typescript]: https://www.typescriptlang.org/
[discord.js]: https://discord.js.org/
[node.js]: https://nodejs.org/en/
[pr]: https://github.com/EvolutionX-10/Radon/pulls
[stars]: https://github.com/EvolutionX-10/Radon/stargazers
[issues]: https://github.com/EvolutionX-10/Radon/issues
[changelog]: https://github.com/EvolutionX-10/Radon/blob/main/CHANGELOG.md
[`eslint`]: https://eslint.org/
[`prettier`]: https://prettier.io/
[`commit message conventions`]: https://conventionalcommits.org/en/v1.0.0/
[apache]: https://github.com/EvolutionX-10/Radon/blob/main/LICENSE.md
[`eta`]: https://www.javatpoint.com/eta-full-form
[`sapphire`]: https://www.sapphirejs.dev

<!-- BADGES -->

[codefactor]: https://www.codefactor.io/repository/github/evolutionx-10/radon/badge/main
[license]: https://img.shields.io/github/license/EvolutionX-10/Radon
[github stars]: https://img.shields.io/github/stars/EvolutionX-10/Radon
[github issues]: https://img.shields.io/github/issues/EvolutionX-10/Radon
