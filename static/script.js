// HELPER FUNCTIONS

// Causes the webpage to wait for a specified about of time in milliseconds
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Takes a Pokemon name and converts it to its image link (contains a list of manual exceptions)
function getImgLink(data) {
    let pokemonImgName;
    if (data == "Nidoran♀") {pokemonImgName = "nidoran-f";}
    else if (data == "Nidoran♂") {pokemonImgName = "nidoran-m";}
    else if (data == "Shaymin") {pokemonImgName = "shaymin-land";}
    else if (data == "Deoxys") {pokemonImgName = "deoxys-normal";}
    else if (data == "Giratina") {pokemonImgName = "giratina-altered";}
    else if (data == "Tornadus") {pokemonImgName = "tornadus-incarnate";}
    else if (data == "Thundurus") {pokemonImgName = "thundurus-incarnate";}
    else if (data == "Landorus") {pokemonImgName = "landorus-incarnate";}
    else if (data == "Mime Jr.") {pokemonImgName = "mime-jr";}
    else if (data == "Farfetch'd") {pokemonImgName = "farfetchd";}
    else if (data == "Unfezant") {pokemonImgName = "unfezant-male";}
    else {pokemonImgName = data.toLowerCase();}
    const retLink = "https://img.pokemondb.net/artwork/large/" + pokemonImgName + ".jpg";
    return retLink
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CATCHING PHASE FUNCTION
async function catchingPhase() {
    const startingInfo = document.getElementById("startingInfo");
    const catchingPhaseStart = document.getElementById("catchingPhaseStart");
    const wildPokemonNamePlaceholder = document.getElementById("wildPokemonNamePlaceholder");
    const wildPokemonImg = document.getElementById("wildPokemonImg")
    const catchingScreen = document.getElementById("catchingScreen");
    const catchButton = document.getElementById("catchButton");
    const runButton = document.getElementById("runButton");
    const catchThrow = document.getElementById("catchThrow");
    const pokeball = document.getElementById("pokeball");
    const pokeballText = document.getElementById("pokeballText");
    const runDecision = document.getElementById("runDecision");
    const leavePokemon = document.getElementById("leavePokemon");
    const dropdown = document.getElementById("dropdownRelease");
    const confirmButton = document.getElementById("confirmButton");

    // Displays catching phase
    startingInfo.style.display = "none";
    catchingPhaseStart.style.display = "block";
    await sleep(2000);

    for (let i = 0; i < 3; i++) { // Loop executes for each of the 3 Pokemon the Player has the chance to catch
        // Generates Pokemon and sets info in HTML
        const response = await fetch('/generatePokemon');
        const data = await response.json();
        wildPokemonNamePlaceholder.textContent = data.pokemon_name;
        wildPokemonImg.src = getImgLink(data.pokemon_name);
        // Display screen
        catchingPhaseStart.style.display = "none";
        catchingScreen.style.display = "block";
        await new Promise((resolve) => { // Create a promise to wait for the user's choice
            const catchClick = async () => { // Decision if player tries to catch Pokemon
                // Remove button listeners for next attempt
                catchButton.removeEventListener("click", catchClick);
                runButton.removeEventListener("click", runClick);
                // Show Pokeball catching screen, execute 1 shake
                catchingScreen.style.display = "none";
                catchThrow.style.display = "block";
                await sleep(1500);
                pokeballText.textContent = "1 shake...";
                await sleep(1500);
                for (j=2; j<=4; j++) { // Use self-created function and catch rate to determine the next 3 events (2 more shakes and catch)
                    const prob = Math.cbrt((5 * Math.sqrt(data.pokemon_catchrate))/100); // Self-created function
                    const randomNum = Math.floor(Math.random() * 100) + 1; // Random number 1-100 
                    if (randomNum <= prob * 100) { // Successful event
                        if (j==4) { // Successful catch
                            // Show caught screen
                            pokeballText.textContent = "Yay! You captured " + data.pokemon_name + "!";
                            pokeball.src = "https://www.svg.com/img/gallery/every-pok-ball-ranked-worst-to-first/intro-1667081798.jpg";
                            await sleep(2000);
                            // Reset Pokeball catching screen for next catching event
                            catchThrow.style.display = "none";
                            pokeballText.textContent = "You throw a Pokéball at it!";
                            pokeball.src = "https://cdn-1.webcatalog.io/catalog/pokemon-database/pokemon-database-icon-filled-256.webp?v=1675613153834";
                            // Add Pokemon to Player party, but check if Player has 6 Pokemon already
                            const response = await fetch('/partyCountCheck');
                            const ableToAdd = await response.text();
                            if (ableToAdd == "True") { // Trainer has less than 6 Pokemon, add Pokemon to party
                                await fetch(`/addToParty?pokemon_name=${encodeURIComponent(data.pokemon_name)}`);
                            }
                            else { // Player has a full party of 6 Pokemon
                                // Show dropdown for user choice on what Pokemon to release
                                leavePokemon.style.display = "block";
                                dropdown.innerHTML = ""; // Clear existing options from previous dropdown events
                                // Get options (Pokemon in Player's party) from backend
                                const response = await fetch('/getParty');
                                const options = await response.json();
                                // Add new options to dropdown list
                                options.forEach(option => {
                                    const optionElement = document.createElement("option");
                                    optionElement.value = option;
                                    optionElement.textContent = option;
                                    dropdown.appendChild(optionElement);
                                });
                                await new Promise((resolve) => { // Create a promise to wait for the user's choice
                                    // Function to handle dropdown decision
                                    const handleDropdownDecision = async () => {
                                        confirmButton.addEventListener("click", () => { // Confirm button clicked, take chosen Pokemon and remove it from party
                                            const selectedOption = dropdown.value;
                                            // Remove selected Pokemon from party
                                            fetch(`/removeFromParty?pokemon_name=${encodeURIComponent(selectedOption)}`);
                                            // Add original caught Pokemon to party, to replace it
                                            fetch(`/addToParty?pokemon_name=${encodeURIComponent(data.pokemon_name)}`);
                                            // Hide the dropdown prompt
                                            leavePokemon.style.display = "none";
                                            resolve(); // Finish promise
                                        });
                                    };
                                    handleDropdownDecision();
                                });
                            }
                        }
                        else { // Successful shake
                            pokeballText.textContent = j.toString() + " shakes...";
                            await sleep(500*j + 1000); // 2000ms for Shake 2, 2500ms for Shake 3, for game timing purposes
                        }
                    }
                    else { // Unsuccessful catch
                        // Show Pokemon escaped from Pokeball
                        pokeballText.textContent = "No! The Pokémon escaped, better luck next time!";
                        pokeball.src = getImgLink(data.pokemon_name);
                        await sleep(2000);
                        // Reset Pokeball catching screen for next catching event
                        catchThrow.style.display = "none";
                        pokeball.src = "https://cdn-1.webcatalog.io/catalog/pokemon-database/pokemon-database-icon-filled-256.webp?v=1675613153834";
                        pokeballText.textContent = "You throw a Pokéball at it!";
                        // Break at the end, since future shakes are not allowed when Pokemon escapes
                        break;
                    }
                }
                resolve(); // Finish promise to end catching event
            };
            const runClick = async () => { // Decision if player tries to run from Pokemon
                // Remove button listeners for next attempt
                catchButton.removeEventListener("click", catchClick);
                runButton.removeEventListener("click", runClick);
                // Show run screen and prepare for next event
                catchingScreen.style.display = "none";
                runDecision.style.display = "block";
                await sleep(3000);
                runDecision.style.display = "none";
                resolve(); // Finish promise
            };
            // Makes buttons clickable for user decision
            catchButton.addEventListener("click", catchClick);
            runButton.addEventListener("click", runClick);
        });
    }
}

// GYM BATTLE PHASE FUNCTION
async function gymBattlePhase() {
    const gymBattlePhaseStart = document.getElementById("gymBattlePhaseStart");
    const gymBattleTypeReveal = document.getElementById("gymBattleTypeReveal");
    const trainerNamePlaceholder = document.getElementById("trainerNamePlaceholder");
    const trainerPokemonNamePlaceholder = document.getElementById("trainerPokemonNamePlaceholder");
    const preBattle = document.getElementById("preBattle");
    const dropdown = document.getElementById("dropdownSendout");
    const confirmButton = document.getElementById("confirmButton2");
    const fightIntro = document.getElementById("fightIntro");
    const fightScreen = document.getElementById("fightScreen");
    const lossScreen = document.getElementById("lossScreen");
    const winScreen = document.getElementById("winScreen");
    const gymTypePlaceholder = document.getElementById("gymTypePlaceholder");
    const gymTypeWinPlaceholder = document.getElementById("gymTypeWinPlaceholder");
    const badgeNamePlaceholder = document.getElementById("badgeNamePlaceholder");
    const continueButton = document.getElementById("continueButton");
    const retryButton = document.getElementById("retryButton");

    // Show phase start
    gymBattlePhaseStart.style.display = "block";
    await sleep(1500);
    // Get random gym type for player to fight, and display it
    const response = await fetch('/getGymType');
    const gymType = await response.text();
    gymBattlePhaseStart.style.display = "none";
    gymBattleTypeReveal.style.display = "block";
    gymTypePlaceholder.textContent = gymType;
    await sleep(2000);

    // Keeps track of wins and losses
    let winCounter = 0;
    let lossCounter = 0;
    // Go through 3 Trainers
    for (let i = 0; i < 3; i++) {
        // Get random Trainer and show pre-battle prompt
        let response = await fetch(`/getTrainerInfo?gymType=${encodeURIComponent(gymType)}`);
        const battleInfo = await response.json();
        trainerNamePlaceholder.textContent = battleInfo[0];
        trainerPokemonNamePlaceholder.textContent = battleInfo[1];
        gymBattleTypeReveal.style.display = "none";
        preBattle.style.display = "block";
        // Populate sendout options with Player's party Pokemon
        dropdown.innerHTML = ""; // Clear existing options
        // Get options (Pokemon in Player's party) from backend
        response = await fetch('/getParty');
        const options = await response.json();
        // Add new options to dropdown list
        options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            dropdown.appendChild(optionElement);
        });
        await new Promise((resolve) => { // Create a promise to wait for the user's choice
            // Function to handle dropdown decision
            const handleDropdownDecision = async () => {
                const confirmFunction = async () => {
                    confirmButton.removeEventListener("click", confirmFunction);
                    // Set up Pokemon fight by getting all relevant info from backend
                    const selectedOption = dropdown.value;
                    const response = await fetch(`/setUpFight?pokemon_name=${encodeURIComponent(selectedOption)}&opponent_name=${encodeURIComponent(battleInfo[1])}`);
                    const allBattleInfo = await response.json();
                    // Hide the dropdown prompt and start the fight
                    preBattle.style.display = "none";
                    fightIntro.style.display = "block";
                    await sleep(2000);
                    // Commence fight with fight() function
                    const result = await fight(allBattleInfo);
                    if (result === "win") { // Player won battle
                        winCounter += 1;
                        if (winCounter === 2) { // Trainer beat gym, show win screen
                            // Get player gym badge and show Player the badge they won
                            const response = await fetch(`/getAndUpdateGymBadge?gymType=${encodeURIComponent(gymType)}`);
                            const badgeName = await response.text();
                            gymTypeWinPlaceholder.textContent = gymType;
                            badgeNamePlaceholder.textContent = badgeName;
                            fightScreen.style.display = "none";
                            winScreen.style.display = "block";
                            resolve(); // Finish promise
                        }
                    }
                    else if (result === "loss") { // Player lost battle
                        lossCounter += 1;
                        if (lossCounter === 2) { // GAME OVER, show loss screen
                            fightScreen.style.display = "none";
                            lossScreen.style.display = "block";
                            resolve(); // Finish promise
                        }
                    }
                    resolve(); // Finish promise
                };
                confirmButton.addEventListener("click", confirmFunction);
            };
            handleDropdownDecision();
        });
        
        // Check winCounter after each iteration, winCounter = 2 means they beat the gym
        if (winCounter === 2) {
            await new Promise(resolve => {
                const continueButtonClickHandler = function() {
                    // After button click, phase ends and simulation() continues
                    continueButton.removeEventListener("click", continueButtonClickHandler);
                    winScreen.style.display = "none";
                    resolve(); // Finish promise
                };
                continueButton.addEventListener("click", continueButtonClickHandler);
            });
            break; // Break since no more battles are needed after majority wins
        }

        // Check lossCounter after each iteration, lossCounter = 2 means they lost against the gym
        if (lossCounter === 2) {
            await new Promise(resolve => {
                const retryButtonClickHandler = async function() {
                    // After button click, phase ends and page reloads for Player to try again
                    retryButton.removeEventListener("click", retryButtonClickHandler);
                    lossScreen.style.display = "none";
                    location.reload(); // Reload page
                    await sleep(250); // Give time for operations to end
                    resolve(); // Finish promise
                };
                retryButton.addEventListener("click", retryButtonClickHandler);
            });
            break; // Break since no more battles are needed after majority losses
        }
    }
}

