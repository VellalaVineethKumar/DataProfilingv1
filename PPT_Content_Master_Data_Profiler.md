# Master Data Profiler — Business Presentation Content

> **Purpose**: This document contains all slide content, speaker notes, brand guidelines, and screenshot placeholders needed to generate a professional 18-slide PowerPoint presentation. Target audience is a **mixed group of business owners, data/analytics leaders, and decision-makers**.

---

## Brand Guidelines

### Colour Palette

| Role | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Primary** | `#B60003` | RGB(235, 28, 31) | Headlines, accent bars, CTAs, key icons |
| Primary Light 1 | `#ED5556` | RGB(237, 85, 86) | Hover states, secondary highlights |
| Primary Light 2 | `#EF7575` | RGB(239, 117, 117) | Cards / badges |
| Primary Light 3 | `#F18E8E` | RGB(241, 142, 142) | Backgrounds, subtle fills |
| Primary Light 4 | `#F3A3A3` | RGB(243, 163, 163) | Borders, dividers |
| **Supporting (Dark)** | `#221E1F` | RGB(34, 30, 31) | Slide backgrounds, body text |
| Supporting Mid 1 | `#575656` | RGB(87, 86, 86) | Subheadings, secondary text |
| Supporting Mid 2 | `#767575` | RGB(118, 117, 117) | Captions, muted text |
| Supporting Light 1 | `#8F8E8E` | RGB(143, 142, 142) | Disabled / placeholder text |
| Supporting Light 2 | `#A3A3A3` | RGB(163, 163, 163) | Borders, dividers |
| **White** | `#FFFFFF` | — | Text on dark backgrounds, card fills |
| **Success Green** | `#10B981` | — | Positive indicators, checkmarks |
| **Warning Amber** | `#F59E0B` | — | Warnings, medium-risk items |

### Typography

- **Headlines**: Bold sans-serif (Segoe UI, Inter, or Montserrat), white or `#B60003` on dark
- **Body text**: Regular weight, `#FFFFFF` on dark backgrounds or `#221E1F` on light
- **Captions / labels**: `#767575` or `#A3A3A3`

### Visual Style

- Dark slide backgrounds using `#221E1F`
- Cards / content panels using slightly lighter shade `rgba(255,255,255,0.05)` or `#2A2627`
- Primary red `#B60003` for accent bars, underlines, and key highlights
- Rounded corners (8-12 px) on all cards and shapes
- Generous whitespace — do not overcrowd slides
- Icon style: outlined/line icons, white or primary red

---

## Slide-by-Slide Content

---

### Slide 1 — Title Slide

**Layout**: Full dark background (`#221E1F`), thin vertical red accent stripe on left edge

| Element | Content |
|---------|---------|
| **Product Name** | MASTER DATA PROFILER |
| **Tagline** | Automated Data Quality & Profiling Platform |
| **Subtitle** | Turn raw data into trusted, actionable insights — in minutes, not months. |
| **Footer** | Business Overview · April 2026 |

**Speaker Notes**:
Welcome everyone. Today I'll walk you through Master Data Profiler — a self-service platform that automates data profiling, enforces quality rules, and gives your teams real-time visibility into data health. We built this to eliminate the manual grunt work that keeps analysts from doing strategic analysis.

---

### Slide 2 — Agenda

**Layout**: Numbered list on dark background, numbers in `#B60003`, text in white

| # | Agenda Item |
|---|-------------|
| 01 | The Problem — Why Data Quality Matters |
| 02 | Product Overview & Key Capabilities |
| 03 | Live Dashboard & Profiling Features |
| 04 | Data Quality Engine & AI Recommendations |
| 05 | Enterprise Connectivity — 15+ Databases |
| 06 | Duplicate Detection & Data Comparison |
| 07 | Reporting, Export & API |
| 08 | Architecture, Security & Deployment |
| 09 | Competitive Advantages |
| 10 | Roadmap & Next Steps |

**Speaker Notes**:
Here is our agenda for today. We'll start with the business problem, dive into the product capabilities, then cover the enterprise aspects — security, deployment, and our roadmap.

---

### Slide 3 — The Problem

**Layout**: Dark background, bold stat callout at top, 5 pain-point bullets, quote card at bottom

**Stat Callout** (large, `#B60003` text):
> Bad data costs the average enterprise **$12.9 Million per year** — Gartner

