# Remove
use startup

db.components_game_region_updates.remove({}, {$multi:true})

db.components_game_region_user_updates.remove({}, {$multi:true})

db.regions.updateMany({}, { $set: { update: [] }})
