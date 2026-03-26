// === Notification Popups ===
var notifContainer = document.createElement('div');
notifContainer.id = 'notif-container';
notifContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:200;display:flex;flex-direction:column;gap:8px;max-width:420px;max-height:90vh;overflow-y:auto;pointer-events:none';
document.body.appendChild(notifContainer);

function showNotification(title, body, severity, autoClose) {
  var n = document.createElement('div');
  n.style.cssText = 'pointer-events:auto;background:#131620;border:1px solid ' + (severity === 'critical' ? 'rgba(239,68,68,.4)' : severity === 'high' ? 'rgba(245,158,11,.4)' : 'rgba(59,130,246,.3)') + ';border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:notifSlide .4s ease-out;cursor:pointer;position:relative';
  n.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:start"><div style="font-size:13px;font-weight:700;color:' + (severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f59e0b' : '#3b82f6') + '">' + title + '</div><span onclick="this.parentElement.parentElement.remove()" style="color:#5a6478;cursor:pointer;font-size:16px;line-height:1">&times;</span></div><div style="font-size:11px;color:#8b95a5;margin-top:6px;line-height:1.5">' + body + '</div>';
  notifContainer.appendChild(n);
  if (autoClose !== false) setTimeout(function() { if (n.parentElement) n.style.opacity = '0'; setTimeout(function() { if (n.parentElement) n.remove(); }, 300); }, 15000);
  return n;
}

function showStakeholderNotifications(actions, impacts, alerts) {
  // Group actions by person
  var byPerson = {};
  (actions || []).forEach(function(a) {
    if (!byPerson[a.assigned_to]) byPerson[a.assigned_to] = { firm: a.firm, actions: [], impacts: [] };
    byPerson[a.assigned_to].actions.push(a);
  });
  (impacts || []).forEach(function(i) {
    // Route impacts to relevant attorneys based on jurisdiction
    Object.keys(byPerson).forEach(function(name) {
      byPerson[name].impacts.push(i);
    });
  });

  // Show alerts first
  (alerts || []).forEach(function(a, i) {
    setTimeout(function() {
      showNotification(a.title, a.description, a.severity);
    }, i * 800);
  });

  // Then per-attorney notifications (staggered)
  var delay = (alerts || []).length * 800 + 500;
  Object.keys(byPerson).forEach(function(name, idx) {
    setTimeout(function() {
      var p = byPerson[name];
      var body = '<div style="margin-bottom:4px"><strong style="color:#06b6d4">' + name + '</strong> <span style="color:#5a6478">' + p.firm + '</span></div>';
      p.actions.forEach(function(a) {
        body += '<div style="background:rgba(245,158,11,.08);border-left:2px solid #f59e0b;padding:4px 8px;margin:4px 0;border-radius:0 4px 4px 0;font-size:10px"><strong>' + a.title + '</strong> &mdash; ' + a.sla_hours + 'h SLA</div>';
      });
      if (p.impacts.length > 0) {
        body += '<div style="font-size:10px;color:#5a6478;margin-top:4px">Cases affected: ' + p.impacts.map(function(i) { return '<span style="color:' + (i.impact_level === 'direct' ? '#ef4444' : '#f59e0b') + '">' + i.case_name + '</span>'; }).join(', ') + '</div>';
      }
      showNotification('Action Required: ' + name, body, 'high', false);
    }, delay + idx * 600);
  });
}

// Add notification animation
var notifStyle = document.createElement('style');
notifStyle.textContent = '@keyframes notifSlide{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}';
document.head.appendChild(notifStyle);

// === SSE Connection ===
var evtSource = new EventSource('/api/events');
evtSource.onmessage = function(e) { handleEvent(JSON.parse(e.data)); };

var pendingActions = null;
var pendingImpacts = null;

// === Tab Switching ===
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.tab[onclick*="' + tab + '"]').classList.add('active');
  document.getElementById('tab-kenzi').style.display = tab === 'kenzi' ? 'block' : 'none';
  document.getElementById('tab-clean').style.display = tab === 'clean' ? 'block' : 'none';
}

