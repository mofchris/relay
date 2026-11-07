# Relay design notes

## Idea

**The page is ad inventory.** The landing page is an ad-supported article about how an ad auction
works, and its five ad slots are the demonstration. They are sold on the server when the page opens,
to six fictional advertisers, and each one shows its receipt and the auction behind it.

- **Anchor:** the five placements the API sells (leaderboard, medium rectangle, native in-feed,
  interstitial, video pre-roll), drawn at their standard ad-ops sizes.
- **Signature:** pick a different reader and the whole page is sold again: every slot wipes to its new
  winner. With nothing picked, the page re-sells itself every 7 s while the top of it is on screen.
- **Motion verb:** *fill.* Creatives wipe in over hatched, unsold inventory (`clip-path`), and buttons
  flood magenta from the bottom edge. One easing: `--ease-fill`.
- **Frequency cap:** an advertiser wins at most one slot per page view, so the page shows a spread of
  advertisers. This is a real ad-serving rule, enforced on the server.

## System

| Role | Light | Dark |
| --- | --- | --- |
| ground (paper) | `#ffffff` | `#0b0b0c` |
| ink | `#0a0a0b` | `#f1f1f2` |
| muted | `#5c5f66` | `#9a9ca3` |
| line | `#e3e4e8` | `#26272b` |
| spec (magenta measurement lines, focus, price marker) | `#d6006f` | `#ff4fa3` |

- **Colour comes from the sold ads.** The site itself is black, white and magenta. Each fictional
  advertiser has its own colours and mark (`src/lib/brands.ts`), used only inside its creative and its
  winning bar on the ladder.
- **Type:** Switzer for everything, with display sizes at weight 700 and tight tracking.
  JetBrains Mono is used only for measurements and money (slot sizes, prices, scores).
- **Shape:** square corners. Slots are rectangles because ads are; unsold space is hatched.
- **Honesty in place:** every creative carries an "Ad" badge and "Fictional advertiser". The article
  has an advertising disclosure listing what is real and what is made up.
- **Accessibility:** skip link, one `h1` per page, magenta focus ring, creatives exposed as labelled
  images, the ladder mirrored as an ordered list. Under reduced motion there are no wipes and no idle
  re-selling.