// Function for Player's Turn in a fight
async function playerTurn(allInfo) {
    const moveButton1 = document.getElementById("moveButton1");
    const moveButton2 = document.getElementById("moveButton2");
    const moveButton3 = document.getElementById("moveButton3");
    const moveButton4 = document.getElementById("moveButton4");
    const hp2count = document.getElementById("hp2count");
    // Set up Player turn with text
    battleText.textContent = "What move would you like to use?";
    return new Promise((resolve) => {
        const moveClick = async (event) => {
            // Remove event listeners in preparation for next events
            moveButton1.removeEventListener("click", moveClick);
            moveButton2.removeEventListener("click", moveClick);
            moveButton3.removeEventListener("click", moveClick);
            moveButton4.removeEventListener("click", moveClick);
            // Change text to show the attack
            const moveName = event.target.textContent;
            battleText.textContent = allInfo.p1Name + " used the move " + moveName + "!";
            await sleep(1500);
            // Calculate damage done to other Pokemon
            const response = await fetch(`/calculateDamage?p1=${encodeURIComponent(allInfo.p1Name)}&p2=${encodeURIComponent(allInfo.p2Name)}&move=${encodeURIComponent(moveName)}`);
            let dmgAmount = await response.json();
            dmgAmount = dmgAmount.dmgAmount;
            // Update Pokemon HP (case of reaching 0 included)
            if (parseInt(dmgAmount) === 0) { // Attack missed
                battleText.textContent = "The attack didn't land, or it has no effect!";
            }
            else { // Attack landed
                hp2count.textContent = Math.max(parseInt(hp2count.textContent) - dmgAmount, 0); // Avoids negative numbers
                // For VFX
                hp2count.style.color = "red";
                await sleep(250);
                hp2count.style.color = "black";
            }
            await sleep(2000);
            resolve(); // Finish promise
        };
        moveButton1.addEventListener("click", moveClick);
        moveButton2.addEventListener("click", moveClick);
        moveButton3.addEventListener("click", moveClick);
        moveButton4.addEventListener("click", moveClick);
    });
}

