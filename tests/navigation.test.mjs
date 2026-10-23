import test from "node:test";
import assert from "node:assert/strict";
import { TGLensSet, RotateLens } from "fm4/core";
import { FreshNode, FreshEdge, FreshGraph, collectCandidates, screenDirection, bestCandidateIndex } from "fm4/fm/core";
import { FreshmindPanel } from "fm4/fm";

class Clock {
  time = 0; id = 0; tasks = new Map();
  setTimeout(callback, ms) { const id = ++this.id; this.tasks.set(id, { at: this.time + ms, callback }); return id; }
  clearTimeout(id) { this.tasks.delete(id); }
  advance(ms) {
    this.time += ms;
    for (const [id, task] of [...this.tasks]) if (task.at <= this.time && this.tasks.delete(id)) task.callback();
  }
}
function fixture(t, options = {}) {
  const clock = new Clock();
  const p = new FreshmindPanel(undefined, { autoStart: false, animateLocality: false, navigation: { clock, ...options } });
  t.after(() => p.destroy());
  p.setLensSet(new TGLensSet());
  const node = (id, x, y) => p.addNode(new FreshNode(id, id, { position: { x, y } }));
  const a = node("a", 0, 0), upper = node("upper", 100, -35), middle = node("middle", 100, 0), lower = node("lower", 100, 35);
  const edge = (id, from, to) => p.addEdge(new FreshEdge(from, to, { id, label: id }));
  const edges = [edge("upper-edge", upper, a), edge("middle-edge", a, middle), edge("lower-edge", a, lower)];
  p.setSelect(a);p.updateDrawPositions();
  return { p, n: p.getNavigation(), a, upper, middle, lower, edges, node, edge, clock };
}
const active = n => { const s = n.getState().preselection; return s?.candidateIds[s.activeIndex]; };
const visible = p => [...p.getGES().getNodes()].map(n => n.getID()).sort();

test("detail visibility can be dismissed explicitly and clears when selection disappears", t => {
  const {p,n,a} = fixture(t);
  n.setDetailsVisible(true); assert.equal(n.getState().detailsVisible, true);
  n.setDetailsVisible(false); n.setDetailsVisible(false); assert.equal(n.getState().detailsVisible, false);
  n.toggleDetails(); assert.equal(n.getState().detailsVisible, true);
  p.setSelect(null); assert.equal(n.getState().detailsVisible, false);
  n.setDetailsVisible(true); assert.equal(n.getState().detailsVisible, false);
  p.setSelect(a); assert.equal(n.getState().detailsVisible, false);
});

test("action disposers remove owned callbacks without clearing later registrations", t => {
  const {n, a} = fixture(t);
  let help = 0, edits = 0;
  const disposeOld = n.setActions({help: () => { help++; }});
  const disposeNew = n.setActions({help: () => { help += 10; }, edit: item => { assert.equal(item, a); edits++; }});
  disposeOld();
  n.handleKey({key: "?"}); n.handleKey({key: "F2"});
  assert.equal(help, 10); assert.equal(edits, 1);
  disposeNew(); disposeNew();
  n.handleKey({key: "?"}); n.handleKey({key: "F2"});
  assert.equal(help, 10); assert.equal(edits, 1);
  const shared = () => { help++; };
  const disposeFirst = n.setActions({help: shared});
  const disposeSecond = n.setActions({help: shared});
  disposeFirst(); n.handleKey({key: "?"});
  assert.equal(help, 11);
  disposeSecond(); n.handleKey({key: "?"});
  assert.equal(help, 11);
});

