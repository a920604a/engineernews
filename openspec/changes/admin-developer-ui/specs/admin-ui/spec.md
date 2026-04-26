## ADDED Requirements

### Requirement: Token-protected admin page
The system SHALL expose a `/admin` route that requires a valid `ADMIN_TOKEN` to view any data. Requests without a valid token SHALL receive a 401 response.

#### Scenario: Valid token shows dashboard
- **WHEN** user visits `/admin` and provides a correct token
- **THEN** the dashboard renders with all pipeline panels visible

#### Scenario: Missing token shows auth prompt
- **WHEN** user visits `/admin` without a token
- **THEN** a token input form is shown and no infra data is exposed

#### Scenario: Wrong token returns 401
- **WHEN** `/api/admin/stats` is called with an incorrect token
- **THEN** the API returns HTTP 401 with `{ error: "Unauthorized" }`

---

### Requirement: Single stats API endpoint
The system SHALL provide `GET /api/admin/stats?token=<ADMIN_TOKEN>` that returns a single JSON response aggregating D1, R2, Vectorize, and config data. All sub-queries SHALL execute in parallel to minimise latency.

#### Scenario: Successful stats response
- **WHEN** a valid token is provided
- **THEN** the response includes `d1`, `r2`, `vectorize`, `config`, and `posts` keys

#### Scenario: Missing ADMIN_TOKEN env var
- **WHEN** `ADMIN_TOKEN` is not set in the environment
- **THEN** the endpoint returns HTTP 401 with `{ error: "Admin not configured" }`

#### Scenario: Partial failure does not crash
- **WHEN** one sub-query (e.g. R2 list) throws an error
- **THEN** that section returns `null` with an `error` string, and all other sections return normally

---

### Requirement: D1 overview panel
The system SHALL display row counts for all D1 tables: `posts`, `doc_chunks`, `projects`, `page_views`. Counts SHALL be fetched in a single batched D1 query.

#### Scenario: Counts displayed per table
- **WHEN** admin page loads
- **THEN** user sees row counts for posts, doc_chunks, projects, and page_views

#### Scenario: Lang distribution shown for posts
- **WHEN** admin page loads
- **THEN** user sees how many posts are `zh-TW` vs `en`

---

### Requirement: Vectorize overview panel
The system SHALL display the total chunk count from `doc_chunks` as a proxy for indexed vectors, alongside the configured embedding model name and index dimension.

#### Scenario: Vector count shown
- **WHEN** admin page loads
- **THEN** user sees total doc_chunks count labeled as "向量數（D1 代理）"

#### Scenario: Model and dimension shown
- **WHEN** admin page loads
- **THEN** user sees embedding model (`@cf/baai/bge-m3`) and dimension (`384`)

---

### Requirement: R2 overview panel
The system SHALL display the total number of objects in the `engineer-news-og-images` R2 bucket using `OG_IMAGES.list()`.

#### Scenario: Object count displayed
- **WHEN** admin page loads
- **THEN** user sees total OG image count in R2

#### Scenario: Count capped at 1000
- **WHEN** bucket has more than 1000 objects
- **THEN** UI shows "1000+" with a note that count is truncated

---

### Requirement: Post timeline panel
The system SHALL display all posts from D1 ordered by `created_at DESC`, showing: title, category, lang, created_at, and whether the post has at least one `doc_chunks` entry (vectorised status).

#### Scenario: Timeline renders all posts
- **WHEN** admin page loads
- **THEN** a list of posts is shown with title, category, lang badge, date, and a vector status indicator

#### Scenario: Unvectorised posts highlighted
- **WHEN** a post has zero doc_chunks entries
- **THEN** the post row shows a warning indicator (e.g. "未向量化")

---

### Requirement: AI search pipeline panel
The system SHALL display the currently configured embedding model, chat model, and Vectorize filter strategy as static config values read from the API response.

#### Scenario: Config values shown
- **WHEN** admin page loads
- **THEN** user sees embedding model, chat model, topK, max sources, and lang filter fields

---

### Requirement: Infra config panel
The system SHALL display static infra configuration: Cloudflare compatibility date, Astro output mode, D1 database name, R2 bucket name, and Vectorize index name.

#### Scenario: Config table rendered
- **WHEN** admin page loads
- **THEN** a read-only config table shows all infra identifiers

---

### Requirement: Client-side token persistence
The admin page frontend SHALL store the token in `localStorage` so users do not need to re-enter it on page refresh.

#### Scenario: Token persisted across refresh
- **WHEN** user successfully authenticates
- **THEN** token is saved to `localStorage` and auto-submitted on next visit

#### Scenario: Token cleared on 401
- **WHEN** API returns 401
- **THEN** the stored token is removed from `localStorage` and auth prompt is shown again
