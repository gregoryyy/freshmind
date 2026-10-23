import {test, expect} from "@playwright/test";

test("library controls accept independent hosts and dispose listeners and dialogs", async ({page}) => {
  await page.route("**/ui-host.html", route => route.fulfill({contentType: "text/html", body: "<!doctype html><html><head><title>UI consumer</title></head><body></body></html>"}));
  await page.goto("/ui-host.html");
  const result = await page.evaluate(async () => {
    const {FreshmindPanel, bindKeymap, bindZoomControls} = await import("/src/fm/index.ts");
    const panels = [], bindings = [];
    const make = includeBrowserCommands => {
      const wrapper = document.createElement("section");
      const spacing = document.createElement("input"), spacingValue = document.createElement("output");
      spacing.type = "range"; spacing.min = "15"; spacing.max = "500";
      const button = document.createElement("button"), canvasIn = document.createElement("button");
      const canvasOut = document.createElement("button"), canvasReset = document.createElement("button");
      wrapper.append(button, spacing, spacingValue, canvasIn, canvasOut, canvasReset);
      document.body.append(wrapper);
      const panel = new FreshmindPanel(undefined, {autoStart: false});
      panels.push(panel);
      const disposeZoom = bindZoomControls(panel, {spacing, spacingValue, canvasIn, canvasOut, canvasReset});
      const disposeHelp = bindKeymap(panel, {button, container: wrapper, keyboardTarget: wrapper, includeBrowserCommands});
      bindings.push(disposeZoom, disposeHelp);
      return {wrapper, spacing, spacingValue, canvasIn, canvasReset, button, panel, disposeZoom, disposeHelp};
    };
    const a = make(false), b = make(true);
    a.spacing.value = "150"; a.spacing.dispatchEvent(new Event("input")); a.canvasIn.click();
    b.panel.setZoom(2); b.panel.setCanvasZoom(1.5);
    const views = [a, b].map(host => ({graph: host.panel.getZoom(), canvas: host.panel.getCanvasZoom(),
      spacing: host.spacingValue.textContent, reset: host.canvasReset.textContent}));
    const dialogs = [a, b].map(host => host.wrapper.querySelector("dialog"));
    const uniqueTitles = new Set(dialogs.map(dialog => dialog.getAttribute("aria-labelledby"))).size === 2;
    const filtered = !dialogs[0].textContent.includes("Ctrl/Cmd + O") && dialogs[1].textContent.includes("Ctrl/Cmd + O");
    const f1 = new KeyboardEvent("keydown", {key: "F1", bubbles: true, cancelable: true});
    a.button.dispatchEvent(f1);
    const scoped = dialogs[0].open && !dialogs[1].open && f1.defaultPrevented;
    dialogs[0].close();
    b.panel.getNavigation().handleKey({key: "?"});
    const helpAction = dialogs[1].open;
    a.disposeHelp(); a.disposeZoom(); a.disposeHelp(); a.disposeZoom();
    a.canvasIn.click(); a.spacing.value = "300"; a.spacing.dispatchEvent(new Event("input"));
    const detachedControls = a.panel.getZoom() === 1.5 && a.panel.getCanvasZoom() === 1.2;
    a.panel.setZoom(2.5); a.panel.setCanvasZoom(2);
    const detachedSubscription = a.spacingValue.textContent === "150%" && a.canvasReset.textContent === "120%";
    const disposedF1 = new KeyboardEvent("keydown", {key: "F1", bubbles: true, cancelable: true});
    a.button.dispatchEvent(disposedF1);
    const detachedHelp = !disposedF1.defaultPrevented && !a.wrapper.querySelector("dialog");
    b.panel.getNavigation().setActions({help: () => { window.replacementHelpCalled = true; }});
    b.disposeHelp(); b.panel.getNavigation().handleKey({key: "?"});
    const replacementSurvives = window.replacementHelpCalled === true;
    for (const dispose of bindings) dispose();
    for (const panel of panels) panel.destroy();
    a.wrapper.remove(); b.wrapper.remove();
    return {views, uniqueTitles, filtered, scoped, helpAction, detachedControls, detachedSubscription, detachedHelp, replacementSurvives};
  });
  expect(result.views).toEqual([
    {graph: 1.5, canvas: 1.2, spacing: "150%", reset: "120%"},
    {graph: 2, canvas: 1.5, spacing: "200%", reset: "150%"}
  ]);
  for (const key of ["uniqueTitles", "filtered", "scoped", "helpAction", "detachedControls", "detachedSubscription", "detachedHelp", "replacementSurvives"])
    expect(result[key], key).toBe(true);
});