**Pain Points**:
1. **Manual profiling is slow** — analysts spend 40–60% of their time cleaning and understanding data before any analysis begins
2. **Inconsistent quality checks** — different teams apply different rules, leading to conflicting reports and eroded trust
3. **No single view of data health** — quality issues hide across dozens of databases, files, and pipelines with no unified dashboard
4. **Compliance & audit risk** — without lineage and audit trails, demonstrating regulatory compliance becomes a manual scramble
5. **Silent data drift** — upstream schema changes and distribution shifts go undetected until downstream models and reports break

**Quote Card** (subtle card at bottom):
> "We need a platform that automates data profiling, enforces quality rules, and provides real-time visibility — without requiring a dedicated data engineering team."

**Speaker Notes**:
Let me set the stage. Gartner estimates bad data costs enterprises almost $13 million a year. Our analysts spend the majority of their time just cleaning data. Quality checks are inconsistent across teams. There's no unified view. And when data drifts silently, we don't find out until something breaks downstream. That's exactly the gap Master Data Profiler fills.

---

### Slide 4 — Section Divider

**Layout**: Full-width red (`#B60003`) accent bar across centre of dark slide

| Element | Content |
|---------|---------|
| **Title** | PRODUCT DEEP DIVE |
| **Subtitle** | Capabilities that set us apart |

---

### Slide 5 — Product Overview

**Layout**: 4 equal-width cards on dark background, each card with icon area, title, description

**Card 1 — Instant Profiling**
- Upload CSV, Excel, Parquet, JSON, JSONL, or Feather files (up to 1 GB)
- Or connect directly to 15+ databases via SQLAlchemy
- Full column-level profiling completes in seconds

**Card 2 — Quality Rules Engine**
- 50+ built-in validation rule types
- AI-powered rule recommendations (Azure OpenAI)
- Import/export rule sets as JSON for team sharing

**Card 3 — Live Dashboard**
- KPI cards: rows, columns, missing cells, duplicates, quality score
- Quality gauge, null heatmap, data-type distribution
- Column risk overview with severity ratings

**Card 4 — Enterprise Ready**
- Role-based authentication with hashed passwords
- Full audit trail of every action (who, what, when)
- Docker deployment, REST API, PDF/HTML report generation

**Speaker Notes**:
At its core, Master Data Profiler does four things exceptionally well. First, instant profiling — load any file or connect to any database and get a complete profile in seconds. Second, a powerful quality rules engine with AI-powered suggestions. Third, a live dashboard that gives you a single pane of glass into data health. And fourth, enterprise-grade features like auth, audit trails, Docker deployment, and API access.

---

### Slide 6 — Dashboard

**Layout**: Left half = screenshot placeholder, Right half = 6 feature descriptions

`[SCREENSHOT PLACEHOLDER: Dashboard tab showing KPI cards (Rows, Columns, Missing Cells, Missing %, Duplicates, Quality Score), quality gauge, top issues panel, data-type pie chart, and null-percentage bar chart]`

**Feature highlights** (right side):
1. **KPI Cards** — Rows, Columns, Missing Cells, Missing %, Duplicates, Quality Score at a glance
2. **Quality Gauge** — 0–100 score with colour-coded ranges (red / amber / green)
3. **Top Issues Panel** — Ranked by severity (critical → warning → info) with colour-coded bars
4. **Data Type Distribution** — Donut chart showing dtype breakdown
5. **Missing-Value Chart** — Horizontal bar chart of top 10 null-heavy columns
6. **Column Risk Overview** — Low / Medium / High risk counts with metrics
7. **Recent Operations** — Live audit of actions taken on the dataset

**Speaker Notes**:
Here's the dashboard. The moment you load a dataset, you see these KPI cards across the top. The quality gauge gives you a single number from 0 to 100. Below that, issues are auto-ranked by severity. On the right, you can see data-type distribution and which columns have the most missing values. At the bottom, a risk overview and recent operations log.

---

### Slide 7 — Profiling Capabilities

**Layout**: Two-column card layout on dark background

**Left Column — Statistical Profiling**:
- Column-level statistics: mean, median, mode, std, min, max, quartiles
- Null / missing-value analysis with visual heatmaps
- Unique-value & cardinality analysis
- Data-type detection and distribution charts
- Cross-column correlation matrix (Pearson) with highly-correlated pair highlighting
- Statistical distribution identification

