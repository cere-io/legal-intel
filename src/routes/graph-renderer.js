/**
 * D3 Force-Directed Graph Renderer
 * Renders main case graph and per-claim evidence graphs
 */

// Color palette matching warm cream theme
var COLORS = {
  claim: '#c47a4a',
  claimStrong: '#5a8a5e',
  claimWeak: '#9a9087',
  evidence: '#5a8a8a',
  element: '#c47a4a',
  elementProven: '#5a8a5e',
  elementPartial: '#c47a4a',
  elementUnproven: '#b84233',
  entity: '#7a6398',
  link: '#d8d0c6',
  linkStrong: '#c47a4a',
  text: '#1a1714',
  textLight: '#6b6259',
  bg: '#f5f0eb',
};

function renderMainGraph(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#9a9087">Loading graph...</div>';

  fetch('/api/graph/main').then(function(r) { return r.json(); }).then(function(data) {
    container.innerHTML = '';
    var width = container.clientWidth;
    var height = 500;

    var svg = d3.select('#' + containerId).append('svg')
      .attr('width', width).attr('height', height)
      .style('background', '#f5f0eb').style('border-radius', '12px').style('border', '1px solid #d8d0c6');

    // Arrow markers
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead').attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-3L8,0L0,3').attr('fill', '#d8d0c6');

    // Legend
    var legend = svg.append('g').attr('transform', 'translate(' + (width - 180) + ', 16)');
    legend.append('rect').attr('width', 170).attr('height', 80).attr('rx', 8).attr('fill', '#fff').attr('stroke', '#d8d0c6').attr('opacity', 0.95);
    legend.append('text').attr('x', 12).attr('y', 18).attr('font-size', '9px').attr('font-weight', '700').attr('fill', '#6b6259').text('LEGEND');
    var legendItems = [
      { shape: 'circle', color: '#5a8a5e', label: 'Strong claim (>90%)' },
      { shape: 'circle', color: '#c47a4a', label: 'Moderate claim (70-90%)' },
      { shape: 'circle', color: '#9a9087', label: 'Developing claim (<70%)' },
    ];
    legendItems.forEach(function(item, i) {
      var g = legend.append('g').attr('transform', 'translate(12, ' + (30 + i * 16) + ')');
      g.append('circle').attr('r', 5).attr('fill', item.color);
      g.append('text').attr('x', 14).attr('dy', '0.35em').attr('font-size', '9px').attr('fill', '#6b6259').text(item.label);
    });

    var simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(function(d) { return d.id; }).distance(function(d) { return 120 - d.strength * 40; }).strength(function(d) { return d.strength * 0.5; }))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(function(d) { return d.radius + 8; }));

    // Links
    var link = svg.append('g').selectAll('line').data(data.links).enter().append('line')
      .attr('stroke', function(d) { return d.strength > 0.8 ? '#c47a4a' : '#d8d0c6'; })
      .attr('stroke-width', function(d) { return 1 + d.strength * 3; })
      .attr('stroke-opacity', function(d) { return 0.3 + d.strength * 0.5; });

    // Link labels
    var linkLabel = svg.append('g').selectAll('text').data(data.links.filter(function(d) { return d.strength >= 0.8; })).enter().append('text')
      .attr('font-size', '8px').attr('fill', '#9a9087').attr('text-anchor', 'middle')
      .text(function(d) { return Math.round(d.strength * 100) + '%'; });

    // Nodes
    var node = svg.append('g').selectAll('g').data(data.nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
      .on('click', function(event, d) {
        showClaimGraph(d.id);
      });

    // Tooltip
    var tooltip = d3.select('body').selectAll('.graph-tooltip').data([0]).join('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none').style('opacity', 0)
      .style('background', '#fff').style('border', '1px solid #d8d0c6').style('border-radius', '8px')
      .style('padding', '10px 14px').style('font-size', '11px').style('font-family', "'Inter',sans-serif")
      .style('box-shadow', '0 4px 16px rgba(0,0,0,.1)').style('z-index', '300').style('max-width', '250px');

    node.append('circle')
      .attr('r', function(d) { return d.radius; })
      .attr('fill', function(d) { return d.color; })
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .attr('opacity', 0.9);

    node.on('mouseover', function(event, d) {
      var html = '<strong style="font-size:12px">' + d.label + '</strong>';
      if (d.strength !== undefined) html += '<br>Strength: <strong>' + Math.round(d.strength * 100) + '%</strong>';
      html += '<br><span style="color:#9a9087">Click to explore</span>';
      tooltip.html(html).style('opacity', 1)
        .style('left', (event.clientX + 12) + 'px').style('top', (event.clientY - 10) + 'px');
    }).on('mousemove', function(event) {
      tooltip.style('left', (event.clientX + 12) + 'px').style('top', (event.clientY - 10) + 'px');
    }).on('mouseout', function() { tooltip.style('opacity', 0); });

    // Strength label inside node
    node.filter(function(d) { return d.strength && d.radius > 10; }).append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', '9px').attr('font-weight', '700').attr('fill', '#fff')
      .text(function(d) { return Math.round(d.strength * 100); });

    // Name label below node
    node.append('text')
      .attr('text-anchor', 'middle').attr('dy', function(d) { return d.radius + 12; })
      .attr('font-size', '9px').attr('fill', '#6b6259').attr('font-family', "'Inter',sans-serif")
      .text(function(d) { return d.label.length > 25 ? d.label.slice(0, 25) + '...' : d.label; });

    simulation.on('tick', function() {
      link.attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
      linkLabel.attr('x', function(d) { return (d.source.x + d.target.x) / 2; })
        .attr('y', function(d) { return (d.source.y + d.target.y) / 2; });
      node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    function dragstarted(event) { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; }
    function dragged(event) { event.subject.fx = event.x; event.subject.fy = event.y; }
    function dragended(event) { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; }
  });
}

