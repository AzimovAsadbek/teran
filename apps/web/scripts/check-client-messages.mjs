// Verifies that client components only read next-intl messages their route sends to the browser
// (ADR-020). Follows every route file through its layouts and the components it renders, tracks
// what NextIntlClientProvider and <ClientMessages> provide at each point, and reports every message
// a client component reads where it is not provided (the page would show its key instead).
// Run: node scripts/check-client-messages.mjs (part of `pnpm lint`).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const APP = path.join(SRC, 'app');
const CLIENT_MESSAGES = path.join(SRC, 'i18n/client-messages.tsx');
const MERGE_MESSAGES = path.join(SRC, 'i18n/merge-messages.tsx');
const PICK_MESSAGES = path.join(SRC, 'i18n/messages.ts');
const catalogue = JSON.parse(readFileSync(new URL('../messages/uz.json', import.meta.url), 'utf8'));

/** Files rendered inside their segment's layouts; the global ones replace the root layout. */
const ROUTE_FILE =
  /^(layout|template|page|default|error|loading|not-found|forbidden|unauthorized)\.tsx?$/;
const GLOBAL_FILE = /^global-(error|not-found)\.tsx?$/;
const INTL_PACKAGES = new Set(['next-intl', 'use-intl']);
const TRANSLATOR_METHODS = new Set(['rich', 'markup', 'raw', 'has']);

/**
 * The messages provided at a point of the tree: EVERYTHING (below a NextIntlClientProvider that the
 * server renders without `messages`), or a Map from namespace to `true` (all of it) or to the Set
 * of its top-level entries.
 */
const EVERYTHING = 'everything';
const NOTHING = new Map();

const files = readdirSync(SRC, { recursive: true })
  .filter((name) => /\.tsx?$/.test(name) && !/\.(test|d)\.tsx?$/.test(name))
  .map((name) => path.join(SRC, name))
  .sort();
const sourceFiles = new Set(files);
// Names only, no types: enough to tell what each identifier refers to, and fast.
const program = ts.createProgram(files, {
  noLib: true,
  noResolve: true,
  types: [],
  jsx: ts.JsxEmit.Preserve,
});
const checker = program.getTypeChecker();
const modules = new Map(files.map((file) => [file, readModule(file)]));

/** Providers and picks the check cannot follow. */
const unreadable = new Set();

// A binding is a module's top-level declaration ({ mod, name }), `client` when it runs in the
// browser: exported by a 'use client' module or referred to by client code.
const where = (binding) => `${path.relative(SRC, binding.mod.file)}#${binding.name}`;
const stateKey = (binding, context) =>
  `${where(binding)}${binding.client ? ' (client)' : ''} ${keyOf(context)}`;
const isDeclaration = (binding, file, name) => binding.mod.file === file && binding.name === name;

// ---- Modules.

function readModule(file) {
  const sourceFile = program.getSourceFile(file);
  const mod = {
    file,
    client: hasDirective(sourceFile, 'use client'),
    imports: new Map(),
    exports: new Map(),
    stars: [],
    decls: new Map(),
  };
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) readImport(mod, statement);
    else if (ts.isExportDeclaration(statement)) readExport(mod, statement);
    else readDeclaration(mod, statement);
  }
  return mod;
}

function hasDirective(sourceFile, directive) {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === directive) return true;
  }
  return false;
}

