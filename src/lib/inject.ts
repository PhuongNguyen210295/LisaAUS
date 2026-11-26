/**
 * Runs inside the Lisa page. Sends the page's visible text to the app whenever it
 * changes (Lisa is a single-page app, so moving between weeks doesn't reload).
 * The text is parsed on the phone and never leaves it.
 */
export const INJECTED_JS = `
(function () {
  if (window.__lisaShifts) return;
  window.__lisaShifts = true;
  var last = '';
  var timer = null;
  function send() {
    try {
      var text = document.body ? document.body.innerText : '';
      if (!text || text === last) return;
      last = text;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'page', url: location.href, text: text.slice(0, 200000)
      }));
    } catch (e) {}
  }
  function queue() { clearTimeout(timer); timer = setTimeout(send, 700); }
  new MutationObserver(queue).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true
  });
  queue();
})();
true;
`;

export type PageMessage = { type: 'page'; url: string; text: string };

export function readMessage(data: string): PageMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg?.type === 'page' && typeof msg.text === 'string' && typeof msg.url === 'string') return msg;
  } catch {}
  return null;
}

export function isLisaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'aus.com' || host.endsWith('.aus.com');
  } catch {
    return false;
  }
}
