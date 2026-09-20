# Anime Hub Feature Audit

## Reference surface reviewed

The public `animex.click` surface exposes a Persian anime catalogue organized around searchable titles, genre filters, release-year filters, and title cards. The cards visibly communicate episode/season progress, subtitle availability, MyAnimeList rating, age rating, poster art, title, and broadcast/completion status. The reference page also exposes separate animation and general-content genre taxonomies, a release-year archive, title detail pages, and a WordPress-backed content catalogue.

## Existing Jamino implementation

Jamino already contains an Anime Hub route with series, movies, and saved-list tabs; title search and genre filtering; title detail dialogs; trailer support; episode management; cover uploads; visibility controls; Anime Party creation; and a synchronized room player backed by `AnimeEpisode` and `Jam` playback state. The admin role model already includes `SUPER` and scoped `HUB` roles, with `ANIME` as a supported scope.

## Gaps selected for this implementation pass

1. The public hub does not yet expose a rich discovery surface comparable to the reference: featured, currently airing, newest, and top-rated sections should be visible without requiring a single filter state.
2. Episode rows are not yet a true watch surface in the title dialog. A user can inspect episodes and create a party, but cannot directly select an episode and begin playback from the hub.
3. The public API's `featured` flag overloads sorting and does not provide explicit sort modes or a useful section response.
4. The admin CMS has CRUD primitives but the workspace needs clearer overview metrics, filters, status visibility, and a more modern visual hierarchy.
5. Super-admin access is correctly environment-configured, but credentials must remain outside source control; the application should document a safe bootstrap path rather than hard-code a password.

## Design direction

Use a dark midnight canvas with electric violet, cyan, and warm amber accents. Public catalogue cards should feel like a streaming product: large visual hierarchy, compact metadata chips, hover actions, clear airing/completion states, and a focused detail/player modal. Admin should use the same brand palette with denser spacing, metric cards, status badges, and table-first workflows.

## Implementation boundary

This pass preserves the existing Prisma model and synchronized Anime Party protocol, extending the public catalogue API and UI without introducing an unsafe migration or storing credentials in Git. Later phases can add watch history, ratings, comments, and richer provider integrations as separate schema-backed features.
