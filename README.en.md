# AllBattery

**AllBattery** is a dashboard for Home Assistant that specialises in monitoring batteries. It
automatically finds all battery entities in your installation, groups them by state and estimates
how much longer a battery will last.

**Language:** [Deutsch](README.md) · **English**

## Features

- **Automatic detection** of all battery entities (`device_class: battery`) – both percentage
  sensors and binary sensors ("battery low").
- **Grouping by state** with colour coding and progress bars:
  Critical (< 10 %), Warning (< 20 %), Good (≥ 20 %), Unknown/Offline.
- **Remaining runtime forecast:** the discharge trend of the recent hours is used to estimate how
  long a battery will last (e.g. "about 3 days 4 h") – including "charging" and "stable".
- **Filter and sorting** by level, name or area, plus a search box covering name, area and
  entity ID.
- **Area assignment:** every battery shows the area it is assigned to in Home Assistant.
- **Automatic refresh** at a configurable interval – inside the panel it also updates live
  whenever states change in Home Assistant.
- **Dark mode** and a responsive layout for desktop, tablet and phone.
- **No credentials in panel mode:** as a sidebar panel, AllBattery uses your signed-in Home
  Assistant session – no token, no CORS configuration required.

> Note: the app interface is currently in German.

## Installation

### Recommended: sidebar panel via HACS

1. Install HACS (if you have not already).
2. In HACS: **Integrations** → three-dot menu → **Custom repositories** →
   `https://github.com/Grantii/AllBattery` → category **Integration** → *Add*.
3. Install AllBattery from HACS.
4. In Home Assistant: *Settings → Devices & Services → **Add integration** → **AllBattery***.

A new **Batteries** entry appears in the sidebar – that is all.

### Alternative: embed as a web page in a dashboard

1. Build the app and copy it into the `www` folder of your Home Assistant configuration:

   ```bash
   npm run deploy:ha -- "\\<server>\config\www"   # Windows (UNC path)
   npm run deploy:ha -- /config/www               # Linux / HAOS add-on terminal
   ```

2. Open `http://<your-home-assistant>:8123/local/allbattery/`
3. Add a **Webpage** card to a dashboard using that URL.

With this variant you enter the Home Assistant URL and a long-lived access token directly in the
app; both stay in your browser's local storage.

## Settings

| Setting | Default | Where |
|---|---|---|
| Auto refresh in seconds (0 = off) | 60 | Panel: *Devices & Services → AllBattery → Configure*<br>Web: in the form |
| Forecast module | on | as above |
| Forecast period in hours | 24 | as above |

## How the evaluation works

- **Detection:** entities with `device_class: battery`. In addition, sensors that measure in
  percent and whose name contains "battery" or "akku" are taken into account.
- **Groups:** Critical < 10 %, Warning < 20 %, Good ≥ 20 %. Entities that are not available
  (`unknown`/`unavailable`) show up as *Unknown/Offline*.
- **Forecast:** a line of best fit (least squares) is drawn through the history values of the
  selected period. Its slope gives the discharge rate in percent per hour; the remaining runtime
  is the current level divided by that rate.
- **Areas:** the area assignment is retrieved via the template API. This requires a user or token
  with **administrator rights**. Without admin rights the batteries are still fully displayed –
  only the area stays empty.

## Troubleshooting

- **No batteries visible?** AllBattery looks for entities with `device_class: battery`. Check
  *Developer Tools → States* in Home Assistant to see whether your battery sensors carry that
  attribute.
- **Areas stay empty:** the signed-in user does not have administrator rights (see above).
- **Web variant does not load data (CORS):** add the app's origin in Home Assistant under
  *Settings → System → Network → HTTP server → CORS allowed origins*, for example
  `http://localhost:5173` or `https://<user>.github.io`.
- **Panel stays empty:** check the browser console and restart Home Assistant once.

## License

MIT – see [LICENSE](LICENSE).

---

*Development, project structure and release notes: see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
(currently in German)*
