/// <reference path="../pb_data/types.d.ts" />
// Single-record upsert table used by server.js to persist the OBS sync
// game state cache across process restarts.
migrate((app) => {
  const collection = new Collection({
    name: "game_states",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { type: "json", name: "state_json", required: true }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("game_states"));
});
