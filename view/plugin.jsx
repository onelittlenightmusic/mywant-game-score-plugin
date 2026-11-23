// game_score card plugin — JIT loaded from
// ~/.mywant/custom-types/mywant-game-score-plugin/view/plugin.jsx
//
// A scoreboard, as a search result shows a game: the league and the clock on
// top; the two logos with the score between them; the teams' names and season
// records; and, while it is being played, each side's timeouts left (dots),
// the ball beside whoever has it, and where play stands (2nd & 5 at MIN 10).
// The team the want follows is on the left.
//
// Collapsed: the logos and the score, the clock. Expanded: all of it, with the
// venue, who shows it and when it starts.
//
// window.React and window.__mywant are provided by the host app. Tailwind
// classes are not available here, so styling is a self-contained <style> block.
const React = window.React;

const LIVE = '#188038';
const LEAGUE = '#1a4fb4';
const DOT = '#f0b429';

const CSS = `
.gs { display:flex; flex-direction:column; width:100%; color:#202124; font-variant-numeric:tabular-nums; }
.gs-top { display:flex; justify-content:space-between; align-items:baseline; font-size:0.78em; padding:0 2px; }
.gs-league { color:${LEAGUE}; font-weight:500; }
.gs-clock { font-weight:700; color:#5f6368; }
.gs-clock-live { color:${LIVE}; }
.gs-board { display:grid; grid-template-columns:1fr auto auto auto 1fr; align-items:center; column-gap:0.6em; }
.gs-logo { justify-self:center; width:2.6em; height:2.6em; object-fit:contain; }
.gs-logo-blank { justify-self:center; width:2.6em; height:2.6em; border-radius:50%; background:rgba(0,0,0,0.08); }
.gs-score { font-size:2.3em; font-weight:400; line-height:1; min-width:1.2em; text-align:center; }
.gs-score-lead { font-weight:500; }
.gs-dash { font-size:1.6em; color:#80868b; padding:0 0.2em; }
.gs-names { display:grid; grid-template-columns:1fr 1fr; margin-top:0.35em; }
.gs-team { display:flex; flex-direction:column; align-items:center; gap:0.1em; min-width:0; }
.gs-name { font-size:0.92em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.gs-record { font-size:0.75em; color:#70757a; }
.gs-foot { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; margin-top:0.45em; font-size:0.8em; }
.gs-side { display:flex; align-items:center; gap:0.45em; justify-content:center; }
.gs-dots { display:inline-flex; gap:0.3em; }
.gs-dot { width:0.42em; height:0.42em; border-radius:50%; background:${DOT}; }
.gs-dot-used { background:rgba(0,0,0,0.14); }
.gs-ball { width:1.15em; height:0.7em; border-radius:50%; background:#6b4226;
           box-shadow: inset 0 0 0 0.08em #4a2c18; position:relative; }
.gs-ball::after { content:''; position:absolute; left:30%; right:30%; top:45%; height:0.08em; background:#f5f5f5; }
.gs-situation { color:#3c4043; white-space:nowrap; }
.gs-facts { display:flex; flex-wrap:wrap; justify-content:center; gap:0.3em 0.9em; margin-top:0.6em;
            font-size:0.72em; color:#70757a; }
.gs-error { font-size:0.8em; color:#b3261e; text-align:center; }
.gs-pad { padding:0.4em 0.9em; }

.dark .gs { color:#e8eaed; }
.dark .gs-league { color:#8ab4f8; }
.dark .gs-clock { color:#9aa0a6; }
.dark .gs-clock-live { color:#81c995; }
.dark .gs-record, .dark .gs-facts { color:#9aa0a6; }
.dark .gs-situation { color:#bdc1c6; }
.dark .gs-dot-used { background:rgba(255,255,255,0.18); }
.dark .gs-logo-blank { background:rgba(255,255,255,0.12); }
`;

function Logo({ src, alt }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return <span className="gs-logo-blank" aria-hidden="true" />;
  return <img className="gs-logo" src={src} alt={alt} onError={() => setBroken(true)} />;
}