/** The source file an import names, if it is one of ours (`@/…` or relative). */
function resolveImport(from, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(from), specifier);
  else return undefined;
  const index = path.join(base, 'index');
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${index}.ts`, `${index}.tsx`];
  return candidates.find((candidate) => sourceFiles.has(candidate));
}

function readImport(mod, statement) {
  const clause = statement.importClause;
  if (!clause || clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return;
  const specifier = statement.moduleSpecifier.text;
  const file = resolveImport(mod.file, specifier);
  const add = (local, name) => mod.imports.set(local.text, { file, specifier, name });
  if (clause.name) add(clause.name, 'default');
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) add(bindings.name, '*');
  for (const element of bindings && ts.isNamedImports(bindings) ? bindings.elements : []) {
    if (!element.isTypeOnly) add(element.name, (element.propertyName ?? element.name).text);
  }
}

function readExport(mod, statement) {
  if (statement.isTypeOnly) return;
  const file = statement.moduleSpecifier && resolveImport(mod.file, statement.moduleSpecifier.text);
  const clause = statement.exportClause;
  if (!clause) {
    if (file) mod.stars.push(file);
  } else if (ts.isNamespaceExport(clause)) {
    mod.exports.set(clause.name.text, { file, name: '*' });
  } else {
    for (const element of clause.elements) {
      if (element.isTypeOnly) continue;
      const name = (element.propertyName ?? element.name).text;
      mod.exports.set(
        element.name.text,
        statement.moduleSpecifier ? { file, name } : { local: name },
      );
    }
  }
}

function readDeclaration(mod, statement) {
  const modifiers = (ts.canHaveModifiers(statement) && ts.getModifiers(statement)) || [];
  const exported = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
  const isDefault = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
  const add = (name, node) => {
    mod.decls.set(name, node);
    if (exported) mod.exports.set(isDefault ? 'default' : name, { local: name });
  };
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    add(statement.name?.text ?? 'default', statement);
  } else if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      for (const name of boundNames(declaration.name)) add(name, declaration);
    }
  } else if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
    if (ts.isIdentifier(statement.expression)) {
      mod.exports.set('default', { local: statement.expression.text });
    } else {
      mod.decls.set('default', statement);
      mod.exports.set('default', { local: 'default' });
    }
  }
}

function boundNames(name) {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : boundNames(element.name),
  );
}

/**
 * The bindings an export stands for, through re-exports (`*`: all of them). Everything a
 * 'use client' module exports, re-exports included, runs in the browser.
 */
function resolveExport(file, name, seen = new Set()) {
  const mod = modules.get(file);
  if (!mod || seen.has(`${file}#${name}`)) return [];
  seen.add(`${file}#${name}`);
  let targets;
  if (name === '*') {
    targets = [...mod.exports.keys()]
      .flatMap((exported) => resolveExport(file, exported, seen))
      .concat(mod.stars.flatMap((star) => resolveExport(star, '*', seen)));
  } else {
    const entry = mod.exports.get(name);
    if (!entry) targets = mod.stars.flatMap((star) => resolveExport(star, name, seen));
    else if ('local' in entry) targets = resolveLocal(mod, entry.local, seen);
    else targets = entry.file ? resolveExport(entry.file, entry.name, seen) : [];
  }
  return mod.client ? targets.map((target) => ({ ...target, client: true })) : targets;
}

function resolveLocal(mod, name, seen) {
  if (mod.decls.has(name)) return [{ mod, name, client: mod.client }];
  const imported = mod.imports.get(name);
  return imported?.file ? resolveExport(imported.file, imported.name, seen) : [];
}

/** Whether an identifier names a property, attribute or declaration rather than a value. */
function isName(identifier) {
  const { parent } = identifier;
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  return (
    parent.name === identifier || parent.propertyName === identifier || parent.label === identifier
  );
}

/** The bindings an identifier in `binding` refers to (none for locals and globals). */
function referencedBindings(binding, identifier) {
  const { mod } = binding;
  if (isName(identifier)) return [];
  if (!mod.decls.has(identifier.text) && !mod.imports.has(identifier.text)) return [];
  const symbol = ts.isShorthandPropertyAssignment(identifier.parent)
    ? checker.getShorthandAssignmentValueSymbol(identifier.parent)
    : checker.getSymbolAtLocation(identifier);
  const declaration = symbol?.declarations?.[0];
  let targets = [];
  if (declaration && isImportBinding(declaration)) {
    const imported = mod.imports.get(identifier.text);
    const { parent } = identifier;
    // `Icons.Leaf` of `import * as Icons` is that one export.
    const member =
      ts.isPropertyAccessExpression(parent) && parent.expression === identifier
        ? parent.name.text
        : '*';
    const name = imported?.name === '*' ? member : imported?.name;
    targets = imported?.file ? resolveExport(imported.file, name) : [];
  } else if (declaration && ownerOf(declaration) === mod.decls.get(identifier.text)) {
    targets = [{ mod, name: identifier.text, client: mod.client }];
  }
  return binding.client ? targets.map((target) => ({ ...target, client: true })) : targets;
}

