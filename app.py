# IMPORT MYSQL AND OTHER HELPFUL LIBRARIES
from flask import Flask, render_template, jsonify, request
from sqlalchemy import create_engine, text
import random, pandas

app = Flask(__name__)
path = 'mysql://root:CPSC408!@localhost/pokemon' # CHANGE PATH / PASSWORD IF NEEDED
engine = create_engine(path)


# HELPER FUNCTIONS

# Assigns a Pokemon 4 randomly-generated moveIDs
def randomizeMoveset(pokemonID):
    conn = engine.connect()
    # Generates list of 4 unique moveIDs
    moveset_IDs = []
    while len(moveset_IDs) != 4:
        random_move_ID = random.randrange(1, 102) # Out of a possible 102 moves (IDs 1-102)
        if random_move_ID not in moveset_IDs:
            moveset_IDs.append(random_move_ID)
    # Changes the 4 moves from default moveIDs (IDs 996-999)
    for i in range(4):
        query = text("UPDATE pokemon SET MoveID = {} WHERE (pokemonID = {}) AND (MoveID = {});".format(moveset_IDs[i], pokemonID, i+996))
        conn.execute(query)
        conn.commit()
    conn.close()

# Resets a Pokemon to default moveIDs (IDs 996-999)
def resetMoveset(pokemonID):
    conn = engine.connect()
    # Gets list of moveIDs
    moveset_IDs = []
    query = text("SELECT MoveID FROM pokemon WHERE PokemonID = {}".format(pokemonID))
    result = conn.execute(query)
    for id in result:
        moveset_IDs.append(id[0])
    # Changes the 4 moves to default moveIDs (IDs 996-999)
    for i in range(4):
        query = text("UPDATE pokemon SET MoveID = {} WHERE (pokemonID = {}) AND (MoveID = {});".format(i+996, pokemonID, moveset_IDs[i]))
        conn.execute(query)
        conn.commit()
    conn.close()

# JSONifies a relevant list given the info involved within the Pokemon battle
def jsonifyFightInfo(info):
    mainLine = info[0]
    retJson = {"p1Name": mainLine[2],
               "p1HP": mainLine[3],
               "p1Move1Name": mainLine[9],
               "p1Move2Name": info[1][9],
               "p1Move3Name": info[2][9],
               "p1Move4Name": info[3][9],
               "p2Name": mainLine[12],
               "p2HP": mainLine[13],
               "p2Move1Name": mainLine[19],
               "p2Move2Name": info[1][19],
               "p2Move3Name": info[2][19],
               "p2Move4Name": info[3][19]
               }
    return jsonify(retJson)

# Converts a list of badges into a comma-separated list for end of game
def listifyBadges(badges):
    ret = ""
    for badge in badges:
        ret += badge + ", "
    return ret[:-2] # Deletes trailing comma and space



# WEB PATHS

# Runs the webpage
@app.route('/')
def index():
    return render_template('index.html')

# Resets database to original state on site reload
@app.route('/resetDatabase')
def resetDatabase():
    conn = engine.connect()
    # Reset all Pokemon where moves are not default OR where TrainerID is not NULL
    query = text("SELECT PokemonID, TrainerID FROM pokemon WHERE (TrainerID IS NOT NULL AND TrainerID > 0) OR MoveID < 996;")
    idsToChange = [[x[0], x[1]] for x in conn.execute(query).fetchall()[::4]] # Gets every 4 to avoid duplicates
    for pid, tid in idsToChange:
        resetMoveset(pid)
        if tid is not None: # Only done when TrainerID is confirmed to be set to a value
            query = text("UPDATE pokemon SET TrainerID = NULL WHERE TrainerID = {};".format(tid))
            conn.execute(query)
            conn.commit()
    # Reset gym badges
    query = text("UPDATE gyms SET Earned = False;")
    conn.execute(query)
    conn.commit()
    # Re-add indexing to Pokemon table, if it doesn't already exist
    query = text('''SELECT * 
                    FROM INFORMATION_SCHEMA.STATISTICS 
                    WHERE TABLE_SCHEMA = 'pokemon' 
                        AND TABLE_NAME = 'pokemon' 
                        AND INDEX_NAME = 'pk_index';''')
    pkIndex = conn.execute(query).fetchone()
    if pkIndex is not None: # Drop index if it exists
        query = text("DROP INDEX pk_index ON pokemon;")
        conn.execute(query)
        conn.commit()
    query = text("CREATE INDEX pk_index ON pokemon(pokemonID);") # Add on index for pokemonID column
    conn.execute(query)
    conn.commit()
    # Delete Player profile if already exists
    query = text("DELETE FROM trainers WHERE TrainerID = 0;")
    conn.execute(query)
    conn.commit()
    conn.close()
    # Default return, since nothing needs to be returned
    return ""