**Right Column — Advanced Analysis**:
- Duplicate row detection: exact match, fuzzy match (Levenshtein), combined match
- Pattern analysis for string columns (email, phone, date formats)
- Outlier detection using IQR and z-score methods
- Large-file support with streaming & chunked loading (up to 1 GB)
- Multi-file comparison across datasets
- Data drift detection against saved baselines

`[SCREENSHOT PLACEHOLDER: Data Profiling tab — Overview sub-tab showing column statistics table with expandable rows, and the Correlation Matrix heatmap below]`

**Speaker Notes**:
The profiling engine covers everything from basic stats like mean and median, to advanced features like cross-column correlations, outlier detection, and fuzzy duplicate matching. It handles files up to 1 GB through chunked streaming, and you can compare multiple files side by side or detect drift against a baseline.

---

### Slide 8 — Data Quality Engine

**Layout**: Two cards side by side

**Left Card — Built-in Rule Types**:
- Not-null / completeness checks
- Uniqueness constraints
- Range & boundary validation (min/max)
- Regex pattern matching
- Allowed-value (enum) lists
- Cross-column consistency rules
- Custom SQL expressions
- Configurable thresholds per rule per column

**Right Card — AI-Powered Recommendations**:
- Azure OpenAI integration for intelligent rule suggestions
- Heuristic fallback when LLM is unavailable
- Auto-detects email, phone, date, currency patterns from sample data
- Smart threshold calibration based on statistical distribution
- One-click accept & apply suggested rules
- Persistent rule library — save, share & reuse rule sets across projects and teams
- Import/export rules as JSON

`[SCREENSHOT PLACEHOLDER: Data Quality tab showing the rule configuration table, AI suggestion popover, and the "Save to Library" / "Load from Library" buttons]`

**Speaker Notes**:
The quality engine has two layers. First, a library of built-in rule types — null checks, uniqueness, range validation, regex, enums, and more. Second, an AI layer powered by Azure OpenAI that analyses a sample of your data and recommends rules automatically. If the LLM isn't configured, a heuristic engine kicks in. And all rules can be saved to a persistent library for reuse across teams and projects.

---

### Slide 9 — Enterprise Connectivity

**Layout**: 3×5 grid of database cards, subtitle above, feature bullets below

**Headline**: Connect to 15+ Databases — One Unified Interface

**Database Grid** (each in its own small card):

| | | | | |
|---|---|---|---|---|
| PostgreSQL | MySQL | MariaDB | SQL Server | Oracle |
| SQLite | IBM Db2 | Snowflake | BigQuery | Redshift |
| CockroachDB | DuckDB | Teradata | SAP HANA | Apache Hive |

**Key Points Below Grid**:
- Powered by **SQLAlchemy** — zero vendor lock-in
- All engines visible in UI even if driver not installed — clear install hints provided
- Browse schemas, tables, and views with built-in introspection
- Run custom SQL queries directly from the UI
- Support for raw SQLAlchemy URL input for power users
- Secure password handling with URL-safe encoding

`[SCREENSHOT PLACEHOLDER: Load Data tab → "Connect to Database" section showing the Database Engine dropdown with all 15 engines listed, connection fields (host, port, database, user, password), and the "Connect" button]`

**Speaker Notes**:
We support 15 database engines today through SQLAlchemy. PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, BigQuery, Redshift, and more. The UI shows all of them — if a driver isn't installed, users get the exact pip install command. You can browse schemas and tables visually or paste a raw connection string. No vendor lock-in.

---

### Slide 10 — File Formats & Multi-File Analysis

**Layout**: Two cards side by side

**Left Card — Supported File Formats**:
- **CSV / TSV / TXT** — with delimiter and encoding auto-detection
- **Excel** (.xlsx, .xls) — multi-sheet support
- **JSON** — nested and flat structures
- **JSONL** — streaming line-delimited JSON
- **Parquet** — columnar analytics format (compressed)
- **Feather** — fast in-memory interchange format
- Files up to **1 GB** supported via chunked streaming upload

**Right Card — Multi-File Comparison**:
- Upload multiple files side by side (2+)
- Schema alignment and column-name diff view
- Row-count and null-percentage comparison per file
- Common-column bar charts for visual comparison
- Identify discrepancies across data sources instantly
- Ideal for **migration validation**, **ETL QA**, and **monthly extract comparison**

`[SCREENSHOT PLACEHOLDER: Multi-File tab showing two uploaded CSV files with schema comparison table and null-percentage bar chart]`