// === SSE Event Handler ===
function handleEvent(e) {
  if (e.type === 'reset') { location.reload(); return; }
  if (e.type === 'clean_reset') { location.reload(); return; }

  var isClean = e.data && e.data.tab === 'clean';

  if (e.type === 'step') {
    var d = e.data;
    addLog(d.step, d.message, isClean);

    if (d.step === 'received' && d.evidence) {
      var feed = document.getElementById(isClean ? 'clean-ev-feed' : 'ev-feed');
      // Remove empty state
      var empty = feed.querySelector('.empty-state');
      if (empty) empty.remove();
      var div = document.createElement('div');
      div.className = 'ev-item new';
      div.innerHTML = '<div class="et">' + (d.evidence.type || 'email') + '</div>' +
        '<div class="en">' + (d.evidence.title || d.evidence.id) + '</div>' +
        '<div class="es">' + (d.evidence.source || '') + '</div>';
      feed.insertBefore(div, feed.firstChild);
      if (isClean) {
        var count = parseInt(document.getElementById('clean-evidence').textContent) + 1;
        document.getElementById('clean-evidence').textContent = count;
      }
    }

    if (d.step === 'proposed' && d.proposals && d.proposals.length > 0) {
      var grid = document.getElementById(isClean ? 'clean-claims-grid' : 'claims-grid');
      if (isClean) { var es = grid.querySelector('.empty-state'); if (es) es.remove(); }
      d.proposals.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'claim-card proposed';
        card.dataset.id = p.id;
        card.innerHTML = '<div class="cc-section">PROPOSED</div>' +
          '<div class="cc-title">' + p.title + '</div>' +
          '<div class="cc-strength">25%</div>' +
          '<span class="cc-badge proposed">PROPOSED</span>' +
          (isClean ? '<br><button class="btn btn-sm btn-primary" style="margin-top:6px" onclick="event.stopPropagation();confirmClean(\'' + p.id + '\')">Confirm</button>' : '');
        grid.appendChild(card);
        if (isClean) {
          var c = parseInt(document.getElementById('clean-claims').textContent) + 1;
          document.getElementById('clean-claims').textContent = c;
        }
      });
      if (d.enrichments && d.enrichments.length > 0) {
        d.enrichments.forEach(function(en) {
          var existing = document.querySelector('.claim-card[data-id="' + en.claim_id + '"]');
          if (existing) {
            existing.classList.add('lit');
            setTimeout(function() { existing.classList.remove('lit'); }, 1000);
          }
        });
      }
    }

    if (d.step === 'scored' && d.scores) {
      d.scores.forEach(function(s, i) {
        setTimeout(function() {
          var card = document.querySelector('.claim-card[data-id="' + s.claimId + '"]');
          if (card) {
            var strength = card.querySelector('.cc-strength');
            if (strength) strength.textContent = Math.round(s.score * 100) + '%';
            card.classList.add('lit');
            setTimeout(function() { card.classList.remove('lit'); }, 1000);
          }
        }, i * 100);
      });
    }

    if (d.step === 'analyzed' && !isClean) {
      // Impacts
      if (d.impacts && d.impacts.length > 0) {
        var newEv = document.querySelector('.ev-item.new');
        if (newEv) {
          var badges = document.createElement('div');
          badges.className = 'impact-badges';
          d.impacts.forEach(function(imp) {
            var span = document.createElement('span');
            span.className = 'ib ' + imp.impact_level;
            span.textContent = imp.case_name;
            badges.appendChild(span);
          });
          newEv.appendChild(badges);
        }
      }
      // Actions
      if (d.actions && d.actions.length > 0) {
        var sec = document.getElementById('actions-section');
        sec.style.display = 'block';
        var list = document.getElementById('action-list');
        list.innerHTML = '';
        document.getElementById('action-count').textContent = d.actions.length;
        d.actions.forEach(function(a) {
          var div = document.createElement('div');
          div.className = 'action';
          var urgClass = a.sla_hours <= 24 ? 'urgent' : a.sla_hours <= 48 ? 'warn' : 'ok';
          div.innerHTML = '<div class="action-main"><div class="ai-title">' + a.title + '</div>' +
            '<div class="ai-who">' + a.assigned_to + ' &middot; ' + a.firm + '</div>' +
            '<div class="ai-desc">' + a.description + '</div>' +
            '<span class="ai-pri ' + a.priority + '">' + a.priority.toUpperCase() + '</span></div>' +
            '<div class="action-sla"><div class="hrs ' + urgClass + '">' + a.sla_hours + '</div><div class="unit">hrs SLA</div></div>';
          list.appendChild(div);
        });

        // Generate email previews
        showEmailPreviews(d.actions, d.impacts || []);

        // Show notification popups (staggered, per stakeholder)
        pendingActions = d.actions;
        pendingImpacts = d.impacts || [];
      }
    }

    if (d.step === 'alerts' && d.alerts) {
      var sec = document.getElementById(isClean ? 'clean-alerts-section' : 'alerts-section');
      sec.style.display = 'block';
      var feed = document.getElementById(isClean ? 'clean-alert-feed' : 'alert-feed');
      d.alerts.forEach(function(a) {
        var div = document.createElement('div');
        div.className = 'alert ' + a.severity;
        div.innerHTML = '<div class="at">' + a.title + '</div><div class="ad">' + a.description + '</div>';
        feed.appendChild(div);
      });
      if (!isClean) {
        document.getElementById('kpi-alerts').textContent = d.alerts.length;
        // Fire notification popups with alerts + pending actions
        showStakeholderNotifications(pendingActions || [], pendingImpacts || [], d.alerts);
        pendingActions = null;
        pendingImpacts = null;
      }
      if (isClean) document.getElementById('clean-alerts').textContent = parseInt(document.getElementById('clean-alerts').textContent) + d.alerts.length;
    }

    if (d.step === 'complete') {
      document.getElementById(isClean ? 'clean-status' : 'demo-status').textContent = 'Complete';
      document.getElementById('btn-trigger').disabled = false;
      if (isClean) enableNextCleanStep();
    }
  }

  if (e.type === 'claim_confirmed') {
    var claim = e.data.claim;
    var card = document.querySelector('.claim-card[data-id="' + claim.id + '"]');
    if (card) {
      card.classList.remove('proposed');
      var badge = card.querySelector('.cc-badge');
      if (badge) { badge.className = 'cc-badge active'; badge.textContent = 'ACTIVE'; }
      var confirmBtn = card.querySelector('button');
      if (confirmBtn) confirmBtn.remove();
    }
  }

  if (e.type === 'weights_updated' && e.data.changes) {
    var changes = e.data.changes;
    var keys = Object.keys(changes);
    if (keys.length > 0) {
      var msg = 'Weights updated: ' + keys.map(function(k) {
        return k + ' ' + (changes[k].old * 100).toFixed(1) + '% → ' + (changes[k].new * 100).toFixed(1) + '%';
      }).join(', ');
      addLog('weights', msg, e.data.tab === 'clean');
    }
  }

  if (e.type === 'error') {
    addLog('error', e.data.message, false);
    document.getElementById('btn-trigger').disabled = false;
  }
}

