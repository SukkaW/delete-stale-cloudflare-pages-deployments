# Delete Stale Cloudflare Pages Deployments

A library and a CLI to delete stale Cloudflare Pages deployments.

## Installation

```bash
# npm
npm i delete-stale-cloudflare-pages-deployments
# yarn
yarn add delete-stale-cloudflare-pages-deployments
# pnpm
pnpm add delete-stale-cloudflare-pages-deployments
```

## Usage

### CLI

```bash
delete-stale-cloudflare-pages-deployments help
```

> When using the CLI, either `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` environment variables shall exists. You can do:
>
> ```bash
> CLOUDFLARE_API_TOKEN=your-api-token delete-stale-cloudflare-pages-deployments
> ```
>

### Programmatic

```ts
import { deleteStaleDeployments } from 'delete-stale-cloudflare-pages-deployments';
```

---

**delete-stale-cloudflare-pages-deployments** © [Sukka](https://github.com/SukkaW), Released under the [MIT](./LICENSE) License.<br>
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/delete-stale-cloudflare-pages-deployments/graphs/contributors)).

> [Personal Website](https://skk.moe) · [Blog](https://blog.skk.moe) · GitHub [@SukkaW](https://github.com/SukkaW) · Telegram Channel [@SukkaChannel](https://t.me/SukkaChannel) · Mastodon [@sukka@acg.mn](https://acg.mn/@sukka) · Twitter [@isukkaw](https://twitter.com/isukkaw) · Keybase [@sukka](https://keybase.io/sukka)

<p align="center">
  <a href="https://github.com/sponsors/SukkaW/">
    <img src="https://sponsor.cdn.skk.moe/sponsors.svg"/>
  </a>
</p>
