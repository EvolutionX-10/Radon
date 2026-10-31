<div align="center">

# Radon

[![License]][apache]
[![GitHub stars]][stars]
[![GitHub issues]][issues]
![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FEvolutionX-10%2FRadon&count_bg=%234900FF&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)
[![Continuous Integration](https://github.com/EvolutionX-10/Radon/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/EvolutionX-10/Radon/actions/workflows/continuous-integration.yml)

</div>

## Table of Contents

- [Invite](#invite-radon-to-your-server-click-here)
- [Command Help](#command-help)
- [Beta Testing](#beta-testing-for-radon)
- [Developing on Radon](#developing-on-radon)
- [Contributing](#contributing)
- [Project Stats](#project-stats)

## Invite Radon to your server [`Click here`][invite]

## Command Help

Run `/help` in a server to open a private Components V2 command browser. Choose a category or use First, Back, Next, and Last to browse commands and their usage. `<argument>` means required and `[argument]` means optional. Controls expire after five minutes; run `/help` again to refresh the list.

Help reflects your access in the current server and channel, including configured moderator/admin roles, bot owner access, community restrictions, Discord command permissions, and commands registered only in specific servers. It includes slash subcommands, context menus (right-click → Apps), and eligible prefix commands. Disabled commands are omitted, and browsing does not consume command cooldowns. Target-specific checks such as role hierarchy still apply when running a command.

Use `/guide` for the first-time coupon walkthrough, supported games, optional vote rewards, and troubleshooting. Existing `/claim` commands and Solo Leveling CLAIM buttons work as before; choose the optional `game` field for Seven Knights Re:BIRTH or The Seven Deadly Sins: Idle Adventure. `/vote` offers an optional 24-hour Supporter Pass for extra saved accounts and personal coupon alerts. See the [player guide](docs/player-guide.md) and [vote rewards setup](docs/vote-rewards.md).

For developers: help reads the live application registrations and command preconditions. When guarding an individual route with `@PermissionLevel`, pass its subcommand path as the second argument (for example, `@PermissionLevel('Administrator', 'action create')`) so help uses the same guard declaration. Add temporarily unavailable routes to the command's `unavailableSubcommands` list.

## Beta Testing for Radon

At the moment I am not completely free but if you are interested in beta testing the bot and helping me out I would be glad. Find me here! <br>

<div>
  
<img align = "center" src = "https://images.weserv.nl/?url=cdn.discordapp.com/avatars/697795666373640213/feb4fe1b8f2d174b4d66d970c9fc88ef.webp?size=512&mask=circle" height = "45" width = "45"/>[`EvolutionX`](https://discord.com/users/697795666373640213)

</div>

## Developing on Radon

### Requirements

**You should have a good understanding of the following:**

- [`Bun`]: To run the project
- [`MongoDB`]: To store the data
- [`Discord.js`][discord.js]: To interact with the Discord API
- [`Sapphire`]: Framework used in Radon

Run `bash scripts/setup.sh` after cloning. It installs the pinned Bun version in
`~/.local/bin` when needed, installs locked dependencies, and generates the local
Prisma client. Add `~/.local/bin` to your shell's `PATH` if it is not already there.
Use the same command as the setup command for fresh cloud environments; an install
in one running instance does not change the saved environment image. Set
`RADON_BUN_INSTALL_DIR` to choose a different installation directory.

Run `bun run check` before opening a pull request. CI runs formatting, type
checking, the offline test suite, and opt-in database tests against a disposable
local MongoDB replica set. Setup and checks do not log in to Discord
or apply database schema changes. Running the bot requires your configured
Discord and MongoDB credentials.

The [implementation checklist](docs/implementation-checklist.md) tracks the
moderation improvements, individual PR review order, and remaining rollout checks.

## Contributing

To contribute to this repository, feel free to fork the repository and make your own changes. Once you have made your changes, you can submit a pull request.

1. Fork the repository and select the **main** branch.
2. Create a new branch and make your changes.
3. Make sure you use a proper linter and a code formatter. [^lint]
4. Make sure you have a good commit message.[^commit]
5. Push your changes.
6. Submit a pull request [here][pr].

<div align="center">
<a href="https://top.gg/bot/944833303226236989">
  <img src="https://top.gg/api/widget/944833303226236989.svg">
</a>
</div>

## Project Stats

[![Radon](https://repobeats.axiom.co/api/embed/2dfcb3b8b5cbc2d7e8ecf7928bac05b966076c7f.svg 'All kinds Contributions are welcomed!')](https://top.gg/bot/944833303226236989)

<!-- REFERENCES -->

[^env]: You will need to create a `.env` file in the root directory of the project.

[^lint]: We recommend using [`eslint`] and [`prettier`] to lint your code.

[^commit]: We strongly follow the [`Commit Message Conventions`]. This is important when commiting your code for a PR.

<!-- LINKS -->

[`mongodb`]: https://www.mongodb.com/
[`git`]: https://git-scm.com/
[typescript]: https://www.typescriptlang.org/
[discord.js]: https://discord.js.org/
[bun]: https://bun.sh/
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
[invite]: https://discord.com/api/oauth2/authorize?client_id=944833303226236989&scope=applications.commands+bot&permissions=543276137727

<!-- BADGES -->

[codefactor]: https://www.codefactor.io/repository/github/evolutionx-10/radon/badge/main
[license]: https://img.shields.io/github/license/EvolutionX-10/Radon
[github stars]: https://img.shields.io/github/stars/EvolutionX-10/Radon
[github issues]: https://img.shields.io/github/issues/EvolutionX-10/Radon
