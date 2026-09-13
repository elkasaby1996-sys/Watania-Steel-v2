import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Building2, FileText, History, MapPin, Search, Truck, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { fetchSearchOrder, normalizeSearch, searchPages, searchRecords, SEARCH_LIMIT, SEARCH_MAX_LENGTH, type SearchGroup, type SearchResponse, type SearchResult } from '../lib/universalSearch';
import type { Order } from '../lib/supabase';
import './universal-search.css';

const OrderDetails = lazy(() => import('./OrderDetailsDialog').then(module => ({ default: module.OrderDetailsDialog })));
const icons = { Pages: ArrowUpRight, Orders: FileText, History, Clients: Building2, Sites: MapPin, Drivers: Truck };
const groups: SearchGroup[] = ['Pages', 'Orders', 'History', 'Clients', 'Sites', 'Drivers'];
const emptyResponse: SearchResponse = { results: [], failedGroups: [] };

// Remount on account or role changes so no previous user's results survive.
export function UniversalSearch({ isMobile = false }: { isMobile?: boolean }) {
  const user = useAuthStore(state => state.user);
  if (!user || !hasPermission(user.profile?.role, 'view')) return null;
  return <SearchControl key={`${user.id}:${user.profile?.role}`} role={user.profile?.role} isMobile={isMobile} />;
}

function SearchControl({ role, isMobile }: { role?: string; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(emptyResponse);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const [openingOrder, setOpeningOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const orderRequest = useRef<AbortController | null>(null);
  const listId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const term = normalizeSearch(query);
  const pageResults = useMemo(() => searchPages(query, role), [query, role]);
  const results = useMemo(() => [...pageResults, ...response.results], [pageResults, response.results]);

  useEffect(() => {
    setOpen(false);
    setOrder(null);
    orderRequest.current?.abort();
  }, [location]);

  useEffect(() => () => orderRequest.current?.abort(), []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.isComposing) {
        // Do not move focus out of another modal workflow.
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        event.preventDefault();
        setOpen(true);
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    if (!open) {
      orderRequest.current?.abort();
      setOpeningOrder(false);
      return;
    }
    input.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    const controller = new AbortController();
    setResponse(emptyResponse);
    setActive(0);
    setLoading(open && term.length >= 2);
    if (!open || term.length < 2) return () => controller.abort();
    const timer = setTimeout(() => {
      void searchRecords(term, controller.signal).then(next => {
        if (!controller.signal.aborted) { setResponse(next); setLoading(false); }
      }).catch(() => {
        if (!controller.signal.aborted) {
          setResponse({ results: [], failedGroups: groups.filter(group => group !== 'Pages') });
          setLoading(false);
        }
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, open, retry]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, open]);

  const close = () => {
    setOpen(false);
    if (isMobile) trigger.current?.focus();
  };

  const select = async (result: SearchResult) => {
    if (openingOrder) return;
    if (result.path) { close(); navigate(result.path); return; }
    if (!result.order) return;
    orderRequest.current?.abort();
    const controller = new AbortController();
    orderRequest.current = controller;
    setOpeningOrder(true);
    setOrderError('');
    try {
      const selected = await fetchSearchOrder(result.order, controller.signal);
      if (!controller.signal.aborted) { setOrder(selected); setOpen(false); }
    } catch {
      if (!controller.signal.aborted) setOrderError('Could not open this order. It may have moved or been removed. Search again or retry.');
    } finally {
      if (!controller.signal.aborted) setOpeningOrder(false);
    }
  };

  return (
    <div className={`universal-search ${isMobile ? 'universal-search--mobile' : ''} ${open ? 'is-open' : ''}`} ref={root}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
      {isMobile && <button ref={trigger} type="button" className="universal-search-trigger" aria-label="Search workspace" aria-expanded={open}
        onClick={() => setOpen(true)}><Search size={19} /></button>}
      <div className="universal-search-field">
        <Search size={17} aria-hidden="true" />
        <input ref={input} type="text" role="combobox" aria-label="Search workspace" aria-autocomplete="list"
          aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off" spellCheck={false} maxLength={SEARCH_MAX_LENGTH} placeholder="Search workspace…" value={query}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={event => {
            orderRequest.current?.abort(); setOpeningOrder(false); setOrderError('');
            setQuery(event.target.value); setActive(0); setOpen(true);
          }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpen(true);
              if (results.length) setActive(index => !open ? (event.key === 'ArrowDown' ? 0 : results.length - 1) :
                (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
            }
            if (event.key === 'Enter' && open && results[active]) { event.preventDefault(); void select(results[active]); }
          }} />
        {query && <button type="button" aria-label="Clear search" className="universal-search-clear" onClick={() => {
          orderRequest.current?.abort(); setOpeningOrder(false); setOrderError(''); setQuery(''); setResponse(emptyResponse); input.current?.focus();
        }}><X size={15} /></button>}
        {isMobile ? <button type="button" className="universal-search-cancel" onClick={close}>Close</button> :
          <kbd aria-hidden="true">{navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K</kbd>}
      </div>
      {open && <div className="universal-search-panel">
        <div className="universal-search-intro">{term.length < 2 ? 'Jump to a page, or type 2+ characters to find records.' : 'Search across your workspace'}</div>
        <div className="universal-search-results" id={listId} role="listbox" aria-label="Workspace results" aria-busy={loading || openingOrder}>
          {groups.map(group => {
            const matches = results.filter(result => result.group === group);
            if (!matches.length) return null;
            const Icon = icons[group];
            return <div role="group" aria-label={group} key={group}>
              <div className="universal-search-group" aria-hidden="true"><span>{group}</span><span>{matches.length === SEARCH_LIMIT && group !== 'Pages' ? `First ${SEARCH_LIMIT}` : matches.length}</span></div>
              {matches.map(result => {
                const index = results.indexOf(result);
                return <div id={`${listId}-${index}`} key={result.key} role="option" aria-selected={active === index}
                  className="universal-search-result" onPointerMove={() => setActive(index)}
                  onMouseDown={event => event.preventDefault()} onClick={() => void select(result)}>
                  <Icon size={18} aria-hidden="true" /><span className="universal-search-result-copy"><strong dir="auto">{result.title}</strong><span dir="auto">{result.description}</span></span>
                  <ArrowUpRight size={14} className="universal-search-result-arrow" aria-hidden="true" />
                </div>;
              })}
            </div>;
          })}
        </div>
        <div role="status" aria-live="polite" className="universal-search-status">
          {openingOrder ? 'Opening order…' : loading ? 'Searching records…' : term.length >= 2 && !results.length && !response.failedGroups.length ?
            `No results for “${term}”. Try a name, delivery number or phone number.` : term.length >= 2 ? `${results.length} results. Up to ${SEARCH_LIMIT} per record type; refine your search for more specific matches.` : 'Orders, history, clients, sites and drivers'}
        </div>
        {!!response.failedGroups.length && <div className="universal-search-error" role="alert">
          <span>Could not search: {response.failedGroups.join(', ')}.</span><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>
        </div>}
        {orderError && <div className="universal-search-error" role="alert">{orderError}</div>}
        {!isMobile && <div className="universal-search-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>}
      </div>}
      {order && <Suspense fallback={<div role="status" className="universal-search-detail-loading">Loading order details…</div>}>
        <OrderDetails order={order} open readOnly onOpenChange={next => { if (!next) setOrder(null); }}
          onCloseAutoFocus={event => { event.preventDefault(); (isMobile ? trigger.current : input.current)?.focus(); }} />
      </Suspense>}
    </div>
  );
}