// Function for opponent's turn in a fight
async function opponentTurn(allInfo) {
    const hp1count = document.getElementById("hp1count");
    // Choose from list of opponent's moves randomly
    const opponentMoveset = [allInfo.p2Move1Name, allInfo.p2Move2Name, allInfo.p2Move3Name, allInfo.p2Move4Name];
    const randomIndex = Math.floor(Math.random() * 4); // Random number 0-3
    const chosenMove = opponentMoveset[randomIndex];
    // Automatically calculate and apply damage
    battleText.textContent = allInfo.p2Name + " used the move " + chosenMove + "!";
    await sleep(1500);
    const response = await fetch(`/calculateDamage?p1=${encodeURIComponent(allInfo.p2Name)}&p2=${encodeURIComponent(allInfo.p1Name)}&move=${encodeURIComponent(chosenMove)}`);
    let dmgAmount = await response.json();
    dmgAmount = dmgAmount.dmgAmount;
    // Update Pokemon HP (case of reaching 0 included)
    if (parseInt(dmgAmount) === 0) { // Attack missed
        battleText.textContent = "The attack didn't land, or it has no effect!";
    }
    else { // Attack landed
        hp1count.textContent = Math.max(parseInt(hp1count.textContent) - dmgAmount, 0); // Avoids negative numbers
        // For VFX
        hp1count.style.color = "red";
        await sleep(250);
        hp1count.style.color = "black";
    }
    await sleep(2000);
}

