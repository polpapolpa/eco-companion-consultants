# Report satellite maps

The authenticated endpoint accepts only a report ID. It validates the user with Auth and reads the report through the caller's RLS view before any cached image or upstream request. It does not accept arbitrary coordinates, URLs, dates, scripts or provider credentials. An administrator-only `demo` action uses a fixed test coordinate, without creating a visit.

Set `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET` in Supabase Edge Function Secrets using a Copernicus Data Space General user OAuth client (Client Credentials flow, not SPA). Never put these values in Git, frontend configuration or chat. The initial OAuth setup uses a 90-day expiry; rotate the credential in Supabase before it expires. No paid provider endpoint, subscription or automatic upgrade is configured.

Deploy `connect-map` with gateway JWT verification disabled because its handler verifies the access token using `auth.getUser`, then enforces report RLS. Include index.ts, geometry.js and provider.js. Apply the report_satellite_map_cache migration first. The cache has no grants to customer roles and is accessed only after the endpoint's RLS check. Its RLS-without-policy advisory is intentional deny-all for clients; service_role is the sole database accessor.

The map uses the current report's Kobo `plot_profile/gps` and survey date. Missing or invalid GPS never produces an invented point. Future or invalid survey dates are rejected. Search the 60 days up to the survey date, select a recent Sentinel-2 L2A scene with product-level cloud cover at most 35%, and request a same-UTC-day true-color PNG with cloud/shadow/no-data pixels transparent. Product cloud cover is not a plot-specific cloud measurement. The client checks image coverage and draws the point, north arrow and approximate ground scale; gray means masked or missing data. Source resolution is 10 m even though the image is enlarged for display.

The figure shows a reference point and surrounding context, not a surveyed boundary or tree count. No GEE analysis, NDVI, polygon inference or survival-rate inference is performed. Web/PDF/Word share the same composed image and caption. Image errors and missing credentials remain explicit in all outputs. Ready snapshots are cached by report, coordinates, survey date and renderer version; successful images are reused. Failed/no-imagery requests are rate-limited and can be retried later. Concurrent generation is leased per cache key.

Edited automatic reports retain their narratives and auto_update flag while GPS alone can refresh from Kobo. Published and draft reports remain frozen. Current customer records without GPS require the field team to record the actual reference point in Kobo.

Provider documentation:
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Catalog/Examples.html
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process/Examples/S2L2A.html
