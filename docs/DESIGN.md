# Relay design notes

## Idea

Every ad slot is an auction, and Relay shows the whole auction instead of just the winner. The
interface borrows from a trading **price ladder**: ranked rows, bars as long as each bidder's score,
and one marked line where the price is set.

- **Signature:** the bid ladder (`src/components/Ladder.tsx`). Bidders slide to their new rung and
  their bars extend when the audience changes. A solid marker sits at the score the winner had to beat,
  and a dashed marker shows the floor. Campaigns that sit out are hatched.
- **Motion verb:** *lock in.* Things move fast and stop decisively (`--ease-lock`,
  `cubic-bezier(0.16, 1, 0.3, 1)`). Nothing bounces.
- **Idle state:** on the landing page the live auction steps through audiences every 5 s while it is
  on screen, until the visitor picks one. Every frame is a real result from the API.
- **Hover:** primary buttons and nav links roll their label like a price tick (`.roll`). Utility links
  only change color or underline.

## System

| Role | Light | Dark |
| --- | --- | --- |
| ground (aluminium) | `#f2f4f7` | `#090c14` |
| raised | `#ffffff` | `#101522` |
| ink (carbon) | `#0c1222` | `#e8ebf2` |
| muted | `#4b5568` | `#98a1b3` |
| line | `#d3d8e0` | `#242c3c` |
| accent (cobalt, "won") | `#1f3bff` | `#7489ff` |

Cobalt only marks the winner and primary actions. Muted text and the accent pass WCAG AA in both
themes.

- **Type:** Archivo variable. Display text is set at width 125% and weight 800 with negative tracking;
  body text at width 100%. Martian Mono is used only for numbers that line up (scores, prices, ids).
- **Shape:** pill buttons and chips, 0.6 to 1.25 rem radius on fields and panels, 3 px on bars.
- **Motion:** transforms and opacity only. Under `prefers-reduced-motion` every transition and
  animation is cut to 1 ms and the idle cycle doesn't run.
- **Accessibility:** skip link, one `h1` per page, a visible focus ring in the accent, and the ladder
  mirrored as an ordered list for screen readers (the bars are `aria-hidden`).
- **No smooth-scroll library and no WebGL.** This is a working console with independent panes; the
  craft is in the type, the ladder and the states.