// Function for general Pokemon battle
async function fight(allInfo) {
    const fightIntro = document.getElementById("fightIntro");
    const fightScreen = document.getElementById("fightScreen");
    const allyPokemonImg = document.getElementById("allyPokemonImg");
    const enemyPokemonImg = document.getElementById("enemyPokemonImg");
    const hp2count = document.getElementById("hp2count");
    const hp1count = document.getElementById("hp1count");
    // SET UP FIGHT FIELD
    // Change images
    allyPokemonImg.src = getImgLink(allInfo.p1Name);
    enemyPokemonImg.src = getImgLink(allInfo.p2Name);
    // Set up HP
    hp2count.textContent = allInfo.p2HP;
    hp1count.textContent = allInfo.p1HP;
    // Set up move buttons
    const moveset = document.getElementById("moveset");
    moveset.innerHTML = ""; // Clear existing options
    const moveNameList = [allInfo.p1Move1Name, allInfo.p1Move2Name, allInfo.p1Move3Name, allInfo.p1Move4Name];
    moveNameList.forEach((name, index) => {
        const button = document.createElement("button");
        button.id = "moveButton" + (index + 1); // ID format: movebutton1, movebutton2, ...
        button.className = "button";
        button.textContent = name;
        moveset.appendChild(button);
      });
    // Show fight!
    fightIntro.style.display = "none";
    fightScreen.style.display = "block";
    // Keeps track of when someone hits 0 HP
    while ((parseInt(hp1count.textContent) > 0) && (parseInt(hp2count.textContent) > 0)) { // While no one is at 0 HP
        await playerTurn(allInfo);
        if (!((parseInt(hp1count.textContent) > 0) && (parseInt(hp2count.textContent) > 0))) { // If Player hits 0 HP after a turn, end loop
            break;
        }
        else {
            await opponentTurn(allInfo); // Otherwise, let opponent go
        }
    }
    
    // When the battle ends
    let retResult;
    if (parseInt(hp2count.textContent) === 0) { // Player won
        battleText.textContent = "YOU WON!";
        retResult = "win";
    }
    else if (parseInt(hp1count.textContent) === 0) { // Player lost
        battleText.textContent = "YOU LOST!";
        retResult = "loss";
    }
    await sleep(3000);
    // Ends fight
    fightScreen.style.display = "none";
    return retResult;
}