**Speaker Notes**:
We support six file formats including Parquet and Feather for modern data stacks. Files up to 1 GB are handled via chunked streaming. The multi-file tab lets you upload multiple extracts — say January vs February data — and instantly compare schemas, row counts, and null percentages side by side. This is invaluable for ETL QA and data migration validation.

---

### Slide 11 — Duplicate Detection

**Layout**: Three cards in a row

**Card 1 — Exact Match**:
- Identifies rows that are 100% identical across all or selected columns
- Configurable column subset for matching
- One-click removal with undo capability

**Card 2 — Fuzzy Match**:
- Levenshtein distance-based similarity scoring
- Configurable similarity threshold (0–100%)
- Groups similar records for manual review

**Card 3 — Combined Match**:
- Blends exact and fuzzy matching strategies
- Weighted scoring across multiple columns
- Best for real-world deduplication (name + address + phone)

`[SCREENSHOT PLACEHOLDER: Find Duplicates tab showing the Fuzzy Match sub-tab with duplicate groups, similarity scores, and the "Remove Group" action buttons]`

**Speaker Notes**:
Duplicate detection goes beyond simple exact matching. We offer three modes: exact match for perfect duplicates, fuzzy match using Levenshtein distance for near-duplicates like misspelled names, and a combined mode that blends both. Each mode lets you select which columns to compare and set your threshold.

---

### Slide 12 — Data Drift Detection

**Layout**: 4-step horizontal flow on dark background

**Headline**: Catch Silent Data Degradation Before It Impacts Decisions

| Step | Title | Description |
|------|-------|-------------|
| **1** | Save Baseline | Capture today's profile as the reference snapshot — null rates, means, unique counts per column |
| **2** | Re-Profile Later | Load new data (daily feed, monthly refresh, API extract) and run profiling again |
| **3** | Detect Drift | Automatic comparison flags columns with null-rate shifts, mean changes, and cardinality drift beyond your threshold |
| **4** | Alert & Act | Visual drift report highlights drifted columns with severity indicators — investigate and fix before downstream impact |

**Key Metrics Tracked**:
- Null percentage shift
- Mean / median shift (numeric columns)
- Unique-value count change
- Data-type changes
- Configurable drift thresholds

`[SCREENSHOT PLACEHOLDER: Data Profiling tab → Data Drift sub-tab showing a drift comparison table with baseline vs. current values and drift severity flags]`

**Speaker Notes**:
Data drift is one of the most dangerous problems because it's silent. A column that used to be 2% null suddenly becomes 40% null, and nobody notices until a dashboard breaks. Our drift detector lets you save a baseline, then automatically flag any column that moves beyond your threshold. This is critical for ML model monitoring, financial reporting, and ETL pipelines.

---

### Slide 13 — Before/After Comparison

**Layout**: Split-screen visual

**Headline**: Track Every Transformation

- Side-by-side view of original data vs. current (cleaned) data
- Cell-level change highlighting
- Summary statistics comparison (row count, column count, changes made)
- Full undo capability — revert any operation
- Operations logged in the audit trail

`[SCREENSHOT PLACEHOLDER: Compare tab showing original data on the left panel and modified data on the right panel with highlighted differences]`

**Speaker Notes**:
Every change you make in the platform is tracked. The Compare tab shows original versus current data side by side with cell-level highlighting. Combined with the audit trail, you have full traceability of every transformation — which is essential for compliance and reproducibility.

---

### Slide 14 — Reporting & Export

**Layout**: 5 horizontal feature rows (icon + title + description)

