# Data Boundary Policy

This desktop app is designed so Scope 1 and Scope 2 project data stays on the user's machine by default.

## Data That Stays Local

- Fuel consumption
- Electricity and energy consumption
- Facility information
- Emission source details
- Calculation results
- Report source content
- Other project-level business data

## Data Sent Externally

The current desktop app sends only the minimum fields needed for licensing and update checks.

### License verification

Request target:
- `POST /api/licenses/verify`

Fields sent:
- `licenseKey`
- `appVersion`
- `deviceIdHash`

Fields not sent:
- Any activity data
- Any emission source records
- Any facility data
- Any calculation result
- Any report body

### Update check

Request target:
- `GET /api/updates/latest`

Purpose:
- Read latest version metadata for desktop updates

Fields not sent:
- Any project data
- Any emission inventory data

## Future Exceptions

External transmission may occur only if a future feature is explicitly enabled and implemented, such as:

- Cloud backup
- Web database sync
- External AI report generation
- Error tracking or analytics

Those features must be documented separately before release.