// === Log ===
function addLog(step, message, isClean) {
  var log = document.getElementById(isClean ? 'clean-log' : 'process-log');
  log.classList.add('active');
  // Auto-expand tech details when processing
  if (!isClean) { var td = document.getElementById('tech-details'); if (td) td.style.display = 'block'; }
  var time = new Date().toLocaleTimeString();
  var cls = step === 'complete' ? 'ok' : step === 'error' ? 'err' : 'run';
  var line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = '<span class="ts">' + time + '</span><span class="tag ' + cls + '">[' + step.toUpperCase() + ']</span> ' + message;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// === Kenzi Demo ===
function triggerKenzi() {
  document.getElementById('btn-trigger').disabled = true;
  document.getElementById('demo-status').textContent = 'Processing...';
  document.getElementById('process-log').innerHTML = '';
  fetch('/demo/trigger', { method: 'POST' });
}

function resetKenzi() {
  fetch('/demo/reset', { method: 'POST' });
}

// === Clean Demo ===
var cleanCurrentStep = 0;

function cleanStep(n) {
  document.getElementById('clean-status').textContent = 'Processing step ' + n + '...';
  document.getElementById('clean-step' + n).disabled = true;
  document.getElementById('clean-log').innerHTML = '';
  fetch('/demo/clean/step/' + n, { method: 'POST' });
  cleanCurrentStep = n;
}

function enableNextCleanStep() {
  if (cleanCurrentStep === 1) document.getElementById('clean-step2').disabled = false;
  if (cleanCurrentStep === 2) document.getElementById('clean-step3').disabled = false;
  if (cleanCurrentStep === 3) document.getElementById('clean-feedback').disabled = false;
}

function confirmClean(claimId) {
  fetch('/demo/clean/confirm/' + claimId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}

function cleanFeedback() {
  document.getElementById('clean-status').textContent = 'Submitting feedback...';
  fetch('/demo/clean/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}

function cleanReset() {
  fetch('/demo/clean/reset', { method: 'POST' });
}

// === Claim Modal ===
function showClaim(id) {
  fetch('/api/cubby/claims/' + id)
    .then(function(r) { return r.json(); })
    .then(function(claim) {
      var modal = document.getElementById('claim-modal');
      var content = document.getElementById('claim-modal-content');
      var html = '<h2>' + claim.title + '</h2>' +
        '<div class="modal-sub">Strength: ' + Math.round(claim.strength * 100) + '% | Template: ' + claim.template_id + ' | Status: ' + claim.status + '</div>';

      // Elements
      html += '<div style="margin-bottom:16px">';
      (claim.elements || []).forEach(function(el) {
        html += '<div class="el-row">' +
          '<div class="el-name">' + el.name + '</div>' +
          '<span class="el-status ' + el.status + '">' + el.status.toUpperCase() + '</span>' +
          '<div class="el-evidence">' + (el.supporting_evidence || []).join(', ') + '</div>' +
          (el.gap_description ? '<div class="el-gap">' + el.gap_description + '</div>' : '') +
          '</div>';
      });
      html += '</div>';

      // Connected claims
      var conns = Object.entries(claim.connected_claims || {});
      if (conns.length > 0) {
        html += '<div class="card-t" style="margin-bottom:8px">Connected Claims</div>';
        conns.forEach(function(c) {
          html += '<div style="font-size:11px;padding:2px 0">' + c[0] + ' — strength: ' + (c[1] * 100).toFixed(0) + '%</div>';
        });
      }

      // Evolution log
      if (claim.evolution_log && claim.evolution_log.length > 0) {
        html += '<div class="card-t" style="margin:12px 0 8px">Evolution Log</div>';
        claim.evolution_log.forEach(function(entry) {
          html += '<div style="font-size:10px;color:var(--text2);padding:2px 0"><strong>' + entry.date + '</strong>: ' + entry.delta + '</div>';
        });
      }

      // Current understanding
      html += '<div class="card-t" style="margin:12px 0 8px">Current Understanding</div>';
      html += '<div style="font-size:11px;line-height:1.5;color:var(--text2)">' + claim.current_understanding + '</div>';

      content.innerHTML = html;
      modal.classList.add('open');
    });
}

// === Cubby Inspector ===
function toggleCubby(el, path) {
  var existing = el.nextElementSibling;
  if (existing && existing.classList.contains('inspector-detail')) {
    existing.remove();
    return;
  }
  fetch('/api/cubby/' + path)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var detail = document.createElement('div');
      detail.className = 'inspector-detail';
      detail.textContent = JSON.stringify(data, null, 2);
      el.after(detail);
    });
}

// === Email Previews ===
function showEmailPreviews(actions, impacts) {
  var sec = document.getElementById('email-section');
  sec.style.display = 'block';

  // Rocky's email
  var rockyActions = actions.filter(function(a) { return a.assigned_to === 'Rocky Lee'; });
  var rockyHtml = '<h3>Evidence Alert: Rocky\'s Email Impacts 4+ Cases</h3>' +
    '<div class="ep-meta">To: Rocky Lee &lt;rocky.lee@milliard.law&gt;<br>From: Claim Intelligence Engine<br>Date: ' + new Date().toLocaleDateString() + '</div>' +
    '<p>Rocky, your Goopal CEO finding was processed. Here\'s what it changes:</p>';
  impacts.forEach(function(imp) {
    rockyHtml += '<div class="ep-case"><h4>' + imp.case_name + ' — ' + imp.impact_level.toUpperCase() + '</h4><p style="font-size:11px;margin:0">' + imp.reasoning + '</p></div>';
  });
  rockyActions.forEach(function(a) {
    rockyHtml += '<div class="ep-action">' + a.title + ' — due in ' + a.sla_hours + 'h</div>';
  });
  document.getElementById('rocky-email').innerHTML = rockyHtml;

  // Susanna's email
  var susannaActions = actions.filter(function(a) { return a.assigned_to.includes('Susanna') || a.assigned_to.includes('Matt'); });
  var ndcaImpacts = impacts.filter(function(i) { return i.jurisdiction === 'NDCA' || !i.jurisdiction; });
  var susannaHtml = '<h3>NDCA Update: New Evidence Affects Your Motions</h3>' +
    '<div class="ep-meta">To: Susanna Chenette &lt;schenette@hansonbridgett.com&gt;<br>From: Claim Intelligence Engine<br>Date: ' + new Date().toLocaleDateString() + '</div>';
  ndcaImpacts.forEach(function(imp) {
    susannaHtml += '<div class="ep-case"><h4>' + imp.case_name + '</h4><p style="font-size:11px;margin:0">' + imp.reasoning + '</p></div>';
  });
  susannaActions.forEach(function(a) {
    susannaHtml += '<div class="ep-action">' + a.title + ' — due in ' + a.sla_hours + 'h</div>';
  });
  document.getElementById('susanna-email').innerHTML = susannaHtml;
}