function Timeouts({ left }) {
  if (typeof left !== 'number' || left < 0) return null;
  return (
    <span className="gs-dots" aria-label={`タイムアウト残り ${left}`}>
      {[0, 1, 2].map(i => <span key={i} className={`gs-dot${i < left ? '' : ' gs-dot-used'}`} />)}
    </span>
  );
}

function startText(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function GameScoreContentSection({ want, isExpanded }) {
  const cur = want.state?.current ?? {};
  const params = want.spec?.params ?? {};
  const style = <style key="css">{CSS}</style>;
  const state = cur.game_state || '';
  const live = state === 'in';
  const league = String(params.league || 'nfl').toUpperCase();
  const clock = state === 'pre' ? (startText(cur.game_start) || cur.game_status) : (cur.status_label || cur.game_status || '');
  const mine = Number(cur.team_score) || 0;
  const theirs = Number(cur.opponent_score) || 0;
  const played = state === 'in' || state === 'post';

  if (!cur.team_name) {
    return window.__mywant.createCardLayout({
      centerContent: true,
      content: (
        <div className="gs gs-pad">
          {style}
          <div className="gs-error">{cur.last_error || cur.summary || (params.query ? '読み込み中…' : 'query を入れてください')}</div>
        </div>
      ),
    });
  }

  const board = (
    <div className="gs-board">
      <Logo src={cur.team_logo} alt={cur.team_name} />
      <span className={`gs-score${played && mine > theirs ? ' gs-score-lead' : ''}`}>{played ? mine : ''}</span>
      <span className="gs-dash">{played ? '-' : 'vs'}</span>
      <span className={`gs-score${played && theirs > mine ? ' gs-score-lead' : ''}`}>{played ? theirs : ''}</span>
      <Logo src={cur.opponent_logo} alt={cur.opponent_name} />
    </div>
  );
  const top = (
    <div className="gs-top">
      <span className="gs-league">{league}</span>
      <span className={`gs-clock${live ? ' gs-clock-live' : ''}`}>{clock}</span>
    </div>
  );

  if (!isExpanded) {
    return window.__mywant.createCardLayout({
      centerContent: true,
      content: (
        <div className="gs gs-pad">
          {style}
          {top}
          {board}
          <div className="gs-names">
            <div className="gs-team"><span className="gs-name">{cur.team_name}</span></div>
            <div className="gs-team"><span className="gs-name">{cur.opponent_name}</span></div>
          </div>
        </div>
      ),
    });
  }

  const facts = [
    cur.venue,
    cur.broadcast && `中継 ${cur.broadcast}`,
    cur.game_start && `開始 ${startText(cur.game_start)}`,
  ].filter(Boolean);

  return window.__mywant.createCardLayout({
    content: (
      <div className="gs gs-pad" style={{ paddingTop: '0.8em' }}>
        {style}
        {top}
        <div style={{ marginTop: '0.5em' }}>{board}</div>
        <div className="gs-names">
          <div className="gs-team">
            <span className="gs-name">{cur.team_full_name || cur.team_name}</span>
            {cur.team_record && <span className="gs-record">({cur.team_record.replace('-', ' - ')})</span>}
          </div>
          <div className="gs-team">
            <span className="gs-name">{cur.opponent_full_name || cur.opponent_name}</span>
            {cur.opponent_record && <span className="gs-record">({cur.opponent_record.replace('-', ' - ')})</span>}
          </div>
        </div>
        {live && (
          <div className="gs-foot">
            <span className="gs-side">
              <Timeouts left={cur.team_timeouts} />
              {cur.team_possession && <span className="gs-ball" aria-label="攻撃中" />}
            </span>
            <span className="gs-situation">{cur.situation}</span>
            <span className="gs-side">
              {cur.opponent_possession && <span className="gs-ball" aria-label="攻撃中" />}
              <Timeouts left={cur.opponent_timeouts} />
            </span>
          </div>
        )}
        {facts.length > 0 && <div className="gs-facts">{facts.map(f => <span key={f}>{f}</span>)}</div>}
      </div>
    ),
  });
}

window.__mywant.registerPlugin({
  types: ['game_score'],
  ContentSection: GameScoreContentSection,
  hideFinalResult: true,
});
