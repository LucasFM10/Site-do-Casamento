/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = new Collection({
    type: "auth",
    name: "admins",
    listRule: null,
    viewRule: "id = @request.auth.id",
    createRule: null,
    updateRule: "id = @request.auth.id",
    deleteRule: null,
    manageRule: null,
    passwordAuth: {
      enabled: true,
      identityFields: ["email"],
    },
    oauth2: { enabled: false },
    otp: { enabled: false },
    mfa: { enabled: false },
  });
  app.save(admins);

  const adminOnly = '@request.auth.id != ""';
  const offerings = new Collection({
    type: "base",
    name: "tercos",
    listRule: adminOnly,
    viewRule: adminOnly,
    createRule: "",
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      {
        type: "text",
        name: "nome_devoto",
        required: true,
        max: 120,
      },
      {
        type: "number",
        name: "quantidade",
        required: true,
        min: 1,
        max: 10000,
        onlyInt: true,
      },
      {
        type: "text",
        name: "intencao",
        max: 2000,
      },
      {
        type: "file",
        name: "foto",
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/heic",
          "image/heif",
        ],
        protected: true,
        thumbs: ["100x100"],
      },
      {
        type: "bool",
        name: "vista",
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX `idx_tercos_created` ON `tercos` (`created` DESC)",
      "CREATE INDEX `idx_tercos_vista` ON `tercos` (`vista`)",
    ],
  });
  app.save(offerings);

  const total = new Collection({
    type: "view",
    name: "tercos_total",
    listRule: "",
    viewRule: "",
    viewQuery: `
      SELECT
        'totaltercos0000' AS id,
        CAST(COALESCE(SUM(quantidade), 0) AS INTEGER) AS total
      FROM tercos
    `,
  });
  app.save(total);

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
}, (app) => {
  for (const collectionName of ["tercos_total", "tercos", "admins"]) {
    try {
      app.delete(app.findCollectionByNameOrId(collectionName));
    } catch {
      // Allows safe rollback if a partially-created collection is absent.
    }
  }
});
