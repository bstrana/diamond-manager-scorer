/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const gamesCollection = app.findCollectionByNameOrId("games");
  const collection = new Collection({
    name: "plate_appearances",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        type: "relation",
        name: "game",
        collectionId: gamesCollection.id,
        maxSelect: 1,
        cascadeDelete: true,
        required: true
      },
      { type: "number", name: "inning",              required: true },
      { type: "bool",   name: "is_top_inning",        required: true },
      { type: "text",   name: "result",               required: true },
      { type: "number", name: "rbis" },
      { type: "text",   name: "pitch_sequence" },
      { type: "text",   name: "batter_name",          required: true },
      { type: "text",   name: "pitcher_name",         required: true },
      { type: "json",   name: "defensive_plays_json" },
      { type: "json",   name: "hit_description_json" }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("plate_appearances"));
});
