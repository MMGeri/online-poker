import * as gameEvents from './game-events.model';

// create a game event manager class with a game state (get from db)
// calculate new gameState and save it to db
// should have a list of all private rooms and the public room
// send card dealt events to private rooms
// send game events to public room
// if event is incoming only send response if input type event, else return null for it