function showClaimGraph(claimId) {
  // Create modal
  var overlay = document.getElementById('graph-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'graph-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:200';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.style.display = 'none'; };
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
  overlay.innerHTML = '<div style="background:#faf7f3;border-radius:16px;width:90%;max-width:900px;max-height:85vh;overflow:hidden;border:1px solid #d8d0c6"><div style="padding:20px;border-bottom:1px solid #d8d0c6;display:flex;justify-content:space-between;align-items:center"><h2 id="claim-graph-title" style="font-family:Playfair Display,serif;font-size:20px;margin:0">Loading...</h2><div style="display:flex;gap:8px;align-items:center"><button id="graph-goto-section" style="padding:4px 12px;border:1px solid #d8d0c6;border-radius:6px;background:transparent;cursor:pointer;font-size:10px;font-family:Inter,sans-serif;color:#6b6259;display:none">Go to Section &rarr;</button><span id="graph-modal-close" style="cursor:pointer;font-size:20px;color:#9a9087">&times;</span></div></div><div id="claim-graph-container" style="padding:20px"></div><div id="claim-graph-details" style="padding:0 20px 20px;max-height:200px;overflow-y:auto"></div></div>';
  // Attach close handler
  document.getElementById('graph-modal-close').onclick = function() { overlay.style.display = 'none'; };

  fetch('/api/graph/claim/' + claimId).then(function(r) { return r.json(); }).then(function(data) {
    document.getElementById('claim-graph-title').textContent = data.claim.title;

    // Show "Go to Section" button with navigation
    var gotoBtn = document.getElementById('graph-goto-section');
    if (gotoBtn && typeof SECTION_MAP !== 'undefined' && SECTION_MAP[claimId]) {
      gotoBtn.style.display = 'inline-block';
      gotoBtn.onclick = function() {
        overlay.style.display = 'none';
        var secId = SECTION_MAP[claimId];
        if (typeof toggleSection === 'function') toggleSection(secId);
        var secEl = document.getElementById(secId);
        if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }

    var container = document.getElementById('claim-graph-container');
    container.innerHTML = '';
    var width = container.clientWidth || 800;
    var height = 400;

    var svg = d3.select('#claim-graph-container').append('svg')
      .attr('width', width).attr('height', height)
      .style('background', '#f5f0eb').style('border-radius', '8px').style('border', '1px solid #d8d0c6');

    // Legend for claim graph
    var cLegend = svg.append('g').attr('transform', 'translate(' + (width - 200) + ', 12)');
    cLegend.append('rect').attr('width', 190).attr('height', 120).attr('rx', 8).attr('fill', '#fff').attr('stroke', '#d8d0c6').attr('opacity', 0.95);
    cLegend.append('text').attr('x', 12).attr('y', 18).attr('font-size', '9px').attr('font-weight', '700').attr('fill', '#6b6259').text('LEGEND');
    var cItems = [
      { shape: 'circle', color: '#c47a4a', label: 'This claim' },
      { shape: 'circle', color: '#5a8a5e', label: 'Element: proven' },
      { shape: 'circle', color: '#b84233', label: 'Element: gap' },
      { shape: 'rect', color: '#5a8a8a', label: 'Evidence item' },
      { shape: 'diamond', color: '#7a6398', label: 'Key entity' },
      { shape: 'circle', color: '#9a9087', label: 'Connected claim' },
    ];
    cItems.forEach(function(item, i) {
      var g = cLegend.append('g').attr('transform', 'translate(12, ' + (30 + i * 14) + ')');
      if (item.shape === 'rect') g.append('rect').attr('width', 8).attr('height', 8).attr('x', -4).attr('y', -4).attr('fill', item.color);
      else if (item.shape === 'diamond') g.append('polygon').attr('points', '0,-5 5,0 0,5 -5,0').attr('fill', item.color);
      else g.append('circle').attr('r', 4).attr('fill', item.color);
      g.append('text').attr('x', 14).attr('dy', '0.35em').attr('font-size', '8px').attr('fill', '#6b6259').text(item.label);
    });

    var simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(function(d) { return d.id; }).distance(function(d) { return d.type === 'claim-element' ? 80 : d.type === 'entity' ? 120 : 100; }))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(function(d) { return d.radius + 6; }));

    // Links with different styles per type
    var link = svg.append('g').selectAll('line').data(data.links).enter().append('line')
      .attr('stroke', function(d) {
        if (d.type === 'contradicts') return '#b84233';
        if (d.type === 'supports') return '#5a8a5e';
        if (d.type === 'claim-claim') return '#c47a4a';
        return '#d8d0c6';
      })
      .attr('stroke-width', function(d) { return d.type === 'supports' || d.type === 'contradicts' ? 2 : 1.5; })
      .attr('stroke-dasharray', function(d) { return d.type === 'contradicts' ? '4,4' : 'none'; })
      .attr('stroke-opacity', 0.6);

    // Link labels
    var linkLabel = svg.append('g').selectAll('text').data(data.links.filter(function(d) { return d.label; })).enter().append('text')
      .attr('font-size', '7px').attr('fill', '#9a9087').attr('text-anchor', 'middle')
      .text(function(d) { return d.label; });

    // Nodes
    var node = svg.append('g').selectAll('g').data(data.nodes).enter().append('g')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

    // Different shapes per type
    node.each(function(d) {
      var g = d3.select(this);
      if (d.type === 'evidence') {
        g.append('rect').attr('width', d.radius * 2).attr('height', d.radius * 2)
          .attr('x', -d.radius).attr('y', -d.radius)
          .attr('rx', 3).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 1.5).attr('opacity', 0.9);
      } else if (d.type === 'entity') {
        g.append('polygon')
          .attr('points', function() { var r = d.radius; return '0,' + (-r) + ' ' + r + ',0 0,' + r + ' ' + (-r) + ',0'; })
          .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 1.5).attr('opacity', 0.8);
      } else {
        g.append('circle').attr('r', d.radius)
          .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 2).attr('opacity', 0.9);
      }
    });

    // Tooltips for claim graph
    var cTooltip = d3.select('body').selectAll('.claim-graph-tooltip').data([0]).join('div')
      .attr('class', 'claim-graph-tooltip')
      .style('position', 'fixed').style('pointer-events', 'none').style('opacity', 0)
      .style('background', '#fff').style('border', '1px solid #d8d0c6').style('border-radius', '8px')
      .style('padding', '10px 14px').style('font-size', '11px').style('font-family', "'Inter',sans-serif")
      .style('box-shadow', '0 4px 16px rgba(0,0,0,.1)').style('z-index', '300').style('max-width', '280px');

    node.on('mouseover', function(event, d) {
      var html = '<strong>' + d.label + '</strong>';
      if (d.type === 'element') html += '<br>Status: <strong style="color:' + d.color + '">' + (d.status || 'unknown').toUpperCase() + '</strong>';
      if (d.type === 'evidence') html += '<br><span style="color:#5a8a8a">Evidence item</span>';
      if (d.type === 'entity') html += '<br><span style="color:#7a6398">Key entity</span>';
      if (d.type === 'claim' && d.strength) html += '<br>Strength: ' + Math.round(d.strength * 100) + '%';
      cTooltip.html(html).style('opacity', 1)
        .style('left', (event.clientX + 12) + 'px').style('top', (event.clientY - 10) + 'px');
    }).on('mousemove', function(event) {
      cTooltip.style('left', (event.clientX + 12) + 'px').style('top', (event.clientY - 10) + 'px');
    }).on('mouseout', function() { cTooltip.style('opacity', 0); });

    // Labels
    node.append('text')
      .attr('text-anchor', 'middle').attr('dy', function(d) { return d.radius + 11; })
      .attr('font-size', function(d) { return d.type === 'claim' && d.radius > 15 ? '10px' : '8px'; })
      .attr('fill', '#6b6259').attr('font-family', "'Inter',sans-serif")
      .text(function(d) { return d.label.length > 20 ? d.label.slice(0, 20) + '...' : d.label; });

    simulation.on('tick', function() {
      link.attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
      linkLabel.attr('x', function(d) { return (d.source.x + d.target.x) / 2; })
        .attr('y', function(d) { return (d.source.y + d.target.y) / 2; });
      node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    function dragstarted(event) { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; }
    function dragged(event) { event.subject.fx = event.x; event.subject.fy = event.y; }
    function dragended(event) { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; }

    // Details panel
    var details = document.getElementById('claim-graph-details');
    var elHtml = '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9a9087;margin-bottom:8px">Legal Elements</div>';
    data.claim.elements.forEach(function(el) {
      var statusColor = el.status === 'proven' ? '#5a8a5e' : el.status === 'partial' ? '#c47a4a' : '#b84233';
      elHtml += '<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #ede8e1;font-size:12px">';
      elHtml += '<strong style="min-width:120px">' + el.name + '</strong>';
      elHtml += '<span style="color:' + statusColor + ';font-weight:600;min-width:60px">' + el.status.toUpperCase() + '</span>';
      elHtml += '<span style="color:#6b6259;flex:1">' + (el.supporting_evidence.length ? el.supporting_evidence.join(', ') : '') + '</span>';
      if (el.gap_description) elHtml += '<span style="color:#c47a4a;font-style:italic">' + el.gap_description + '</span>';
      elHtml += '</div>';
    });
    if (data.claim.current_understanding) {
      elHtml += '<div style="margin-top:12px;font-size:11px;color:#6b6259;line-height:1.6">' + data.claim.current_understanding + '</div>';
    }
    details.innerHTML = elHtml;
  });
}