// PLAYER WIN FUNCTION
async function playerWin() {
    const winScreen = document.getElementById("winScreen");
    const playerWin = document.getElementById("playerWin");
    const badgesWonList = document.getElementById("badgesWonList");
    const downloadButton = document.getElementById("downloadButton");
    // Get final list of badges and put it in win screen
    const response = await fetch(`/getFinalGymBadges`);
    const result = await response.text();
    badgesWonList.textContent = result;
    // Show win screen
    winScreen.style.display = "none";
    playerWin.style.display = "block";
    // Download .csv file on button click
    downloadButton.addEventListener("click", function() {
        fetch(`/downloadCSV`);
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// MAIN - WHERE PROGRAM STARTS

// Cleans up database from past run(s)
fetch('/resetDatabase');

// Transition from start button to name input
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const playerCreation = document.getElementById("playerCreation");
const playerCreationNull = document.getElementById("playerCreationNull");
const trainerNamePlaceholder = document.getElementById("trainerNamePlaceholder");
const tutorialContainer = document.getElementById("tutorialContainer");
const confirmButtonName = document.getElementById("confirmButtonName");

new Promise((resolve) => { // Create a promise to wait for the user to click start
    const startClick = async () => {
        // Check if Player has already been created (for error case purposes)
        const response = await fetch('/checkPlayerExists');
        const playerExists = await response.text();
        if (playerExists === "True") { // Player already in database, skip input Player screen
            // Display player creation null screen
            startScreen.style.display = "none";
            playerCreationNull.style.display = "block";
            await sleep(2000);
            // Get Player name to use for tutorial text and insert it
            const responseName = await fetch('/getTrainerName');
            const trainerName = await responseName.text();
            trainerNamePlaceholder.textContent = trainerName;
            // Show tutorial text
            playerCreationNull.style.display = "none";
            tutorialContainer.style.display = "block";
        }
        else { // Player doesn't exist, continue with input Player screen
            startScreen.style.display = "none";
            playerCreation.style.display = "block";
        }
        resolve(); // Finish promise
    };
    startButton.addEventListener("click", startClick);
});

// Transition from name input to tutorial text (if reached)
const inputPlayerName = document.getElementById("inputPlayerName");
confirmButtonName.addEventListener("click", async function() {
    // Get Player's inputted name into the tutorial text 
    trainerNamePlaceholder.textContent = inputPlayerName.value;
    // Put Player's inputted name into database as Trainer 0
    await fetch(`/addTrainerName?name=${encodeURIComponent(inputPlayerName.value)}`);
    // Display tutorial text
    playerCreation.style.display = "none";
    tutorialContainer.style.display = "block";
});

// Transition from tutorial text to start of simulation, with random Pokemon chosen
const tutorialButton = document.getElementById("tutorialButton");
const simulatorStart = document.getElementById("simulatorStart");
const startingInfo = document.getElementById("startingInfo");
const pokemonNamePlaceholder = document.getElementById("pokemonNamePlaceholder");
const startingPokemonImg = document.getElementById("startingPokemonImg");
tutorialButton.addEventListener("click", async function() {
    // Transition to simulator start text
    tutorialContainer.style.display = "none";
    simulatorStart.style.display = "block";
    await sleep(1500);
    // Fetch first Pokemon name from backend and apply it to text
    const response = await fetch('/generateStartingPokemon');
    const data = await response.text();
    pokemonNamePlaceholder.textContent = data;
    // Get image of starting Pokemon
    startingPokemonImg.src = getImgLink(data);
    // Display starting Pokemon
    simulatorStart.style.display = "none";
    startingInfo.style.display = "block";
    await sleep(3000);
    // Start the official simulation
    simulation();
});

// Simulation base
async function simulation() {
    const numCycles = 5; // Simulation will run for 5 cycles, can be changed to adjust how many cycles to go through
    for (let i = 0; i < numCycles; i++) {
        await catchingPhase(); // Catching phase
        await gymBattlePhase(); // Gym battle phase
    }
    playerWin(); // Reaches here only after cycles are completed
}