function isImportBinding(declaration) {
  return (
    ts.isImportSpecifier(declaration) ||
    ts.isImportClause(declaration) ||
    ts.isNamespaceImport(declaration)
  );
}

/** The node a declaration is kept under in `decls`: destructuring climbs to its declaration. */
function ownerOf(declaration) {
  let node = declaration;
  while (
    ts.isBindingElement(node) ||
    ts.isObjectBindingPattern(node) ||
    ts.isArrayBindingPattern(node)
  ) {
    node = node.parent;
  }
  return node;
}

/** The next-intl export an identifier refers to (`useTranslations`, …), if any. */
function intlImport(mod, expression) {
  if (!ts.isIdentifier(expression)) return undefined;
  const imported = mod.imports.get(expression.text);
  if (!imported || !INTL_PACKAGES.has(imported.specifier)) return undefined;
  const declaration = checker.getSymbolAtLocation(expression)?.declarations?.[0];
  return declaration && isImportBinding(declaration) ? imported.name : undefined;
}

// ---- Provided messages.

function keyOf(context) {
  if (context === EVERYTHING) return EVERYTHING;
  return [...context]
    .map(([namespace, entries]) =>
      entries === true ? namespace : `${namespace}{${[...entries].sort()}}`,
    )
    .sort()
    .join(',');
}

/** `context` plus picks ("Namespace" or "Namespace.entry") made in `binding`. */
function withPicks(context, picks, binding) {
  if (context === EVERYTHING) return EVERYTHING;
  const next = new Map(context);
  for (const pick of picks) {
    const [namespace, entry, ...rest] = pick.split('.');
    const known =
      Object.hasOwn(catalogue, namespace) &&
      (entry === undefined || Object.hasOwn(catalogue[namespace], entry)) &&
      rest.length === 0;
    if (!known) unreadable.add(`${where(binding)}: "${pick}" is not in messages/uz.json`);
    else if (entry === undefined) next.set(namespace, true);
    else if (next.get(namespace) !== true) {
      next.set(namespace, new Set([...(next.get(namespace) ?? []), entry]));
    }
  }
  return next;
}

/** What two contexts both provide. */
function intersect(a, b) {
  if (a === EVERYTHING) return b;
  if (b === EVERYTHING) return a;
  const both = new Map();
  for (const [namespace, entries] of a) {
    const other = b.get(namespace);
    if (other === undefined) continue;
    if (entries === true || other === true) {
      both.set(namespace, entries === true ? other : entries);
    } else {
      const common = new Set([...entries].filter((entry) => other.has(entry)));
      if (common.size > 0) both.set(namespace, common);
    }
  }
  return both;
}

function covers(context, read) {
  if (context === EVERYTHING) return true;
  const provided = read.namespace === undefined ? undefined : context.get(read.namespace);
  return provided === true || (read.entry !== undefined && provided?.has(read.entry) === true);
}

/** The picks of a literal list (spreads, `as const` and `satisfies` allowed) or of a constant. */
function readPicks(mod, expression) {
  while (
    expression &&
    (ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isParenthesizedExpression(expression))
  ) {
    expression = expression.expression;
  }
  if (expression && ts.isArrayLiteralExpression(expression)) {
    const picks = [];
    for (const element of expression.elements) {
      let items;
      if (ts.isStringLiteralLike(element)) items = [element.text];
      else if (ts.isSpreadElement(element)) items = readPicks(mod, element.expression);
      if (!items) return undefined;
      picks.push(...items);
    }
    return picks;
  }
  if (expression && ts.isIdentifier(expression)) {
    const [target] = referencedBindings({ mod, client: false }, expression);
    const declaration = target?.mod.decls.get(target.name);
    if (declaration && ts.isVariableDeclaration(declaration)) {
      return readPicks(target.mod, declaration.initializer);
    }
  }
  return undefined;
}

function attributeValue(opening, name) {
  const attribute = opening.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name,
  );
  const initializer = attribute?.initializer;
  return initializer && ts.isJsxExpression(initializer) ? initializer.expression : initializer;
}

// ---- Rendering.

