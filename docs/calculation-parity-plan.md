# Calculation Parity Plan

The desktop app must follow the existing web app calculation behavior. It is not a separate simplified MVP calculator.

## Current Desktop Core Scope

- Scope 1 and Scope 2 only.
- Scope 3 remains locked behind individual inquiry.
- Results are calculated in kgCO2e internally and displayed as tCO2e where appropriate.
- Equity share consolidation applies the same ownership factor rule as the web app.
- Scope 2 reports both:
  - Location-based emissions
  - Market-based emissions
- Scope 2 market-based handling follows the web app's current logic:
  - PPA quantity x PPA factor
  - REC quantity x 0 only when quality criteria are met
  - Green Premium quantity x 0 or supplier factor only when treated as renewable
  - Conventional or unallocated quantity x residual mix factor, falling back to grid factor

## Migrated Factor Data

The desktop core now imports the existing web app's Scope 1/2 type and factor files:

- `STATIONARY_FUELS`
- `MOBILE_FUELS`
- `PROCESS_MATERIALS`
- `FUGITIVE_GASES`
- `WASTE_SOURCES`
- `SCOPE2_FACTORS_BY_REGION`
- `SCOPE2_ENERGY_SOURCES`

## Next Required Migration Step

Wire the desktop UI and local project storage to this shared core so entered data uses the same source categories, units, factor names, power mix fields, and consolidation behavior as the web app.

The target remains deterministic parity with the deployed web app, not a reduced calculator.
