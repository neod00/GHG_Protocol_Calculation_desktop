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

## Next Required Migration Step

The current core package contains the calculation algorithm and representative Scope 1/2 factor data.
The next step is to migrate the full existing web app factor set for:

- `STATIONARY_FUELS`
- `MOBILE_FUELS`
- `PROCESS_MATERIALS`
- `FUGITIVE_GASES`
- `WASTE_SOURCES`
- `SCOPE2_FACTORS_BY_REGION`
- `SCOPE2_ENERGY_SOURCES`

The target is deterministic parity with the deployed web app, not a reduced calculator.
