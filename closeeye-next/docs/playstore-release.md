# Google Play Release

## Store listing

- **App name**: CloseEye
- **Short description** (≤80): Trusted human presence for the people you love — across India.
- **Full description**: Close Eye brings a trusted, background-verified human presence to
  elderly parents and loved ones — home wellbeing visits, hospital companionship and warm
  reports after every visit, coordinated by a dedicated Presence Manager. Families stay
  close, wherever they are. *(Expand with the marketing copy from `/about` and `/services`.)*
- **Category**: Health & Fitness (or Medical). **Content rating**: Everyone.
- **Contact**: hello@closeeye.in · +91 90002 21261 · https://closeeye.in
- **Privacy policy URL**: https://closeeye-next.vercel.app/privacy

## Data safety form (Play Console)

Declare collection + purpose (app-functionality / account management), encrypted in
transit, user can request deletion (Settings → Delete account):

| Data | Collected | Why |
|---|---|---|
| Name, phone, email | Yes | Account, visit coordination |
| Approximate/precise location | Yes | Verify Guardian arrival, match nearby care |
| Photos | Yes | Visit reports, documents |
| Health info (visit notes) | Yes | Deliver and report on care |
| Payment info | Via processor | Membership (handled by the payment gateway) |

## Permissions list

Camera · Microphone · Location (fine/coarse) · Notifications · Media images · Biometric ·
Vibrate · Internet. Each requested in-context at first use.

## Assets required

- Feature graphic **1024×500**.
- Phone screenshots **≥2** (min 1080px). Recommended: Home, Family Space, a Visit Report,
  Guardian visit, Choose Your Membership.
- (Optional) 7" & 10" tablet screenshots.
- Hi-res icon **512×512** (generated).

> Screenshots must be captured from the running app on a device/emulator — not available
> from this Windows scaffold environment.

## Release steps

1. Build the signed **.aab** (`android-build.md`).
2. Play Console → create app → **Internal testing** track → upload `.aab`.
3. Complete: Store listing, Data safety, Content rating, Target audience, Ads (none).
4. Promote Internal → Closed → Open → Production.
5. Roll out with a **staged rollout** (e.g. 10% → 100%).

## Release notes (v1.0.0)

> The first Close Eye app. Book trusted visits, stay close with warm reports, and reach a
> real human whenever you need one. Care beyond presence.

## Pre-launch checklist

- [ ] Signed `.aab` uploaded to Internal testing
- [ ] Data safety + permissions justified
- [ ] Privacy policy live and linked
- [ ] Screenshots + feature graphic
- [ ] Deep-link (App Links) domain verification if enabling https links
- [ ] FCM configured for push (see readiness report)
- [ ] Crash reporting enabled