| Feature | Description |
|---------|-------------|
| **PDF Reports** | Comprehensive profiling reports with tables, quality scores, and issue summaries — ready for management review and compliance documentation |
| **HTML Reports** | Shareable single-file HTML reports that open in any browser — no software needed by recipients |
| **Data Export** | Download cleaned data in CSV, Excel, JSON, Parquet, or Feather format with column selection and row filtering |
| **Rule Export** | Export / import quality rule configurations as JSON — share standardised rules across teams and projects |
| **REST API** | FastAPI-powered programmatic access — upload files, run profiling, retrieve audit logs. Integrate with CI/CD pipelines and orchestrators |

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profile/upload` | Upload a file and get a profiling report |
| POST | `/profile/query` | Profile a SQL query result |
| GET | `/health` | Health check |
| GET | `/audit` | Retrieve audit log entries |

`[SCREENSHOT PLACEHOLDER: Export tab showing format selection dropdown (CSV, Excel, Parquet, JSON, Feather), column selection multiselect, and the "Generate PDF Report" / "Generate HTML Report" buttons]`

**Speaker Notes**:
For reporting, you can generate PDF or HTML reports with one click — perfect for sharing with stakeholders who don't have access to the tool. Data can be exported in five formats. Quality rules can be exported as JSON for standardisation. And for automation, we have a full REST API — you can integrate profiling into your CI/CD pipeline so every data deployment gets automatically quality-checked.

---

### Slide 15 — Section Divider

**Layout**: Full-width red accent bar

| Element | Content |
|---------|---------|
| **Title** | ENTERPRISE GRADE |
| **Subtitle** | Architecture · Security · Deployment |

---

### Slide 16 — Architecture & Deployment

**Layout**: 5-layer architecture diagram (stacked horizontal bars with coloured left accent)

| Layer | Components |
|-------|-----------|
| **Presentation** | Streamlit interactive UI · Responsive layout · Plotly visualisations |
| **API** | FastAPI REST endpoints · Pydantic validation · Health checks |
| **Core Engine** | Pandas profiler · Quality rules engine · Drift detector · AI recommendations |
| **Persistence** | SQLite (rules library, audit log, projects, baselines) · File system · Session state |
| **Connectivity** | SQLAlchemy (15+ DB drivers) · File parsers (6 formats) · Chunked upload handler |

**Deployment Options**:
- **Docker** — `docker-compose up` single-command deployment with health checks
- **Bare metal** — `streamlit run app.py` directly on any Python 3.11+ environment
- **Cloud** — Deploy to AWS ECS, Azure Container Instances, GCP Cloud Run, or any K8s cluster
- Built-in **health check** endpoint for container orchestration

**Speaker Notes**:
The architecture is clean and modular. Five layers — presentation, API, core engine, persistence, and connectivity. Everything is containerised with Docker and docker-compose. A single `docker-compose up` gets you running with health checks built in. Or deploy directly to any cloud container service.

---

### Slide 17 — Security & Governance

**Layout**: Two cards side by side

**Left Card — Access Control**:
- User authentication with **salted SHA-256 password hashing**
- Automatic migration from plaintext to hashed passwords
- Role-based access: admin and analyst roles
- Session management with configurable timeout
- Secrets management via Streamlit `secrets.toml` (never in code)
- No plaintext passwords stored anywhere

**Right Card — Audit & Compliance**:
- **Full audit trail** — every action logged with timestamp, username, action, category
- Persistent SQLite-backed audit log (survives restarts)
- Audit log visible in sidebar for real-time review
- Export audit records for compliance reporting
- **Project workspaces** — isolate data and rules per team/project
- Snapshot management — save and restore project states

**Speaker Notes**:
Security is built in from the ground up. Passwords are hashed with salted SHA-256. We have role-based access and full audit logging. Every action — data load, rule change, export — is recorded with who did it and when. The audit log is persistent and exportable for compliance. And project workspaces let you isolate data by team or initiative.

---

### Slide 18 — Competitive Advantages

**Layout**: Comparison table (3 columns)

| Capability | Master Data Profiler | Typical Tools |
|-----------|---------------------|---------------|
| **Setup time** | < 5 minutes (Docker) | Days to weeks |
| **Database support** | 15+ via SQLAlchemy | 3–5 connectors |
| **AI rule suggestions** | Built-in (Azure OpenAI + heuristic fallback) | Add-on or none |
| **Data drift detection** | Included | Separate product |
| **Duplicate detection** | Exact + Fuzzy + Combined | Exact only |
| **Audit trail** | Built-in persistent log | Manual / external |
| **PDF / HTML reports** | One-click generation | Custom scripting |
| **REST API** | Included (FastAPI) | Enterprise tier only |
| **Multi-file comparison** | Built-in | Not available |
| **Self-hosted option** | Yes (Docker / bare-metal / cloud) | Cloud-only lock-in |
| **Pricing model** | Internal / open tool | $$$$ per seat per year |

**Formatting Note**: Highlight the "Master Data Profiler" column values in `#10B981` (green) and the "Typical Tools" column values in `#A3A3A3` (grey) to create visual contrast.

**Speaker Notes**:
Here's how we stack up. Five-minute setup versus weeks. Fifteen databases versus three to five. Built-in AI suggestions, drift detection, fuzzy deduplication — features that competitors charge extra for or don't offer at all. Self-hosted with no per-seat licensing. This is a purpose-built tool that punches well above its weight.

