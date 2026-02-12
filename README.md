<p align="center">
  <img src="assets/logo.svg" alt="GuildSpace" width="120">
</p>

<h1 align="center">GuildSpace</h1>
<p align="center"><strong>A place for guilds.</strong></p>

---

Your guild gets a home on the web. Not a chat server. A website.

A guild page with your roster, your history, your loot tables. Player pages with character profiles, raid attendance, DKP. A bulletin board, a bank ledger, a raid calendar. Real pages you can browse and link to.

## Where we're going

Every player gets a page. Every guild gets a page. DKP standings are a leaderboard you can browse. When a recruit visits your guild, they see the whole picture on one page. When someone looks you up, they see your characters, your raid history, your contributions.

Chat is here too. But chat is just one thing on the page, not the whole page.

## Where we are

The data layer works. Census, DKP, attendance, bank — all live and queryable. Discord OAuth gets you in. Right now you interact through commands, same as a bot. The next step is putting that data on real pages so it doesn't need a command to see it.

Ex Astra is the first guild on the platform.

## Stack

- **Server**: Express + Socket.IO (TypeScript)
- **Database**: PostgreSQL (via TypeORM)
- **Auth**: Discord OAuth2
- **Hosting**: Railway

## License

ISC
