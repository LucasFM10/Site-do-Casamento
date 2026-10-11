/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const settings = app.settings();
  settings.meta.appName = "Lucas & Amanda";
  settings.logs.maxDays = 7;
  settings.logs.logIP = false;
  settings.logs.logAuthId = true;
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = [
    { label: "*:auth", audience: "", duration: 60, maxRequests: 10 },
    { label: "*:create", audience: "", duration: 60, maxRequests: 20 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
  ];
  settings.trustedProxy.headers = ["X-Forwarded-For", "X-Real-IP"];
  settings.trustedProxy.useLeftmostIP = true;
  app.save(settings);
}, () => {});
