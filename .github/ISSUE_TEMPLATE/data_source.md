---
name: New data source
about: Propose a new hazard data source or a change to an existing adapter
title: "[source] "
labels: ["data-source"]
---

## Source

- Name:
- Provider and homepage:
- Feed or API URL:
- Documentation URL:

## Hazard family

<!-- Which RiskSense hazard does this cover? Wildfire, flood, earthquake,
     severe weather, cyclone, volcano, landslide, drought, extreme heat, air
     quality, industrial incident, or another. -->

## Access and licensing

- [ ] The feed is publicly reachable without an account
- [ ] I have read the provider's terms and they permit this use
- [ ] The provider requires attribution, and I have noted how below
- [ ] The provider requires a key (describe how RiskSense should read it)

Attribution and terms notes:

## Update cadence and coverage

<!-- How often does the source update, and what area does it cover? This
     determines which time filters and freshness states are honest. -->

## Fields available

<!-- Which of these does the source give: location, time, severity, magnitude,
     confidence, an official warning flag, an event id, an area geometry? -->

## Would you like to implement it?

<!-- A new source should be one self-contained adapter under
     packages/data-sources/adapters/ and must not require changes elsewhere. -->

- [ ] Yes, I plan to open a pull request
- [ ] No, I am only suggesting it
