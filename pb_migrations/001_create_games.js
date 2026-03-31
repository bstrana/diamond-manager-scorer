/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "games",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { type: "text",   name: "external_game_id" },
      { type: "text",   name: "status",           required: true },
      { type: "text",   name: "competition" },
      { type: "text",   name: "location" },
      { type: "text",   name: "game_date" },
      { type: "text",   name: "game_start_time" },
      { type: "text",   name: "game_end_time" },
      { type: "text",   name: "home_team",         required: true },
      { type: "text",   name: "away_team",         required: true },
      { type: "number", name: "home_score" },
      { type: "number", name: "away_score" },
      { type: "text",   name: "home_team_roster_text" },
      { type: "text",   name: "away_team_roster_text" },
      { type: "json",   name: "game_state_json" }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("games"));
});