test("screen sectors cover exact diagonals and reject degenerate vectors", () => {
  for (const [x,y,d] of [[1,0,"right"],[1,1,"down"],[0,1,"down"],[-1,1,"left"],[-1,0,"left"],[-1,-1,"up"],[0,-1,"up"],[1,-1,"right"]])
    assert.equal(screenDirection(x,y),d);
  assert.equal(screenDirection(0,0),null);assert.equal(screenDirection(Infinity,1),null);assert.equal(screenDirection(1,NaN),null);
  for (let i=0;i<3600;i++) assert.ok(screenDirection(Math.cos(i/10),Math.sin(i/10)));
});
test("candidates use visible draw geometry, deduplicate nodes and preserve parallel incoming relations", t => {
  const {p,a,upper,middle,node,edge} = fixture(t);
  edge("parallel",middle,a);edge("loop",a,a);edge("coincident",a,node("same",0,0));
  const hidden = node("hidden",120,10);edge("hidden-edge",a,hidden);p.getGES().removeNode(hidden);p.repaint();
  const nodes=collectCandidates(p.getGES(),a,"right","node");
  assert.deepEqual(nodes.map(c=>c.id),["upper","middle","lower"]);assert.equal(nodes[bestCandidateIndex(nodes)].item,middle);
  assert.deepEqual(collectCandidates(p.getGES(),a,"right","edge").map(c=>c.id),["upper-edge","middle-edge","parallel","lower-edge"]);
  upper.x=-100;p.updateDrawPositions();assert.equal(collectCandidates(p.getGES(),a,"left","node")[0].item,upper);
});
test("initial choice breaks axis ties by distance and then stable ID", t => {
  const {p,a,middle,upper,lower,node,edge}=fixture(t);
  upper.y=0;upper.x=50;lower.y=0;lower.x=50;middle.x=200;
  const extra=node("aaa",50,0);edge("extra",a,extra);p.updateDrawPositions();
  const candidates=collectCandidates(p.getGES(),a,"right","node");assert.equal(candidates[bestCandidateIndex(candidates)].item,extra);
});
test("symmetric off-axis choices use distance and ID without angular rounding bias", t => {
  const {p,a,middle,upper,lower}=fixture(t);middle.x=-100;upper.y=-30;lower.y=30;p.updateDrawPositions();
  let candidates=collectCandidates(p.getGES(),a,"right","node");assert.equal(candidates[bestCandidateIndex(candidates)].item,lower);
  upper.x=50;upper.y=-15;p.updateDrawPositions();candidates=collectCandidates(p.getGES(),a,"right","node");
  assert.equal(candidates[bestCandidateIndex(candidates)].item,upper);
});
test("preselection cycles clockwise, wraps, ignores repeat confirmation and keeps committed selection", t => {
  const {p,n,a,middle}=fixture(t);
  n.navigate("right");assert.equal(active(n),"middle");assert.equal(p.getSelection(),a);
  n.navigate("right","node",true);assert.equal(p.getSelection(),a);assert.equal(active(n),"middle");
  n.navigate("down");assert.equal(active(n),"lower");n.navigate("down");assert.equal(active(n),"upper");
  n.navigate("up");assert.equal(active(n),"lower");n.navigate("up");assert.equal(active(n),"middle");
  n.navigate("right");assert.equal(p.getSelection(),middle);assert.equal(n.getState().preselection,null);
  assert.equal(middle.isPreselected(),false);assert.equal(middle.isKeyselected(),false);
});
test("opposite cancels; one candidate commits; missing anchor initializes without navigating", t => {
  const {p,n,a,upper}=fixture(t);
  n.navigate("right");n.navigate("left");assert.equal(n.getState().preselection,null);assert.equal(p.getSelection(),a);
  n.navigate("left");assert.equal(p.getSelection(),a);
  p.setSelect(upper);n.navigate("left");assert.equal(p.getSelection(),a);
  p.setSelect(null);n.navigate("right");assert.equal(p.getSelection(),a);assert.equal(n.getState().preselection,null);
});
test("switching node/edge mode rebuilds candidates and Escape restores the incident anchor", t => {
  const {p,n,a,middle,edges,edge}=fixture(t);edge("parallel",middle,a);
  n.handleKey({key:"ArrowRight"});n.handleKey({key:"ArrowRight",shiftKey:true});
  assert.equal(n.getState().preselection.kind,"edge");assert.equal(n.getState().preselection.candidateIds.length,4);
  assert.equal(active(n),"middle-edge");n.handleKey({key:" "});assert.equal(p.getSelection(),edges[1]);assert.equal(p.getSelect(),a);
  n.handleKey({key:"Escape"});assert.equal(p.getSelection(),a);n.handleKey({key:"Escape"});assert.equal(p.getSelection(),null);
});
test("candidate order freezes through motion and lens changes; pruning never confirms a survivor", t => {
  const {p,n,a,upper,middle,lower,edges}=fixture(t);
  n.navigate("right");const before=n.getState().preselection.candidateIds;
  upper.x=-100;middle.y=900;lower.y=-500;p.repaintAfterMove();assert.deepEqual(n.getState().preselection.candidateIds,before);
  const lenses=new TGLensSet();lenses.addLens(new RotateLens(Math.PI));p.setLensSet(lenses);
  assert.deepEqual(n.getState().preselection.candidateIds,before);
  const snapshot=n.getState();snapshot.preselection.candidateIds.reverse();assert.deepEqual(n.getState().preselection.candidateIds,before);
  p.hideEdge(edges[0]);p.hideEdge(edges[2]);assert.deepEqual(n.getState().preselection.candidateIds,["middle"]);
  assert.equal(p.getSelection(),a);assert.equal(upper.isPreselected(),false);assert.equal(lower.isKeyselected(),false);
  p.hideEdge(edges[1]);assert.equal(n.getState().preselection,null);assert.equal(p.getSelection(),a);
});
test("timeout rearms on activity, zero disables it, and cleanup restores owned highlights", async t => {
  const {p,n,middle,clock}=fixture(t);middle.setPreselected(true);middle.setKeyselected(true);
  n.navigate("right");clock.advance(2400);n.navigate("down");clock.advance(2400);assert.ok(n.getState().preselection);
  clock.advance(100);assert.equal(n.getState().preselection,null);assert.equal(middle.isPreselected(),true);assert.equal(middle.isKeyselected(),true);
  await n.configure({preselectionTimeoutMs:0});n.navigate("right");clock.advance(99999);assert.ok(n.getState().preselection);
  await n.configure({preselectionTimeoutMs:50});clock.advance(50);assert.equal(n.getState().preselection,null);
  n.navigate("right");p.destroy();assert.equal(clock.tasks.size,0);assert.equal(n.handleKey({key:"ArrowRight"}),false);
});
test("selection, locality replacement, graph replacement and anchor deletion cancel candidates", async t => {
  const {p,n,a,upper,clock}=fixture(t);
  n.navigate("right");p.setSelect(upper);assert.equal(n.getState().preselection,null);
  p.setSelect(a);n.navigate("right");await p.setLocale(a,1);assert.equal(n.getState().preselection,null);
  n.navigate("right");p.deleteNode(a);assert.equal(n.getState().preselection,null);assert.equal(clock.tasks.size,0);
  p.setGraphEltSet(new FreshGraph());assert.equal(p.getNeighborhoodFocus(),null);assert.equal(p.getSelection(),null);
});
test("centering through nonlinear/rotated lenses preserves physical positions, selection and locality", async t => {
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false,hyperbolic:80});t.after(()=>p.destroy());
  const a=p.addNode(new FreshNode("a","A",{position:{x:75,y:42}})),b=p.addNode(new FreshNode("b","B",{position:{x:-80,y:30}}));
  p.addEdge(a,b);Object.assign(p.getAdjustOriginLens(),p.getDrawCenter());
  await p.focusNode(a);p.setSelect(b);p.setRotation(.7);p.zoomBy(1.5);const nodes=visible(p),position=[b.x,b.y];
  p.centerOn(b);const center=p.getDrawCenter();assert.ok(Math.hypot(b.drawx-center.x,b.drawy-center.y)<1e-8);
  assert.equal(p.getFocus(),a);assert.equal(p.getSelect(),b);assert.deepEqual(visible(p),nodes);assert.deepEqual([b.x,b.y],position);
  p.centerOn(b,true);assert.equal(p.getFocus(),b);assert.ok(Math.hypot(b.drawx-center.x,b.drawy-center.y)<1e-8);
  assert.throws(()=>p.centerOn(new FreshNode("absent")),/belong/);
});
test("selection and pan-only centering retain neighborhood; focused centering applies filters around edge anchor", async t => {
  const {p,n,a,middle,edges}=fixture(t);await p.focusNode(a,1);p.setSelect(middle);p.setSelectEdge(edges[1]);
  const before=visible(p);await n.configure({moveToCenter:false});await n.centerSelection();
  assert.equal(p.getFocus(),a);assert.equal(p.getNeighborhoodFocus(),a);assert.equal(p.getSelection(),edges[1]);assert.deepEqual(visible(p),before);
  await n.configure({moveToCenter:true});await n.centerSelection();assert.equal(p.getFocus(),middle);assert.equal(p.getNeighborhoodFocus(),middle);
  assert.equal(p.getSelection(),edges[1]);assert.deepEqual(visible(p),["a","middle"]);
  await n.configure({radius:0});assert.deepEqual(visible(p),["middle"]);assert.equal(p.getSelectEdge(),null);assert.equal(p.getSelect(),middle);
});
test("radius, backlink and degree settings share locality APIs; whole graph preserves configured radius", async t => {
  const {p,n,a,upper}=fixture(t);await p.focusNode(a,1);
  await n.configure({backlinks:false});assert.deepEqual(visible(p),["a","lower","middle"]);
  await n.configure({backlinks:true,maxAddEdgeCount:0});assert.deepEqual(visible(p),["a"]);
  await n.configure({maxAddEdgeCount:1000,maxExpandEdgeCount:0});assert.deepEqual(visible(p),["a","lower","middle","upper"]);
  await n.configure({radius:0});assert.deepEqual(visible(p),["a"]);await n.expand();assert.ok(p.getGES().contains(upper));
  await n.collapse();assert.equal(p.getCompleteEltSet().nodeCount(),4);await n.hide();assert.equal(p.getCompleteEltSet().nodeCount(),4);
  await p.setLocaleAll();assert.equal(n.getState().wholeGraph,true);assert.equal(n.getState().settings.radius,0);
  p.setSelect(a);await n.centerSelection();assert.equal(n.getState().wholeGraph,false);assert.deepEqual(visible(p),["a"]);
});
test("Enter/Space confirm alone, shortcuts are scoped and settings validation is atomic", async t => {
  const {p,n,a,middle}=fixture(t);let edited=null;n.setActions({edit:item=>{edited=item;}});
  n.navigate("right");n.handleKey({key:"Enter"});assert.equal(p.getSelection(),middle);assert.equal(p.getNeighborhoodFocus(),null);
  n.handleKey({key:" "});assert.equal(n.getState().detailsVisible,true);n.handleKey({key:"F2"});assert.equal(edited,middle);
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}]) assert.equal(n.handleKey({key:"ArrowLeft",...extra}),false);
  assert.equal(n.handleKey({key:"Tab"}),false);assert.equal(n.handleKey({key:"B",shiftKey:true}),false);
  assert.equal(n.handleKey({key:"b",repeat:true}),false);assert.equal(n.getState().settings.backlinks,true);
  const before=n.getState().settings;await assert.rejects(n.configure({radius:-1,moveToCenter:false}),RangeError);assert.deepEqual(n.getState().settings,before);
  await assert.rejects(n.configure({preselectionTimeoutMs:NaN}),RangeError);
  p.setSelect(a);n.handleKey({key:"n"});assert.equal(n.getState().settings.moveToCenter,false);
  n.handleKey({key:"6"});assert.equal(n.getState().settings.radius,6);n.handleKey({key:"b"});assert.equal(n.getState().settings.backlinks,false);
});
test("queued neighborhood replacements retain the latest hidden focus and graph resets invalidate pending requests", async t => {
  const {p,n,a,node}=fixture(t);const other=node("other",400,400);
  await p.setLocale(a,0);assert.equal(p.getGES().contains(other),false);
  const first=p.setLocale(a,1),last=p.setLocale(other,0);await Promise.all([first,last]);
  assert.equal(p.getNeighborhoodFocus(),other);assert.deepEqual(visible(p),["other"]);
  await n.configure({radius:1});assert.equal(p.getNeighborhoodFocus(),other);
  const pending=p.setLocale(a,1);p.setGraphEltSet(new FreshGraph());await pending;
  assert.equal(p.getNeighborhoodFocus(),null);assert.equal(p.visibleNodeCount(),0);
});