/**
 * Visits a binding rendered where `context` is provided: `onReference(binding, context)` for every
 * binding it refers to and `onChildren(context)` wherever it places its children. The children of
 * a JSX element get what the element provides them.
 */
function walk(binding, context, { onReference = () => {}, onChildren = () => {} }) {
  const visit = (node, context) => {
    if (ts.isTypeNode(node)) return;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      let inner;
      const childContext = () => (inner ??= elementContext(binding, opening, context));
      visit(opening.tagName, context);
      for (const property of opening.attributes.properties) {
        const isChildren =
          ts.isJsxAttribute(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'children';
        visit(property, isChildren ? childContext() : context);
      }
      for (const child of ts.isJsxElement(node) ? node.children : []) visit(child, childContext());
      return;
    }
    if (ts.isIdentifier(node)) {
      if (node.text === 'children' && !isName(node)) onChildren(context);
      for (const target of referencedBindings(binding, node)) onReference(target, context);
      return;
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'children') onChildren(context);
    // import('…'), as in next/dynamic and React.lazy.
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [specifier] = node.arguments;
      const file =
        specifier &&
        ts.isStringLiteralLike(specifier) &&
        resolveImport(binding.mod.file, specifier.text);
      for (const target of file ? resolveExport(file, '*') : []) {
        onReference({ ...target, client: target.client || binding.client }, context);
      }
    }
    ts.forEachChild(node, (child) => visit(child, context));
  };
  visit(binding.mod.decls.get(binding.name), context);
}

/** The messages the children of a JSX element get, where the element renders in `context`. */
function elementContext(binding, opening, context) {
  const { tagName } = opening;
  if (intlImport(binding.mod, tagName) === 'NextIntlClientProvider') {
    // MergeMessages adds to the enclosing messages: <ClientMessages> stands for it.
    if (binding.mod.file === MERGE_MESSAGES) return context;
    const messages = attributeValue(opening, 'messages');
    // Rendered by the server without `messages`, it sends every message.
    if (messages === undefined) return binding.client ? NOTHING : EVERYTHING;
    const isPick =
      ts.isCallExpression(messages) &&
      ts.isIdentifier(messages.expression) &&
      referencedBindings(binding, messages.expression).some((target) =>
        isDeclaration(target, PICK_MESSAGES, 'pickMessages'),
      );
    const picks = isPick ? readPicks(binding.mod, messages.arguments[1]) : undefined;
    if (picks) return withPicks(NOTHING, picks, binding);
    unreadable.add(
      `${where(binding)}: give NextIntlClientProvider pickMessages(messages, [picks])`,
    );
    return NOTHING;
  }
  const tag = ts.isPropertyAccessExpression(tagName) ? tagName.expression : tagName;
  const targets = ts.isIdentifier(tag) ? referencedBindings(binding, tag) : [];
  // An HTML element or a library component renders its children where it is.
  if (targets.length === 0) return context;
  if (targets.some((target) => isDeclaration(target, CLIENT_MESSAGES, 'ClientMessages'))) {
    const picks = readPicks(binding.mod, attributeValue(opening, 'pick'));
    if (picks) return withPicks(context, picks, binding);
    unreadable.add(`${where(binding)}: <ClientMessages pick> must be a list or a constant`);
    return context;
  }
  return targets.map((target) => childrenContext(target, context)).reduce(intersect);
}

const childrenContexts = new Map();
/** The messages a component's children get when it renders where `context` is provided. */
function childrenContext(binding, context) {
  const key = stateKey(binding, context);
  if (!childrenContexts.has(key)) {
    // A component rendering itself: assume, while working it out, that it adds nothing.
    childrenContexts.set(key, context);
    const found = [];
    walk(binding, context, { onChildren: (inner) => found.push(inner) });
    // A message counts only if every place that renders the children provides it.
    childrenContexts.set(key, found.length > 0 ? found.reduce(intersect) : context);
  }
  return childrenContexts.get(key);
}

// ---- Reading messages: { namespace, entry }, a whole { namespace, why } or every message { why }.

