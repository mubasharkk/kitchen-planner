<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kitchen Planner</title>
    <meta name="description" content="Plan an IKEA METOD kitchen in 3D from product links and your room size.">
    @vite(['resources/css/app.css', 'resources/ts/main.ts'])
</head>
<body>
<div id="app" data-plan-id="{{ $planId }}">
    <aside class="sidebar" aria-label="Planner settings">
        <header class="brand">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="15" width="26" height="13" rx="1.5"/><rect x="3" y="4" width="11" height="8" rx="1.5"/><rect x="18" y="4" width="11" height="8" rx="1.5"/><path d="M9 19h4M19 19h4"/></svg>
            <div>
                <h1>Kitchen Planner</h1>
                <p>METOD layouts from IKEA links</p>
            </div>
        </header>

        <section class="panel">
            <h2><span class="step">1</span> Room</h2>
            <div class="grid3">
                <label>Width <span class="field"><input type="number" id="room-width" min="120" max="2000" step="1"><i>cm</i></span></label>
                <label>Depth <span class="field"><input type="number" id="room-depth" min="120" max="2000" step="1"><i>cm</i></span></label>
                <label>Ceiling <span class="field"><input type="number" id="room-height" min="200" max="500" step="1"><i>cm</i></span></label>
            </div>
            <div class="shapes" role="radiogroup" aria-label="Layout">
                <button type="button" role="radio" data-shape="I" title="One wall"><svg viewBox="0 0 40 30"><rect x="4" y="4" width="32" height="7"/></svg>Straight</button>
                <button type="button" role="radio" data-shape="L" title="Back and left wall"><svg viewBox="0 0 40 30"><path d="M4 4h32v7H11v15H4z"/></svg>L-shape</button>
                <button type="button" role="radio" data-shape="U" title="Back, left and right wall"><svg viewBox="0 0 40 30"><path d="M4 4h32v22h-7V11H11v15H4z"/></svg>U-shape</button>
                <button type="button" role="radio" data-shape="galley" title="Two opposite walls"><svg viewBox="0 0 40 30"><rect x="4" y="4" width="32" height="7"/><rect x="4" y="19" width="32" height="7"/></svg>Galley</button>
            </div>
            <div class="grid2" id="side-runs">
                <label id="left-run-field">Left run <span class="field"><input type="number" id="left-run" min="0" step="1" placeholder="auto"><i>cm</i></span></label>
                <label id="right-run-field">Right run <span class="field"><input type="number" id="right-run" min="0" step="1" placeholder="auto"><i>cm</i></span></label>
            </div>
            <p class="hint" id="side-hint">Side runs stop 1 m short of the wall by default, to keep a door or walkway clear.</p>
        </section>

        <section class="panel">
            <h2><span class="step">2</span> Your IKEA products</h2>
            <label class="sr-only" for="links">IKEA product links</label>
            <textarea id="links" rows="3" placeholder="Paste IKEA product links, one per line&#10;https://www.ikea.com/de/de/p/metod-…-s59451468/"></textarea>
            <div class="row">
                <button type="button" class="primary" id="add-links">Add products</button>
                <select id="add-standard" aria-label="Add a standard item">
                    <option value="">+ Standard item…</option>
                </select>
            </div>
            <div id="link-errors" class="errors" hidden></div>
            <ul id="items" class="items"></ul>
            <p class="hint empty" id="items-empty">No products yet. With auto-fill on, the planner designs a complete kitchen from standard items in the chosen series — add your own to replace them.</p>
        </section>

        <section class="panel">
            <h2><span class="step">3</span> Style</h2>
            <div class="series" role="radiogroup" aria-label="Kitchen series">
                <button type="button" role="radio" data-series="metod" title="Modular system, many sizes">METOD</button>
                <button type="button" role="radio" data-series="knoxhult" title="Ready-to-hang budget cabinets">KNOXHULT</button>
            </div>
            <label class="toggle"><input type="checkbox" id="autofill"> <span>Auto-fill gaps and missing appliances with standard items</span></label>
            <div class="swatches-label">Fronts</div>
            <div class="swatches" id="fronts"></div>
            <div class="grid3">
                <label>Worktop <select id="worktop"></select></label>
                <label>Handles <select id="handles"></select></label>
                <label>Floor <select id="floor"></select></label>
            </div>
        </section>

        <section class="panel" id="warnings-panel" hidden>
            <h2>Check these</h2>
            <ul id="warnings" class="warnings"></ul>
        </section>

        <section class="panel">
            <h2><span class="step">4</span> Shopping list</h2>
            <table class="shopping">
                <thead><tr><th>Qty</th><th>Item</th><th class="num">Price</th></tr></thead>
                <tbody id="shopping"></tbody>
                <tfoot><tr><td></td><th>Total</th><th class="num" id="total"></th></tr></tfoot>
            </table>
            <p class="hint" id="total-note"></p>
            <div class="row">
                <button type="button" id="export-csv">Download CSV</button>
                <button type="button" id="export-png">Download image</button>
            </div>
        </section>

        <section class="panel">
            <h2>Save &amp; share</h2>
            <div class="row">
                <input type="text" id="plan-name" maxlength="120" placeholder="Plan name" aria-label="Plan name">
                <button type="button" class="primary" id="save">Save</button>
            </div>
            <div id="share" class="share" hidden>
                <input type="text" id="share-url" readonly aria-label="Share link">
                <button type="button" id="copy-link">Copy</button>
            </div>
        </section>
    </aside>

    <main class="viewport">
        <div id="scene" class="scene"></div>
        <div class="toolbar" role="group" aria-label="Camera">
            <button type="button" data-view="perspective" class="active">3D</button>
            <button type="button" data-view="front">Front</button>
            <button type="button" data-view="top">Top</button>
        </div>
        <div class="summary" id="summary"></div>
        <div class="tooltip" id="tooltip" hidden></div>
        <div class="toast" id="toast" hidden></div>
    </main>
</div>
</body>
</html>