# Check to see if the Player (TrainerID 0) already exists in the database
@app.route('/checkPlayerExists')
def checkPlayerExists():
    conn = engine.connect()
    query = text("SELECT * FROM trainers WHERE TrainerID = 0;")
    result = conn.execute(query).fetchone()
    conn.close()
    # Return boolean if TrainerID 0 exists
    return str(str(result) != "None")

# Adds the Player's Trainer name to database (if they didn't exist before)
@app.route('/addTrainerName')
def addTrainerName():
    conn = engine.connect()
    name = request.args.get('name')
    # Insert TrainerID 0 into table
    query = text('''INSERT INTO trainers VALUES (0, '{}', NULL);'''.format(name))
    conn.execute(query)
    # Check count of trainers within table
    query2 = text('''SELECT COUNT(*) AS numTrainers FROM pokemon.trainers;''')
    result2 = conn.execute(query2).fetchone()[0]
    # TRANSACTION: If updated count is 108 default Trainers + 1 TrainerID 0, good to commit
    if result2 == 109:
        conn.commit()
    else:
        conn.rollback()
    conn.close()
    # Default return, since nothing needs to be returned
    return ""

# Gets the Player's Trainer name from database
@app.route('/getTrainerName')
def getTrainerName():
    conn = engine.connect()
    query = text("SELECT Name FROM trainers WHERE TrainerID = 0;")
    trainerName = conn.execute(query).fetchone()[0]
    conn.close()
    return trainerName

# Generates a starting Pokemon for Player
@app.route('/generateStartingPokemon')
def generateStartingPokemon():
    conn = engine.connect()
    # Generates a random Pokemon from ID 1-649 (no need to check for uniqueness, since database should be cleared)
    pokemon_number = random.randrange(1, 649)
    # Adds random moves to Pokemon in database
    randomizeMoveset(pokemon_number)
    # Get Pokemon name for simulation start screen
    query = text("SELECT Name FROM pokemon WHERE PokemonID = {} LIMIT 1;".format(pokemon_number))
    pokemon_name = conn.execute(query).fetchone()[0]
    # Add Pokemon to Player party
    query = text("UPDATE pokemon SET TrainerID = 0 WHERE (pokemonID = {});".format(pokemon_number))
    conn.execute(query)
    conn.commit()
    conn.close()
    # Send name to frontend
    return pokemon_name

# Generates a random Pokemon
@app.route('/generatePokemon')
def generatePokemon():
    # Get a PokemonID number that is not assigned to a Trainer yet
    pokemon_number = 999
    conn = engine.connect()
    while pokemon_number == 999:
        pokemon_test_number = random.randrange(1, 649)
        query = text("SELECT TrainerID FROM pokemon WHERE PokemonID = {} LIMIT 1;".format(pokemon_test_number))
        if conn.execute(query).fetchone()[0] == None:
            pokemon_number = pokemon_test_number
    # Get Pokemon name and catch rate to send over
    query = text("SELECT Name, CatchRate FROM pokemon WHERE PokemonID = {} LIMIT 1;".format(pokemon_number))
    pokemon_name = conn.execute(query).fetchone()[0]
    pokemon_catchrate = conn.execute(query).fetchone()[1]
    conn.close()
    # Send name and catch rate to frontend
    return jsonify({"pokemon_name": pokemon_name, "pokemon_catchrate": pokemon_catchrate})

# Checks if Trainer has a full party
@app.route('/partyCountCheck')
def partyCountCheck():
    conn = engine.connect()
    query = text("SELECT COUNT(*) AS numParty FROM (SELECT DISTINCT Name FROM pokemon WHERE TrainerID = 0) AS ownedPokemon;")
    numPokemonInParty = conn.execute(query).fetchone()[0]
    conn.close()
    # Returns True if there are less than 6 Pokemon under TrainerID 0 (in which case is not a full party)
    return str(numPokemonInParty < 6)

# Adds Pokemon to Player's party
@app.route('/addToParty')
def addToParty():
    conn = engine.connect()
    # Get Pokemon name
    pokemon_name = request.args.get('pokemon_name')
    # Gives Pokemon TrainerID of 0
    query = text("UPDATE pokemon SET TrainerID = 0 WHERE Name = '{}';".format(pokemon_name))
    conn.execute(query)
    conn.commit()
    # Get PokemonID to randomize moveset
    query = text("SELECT PokemonID FROM pokemon WHERE Name = '{}' LIMIT 1;".format(pokemon_name))
    pokemonID = conn.execute(query).fetchone()[0]
    conn.close()
    # Randomize moveset
    randomizeMoveset(pokemonID)
    # Default return, since nothing needs to be returned
    return ""