test("Ctrl up/down zooms within panel limits without needing selection or changing stored positions", t => {
  const {p,n}=fixture(t);p.setSelect(null);const positions=[...p.getAllNodes()].map(node=>[node.x,node.y]),members=visible(p);
  assert.equal(n.handleKey({key:"ArrowUp",ctrlKey:true}),true);assert.equal(p.getZoom(),1.2);
  n.handleKey({key:"ArrowDown",ctrlKey:true});assert.ok(Math.abs(p.getZoom()-1)<1e-12);
  n.handleKey({key:"ArrowUp",ctrlKey:true,repeat:true});assert.equal(p.getZoom(),1.2);
  p.setZoom(5);n.handleKey({key:"ArrowUp",ctrlKey:true});assert.equal(p.getZoom(),5);
  p.setZoom(.15);n.handleKey({key:"ArrowDown",ctrlKey:true});assert.equal(p.getZoom(),.15);
  assert.equal(p.getSelection(),null);assert.deepEqual(visible(p),members);
  assert.deepEqual([...p.getAllNodes()].map(node=>[node.x,node.y]),positions);
  for(const extra of [{metaKey:true},{altKey:true},{isComposing:true}])
    assert.equal(n.handleKey({key:"ArrowUp",ctrlKey:true,...extra}),false);
  assert.equal(n.handleKey({key:"ArrowLeft",ctrlKey:true}),false);
});
test("Ctrl Shift left/right adjusts the live focus/context lens and clamps to its bounds", t => {
  const {p,n,a,edges}=fixture(t);p.setSelectEdge(edges[1]);p.setHyperbolic(37);
  assert.equal(n.handleKey({key:"ArrowRight",ctrlKey:true,shiftKey:true}),true);assert.equal(p.getHyperbolic(),42);
  n.handleKey({key:"ArrowLeft",ctrlKey:true,shiftKey:true});assert.equal(p.getHyperbolic(),37);
  p.setHyperbolic(97);n.handleKey({key:"ArrowRight",ctrlKey:true,shiftKey:true});assert.equal(p.getHyperbolic(),100);
  n.handleKey({key:"ArrowLeft",ctrlKey:true,shiftKey:true,repeat:true});assert.equal(p.getHyperbolic(),95);
  p.setHyperbolic(2);n.handleKey({key:"ArrowLeft",ctrlKey:true,shiftKey:true});assert.equal(p.getHyperbolic(),0);
  assert.equal(p.getZoom(),1);assert.equal(p.getSelection(),edges[1]);assert.equal(p.getSelect(),a);
  assert.equal(p.getCanvasZoom(),1);
  assert.throws(()=>n.adjustFocusContext(NaN),RangeError);assert.equal(p.getHyperbolic(),0);
});
test("Ctrl Shift up/down changes graph spacing independently of canvas zoom", t => {
  const {p,n}=fixture(t);p.setSelect(null);p.setCanvasZoom(1.7);p.setHyperbolic(37);
  const positions=[...p.getAllNodes()].map(node=>[node.x,node.y]),members=visible(p);
  const key = {ctrlKey:true,shiftKey:true};
  assert.equal(n.handleKey({...key,key:"ArrowUp"}),true);assert.equal(p.getZoom(),1.2);
  n.handleKey({...key,key:"ArrowDown"});assert.ok(Math.abs(p.getZoom()-1)<1e-12);
  n.handleKey({...key,key:"ArrowUp",repeat:true});assert.equal(p.getZoom(),1.2);
  p.setZoom(5);n.handleKey({...key,key:"ArrowUp"});assert.equal(p.getZoom(),5);
  p.setZoom(.15);n.handleKey({...key,key:"ArrowDown"});assert.equal(p.getZoom(),.15);
  assert.equal(p.getCanvasZoom(),1.7);assert.equal(p.getHyperbolic(),37);assert.equal(p.getSelection(),null);
  assert.deepEqual(visible(p),members);assert.deepEqual([...p.getAllNodes()].map(node=>[node.x,node.y]),positions);
});
test("view shortcuts preserve frozen preselection and rearm its inactivity timer", t => {
  const {p,n,a,clock}=fixture(t);n.navigate("right");const pending=n.getState().preselection;
  clock.advance(2400);n.handleKey({key:"ArrowUp",ctrlKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true,altKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  n.handleKey({key:"ArrowRight",ctrlKey:true,shiftKey:true,altKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  n.handleKey({key:"ArrowRight",ctrlKey:true,shiftKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  n.handleKey({key:"+",shiftKey:true});clock.advance(2400);
  assert.deepEqual(n.getState().preselection,pending);assert.equal(p.getSelection(),a);
  clock.advance(100);assert.equal(n.getState().preselection,null);assert.equal(p.getSelection(),a);
});
test("plus/minus canvas shortcuts repeat independently of graph zoom and pass browser chords through", t => {
  const {p,n,a}=fixture(t);p.setZoom(1.8);p.setHyperbolic(40);
  const positions=[...p.getAllNodes()].map(node=>[node.x,node.y]);
  assert.equal(n.handleKey({key:"+",shiftKey:true}),true);assert.equal(p.getCanvasZoom(),1.2);
  n.handleKey({key:"-"});assert.ok(Math.abs(p.getCanvasZoom()-1)<1e-12);
  n.handleKey({key:"=",repeat:true});assert.equal(p.getCanvasZoom(),1.2);
  p.setCanvasZoom(5);n.handleKey({key:"+"});assert.equal(p.getCanvasZoom(),5);
  p.setCanvasZoom(.15);n.handleKey({key:"-"});assert.equal(p.getCanvasZoom(),.15);
  assert.equal(p.getZoom(),1.8);assert.equal(p.getHyperbolic(),40);assert.equal(p.getSelect(),a);
  assert.deepEqual([...p.getAllNodes()].map(node=>[node.x,node.y]),positions);
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}])
    assert.equal(n.handleKey({key:"+",...extra}),false);
});
test("Ctrl Shift Option up/down and Ctrl Shift 1 control canvas scale independently", t => {
  const {p,n,a}=fixture(t);p.setZoom(1.8);p.setHyperbolic(37);
  const positions=[...p.getAllNodes()].map(node=>[node.x,node.y]);
  assert.equal(n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true,altKey:true}),true);assert.equal(p.getCanvasZoom(),1.2);
  n.handleKey({key:"ArrowDown",ctrlKey:true,shiftKey:true,altKey:true});assert.ok(Math.abs(p.getCanvasZoom()-1)<1e-12);
  n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true,altKey:true,repeat:true});assert.equal(p.getCanvasZoom(),1.2);
  p.setCanvasZoom(5);n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true,altKey:true});assert.equal(p.getCanvasZoom(),5);
  p.setCanvasZoom(.15);n.handleKey({key:"ArrowDown",ctrlKey:true,shiftKey:true,altKey:true});assert.equal(p.getCanvasZoom(),.15);
  for (const extra of [{ctrlKey:false},{shiftKey:false},{metaKey:true},{isComposing:true}])
    assert.equal(n.handleKey({key:"ArrowUp",ctrlKey:true,shiftKey:true,altKey:true,...extra}),false);
  assert.equal(n.handleKey({key:"Home",ctrlKey:true,shiftKey:true,altKey:true}),false);
  for (const key of [{key:"!",code:"Digit1"},{key:"1"},{key:"!"},{key:"&",code:"Digit1"}]) {
    p.setCanvasZoom(2.1);assert.equal(n.handleKey({...key,ctrlKey:true,shiftKey:true}),true);assert.equal(p.getCanvasZoom(),1);
  }
  assert.equal(n.handleKey({key:"1",ctrlKey:true}),false);
  assert.equal(p.getZoom(),1.8);assert.equal(p.getHyperbolic(),37);assert.equal(p.getSelection(),a);
  assert.deepEqual([...p.getAllNodes()].map(node=>[node.x,node.y]),positions);
});

