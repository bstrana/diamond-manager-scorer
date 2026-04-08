/// <reference path="../pb_data/types.d.ts" />
// Tracks which scorekeeper is actively scoring each scheduled game.
// Allows the GameSetup UI to show games already claimed by another user.
migrate((app) => {
  const collection = new Collection({
    name: "game_locks",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { type: "text", name: "game_id",          required: true },
      { type: "text", name: "scorekeeper_name", required: true },
      { type: "text", name: "locked_at",        required: true },
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("game_locks"));
});
