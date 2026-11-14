import { useEffect, useRef } from 'react';
import { matchRoutes } from 'utils/openapi-routes';

const NAVIGATION_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Tab', 'Shift', 'Control', 'Alt', 'Meta'];

const renderRouteHint = (li, _data, completion) => {
  const { route, showSource } = completion;

  const method = document.createElement('span');
  method.className = 'CodeMirror-hint-route-method';
  method.setAttribute('data-method', route.method);
  method.textContent = route.method;

  const path = document.createElement('span');
  path.className = 'CodeMirror-hint-route-path';
  path.textContent = route.path;

  const name = document.createElement('span');
  name.className = 'CodeMirror-hint-route-name';
  name.textContent = showSource && route.source ? `${route.name} · ${route.source}` : route.name;

  li.innerHTML = '';
  li.classList.add('CodeMirror-hint-route');
  li.setAttribute('data-testid', 'route-suggestion');
  li.append(method, path, name);
};

// While the cursor is inside `{{ }}` the variable suggestions own the list.
const isTypingVariable = (textBeforeCursor) => textBeforeCursor.lastIndexOf('{{') > textBeforeCursor.lastIndexOf('}}');

/**
 * Suggests routes from the OpenAPI descriptions at hand while a path is typed in the URL bar. Choosing one
 * hands the route to `onPick`, which decides what to fill in. Without routes this does nothing at all.
 */
const useRouteSuggestions = ({ editorRef, routes, method, onPick }) => {
  const latest = useRef({ routes, method, onPick });
  latest.current = { routes, method, onPick };
  const hasRoutes = routes.length > 0;

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (!editor || !hasRoutes) return;

    const suggest = (cm, event) => {
      if (NAVIGATION_KEYS.includes(event.key)) return;

      const cursor = cm.getCursor();
      const typedUrl = cm.getValue();
      if (cursor.ch !== typedUrl.length || isTypingVariable(typedUrl)) return;

      const { routes: currentRoutes, method: currentMethod } = latest.current;
      const matches = matchRoutes(currentRoutes, typedUrl, { method: currentMethod });
      if (!matches.length) return;

      const showSource = new Set(matches.map((route) => route.source)).size > 1;
      const list = matches.map((route) => ({
        text: route.path,
        route,
        showSource,
        render: renderRouteHint,
        hint: () => latest.current.onPick(route, typedUrl)
      }));

      cm.showHint({
        hint: () => ({ list, from: { line: 0, ch: 0 }, to: cursor }),
        completeSingle: false
      });
    };

    editor.on('keyup', suggest);
    return () => editor.off('keyup', suggest);
  }, [editorRef, hasRoutes]);
};

export default useRouteSuggestions;