test("Ctrl Shift Option left/right rotates the view and retains graph and navigation state", t => {
  const {p,n,edges}=fixture(t);p.setRotation(.4);p.setZoom(1.7);p.setCanvasZoom(1.4);p.setHyperbolic(35);p.setSelectEdge(edges[0]);
  const positions=[...p.getAllNodes()].map(node=>[node.x,node.y]),members=visible(p),key={ctrlKey:true,shiftKey:true,altKey:true};
  assert.equal(n.handleKey({...key,key:"ArrowRight"}),true);assert.ok(Math.abs(p.getRotation()-(.4+Math.PI/36))<1e-12);
  n.handleKey({...key,key:"ArrowLeft"});assert.ok(Math.abs(p.getRotation()-.4)<1e-12);
  n.handleKey({...key,key:"ArrowLeft",repeat:true});assert.ok(Math.abs(p.getRotation()-(.4-Math.PI/36))<1e-12);
  for(const extra of [{ctrlKey:false},{shiftKey:false},{metaKey:true},{isComposing:true}])
    assert.equal(n.handleKey({...key,key:"ArrowRight",...extra}),false);
  assert.throws(()=>n.rotateBy(Infinity),RangeError);
  assert.equal(p.getSelection(),edges[0]);assert.equal(p.getZoom(),1.7);assert.equal(p.getCanvasZoom(),1.4);assert.equal(p.getHyperbolic(),35);
  assert.deepEqual(visible(p),members);assert.deepEqual([...p.getAllNodes()].map(node=>[node.x,node.y]),positions);
  p.setSelect(null);n.handleKey({...key,key:"ArrowRight"});assert.ok(Math.abs(p.getRotation()-.4)<1e-12);
});