const readsOfBinding = new Map();
/** What a binding reads from the messages when it runs in the browser. */
function readsOf(binding) {
  const key = where(binding);
  if (!readsOfBinding.has(key)) {
    const declaration = binding.mod.decls.get(binding.name);
    const reads = [];
    const visit = (node) => {
      if (ts.isTypeNode(node)) return;
      if (ts.isCallExpression(node)) {
        const hook = intlImport(binding.mod, node.expression);
        if (hook === 'useTranslations') reads.push(...translatorReads(declaration, node));
        // MergeMessages reads the enclosing messages to add to them.
        else if (hook === 'useMessages' && binding.mod.file !== MERGE_MESSAGES) {
          reads.push({ why: 'useMessages()' });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(declaration);
    readsOfBinding.set(key, reads);
  }
  return readsOfBinding.get(key);
}

/** What the translator from a `useTranslations()` call reads, by its uses in `scope`. */
function translatorReads(scope, call) {
  const [namespace] = call.arguments;
  if (namespace && !ts.isStringLiteralLike(namespace)) {
    return [{ why: 'useTranslations() with a computed namespace' }];
  }
  const base = namespace ? namespace.text.split('.') : [];
  const { parent } = call;
  if (ts.isCallExpression(parent) && parent.expression === call) {
    return keyReads(base, parent.arguments[0], 'a computed key');
  }
  if (!ts.isVariableDeclaration(parent) || !ts.isIdentifier(parent.name)) {
    return keyReads(base, undefined, 'the translator is passed on');
  }
  const translator = checker.getSymbolAtLocation(parent.name);
  const reads = [];
  const visit = (node) => {
    if (ts.isTypeNode(node)) return;
    if (
      ts.isIdentifier(node) &&
      node !== parent.name &&
      node.text === parent.name.text &&
      checker.getSymbolAtLocation(node) === translator
    ) {
      reads.push(...translatorUse(base, node));
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return reads;
}

/** `t('key')`, `t.rich('key')` and the like read that message; other uses, all `t` can reach. */
function translatorUse(base, identifier) {
  const { parent } = identifier;
  const method =
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === identifier &&
    TRANSLATOR_METHODS.has(parent.name.text);
  const call = method ? parent.parent : parent;
  if (ts.isCallExpression(call) && call.expression === (method ? parent : identifier)) {
    return keyReads(base, call.arguments[0], `${identifier.text}() with a computed key`);
  }
  if (isHookDependency(identifier)) return [];
  return keyReads(base, undefined, `${identifier.text} is passed on`);
}

/** `t` in a hook's dependency list (`useMemo(…, [t])`) reads nothing by itself. */
function isHookDependency(identifier) {
  const list = identifier.parent;
  const call = list.parent;
  return (
    ts.isArrayLiteralExpression(list) &&
    ts.isCallExpression(call) &&
    ts.isIdentifier(call.expression) &&
    /^use[A-Z]/.test(call.expression.text) &&
    call.arguments.at(-1) === list
  );
}

/**
 * The entries a key reads below the translator's namespace path `base`: `t('a.b')` reads entry
 * `a`; a template key, every entry its literal start can reach; any other key, all of them.
 */
function keyReads(base, key, why) {
  let known = base;
  let start;
  if (key && ts.isStringLiteralLike(key)) {
    known = [...base, ...key.text.split('.')];
  } else if (key && ts.isTemplateExpression(key)) {
    known = [...base, ...key.head.text.split('.')];
    start = known.pop();
  }
  const [namespace, entry] = known;
  if (entry !== undefined) return [{ namespace, entry }];
  if (namespace === undefined) return [{ why }];
  const entries = start
    ? Object.keys(catalogue[namespace] ?? {}).filter((name) => name.startsWith(start))
    : [];
  if (entries.length === 0) return [{ namespace, why }];
  return entries.map((name) => ({ namespace, entry: name }));
}

/** "Namespace.entry" for each entry, "all of Namespace (why)" when it reads all of them. */
function describe(reads) {
  const every = reads.find((read) => read.namespace === undefined);
  if (every) return `every message (${every.why})`;
  const whole = new Map(
    reads.filter((read) => read.entry === undefined).map((read) => [read.namespace, read]),
  );
  const parts = reads.map((read) =>
    whole.has(read.namespace)
      ? `all of ${read.namespace} (${whole.get(read.namespace).why})`
      : `${read.namespace}.${read.entry}`,
  );
  return [...new Set(parts)].sort().join(', ');
}

// ---- Routes.

const segmentContexts = new Map();
/** The messages provided inside a segment's layout and template, where its pages render. */
function segmentContext(dir) {
  if (!segmentContexts.has(dir)) {
    if (path.basename(dir).startsWith('@')) {
      unreadable.add(`${path.relative(SRC, dir)}: parallel route slots are not followed yet`);
    }
    const outer = dir === APP ? NOTHING : segmentContext(path.dirname(dir));
    segmentContexts.set(dir, wrapIn(dir, 'template', wrapIn(dir, 'layout', outer)));
  }
  return segmentContexts.get(dir);
}

/** The messages inside the segment's layout or template (if it has one) given those outside. */
function wrapIn(dir, kind, context) {
  const file = [`${kind}.tsx`, `${kind}.ts`]
    .map((name) => path.join(dir, name))
    .find((candidate) => modules.has(candidate));
  const [entry] = file ? resolveExport(file, 'default') : [];
  return entry ? childrenContext(entry, context) : context;
}

function routeContext(file) {
  const dir = path.dirname(file);
  const kind = path.basename(file).replace(/\.tsx?$/, '');
  if (GLOBAL_FILE.test(path.basename(file))) return NOTHING;
  const outer = dir === APP ? NOTHING : segmentContext(path.dirname(dir));
  if (kind === 'layout') return outer;
  if (kind === 'template') return wrapIn(dir, 'layout', outer);
  return segmentContext(dir);
}

const successors = new Map();
/**
 * Follows everything a route file runs, with the messages provided where it runs, and returns the
 * reads that are not provided by reader ("file#name", with the component using a hook).
 */
function checkRoute(file, readers) {
  const missing = new Map();
  const [entry] = resolveExport(file, 'default');
  if (!entry) unreadable.add(`${path.relative(SRC, file)}: no default export to follow`);
  const seen = new Set();
  const pending = entry ? [[entry, routeContext(file), entry]] : [];
  while (pending.length > 0) {
    const [binding, context, component] = pending.pop();
    const key = stateKey(binding, context);
    if (seen.has(key)) continue;
    seen.add(key);
    const reads = binding.client ? readsOf(binding) : [];
    if (reads.length > 0) readers.add(where(binding));
    const notProvided = reads.filter((read) => !covers(context, read));
    if (notProvided.length > 0) {
      const reader = `${where(binding)}${component === binding ? '' : ` (in ${where(component)})`}`;
      missing.set(reader, [...(missing.get(reader) ?? []), ...notProvided]);
    }
    if (!successors.has(key)) {
      const next = [];
      walk(binding, context, { onReference: (target, inner) => next.push([target, inner]) });
      successors.set(key, next);
    }
    for (const [target, inner] of successors.get(key)) {
      pending.push([target, inner, /^[A-Z]/.test(target.name) ? target : component]);
    }
  }
  return missing;
}

const routes = files.filter((file) => {
  const name = path.basename(file);
  if (!file.startsWith(`${APP}${path.sep}`)) return false;
  return ROUTE_FILE.test(name) || (GLOBAL_FILE.test(name) && path.dirname(file) === APP);
});
const readers = new Set();
const problems = [];
for (const file of routes) {
  const missing = checkRoute(file, readers);
  if (missing.size === 0) continue;
  problems.push(path.relative(SRC, file));
  for (const [reader, reads] of [...missing].sort(([a], [b]) => a.localeCompare(b))) {
    problems.push(`  ${reader} reads ${describe(reads)}`);
  }
}

if (unreadable.size > 0) {
  console.error(`Cannot follow client messages:\n  ${[...unreadable].sort().join('\n  ')}`);
}
if (problems.length > 0) {
  console.error(
    `Client components read messages that are not sent where they render:\n  ${problems.join('\n  ')}\n` +
      `Pick them with <ClientMessages pick={[…]}> around the component, or in the layout's list ` +
      `in src/i18n/messages.ts (ADR-020).`,
  );
}
if (unreadable.size > 0 || problems.length > 0) process.exit(1);
console.log(
  `Client messages sent where they are read: ${routes.length} route files, ` +
    `${readers.size} client components and hooks.`,
);