# Gets list of Player's party Pokemon 
@app.route('/getParty')
def getParty():
    conn = engine.connect()
    ret_list = []
    query = text("SELECT DISTINCT Name FROM pokemon WHERE TrainerID = 0;")
    result = conn.execute(query)
    conn.close()
    # Append all Pokemon with TrainerID 0 to ret_list
    for name in result:
        ret_list.append(name[0])
    return ret_list

# Removes Pokemon from Trainer's party
@app.route('/removeFromParty')
def removeFromParty():
    conn = engine.connect()
    # Get Pokemon name and reset TrainerID
    pokemon_name = request.args.get('pokemon_name')
    query = text("UPDATE pokemon SET TrainerID = NULL WHERE Name = '{}';".format(pokemon_name)) # Accounting for the fact that each Pokemon has 4 entries
    conn.execute(query)
    conn.commit()
    # Get PokemonID
    query = text("SELECT PokemonID FROM pokemon WHERE Name = '{}' LIMIT 1;".format(pokemon_name))
    pokemonID = conn.execute(query).fetchone()[0]
    conn.close()
    # Reset moveset
    resetMoveset(pokemonID)
    # Default return, since nothing needs to be returned
    return ""

# Gets a random Gym Type name without repeating past gyms completed
@app.route('/getGymType')
def getGymType():
    conn = engine.connect()
    query = text('''SELECT DISTINCT types.Name 
                    FROM gyms 
                    INNER JOIN types 
                        ON types.typeID = gyms.typeID
                    WHERE Earned = False 
                    ORDER BY RAND() 
                    LIMIT 1''')
    gymType = conn.execute(query).fetchone()[0]
    conn.close()
    return gymType

# Gets a random Pokemon of the same type as gym, and sets them up for their Trainer
@app.route('/getPokemonForTrainer')
def getPokemonForTrainer(id):
    conn = engine.connect()
    # Get random PokemonID of same typing
    query = text('''SELECT DISTINCT pokemon.pokemonID
                    FROM pokemon.trainers
                    INNER JOIN 
	                    (SELECT gyms.GymID, gyms.TypeID
                        FROM pokemon.gyms) AS gymFiltered
	                    ON trainers.GymID = gymFiltered.GymID
                    INNER JOIN pokemon.pokemon
	                    ON gymFiltered.TypeID = pokemon.TypeID1
                    WHERE trainers.TrainerID = {}
                    ORDER BY RAND()
                    LIMIT 1;'''.format(id))
    pokemonID = conn.execute(query).fetchone()[0]
    # Assign PokemonID to TrainerID
    query = text("UPDATE pokemon SET TrainerID = {} WHERE PokemonID = {};".format(id, pokemonID))
    conn.execute(query)
    conn.commit()
    # Get moveset for Pokemon
    randomizeMoveset(pokemonID)
    # Get Pokemon name to return
    query = text("SELECT Name FROM pokemon WHERE PokemonID = {} LIMIT 1;".format(pokemonID))
    pokemonName = conn.execute(query).fetchone()[0]
    conn.close()
    return pokemonName

# Gets a random Trainer and sets them up for battle
@app.route('/getTrainerInfo')
def getTrainer():
    conn = engine.connect()
    gymType = request.args.get('gymType')
    # Get a random relevant Trainer name
    query = text('''SELECT trainers.TrainerID, trainers.Name
                    FROM trainers
                    INNER JOIN gyms 
                        ON trainers.GymID = gyms.GymID
                    INNER JOIN types
                        ON gyms.TypeID = types.TypeID
                    WHERE types.Name = '{}'
                    ORDER BY RAND()
                    LIMIT 1
                    ;'''.format(gymType))
    trainerInfo = conn.execute(query).fetchone() # ID, Name
    # Assign them a same-type Pokemon
    pokemonName = getPokemonForTrainer(trainerInfo[0])
    # Give back Trainer Name with Pokemon ready in database
    conn.close()
    return [trainerInfo[1], pokemonName] # Trainer Name, Pokemon Name