---

### Slide 19 — Roadmap & Vision

**Layout**: 4 timeline columns (Q2 2026 → 2027+), red accent bar on current quarter

**Q2 2026 — Current** (accent bar in `#B60003`):
- 15+ database connectors via SQLAlchemy
- AI-powered rule recommendations
- Data drift detection with baselines
- PDF / HTML report generation
- Docker & docker-compose deployment
- REST API (FastAPI)

**Q3 2026**:
- Scheduled profiling jobs (cron-based)
- Email & Slack alerting for quality threshold breaches
- Column-level data lineage tracking
- Enhanced regex pattern library
- Team collaboration features

**Q4 2026**:
- Automated data remediation (auto-fix common issues)
- ML-powered anomaly detection
- Custom dashboard builder
- SSO / LDAP / Active Directory integration
- Kubernetes-native deployment (Helm chart)

**2027+**:
- Federated profiling across distributed nodes
- Real-time streaming data profiling (Kafka / event-driven)
- Data catalog integration (Apache Atlas, OpenMetadata)
- Community marketplace for shared rule libraries
- Mobile-responsive dashboard

**Speaker Notes**:
Here's where we're headed. This quarter, we've delivered the 15 database connectors, AI recommendations, drift detection, and Docker deployment you've seen today. In Q3, we're adding scheduled jobs and alerting. Q4 brings SSO and Kubernetes support. And looking into 2027, we're building toward real-time streaming profiling and a community marketplace for shared rules.

---

### Slide 20 — Next Steps

**Layout**: 3 numbered circles with title + description, closing tagline at bottom

| Step | Title | Description |
|------|-------|-------------|
| **1** | **Live Demo** | Schedule a 30-minute walkthrough with your data team. We'll profile your real datasets and show the quality engine in action. |
| **2** | **Pilot Program** | Deploy on a single use case — monthly financial close, CRM data refresh, or ETL pipeline QA — and quantify the time savings. |
| **3** | **Rollout & Scale** | Expand to additional teams and data sources. Leverage Docker for enterprise-wide deployment with full audit trails. |

**Closing Tagline** (centred, `#B60003`):
> Let's turn your data into your competitive advantage.

**Speaker Notes**:
So here's our ask. First, let us do a live demo on your actual data — it takes 30 minutes and the impact is immediate. Second, pick one use case for a pilot — maybe your monthly close process or a critical ETL pipeline. We'll measure the time savings and quality improvement. Third, once proven, roll out across teams with Docker. We're here to support you at every step.

---

### Slide 21 — Thank You

**Layout**: Centred text on dark background, red accent stripe on left

| Element | Content |
|---------|---------|
| **Main Text** | Thank You |
| **Product Name** | Master Data Profiler |
| **CTA** | Questions? · Demo? · Let's Talk. |

---

## Screenshot Placeholder Summary

For the person assembling the final presentation, here is a list of all screenshots needed:

| Slide | Screenshot Description | Where to Capture |
|-------|----------------------|------------------|
| 6 | Dashboard with KPI cards, quality gauge, top issues, charts | App → Dashboard tab (with data loaded) |
| 7 | Profiling overview with column stats and correlation heatmap | App → Data Profiling tab → Overview |
| 8 | Quality rules table with AI suggestion and rule library buttons | App → Data Quality tab |
| 9 | Database connector UI with engine dropdown and connection fields | App → Load Data tab → Connect to Database section |
| 10 | Multi-file upload with schema comparison | App → Multi-File tab (upload 2+ files) |
| 11 | Fuzzy duplicate groups with similarity scores | App → Find Duplicates tab → Fuzzy Match |
| 12 | Drift comparison table with baseline vs current | App → Data Profiling tab → Data Drift |
| 13 | Before/after data comparison with highlights | App → Compare tab |
| 14 | Export tab with format options and report buttons | App → Export tab |

**Tip**: Use a sample dataset with realistic data (e.g., customer records with names, emails, phone numbers, dates, and some intentionally missing values) to make the screenshots compelling.

---

## Presentation Metadata

| Property | Value |
|----------|-------|
| Slide count | 21 (including 2 section dividers) |
| Aspect ratio | 16:9 (widescreen) |
| Target duration | 25–30 minutes + Q&A |
| Audience | Mixed — business owners, data/analytics leaders, decision-makers |
| Tone | Professional, confident, outcome-focused |
| Product name | Master Data Profiler |
| Date | April 2026 |
