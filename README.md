# Work Browser Tools

Work browser tools in one [Violentmonkey](https://violentmonkey.github.io/) entry. Only CI writes to this
repo; the code lives in a private repo.

**Install:** open
[work-browser-tools.user.js](https://raw.githubusercontent.com/KaiserXanderW/work-browser-tools-releases/main/work-browser-tools.user.js)
with Violentmonkey installed, and confirm. Violentmonkey checks for updates by itself.

## The menu

- **Tools on this page…** lists the tools that run on the current page, each with a switch. A switch
  applies everywhere, after a reload.
- Each tool adds its own commands below that, on the pages where it runs.

Settings that must not be published are entered once, from the menu, and stay in this browser:

| Setting | Where | Menu command |
|---|---|---|
| Templates address | any Novomind page | Set templates address… |
| Name you sign with | any Novomind page | Set the name you sign with… |
| Offline-time form address | any Novomind page | Set offline-time form address… (also asked on first use) |
| Reply Forge key, token, gist and name | the Novomind mail page | Reply Forge: set up… |
| House list | an ASSD page | Import house list… |
| Contact list | a Novomind page | Import contact list… |

## Switching over from the old scripts (once per browser)

1. **Install Work Browser Tools** from the link above.
2. **Enter the settings** from the table above. The old scripts' settings don't carry over: Violentmonkey
   keeps settings per entry, and Work Browser Tools is a new one. Re-import the house list and the contact list.
3. **Check one page of each system.** On an ASSD page and on a Novomind page, "Tools on this page…"
   should list the tools you expect.
4. **Remove the old entries** in the Violentmonkey dashboard. Otherwise every tool runs twice:
   - assd-autofill, assd-login, assd-ocr-assist, assd-house-index
   - novomind-email-response-index, novomind-house-contact-index, novomind-offline-time-tracker
     (only once no entries are pending in it), novomind-toggle-extra-time,
     novomind-update-email-bookingnumber-mybooking
   - reply-forge
