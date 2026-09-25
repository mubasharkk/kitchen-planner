# Kitchen Planner

A 3D planner for IKEA METOD kitchens. Paste links to IKEA products, enter the
room's size and pick a layout, and the planner arranges the cabinets and
appliances, fills the gaps with standard items, and renders the result in 3D
with a shopping list and an estimated total.

Built with Laravel 13 (PHP 8.4) and TypeScript + Three.js, run with Laravel Sail.
Laravel Boost is installed for agent tooling, and the code follows the
conventions its `laravel-best-practices` skill describes.

## What it does

- **Reads IKEA links** — `https://www.ikea.com/<country>/<lang>/p/<name>-<article>/`.
  The server fetches the page and reads the name, article number, price, image
  and measurements (JSON-LD, meta tags, labelled "Breite / Width" values). If
  IKEA can't be reached or blocks the request, the product is still created
  from the link (type from the name, METOD standard size) and marked
  *estimated*, so you can correct its width in the sidebar.
- **Knows what each product is** — base cabinets, drawer units, sink cabinets,
  corner units, dishwashers, ovens, high cabinets, fridges, wall cabinets,
  hoods, hobs, sinks, taps, worktops, handles… in English and German wording.
  The type can be changed per product.
- **Lays out the kitchen** for four shapes: straight, L, U and galley.
  - sink with the dishwasher beside it; hob on an oven or drawer unit, with a
    hood above it and at least one cabinet between sink and hob
  - fridge and high cabinets at the end of a run, against the wall
  - corner units in L/U layouts; side runs stop 1 m short of the wall unless
    you set their length
  - your own products are placed first; with **auto-fill** on, the remaining
    space is filled with the widths that fit best (80/60/40/30/20 cm) and
    missing essentials are added; what's left over becomes a filler strip
  - wall cabinets above the worktop, stopping at high cabinets and the hood;
    skipped (with a warning) if the ceiling is too low
  - worktops, plinths, cover panels for exposed sides and handles are counted
    for the shopping list
- **Warns** about things that don't fit, narrow walkways, empty wall space and
  low ceilings.
- **3D view** — orbit/zoom, 3D / front / top cameras, hover a unit to see what
  it is; six front colours, four worktops, three handle finishes.
- **Shopping list** — your products and the suggested ones, with prices
  (catalog prices are estimates and link to an IKEA search), CSV download and a
  PNG of the view.
- **Save & share** — plans are stored in the database and open at
  `/plans/<uuid>`. The last plan is also kept in the browser.

## Getting started

Requirements: Docker Desktop, and PHP + Composer locally if you have them.

```bash
./bin/setup
```

The first `composer install` runs with your local Composer, since Sail itself
lives in `vendor/`; with no local Composer the script bootstraps it in a
container instead. After that everything goes through
`./vendor/bin/sail composer|npm|artisan`: the script starts Sail (app + MySQL),
installs the packages inside the container, migrates and builds the frontend.
Then open <http://localhost:8080>.

Step by step, if you'd rather run it yourself:

```bash
cp .env.example .env
composer install                         # local Composer, just to get vendor/bin/sail
./vendor/bin/sail up -d
./vendor/bin/sail composer install       # resolves against the container's PHP
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
./vendor/bin/sail npm install
./vendor/bin/sail npm run build
```

Day to day:

```bash
./vendor/bin/sail up -d                  # start
./vendor/bin/sail composer install       # PHP packages
./vendor/bin/sail npm install            # JS packages
./vendor/bin/sail npm run dev            # Vite with hot reload
./vendor/bin/sail artisan test           # PHPUnit
./vendor/bin/sail npm test               # Vitest (layout engine)
./vendor/bin/sail npm run build          # typecheck + production build
```

Laravel Boost ships in `require-dev`; generate its guidelines and MCP config
once (it asks which agents and editors to set up):

```bash
./vendor/bin/sail artisan boost:install
```

### Configuration

`.env`:

| Variable | Default | |
|---|---|---|
| `IKEA_FETCH_PAGES` | `true` | `false` builds products from the link alone |
| `IKEA_FETCH_TIMEOUT` | `8` | seconds per IKEA page |
| `IKEA_MARKET` | `de/de` | market used for the catalog's search links |
| `APP_PORT` | `8080` | port Sail publishes |

The database is MySQL 8.4 in Sail (`DB_HOST=mysql`); `sail artisan test` runs
against the `testing` database the container creates on first boot.

`config/kitchen.php` holds the standard catalog (sizes, estimated prices, the
IKEA search each links to) and the finishes.

## Architecture

Laravel conventions throughout — the structure Laravel Boost's
`laravel-best-practices` skill steers toward: thin controllers, Form Requests,
an action class for the one real business operation, services for the rest, and
contracts only at external boundaries.

All measurements are centimetres. Coordinates: x along the back wall from the
left corner, y up, z from the back wall into the room.

```
app/
  Actions/ResolveIkeaProductLinks.php   # pasted links -> products (+ per-link errors)
  Contracts/IkeaProductResolver.php     # external boundary, bound in AppServiceProvider
  Data/                                 # readonly DTOs: Product, Dimensions, ArticleNumber, Money
  Enums/                                # ProductKind (zone + METOD default size), ProductSource, LayoutShape
  Exceptions/UnsupportedProductLink.php
  Models/KitchenPlan.php                # uuid keys, room/items/settings cast to array
  Services/
    Catalog/KitchenCatalog.php          # standard items + finishes from config/kitchen.php
    Catalog/ProductClassifier.php       # EN/DE product names -> ProductKind
    Catalog/SizeReader.php              # "60x37x80 cm" -> Dimensions, per kind
    Ikea/IkeaLinkParser.php             # URL -> market, slug, article number (also the SSRF guard)
    Ikea/IkeaPageParser.php             # JSON-LD, meta tags, labelled measurements
    Ikea/IkeaProductBuilder.php         # link + page -> Product
    Ikea/HttpIkeaProductResolver.php    # fetch + cache, falls back to the link alone
  Http/
    Controllers/                        # PlannerController + Api\{Catalog,ProductLink,KitchenPlan}
    Requests/                           # validation, including the plan payload
    Resources/KitchenPlanResource.php
database/factories/KitchenPlanFactory.php
resources/ts/
  layout/planner.ts                     # the layout engine — a pure function, Vitest tested
  layout/fill.ts                        # best-fit cabinet widths for a gap
  scene/                                # Three.js scene, unit meshes, materials
  main.ts                               # sidebar UI and state
```

The layout runs in the browser so every change re-plans instantly; the server
reads IKEA pages, serves the catalog and stores plans.

### API

| Method | Path | |
|---|---|---|
| `GET` | `/api/catalog` | standard items, finishes, currency |
| `POST` | `/api/products/resolve` | `{"urls": [...]}` → `{"products": [...], "errors": [...]}` |
| `POST` | `/api/plans` | save a plan |
| `GET` / `PUT` | `/api/plans/{id}` | load / update a plan |

## Limits worth knowing

- IKEA has no public product API. Page reading is best-effort and IKEA may block
  server requests; the link fallback keeps the planner usable, but check sizes
  marked *estimated*.
- Catalog prices are rough estimates for Germany — the real price is one click
  away in the shopping list.
- Windows, doors and pipes aren't modelled yet; use the side-run lengths to keep
  a doorway free.
