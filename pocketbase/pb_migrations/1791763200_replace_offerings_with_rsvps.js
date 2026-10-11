/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  for (const collectionName of ["tercos_total", "tercos", "admins"]) {
    try {
      app.delete(app.findCollectionByNameOrId(collectionName));
    } catch {
      // Fresh installations do not have the retired collections.
    }
  }

  const confirmations = new Collection({
    type: "base",
    name: "confirmacoes",
    listRule: null,
    viewRule: null,
    createRule:
      "@request.body.nome_completo:isset = true && @request.body.celular:isset = true && @request.body.resposta:isset = true",
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        type: "text",
        name: "nome_completo",
        required: true,
        min: 3,
        max: 120,
      },
      {
        type: "text",
        name: "celular",
        required: true,
        min: 10,
        max: 11,
        pattern: "^\\d{10,11}$",
      },
      {
        type: "select",
        name: "resposta",
        required: true,
        maxSelect: 1,
        values: ["sim", "nao"],
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
      "CREATE INDEX `idx_confirmacoes_created` ON `confirmacoes` (`created` DESC)",
      "CREATE INDEX `idx_confirmacoes_resposta` ON `confirmacoes` (`resposta`)",
    ],
  });

  app.save(confirmations);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("confirmacoes"));
  } catch {
    // Allows rollback after a partially-applied migration.
  }
});