# Sets up info for Pokemon fight and sends it to frontend
@app.route('/setUpFight')
def setUpFight():
    conn = engine.connect()
    allyPokemon = request.args.get('pokemon_name')
    oppPokemon = request.args.get('opponent_name')
    # Get all info involving the Pokemon in battle
    query = text('''SELECT *
                    FROM pokemon.pokemon AS pok1
                    INNER JOIN (SELECT MoveID, Name FROM pokemon.moves) AS mov1 
                        ON pok1.MoveID = mov1.moveID
                    INNER JOIN pokemon.pokemon AS pok2 
                        ON pok1.Name = '{}' AND pok2.Name = '{}'
                    INNER JOIN (SELECT MoveID, Name FROM pokemon.moves) AS mov2 
                        ON pok2.MoveID = mov2.moveID;
                 '''.format(allyPokemon, oppPokemon))
    allInfo = conn.execute(query).fetchall()
    # Gather all relevant info to parse through
    fightInfo = []
    for i, row in enumerate(allInfo):
        if i % 5 == 0:
            fightInfo.append(row)
    # JSONify and return the data to frontend
    retInfo = jsonifyFightInfo(fightInfo)
    conn.close()
    return retInfo

# Calculates damages for a move based on Pokemon and move typing
@app.route('/calculateDamage')
def calculateDamage():
    conn = engine.connect()
    p1 = request.args.get('p1')
    p2 = request.args.get('p2')
    move = request.args.get('move')
    move = move.replace("%20", " ") # Take care of spaces in move names
    # Get base damage for move
    main_query = text("SELECT * FROM moves WHERE Name = '{}';".format(move))
    moveResult = conn.execute(main_query).fetchone()
    totalDamage = moveResult[3]
    # Calculates with accuracy (if doesn't land, totalDamage becomes 0)
    acc = moveResult[4]
    random_number = random.randint(1, 100)
    if random_number > acc:
        conn.close()
        return {"dmgAmount": 0}
    # Gets potential STAB multipliers
    mTypeID = moveResult[2]
    query = text("SELECT TypeID1, TypeID2 FROM pokemon WHERE Name = '{}';".format(p1))
    pTypeResult = conn.execute(query).fetchone()
    if mTypeID in pTypeResult:
        totalDamage *= 1.5
    # Gets potential move to Pokemon type multipliers
    baseMultiplier = 1
    query = text("SELECT TypeID1, TypeID2 FROM pokemon WHERE Name = '{}';".format(p2))
    p2TypeResult = conn.execute(query).fetchone()
    for type in p2TypeResult:
        if type is not None:
            query = text("SELECT Multiplier FROM types WHERE TypeID = {} AND TypeAgainstID = {};".format(mTypeID, type))
            mTypeResult = conn.execute(query).fetchone()[0]
            baseMultiplier *= mTypeResult
    totalDamage *= baseMultiplier
    # Return final dmgAmount
    conn.close()
    return {"dmgAmount": totalDamage}

# Returns name of gym badges and updates Earned status on gym win
@app.route('/getAndUpdateGymBadge')
def getAndUpdateGymBadge():
    conn = engine.connect()
    # Get badge name
    gymType = request.args.get('gymType')
    query = text('''SELECT BadgeName
                    FROM gyms
                    INNER JOIN types 
                        ON gyms.TypeID = types.typeID
                    WHERE Name = '{}'
                    LIMIT 1;'''.format(gymType))
    badgeName = conn.execute(query).fetchone()[0]
    # Update badge Earned status
    query = text('''UPDATE gyms
                    SET Earned = True
                    WHERE BadgeName = '{}';'''.format(badgeName))
    conn.execute(query)
    conn.commit()
    # Return badge name
    conn.close()
    return badgeName

# Get list of earned badges for win screen
@app.route('/getFinalGymBadges')
def getFinalGymBadges():
    conn = engine.connect()
    query = text('''SELECT BadgeName
                    FROM gyms
                    WHERE Earned = True''')
    badges = [x[0] for x in conn.execute(query).fetchall()]
    conn.close()
    return listifyBadges(badges)

# Gets CSV of winning Party and downloads it
@app.route('/downloadCSV')
def downloadCSV():
    conn = engine.connect()
    # Info returned seen in SELECT line
    query = text('''SELECT PokemonID, pokemon.Name AS Name, HP, types1.Name AS type1, types2.Name AS type2, moves1.Name AS move
                    FROM pokemon.pokemon
		            INNER JOIN
	                    (SELECT DISTINCT TypeID, Name
                        FROM pokemon.types) AS types1 ON types1.TypeID = pokemon.TypeID1
                    LEFT JOIN
                        (SELECT DISTINCT TypeID, Name
                        FROM pokemon.types) AS types2 ON types2.TypeID = pokemon.TypeID2
                    INNER JOIN
                        (SELECT DISTINCT MoveID, Name
                        FROM pokemon.moves) AS moves1 ON moves1.MoveID = pokemon.MoveID
                    WHERE TrainerID = 0;''')
    df = pandas.read_sql(query, engine)
    df.to_csv('pokemonSimulatorParty.csv', index=False)
    conn.close()
    # Default return, since nothing needs to be returned
    return ""
    


# APP RUN
if __name__ == '__main__':
    app.run(debug=True)
